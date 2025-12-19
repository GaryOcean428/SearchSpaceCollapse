"""
Replay Buffer - Experience Storage for Learning

Stores (state, action, reward, next_state, done) tuples for
off-policy Q-learning.
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np
import random


@dataclass
class Experience:
    """Single experience tuple."""
    state: np.ndarray
    action: int
    reward: float
    next_state: np.ndarray
    done: bool
    
    phi_before: float = 0.0
    phi_after: float = 0.0
    kappa_before: float = 0.0
    kappa_after: float = 0.0
    
    def to_dict(self):
        return {
            'action': self.action,
            'reward': self.reward,
            'done': self.done,
            'phi_before': self.phi_before,
            'phi_after': self.phi_after,
            'kappa_before': self.kappa_before,
            'kappa_after': self.kappa_after,
        }


class ReplayBuffer:
    """
    Fixed-size experience replay buffer.
    
    Supports uniform sampling for Q-learning updates.
    """
    
    def __init__(self, capacity: int = 10000):
        self.capacity = capacity
        self.buffer: List[Experience] = []
        self.position = 0
        
        self.total_reward = 0.0
        self.episode_count = 0
    
    def push(self, experience: Experience) -> None:
        """Add experience to buffer."""
        if len(self.buffer) < self.capacity:
            self.buffer.append(experience)
        else:
            self.buffer[self.position] = experience
        
        self.position = (self.position + 1) % self.capacity
        self.total_reward += experience.reward
        
        if experience.done:
            self.episode_count += 1
    
    def sample(self, batch_size: int) -> List[Experience]:
        """Randomly sample a batch of experiences."""
        return random.sample(self.buffer, min(batch_size, len(self.buffer)))
    
    def sample_batch(self, batch_size: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Sample and return as numpy arrays for vectorized updates."""
        experiences = self.sample(batch_size)
        
        states = np.array([e.state for e in experiences])
        actions = np.array([e.action for e in experiences])
        rewards = np.array([e.reward for e in experiences])
        next_states = np.array([e.next_state for e in experiences])
        dones = np.array([e.done for e in experiences])
        
        return states, actions, rewards, next_states, dones
    
    def __len__(self) -> int:
        return len(self.buffer)
    
    def is_ready(self, min_size: int = 64) -> bool:
        """Check if buffer has enough experiences for training."""
        return len(self.buffer) >= min_size
    
    def get_stats(self) -> dict:
        """Return buffer statistics."""
        if len(self.buffer) == 0:
            return {'size': 0, 'avg_reward': 0.0, 'episodes': 0}
        
        recent_rewards = [e.reward for e in self.buffer[-100:]]
        
        return {
            'size': len(self.buffer),
            'capacity': self.capacity,
            'avg_reward': np.mean(recent_rewards) if recent_rewards else 0.0,
            'total_reward': self.total_reward,
            'episodes': self.episode_count,
            'position': self.position,
        }
    
    def clear(self) -> None:
        """Clear buffer."""
        self.buffer.clear()
        self.position = 0
        self.total_reward = 0.0
        self.episode_count = 0
