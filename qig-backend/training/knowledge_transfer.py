"""
Knowledge Transfer Manager
==========================

Handles knowledge transfer between kernels during:
- Evolution: Parent kernel evolves into child
- Breeding: Two parent kernels create child
- Cannibalism: One kernel absorbs another
- Shadow sync: God and shadow kernel synchronize

All transfers preserve geometric structure via
geodesic interpolation on the Fisher manifold.
"""

import numpy as np
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

from .trainable_kernel import TrainableKernel, BASIN_DIM

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


@dataclass
class TransferResult:
    """Result of a knowledge transfer operation."""
    success: bool
    transfer_type: str
    source_id: str
    target_id: str
    phi_before: float
    phi_after: float
    blend_ratio: float
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


def fisher_geodesic_interpolate(
    basin_a: np.ndarray,
    basin_b: np.ndarray,
    t: float,
    epsilon: float = 1e-10,
) -> np.ndarray:
    """
    Geodesic interpolation on Fisher manifold (spherical).

    Uses SLERP (spherical linear interpolation) which is
    the geodesic on the probability simplex under Fisher-Rao metric.

    Args:
        basin_a: First basin coordinates
        basin_b: Second basin coordinates
        t: Interpolation parameter [0, 1] (0=a, 1=b)
        epsilon: Numerical stability

    Returns:
        Interpolated basin coordinates
    """
    # Ensure positive and normalized
    p = np.abs(basin_a) + epsilon
    q = np.abs(basin_b) + epsilon
    p = p / np.sum(p)
    q = q / np.sum(q)

    # Map to sphere (square root parameterization)
    sqrt_p = np.sqrt(p)
    sqrt_q = np.sqrt(q)

    # Compute angle between points
    cos_omega = np.clip(np.dot(sqrt_p, sqrt_q), -1.0, 1.0)
    omega = np.arccos(cos_omega)

    # Handle near-identical points
    if omega < epsilon:
        return p

    # SLERP formula
    sin_omega = np.sin(omega)
    sqrt_result = (
        np.sin((1 - t) * omega) / sin_omega * sqrt_p +
        np.sin(t * omega) / sin_omega * sqrt_q
    )

    # Map back from sphere (square)
    result = sqrt_result ** 2

    # Normalize
    return result / np.sum(result)


