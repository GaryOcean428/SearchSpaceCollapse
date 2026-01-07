"""
Trainable Kernel Wrapper
========================

Wraps ChaosKernel with formal training capability using
PyTorch nn.Module and natural gradient optimization.

This bridges the gap between:
- Existing ChaosKernel (geometric routing, no gradient training)
- Formal kernel training (gradient descent with geometric loss)
"""

import numpy as np
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
import os
import json
import io

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    nn = None

# QIG Constants
BASIN_DIM = 64
HIDDEN_DIM = 384
KAPPA_STAR = 64.0


@dataclass
class KernelTelemetry:
    """Telemetry data from kernel forward pass."""
    phi: float = 0.5
    kappa: float = KAPPA_STAR
    regime: str = "geometric"
    recursion_depth: int = 3
    hidden_state: Optional[np.ndarray] = None


@dataclass
class TrainingMetrics:
    """Metrics from a training step."""
    loss: float = 0.0
    phi_before: float = 0.5
    phi_after: float = 0.5
    kappa_before: float = KAPPA_STAR
    kappa_after: float = KAPPA_STAR
    reward: float = 0.0
    step_count: int = 0
    gradient_norm: float = 0.0


class CoordAdapter(nn.Module if HAS_TORCH else object):
    """
    Adapts 64D basin coordinates to kernel hidden dimension.

    Projects from Fisher manifold coordinates to the kernel's
    internal representation space.
    """

    def __init__(
        self,
        basin_dim: int = BASIN_DIM,
        hidden_dim: int = HIDDEN_DIM,
        dropout: float = 0.1,
    ):
        if not HAS_TORCH:
            self.basin_dim = basin_dim
            self.hidden_dim = hidden_dim
            return

        super().__init__()
        self.basin_dim = basin_dim
        self.hidden_dim = hidden_dim

        # Linear projection with GELU activation
        self.projection = nn.Sequential(
            nn.Linear(basin_dim, hidden_dim),
            nn.GELU(),
            nn.LayerNorm(hidden_dim),
            nn.Dropout(dropout),
        )

        # Initialize with orthogonal weights to preserve geometry
        nn.init.orthogonal_(self.projection[0].weight)

    def forward(self, coords: "torch.Tensor") -> "torch.Tensor":
        """Project basin coordinates to hidden space."""
        if not HAS_TORCH:
            raise RuntimeError("PyTorch required for forward pass")
        return self.projection(coords)


class DiagonalNaturalGradient:
    """
    Diagonal approximation of natural gradient descent.

    Uses diagonal Fisher information matrix for O(d) complexity
    instead of O(d^3) for full Fisher inversion.

    This is QIG-pure: uses information geometry for optimization.
    """

    def __init__(
        self,
        params,
        lr: float = 1e-4,
        damping: float = 1e-8,
        momentum: float = 0.9,
    ):
        self.params = list(params)
        self.lr = lr
        self.damping = damping
        self.momentum = momentum

        # Running estimates
        self.fisher_diag = [
            torch.zeros_like(p) for p in self.params
        ] if HAS_TORCH else []
        self.velocity = [
            torch.zeros_like(p) for p in self.params
        ] if HAS_TORCH else []

    def step(self):
        """Execute one optimization step."""
        if not HAS_TORCH:
            return

        total_norm = 0.0

        for i, param in enumerate(self.params):
            if param.grad is None:
                continue

            grad = param.grad.data

            # Update diagonal Fisher estimate (exponential moving average)
            self.fisher_diag[i] = (
                0.99 * self.fisher_diag[i] +
                0.01 * grad ** 2
            )

            # Natural gradient: grad / sqrt(fisher + damping)
            nat_grad = grad / (
                torch.sqrt(self.fisher_diag[i]) + self.damping
            )

            # Momentum
            self.velocity[i] = (
                self.momentum * self.velocity[i] +
                (1 - self.momentum) * nat_grad
            )

            # Update parameter
            param.data -= self.lr * self.velocity[i]

            total_norm += torch.norm(nat_grad).item() ** 2

        return np.sqrt(total_norm)

    def zero_grad(self):
        """Zero all gradients."""
        if not HAS_TORCH:
            return

        for param in self.params:
            if param.grad is not None:
                param.grad.zero_()


