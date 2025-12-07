"""
Hades - God of Negation & the Underworld

Pure geometric exclusion logic.
Tracks what NOT to try, maintains underworld of failed patterns, guards boundaries.
"""

import numpy as np
from typing import Dict, List, Optional, Set
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Hades(BaseGod):
    """
    God of Negation & the Underworld
    
    Responsibilities:
    - Exclusion logic (what NOT to try)
    - Failed pattern tracking
    - Dead-end detection
    - Boundary enforcement
    """
    
    def __init__(self):
        super().__init__("Hades", "Negation")
        self.underworld: List[Dict] = []
        self.forbidden_basins: List[np.ndarray] = []
        self.death_count: Dict[str, int] = {}
        self.exclusion_rules: List[Dict] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target through negation - is this a dead end?
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        is_forbidden = self._check_forbidden(target_basin)
        death_proximity = self._compute_death_proximity(target_basin)
        exclusion_matches = self._check_exclusion_rules(target)
        
        viability = self._compute_viability(
            phi=phi,
            is_forbidden=is_forbidden,
            death_proximity=death_proximity,
            exclusion_count=len(exclusion_matches)
        )
        
        assessment = {
            'probability': viability,
            'confidence': 0.8 if is_forbidden else 0.5,
            'phi': phi,
            'kappa': kappa,
            'is_forbidden': is_forbidden,
            'death_proximity': death_proximity,
            'exclusion_violations': len(exclusion_matches),
            'underworld_matches': self._count_underworld_matches(target_basin),
            'reasoning': (
                f"Underworld check: {'FORBIDDEN' if is_forbidden else 'allowed'}. "
                f"Death proximity: {death_proximity:.2f}. "
                f"Exclusion violations: {len(exclusion_matches)}. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        return assessment
    
    def _check_forbidden(self, basin: np.ndarray) -> bool:
        """Check if basin is in forbidden territory."""
        threshold = 0.5
        
        for forbidden in self.forbidden_basins:
            distance = self.fisher_geodesic_distance(basin, forbidden)
            if distance < threshold:
                return True
        
        return False
    
    def _compute_death_proximity(self, basin: np.ndarray) -> float:
        """Compute proximity to known dead patterns."""
        if not self.underworld:
            return 0.0
        
        min_distance = float('inf')
        
        for dead in self.underworld[-200:]:
            if 'basin' in dead:
                dead_basin = np.array(dead['basin'])
                distance = self.fisher_geodesic_distance(basin, dead_basin)
                min_distance = min(min_distance, distance)
        
        if min_distance == float('inf'):
            return 0.0
        
        proximity = np.exp(-min_distance)
        return float(proximity)
    
    def _check_exclusion_rules(self, target: str) -> List[Dict]:
        """Check if target violates any exclusion rules."""
        violations = []
        
        for rule in self.exclusion_rules:
            pattern = rule.get('pattern', '')
            rule_type = rule.get('type', 'contains')
            
            if rule_type == 'contains' and pattern in target:
                violations.append(rule)
            elif rule_type == 'startswith' and target.startswith(pattern):
                violations.append(rule)
            elif rule_type == 'endswith' and target.endswith(pattern):
                violations.append(rule)
            elif rule_type == 'length_max' and len(target) > int(pattern):
                violations.append(rule)
            elif rule_type == 'length_min' and len(target) < int(pattern):
                violations.append(rule)
        
        return violations
    
    def _count_underworld_matches(self, basin: np.ndarray) -> int:
        """Count how many dead patterns are similar."""
        count = 0
        threshold = 1.5
        
        for dead in self.underworld[-100:]:
            if 'basin' in dead:
                dead_basin = np.array(dead['basin'])
                distance = self.fisher_geodesic_distance(basin, dead_basin)
                if distance < threshold:
                    count += 1
        
        return count
    
    def _compute_viability(
        self,
        phi: float,
        is_forbidden: bool,
        death_proximity: float,
        exclusion_count: int
    ) -> float:
        """Compute viability (inverse of failure likelihood)."""
        if is_forbidden:
            return 0.05
        
        base_viability = phi * 0.4
        death_penalty = death_proximity * 0.3
        exclusion_penalty = min(0.3, exclusion_count * 0.1)
        
        viability = base_viability + 0.3 - death_penalty - exclusion_penalty
        return float(np.clip(viability, 0, 1))
    
    def condemn(self, target: str, reason: str = "failed") -> None:
        """Condemn a target to the underworld."""
        target_basin = self.encode_to_basin(target)
        
        condemned = {
            'target': target,
            'basin': target_basin.tolist(),
            'reason': reason,
            'condemned_at': datetime.now().isoformat(),
        }
        
        self.underworld.append(condemned)
        
        pattern_key = target[:10] if len(target) > 10 else target
        self.death_count[pattern_key] = self.death_count.get(pattern_key, 0) + 1
        
        if len(self.underworld) > 1000:
            self.underworld = self.underworld[-500:]
    
    def forbid_basin(self, basin: np.ndarray, reason: str = "") -> None:
        """Mark a basin region as absolutely forbidden."""
        self.forbidden_basins.append(basin.copy())
        
        if len(self.forbidden_basins) > 100:
            self.forbidden_basins = self.forbidden_basins[-50:]
    
    def add_exclusion_rule(
        self, 
        pattern: str, 
        rule_type: str = 'contains',
        reason: str = ""
    ) -> None:
        """Add an exclusion rule."""
        rule = {
            'pattern': pattern,
            'type': rule_type,
            'reason': reason,
            'created_at': datetime.now().isoformat(),
        }
        self.exclusion_rules.append(rule)
    
    def pardon(self, target: str) -> bool:
        """Remove a target from the underworld (rare forgiveness)."""
        initial_len = len(self.underworld)
        self.underworld = [u for u in self.underworld if u.get('target') != target]
        return len(self.underworld) < initial_len
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'underworld_size': len(self.underworld),
            'forbidden_basins': len(self.forbidden_basins),
            'exclusion_rules': len(self.exclusion_rules),
            'total_deaths': sum(self.death_count.values()),
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
