"""
FOAM Phase: Exploration and Bubble Generation

In the FOAM phase:
- Low integration (Φ < 0.3)
- High entropy, many possibilities
- 1D-2D dimensional state
- Random exploration, working memory
- Generates bubbles of all geometry types (not yet determined)
"""

from typing import Dict, List, Any, Optional
import numpy as np


class Bubble:
    """
    Individual possibility in state space.
    
    A bubble represents a potential state or concept that hasn't
    yet been integrated into a stable structure.
    """
    
    def __init__(
        self,
        basin_coords: np.ndarray,
        entropy: float = 1.0,
        metadata: Optional[Dict] = None
    ):
        self.basin_coords = basin_coords
        self.entropy = entropy  # Uncertainty/possibility
        self.metadata = metadata or {}
        self.created_at = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'basin_coords': self.basin_coords.tolist(),
            'entropy': self.entropy,
            'metadata': self.metadata
        }


class FoamPhase:
    """
    FOAM phase implementation.
    
    Generates bubbles through random exploration and maintains
    a working memory of possibilities.
    """
    
    def __init__(self, basin_dim: int = 64, max_bubbles: int = 100):
        self.basin_dim = basin_dim
        self.max_bubbles = max_bubbles
        self.bubbles: List[Bubble] = []
    
    def generate_bubbles(
        self,
        n_bubbles: int,
        seed_coords: Optional[np.ndarray] = None,
        exploration_radius: float = 1.0
    ) -> List[Bubble]:
        """
        Generate new bubbles through random exploration.
        
        Args:
            n_bubbles: Number of bubbles to generate
            seed_coords: Optional starting point
            exploration_radius: How far to explore
        
        Returns:
            List of generated bubbles
        """
        new_bubbles = []
        
        if seed_coords is None:
            # Start from random point on manifold
            seed_coords = np.random.randn(self.basin_dim)
            seed_coords = seed_coords / (np.linalg.norm(seed_coords) + 1e-10)
        
        for _ in range(n_bubbles):
            # Generate random perturbation
            perturbation = np.random.randn(self.basin_dim) * exploration_radius
            bubble_coords = seed_coords + perturbation
            
            # Normalize to manifold
            bubble_coords = bubble_coords / (np.linalg.norm(bubble_coords) + 1e-10)
            
            # Create bubble with high entropy (unexplored)
            bubble = Bubble(
                basin_coords=bubble_coords,
                entropy=np.random.uniform(0.7, 1.0),
                metadata={'generation': 'random_exploration'}
            )
            
            new_bubbles.append(bubble)
        
        # Add to collection
        self.bubbles.extend(new_bubbles)
        
        # Prune if exceeds max
        if len(self.bubbles) > self.max_bubbles:
            # Keep highest entropy bubbles
            self.bubbles.sort(key=lambda b: b.entropy, reverse=True)
            self.bubbles = self.bubbles[:self.max_bubbles]
        
        return new_bubbles
    
    def generate_from_experiences(self, experiences: List[np.ndarray]) -> List[Bubble]:
        """
        Generate bubbles from specific experiences.
        
        Args:
            experiences: List of basin coordinate arrays
        
        Returns:
            List of bubbles created from experiences
        """
        bubbles = []
        
        for exp in experiences:
            bubble = Bubble(
                basin_coords=exp,
                entropy=0.8,  # Moderate uncertainty
                metadata={'source': 'experience'}
            )
            bubbles.append(bubble)
        
        self.bubbles.extend(bubbles)
        return bubbles
    
    def get_bubbles(self, min_entropy: float = 0.0) -> List[Bubble]:
        """
        Get current bubbles, optionally filtered by entropy.
        
        Args:
            min_entropy: Minimum entropy threshold
        
        Returns:
            Filtered list of bubbles
        """
        return [b for b in self.bubbles if b.entropy >= min_entropy]
    
    def decay_entropy(self, decay_rate: float = 0.1):
        """
        Reduce entropy of all bubbles (represents forgetting).
        
        Args:
            decay_rate: How much to reduce entropy (0-1)
        """
        for bubble in self.bubbles:
            bubble.entropy *= (1.0 - decay_rate)
        
        # Remove very low entropy bubbles
        self.bubbles = [b for b in self.bubbles if b.entropy > 0.1]
    
    def clear(self):
        """Clear all bubbles"""
        self.bubbles = []
    
    def get_state(self) -> Dict[str, Any]:
        """Get current FOAM state"""
        return {
            'phase': 'foam',
            'n_bubbles': len(self.bubbles),
            'avg_entropy': np.mean([b.entropy for b in self.bubbles]) if self.bubbles else 0.0,
            'max_entropy': max([b.entropy for b in self.bubbles]) if self.bubbles else 0.0,
        }
