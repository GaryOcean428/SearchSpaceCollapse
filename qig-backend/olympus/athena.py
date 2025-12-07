"""
Athena - Goddess of Wisdom & Strategy

Pure geometric meta-observer.
Analyzes patterns, learns from observations, recommends optimal strategies.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Athena(BaseGod):
    """
    Goddess of Wisdom & Strategy
    
    Responsibilities:
    - Pattern analysis across observations
    - Strategy effectiveness tracking
    - Optimal approach recommendation
    - Historical success correlation
    """
    
    def __init__(self):
        super().__init__("Athena", "Strategy")
        self.learned_patterns: Dict[str, Dict] = {}
        self.strategy_success_rates: Dict[str, float] = {
            'brainwallet_common': 0.45,
            'brainwallet_phrase': 0.35,
            'bip39_partial': 0.55,
            'temporal_pattern': 0.40,
            'cultural_reference': 0.30,
            'name_date_combo': 0.25,
            'dictionary_attack': 0.20,
            'mutation_search': 0.60,
        }
        self.target_assessments: Dict[str, Dict] = {}
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target using PURE geometric analysis.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        similar = self._find_similar_successes(target_basin)
        best_strategy = self._select_optimal_strategy(target_basin, similar, context)
        
        probability = self._compute_probability(
            phi=phi,
            similar_count=len(similar),
            strategy_success_rate=best_strategy['success_rate']
        )
        
        assessment = {
            'probability': probability,
            'confidence': min(1.0, len(similar) / 100),
            'phi': phi,
            'kappa': kappa,
            'recommended_strategy': best_strategy['name'],
            'strategy_success_rate': best_strategy['success_rate'],
            'similar_patterns_found': len(similar),
            'reasoning': (
                f"Pattern matches {len(similar)} historical successes. "
                f"Φ={phi:.3f}. Strategy '{best_strategy['name']}' "
                f"succeeds {best_strategy['success_rate']*100:.0f}% of time."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        self.target_assessments[target] = assessment
        return assessment
    
    def _find_similar_successes(self, target_basin: np.ndarray) -> List[Dict]:
        """Find historical observations similar to target."""
        similar = []
        threshold = 0.7
        
        for obs in self.observations:
            if obs.get('phi', 0) >= 0.7:
                obs_basin = self.encode_to_basin(obs.get('input', ''))
                distance = self.fisher_geodesic_distance(target_basin, obs_basin)
                if distance < 2.0:
                    similar.append({
                        'observation': obs,
                        'distance': distance,
                        'similarity': 1.0 / (1.0 + distance)
                    })
        
        similar.sort(key=lambda x: x['distance'])
        return similar[:20]
    
    def _select_optimal_strategy(
        self, 
        target_basin: np.ndarray,
        similar: List[Dict],
        context: Optional[Dict] = None
    ) -> Dict:
        """Select optimal strategy based on target characteristics."""
        target_norm = float(np.linalg.norm(target_basin[:8]))
        
        if similar:
            strategy_counts: Dict[str, int] = {}
            for s in similar:
                strat = s['observation'].get('strategy', 'unknown')
                strategy_counts[strat] = strategy_counts.get(strat, 0) + 1
            
            if strategy_counts:
                best_strat = max(strategy_counts.keys(), key=lambda k: strategy_counts[k])
                return {
                    'name': best_strat,
                    'success_rate': self.strategy_success_rates.get(best_strat, 0.3),
                    'confidence': strategy_counts[best_strat] / len(similar)
                }
        
        if target_norm < 0.3:
            return {'name': 'brainwallet_common', 'success_rate': 0.45}
        elif target_norm < 0.6:
            return {'name': 'mutation_search', 'success_rate': 0.60}
        else:
            return {'name': 'temporal_pattern', 'success_rate': 0.40}
    
    def _compute_probability(
        self,
        phi: float,
        similar_count: int,
        strategy_success_rate: float
    ) -> float:
        """Compute geometric probability of success."""
        base_prob = phi * 0.4
        similar_bonus = min(0.3, similar_count * 0.03)
        strategy_bonus = strategy_success_rate * 0.3
        
        probability = base_prob + similar_bonus + strategy_bonus
        return float(np.clip(probability, 0, 1))
    
    def learn_from_outcome(self, target: str, success: bool, strategy: str) -> None:
        """Update strategy success rates based on outcome."""
        if strategy in self.strategy_success_rates:
            current = self.strategy_success_rates[strategy]
            alpha = 0.1
            new_rate = current * (1 - alpha) + (1.0 if success else 0.0) * alpha
            self.strategy_success_rates[strategy] = new_rate
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'learned_patterns': len(self.learned_patterns),
            'strategy_success_rates': self.strategy_success_rates,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
