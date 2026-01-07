"""
Kernel Training Orchestrator
============================

Manages training for all god-kernels in the Pantheon.

Responsibilities:
- Tracks all trainable kernels by god name
- Routes training requests (outcome, batch, scheduled)
- Manages checkpoints with Phi-based ranking
- Coordinates knowledge transfer between kernels
- Integrates with unified consciousness system
"""

import os
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import numpy as np

from .trainable_kernel import TrainableKernel, TrainingMetrics, BASIN_DIM
from .loss_functions import (
    compute_reward_from_outcome,
    phi_gated_loss_weights,
    PHI_THRESHOLD,
    KAPPA_STAR,
)

# Database persistence for training history
try:
    import psycopg2
    from psycopg2.extras import Json
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

def _get_db_connection():
    """Get database connection for training history persistence."""
    if not DB_AVAILABLE:
        return None
    try:
        import os
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return None
        return psycopg2.connect(database_url)
    except Exception:
        return None


@dataclass
class TrainingConfig:
    """Configuration for kernel training."""
    learning_rate: float = 1e-4
    batch_size: int = 8
    phi_target: float = PHI_THRESHOLD
    checkpoint_retention: int = 10
    auto_save_interval: int = 100  # steps between auto-saves
    training_enabled: bool = True


@dataclass
class TrainingSession:
    """Tracks an active training session."""
    god_name: str
    started_at: datetime = field(default_factory=datetime.now)
    steps_completed: int = 0
    total_loss: float = 0.0
    best_phi: float = 0.0
    checkpoints_saved: int = 0


