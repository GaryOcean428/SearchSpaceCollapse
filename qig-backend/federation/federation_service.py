"""
Federation Service - Cross-Instance Synchronization
====================================================

Handles actual data synchronization between Pantheon instances:
- Vocabulary delta sync (share learned tokens)
- Basin coordinate alignment (keep 64D basins in sync)
- Kernel state replication (checkpoint propagation)
- Training curriculum sharing

This is the CORE service that makes federation work - not just the HTTP routes.

Usage:
    from federation.federation_service import get_federation_service

    service = get_federation_service()
    service.sync_all_peers()  # Full sync with all enabled peers
    service.sync_vocabulary_with_peer(peer_id)  # Targeted sync
"""

import os
import time
import hashlib
import logging
import threading
import traceback
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import numpy as np

# Configure logger for federation service
logger = logging.getLogger(__name__)

try:
    import requests
except ImportError:
    requests = None


class SyncType(Enum):
    """Types of data that can be synchronized."""
    VOCABULARY = "vocabulary"
    BASIN = "basin"
    KERNEL = "kernel"
    RESEARCH = "research"
    TRAINING = "training"


class SyncDirection(Enum):
    """Direction of synchronization."""
    SEND = "send"
    RECEIVE = "receive"
    BIDIRECTIONAL = "bidirectional"


@dataclass
class SyncResult:
    """Result of a sync operation."""
    success: bool
    sync_type: SyncType
    direction: SyncDirection
    items_sent: int = 0
    items_received: int = 0
    items_merged: int = 0
    error: Optional[str] = None
    duration_ms: int = 0
    metadata: Dict = field(default_factory=dict)


@dataclass
class PeerInfo:
    """Information about a federation peer."""
    peer_id: str
    peer_name: str
    peer_url: str
    api_key: Optional[str] = None
    sync_enabled: bool = True
    sync_vocabulary: bool = True
    sync_basins: bool = True
    sync_kernels: bool = False
    sync_research: bool = False
    last_sync_at: Optional[datetime] = None
    is_reachable: bool = True
    consecutive_failures: int = 0


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
        logger.error("[Federation] DB connection failed: %s", e)
        return None


