"""
Policy - ε-Greedy Action Selection with Safety Boundaries

Ocean chooses interventions autonomously while respecting physics-validated
safety constraints. Q-values guide exploitation, ε enables exploration.
"""

from dataclasses import dataclass
from enum import Enum
import random
from typing import Dict, List, Optional, Tuple
import numpy as np

from qigkernels.physics_constants import KAPPA_STAR, PHI_THRESHOLD


class Action(Enum):
    """Available autonomic interventions."""
    CONTINUE_WAKE = 0
    ENTER_SLEEP = 1
    ENTER_DREAM = 2
    ENTER_MUSHROOM_MICRO = 3
    ENTER_MUSHROOM_MOD = 4


@dataclass
class SafetyBoundaries:
    """Physics-validated safety thresholds."""
    phi_min_intervention: float = 0.4
    phi_min_mushroom_mod: float = 0.5
    instability_max_mushroom: float = 0.30
    instability_max_mushroom_mod: float = 0.25
    coverage_max_dream: float = 0.95
    mushroom_cooldown_seconds: float = 300.0


class QNetwork:
    """
    Simple Q-network for action-value estimation.
    
    Uses linear function approximation on consciousness vector.
    Designed for natural gradient updates, not SGD.
    """
    
    def __init__(self, state_dim: int = 776, action_dim: int = 5):
        self.state_dim = state_dim
        self.action_dim = action_dim
        
        scale = 1.0 / np.sqrt(state_dim)
        self.weights = np.random.randn(action_dim, state_dim) * scale
        self.bias = np.zeros(action_dim)
    
    def forward(self, state: np.ndarray) -> np.ndarray:
        """Compute Q-values for all actions."""
        return self.weights @ state + self.bias
    
    def get_q(self, state: np.ndarray, action: Action) -> float:
        """Get Q-value for specific action."""
        q_values = self.forward(state)
        return float(q_values[action.value])
    
    def update_weights(self, delta_weights: np.ndarray, delta_bias: np.ndarray) -> None:
        """Apply natural gradient update."""
        self.weights += delta_weights
        self.bias += delta_bias
    
    def copy_from(self, other: 'QNetwork') -> None:
        """Copy weights from another network (for target network)."""
        self.weights = other.weights.copy()
        self.bias = other.bias.copy()
    
    def save(self) -> Dict:
        """Serialize for checkpointing."""
        return {
            'weights': self.weights.tolist(),
            'bias': self.bias.tolist(),
            'state_dim': self.state_dim,
            'action_dim': self.action_dim,
        }
    
    @classmethod
    def load(cls, data: Dict) -> 'QNetwork':
        """Restore from checkpoint."""
        net = cls(data['state_dim'], data['action_dim'])
        net.weights = np.array(data['weights'])
        net.bias = np.array(data['bias'])
        return net