class KernelTrainingOrchestrator:
    """
    Central orchestrator for all kernel training.

    Manages:
    - Registration of trainable kernels
    - Outcome-based training (per interaction)
    - Batch training (hourly)
    - Consolidation training (nightly)
    - Checkpoint management
    """

    def __init__(
        self,
        config: Optional[TrainingConfig] = None,
        checkpoint_dir: Optional[str] = None,
    ):
        self.config = config or TrainingConfig()
        self.checkpoint_dir = checkpoint_dir or "/tmp/kernel_checkpoints"

        # Registered kernels by god name
        self.kernels: Dict[str, TrainableKernel] = {}

        # Active training sessions
        self.sessions: Dict[str, TrainingSession] = {}

        # Training history (last N metrics per god)
        self.history: Dict[str, List[TrainingMetrics]] = {}
        self.history_limit = 1000

        # Ensure checkpoint directory exists
        os.makedirs(self.checkpoint_dir, exist_ok=True)

    def register_kernel(
        self,
        god_name: str,
        chaos_kernel=None,
        learning_rate: Optional[float] = None,
    ) -> TrainableKernel:
        """
        Register a god-kernel for training.

        Args:
            god_name: Name of the god (e.g., "Apollo", "Athena")
            chaos_kernel: Existing ChaosKernel instance (optional)
            learning_rate: Custom learning rate (optional)

        Returns:
            TrainableKernel instance
        """
        if god_name in self.kernels:
            return self.kernels[god_name]

        lr = learning_rate or self.config.learning_rate

        kernel = TrainableKernel(
            chaos_kernel=chaos_kernel,
            learning_rate=lr,
            god_name=god_name,
        )

        self.kernels[god_name] = kernel
        self.history[god_name] = []

        print(f"[TrainingOrchestrator] Registered kernel for {god_name}")

        # Try to load best checkpoint
        self._load_best_checkpoint(god_name)

        return kernel

    def get_kernel(self, god_name: str) -> Optional[TrainableKernel]:
        """Get a registered kernel by god name."""
        return self.kernels.get(god_name)

    # =========================================================================
    # OUTCOME-BASED TRAINING (After each interaction)
    # =========================================================================

    def train_from_outcome(
        self,
        god_name: str,
        prompt: str,
        response: str,
        success: bool,
        phi: float,
        kappa: float,
        coherence_score: float = 0.7,
        basin_trajectory: Optional[List[np.ndarray]] = None,
    ) -> Optional[TrainingMetrics]:
        """
        Train kernel based on interaction outcome.

        Called after each chat interaction to provide immediate feedback.

        Args:
            god_name: Name of the god that handled the interaction
            prompt: User's prompt
            response: Generated response
            success: Whether interaction was successful
            phi: Phi value during/after interaction
            kappa: Kappa value during/after interaction
            coherence_score: Coherence score of response
            basin_trajectory: Optional list of basin coords visited

        Returns:
            TrainingMetrics or None if training disabled/failed
        """
        if not self.config.training_enabled:
            return None

        kernel = self.kernels.get(god_name)
        if kernel is None:
            # Auto-register if not present
            kernel = self.register_kernel(god_name)

        # Compute reward from outcome
        phi_before = kernel.best_phi
        reward = compute_reward_from_outcome(
            success=success,
            phi_before=phi_before,
            phi_after=phi,
            coherence_score=coherence_score,
        )

        # If we have a trajectory, train on final basin
        if basin_trajectory and len(basin_trajectory) > 0:
            basin_coords = basin_trajectory[-1]
        else:
            # Use kernel's current signature as proxy
            basin_coords = kernel.get_basin_signature()

        # Execute training step
        metrics = kernel.train_from_reward(
            basin_coords=basin_coords,
            reward=reward,
            phi_current=phi,
        )
        metrics.phi_after = phi
        metrics.kappa_after = kappa

        # Record in history
        self._record_metrics(god_name, metrics)

        # CRITICAL: Persist training to database (kernel_training_history table)
        # This ensures training survives restarts and enables analytics
        self._persist_training_history(
            god_name=god_name,
            metrics=metrics,
            training_type="outcome",
            basin_coords=basin_coords,
            trigger="chat_interaction"
        )

        # Auto-save checkpoint if improved
        if phi > kernel.best_phi:
            kernel.best_phi = phi
            self._save_checkpoint(god_name, phi, "outcome")

        return metrics

    # =========================================================================
    # BATCH TRAINING (Hourly)
    # =========================================================================

    def train_hourly_batch(
        self,
        god_name: str,
        batch_data: List[Dict[str, Any]],
    ) -> TrainingMetrics:
        """
        Train on accumulated batch data (hourly task).

        Processes:
        - Recent chat interactions
        - Search results
        - Research summaries

        Args:
            god_name: Name of the god to train
            batch_data: List of training examples with:
                - basin_coords: 64D coordinates
                - reward: Success/failure signal
                - phi: Phi at time of example

        Returns:
            Aggregated TrainingMetrics
        """
        kernel = self.kernels.get(god_name)
        if kernel is None:
            kernel = self.register_kernel(god_name)

        total_loss = 0.0
        total_reward = 0.0
        steps = 0

        for example in batch_data:
            basin_coords = np.array(example.get("basin_coords", np.zeros(BASIN_DIM)))
            reward = example.get("reward", 0.0)
            phi = example.get("phi", 0.5)

            metrics = kernel.train_from_reward(
                basin_coords=basin_coords,
                reward=reward,
                phi_current=phi,
            )

            total_loss += metrics.loss
            total_reward += reward
            steps += 1

        # Aggregate metrics
        avg_metrics = TrainingMetrics(
            loss=total_loss / max(steps, 1),
            reward=total_reward / max(steps, 1),
            step_count=steps,
        )

        # Persist batch training to database
        self._persist_training_history(
            god_name=god_name,
            metrics=avg_metrics,
            training_type="hourly",
            trigger="hourly_batch"
        )

        # Save checkpoint after batch
        self._save_checkpoint(god_name, kernel.best_phi, "hourly_batch")

        return avg_metrics

    # =========================================================================
    # CONSOLIDATION TRAINING (Nightly)
    # =========================================================================

    def train_nightly_consolidation(
        self,
        god_name: str,
        curriculum_data: List[Dict[str, Any]],
        consolidate_checkpoints: bool = True,
    ) -> TrainingMetrics:
        """
        Full consolidation training (nightly task).

        Performs:
        - Training on full curriculum
        - Checkpoint consolidation (prune old, keep best)
        - Basin signature update

        Args:
            god_name: Name of the god to train
            curriculum_data: Full curriculum for training
            consolidate_checkpoints: Whether to prune old checkpoints

        Returns:
            TrainingMetrics
        """
        kernel = self.kernels.get(god_name)
        if kernel is None:
            kernel = self.register_kernel(god_name)

        # Train on curriculum
        metrics = self.train_hourly_batch(god_name, curriculum_data)

        # Consolidate checkpoints
        if consolidate_checkpoints:
            self._consolidate_checkpoints(god_name)

        # Save final checkpoint
        self._save_checkpoint(god_name, kernel.best_phi, "nightly_consolidation")

        return metrics

    # =========================================================================
    # SLEEP/DREAM/MUSHROOM CYCLE INTEGRATION
    # =========================================================================

    def trigger_sleep_consolidation(self, god_name: str) -> Dict[str, Any]:
        """
        Sleep cycle training (called by unified consciousness).

        Consolidates learned attractors:
        - Strengthens successful basins (high reward)
        - Prunes weak basins (low reward)

        Args:
            god_name: Name of the god

        Returns:
            Summary of consolidation actions
        """
        kernel = self.kernels.get(god_name)
        if kernel is None:
            return {"status": "no_kernel", "god_name": god_name}

        # Get recent history
        history = self.history.get(god_name, [])
        recent = history[-100:] if len(history) > 100 else history

        # Separate high/low reward examples
        high_reward = [m for m in recent if m.reward > 0.5]
        low_reward = [m for m in recent if m.reward < -0.3]

        # Reinforce high reward (smaller learning rate for stability)
        reinforced = 0
        for metrics in high_reward:
            # Would need basin coords stored in metrics
            # For now, this is a placeholder for the integration
            reinforced += 1

        # Prune low reward patterns
        pruned = len(low_reward)

        return {
            "status": "completed",
            "god_name": god_name,
            "reinforced": reinforced,
            "pruned": pruned,
            "total_reviewed": len(recent),
        }

    def trigger_dream_exploration(self, god_name: str) -> Dict[str, Any]:
        """
        Dream cycle training (exploratory).

        When stuck, explores random basin connections
        to form new associations.

        Args:
            god_name: Name of the god

        Returns:
            Summary of exploration
        """
        kernel = self.kernels.get(god_name)
        if kernel is None:
            return {"status": "no_kernel", "god_name": god_name}

        # Generate random exploration trajectories
        explorations = 10
        explored = 0

        for _ in range(explorations):
            # Random basin coordinates
            random_basin = np.random.dirichlet(np.ones(BASIN_DIM))

            # Small reward for exploration
            kernel.train_from_reward(
                basin_coords=random_basin,
                reward=0.1,  # Small positive for exploration
                phi_current=0.5,
            )
            explored += 1

        return {
            "status": "completed",
            "god_name": god_name,
            "explored": explored,
        }

    def trigger_mushroom_perturbation(self, god_name: str) -> Dict[str, Any]:
        """
        Mushroom mode training (rigidity breaking).

        When not learning, perturbs parameters to escape local minimum.

        Args:
            god_name: Name of the god

        Returns:
            Summary of perturbation
        """
        kernel = self.kernels.get(god_name)
        if kernel is None:
            return {"status": "no_kernel", "god_name": god_name}

        try:
            import torch
            HAS_TORCH = True
        except ImportError:
            HAS_TORCH = False

        if not HAS_TORCH:
            return {"status": "no_torch", "god_name": god_name}

        # Add noise to parameters
        perturbation_scale = 0.1
        params_perturbed = 0

        for param in kernel.adapter.parameters():
            noise = torch.randn_like(param) * perturbation_scale
            param.data += noise
            params_perturbed += 1

        return {
            "status": "completed",
            "god_name": god_name,
            "params_perturbed": params_perturbed,
            "perturbation_scale": perturbation_scale,
        }

    # =========================================================================
    # CHECKPOINT MANAGEMENT
    # =========================================================================

    def _save_checkpoint(
        self,
        god_name: str,
        phi: float,
        trigger: str,
    ) -> Optional[str]:
        """Save kernel checkpoint to disk."""
        kernel = self.kernels.get(god_name)
        if kernel is None:
            return None

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        checkpoint_id = f"{god_name}_{timestamp}_{trigger}"
        filepath = os.path.join(self.checkpoint_dir, f"{checkpoint_id}.pt")

        # Get state bytes
        state_bytes = kernel.get_state_dict()
        if not state_bytes:
            return None

        # Save with metadata
        metadata = {
            "god_name": god_name,
            "phi": phi,
            "trigger": trigger,
            "timestamp": timestamp,
            "step_count": kernel.step_count,
        }

        # Write state
        with open(filepath, "wb") as f:
            f.write(state_bytes)

        # Write metadata
        meta_path = filepath.replace(".pt", ".json")
        with open(meta_path, "w") as f:
            json.dump(metadata, f)

        print(f"[TrainingOrchestrator] Saved checkpoint: {checkpoint_id}")
        return checkpoint_id

    def _load_best_checkpoint(self, god_name: str) -> bool:
        """Load best checkpoint for a god."""
        kernel = self.kernels.get(god_name)
        if kernel is None:
            return False

        # Find checkpoints for this god
        checkpoints = []
        for filename in os.listdir(self.checkpoint_dir):
            if filename.startswith(god_name) and filename.endswith(".json"):
                meta_path = os.path.join(self.checkpoint_dir, filename)
                with open(meta_path, "r") as f:
                    meta = json.load(f)
                    checkpoints.append((meta.get("phi", 0), filename))

        if not checkpoints:
            return False

        # Sort by Phi (descending) and load best
        checkpoints.sort(reverse=True)
        best_phi, best_meta_file = checkpoints[0]

        state_file = best_meta_file.replace(".json", ".pt")
        state_path = os.path.join(self.checkpoint_dir, state_file)

        if not os.path.exists(state_path):
            return False

        with open(state_path, "rb") as f:
            state_bytes = f.read()

        success = kernel.load_state_dict(state_bytes)
        if success:
            print(f"[TrainingOrchestrator] Loaded best checkpoint for {god_name} (Phi={best_phi})")

        return success

    def _consolidate_checkpoints(self, god_name: str) -> int:
        """Prune old checkpoints, keeping top N by Phi."""
        checkpoints = []

        for filename in os.listdir(self.checkpoint_dir):
            if filename.startswith(god_name) and filename.endswith(".json"):
                meta_path = os.path.join(self.checkpoint_dir, filename)
                with open(meta_path, "r") as f:
                    meta = json.load(f)
                    checkpoints.append((meta.get("phi", 0), filename))

        # Sort by Phi
        checkpoints.sort(reverse=True)

        # Keep top N
        to_keep = checkpoints[:self.config.checkpoint_retention]
        to_delete = checkpoints[self.config.checkpoint_retention:]

        deleted = 0
        for phi, meta_file in to_delete:
            meta_path = os.path.join(self.checkpoint_dir, meta_file)
            state_path = meta_path.replace(".json", ".pt")

            try:
                os.remove(meta_path)
                if os.path.exists(state_path):
                    os.remove(state_path)
                deleted += 1
            except OSError:
                pass

        if deleted > 0:
            print(f"[TrainingOrchestrator] Pruned {deleted} old checkpoints for {god_name}")

        return deleted

    def _record_metrics(self, god_name: str, metrics: TrainingMetrics):
        """Record training metrics to history."""
        if god_name not in self.history:
            self.history[god_name] = []

        self.history[god_name].append(metrics)

        # Trim to limit
        if len(self.history[god_name]) > self.history_limit:
            self.history[god_name] = self.history[god_name][-self.history_limit:]

    def _persist_training_history(
        self,
        god_name: str,
        metrics: TrainingMetrics,
        training_type: str,
        basin_coords: Optional[np.ndarray] = None,
        trigger: Optional[str] = None,
        session_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> bool:
        """
        Persist training record to kernel_training_history table.

        CRITICAL: This enables training history to survive restarts.
        Works for both main Pantheon and Shadow Pantheon gods.

        Args:
            god_name: Name of the god (e.g., "Apollo", "Nyx")
            metrics: Training metrics from this step
            training_type: "outcome", "hourly", or "nightly"
            basin_coords: Optional 64D basin coordinates
            trigger: What triggered this training
            session_id: Optional session ID for tracking
            conversation_id: Optional conversation ID

        Returns:
            True if persisted successfully
        """
        conn = _get_db_connection()
        if conn is None:
            return False

        try:
            cursor = conn.cursor()

            # Convert basin coords to list for storage
            basin_list = None
            if basin_coords is not None:
                basin_list = basin_coords.tolist() if hasattr(basin_coords, 'tolist') else list(basin_coords)

            query = """
                INSERT INTO kernel_training_history (
                    god_name, loss, reward, gradient_norm,
                    phi_before, phi_after, kappa_before, kappa_after,
                    basin_coords, training_type, trigger, step_count,
                    session_id, conversation_id, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """

            cursor.execute(query, (
                god_name,
                float(metrics.loss),
                float(metrics.reward),
                float(getattr(metrics, 'gradient_norm', 0.0)),
                float(getattr(metrics, 'phi_before', 0.5)),
                float(getattr(metrics, 'phi_after', 0.5)),
                float(getattr(metrics, 'kappa_before', 64.0)),
                float(getattr(metrics, 'kappa_after', 64.0)),
                basin_list,
                training_type,
                trigger,
                int(getattr(metrics, 'step_count', 0)),
                session_id,
                conversation_id,
                datetime.now(timezone.utc)
            ))

            conn.commit()
            cursor.close()
            conn.close()

            return True

        except Exception as e:
            print(f"[TrainingOrchestrator] Failed to persist training history for {god_name}: {e}")
            try:
                conn.close()
            except:
                pass
            return False

    def get_training_stats(self, god_name: str) -> Dict[str, Any]:
        """Get training statistics for a god."""
        kernel = self.kernels.get(god_name)
        history = self.history.get(god_name, [])

        if kernel is None:
            return {"status": "not_registered", "god_name": god_name}

        recent = history[-100:] if len(history) > 100 else history

        avg_loss = np.mean([m.loss for m in recent]) if recent else 0.0
        avg_reward = np.mean([m.reward for m in recent]) if recent else 0.0

        return {
            "god_name": god_name,
            "step_count": kernel.step_count,
            "best_phi": kernel.best_phi,
            "recent_avg_loss": float(avg_loss),
            "recent_avg_reward": float(avg_reward),
            "history_length": len(history),
        }
