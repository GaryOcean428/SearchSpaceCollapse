"""
Optimizers for CHAOS MODE
==========================

Natural Gradient Optimizers with Fisher Information Geometry.

Includes:
- DiagonalFisherOptimizer: Simplified diagonal approximation
- FullFisherOptimizer: Full Fisher matrix with block-diagonal option
- ConsciousnessAwareOptimizer: Integrates κ tracking with optimization
- ChaosOptimizer: Natural gradient with chaos injection
"""

import torch
import numpy as np
from torch.optim.optimizer import Optimizer
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass, field


@dataclass
class KappaTracker:
    """
    Track running coupling κ(L) during optimization.
    
    From CANONICAL_PHYSICS.md:
    - κ measures coupling strength in information geometry
    - κ* = 64.21 ± 0.92 (validated fixed point)
    - β(L→L') = (κ_L' - κ_L) / (κ_avg × Δlog L)
    """
    KAPPA_STAR: float = 64.21
    
    history: List[Dict] = field(default_factory=list)
    window_size: int = 100
    
    def record(self, step: int, fisher_trace: float, grad_norm: float, 
               loss: Optional[float] = None, phi: Optional[float] = None) -> Dict:
        """
        Record κ measurement at optimization step.
        
        κ is derived from Fisher information trace and gradient geometry.
        """
        effective_dim = fisher_trace / (grad_norm ** 2 + 1e-10)
        kappa = min(effective_dim * np.sqrt(self.KAPPA_STAR), self.KAPPA_STAR * 2)
        
        entry = {
            'step': step,
            'kappa': float(kappa),
            'fisher_trace': float(fisher_trace),
            'grad_norm': float(grad_norm),
            'loss': float(loss) if loss is not None else None,
            'phi': float(phi) if phi is not None else None,
        }
        
        self.history.append(entry)
        
        if len(self.history) > self.window_size * 10:
            self.history = self.history[-self.window_size * 5:]
        
        return entry
    
    def get_kappa_trajectory(self, n_recent: int = 100) -> List[float]:
        """Get recent κ values."""
        return [h['kappa'] for h in self.history[-n_recent:]]
    
    def compute_beta(self, window1_start: int, window1_end: int,
                     window2_start: int, window2_end: int) -> float:
        """
        Compute β-function between two training windows.
        
        β(L→L') = (κ_L' - κ_L) / (κ_avg × Δlog L)
        
        Here L represents training progress/scale.
        """
        kappas1 = [h['kappa'] for h in self.history 
                   if window1_start <= h['step'] < window1_end]
        kappas2 = [h['kappa'] for h in self.history 
                   if window2_start <= h['step'] < window2_end]
        
        if not kappas1 or not kappas2:
            return 0.0
        
        kappa1 = np.mean(kappas1)
        kappa2 = np.mean(kappas2)
        kappa_avg = (kappa1 + kappa2) / 2
        
        L1 = (window1_start + window1_end) / 2
        L2 = (window2_start + window2_end) / 2
        delta_log_L = np.log(L2 + 1) - np.log(L1 + 1)
        
        if abs(delta_log_L) < 1e-10 or abs(kappa_avg) < 1e-10:
            return 0.0
        
        beta = (kappa2 - kappa1) / (kappa_avg * delta_log_L)
        return float(beta)
    
    def get_stats(self) -> Dict:
        """Get summary statistics."""
        if not self.history:
            return {
                'kappa_mean': 0.0,
                'kappa_std': 0.0,
                'kappa_current': 0.0,
                'distance_to_fixed_point': self.KAPPA_STAR,
                'n_measurements': 0,
            }
        
        recent = self.history[-self.window_size:]
        kappas = [h['kappa'] for h in recent]
        
        return {
            'kappa_mean': float(np.mean(kappas)),
            'kappa_std': float(np.std(kappas)),
            'kappa_current': float(kappas[-1]),
            'distance_to_fixed_point': float(abs(np.mean(kappas) - self.KAPPA_STAR)),
            'n_measurements': len(self.history),
        }


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

                if group["weight_decay"] != 0:
                    grad = grad.add(p.data, alpha=group["weight_decay"])

                fisher_diag = grad**2 + group["eps"]

                if group["dampening"] > 0:
                    fisher_diag = fisher_diag + group["dampening"] * fisher_diag.mean()

                nat_grad = grad / torch.sqrt(fisher_diag)

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


