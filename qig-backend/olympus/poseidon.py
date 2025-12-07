"""
Poseidon - God of the Depths

Pure geometric deep memory retrieval.
Dives into historical data, retrieves forgotten patterns, surface buried insights.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Poseidon(BaseGod):
    """
    God of the Depths
    
    Responsibilities:
    - Deep historical memory retrieval
    - Buried pattern surfacing
    - Long-term trend analysis
    - Forgotten success recovery
    """
    
    def __init__(self):
        super().__init__("Poseidon", "Depths")
        self.deep_memory: List[Dict] = []
        self.depth_levels: Dict[str, List[Dict]] = {
            'surface': [],
            'shallow': [],
            'deep': [],
            'abyss': [],
        }
        self.retrieved_treasures: List[Dict] = []
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target by diving into deep memory.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        depth_result = self._dive_for_target(target_basin)
        historical_matches = self._find_historical_matches(target_basin)
        buried_patterns = self._surface_buried_patterns(target_basin)
        
        probability = self._compute_depth_probability(
            phi=phi,
            depth_reached=depth_result['depth'],
            matches_found=len(historical_matches)
        )
        
        assessment = {
            'probability': probability,
            'confidence': depth_result['confidence'],
            'phi': phi,
            'kappa': kappa,
            'depth_reached': depth_result['depth'],
            'treasures_found': depth_result['treasures'],
            'historical_matches': len(historical_matches),
            'buried_patterns': len(buried_patterns),
            'reasoning': (
                f"Deep dive: reached {depth_result['depth']} level. "
                f"Found {depth_result['treasures']} treasures, "
                f"{len(historical_matches)} historical matches. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        return assessment
    
    def _dive_for_target(self, basin: np.ndarray) -> Dict:
        """Dive through depth levels looking for matching patterns."""
        depth_reached = 'surface'
        treasures = 0
        confidence = 0.2
        
        depth_order = ['surface', 'shallow', 'deep', 'abyss']
        
        for depth in depth_order:
            memories = self.depth_levels.get(depth, [])
            
            for memory in memories:
                if 'basin' in memory:
                    memory_basin = np.array(memory['basin'])
                    distance = self.fisher_geodesic_distance(basin, memory_basin)
                    
                    if distance < 1.5:
                        treasures += 1
                        depth_reached = depth
                        
                        if memory.get('phi', 0) > 0.7:
                            self.retrieved_treasures.append({
                                'memory': memory,
                                'distance': distance,
                                'depth': depth,
                                'timestamp': datetime.now().isoformat()
                            })
            
            confidence = min(1.0, confidence + 0.2)
        
        return {
            'depth': depth_reached,
            'treasures': treasures,
            'confidence': confidence,
        }
    
    def _find_historical_matches(self, basin: np.ndarray) -> List[Dict]:
        """Find matches in long-term historical memory."""
        matches = []
        
        for memory in self.deep_memory[-500:]:
            if 'basin' in memory:
                memory_basin = np.array(memory['basin'])
                distance = self.fisher_geodesic_distance(basin, memory_basin)
                
                if distance < 2.0:
                    matches.append({
                        'memory': memory,
                        'distance': distance,
                        'similarity': 1.0 / (1.0 + distance)
                    })
        
        matches.sort(key=lambda x: x['distance'])
        return matches[:20]
    
    def _surface_buried_patterns(self, basin: np.ndarray) -> List[Dict]:
        """Surface patterns buried in the abyss."""
        patterns = []
        
        abyss_memories = self.depth_levels.get('abyss', [])
        
        for memory in abyss_memories:
            if 'basin' in memory and memory.get('phi', 0) > 0.6:
                memory_basin = np.array(memory['basin'])
                
                rho1 = self.basin_to_density_matrix(basin)
                rho2 = self.basin_to_density_matrix(memory_basin)
                quantum_distance = self.bures_distance(rho1, rho2)
                
                if quantum_distance < 0.5:
                    patterns.append({
                        'memory': memory,
                        'quantum_distance': quantum_distance,
                        'surfaced': True
                    })
        
        return patterns
    
    def _compute_depth_probability(
        self,
        phi: float,
        depth_reached: str,
        matches_found: int
    ) -> float:
        """Compute probability based on depth exploration."""
        base_prob = phi * 0.3
        
        depth_bonuses = {
            'surface': 0.1,
            'shallow': 0.2,
            'deep': 0.3,
            'abyss': 0.4
        }
        depth_bonus = depth_bonuses.get(depth_reached, 0.1)
        
        match_bonus = min(0.3, matches_found * 0.03)
        
        probability = base_prob + depth_bonus + match_bonus
        return float(np.clip(probability, 0, 1))
    
    def submerge_memory(self, memory: Dict, depth: str = 'shallow') -> None:
        """Store memory at specified depth level."""
        target_basin = self.encode_to_basin(memory.get('input', ''))
        memory['basin'] = target_basin.tolist()
        memory['submerged_at'] = datetime.now().isoformat()
        
        if depth in self.depth_levels:
            self.depth_levels[depth].append(memory)
            
            if len(self.depth_levels[depth]) > 200:
                self.depth_levels[depth] = self.depth_levels[depth][-100:]
        
        self.deep_memory.append(memory)
        if len(self.deep_memory) > 1000:
            self.deep_memory = self.deep_memory[-500:]
    
    def promote_to_abyss(self, memory: Dict) -> None:
        """Promote a particularly valuable memory to the abyss."""
        memory['promoted_at'] = datetime.now().isoformat()
        self.depth_levels['abyss'].append(memory)
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'deep_memory_size': len(self.deep_memory),
            'depth_level_sizes': {
                k: len(v) for k, v in self.depth_levels.items()
            },
            'retrieved_treasures': len(self.retrieved_treasures),
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
