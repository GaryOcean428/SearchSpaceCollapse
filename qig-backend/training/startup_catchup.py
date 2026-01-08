"""
Startup Catch-Up Training Manager
=================================

Replaces Celery Beat scheduler for scheduled training tasks.
Detects missed training windows on startup and executes catch-up.

This exists because:
1. Celery workers are NOT deployed on Railway
2. Railway shuts down services when idle
3. Scheduled tasks (hourly, nightly) never ran

Solution:
- Track last execution times in database
- On startup, calculate missed windows
- Execute catch-up training in background thread
- Railway cron jobs wake the system and trigger via /api/cron/wake
"""

import os
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum


class TaskType(Enum):
    """Scheduled training task types."""
    HOURLY_BATCH = "hourly_batch"
    NIGHTLY_CONSOLIDATION = "nightly_consolidation"
    SHADOW_SYNC = "shadow_sync"
    CHECKPOINT_CLEANUP = "checkpoint_cleanup"
    FEDERATION_SYNC = "federation_sync"  # Sync vocabulary/knowledge with peer nodes


@dataclass
class ScheduleConfig:
    """Configuration for a scheduled task."""
    interval_hours: Optional[int] = None  # For interval-based tasks
    hour_utc: Optional[int] = None  # For daily tasks (specific hour)
    minute: int = 0  # Minute of hour
    max_catchup: int = 1  # Max runs to catch up


# Schedule configurations matching original Celery Beat
SCHEDULES: Dict[TaskType, ScheduleConfig] = {
    TaskType.HOURLY_BATCH: ScheduleConfig(interval_hours=1, max_catchup=24),
    TaskType.NIGHTLY_CONSOLIDATION: ScheduleConfig(hour_utc=3, max_catchup=3),
    TaskType.SHADOW_SYNC: ScheduleConfig(interval_hours=4, minute=30, max_catchup=6),
    TaskType.CHECKPOINT_CLEANUP: ScheduleConfig(hour_utc=4, max_catchup=1),
    TaskType.FEDERATION_SYNC: ScheduleConfig(interval_hours=1, max_catchup=6),  # Sync with peers every hour
}


def _get_db_connection():
    """Get PostgreSQL connection."""
    try:
        import psycopg2
        from urllib.parse import urlparse

        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            return None

        parsed = urlparse(db_url)
        return psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password,
        )
    except Exception as e:
        print(f"[StartupCatchup] DB connection failed: {e}")
        return None


