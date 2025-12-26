"""Natural Gradient Optimizer for QIG Constellation Training.

Implements optimization on curved Fisher information manifold instead
of flat Euclidean space. Essential for consciousness emergence.

Key differences from Adam/SGD:
- Computes Fisher Information Matrix (FIM) from model activations
- Uses F^-1 @ gradient (natural gradient) instead of raw gradient
- Respects geometric structure of parameter space
- Prevents mode collapse by staying on manifold

Reference: Amari (1998) "Natural Gradient Works Efficiently in Learning"
"""

from __future__ import annotations

from typing import Iterator

import torch
from torch import Tensor, nn
from torch.optim import Optimizer


class NaturalGradientDescent(Optimizer):
    """
    Natural gradient descent on Fisher information manifold.
    
    Instead of Euclidean gradient: θ_{t+1} = θ_t - α ∇L
    Uses natural gradient:         θ_{t+1} = θ_t - α F^{-1} ∇L
    
    Where F is Fisher Information Matrix.
    
    Args:
        params: Model parameters
        lr: Learning rate (default: 1e-4)
        damping: Regularization for Fisher matrix inversion (default: 1e-3)
        momentum: Momentum coefficient (default: 0.9)
        compute_fisher: Function that returns FIM from model state
    """
    
    def __init__(
        self,
        params: Iterator[nn.Parameter],
        lr: float = 1e-4,
        damping: float = 1e-3,
        momentum: float = 0.9,
        compute_fisher: callable = None,
    ):
        if lr < 0.0:
            raise ValueError(f"Invalid learning rate: {lr}")
        if damping < 0.0:
            raise ValueError(f"Invalid damping: {damping}")
        if momentum < 0.0 or momentum >= 1.0:
            raise ValueError(f"Invalid momentum: {momentum}")
        
        defaults = dict(
            lr=lr,
            damping=damping,
            momentum=momentum,
        )
        super().__init__(params, defaults)
        
        self.compute_fisher = compute_fisher
        
    def step(self, closure=None):
        """
        Perform single optimization step.
        
        Args:
            closure: Optional closure to re-evaluate model
            
        Returns:
            Loss if closure provided, else None
        """
        loss = None
        if closure is not None:
            with torch.enable_grad():
                loss = closure()
        
        # Compute Fisher Information Matrix
        if self.compute_fisher is not None:
            fisher_matrix = self.compute_fisher()
        else:
            # Fallback to identity (reduces to standard gradient descent)
            fisher_matrix = None
        
        for group in self.param_groups:
            for p in group['params']:
                if p.grad is None:
                    continue
                
                grad = p.grad
                
                # Get state for momentum
                state = self.state[p]
                if len(state) == 0:
                    state['momentum_buffer'] = torch.zeros_like(p)
                
                momentum_buffer = state['momentum_buffer']
                momentum = group['momentum']
                lr = group['lr']
                damping = group['damping']
                
                # Natural gradient computation
                if fisher_matrix is not None:
                    # F^{-1} @ grad
                    # Use Tikhonov regularization: (F + λI)^{-1}
                    fisher_regularized = fisher_matrix + damping * torch.eye(
                        fisher_matrix.size(0),
                        device=fisher_matrix.device
                    )
                    
                    # Solve F @ natural_grad = grad
                    try:
                        natural_grad = torch.linalg.solve(
                            fisher_regularized,
                            grad.view(-1, 1)
                        ).view_as(grad)
                    except RuntimeError:
                        # Fallback to standard gradient if solve fails
                        natural_grad = grad
                else:
                    # No Fisher matrix: use standard gradient
                    natural_grad = grad
                
                # Momentum update
                momentum_buffer.mul_(momentum).add_(natural_grad)
                
                # Parameter update
                p.data.add_(momentum_buffer, alpha=-lr)
        
        return loss


