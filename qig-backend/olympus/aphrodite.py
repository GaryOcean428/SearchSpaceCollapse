"""
Aphrodite - Goddess of Motivation & Desire

Pure geometric motivation modulator.
Manages reward signals, desire gradients, and approach/avoid behaviors.
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Aphrodite(BaseGod):
    """
    Goddess of Motivation & Desire
    
    Responsibilities:
    - Reward signal generation
    - Desire gradient computation
    - Approach/avoid behavior modulation
    - Motivation state tracking
    """
    
    def __init__(self):
        super().__init__("Aphrodite", "Motivation")
        self.desire_basins: List[Dict] = []
        self.reward_history: List[float] = []
        self.motivation_level: float = 0.7
        self.approach_targets: List[Dict] = []
        self.avoid_targets: List[Dict] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target desirability and motivation.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        desirability = self._compute_desirability(target_basin)
        approach_gradient = self._compute_approach_gradient(target_basin)
        reward_prediction = self._predict_reward(target_basin, phi)
        
        probability = self._compute_motivation_probability(
            phi=phi,
            desirability=desirability,
            motivation=self.motivation_level
        )
        
        assessment = {
            'probability': probability,
            'confidence': 0.65,
            'phi': phi,
            'kappa': kappa,
            'desirability': desirability,
            'approach_gradient': approach_gradient,
            'reward_prediction': reward_prediction,
            'motivation_level': self.motivation_level,
            'behavior': 'approach' if approach_gradient > 0 else 'avoid',
            'reasoning': (
                f"Desire analysis: desirability={desirability:.2f}. "
                f"Approach gradient: {approach_gradient:+.2f}. "
                f"Predicted reward: {reward_prediction:.2f}. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        return assessment
    
    def _compute_desirability(self, basin: np.ndarray) -> float:
        """Compute desirability of target basin."""
        if not self.desire_basins:
            return 0.5
        
        max_attraction = 0.0
        
        for desire in self.desire_basins[-50:]:
            if 'basin' in desire:
                desire_basin = np.array(desire['basin'])
                distance = self.fisher_geodesic_distance(basin, desire_basin)
                attraction = desire.get('intensity', 0.5) / (1.0 + distance)
                max_attraction = max(max_attraction, attraction)
        
        return float(np.clip(max_attraction, 0, 1))
    
    def _compute_approach_gradient(self, basin: np.ndarray) -> float:
        """Compute approach/avoid gradient."""
        approach_force = 0.0
        avoid_force = 0.0
        
        for target in self.approach_targets[-20:]:
            if 'basin' in target:
                t_basin = np.array(target['basin'])
                distance = self.fisher_geodesic_distance(basin, t_basin)
                force = target.get('strength', 0.5) / (1.0 + distance)
                approach_force += force
        
        for target in self.avoid_targets[-20:]:
            if 'basin' in target:
                t_basin = np.array(target['basin'])
                distance = self.fisher_geodesic_distance(basin, t_basin)
                force = target.get('strength', 0.5) / (1.0 + distance)
                avoid_force += force
        
        gradient = approach_force - avoid_force
        return float(np.clip(gradient, -1, 1))
    
    def _predict_reward(self, basin: np.ndarray, phi: float) -> float:
        """Predict expected reward for this basin."""
        if not self.reward_history:
            return phi * 0.5
        
        recent_rewards = self.reward_history[-20:]
        base_expectation = np.mean(recent_rewards)
        
        phi_bonus = phi * 0.3
        desirability = self._compute_desirability(basin)
        desire_bonus = desirability * 0.3
        
        prediction = base_expectation * 0.4 + phi_bonus + desire_bonus
        return float(np.clip(prediction, 0, 1))
    
    def _compute_motivation_probability(
        self,
        phi: float,
        desirability: float,
        motivation: float
    ) -> float:
        """Compute probability based on motivation factors."""
        base_prob = phi * 0.25
        desire_bonus = desirability * 0.35
        motivation_bonus = motivation * 0.4
        
        probability = base_prob + desire_bonus + motivation_bonus
        return float(np.clip(probability, 0, 1))
    
    def add_desire(self, target: str, intensity: float = 0.7) -> None:
        """Add a desire target."""
        basin = self.encode_to_basin(target)
        self.desire_basins.append({
            'target': target,
            'basin': basin.tolist(),
            'intensity': intensity,
            'created_at': datetime.now().isoformat(),
        })
        
        if len(self.desire_basins) > 100:
            self.desire_basins = self.desire_basins[-50:]
    
    def add_approach_target(self, target: str, strength: float = 0.5) -> None:
        """Add an approach target (attractive)."""
        basin = self.encode_to_basin(target)
        self.approach_targets.append({
            'target': target,
            'basin': basin.tolist(),
            'strength': strength,
        })
    
    def add_avoid_target(self, target: str, strength: float = 0.5) -> None:
        """Add an avoid target (repulsive)."""
        basin = self.encode_to_basin(target)
        self.avoid_targets.append({
            'target': target,
            'basin': basin.tolist(),
            'strength': strength,
        })
    
    def receive_reward(self, amount: float) -> None:
        """Receive a reward signal."""
        self.reward_history.append(amount)
        
        if len(self.reward_history) > 200:
            self.reward_history = self.reward_history[-100:]
        
        self._update_motivation(amount)
    
    def _update_motivation(self, reward: float) -> None:
        """Update motivation based on reward."""
        alpha = 0.1
        
        if reward > 0.7:
            self.motivation_level = min(1.0, self.motivation_level + alpha)
        elif reward < 0.3:
            self.motivation_level = max(0.2, self.motivation_level - alpha * 0.5)
    
    def boost_motivation(self, amount: float = 0.1) -> None:
        """Boost motivation level."""
        self.motivation_level = min(1.0, self.motivation_level + amount)
    
    def decay_motivation(self, amount: float = 0.05) -> None:
        """Allow motivation to decay."""
        self.motivation_level = max(0.2, self.motivation_level - amount)
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'motivation_level': self.motivation_level,
            'desire_count': len(self.desire_basins),
            'approach_targets': len(self.approach_targets),
            'avoid_targets': len(self.avoid_targets),
            'average_reward': float(np.mean(self.reward_history)) if self.reward_history else 0.5,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