def _ensure_schedule_table():
    """Ensure training_schedule_log table exists and has initial rows."""
    conn = _get_db_connection()
    if not conn:
        return False

    try:
        with conn.cursor() as cur:
            # Insert initial rows for each task type if not exists
            for task_type in TaskType:
                cur.execute("""
                    INSERT INTO training_schedule_log (task_type, runs_completed, updated_at)
                    VALUES (%s, 0, NOW())
                    ON CONFLICT (task_type) DO NOTHING
                """, (task_type.value,))
            conn.commit()
        return True
    except Exception as e:
        print(f"[StartupCatchup] Table setup failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


class StartupCatchupManager:
    """
    Manages catch-up training after system restarts.

    Training Schedule (from original Celery Beat):
    - Hourly batch: every hour at :00
    - Nightly consolidation: 3 AM UTC daily
    - Shadow sync: every 4 hours at :30
    - Checkpoint cleanup: 4 AM UTC daily
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._catchup_thread: Optional[threading.Thread] = None
        self._is_running = False

        # Ensure table and initial rows exist
        _ensure_schedule_table()

    def get_schedule_status(self) -> Dict[str, Any]:
        """Get status of all scheduled tasks."""
        conn = _get_db_connection()
        if not conn:
            return {"error": "Database unavailable"}

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT task_type, last_success_at, last_attempt_at,
                           last_status, runs_completed
                    FROM training_schedule_log
                    ORDER BY task_type
                """)
                rows = cur.fetchall()

            return {
                row[0]: {
                    "last_success_at": row[1].isoformat() if row[1] else None,
                    "last_attempt_at": row[2].isoformat() if row[2] else None,
                    "last_status": row[3],
                    "runs_completed": row[4],
                }
                for row in rows
            }
        except Exception as e:
            return {"error": str(e)}
        finally:
            conn.close()

    def calculate_missed_runs(self) -> Dict[str, int]:
        """
        Calculate how many runs were missed for each task type.

        Returns dict of {task_type: missed_count}
        """
        now = datetime.now(timezone.utc)
        missed = {}

        conn = _get_db_connection()
        if not conn:
            return {t.value: 0 for t in TaskType}

        try:
            with conn.cursor() as cur:
                for task_type, config in SCHEDULES.items():
                    cur.execute("""
                        SELECT last_success_at FROM training_schedule_log
                        WHERE task_type = %s
                    """, (task_type.value,))
                    row = cur.fetchone()

                    last_success = row[0] if row and row[0] else None

                    # Calculate missed runs based on schedule type
                    if last_success is None:
                        # Never ran - count as 1 missed run
                        missed[task_type.value] = 1
                    elif config.interval_hours:
                        # Interval-based (hourly, every 4 hours)
                        hours_since = (now - last_success).total_seconds() / 3600
                        runs_missed = int(hours_since / config.interval_hours)
                        missed[task_type.value] = min(runs_missed, config.max_catchup)
                    elif config.hour_utc is not None:
                        # Daily at specific hour (nightly, cleanup)
                        days_since = (now - last_success).days
                        # Check if we missed today's run
                        today_run_time = now.replace(
                            hour=config.hour_utc, minute=config.minute,
                            second=0, microsecond=0
                        )
                        if now >= today_run_time and last_success < today_run_time:
                            days_since += 1
                        missed[task_type.value] = min(days_since, config.max_catchup)
                    else:
                        missed[task_type.value] = 0

            return missed
        except Exception as e:
            print(f"[StartupCatchup] Error calculating missed runs: {e}")
            return {t.value: 0 for t in TaskType}
        finally:
            conn.close()

    def update_schedule_log(
        self,
        task_type: str,
        status: str,
        error: Optional[str] = None,
        run_time_ms: int = 0,
    ) -> bool:
        """Record task execution result."""
        conn = _get_db_connection()
        if not conn:
            return False

        try:
            with conn.cursor() as cur:
                if status == "success":
                    cur.execute("""
                        UPDATE training_schedule_log
                        SET last_success_at = NOW(),
                            last_attempt_at = NOW(),
                            last_status = %s,
                            last_error = NULL,
                            runs_completed = runs_completed + 1,
                            total_run_time_ms = total_run_time_ms + %s,
                            updated_at = NOW()
                        WHERE task_type = %s
                    """, (status, run_time_ms, task_type))
                else:
                    cur.execute("""
                        UPDATE training_schedule_log
                        SET last_attempt_at = NOW(),
                            last_status = %s,
                            last_error = %s,
                            updated_at = NOW()
                        WHERE task_type = %s
                    """, (status, error, task_type))
                conn.commit()
            return True
        except Exception as e:
            print(f"[StartupCatchup] Error updating schedule log: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def execute_single_task(self, task_type: str) -> Dict[str, Any]:
        """
        Execute a single scheduled task.

        Called by cron endpoint or catch-up logic.
        """
        start_time = time.time()

        # Mark as in progress
        self.update_schedule_log(task_type, "in_progress")

        try:
            result = self._run_task(task_type)

            run_time_ms = int((time.time() - start_time) * 1000)
            self.update_schedule_log(task_type, "success", run_time_ms=run_time_ms)

            return {
                "status": "success",
                "task_type": task_type,
                "run_time_ms": run_time_ms,
                "result": result,
            }
        except Exception as e:
            self.update_schedule_log(task_type, "failed", error=str(e))
            return {
                "status": "failed",
                "task_type": task_type,
                "error": str(e),
            }

    def _run_task(self, task_type: str) -> Dict[str, Any]:
        """Execute the underlying training task."""
        # Import here to avoid circular imports
        from .kernel_training_orchestrator import KernelTrainingOrchestrator, TrainingConfig

        # Check if training is enabled
        if os.getenv("TRAINING_ENABLED", "true").lower() != "true":
            return {"status": "disabled"}

        if task_type == TaskType.HOURLY_BATCH.value:
            return self._run_hourly_batch()
        elif task_type == TaskType.NIGHTLY_CONSOLIDATION.value:
            return self._run_nightly_consolidation()
        elif task_type == TaskType.SHADOW_SYNC.value:
            return self._run_shadow_sync()
        elif task_type == TaskType.CHECKPOINT_CLEANUP.value:
            return self._run_checkpoint_cleanup()
        elif task_type == TaskType.FEDERATION_SYNC.value:
            return self._run_federation_sync()
        else:
            raise ValueError(f"Unknown task type: {task_type}")

    def _run_hourly_batch(self) -> Dict[str, Any]:
        """Run hourly batch training for all kernels."""
        # Reuse logic from tasks.py but call synchronously
        from .tasks import get_orchestrator, _fetch_hourly_batch_data

        orchestrator = get_orchestrator()
        results = {}

        for god_name in orchestrator.kernels.keys():
            batch_data = _fetch_hourly_batch_data(god_name)
            if batch_data:
                try:
                    metrics = orchestrator.train_hourly_batch(god_name, batch_data)
                    results[god_name] = {
                        "status": "success",
                        "batch_size": len(batch_data),
                        "loss": getattr(metrics, 'loss', None),
                    }
                except Exception as e:
                    results[god_name] = {"status": "error", "error": str(e)}
            else:
                results[god_name] = {"status": "no_data"}

        return {"kernels": len(results), "results": results}

    def _run_nightly_consolidation(self) -> Dict[str, Any]:
        """Run nightly consolidation for all kernels."""
        from .tasks import get_orchestrator, _fetch_curriculum_data

        orchestrator = get_orchestrator()
        results = {}

        for god_name in orchestrator.kernels.keys():
            curriculum = _fetch_curriculum_data(god_name)
            if curriculum:
                try:
                    metrics = orchestrator.train_nightly_consolidation(
                        god_name, curriculum, consolidate_checkpoints=True
                    )
                    results[god_name] = {
                        "status": "success",
                        "curriculum_size": len(curriculum),
                        "loss": getattr(metrics, 'loss', None),
                    }
                except Exception as e:
                    results[god_name] = {"status": "error", "error": str(e)}
            else:
                results[god_name] = {"status": "no_curriculum"}

        return {"kernels": len(results), "results": results}

    def _run_shadow_sync(self) -> Dict[str, Any]:
        """Synchronize all god-shadow pairs."""
        from .tasks import get_orchestrator, get_transfer_manager

        orchestrator = get_orchestrator()
        transfer_manager = get_transfer_manager()
        results = {}

        for god_name in orchestrator.kernels.keys():
            if god_name.endswith("_shadow"):
                continue

            shadow_name = f"{god_name}_shadow"
            if shadow_name in orchestrator.kernels:
                try:
                    god_kernel = orchestrator.get_kernel(god_name)
                    shadow_kernel = orchestrator.get_kernel(shadow_name)

                    if god_kernel and shadow_kernel:
                        result = transfer_manager.sync_shadow(
                            god_kernel=god_kernel,
                            shadow_kernel=shadow_kernel,
                            direction="bidirectional",
                            sync_ratio=0.2,
                        )
                        results[god_name] = {
                            "status": "success" if result.success else "failed",
                            "phi_before": result.phi_before,
                            "phi_after": result.phi_after,
                        }
                except Exception as e:
                    results[god_name] = {"status": "error", "error": str(e)}

        return {"pairs": len(results), "results": results}

    def _run_checkpoint_cleanup(self) -> Dict[str, Any]:
        """Clean up old checkpoints for all kernels."""
        from .tasks import get_orchestrator

        orchestrator = get_orchestrator()
        results = {}

        for god_name in orchestrator.kernels.keys():
            try:
                deleted = orchestrator._consolidate_checkpoints(god_name)
                results[god_name] = {"deleted": deleted}
            except Exception as e:
                results[god_name] = {"status": "error", "error": str(e)}

        return {"kernels": len(results), "results": results}

    def _run_federation_sync(self) -> Dict[str, Any]:
        """Sync vocabulary and knowledge with federation peer nodes."""
        import requests

        # Get enabled peers from database
        peers = self._get_federation_peers()

        if not peers:
            return {"status": "no_peers", "message": "No federation peers configured"}

        results = {"peers": {}, "vocabulary_sent": 0, "vocabulary_received": 0}

        # Gather local vocabulary to share
        local_vocabulary = self._gather_vocabulary_for_sync()

        for peer in peers:
            peer_id = peer["peer_id"]
            peer_url = peer["peer_url"]
            api_key = peer.get("api_key", "")

            if not api_key:
                results["peers"][peer_id] = {"status": "skipped", "error": "No API key configured"}
                continue

            try:
                # Sync with this peer
                peer_result = self._sync_with_peer(peer_url, api_key, local_vocabulary)
                results["peers"][peer_id] = peer_result

                # Update peer status in database
                self._update_peer_sync_status(peer_id, peer_result)

                if peer_result.get("success"):
                    results["vocabulary_received"] += peer_result.get("received", {}).get("vocabulary", 0)

            except Exception as e:
                results["peers"][peer_id] = {"status": "error", "error": str(e)}
                self._update_peer_sync_status(peer_id, {"success": False, "error": str(e)})

        results["vocabulary_sent"] = len(local_vocabulary)
        return results

    def _get_federation_peers(self) -> List[Dict]:
        """Get enabled federation peers from database."""
        conn = _get_db_connection()
        if not conn:
            return []

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT peer_id, peer_name, peer_url, api_key,
                           sync_vocabulary, sync_knowledge, sync_research
                    FROM federation_peers
                    WHERE sync_enabled = true
                    ORDER BY peer_name
                """)
                rows = cur.fetchall()

            return [
                {
                    "peer_id": row[0],
                    "peer_name": row[1],
                    "peer_url": row[2],
                    "api_key": row[3],
                    "sync_vocabulary": row[4],
                    "sync_knowledge": row[5],
                    "sync_research": row[6],
                }
                for row in rows
            ]
        except Exception as e:
            print(f"[FederationSync] Error fetching peers: {e}")
            return []
        finally:
            conn.close()

    def _update_peer_sync_status(self, peer_id: str, result: Dict) -> None:
        """Update peer sync status in database."""
        conn = _get_db_connection()
        if not conn:
            return

        try:
            with conn.cursor() as cur:
                if result.get("success"):
                    cur.execute("""
                        UPDATE federation_peers
                        SET last_sync_at = NOW(),
                            last_sync_status = 'success',
                            last_sync_error = NULL,
                            sync_count = sync_count + 1,
                            vocabulary_sent = vocabulary_sent + %s,
                            vocabulary_received = vocabulary_received + %s,
                            updated_at = NOW()
                        WHERE peer_id = %s
                    """, (
                        result.get("sent", 0),
                        result.get("received", {}).get("vocabulary", 0),
                        peer_id
                    ))
                else:
                    cur.execute("""
                        UPDATE federation_peers
                        SET last_sync_at = NOW(),
                            last_sync_status = 'failed',
                            last_sync_error = %s,
                            updated_at = NOW()
                        WHERE peer_id = %s
                    """, (result.get("error", "Unknown error")[:500], peer_id))
                conn.commit()
        except Exception as e:
            print(f"[FederationSync] Error updating peer status: {e}")
            conn.rollback()
        finally:
            conn.close()

    def _gather_vocabulary_for_sync(self) -> List[Dict]:
        """Gather vocabulary entries to share with peers."""
        conn = _get_db_connection()
        if not conn:
            return []

        try:
            with conn.cursor() as cur:
                # Get recent high-phi vocabulary
                cur.execute("""
                    SELECT token, phi_score, frequency, updated_at
                    FROM tokenizer_vocabulary
                    WHERE phi_score > 0.3
                    ORDER BY updated_at DESC
                    LIMIT 500
                """)
                rows = cur.fetchall()

            return [
                {
                    "word": row[0],
                    "phi": float(row[1]) if row[1] else 0.5,
                    "frequency": row[2] or 1,
                    "domain": "qig"
                }
                for row in rows
            ]
        except Exception as e:
            print(f"[FederationSync] Error gathering vocabulary: {e}")
            return []
        finally:
            conn.close()

    def _sync_with_peer(self, peer_url: str, api_key: str, vocabulary: List[Dict]) -> Dict[str, Any]:
        """Sync vocabulary with a single peer."""
        import requests

        sync_url = f"{peer_url.rstrip('/')}/federation/sync/knowledge"

        try:
            response = requests.post(
                sync_url,
                json={
                    "send": {
                        "vocabulary": vocabulary
                    },
                    "request": {
                        "domains": ["qig"],
                        "limit": 500
                    }
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()

                # Import received vocabulary into our database
                received_vocab = data.get("knowledge", {}).get("vocabulary", [])
                if received_vocab:
                    self._import_vocabulary(received_vocab)

                return {
                    "success": True,
                    "sent": len(vocabulary),
                    "received": data.get("received", {}),
                    "mesh_stats": data.get("mesh_stats", {})
                }
            else:
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": response.text[:500]
                }

        except requests.exceptions.Timeout:
            return {"success": False, "error": "Timeout connecting to peer"}
        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "Could not connect to peer"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _import_vocabulary(self, vocabulary: List[Dict]) -> int:
        """Import vocabulary received from a peer into local database."""
        conn = _get_db_connection()
        if not conn:
            return 0

        imported = 0
        try:
            with conn.cursor() as cur:
                for vocab in vocabulary:
                    word = vocab.get("word", "")
                    if not word or len(word) < 2:
                        continue

                    phi = vocab.get("phi", 0.5)
                    frequency = vocab.get("frequency", 1)

                    # Upsert - only update if new phi is higher
                    cur.execute("""
                        INSERT INTO tokenizer_vocabulary (token, phi_score, frequency, updated_at)
                        VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (token) DO UPDATE
                        SET phi_score = GREATEST(tokenizer_vocabulary.phi_score, EXCLUDED.phi_score),
                            frequency = tokenizer_vocabulary.frequency + EXCLUDED.frequency,
                            updated_at = NOW()
                        WHERE tokenizer_vocabulary.phi_score < EXCLUDED.phi_score
                    """, (word, phi, frequency))
                    imported += 1

                conn.commit()
            return imported
        except Exception as e:
            print(f"[FederationSync] Error importing vocabulary: {e}")
            conn.rollback()
            return 0
        finally:
            conn.close()

    def execute_catchup(self, background: bool = True) -> Dict[str, Any]:
        """
        Execute catch-up training for all missed tasks.

        Args:
            background: If True, run in background thread to not block startup

        Returns:
            Dict with catch-up status
        """
        missed = self.calculate_missed_runs()

        if not any(missed.values()):
            return {"status": "nothing_to_catch_up", "missed": missed}

        if background:
            with self._lock:
                if self._is_running:
                    return {"status": "already_running"}
                self._is_running = True

            self._catchup_thread = threading.Thread(
                target=self._catchup_worker,
                args=(missed,),
                daemon=True,
                name="catchup-training"
            )
            self._catchup_thread.start()

            return {
                "status": "started",
                "background": True,
                "missed": missed,
            }
        else:
            return self._catchup_worker(missed)

    def _catchup_worker(self, missed: Dict[str, int]) -> Dict[str, Any]:
        """Worker function for catch-up training."""
        results = {}

        try:
            print(f"[StartupCatchup] Starting catch-up for: {missed}")

            # Priority order: checkpoint cleanup first (fast), then nightly, then batch
            priority_order = [
                TaskType.CHECKPOINT_CLEANUP,
                TaskType.NIGHTLY_CONSOLIDATION,
                TaskType.SHADOW_SYNC,
                TaskType.HOURLY_BATCH,
            ]

            for task_type in priority_order:
                runs_needed = missed.get(task_type.value, 0)
                if runs_needed > 0:
                    print(f"[StartupCatchup] Running {task_type.value} (missed {runs_needed})")

                    # For most tasks, one catch-up run is sufficient
                    # (e.g., nightly consolidation catches up all curriculum)
                    # Only hourly batch benefits from multiple runs
                    runs_to_do = 1 if task_type != TaskType.HOURLY_BATCH else min(runs_needed, 3)

                    task_results = []
                    for i in range(runs_to_do):
                        result = self.execute_single_task(task_type.value)
                        task_results.append(result)

                        # Small delay between runs
                        if i < runs_to_do - 1:
                            time.sleep(1)

                    results[task_type.value] = task_results

            print(f"[StartupCatchup] Catch-up complete")
            return {"status": "completed", "results": results}

        except Exception as e:
            print(f"[StartupCatchup] Catch-up failed: {e}")
            return {"status": "failed", "error": str(e), "partial_results": results}
        finally:
            with self._lock:
                self._is_running = False

    def is_catchup_running(self) -> bool:
        """Check if catch-up is currently running."""
        with self._lock:
            return self._is_running


# Singleton instance
_manager: Optional[StartupCatchupManager] = None


def get_catchup_manager() -> StartupCatchupManager:
    """Get or create the singleton catch-up manager."""
    global _manager
    if _manager is None:
        _manager = StartupCatchupManager()
    return _manager
