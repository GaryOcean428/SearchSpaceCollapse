"""
Optimizers for CHAOS MODE
==========================

Diagonal Fisher Natural Gradient - adapted for chaos experimentation.
"""

import torch
from torch.optim.optimizer import Optimizer


class DiagonalFisherOptimizer(Optimizer):
    """
    Diagonal Fisher Natural Gradient (simplified for CHAOS MODE).

    Natural gradient: θ -= lr * F^(-1) * ∇L
    Diagonal approx: F_ii ≈ (∇L_i)²
    """

    def __init__(
        self,
        params,
        lr: float = 1e-4,
        eps: float = 1e-8,
        weight_decay: float = 0.01,
        dampening: float = 1e-3,
    ):
        if lr < 0.0:
            raise ValueError(f"Invalid learning rate: {lr}")

        defaults = dict(
            lr=lr,
            eps=eps,
            weight_decay=weight_decay,
            dampening=dampening,
        )
        super().__init__(params, defaults)

    def step(self, closure=None):
        """
        Perform natural gradient step (geodesic descent).
        """
        loss = None
        if closure is not None:
            loss = closure()

        for group in self.param_groups:
            for p in group["params"]:
                if p.grad is None:
                    continue

                grad = p.grad.data

                # Weight decay
                if group["weight_decay"] != 0:
                    grad = grad.add(p.data, alpha=group["weight_decay"])

                # Diagonal Fisher: F_ii = grad_i²
                fisher_diag = grad**2 + group["eps"]

                # Dampening for stability
                if group["dampening"] > 0:
                    fisher_diag = fisher_diag + group["dampening"] * fisher_diag.mean()

                # Natural gradient: grad / sqrt(F)
                nat_grad = grad / torch.sqrt(fisher_diag)

                # Update (geodesic descent)
                p.data.add_(nat_grad, alpha=-group["lr"])

        return loss

    def get_fisher_stats(self) -> dict:
        """Get Fisher diagonal statistics."""
        fisher_values = []

        for group in self.param_groups:
            for p in group["params"]:
                if p.grad is not None:
                    fisher_diag = p.grad.data**2 + group["eps"]
                    fisher_values.append(fisher_diag.mean().item())

        if fisher_values:
            return {
                'fisher_mean': sum(fisher_values) / len(fisher_values),
                'fisher_std': torch.tensor(fisher_values).std().item(),
                'condition_number': max(fisher_values) / (min(fisher_values) + 1e-10),
            }
        return {'fisher_mean': 0.0, 'fisher_std': 0.0, 'condition_number': 1.0}


class ChaosOptimizer(DiagonalFisherOptimizer):
    """
    CHAOS MODE optimizer with random perturbations.

    Sometimes adds random noise to gradients for exploration!
    """

    def __init__(
        self,
        params,
        lr: float = 1e-4,
        chaos_rate: float = 0.05,
        chaos_strength: float = 0.01,
        **kwargs
    ):
        super().__init__(params, lr=lr, **kwargs)
        self.chaos_rate = chaos_rate
        self.chaos_strength = chaos_strength

    def step(self, closure=None):
        """
        Natural gradient step with occasional chaos injection.
        """
        # Random chaos injection
        if torch.rand(1).item() < self.chaos_rate:
            for group in self.param_groups:
                for p in group["params"]:
                    if p.grad is not None:
                        noise = torch.randn_like(p.grad) * self.chaos_strength
                        p.grad.data.add_(noise)
            print("💥 CHAOS injected into gradients!")

        return super().step(closure)