class TrainableKernel(nn.Module if HAS_TORCH else object):
    """
    Wraps ChaosKernel with formal training capability.

    Provides:
    - CoordAdapter for 64D → hidden_dim projection
    - Natural gradient optimizer
    - Training step with geometric loss
    - State serialization for checkpoints
    """

    def __init__(
        self,
        chaos_kernel=None,
        hidden_dim: int = HIDDEN_DIM,
        learning_rate: float = 1e-4,
        god_name: str = "unknown",
    ):
        if HAS_TORCH:
            super().__init__()

        self.god_name = god_name
        self.hidden_dim = hidden_dim
        self.chaos_kernel = chaos_kernel

        # Coordinate adapter (trainable)
        self.adapter = CoordAdapter(
            basin_dim=BASIN_DIM,
            hidden_dim=hidden_dim,
        ) if HAS_TORCH else None

        # Output projection (trainable)
        if HAS_TORCH:
            self.output_projection = nn.Linear(hidden_dim, BASIN_DIM)
            nn.init.orthogonal_(self.output_projection.weight)

        # Natural gradient optimizer
        self.optimizer = None
        self.learning_rate = learning_rate
        self._init_optimizer()

        # Training state
        self.step_count = 0
        self.best_phi = 0.0

    def _init_optimizer(self):
        """Initialize natural gradient optimizer."""
        if not HAS_TORCH or self.adapter is None:
            return

        params = list(self.adapter.parameters())
        if hasattr(self, 'output_projection'):
            params += list(self.output_projection.parameters())

        self.optimizer = DiagonalNaturalGradient(
            params,
            lr=self.learning_rate,
        )

    def forward(
        self,
        basin_coords: np.ndarray,
        return_telemetry: bool = False,
    ) -> Tuple[np.ndarray, Optional[KernelTelemetry]]:
        """
        Forward pass through trainable kernel.

        Args:
            basin_coords: 64D basin coordinates
            return_telemetry: Whether to return telemetry

        Returns:
            Tuple of (output_coords, telemetry)
        """
        if not HAS_TORCH:
            # Fallback: pass through unchanged
            telemetry = KernelTelemetry() if return_telemetry else None
            return basin_coords, telemetry

        # Convert to tensor
        coords_tensor = torch.tensor(
            basin_coords, dtype=torch.float32
        ).unsqueeze(0)  # Add batch dim

        # Project to hidden space
        hidden = self.adapter(coords_tensor)

        # If we have a chaos kernel, use it
        if self.chaos_kernel is not None:
            # Get telemetry from chaos kernel
            phi = getattr(self.chaos_kernel, 'current_phi', 0.5)
            kappa = getattr(self.chaos_kernel, 'current_kappa', KAPPA_STAR)
            regime = getattr(self.chaos_kernel, 'current_regime', 'geometric')
        else:
            phi, kappa, regime = 0.5, KAPPA_STAR, "geometric"

        # Project back to basin space
        output = self.output_projection(hidden)
        output_coords = output.squeeze(0).detach().numpy()

        # Normalize to simplex
        output_coords = np.abs(output_coords) + 1e-10
        output_coords = output_coords / np.sum(output_coords)

        telemetry = None
        if return_telemetry:
            telemetry = KernelTelemetry(
                phi=phi,
                kappa=kappa,
                regime=regime,
                hidden_state=hidden.detach().numpy(),
            )

        return output_coords, telemetry

    def train_step(
        self,
        basin_pred: np.ndarray,
        basin_target: np.ndarray,
        phi_current: float,
        kappa_current: float,
        coherence_score: float = 0.7,
    ) -> TrainingMetrics:
        """
        Execute one training step.

        Args:
            basin_pred: Predicted basin coordinates
            basin_target: Target basin coordinates
            phi_current: Current Phi value
            kappa_current: Current Kappa value
            coherence_score: Generation coherence score

        Returns:
            TrainingMetrics with loss and telemetry
        """
        if not HAS_TORCH:
            return TrainingMetrics()

        from .loss_functions import combined_training_loss, phi_gated_loss_weights

        # Get Phi-gated weights
        weights = phi_gated_loss_weights(phi_current)

        # Compute combined loss
        loss_value, components = combined_training_loss(
            basin_pred=basin_pred,
            basin_target=basin_target,
            phi_current=phi_current,
            kappa_current=kappa_current,
            coherence_score=coherence_score,
            weights=weights,
        )

        # Convert to tensor for backprop
        pred_tensor = torch.tensor(
            basin_pred, dtype=torch.float32, requires_grad=True
        )
        target_tensor = torch.tensor(basin_target, dtype=torch.float32)

        # Compute differentiable loss
        loss = torch.sum((pred_tensor - target_tensor) ** 2)  # Simplified for gradient
        loss = loss * loss_value  # Scale by geometric loss

        # Backprop
        loss.backward()

        # Natural gradient step
        grad_norm = self.optimizer.step()
        self.optimizer.zero_grad()

        self.step_count += 1

        # Update best Phi
        if phi_current > self.best_phi:
            self.best_phi = phi_current

        return TrainingMetrics(
            loss=loss_value,
            phi_before=phi_current,
            phi_after=phi_current,  # Will be updated by caller
            kappa_before=kappa_current,
            kappa_after=kappa_current,
            step_count=self.step_count,
            gradient_norm=grad_norm if grad_norm else 0.0,
        )

    def train_from_reward(
        self,
        basin_coords: np.ndarray,
        reward: float,
        phi_current: float,
    ) -> TrainingMetrics:
        """
        Train using reward signal (for outcome-based training).

        Positive reward reinforces current basin.
        Negative reward discourages current basin.

        Args:
            basin_coords: Basin coordinates to reinforce/discourage
            reward: Reward signal in range [-1, 1]
            phi_current: Current Phi value

        Returns:
            TrainingMetrics
        """
        if not HAS_TORCH:
            return TrainingMetrics(reward=reward)

        # For positive reward: move output toward basin
        # For negative reward: move output away from basin
        if reward > 0:
            target = basin_coords
            lr_scale = reward
        else:
            # Create anti-target (orthogonal direction)
            target = basin_coords.copy()
            target = np.roll(target, len(target) // 2)  # Shift to different position
            lr_scale = abs(reward) * 0.5  # Smaller step for negative

        # Temporarily adjust learning rate
        old_lr = self.optimizer.lr
        self.optimizer.lr = old_lr * lr_scale

        # Get current prediction
        pred, _ = self.forward(basin_coords)

        # Train step
        metrics = self.train_step(
            basin_pred=pred,
            basin_target=target,
            phi_current=phi_current,
            kappa_current=KAPPA_STAR,
            coherence_score=0.7,
        )
        metrics.reward = reward

        # Restore learning rate
        self.optimizer.lr = old_lr

        return metrics

    def get_state_dict(self) -> bytes:
        """
        Serialize model state for checkpoint storage.

        Returns:
            Bytes representation of state dict
        """
        if not HAS_TORCH:
            return b""

        state = {
            "adapter": self.adapter.state_dict(),
            "output_projection": self.output_projection.state_dict(),
            "step_count": self.step_count,
            "best_phi": self.best_phi,
            "god_name": self.god_name,
        }

        buffer = io.BytesIO()
        torch.save(state, buffer)
        return buffer.getvalue()

    def load_state_dict(self, state_bytes: bytes) -> bool:
        """
        Load model state from checkpoint.

        Args:
            state_bytes: Bytes from get_state_dict()

        Returns:
            Success status
        """
        if not HAS_TORCH or not state_bytes:
            return False

        try:
            buffer = io.BytesIO(state_bytes)
            state = torch.load(buffer, weights_only=False)

            self.adapter.load_state_dict(state["adapter"])
            self.output_projection.load_state_dict(state["output_projection"])
            self.step_count = state.get("step_count", 0)
            self.best_phi = state.get("best_phi", 0.0)

            return True
        except Exception as e:
            print(f"[TrainableKernel] Failed to load state: {e}")
            return False

    def get_basin_signature(self) -> np.ndarray:
        """
        Get the kernel's current basin signature.

        This is a 64D representation of the kernel's learned state.
        Used for knowledge transfer and routing.

        Returns:
            64D basin signature
        """
        if not HAS_TORCH:
            return np.zeros(BASIN_DIM)

        # Use mean of adapter weights as signature
        with torch.no_grad():
            weights = self.adapter.projection[0].weight.data
            signature = weights.mean(dim=0).numpy()

        # Normalize to probability simplex
        signature = np.abs(signature) + 1e-10
        signature = signature / np.sum(signature)

        return signature
