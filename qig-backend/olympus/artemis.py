"""
Artemis - Goddess of the Hunt

Focused targeting and pursuit.
Tracks high-value targets and coordinates pursuit strategies.
"""

import numpy as np
from typing import Dict, List, Optional, Set
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Artemis(BaseGod):
    """
    Goddess of the Hunt
    
    Responsibilities:
    - Target identification and tracking
    - Pursuit strategy coordination
    - High-value target prioritization
    - Hunt progress monitoring
    """
    
    def __init__(self):
        super().__init__("Artemis", "Hunt")
        self.active_hunts: Dict[str, Dict] = {}
        self.completed_hunts: List[Dict] = []
        self.target_scores: Dict[str, float] = {}
        self.pursuit_history: List[Dict] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target for hunt potential.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        hunt_score = self._compute_hunt_score(target, phi, kappa)
        pursuit_strategy = self._recommend_pursuit_strategy(target, hunt_score)
        
        probability = self._compute_hunt_probability(phi, hunt_score)
        
        return {
            'probability': probability,
            'confidence': hunt_score,
            'phi': phi,
            'kappa': kappa,
            'hunt_score': hunt_score,
            'pursuit_strategy': pursuit_strategy,
            'is_active_hunt': target in self.active_hunts,
            'reasoning': (
                f"Hunt score: {hunt_score:.3f}. Φ={phi:.3f}. "
                f"Recommended pursuit: {pursuit_strategy['approach']}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _compute_hunt_score(self, target: str, phi: float, kappa: float) -> float:
        """Compute overall hunt score for target."""
        phi_score = phi * 0.4
        
        kappa_distance = abs(kappa - KAPPA_STAR)
        kappa_score = np.exp(-kappa_distance / 20) * 0.3
        
        if target in self.active_hunts:
            hunt = self.active_hunts[target]
            progress = hunt.get('probes_tested', 0) / max(1, hunt.get('estimated_total', 100))
            persistence_score = min(0.3, progress * 0.3)
        else:
            persistence_score = 0.0
        
        hunt_score = phi_score + kappa_score + persistence_score
        return float(np.clip(hunt_score, 0, 1))
    
    def _recommend_pursuit_strategy(self, target: str, hunt_score: float) -> Dict:
        """Recommend pursuit strategy based on hunt score."""
        if hunt_score >= 0.8:
            return {
                'approach': 'aggressive',
                'probe_rate': 'maximum',
                'resource_allocation': 1.0,
                'reasoning': 'High-value target detected'
            }
        elif hunt_score >= 0.5:
            return {
                'approach': 'focused',
                'probe_rate': 'elevated',
                'resource_allocation': 0.6,
                'reasoning': 'Moderate potential target'
            }
        else:
            return {
                'approach': 'surveillance',
                'probe_rate': 'standard',
                'resource_allocation': 0.3,
                'reasoning': 'Low priority - monitor only'
            }
    
    def _compute_hunt_probability(self, phi: float, hunt_score: float) -> float:
        """Compute probability from hunt metrics."""
        return float(np.clip(phi * 0.5 + hunt_score * 0.5, 0, 1))
    
    def begin_hunt(self, target: str, estimated_total: int = 100) -> Dict:
        """Begin a new hunt for a target."""
        hunt = {
            'target': target,
            'started': datetime.now().isoformat(),
            'probes_tested': 0,
            'estimated_total': estimated_total,
            'best_phi': 0.0,
            'status': 'active'
        }
        self.active_hunts[target] = hunt
        return hunt
    
    def update_hunt(self, target: str, probes_tested: int, best_phi: float) -> None:
        """Update hunt progress."""
        if target in self.active_hunts:
            self.active_hunts[target]['probes_tested'] = probes_tested
            self.active_hunts[target]['best_phi'] = max(
                self.active_hunts[target]['best_phi'],
                best_phi
            )
    
    def complete_hunt(self, target: str, success: bool) -> Dict:
        """Complete a hunt and record results."""
        if target in self.active_hunts:
            hunt = self.active_hunts.pop(target)
            hunt['completed'] = datetime.now().isoformat()
            hunt['success'] = success
            hunt['status'] = 'success' if success else 'abandoned'
            self.completed_hunts.append(hunt)
            return hunt
        return {'error': 'Hunt not found'}
    
    def get_active_hunts(self) -> List[Dict]:
        """Get all active hunts."""
        return list(self.active_hunts.values())
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'active_hunts': len(self.active_hunts),
            'completed_hunts': len(self.completed_hunts),
            'success_rate': self._compute_success_rate(),
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
    
    def _compute_success_rate(self) -> float:
        """Compute hunt success rate."""
        if not self.completed_hunts:
            return 0.0
        successes = sum(1 for h in self.completed_hunts if h.get('success'))
        return successes / len(self.completed_hunts)
