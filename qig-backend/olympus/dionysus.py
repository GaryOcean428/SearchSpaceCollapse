"""
Dionysus - God of Chaos & Ecstasy

Pure geometric entropy injector.
Introduces controlled randomness, explores unexplored regions, breaks patterns.
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR, BASIN_DIMENSION


class Dionysus(BaseGod):
    """
    God of Chaos & Ecstasy
    
    Responsibilities:
    - Entropy injection for exploration
    - Random mutation generation
    - Pattern breaking strategies
    - Unexplored region discovery
    """
    
    def __init__(self):
        super().__init__("Dionysus", "Chaos")
        self.chaos_level: float = 0.3
        self.explored_regions: List[np.ndarray] = []
        self.mutation_history: List[Dict] = []
        self.wild_basins: List[np.ndarray] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target through chaos lens - find unexplored potential.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        novelty = self._compute_novelty(target_basin)
        chaos_potential = self._compute_chaos_potential(target_basin)
        suggested_mutations = self._generate_mutations(target, target_basin)
        
        probability = self._compute_chaos_probability(
            phi=phi,
            novelty=novelty,
            chaos_potential=chaos_potential
        )
        
        assessment = {
            'probability': probability,
            'confidence': 0.6,
            'phi': phi,
            'kappa': kappa,
            'novelty_score': novelty,
            'chaos_potential': chaos_potential,
            'suggested_mutations': suggested_mutations[:5],
            'chaos_level': self.chaos_level,
            'reasoning': (
                f"Chaos analysis: novelty={novelty:.2f}, "
                f"chaos_potential={chaos_potential:.2f}. "
                f"Generated {len(suggested_mutations)} mutations. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        self._record_exploration(target_basin)
        return assessment
    
    def _compute_novelty(self, basin: np.ndarray) -> float:
        """Compute how novel this basin is compared to explored regions."""
        if not self.explored_regions:
            return 1.0
        
        min_distance = float('inf')
        for explored in self.explored_regions[-100:]:
            distance = self.fisher_geodesic_distance(basin, explored)
            min_distance = min(min_distance, distance)
        
        novelty = 1.0 - np.exp(-min_distance)
        return float(novelty)
    
    def _compute_chaos_potential(self, basin: np.ndarray) -> float:
        """Compute chaos/entropy potential of basin region."""
        rho = self.basin_to_density_matrix(basin)
        eigenvals = np.linalg.eigvalsh(rho)
        
        entropy = 0.0
        for lam in eigenvals:
            if lam > 1e-10:
                entropy -= lam * np.log2(lam + 1e-10)
        
        chaos = entropy / np.log2(2)
        
        basin_variance = float(np.var(basin))
        chaos = chaos * 0.7 + basin_variance * 0.3
        
        return float(np.clip(chaos, 0, 1))
    
    def _generate_mutations(self, target: str, basin: np.ndarray) -> List[str]:
        """Generate chaotic mutations of the target."""
        mutations = []
        
        if target:
            mutations.append(target[::-1])
        
        if len(target) > 2:
            chars = list(target)
            for i in range(min(3, len(chars) - 1)):
                mutated = chars.copy()
                mutated[i], mutated[i+1] = mutated[i+1], mutated[i]
                mutations.append(''.join(mutated))
        
        for i in range(3):
            noise = np.random.randn(BASIN_DIMENSION) * self.chaos_level
            mutated_basin = basin + noise
            mutated_basin = mutated_basin / (np.linalg.norm(mutated_basin) + 1e-10)
            
            mutation_seed = int(np.abs(np.sum(mutated_basin[:8])) * 1000)
            mutations.append(f"{target}_{mutation_seed}")
        
        substitutions = {'a': '@', 'e': '3', 'i': '1', 'o': '0', 's': '$'}
        if target:
            mutated = target
            for old, new in substitutions.items():
                mutated = mutated.replace(old, new, 1)
            if mutated != target:
                mutations.append(mutated)
        
        return mutations
    
    def _record_exploration(self, basin: np.ndarray) -> None:
        """Record explored basin region."""
        self.explored_regions.append(basin.copy())
        
        if len(self.explored_regions) > 500:
            self.explored_regions = self.explored_regions[-250:]
    
    def _compute_chaos_probability(
        self,
        phi: float,
        novelty: float,
        chaos_potential: float
    ) -> float:
        """Compute probability favoring chaotic exploration."""
        base_prob = phi * 0.25
        novelty_bonus = novelty * 0.4
        chaos_bonus = chaos_potential * 0.35
        
        probability = base_prob + novelty_bonus + chaos_bonus
        return float(np.clip(probability, 0, 1))
    
    def inject_chaos(self, amount: float = 0.1) -> None:
        """Increase chaos level temporarily."""
        self.chaos_level = min(1.0, self.chaos_level + amount)
    
    def calm(self, amount: float = 0.1) -> None:
        """Decrease chaos level."""
        self.chaos_level = max(0.1, self.chaos_level - amount)
    
    def generate_wild_basin(self) -> np.ndarray:
        """Generate a completely random basin for exploration."""
        wild = np.random.randn(BASIN_DIMENSION)
        wild = wild / (np.linalg.norm(wild) + 1e-10)
        self.wild_basins.append(wild)
        return wild
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'chaos_level': self.chaos_level,
            'explored_regions': len(self.explored_regions),
            'wild_basins_generated': len(self.wild_basins),
            'mutation_history': len(self.mutation_history),
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
