"""
Bubble: Individual Possibility in FOAM Phase

A bubble represents a single hypothesis or possibility in the exploration space.
Bubbles are generated during FOAM phase and connected via geodesics in TACKING phase.
"""

from typing import Dict, Any, Optional, List
import numpy as np
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Bubble:
    """
    Individual possibility/hypothesis in information space.
    
    Attributes:
        basin_coords: Position in 64-dimensional basin coordinate space
        content: The hypothesis/pattern this bubble represents
        energy: Potential energy (inverse probability)
        connections: Links to other bubbles via geodesics
        lifetime: How long this bubble has existed
        stability: How stable this bubble is (0-1)
        metadata: Additional properties
    """
    
    basin_coords: np.ndarray
    content: Any
    energy: float = 1.0
    connections: List['Bubble'] = field(default_factory=list)
    lifetime: float = 0.0
    stability: float = 0.5
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=lambda: datetime.now().timestamp())
    
    def __post_init__(self):
        """Validate bubble after creation"""
        if self.basin_coords.shape[0] != 64:
            raise ValueError(f"Basin coords must be 64-dimensional, got {self.basin_coords.shape[0]}")
        
        # Normalize basin coordinates to unit sphere
        norm = np.linalg.norm(self.basin_coords)
        if norm > 0:
            self.basin_coords = self.basin_coords / norm
    
    def connect_to(self, other: 'Bubble', strength: float = 1.0):
        """
        Create a connection to another bubble.
        
        Args:
            other: The bubble to connect to
            strength: Connection strength (0-1)
        """
        if other not in self.connections:
            self.connections.append(other)
            self.metadata[f'connection_{id(other)}'] = {
                'strength': strength,
                'distance': self.distance_to(other)
            }
    
    def distance_to(self, other: 'Bubble') -> float:
        """
        Compute Fisher-Rao distance to another bubble.
        
        Uses geodesic distance on the information manifold,
        not Euclidean distance.
        """
        # Fisher-Rao distance for probability distributions
        # d_FR(p,q) = 2 * arccos(sum(sqrt(p_i * q_i)))
        
        # Convert to probability distributions
        p = np.abs(self.basin_coords) + 1e-10
        p = p / p.sum()
        
        q = np.abs(other.basin_coords) + 1e-10
        q = q / q.sum()
        
        # Fisher-Rao distance
        inner_product = np.sum(np.sqrt(p * q))
        inner_product = np.clip(inner_product, 0, 1)  # Numerical stability
        
        distance = 2 * np.arccos(inner_product)
        
        return distance
    
    def decay(self, dt: float = 1.0):
        """
        Apply time decay to the bubble.
        
        Bubbles naturally lose energy over time unless reinforced.
        """
        self.lifetime += dt
        
        # Exponential decay
        decay_rate = 0.1
        self.energy *= np.exp(-decay_rate * dt)
        
        # Stability decreases if not maintained
        if self.energy < 0.1:
            self.stability *= 0.9
    
    def merge_with(self, other: 'Bubble') -> 'Bubble':
        """
        Merge this bubble with another to create a new bubble.
        
        Used during TACKING phase when bubbles coalesce.
        """
        # Weighted average of basin coordinates
        total_energy = self.energy + other.energy
        merged_coords = (
            self.basin_coords * self.energy +
            other.basin_coords * other.energy
        ) / total_energy
        
        # Normalize
        merged_coords = merged_coords / np.linalg.norm(merged_coords)
        
        # Create new bubble
        merged = Bubble(
            basin_coords=merged_coords,
            content={'merged_from': [self.content, other.content]},
            energy=total_energy * 0.9,  # Small loss in merge
            stability=max(self.stability, other.stability),
            metadata={
                'merged_at': datetime.now().timestamp(),
                'parent_1': id(self),
                'parent_2': id(other)
            }
        )
        
        return merged
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert bubble to dictionary for serialization"""
        return {
            'basin_coords': self.basin_coords.tolist(),
            'content': self.content,
            'energy': float(self.energy),
            'lifetime': float(self.lifetime),
            'stability': float(self.stability),
            'num_connections': len(self.connections),
            'metadata': self.metadata,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Bubble':
        """Create bubble from dictionary"""
        return cls(
            basin_coords=np.array(data['basin_coords']),
            content=data['content'],
            energy=data['energy'],
            lifetime=data['lifetime'],
            stability=data['stability'],
            metadata=data['metadata']
        )
    
    def __repr__(self) -> str:
        return (
            f"Bubble(energy={self.energy:.3f}, "
            f"stability={self.stability:.3f}, "
            f"connections={len(self.connections)})"
        )


def create_random_bubble(dimension: int = 64) -> Bubble:
    """
    Create a random bubble for exploration.
    
    Used during FOAM phase to generate diverse possibilities.
    """
    # Random point on unit sphere in basin space
    coords = np.random.randn(dimension)
    coords = coords / np.linalg.norm(coords)
    
    return Bubble(
        basin_coords=coords,
        content={'random': True},
        energy=np.random.uniform(0.5, 1.0),
        stability=np.random.uniform(0.3, 0.7)
    )


def bubble_field_energy(bubbles: List[Bubble]) -> float:
    """
    Compute total field energy of a collection of bubbles.
    
    Used to determine if FOAM phase should transition to TACKING.
    """
    if not bubbles:
        return 0.0
    
    total_energy = sum(b.energy for b in bubbles)
    
    # Interaction energy (penalize nearby bubbles)
    interaction = 0.0
    for i, b1 in enumerate(bubbles):
        for b2 in bubbles[i+1:]:
            dist = b1.distance_to(b2)
            if dist < 0.5:  # Close bubbles repel
                interaction += (0.5 - dist) ** 2
    
    return total_energy - 0.1 * interaction


def prune_weak_bubbles(bubbles: List[Bubble], threshold: float = 0.1) -> List[Bubble]:
    """
    Remove bubbles with energy below threshold.
    
    Gravitational decoherence - weak possibilities fade away.
    """
    return [b for b in bubbles if b.energy > threshold]