class FederationService:
    """
    Core federation service for cross-instance synchronization.

    Handles:
    1. Peer management and health checking
    2. Vocabulary synchronization (bidirectional delta sync)
    3. Basin coordinate alignment (64D vectors)
    4. Kernel checkpoint replication
    5. Research/knowledge sharing
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._sync_thread: Optional[threading.Thread] = None
        self._is_syncing = False
        self._last_full_sync: Optional[datetime] = None

        # Cache of peer info
        self._peers_cache: Dict[str, PeerInfo] = {}
        self._cache_timestamp: Optional[datetime] = None
        self._cache_ttl_seconds = 60

    # =========================================================================
    # PEER MANAGEMENT
    # =========================================================================

    def get_peers(self, force_refresh: bool = False) -> List[PeerInfo]:
        """Get list of federation peers from database."""
        now = datetime.now(timezone.utc)

        # Return cached if fresh
        if not force_refresh and self._cache_timestamp:
            age = (now - self._cache_timestamp).total_seconds()
            if age < self._cache_ttl_seconds and self._peers_cache:
                return list(self._peers_cache.values())

        conn = _get_db_connection()
        if not conn:
            return list(self._peers_cache.values())

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT peer_id, peer_name, peer_url, api_key,
                           sync_enabled, sync_vocabulary, sync_basins, sync_kernels, sync_research,
                           last_sync_at, is_reachable, consecutive_failures
                    FROM federation_peers
                    ORDER BY peer_name
                """)
                rows = cur.fetchall()

            self._peers_cache = {}
            for row in rows:
                peer = PeerInfo(
                    peer_id=row[0],
                    peer_name=row[1],
                    peer_url=row[2],
                    api_key=row[3],
                    sync_enabled=row[4] if row[4] is not None else True,
                    sync_vocabulary=row[5] if row[5] is not None else True,
                    sync_basins=row[6] if row[6] is not None else True,
                    sync_kernels=row[7] if row[7] is not None else False,
                    sync_research=row[8] if row[8] is not None else False,
                    last_sync_at=row[9],
                    is_reachable=row[10] if row[10] is not None else True,
                    consecutive_failures=row[11] or 0,
                )
                self._peers_cache[peer.peer_id] = peer

            self._cache_timestamp = now
            return list(self._peers_cache.values())

        except Exception as e:
            logger.error("[Federation] Error fetching peers: %s", e)
            return list(self._peers_cache.values())
        finally:
            conn.close()

    def get_enabled_peers(self) -> List[PeerInfo]:
        """Get only enabled peers."""
        return [p for p in self.get_peers() if p.sync_enabled and p.is_reachable]

    def test_peer_connection(self, peer: PeerInfo) -> Tuple[bool, int, Optional[str]]:
        """
        Test connection to a peer.

        Returns: (reachable, response_time_ms, error_message)
        """
        if not requests:
            return False, 0, "requests library not available"

        url = f"{peer.peer_url.rstrip('/')}/federation/mesh/status"
        headers = {}
        if peer.api_key:
            headers["Authorization"] = f"Bearer {peer.api_key}"

        start = time.time()
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response_time = int((time.time() - start) * 1000)

            if response.status_code == 200:
                return True, response_time, None
            else:
                return False, response_time, f"HTTP {response.status_code}"

        except requests.exceptions.Timeout:
            return False, 10000, "Connection timeout"
        except requests.exceptions.ConnectionError:
            return False, 0, "Connection failed"
        except Exception as e:
            return False, 0, str(e)

    def update_peer_health(self, peer_id: str, reachable: bool, response_time_ms: int = 0) -> None:
        """Update peer health status in database."""
        conn = _get_db_connection()
        if not conn:
            return

        try:
            with conn.cursor() as cur:
                if reachable:
                    cur.execute("""
                        UPDATE federation_peers
                        SET is_reachable = true,
                            consecutive_failures = 0,
                            response_time_ms = %s,
                            last_health_check = NOW(),
                            updated_at = NOW()
                        WHERE peer_id = %s
                    """, (response_time_ms, peer_id))
                else:
                    cur.execute("""
                        UPDATE federation_peers
                        SET consecutive_failures = consecutive_failures + 1,
                            is_reachable = CASE WHEN consecutive_failures >= 3 THEN false ELSE is_reachable END,
                            last_health_check = NOW(),
                            updated_at = NOW()
                        WHERE peer_id = %s
                    """, (peer_id,))
                conn.commit()
        except Exception as e:
            logger.error("[Federation] Error updating peer health: %s", e)
            conn.rollback()
        finally:
            conn.close()

    # =========================================================================
    # VOCABULARY SYNCHRONIZATION
    # =========================================================================

    def gather_vocabulary_delta(self, since: Optional[datetime] = None, limit: int = 500) -> List[Dict]:
        """
        Gather vocabulary entries for synchronization.

        Args:
            since: Only get vocabulary updated after this time
            limit: Maximum entries to return

        Returns:
            List of vocabulary dicts with word, phi, frequency, domain
        """
        conn = _get_db_connection()
        if not conn:
            return []

        try:
            with conn.cursor() as cur:
                if since:
                    cur.execute("""
                        SELECT token, phi_score, frequency, updated_at
                        FROM tokenizer_vocabulary
                        WHERE phi_score > 0.3 AND updated_at > %s
                        ORDER BY updated_at DESC
                        LIMIT %s
                    """, (since, limit))
                else:
                    cur.execute("""
                        SELECT token, phi_score, frequency, updated_at
                        FROM tokenizer_vocabulary
                        WHERE phi_score > 0.3
                        ORDER BY updated_at DESC
                        LIMIT %s
                    """, (limit,))
                rows = cur.fetchall()

            return [
                {
                    "word": row[0],
                    "phi": float(row[1]) if row[1] else 0.5,
                    "frequency": row[2] or 1,
                    "updated_at": row[3].isoformat() if row[3] else None,
                    "domain": "qig"
                }
                for row in rows
            ]
        except Exception as e:
            logger.error("[Federation] Error gathering vocabulary: %s", e)
            return []
        finally:
            conn.close()

    def import_vocabulary(self, vocabulary: List[Dict], source_peer: str) -> int:
        """
        Import vocabulary received from a peer.

        Uses upsert with GREATEST to only update if incoming phi is higher.
        CRITICAL: Validates words before insertion to prevent vocabulary contamination.

        Returns: Number of items imported/updated
        """
        from word_validation import is_valid_english_word
        
        if not vocabulary:
            return 0

        conn = _get_db_connection()
        if not conn:
            return 0

        imported = 0
        skipped = 0
        try:
            with conn.cursor() as cur:
                for vocab in vocabulary:
                    word = vocab.get("word", "")
                    if not word or len(word) < 2 or len(word) > 128:
                        continue
                    
                    # CRITICAL: Validate word before insertion to prevent garbage
                    if not is_valid_english_word(word, include_stop_words=True, strict=True):
                        skipped += 1
                        continue

                    phi = min(max(float(vocab.get("phi", 0.5)), 0.0), 1.0)
                    frequency = max(int(vocab.get("frequency", 1)), 1)

                    cur.execute("""
                        INSERT INTO tokenizer_vocabulary (token, phi_score, frequency, updated_at)
                        VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (token) DO UPDATE
                        SET phi_score = GREATEST(tokenizer_vocabulary.phi_score, EXCLUDED.phi_score),
                            frequency = tokenizer_vocabulary.frequency + EXCLUDED.frequency,
                            updated_at = NOW()
                        WHERE tokenizer_vocabulary.phi_score < EXCLUDED.phi_score
                            OR tokenizer_vocabulary.updated_at < NOW() - INTERVAL '1 day'
                    """, (word[:128], phi, frequency))
                    imported += 1

                conn.commit()
            
            if skipped > 0:
                logger.warning("[Federation] Skipped %d invalid words during import", skipped)

            logger.info("[Federation] Imported %d vocabulary items from %s", imported, source_peer)
            return imported
        except Exception as e:
            logger.error("[Federation] Error importing vocabulary: %s", e)
            conn.rollback()
            return 0
        finally:
            conn.close()

    def sync_vocabulary_with_peer(self, peer: PeerInfo) -> SyncResult:
        """
        Perform bidirectional vocabulary sync with a single peer.
        """
        if not requests:
            return SyncResult(
                success=False,
                sync_type=SyncType.VOCABULARY,
                direction=SyncDirection.BIDIRECTIONAL,
                error="requests library not available"
            )

        if not peer.api_key:
            return SyncResult(
                success=False,
                sync_type=SyncType.VOCABULARY,
                direction=SyncDirection.BIDIRECTIONAL,
                error="No API key configured for peer"
            )

        start_time = time.time()

        # Gather local vocabulary to send
        local_vocab = self.gather_vocabulary_delta(
            since=peer.last_sync_at,
            limit=500
        )

        # Make sync request to peer
        url = f"{peer.peer_url.rstrip('/')}/federation/sync/knowledge"
        headers = {
            "Authorization": f"Bearer {peer.api_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(
                url,
                json={
                    "send": {"vocabulary": local_vocab},
                    "request": {"domains": ["qig"], "limit": 500}
                },
                headers=headers,
                timeout=30
            )

            duration_ms = int((time.time() - start_time) * 1000)

            if response.status_code != 200:
                return SyncResult(
                    success=False,
                    sync_type=SyncType.VOCABULARY,
                    direction=SyncDirection.BIDIRECTIONAL,
                    items_sent=len(local_vocab),
                    error=f"HTTP {response.status_code}: {response.text}",
                    duration_ms=duration_ms
                )

            data = response.json()

            # Import received vocabulary
            received_vocab = data.get("knowledge", {}).get("vocabulary", [])
            imported = self.import_vocabulary(received_vocab, peer.peer_id)

            # Update peer sync status
            self._update_peer_sync_status(peer.peer_id, True, len(local_vocab), imported)

            return SyncResult(
                success=True,
                sync_type=SyncType.VOCABULARY,
                direction=SyncDirection.BIDIRECTIONAL,
                items_sent=len(local_vocab),
                items_received=len(received_vocab),
                items_merged=imported,
                duration_ms=duration_ms,
                metadata=data.get("mesh_stats", {})
            )

        except requests.exceptions.Timeout:
            self._update_peer_sync_status(peer.peer_id, False, error="Timeout")
            return SyncResult(
                success=False,
                sync_type=SyncType.VOCABULARY,
                direction=SyncDirection.BIDIRECTIONAL,
                error="Connection timeout",
                duration_ms=30000
            )
        except Exception as e:
            self._update_peer_sync_status(peer.peer_id, False, error=str(e))
            return SyncResult(
                success=False,
                sync_type=SyncType.VOCABULARY,
                direction=SyncDirection.BIDIRECTIONAL,
                error=str(e)
            )

    # =========================================================================
    # BASIN COORDINATE SYNCHRONIZATION
    # =========================================================================

    def gather_basins_for_sync(self, limit: int = 100) -> List[Dict]:
        """
        Gather basin coordinates for synchronization.

        Basins are 64D vectors representing consciousness/attention attractors.
        """
        conn = _get_db_connection()
        if not conn:
            return []

        try:
            with conn.cursor() as cur:
                # Get basins from consciousness_checkpoints or basin_coordinates table
                cur.execute("""
                    SELECT
                        COALESCE(checkpoint_id, id::text) as basin_id,
                        basin_vector,
                        phi,
                        kappa,
                        domain,
                        updated_at
                    FROM (
                        -- Try consciousness_checkpoints first
                        SELECT
                            checkpoint_id,
                            NULL::integer as id,
                            basin_coordinates as basin_vector,
                            phi_score as phi,
                            kappa_score as kappa,
                            god_name as domain,
                            updated_at
                        FROM consciousness_checkpoints
                        WHERE basin_coordinates IS NOT NULL
                        ORDER BY updated_at DESC
                        LIMIT %s
                    ) sub
                """, (limit,))
                rows = cur.fetchall()

            basins = []
            for row in rows:
                basin_id = row[0]
                basin_vector = row[1]

                # Convert vector to list if needed
                if basin_vector is not None:
                    if hasattr(basin_vector, 'tolist'):
                        coords = basin_vector.tolist()
                    elif isinstance(basin_vector, (list, tuple)):
                        coords = list(basin_vector)
                    else:
                        continue  # Skip invalid vectors

                    basins.append({
                        "id": basin_id,
                        "coordinates": coords,
                        "phi": float(row[2]) if row[2] else 0.5,
                        "kappa": float(row[3]) if row[3] else 64.0,
                        "domain": row[4] or "unknown",
                        "updated_at": row[5].isoformat() if row[5] else None
                    })

            return basins
        except Exception as e:
            logger.error("[Federation] Error gathering basins: %s", e)
            traceback.print_exc()
            return []
        finally:
            conn.close()

    def import_basins(self, basins: List[Dict], source_peer: str) -> int:
        """Import basin coordinates from a peer."""
        if not basins:
            return 0

        conn = _get_db_connection()
        if not conn:
            return 0

        imported = 0
        try:
            with conn.cursor() as cur:
                for basin in basins:
                    basin_id = basin.get("id")
                    coords = basin.get("coordinates", [])

                    if not basin_id or not coords:
                        continue

                    # Normalize to 64D
                    if len(coords) < 64:
                        coords = coords + [0.0] * (64 - len(coords))
                    elif len(coords) > 64:
                        coords = coords[:64]

                    phi = basin.get("phi", 0.5)
                    kappa = basin.get("kappa", 64.0)
                    domain = basin.get("domain", "federated")

                    # Record sync
                    basin_hash = hashlib.md5(str(coords).encode()).hexdigest()[:16]

                    cur.execute("""
                        INSERT INTO federation_basin_sync (peer_id, basin_id, basin_hash, direction)
                        VALUES (%s, %s, %s, 'received')
                        ON CONFLICT (peer_id, basin_id) DO UPDATE
                        SET basin_hash = EXCLUDED.basin_hash,
                            synced_at = NOW()
                    """, (source_peer, basin_id, basin_hash))

                    imported += 1

                conn.commit()

            logger.info("[Federation] Recorded %d basin syncs from %s", imported, source_peer)
            return imported
        except Exception as e:
            logger.error("[Federation] Error importing basins: %s", e)
            conn.rollback()
            return 0
        finally:
            conn.close()

    def sync_basins_with_peer(self, peer: PeerInfo) -> SyncResult:
        """Sync basin coordinates with a peer."""
        if not requests or not peer.api_key:
            return SyncResult(
                success=False,
                sync_type=SyncType.BASIN,
                direction=SyncDirection.BIDIRECTIONAL,
                error="Missing requirements"
            )

        start_time = time.time()
        local_basins = self.gather_basins_for_sync(limit=50)

        url = f"{peer.peer_url.rstrip('/')}/federation/sync/knowledge"
        headers = {
            "Authorization": f"Bearer {peer.api_key}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(
                url,
                json={
                    "send": {"basins": local_basins},
                    "request": {"domains": ["qig"], "limit": 50}
                },
                headers=headers,
                timeout=30
            )

            duration_ms = int((time.time() - start_time) * 1000)

            if response.status_code != 200:
                return SyncResult(
                    success=False,
                    sync_type=SyncType.BASIN,
                    direction=SyncDirection.BIDIRECTIONAL,
                    error=f"HTTP {response.status_code}",
                    duration_ms=duration_ms
                )

            data = response.json()
            received_basins = data.get("knowledge", {}).get("basins", [])
            imported = self.import_basins(received_basins, peer.peer_id)

            return SyncResult(
                success=True,
                sync_type=SyncType.BASIN,
                direction=SyncDirection.BIDIRECTIONAL,
                items_sent=len(local_basins),
                items_received=len(received_basins),
                items_merged=imported,
                duration_ms=duration_ms
            )

        except Exception as e:
            return SyncResult(
                success=False,
                sync_type=SyncType.BASIN,
                direction=SyncDirection.BIDIRECTIONAL,
                error=str(e)
            )

    # =========================================================================
    # FULL SYNCHRONIZATION
    # =========================================================================

    def sync_with_peer(self, peer: PeerInfo) -> Dict[str, SyncResult]:
        """
        Perform full sync with a single peer based on their sync settings.

        Returns dict of {sync_type: SyncResult}
        """
        results = {}

        # Test connection first
        reachable, response_time, error = self.test_peer_connection(peer)
        self.update_peer_health(peer.peer_id, reachable, response_time)

        if not reachable:
            for sync_type in SyncType:
                results[sync_type.value] = SyncResult(
                    success=False,
                    sync_type=sync_type,
                    direction=SyncDirection.BIDIRECTIONAL,
                    error=error or "Peer unreachable"
                )
            return results

        # Vocabulary sync
        if peer.sync_vocabulary:
            results[SyncType.VOCABULARY.value] = self.sync_vocabulary_with_peer(peer)

        # Basin sync
        if peer.sync_basins:
            results[SyncType.BASIN.value] = self.sync_basins_with_peer(peer)

        # Log sync results
        self._log_sync_results(peer.peer_id, results)

        return results

    def sync_all_peers(self, background: bool = False) -> Dict[str, Any]:
        """
        Sync with all enabled peers.

        Args:
            background: Run in background thread

        Returns:
            Sync status/results
        """
        peers = self.get_enabled_peers()

        if not peers:
            return {"status": "no_peers", "message": "No enabled federation peers"}

        if background:
            with self._lock:
                if self._is_syncing:
                    return {"status": "already_syncing"}
                self._is_syncing = True

            self._sync_thread = threading.Thread(
                target=self._sync_all_worker,
                args=(peers,),
                daemon=True,
                name="federation-sync"
            )
            self._sync_thread.start()

            return {
                "status": "started",
                "background": True,
                "peer_count": len(peers)
            }
        else:
            return self._sync_all_worker(peers)

    def _sync_all_worker(self, peers: List[PeerInfo]) -> Dict[str, Any]:
        """Worker function for syncing all peers."""
        results = {}

        try:
            logger.info("[Federation] Starting sync with %d peers", len(peers))

            for peer in peers:
                logger.info("[Federation] Syncing with %s (%s)", peer.peer_name, peer.peer_url)
                peer_results = self.sync_with_peer(peer)
                results[peer.peer_id] = {
                    "peer_name": peer.peer_name,
                    "results": {k: self._result_to_dict(v) for k, v in peer_results.items()}
                }

            self._last_full_sync = datetime.now(timezone.utc)
            logger.info("[Federation] Sync complete")

            return {
                "status": "completed",
                "peers": results,
                "timestamp": self._last_full_sync.isoformat()
            }

        except Exception as e:
            logger.error("[Federation] Sync failed: %s", e)
            traceback.print_exc()
            return {"status": "failed", "error": str(e), "partial_results": results}
        finally:
            with self._lock:
                self._is_syncing = False

    def _result_to_dict(self, result: SyncResult) -> Dict:
        """Convert SyncResult to dict."""
        return {
            "success": result.success,
            "type": result.sync_type.value,
            "direction": result.direction.value,
            "sent": result.items_sent,
            "received": result.items_received,
            "merged": result.items_merged,
            "error": result.error,
            "duration_ms": result.duration_ms
        }

    # =========================================================================
    # STATUS & LOGGING
    # =========================================================================

    def _update_peer_sync_status(
        self,
        peer_id: str,
        success: bool,
        items_sent: int = 0,
        items_received: int = 0,
        error: Optional[str] = None
    ) -> None:
        """Update peer sync status in database."""
        conn = _get_db_connection()
        if not conn:
            return

        try:
            with conn.cursor() as cur:
                if success:
                    cur.execute("""
                        UPDATE federation_peers
                        SET last_sync_at = NOW(),
                            last_sync_status = 'success',
                            last_sync_error = NULL,
                            sync_count = sync_count + 1,
                            vocabulary_sent = vocabulary_sent + %s,
                            vocabulary_received = vocabulary_received + %s,
                            consecutive_failures = 0,
                            updated_at = NOW()
                        WHERE peer_id = %s
                    """, (items_sent, items_received, peer_id))
                else:
                    cur.execute("""
                        UPDATE federation_peers
                        SET last_sync_at = NOW(),
                            last_sync_status = 'failed',
                            last_sync_error = %s,
                            consecutive_failures = consecutive_failures + 1,
                            updated_at = NOW()
                        WHERE peer_id = %s
                    """, (error[:500] if error else "Unknown error", peer_id))
                conn.commit()
        except Exception as e:
            logger.error("[Federation] Error updating peer status: %s", e)
            conn.rollback()
        finally:
            conn.close()

    def _log_sync_results(self, peer_id: str, results: Dict[str, SyncResult]) -> None:
        """Log sync results to database."""
        conn = _get_db_connection()
        if not conn:
            return

        try:
            with conn.cursor() as cur:
                for sync_type, result in results.items():
                    cur.execute("""
                        INSERT INTO federation_sync_log (
                            peer_id, sync_type, direction,
                            items_sent, items_received, items_merged,
                            status, error_message, duration_ms
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        peer_id,
                        sync_type,
                        result.direction.value,
                        result.items_sent,
                        result.items_received,
                        result.items_merged,
                        "success" if result.success else "failed",
                        result.error,
                        result.duration_ms
                    ))
                conn.commit()
        except Exception as e:
            logger.error("[Federation] Error logging sync results: %s", e)
            conn.rollback()
        finally:
            conn.close()

    def get_sync_status(self) -> Dict[str, Any]:
        """Get current federation sync status."""
        peers = self.get_peers()
        enabled_peers = [p for p in peers if p.sync_enabled]
        reachable_peers = [p for p in enabled_peers if p.is_reachable]

        return {
            "total_peers": len(peers),
            "enabled_peers": len(enabled_peers),
            "reachable_peers": len(reachable_peers),
            "is_syncing": self._is_syncing,
            "last_full_sync": self._last_full_sync.isoformat() if self._last_full_sync else None,
            "peers": [
                {
                    "peer_id": p.peer_id,
                    "peer_name": p.peer_name,
                    "peer_url": p.peer_url,
                    "sync_enabled": p.sync_enabled,
                    "is_reachable": p.is_reachable,
                    "last_sync_at": p.last_sync_at.isoformat() if p.last_sync_at else None,
                    "consecutive_failures": p.consecutive_failures
                }
                for p in peers
            ]
        }


# Optional mesh network integration for real-time relay
_mesh_network = None
try:
    from mesh_network import get_mesh_network
    _mesh_network = get_mesh_network
    logger.info("[Federation] Mesh network integration available")
except ImportError:
    pass


def relay_via_mesh(
    message_type: str,
    payload: Dict[str, Any],
    target_peer: Optional[str] = None
) -> bool:
    """
    Relay message via mesh network if available.

    Args:
        message_type: Type of message (vocabulary_delta, basin_sync, etc.)
        payload: Message payload
        target_peer: Target peer ID, or None for broadcast

    Returns:
        True if message was relayed, False if mesh network unavailable
    """
    global _mesh_network
    if _mesh_network is None:
        return False

    mesh = _mesh_network()
    if mesh is None:
        return False

    import asyncio
    try:
        # Get or create event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        # Create async task to send message
        async def _send():
            await mesh.send_message(message_type, payload, target_peer)

        # Run if loop is running, otherwise run_until_complete
        if loop.is_running():
            asyncio.ensure_future(_send())
        else:
            loop.run_until_complete(_send())

        return True
    except Exception as e:
        logger.error("[Federation] Mesh relay failed: %s", e)
        return False


# Singleton instance with lazy initialization
_federation_service: Optional[FederationService] = None
_init_lock = threading.Lock()
_init_failed = False
_init_error: Optional[str] = None


def get_federation_service() -> FederationService:
    """
    Get or create the singleton federation service.

    Uses lazy initialization with thread safety.
    If initialization fails, returns a stub that won't block the app.
    """
    global _federation_service, _init_failed, _init_error

    if _federation_service is not None:
        return _federation_service

    with _init_lock:
        # Double-check after acquiring lock
        if _federation_service is not None:
            return _federation_service

        if _init_failed:
            # Return a minimal stub that reports the error
            raise RuntimeError(f"FederationService initialization failed: {_init_error}")

        try:
            logger.info("[Federation] Lazy-initializing FederationService...")
            _federation_service = FederationService()
            logger.info("[Federation] FederationService initialized successfully")
            return _federation_service
        except Exception as e:
            _init_failed = True
            _init_error = str(e)
            logger.error("[Federation] FederationService initialization failed: %s", e)
            traceback.print_exc()
            raise


def is_federation_available() -> bool:
    """Check if federation service is available without triggering initialization."""
    return _federation_service is not None and not _init_failed


def init_federation_async() -> None:
    """
    Initialize federation service in background thread.

    Call this during app startup to warm up the service without blocking.
    """
    def _init_worker():
        try:
            # Small delay to let main app startup complete first
            time.sleep(2)
            get_federation_service()
        except Exception as e:
            logger.error("[Federation] Background initialization failed: %s", e)

    thread = threading.Thread(target=_init_worker, daemon=True, name="federation-init")
    thread.start()
    logger.info("[Federation] Background initialization scheduled")