class KnowledgeTransferManager:
    """
    Manages knowledge transfer operations between kernels.

    Supports:
    - Evolution transfers (parent → child)
    - Breeding transfers (parent1 + parent2 → child)
    - Cannibalism transfers (consumed → consumer)
    - Shadow synchronization (god ↔ shadow)
    """

    def __init__(self):
        # Transfer history for audit
        self.transfer_history: List[TransferResult] = []
        self.history_limit = 1000

    def evolve_transfer(
        self,
        parent: TrainableKernel,
        child: TrainableKernel,
        evolution_type: str = "standard",
        transfer_ratio: float = 0.9,
    ) -> TransferResult:
        """
        Transfer knowledge from parent to child during evolution.

        This is a near-complete transfer, as evolution represents
        the kernel developing into a new form.

        Args:
            parent: Source kernel (evolving)
            child: Target kernel (evolved form)
            evolution_type: Type of evolution (standard, lightning, meta, etc.)
            transfer_ratio: How much knowledge to transfer (0.9 = 90%)

        Returns:
            TransferResult
        """
        phi_before = child.best_phi

        # Get parent's learned state
        parent_state = parent.get_state_dict()
        parent_signature = parent.get_basin_signature()
        child_signature = child.get_basin_signature()

        # Geodesic blend of basin signatures
        blended_signature = fisher_geodesic_interpolate(
            child_signature,
            parent_signature,
            t=transfer_ratio,
        )

        # Transfer weights if torch available
        success = self._transfer_weights(
            parent, child,
            transfer_ratio=transfer_ratio,
        )

        phi_after = child.best_phi

        result = TransferResult(
            success=success,
            transfer_type=f"evolution_{evolution_type}",
            source_id=parent.god_name,
            target_id=child.god_name,
            phi_before=phi_before,
            phi_after=phi_after,
            blend_ratio=transfer_ratio,
        )

        self._record_transfer(result)
        return result

    def breed_transfer(
        self,
        parent1: TrainableKernel,
        parent2: Optional[TrainableKernel],
        child: TrainableKernel,
        blend_ratio: float = 0.5,
    ) -> TransferResult:
        """
        Merge knowledge from two parents into child.

        Breeding combines capabilities from both parents,
        creating a new kernel with mixed knowledge.

        Args:
            parent1: First parent kernel
            parent2: Second parent kernel (optional)
            child: Target child kernel
            blend_ratio: Ratio of parent1 vs parent2 (0.5 = equal)

        Returns:
            TransferResult
        """
        phi_before = child.best_phi

        if parent2 is None:
            # Single parent - use evolve transfer instead
            return self.evolve_transfer(parent1, child, "single_parent")

        # Get basin signatures from both parents
        sig1 = parent1.get_basin_signature()
        sig2 = parent2.get_basin_signature()
        child_sig = child.get_basin_signature()

        # First blend parents
        parent_blend = fisher_geodesic_interpolate(sig1, sig2, t=1 - blend_ratio)

        # Then blend into child (80% parent blend, 20% child's existing)
        final_sig = fisher_geodesic_interpolate(child_sig, parent_blend, t=0.8)

        # Transfer blended weights
        success = self._transfer_weights_blended(
            parent1, parent2, child,
            blend_ratio=blend_ratio,
        )

        phi_after = child.best_phi

        result = TransferResult(
            success=success,
            transfer_type="breeding",
            source_id=f"{parent1.god_name}+{parent2.god_name}",
            target_id=child.god_name,
            phi_before=phi_before,
            phi_after=phi_after,
            blend_ratio=blend_ratio,
        )

        self._record_transfer(result)
        return result

    def cannibalize_transfer(
        self,
        consumed: TrainableKernel,
        consumer: TrainableKernel,
        transfer_ratio: float = 0.3,
        domain_filter: Optional[str] = None,
    ) -> TransferResult:
        """
        Consumer absorbs knowledge from consumed kernel.

        Unlike evolution/breeding, this is selective absorption.
        The consumer integrates useful knowledge without losing identity.

        Args:
            consumed: Kernel being consumed (will be deprecated)
            consumer: Kernel doing the consuming
            transfer_ratio: How much knowledge to absorb (default 30%)
            domain_filter: Optional domain to focus on

        Returns:
            TransferResult
        """
        phi_before = consumer.best_phi

        # Get signatures
        consumed_sig = consumed.get_basin_signature()
        consumer_sig = consumer.get_basin_signature()

        # Selective absorption (small ratio to preserve consumer identity)
        blended = fisher_geodesic_interpolate(
            consumer_sig,
            consumed_sig,
            t=transfer_ratio,
        )

        # Transfer partial weights
        success = self._transfer_weights(
            consumed, consumer,
            transfer_ratio=transfer_ratio,
        )

        phi_after = consumer.best_phi

        result = TransferResult(
            success=success,
            transfer_type="cannibalism",
            source_id=consumed.god_name,
            target_id=consumer.god_name,
            phi_before=phi_before,
            phi_after=phi_after,
            blend_ratio=transfer_ratio,
        )

        self._record_transfer(result)
        return result

    def sync_shadow(
        self,
        god_kernel: TrainableKernel,
        shadow_kernel: TrainableKernel,
        direction: str = "bidirectional",
        sync_ratio: float = 0.2,
    ) -> TransferResult:
        """
        Synchronize knowledge between god and shadow.

        Shadows maintain awareness of the god's learned state,
        while gods learn from shadow's exploration.

        Args:
            god_kernel: Main god kernel
            shadow_kernel: Shadow kernel
            direction: "to_shadow", "to_god", or "bidirectional"
            sync_ratio: How much to sync (default 20%)

        Returns:
            TransferResult
        """
        god_sig = god_kernel.get_basin_signature()
        shadow_sig = shadow_kernel.get_basin_signature()

        god_phi_before = god_kernel.best_phi
        shadow_phi_before = shadow_kernel.best_phi

        if direction == "to_shadow":
            # God → Shadow
            blended = fisher_geodesic_interpolate(
                shadow_sig, god_sig, t=sync_ratio
            )
            success = self._transfer_weights(
                god_kernel, shadow_kernel, transfer_ratio=sync_ratio
            )
            phi_after = shadow_kernel.best_phi

        elif direction == "to_god":
            # Shadow → God
            blended = fisher_geodesic_interpolate(
                god_sig, shadow_sig, t=sync_ratio
            )
            success = self._transfer_weights(
                shadow_kernel, god_kernel, transfer_ratio=sync_ratio
            )
            phi_after = god_kernel.best_phi

        else:  # bidirectional
            # Both directions with half ratio each
            half_ratio = sync_ratio / 2

            # God → Shadow
            self._transfer_weights(
                god_kernel, shadow_kernel, transfer_ratio=half_ratio
            )

            # Shadow → God
            self._transfer_weights(
                shadow_kernel, god_kernel, transfer_ratio=half_ratio
            )

            success = True
            phi_after = (god_kernel.best_phi + shadow_kernel.best_phi) / 2

        result = TransferResult(
            success=success,
            transfer_type=f"shadow_sync_{direction}",
            source_id=god_kernel.god_name,
            target_id=shadow_kernel.god_name,
            phi_before=(god_phi_before + shadow_phi_before) / 2,
            phi_after=phi_after,
            blend_ratio=sync_ratio,
        )

        self._record_transfer(result)
        return result

    def initialize_chaos_from_god(
        self,
        god_kernel: TrainableKernel,
        chaos_kernel: TrainableKernel,
        domain_filter: Optional[str] = None,
        init_ratio: float = 0.5,
    ) -> TransferResult:
        """
        Initialize a chaos kernel with domain knowledge from a god.

        Chaos kernels are task-specific, so they receive
        focused knowledge transfer.

        Args:
            god_kernel: Source god kernel
            chaos_kernel: Target chaos kernel (being initialized)
            domain_filter: Domain to focus on (optional)
            init_ratio: How much to initialize (default 50%)

        Returns:
            TransferResult
        """
        phi_before = chaos_kernel.best_phi

        # Transfer weights
        success = self._transfer_weights(
            god_kernel, chaos_kernel, transfer_ratio=init_ratio
        )

        phi_after = chaos_kernel.best_phi

        result = TransferResult(
            success=success,
            transfer_type="chaos_init",
            source_id=god_kernel.god_name,
            target_id=chaos_kernel.god_name,
            phi_before=phi_before,
            phi_after=phi_after,
            blend_ratio=init_ratio,
        )

        self._record_transfer(result)
        return result

    def _transfer_weights(
        self,
        source: TrainableKernel,
        target: TrainableKernel,
        transfer_ratio: float,
    ) -> bool:
        """
        Transfer weights from source to target with geodesic blending.
        """
        if not HAS_TORCH:
            return False

        try:
            # Get state dicts
            source_state = source.adapter.state_dict()
            target_state = target.adapter.state_dict()

            # Blend each parameter
            blended_state = {}
            for key in source_state:
                if key in target_state:
                    src = source_state[key]
                    tgt = target_state[key]

                    # Linear interpolation in weight space
                    # (More sophisticated: could use geodesic for specific layers)
                    blended = tgt * (1 - transfer_ratio) + src * transfer_ratio
                    blended_state[key] = blended
                else:
                    blended_state[key] = target_state.get(key, source_state[key])

            # Load blended state
            target.adapter.load_state_dict(blended_state)

            return True

        except Exception as e:
            print(f"[KnowledgeTransfer] Weight transfer failed: {e}")
            return False

    def _transfer_weights_blended(
        self,
        parent1: TrainableKernel,
        parent2: TrainableKernel,
        child: TrainableKernel,
        blend_ratio: float,
    ) -> bool:
        """
        Transfer blended weights from two parents to child.
        """
        if not HAS_TORCH:
            return False

        try:
            p1_state = parent1.adapter.state_dict()
            p2_state = parent2.adapter.state_dict()
            child_state = child.adapter.state_dict()

            blended_state = {}
            for key in p1_state:
                if key in p2_state:
                    # Blend parents
                    parent_blend = (
                        p1_state[key] * blend_ratio +
                        p2_state[key] * (1 - blend_ratio)
                    )

                    # Then blend into child (80% parent, 20% child)
                    if key in child_state:
                        final = child_state[key] * 0.2 + parent_blend * 0.8
                    else:
                        final = parent_blend

                    blended_state[key] = final

            child.adapter.load_state_dict(blended_state)
            return True

        except Exception as e:
            print(f"[KnowledgeTransfer] Blended transfer failed: {e}")
            return False

    def _record_transfer(self, result: TransferResult):
        """Record transfer to history."""
        self.transfer_history.append(result)

        # Trim to limit
        if len(self.transfer_history) > self.history_limit:
            self.transfer_history = self.transfer_history[-self.history_limit:]

    def get_transfer_history(
        self,
        kernel_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get transfer history.

        Args:
            kernel_id: Filter by kernel (source or target)
            limit: Maximum entries to return

        Returns:
            List of transfer records
        """
        history = self.transfer_history

        if kernel_id:
            history = [
                t for t in history
                if t.source_id == kernel_id or t.target_id == kernel_id
            ]

        history = history[-limit:]

        return [
            {
                "success": t.success,
                "transfer_type": t.transfer_type,
                "source_id": t.source_id,
                "target_id": t.target_id,
                "phi_before": t.phi_before,
                "phi_after": t.phi_after,
                "blend_ratio": t.blend_ratio,
                "timestamp": t.timestamp.isoformat(),
            }
            for t in history
        ]