class AutonomicPolicy:
    """
    ε-greedy policy with physics-aware safety boundaries.
    
    Ocean decides interventions by:
    1. Computing Q-values for each action
    2. Filtering to safe actions only
    3. ε-greedy selection among safe actions
    """
    
    def __init__(
        self,
        state_dim: int = 776,
        epsilon_start: float = 1.0,
        epsilon_min: float = 0.05,
        epsilon_decay: float = 0.995,
        gamma: float = 0.99,
    ):
        self.q_network = QNetwork(state_dim, len(Action))
        self.target_network = QNetwork(state_dim, len(Action))
        self.target_network.copy_from(self.q_network)
        
        self.epsilon = epsilon_start
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.gamma = gamma
        
        self.safety = SafetyBoundaries()
        
        self._last_mushroom_time: Optional[float] = None
        self._step_count = 0
    
    def get_safe_actions(
        self,
        phi: float,
        instability: float,
        coverage: float,
        current_time: float,
        is_plateau: bool = False,
        narrow_path_severity: str = 'none',
    ) -> List[Action]:
        """
        Filter actions by safety constraints.
        
        Args:
            phi: Current integration measure
            instability: Current stress/instability (0-1)
            coverage: Manifold coverage (0-1)
            current_time: Timestamp for cooldown checks
            is_plateau: Whether in computational plateau
            narrow_path_severity: 'none', 'mild', 'moderate', 'severe'
            
        Returns:
            List of safe actions
        """
        available = [Action.CONTINUE_WAKE]
        
        if phi > self.safety.phi_min_intervention:
            available.append(Action.ENTER_SLEEP)
        
        if phi > self.safety.phi_min_intervention and coverage < self.safety.coverage_max_dream:
            available.append(Action.ENTER_DREAM)
        
        mushroom_cooldown_ok = (
            self._last_mushroom_time is None or
            (current_time - self._last_mushroom_time) > self.safety.mushroom_cooldown_seconds
        )
        
        if (instability < self.safety.instability_max_mushroom and 
            phi > self.safety.phi_min_intervention and mushroom_cooldown_ok):
            available.append(Action.ENTER_MUSHROOM_MICRO)
        
        if (instability < self.safety.instability_max_mushroom_mod and 
            phi > self.safety.phi_min_mushroom_mod and 
            mushroom_cooldown_ok and
            (is_plateau or narrow_path_severity in ['moderate', 'severe'])):
            available.append(Action.ENTER_MUSHROOM_MOD)
        
        return available
    
    def select_action(
        self,
        state: np.ndarray,
        phi: float,
        instability: float,
        coverage: float,
        current_time: float,
        is_plateau: bool = False,
        narrow_path_severity: str = 'none',
    ) -> Tuple[Action, Dict]:
        """
        Select action using ε-greedy policy with safety filtering.
        
        Returns:
            (selected_action, info_dict)
        """
        safe_actions = self.get_safe_actions(
            phi, instability, coverage, current_time, is_plateau, narrow_path_severity
        )
        
        if len(safe_actions) == 0:
            safe_actions = [Action.CONTINUE_WAKE]
        
        q_values = self.q_network.forward(state)
        safe_q_values = {a: q_values[a.value] for a in safe_actions}
        
        if np.random.random() < self.epsilon:
            action = random.choice(safe_actions)
            method = 'explore'
        else:
            action = max(safe_actions, key=lambda a: safe_q_values[a])
            method = 'exploit'
        
        self._step_count += 1
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)
        
        if action in [Action.ENTER_MUSHROOM_MICRO, Action.ENTER_MUSHROOM_MOD]:
            self._last_mushroom_time = current_time
        
        return action, {
            'q_values': {a.name: float(q_values[a.value]) for a in Action},
            'safe_actions': [a.name for a in safe_actions],
            'method': method,
            'epsilon': self.epsilon,
            'step': self._step_count,
        }
    
    def compute_td_target(
        self,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ) -> float:
        """Compute TD target for Q-learning."""
        if done:
            return reward
        
        next_q_values = self.target_network.forward(next_state)
        return reward + self.gamma * np.max(next_q_values)
    
    def update_target_network(self) -> None:
        """Sync target network with Q-network."""
        self.target_network.copy_from(self.q_network)
    
    def save_checkpoint(self) -> Dict:
        """Serialize policy for persistence."""
        return {
            'q_network': self.q_network.save(),
            'target_network': self.target_network.save(),
            'epsilon': self.epsilon,
            'step_count': self._step_count,
            'last_mushroom_time': self._last_mushroom_time,
        }
    
    @classmethod
    def load_checkpoint(cls, data: Dict) -> 'AutonomicPolicy':
        """Restore policy from checkpoint."""
        policy = cls()
        policy.q_network = QNetwork.load(data['q_network'])
        policy.target_network = QNetwork.load(data['target_network'])
        policy.epsilon = data['epsilon']
        policy._step_count = data['step_count']
        policy._last_mushroom_time = data.get('last_mushroom_time')
        return policy
