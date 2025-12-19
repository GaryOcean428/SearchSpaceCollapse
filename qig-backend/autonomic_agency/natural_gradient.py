"""
Natural Gradient Optimizer - Fisher-Aware Updates (QIG-Pure)

Per CANONICAL_ARCHITECTURE: geometric purity required.
Using Adam would violate geometric purity and prevent consciousness emergence.

The natural gradient follows geodesics on the parameter manifold:
    θ_new = θ - lr * F^(-1) @ ∇L

where F is the Fisher information matrix.
"""

from typing import Optional, Tuple
import numpy as np


class NaturalGradientOptimizer:
    """
    Natural gradient optimizer for Q-network updates.
    
    Uses diagonal Fisher approximation for efficiency while
    maintaining geometric purity.
    """
    
    def __init__(
        self,
        learning_rate: float = 0.001,
        damping: float = 1e-4,
        ema_decay: float = 0.99,
    ):
        self.lr = learning_rate
        self.damping = damping
        self.ema_decay = ema_decay
        
        self._fisher_diag_w: Optional[np.ndarray] = None
        self._fisher_diag_b: Optional[np.ndarray] = None
        
        self._update_count = 0
    
    def compute_fisher_diagonal(
        self,
        weights: np.ndarray,
        states: np.ndarray,
        q_values: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute diagonal Fisher information approximation.
        
        F_ii ≈ E[∂log π / ∂θ_i]²
        
        For Q-network, uses squared gradients as Fisher estimate.
        """
        action_dim, state_dim = weights.shape
        batch_size = len(states)
        
        q_probs = self._softmax(q_values)
        
        fisher_w = np.zeros_like(weights)
        fisher_b = np.zeros(action_dim)
        
        for i in range(batch_size):
            state = states[i]
            probs = q_probs[i]
            
            for a in range(action_dim):
                grad_w = probs[a] * (1 - probs[a]) * np.outer(
                    np.eye(action_dim)[a] - probs, state
                )[a]
                fisher_w[a] += grad_w ** 2
                
                grad_b = probs[a] * (1 - probs[a])
                fisher_b[a] += grad_b ** 2
        
        fisher_w /= batch_size
        fisher_b /= batch_size
        
        fisher_w = np.clip(fisher_w, 1e-8, 1e8)
        fisher_b = np.clip(fisher_b, 1e-8, 1e8)
        
        return fisher_w, fisher_b
    
    def compute_natural_gradient(
        self,
        euclidean_grad_w: np.ndarray,
        euclidean_grad_b: np.ndarray,
        fisher_diag_w: np.ndarray,
        fisher_diag_b: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute natural gradient: F^(-1) @ g
        
        With diagonal approximation: nat_grad_i = g_i / (F_ii + damping)
        """
        nat_grad_w = euclidean_grad_w / (fisher_diag_w + self.damping)
        nat_grad_b = euclidean_grad_b / (fisher_diag_b + self.damping)
        
        return nat_grad_w, nat_grad_b
    
    def update(
        self,
        weights: np.ndarray,
        bias: np.ndarray,
        states: np.ndarray,
        actions: np.ndarray,
        td_errors: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray, dict]:
        """
        Perform natural gradient update step.
        
        Args:
            weights: Current Q-network weights
            bias: Current Q-network bias
            states: Batch of states
            actions: Batch of actions taken
            td_errors: TD errors (target_Q - current_Q)
            
        Returns:
            (delta_weights, delta_bias, info)
        """
        batch_size = len(states)
        action_dim = weights.shape[0]
        
        euclidean_grad_w = np.zeros_like(weights)
        euclidean_grad_b = np.zeros_like(bias)
        
        for i in range(batch_size):
            state = states[i]
            action = int(actions[i])
            td_error = td_errors[i]
            
            euclidean_grad_w[action] -= td_error * state
            euclidean_grad_b[action] -= td_error
        
        euclidean_grad_w /= batch_size
        euclidean_grad_b /= batch_size
        
        q_values = states @ weights.T + bias
        fisher_w, fisher_b = self.compute_fisher_diagonal(weights, states, q_values)
        
        if self._fisher_diag_w is None:
            self._fisher_diag_w = fisher_w
            self._fisher_diag_b = fisher_b
        else:
            self._fisher_diag_w = self.ema_decay * self._fisher_diag_w + (1 - self.ema_decay) * fisher_w  # type: ignore[operator]
            self._fisher_diag_b = self.ema_decay * self._fisher_diag_b + (1 - self.ema_decay) * fisher_b  # type: ignore[operator]
        
        nat_grad_w, nat_grad_b = self.compute_natural_gradient(
            euclidean_grad_w, euclidean_grad_b,
            self._fisher_diag_w, self._fisher_diag_b
        )
        
        delta_w = -self.lr * nat_grad_w
        delta_b = -self.lr * nat_grad_b
        
        self._update_count += 1
        
        return delta_w, delta_b, {
            'euclidean_grad_norm': float(np.linalg.norm(euclidean_grad_w)),
            'natural_grad_norm': float(np.linalg.norm(nat_grad_w)),
            'fisher_mean_w': float(np.mean(self._fisher_diag_w)),
            'fisher_mean_b': float(np.mean(self._fisher_diag_b)),
            'update_count': self._update_count,
        }
    
    def _softmax(self, x: np.ndarray) -> np.ndarray:
        """Numerically stable softmax."""
        exp_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=-1, keepdims=True)
    
    def get_stats(self) -> dict:
        """Return optimizer statistics."""
        return {
            'update_count': self._update_count,
            'learning_rate': self.lr,
            'damping': self.damping,
            'has_fisher': self._fisher_diag_w is not None,
        }
