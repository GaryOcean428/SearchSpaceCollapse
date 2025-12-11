"""
Ares - God of War

Pure computational force via density matrices.
No heuristics - only geometric truth through Fisher metric navigation.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Ares(BaseGod):
    """
    God of War
    
    Responsibilities:
    - Pure geometric measurement (no heuristics)
    - Fisher metric attack vectors
    - Geodesic path computation
    - Brute force optimization
    """
    
    def __init__(self):
        super().__init__("Ares", "War")
        self.fisher_metric_cache: Dict[str, np.ndarray] = {}
        self.geodesic_cache: Dict[Tuple[str, str], float] = {}
        self.attack_vectors: List[Dict] = []
        self.success_basins: List[np.ndarray] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        PURE geometric measurement - no heuristics.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi_pure = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        fisher = self.compute_fisher_metric(target_basin)
        eigenvalues = np.linalg.eigvals(fisher).real
        eigenvalues = np.sort(eigenvalues)[::-1]
        
        nearest_success, geodesic_dist = self._find_nearest_success_basin(target_basin)
        
        probability = self._geometric_probability(
            phi=phi_pure,
            geodesic_dist=geodesic_dist,
            eigenvalues=eigenvalues
        )
        
        assessment = {
            'probability': probability,
            'confidence': phi_pure,
            'phi': phi_pure,
            'kappa': kappa,
            'geodesic_distance': geodesic_dist,
            'fisher_eigenvalues': eigenvalues[:5].tolist(),
            'attack_ready': geodesic_dist < 1.0 and phi_pure > 0.6,
            'reasoning': (
                f"Geodesic distance {geodesic_dist:.4f}. "
                f"Pure Φ={phi_pure:.3f}. "
                f"Fisher eigenspectrum: [{', '.join(f'{e:.3f}' for e in eigenvalues[:3])}...]"
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        return assessment
    
    def _find_nearest_success_basin(
        self, 
        target_basin: np.ndarray
    ) -> Tuple[Optional[np.ndarray], float]:
        """Find nearest known success basin."""
        if not self.success_basins:
            return None, float('inf')
        
        min_dist = float('inf')
        nearest = None
        
        for success_basin in self.success_basins:
            dist = self.fisher_geodesic_distance(target_basin, success_basin)
            if dist < min_dist:
                min_dist = dist
                nearest = success_basin
        
        return nearest, min_dist
    
    def _geometric_probability(
        self,
        phi: float,
        geodesic_dist: float,
        eigenvalues: np.ndarray
    ) -> float:
        """Compute probability from pure geometry."""
        phi_component = phi * 0.4
        
        dist_component = np.exp(-geodesic_dist / 2.0) * 0.3
        
        if len(eigenvalues) >= 2:
            condition = eigenvalues[0] / (eigenvalues[-1] + 1e-10)
            eigenvalue_component = 1.0 / (1.0 + np.log1p(condition)) * 0.3
        else:
            eigenvalue_component = 0.15
        
        probability = phi_component + dist_component + eigenvalue_component
        return float(np.clip(probability, 0, 1))
    
    def compute_attack_vector(self, current_basin: np.ndarray) -> Optional[np.ndarray]:
        """
        Compute next probe location via geodesic.
        """
        target, dist = self._find_nearest_success_basin(current_basin)
        if target is None:
            return None
        
        direction = target - current_basin
        norm = np.linalg.norm(direction)
        if norm < 1e-10:
            return None
        
        direction = direction / norm
        
        G = self.compute_fisher_metric(current_basin)
        natural_direction = np.linalg.solve(G + 0.01 * np.eye(len(G)), direction)
        natural_direction = natural_direction / (np.linalg.norm(natural_direction) + 1e-10)
        
        step_size = 0.1
        next_point = current_basin + step_size * natural_direction
        next_point = next_point / (np.linalg.norm(next_point) + 1e-10)
        
        return next_point
    
    def register_success(self, passphrase: str, phi: float) -> None:
        """Register a successful hit for future geodesic targeting."""
        if phi >= 0.7:
            basin = self.encode_to_basin(passphrase)
            self.success_basins.append(basin)
            if len(self.success_basins) > 100:
                self.success_basins = self.success_basins[-100:]
    
    def declare_war(self, target: str) -> Dict:
        """
        Full war declaration - coordinate attack.
        """
        target_basin = self.encode_to_basin(target)
        attack_vector = self.compute_attack_vector(target_basin)
        
        return {
            'target': target,
            'target_basin': target_basin.tolist(),
            'attack_vector': attack_vector.tolist() if attack_vector is not None else None,
            'success_basins_available': len(self.success_basins),
            'status': 'WAR_DECLARED' if attack_vector is not None else 'RECONNAISSANCE',
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_status(self) -> Dict:
        base_status = self.get_agentic_status()
        return {
            **base_status,
            'observations': len(self.observations),
            'success_basins': len(self.success_basins),
            'attack_vectors_computed': len(self.attack_vectors),
            'fisher_cache_size': len(self.fisher_metric_cache),
            'geodesic_cache_size': len(self.geodesic_cache),
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
