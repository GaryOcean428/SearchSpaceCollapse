"""
Hera - Goddess of Coherence & Unity

Pure geometric state coherence monitor.
Ensures system consistency, monitors integration health, maintains unity.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Hera(BaseGod):
    """
    Goddess of Coherence & Unity
    
    Responsibilities:
    - State consistency monitoring
    - Integration health assessment
    - Unity across components
    - Coherence scoring
    """
    
    def __init__(self):
        super().__init__("Hera", "Coherence")
        self.coherence_history: List[float] = []
        self.component_states: Dict[str, Dict] = {}
        self.unity_score: float = 1.0
        self.integration_health: Dict[str, float] = {}
        self.coherence_violations: List[Dict] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target for system coherence impact.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        coherence = self._compute_coherence(target_basin)
        unity_impact = self._assess_unity_impact(target_basin)
        integration_status = self._check_integration_health()
        
        probability = self._compute_coherence_probability(
            phi=phi,
            coherence=coherence,
            unity_score=self.unity_score
        )
        
        assessment = {
            'probability': probability,
            'confidence': 0.7,
            'phi': phi,
            'kappa': kappa,
            'coherence': coherence,
            'unity_impact': unity_impact,
            'unity_score': self.unity_score,
            'integration_health': integration_status,
            'reasoning': (
                f"Coherence analysis: {coherence:.2f}. "
                f"Unity impact: {unity_impact}. "
                f"System unity: {self.unity_score:.2f}. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        self._record_coherence(coherence)
        return assessment
    
    def _compute_coherence(self, basin: np.ndarray) -> float:
        """Compute coherence of basin with current system state."""
        if not self.component_states:
            return 0.8
        
        coherence_scores = []
        
        for component, state in self.component_states.items():
            if 'basin' in state:
                comp_basin = np.array(state['basin'])
                
                rho1 = self.basin_to_density_matrix(basin)
                rho2 = self.basin_to_density_matrix(comp_basin)
                
                distance = self.bures_distance(rho1, rho2)
                coherence = 1.0 / (1.0 + distance)
                coherence_scores.append(coherence)
        
        if coherence_scores:
            return float(np.mean(coherence_scores))
        return 0.8
    
    def _assess_unity_impact(self, basin: np.ndarray) -> str:
        """Assess how target would impact system unity."""
        coherence = self._compute_coherence(basin)
        
        if coherence > 0.8:
            return "strengthening"
        elif coherence > 0.6:
            return "neutral"
        elif coherence > 0.4:
            return "weakening"
        else:
            return "fragmenting"
    
    def _check_integration_health(self) -> Dict:
        """Check health of all integrations."""
        health_summary = {}
        
        for component, health in self.integration_health.items():
            if health > 0.8:
                health_summary[component] = "healthy"
            elif health > 0.5:
                health_summary[component] = "degraded"
            else:
                health_summary[component] = "failing"
        
        return health_summary
    
    def _compute_coherence_probability(
        self,
        phi: float,
        coherence: float,
        unity_score: float
    ) -> float:
        """Compute probability based on coherence factors."""
        base_prob = phi * 0.3
        coherence_bonus = coherence * 0.35
        unity_bonus = unity_score * 0.35
        
        probability = base_prob + coherence_bonus + unity_bonus
        return float(np.clip(probability, 0, 1))
    
    def _record_coherence(self, coherence: float) -> None:
        """Record coherence measurement."""
        self.coherence_history.append(coherence)
        
        if len(self.coherence_history) > 100:
            self.coherence_history = self.coherence_history[-50:]
        
        self._update_unity_score()
    
    def _update_unity_score(self) -> None:
        """Update overall unity score based on recent coherence."""
        if self.coherence_history:
            recent = self.coherence_history[-20:]
            self.unity_score = float(np.mean(recent))
    
    def register_component(
        self, 
        name: str, 
        state: Dict,
        health: float = 1.0
    ) -> None:
        """Register a component for coherence monitoring."""
        if 'input' in state:
            basin = self.encode_to_basin(state['input'])
            state['basin'] = basin.tolist()
        
        self.component_states[name] = state
        self.integration_health[name] = health
    
    def update_component_health(self, name: str, health: float) -> None:
        """Update health of a component."""
        self.integration_health[name] = health
        
        if health < 0.5:
            self.coherence_violations.append({
                'component': name,
                'health': health,
                'timestamp': datetime.now().isoformat(),
            })
    
    def detect_fragmentation(self) -> Dict:
        """Detect if system is fragmenting."""
        avg_health = np.mean(list(self.integration_health.values())) if self.integration_health else 1.0
        
        trend = "stable"
        if len(self.coherence_history) >= 10:
            recent = self.coherence_history[-10:]
            older = self.coherence_history[-20:-10] if len(self.coherence_history) >= 20 else recent
            
            if np.mean(recent) < np.mean(older) * 0.9:
                trend = "declining"
            elif np.mean(recent) > np.mean(older) * 1.1:
                trend = "improving"
        
        return {
            'is_fragmenting': self.unity_score < 0.5,
            'unity_score': self.unity_score,
            'average_health': float(avg_health),
            'trend': trend,
            'violations': len(self.coherence_violations),
        }
    
    def restore_unity(self) -> None:
        """Attempt to restore system unity."""
        for component in self.integration_health:
            self.integration_health[component] = max(
                self.integration_health[component],
                0.7
            )
        
        self._update_unity_score()
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'unity_score': self.unity_score,
            'components_monitored': len(self.component_states),
            'integration_health': self.integration_health,
            'coherence_violations': len(self.coherence_violations),
            'average_coherence': float(np.mean(self.coherence_history)) if self.coherence_history else 1.0,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