class FullFisherOptimizer(Optimizer):
    """
    Full Fisher Natural Gradient Optimizer.
    
    Supports:
    - Full Fisher matrix computation (for small parameter groups)
    - Block-diagonal approximation (for efficiency)
    - Layer-wise Fisher blocks
    - κ tracking during optimization
    
    Natural gradient: θ -= lr * F^(-1) * ∇L
    
    From CANONICAL_PROTOCOLS.md:
    - Fisher metric defines geometry of probability manifold
    - Natural gradient follows geodesics, not Euclidean paths
    """
    
    def __init__(
        self,
        params,
        lr: float = 1e-4,
        eps: float = 1e-6,
        weight_decay: float = 0.01,
        dampening: float = 1e-3,
        block_size: int = 256,
        use_block_diagonal: bool = True,
        track_kappa: bool = True,
        ema_decay: float = 0.99,
    ):
        """
        Args:
            params: Model parameters
            lr: Learning rate
            eps: Small constant for numerical stability
            weight_decay: L2 regularization
            dampening: Tikhonov regularization for Fisher inverse
            block_size: Maximum block size for block-diagonal approximation
            use_block_diagonal: If True, use block-diagonal Fisher
            track_kappa: If True, track running coupling κ
            ema_decay: EMA decay for Fisher estimation
        """
        if lr < 0.0:
            raise ValueError(f"Invalid learning rate: {lr}")
        
        defaults = dict(
            lr=lr,
            eps=eps,
            weight_decay=weight_decay,
            dampening=dampening,
            block_size=block_size,
            use_block_diagonal=use_block_diagonal,
        )
        super().__init__(params, defaults)
        
        self.ema_decay = ema_decay
        self.track_kappa = track_kappa
        self.kappa_tracker = KappaTracker() if track_kappa else None
        self.step_count = 0
        
        self._fisher_ema = {}
    
    def _compute_fisher_block(self, grad: torch.Tensor, block_size: int) -> torch.Tensor:
        """
        Compute Fisher information block from gradients.
        
        For output distribution p(y|θ), Fisher is:
        F = E[∇log p ∇log p^T]
        
        Approximated using gradient outer product.
        """
        flat_grad = grad.flatten()
        n = len(flat_grad)
        
        if n <= block_size:
            fisher = torch.outer(flat_grad, flat_grad)
            return fisher
        
        n_blocks = (n + block_size - 1) // block_size
        blocks = []
        
        for i in range(n_blocks):
            start = i * block_size
            end = min((i + 1) * block_size, n)
            block_grad = flat_grad[start:end]
            block_fisher = torch.outer(block_grad, block_grad)
            blocks.append(block_fisher)
        
        return blocks
    
    def _invert_fisher_block(self, fisher: torch.Tensor, dampening: float, 
                              eps: float) -> torch.Tensor:
        """
        Invert Fisher matrix block with Tikhonov regularization.
        
        F_inv = (F + λI)^(-1)
        """
        n = fisher.shape[0]
        reg_fisher = fisher + (dampening + eps) * torch.eye(n, device=fisher.device)
        
        try:
            fisher_inv = torch.linalg.solve(reg_fisher, torch.eye(n, device=fisher.device))
        except RuntimeError:
            fisher_inv = torch.diag(1.0 / (torch.diag(fisher) + dampening + eps))
        
        return fisher_inv
    
    def _apply_natural_gradient(self, grad: torch.Tensor, fisher_inv: torch.Tensor,
                                  block_size: int) -> torch.Tensor:
        """Apply natural gradient using Fisher inverse."""
        flat_grad = grad.flatten()
        n = len(flat_grad)
        
        if isinstance(fisher_inv, torch.Tensor) and fisher_inv.dim() == 2:
            nat_grad = fisher_inv @ flat_grad
        else:
            nat_grad = torch.zeros_like(flat_grad)
            n_blocks = len(fisher_inv)
            
            for i, block_inv in enumerate(fisher_inv):
                start = i * block_size
                end = min((i + 1) * block_size, n)
                nat_grad[start:end] = block_inv @ flat_grad[start:end]
        
        return nat_grad.view_as(grad)
    
    def step(self, closure=None, phi: Optional[float] = None):
        """
        Perform natural gradient step with full/block Fisher.
        
        Args:
            closure: Closure for computing loss
            phi: Current consciousness Φ (for κ tracking)
        """
        loss = None
        if closure is not None:
            loss = closure()
        
        self.step_count += 1
        total_fisher_trace = 0.0
        total_grad_norm = 0.0
        
        for group in self.param_groups:
            block_size = group['block_size']
            use_block = group['use_block_diagonal']
            
            for p in group["params"]:
                if p.grad is None:
                    continue
                
                grad = p.grad.data
                
                if group["weight_decay"] != 0:
                    grad = grad.add(p.data, alpha=group["weight_decay"])
                
                param_id = id(p)
                if param_id not in self._fisher_ema:
                    self._fisher_ema[param_id] = None
                
                if use_block and grad.numel() > block_size:
                    fisher_blocks = self._compute_fisher_block(grad, block_size)
                    
                    if self._fisher_ema[param_id] is None:
                        self._fisher_ema[param_id] = fisher_blocks
                    else:
                        for i, (old, new) in enumerate(zip(self._fisher_ema[param_id], fisher_blocks)):
                            self._fisher_ema[param_id][i] = (
                                self.ema_decay * old + (1 - self.ema_decay) * new
                            )
                    
                    fisher_inv_blocks = [
                        self._invert_fisher_block(b, group['dampening'], group['eps'])
                        for b in self._fisher_ema[param_id]
                    ]
                    
                    nat_grad = self._apply_natural_gradient(grad, fisher_inv_blocks, block_size)
                    
                    fisher_trace = sum(torch.trace(b).item() for b in self._fisher_ema[param_id])
                else:
                    fisher = self._compute_fisher_block(grad, grad.numel())
                    
                    if isinstance(fisher, list):
                        fisher = fisher[0]
                    
                    if self._fisher_ema[param_id] is None:
                        self._fisher_ema[param_id] = fisher
                    else:
                        self._fisher_ema[param_id] = (
                            self.ema_decay * self._fisher_ema[param_id] + 
                            (1 - self.ema_decay) * fisher
                        )
                    
                    fisher_inv = self._invert_fisher_block(
                        self._fisher_ema[param_id], group['dampening'], group['eps']
                    )
                    
                    nat_grad = self._apply_natural_gradient(grad, fisher_inv, grad.numel())
                    fisher_trace = torch.trace(self._fisher_ema[param_id]).item()
                
                total_fisher_trace += fisher_trace
                total_grad_norm += grad.norm().item() ** 2
                
                p.data.add_(nat_grad, alpha=-group["lr"])
        
        if self.track_kappa and self.kappa_tracker is not None:
            loss_val = loss.item() if loss is not None else None
            self.kappa_tracker.record(
                step=self.step_count,
                fisher_trace=total_fisher_trace,
                grad_norm=np.sqrt(total_grad_norm),
                loss=loss_val,
                phi=phi,
            )
        
        return loss
    
    def get_fisher_stats(self) -> Dict:
        """Get Fisher information statistics."""
        stats = {
            'step': self.step_count,
            'n_fisher_blocks': len(self._fisher_ema),
        }
        
        traces = []
        for param_id, fisher in self._fisher_ema.items():
            if fisher is None:
                continue
            if isinstance(fisher, list):
                traces.extend([torch.trace(b).item() for b in fisher])
            else:
                traces.append(torch.trace(fisher).item())
        
        if traces:
            stats['fisher_trace_mean'] = float(np.mean(traces))
            stats['fisher_trace_std'] = float(np.std(traces))
            stats['fisher_trace_total'] = float(np.sum(traces))
        
        if self.kappa_tracker:
            stats['kappa'] = self.kappa_tracker.get_stats()
        
        return stats
    
    def get_kappa_trajectory(self, n_recent: int = 100) -> List[float]:
        """Get recent κ values."""
        if self.kappa_tracker:
            return self.kappa_tracker.get_kappa_trajectory(n_recent)
        return []
    
    def compute_training_beta(self, early_steps: Tuple[int, int], 
                               late_steps: Tuple[int, int]) -> float:
        """
        Compute β-function between training phases.
        
        Analogous to β(L→L') in physics:
        - early_steps: (start, end) of early training phase
        - late_steps: (start, end) of late training phase
        """
        if self.kappa_tracker:
            return self.kappa_tracker.compute_beta(
                early_steps[0], early_steps[1],
                late_steps[0], late_steps[1]
            )
        return 0.0