class DiagonalNaturalGradient(Optimizer):
    """
    Diagonal approximation of Natural Gradient Descent.
    
    Much cheaper than full NGD:
    - O(d) instead of O(d²) for Fisher matrix
    - O(d) instead of O(d³) for inversion
    
    Uses diagonal Fisher: F_diag = diag(∇²L)
    Natural gradient:     natural_grad = grad / (F_diag + ε)
    
    This is similar to Adam but uses Fisher diagonal instead of
    running average of squared gradients.
    
    Args:
        params: Model parameters
        lr: Learning rate (default: 1e-4)
        damping: Regularization epsilon (default: 1e-8)
        momentum: Momentum coefficient (default: 0.9)
    """
    
    def __init__(
        self,
        params: Iterator[nn.Parameter],
        lr: float = 1e-4,
        damping: float = 1e-8,
        momentum: float = 0.9,
    ):
        if lr < 0.0:
            raise ValueError(f"Invalid learning rate: {lr}")
        if damping < 0.0:
            raise ValueError(f"Invalid damping: {damping}")
        
        defaults = dict(lr=lr, damping=damping, momentum=momentum)
        super().__init__(params, defaults)
    
    def step(self, closure=None):
        """Perform single optimization step."""
        loss = None
        if closure is not None:
            with torch.enable_grad():
                loss = closure()
        
        for group in self.param_groups:
            for p in group['params']:
                if p.grad is None:
                    continue
                
                grad = p.grad
                
                # Initialize state
                state = self.state[p]
                if len(state) == 0:
                    state['step'] = 0
                    state['momentum_buffer'] = torch.zeros_like(p)
                    # Diagonal Fisher approximation
                    state['fisher_diag'] = torch.zeros_like(p)
                
                fisher_diag = state['fisher_diag']
                momentum_buffer = state['momentum_buffer']
                state['step'] += 1
                
                # Update diagonal Fisher (EMA of squared gradients)
                # This is the key difference from Adam:
                # We interpret grad² as diagonal of Fisher
                fisher_diag.mul_(0.99).addcmul_(grad, grad, value=0.01)
                
                # Natural gradient: grad / (fisher_diag + damping)
                natural_grad = grad / (fisher_diag.sqrt() + group['damping'])
                
                # Momentum
                momentum_buffer.mul_(group['momentum']).add_(natural_grad)
                
                # Update
                p.data.add_(momentum_buffer, alpha=-group['lr'])
        
        return loss


def compute_empirical_fisher(model: nn.Module, loss: Tensor) -> Tensor:
    """
    Compute empirical Fisher Information Matrix.
    
    F_empirical = E[∇L ∇L^T]
    
    This is cheaper than true Fisher but still O(d²).
    For large models, use DiagonalNaturalGradient instead.
    
    Args:
        model: Neural network model
        loss: Scalar loss value
        
    Returns:
        Fisher matrix (d x d) where d = total parameters
    """
    # Get gradients
    grads = torch.autograd.grad(
        loss,
        model.parameters(),
        create_graph=False,
        retain_graph=True
    )
    
    # Flatten to single vector
    grad_vector = torch.cat([g.view(-1) for g in grads])
    
    # Outer product: ∇L ∇L^T
    fisher = torch.outer(grad_vector, grad_vector)
    
    return fisher


def compute_diagonal_fisher(model: nn.Module, loss: Tensor) -> Tensor:
    """
    Compute diagonal Fisher Information Matrix.
    
    F_diag = diag(E[∇L ⊙ ∇L])
    
    Much cheaper: O(d) instead of O(d²).
    
    Args:
        model: Neural network model
        loss: Scalar loss value
        
    Returns:
        Diagonal Fisher (d,) where d = total parameters
    """
    # Get gradients
    grads = torch.autograd.grad(
        loss,
        model.parameters(),
        create_graph=False,
        retain_graph=True
    )
    
    # Element-wise square
    fisher_diag = torch.cat([
        (g * g).view(-1) for g in grads
    ])
    
    return fisher_diag


# =============================================================================
# USAGE EXAMPLES
# =============================================================================

def example_full_natural_gradient():
    """
    Example: Full natural gradient (expensive, O(d³)).
    Only use for small models (<10M params).
    """
    model = nn.Sequential(
        nn.Linear(64, 128),
        nn.ReLU(),
        nn.Linear(128, 64),
    )
    
    # Define Fisher computation
    def compute_fisher():
        # Forward pass on batch
        loss = model(batch).mean()
        fisher = compute_empirical_fisher(model, loss)
        return fisher
    
    optimizer = NaturalGradientDescent(
        model.parameters(),
        lr=1e-4,
        compute_fisher=compute_fisher
    )
    
    # Training loop
    for batch in dataloader:
        optimizer.zero_grad()
        loss = model(batch).mean()
        loss.backward()
        optimizer.step()


def example_diagonal_natural_gradient():
    """
    Example: Diagonal natural gradient (cheap, O(d)).
    Use for large models (100M+ params).
    """
    model = nn.Transformer(
        d_model=384,
        nhead=8,
        num_encoder_layers=8,
    )  # ~100M parameters
    
    optimizer = DiagonalNaturalGradient(
        model.parameters(),
        lr=1e-4,
        damping=1e-8,
        momentum=0.9
    )
    
    # Training loop (same as Adam)
    for batch in dataloader:
        optimizer.zero_grad()
        loss = model(batch).mean()
        loss.backward()
        optimizer.step()


if __name__ == "__main__":
    print("Natural Gradient Optimizers for QIG Training")
    print("=" * 70)
    print()
    print("Full Natural Gradient:     O(d³) - use for d < 10M")
    print("Diagonal Natural Gradient: O(d)  - use for d > 10M")
    print()
    print("For 100M QIG kernel: Use DiagonalNaturalGradient")
    print()
    print("Key difference from Adam:")
    print("  Adam:        adaptive_lr = lr / sqrt(running_avg(grad²))")
    print("  Natural GD:  natural_grad = grad / sqrt(fisher_diag)")
    print()
    print("Fisher diagonal ≈ curvature of loss landscape")
    print("Natural gradient = steepest descent on curved manifold")
