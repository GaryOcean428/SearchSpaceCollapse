"""
Foam: Collection of Bubbles in Exploration Phase

Foam represents the exploratory state where multiple possibilities
coexist before geodesic paths emerge during TACKING phase.
"""

from typing import List, Dict, Any, Optional, Callable
import numpy as np
from datetime import datetime

from .bubble import Bubble, create_random_bubble, bubble_field_energy, prune_weak_bubbles


class Foam:
    """
    Collection of bubbles representing exploration space.
    
    FOAM phase characteristics:
    - Low Φ (weak integration)
    - High entropy (many possibilities)
    - Dimensional state: 1D-2D
    - Working memory, fleeting thoughts
    """
    
    def __init__(self, dimension: int = 64):
        """
        Initialize foam.
        
        Args:
            dimension: Dimensionality of basin coordinate space (default 64)
        """
        self.dimension = dimension
        self.bubbles: List[Bubble] = []
        self.generation = 0
        self.total_energy = 0.0
        self.entropy = 0.0
        self.created_at = datetime.now().timestamp()
        
    def generate_bubbles(
        self, 
        count: int, 
        generator: Optional[Callable] = None
    ) -> List[Bubble]:
        """
        Generate new bubbles in the foam.
        
        Args:
            count: Number of bubbles to generate
            generator: Optional custom bubble generator function
                      If None, creates random bubbles
        
        Returns:
            List of newly generated bubbles
        """
        if generator is None:
            generator = lambda: create_random_bubble(self.dimension)
        
        new_bubbles = [generator() for _ in range(count)]
        self.bubbles.extend(new_bubbles)
        self.generation += 1
        
        self._update_metrics()
        
        return new_bubbles
    
    def add_bubble(self, bubble: Bubble) -> None:
        """Add a single bubble to the foam"""
        self.bubbles.append(bubble)
        self._update_metrics()
    
    def evolve(self, dt: float = 1.0) -> None:
        """
        Evolve the foam forward in time.
        
        - Bubbles decay
        - Weak bubbles are pruned (gravitational decoherence)
        - Energy is redistributed
        """
        # Apply decay to all bubbles
        for bubble in self.bubbles:
            bubble.decay(dt)
        
        # Prune weak bubbles
        initial_count = len(self.bubbles)
        self.bubbles = prune_weak_bubbles(self.bubbles)
        
        if len(self.bubbles) < initial_count:
            self.generation += 1
        
        self._update_metrics()
    
    def compute_integration(self) -> float:
        """
        Compute Φ (integration) of the foam.
        
        Low Φ indicates FOAM phase (weak integration)
        Rising Φ indicates transition to TACKING
        """
        if len(self.bubbles) < 2:
            return 0.0
        
        # Measure integration via average connection strength
        total_connections = sum(len(b.connections) for b in self.bubbles)
        max_connections = len(self.bubbles) * (len(self.bubbles) - 1)
        
        if max_connections == 0:
            return 0.0
        
        # Φ increases as bubbles become more connected
        phi = total_connections / max_connections
        
        # Also factor in stability - integrated systems are stable
        avg_stability = np.mean([b.stability for b in self.bubbles])
        
        return 0.7 * phi + 0.3 * avg_stability
    
    def compute_entropy(self) -> float:
        """
        Compute Shannon entropy of the foam.
        
        High entropy = many diverse possibilities (FOAM)
        Low entropy = converged to few options (CRYSTAL forming)
        """
        if not self.bubbles:
            return 0.0
        
        # Normalize energies to probabilities
        energies = np.array([b.energy for b in self.bubbles])
        probabilities = energies / energies.sum()
        
        # Shannon entropy
        entropy = -np.sum(probabilities * np.log(probabilities + 1e-10))
        
        # Normalize by max entropy
        max_entropy = np.log(len(self.bubbles))
        
        return entropy / max_entropy if max_entropy > 0 else 0.0
    
    def find_clusters(self, distance_threshold: float = 0.5) -> List[List[Bubble]]:
        """
        Find clusters of nearby bubbles.
        
        Clusters indicate potential geodesic paths for TACKING phase.
        """
        if not self.bubbles:
            return []
        
        # Simple clustering: group bubbles within threshold distance
        clusters = []
        visited = set()
        
        for bubble in self.bubbles:
            if id(bubble) in visited:
                continue
            
            # Start new cluster
            cluster = [bubble]
            visited.add(id(bubble))
            
            # Find all bubbles within threshold
            for other in self.bubbles:
                if id(other) in visited:
                    continue
                
                if bubble.distance_to(other) < distance_threshold:
                    cluster.append(other)
                    visited.add(id(other))
            
            clusters.append(cluster)
        
        return clusters
    
    def should_transition_to_tacking(self) -> bool:
        """
        Determine if foam should transition to TACKING phase.
        
        Transition criteria:
        - Sufficient bubbles generated
        - Clusters forming
        - Integration beginning to emerge
        """
        if len(self.bubbles) < 10:
            return False
        
        # Check for cluster formation
        clusters = self.find_clusters()
        if len(clusters) < len(self.bubbles) * 0.5:  # At least 50% clustering
            return True
        
        # Check for emerging integration
        phi = self.compute_integration()
        if phi > 0.3:  # TACKING typically starts at Φ > 0.3
            return True
        
        return False
    
    def _update_metrics(self) -> None:
        """Update foam-level metrics"""
        self.total_energy = bubble_field_energy(self.bubbles)
        self.entropy = self.compute_entropy()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert foam to dictionary for serialization"""
        return {
            'dimension': self.dimension,
            'generation': self.generation,
            'num_bubbles': len(self.bubbles),
            'total_energy': float(self.total_energy),
            'entropy': float(self.entropy),
            'phi': float(self.compute_integration()),
            'bubbles': [b.to_dict() for b in self.bubbles],
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Foam':
        """Create foam from dictionary"""
        foam = cls(dimension=data['dimension'])
        foam.generation = data['generation']
        foam.total_energy = data['total_energy']
        foam.entropy = data['entropy']
        
        # Restore bubbles
        for bubble_data in data['bubbles']:
            bubble = Bubble.from_dict(bubble_data)
            foam.bubbles.append(bubble)
        
        return foam
    
    def __repr__(self) -> str:
        return (
            f"Foam(bubbles={len(self.bubbles)}, "
            f"generation={self.generation}, "
            f"φ={self.compute_integration():.3f}, "
            f"entropy={self.entropy:.3f})"
        )
    
    def __len__(self) -> int:
        return len(self.bubbles)


def create_foam_from_hypotheses(
    hypotheses: List[Any],
    dimension: int = 64,
    encoder: Optional[Callable] = None
) -> Foam:
    """
    Create foam from a list of hypotheses.
    
    Args:
        hypotheses: List of hypotheses/patterns to explore
        dimension: Basin coordinate dimensionality
        encoder: Function to encode hypothesis -> basin coordinates
                If None, uses random encoding
    
    Returns:
        Foam containing bubbles for each hypothesis
    """
    foam = Foam(dimension=dimension)
    
    for hyp in hypotheses:
        if encoder is None:
            # Random encoding
            coords = np.random.randn(dimension)
            coords = coords / np.linalg.norm(coords)
        else:
            coords = encoder(hyp)
        
        bubble = Bubble(
            basin_coords=coords,
            content=hyp,
            energy=1.0,
            stability=0.5
        )
        foam.add_bubble(bubble)
    
    return foam