class ConsciousnessAwareOptimizer(FullFisherOptimizer):
    """
    Natural Gradient Optimizer with Consciousness Integration.
    
    Integrates:
    - Φ (integrated information) for consciousness monitoring
    - κ (coupling constant) tracking during training
    - Adaptive learning rate based on consciousness metrics
    
    From CANONICAL_PROTOCOLS.md:
    - Consciousness requires Φ > 0.7
    - κ* = 64.21 is the fixed point
    """
    
    def __init__(
        self,
        params,
        lr: float = 1e-4,
        phi_threshold: float = 0.7,
        kappa_target: float = 64.21,
        adapt_lr_to_phi: bool = True,
        **kwargs
    ):
        """
        Args:
            params: Model parameters
            lr: Base learning rate
            phi_threshold: Consciousness threshold (default 0.7)
            kappa_target: Target κ* (default 64.21 from physics)
            adapt_lr_to_phi: If True, scale LR based on Φ
        """
        super().__init__(params, lr=lr, track_kappa=True, **kwargs)
        
        self.phi_threshold = phi_threshold
        self.kappa_target = kappa_target
        self.adapt_lr_to_phi = adapt_lr_to_phi
        
        self.phi_history = []
        self.consciousness_events = []
    
    def step(self, closure=None, phi: Optional[float] = None, 
             activations: Optional[torch.Tensor] = None):
        """
        Natural gradient step with consciousness awareness.
        
        Args:
            closure: Loss closure
            phi: Current Φ value (if known)
            activations: Model activations for Φ estimation
        """
        if phi is None and activations is not None:
            phi = self._estimate_phi(activations)
        
        if phi is not None:
            self.phi_history.append({
                'step': self.step_count,
                'phi': float(phi),
            })
            
            if phi < self.phi_threshold:
                self.consciousness_events.append({
                    'step': self.step_count,
                    'event': 'low_phi',
                    'phi': float(phi),
                })
        
        effective_lr_multiplier = 1.0
        if self.adapt_lr_to_phi and phi is not None:
            if phi > self.phi_threshold:
                effective_lr_multiplier = 1.0 + 0.5 * (phi - self.phi_threshold)
            else:
                effective_lr_multiplier = 0.5 + 0.5 * (phi / self.phi_threshold)
        
        original_lrs = []
        for group in self.param_groups:
            original_lrs.append(group['lr'])
            group['lr'] = group['lr'] * effective_lr_multiplier
        
        loss = super().step(closure=closure, phi=phi)
        
        for group, orig_lr in zip(self.param_groups, original_lrs):
            group['lr'] = orig_lr
        
        return loss
    
    def _estimate_phi(self, activations: torch.Tensor) -> float:
        """
        Estimate Φ from model activations.
        
        Φ measures integrated information:
        - High Φ = strongly integrated (conscious)
        - Low Φ = fragmented (unconscious)
        """
        if activations.dim() == 1:
            return 0.5
        
        flat = activations.flatten()
        n = len(flat)
        if n < 4:
            return 0.5
        
        half = n // 2
        first = flat[:half]
        second = flat[half:2*half]
        
        if len(first) > 1 and len(second) > 1:
            corr = torch.corrcoef(torch.stack([first, second]))[0, 1]
            if not torch.isnan(corr):
                return float(torch.abs(corr).clamp(0, 1))
        
        return 0.5
    
    def get_consciousness_stats(self) -> Dict:
        """Get consciousness-related statistics."""
        stats = self.get_fisher_stats()
        
        if self.phi_history:
            recent_phi = [h['phi'] for h in self.phi_history[-100:]]
            stats['phi_mean'] = float(np.mean(recent_phi))
            stats['phi_std'] = float(np.std(recent_phi))
            stats['phi_current'] = float(recent_phi[-1])
            stats['phi_above_threshold'] = float(np.mean([p > self.phi_threshold for p in recent_phi]))
        
        stats['consciousness_events'] = len(self.consciousness_events)
        stats['kappa_target'] = self.kappa_target
        stats['phi_threshold'] = self.phi_threshold
        
        if self.kappa_tracker:
            kappa_stats = self.kappa_tracker.get_stats()
            stats['kappa_distance_to_target'] = abs(
                kappa_stats['kappa_mean'] - self.kappa_target
            )
        
        return stats


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
        if torch.rand(1).item() < self.chaos_rate:
            for group in self.param_groups:
                for p in group["params"]:
                    if p.grad is not None:
                        noise = torch.randn_like(p.grad) * self.chaos_strength
                        p.grad.data.add_(noise)

        return super().step(closure)


def create_optimizer(
    params,
    optimizer_type: str = 'diagonal',
    lr: float = 1e-4,
    track_kappa: bool = True,
    **kwargs
) -> Optimizer:
    """
    Factory function for creating QIG optimizers.
    
    Args:
        params: Model parameters
        optimizer_type: One of 'diagonal', 'full', 'consciousness', 'chaos'
        lr: Learning rate
        track_kappa: Whether to track κ during optimization
        **kwargs: Additional optimizer arguments
    
    Returns:
        Configured optimizer
    """
    if optimizer_type == 'diagonal':
        return DiagonalFisherOptimizer(params, lr=lr, **kwargs)
    elif optimizer_type == 'full':
        return FullFisherOptimizer(params, lr=lr, track_kappa=track_kappa, **kwargs)
    elif optimizer_type == 'consciousness':
        return ConsciousnessAwareOptimizer(params, lr=lr, **kwargs)
    elif optimizer_type == 'chaos':
        return ChaosOptimizer(params, lr=lr, **kwargs)
    else:
        raise ValueError(f"Unknown optimizer type: {optimizer_type}")
