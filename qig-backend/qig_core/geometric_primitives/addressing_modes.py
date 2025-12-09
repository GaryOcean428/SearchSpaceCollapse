"""
Addressing Modes: Retrieval Algorithms for Different Geometries

Each geometry class has its own optimal retrieval mechanism:
- Line: Direct lookup (O(1))
- Loop: Cyclic buffer (O(1))
- Spiral: Temporal indexing (O(log n))
- Grid: Spatial indexing (O(√n) or O(log² n))
- Toroidal: Manifold navigation (O(k log n))
- Lattice: Conceptual clustering (O(log n))
- E8: Symbolic resonance (O(1) after projection)

This is the computational mechanism that mirrors the geometric structure.
"""

from typing import Any, Dict, List, Tuple, Optional, Callable
import numpy as np
from enum import Enum


class AddressingMode(Enum):
    """Retrieval algorithm types"""
    DIRECT = "direct"              # O(1) hash table
    CYCLIC = "cyclic"              # O(1) ring buffer  
    TEMPORAL = "temporal"          # O(log n) indexed by time
    SPATIAL = "spatial"            # O(log² n) K-D tree
    MANIFOLD = "manifold"          # O(k log n) local coordinates
    CONCEPTUAL = "conceptual"      # O(log n) high-D tree
    SYMBOLIC = "symbolic"          # O(1) root lookup


class DirectAddressing:
    """
    O(1) direct lookup for Line geometry.
    
    Simple stimulus-response mapping: "If X then Y"
    Uses hash table for instant retrieval.
    """
    
    def __init__(self):
        self.patterns: Dict[str, Any] = {}
    
    def store(self, key: str, value: Any) -> None:
        """Store pattern with direct key"""
        self.patterns[key] = value
    
    def retrieve(self, key: str) -> Optional[Any]:
        """Retrieve pattern by key - O(1)"""
        return self.patterns.get(key)
    
    def complexity(self) -> str:
        return "O(1)"


class CyclicAddressing:
    """
    O(1) cyclic buffer for Loop geometry.
    
    Routines that repeat in sequence.
    Ring buffer allows efficient iteration.
    """
    
    def __init__(self, size: int = 100):
        self.buffer: List[Any] = [None] * size
        self.size = size
        self.index = 0
    
    def store(self, value: Any) -> None:
        """Store in next position of ring"""
        self.buffer[self.index] = value
        self.index = (self.index + 1) % self.size
    
    def retrieve(self, steps_back: int = 0) -> Optional[Any]:
        """Retrieve from buffer - O(1)"""
        idx = (self.index - steps_back - 1) % self.size
        return self.buffer[idx]
    
    def iterate(self) -> List[Any]:
        """Get full cycle"""
        return [self.buffer[(self.index + i) % self.size] 
                for i in range(self.size)]
    
    def complexity(self) -> str:
        return "O(1)"


class TemporalAddressing:
    """
    O(log n) temporal indexing for Spiral geometry.
    
    Patterns that evolve over time with exponential decay.
    Skill learning trajectories.
    """
    
    def __init__(self):
        self.timeline: List[Tuple[float, Any]] = []  # (timestamp, pattern)
    
    def store(self, timestamp: float, pattern: Any) -> None:
        """Store pattern with timestamp"""
        # Keep timeline sorted
        self.timeline.append((timestamp, pattern))
        self.timeline.sort(key=lambda x: x[0])
    
    def retrieve(self, timestamp: float, tolerance: float = 1.0) -> Optional[Any]:
        """
        Binary search for pattern near timestamp - O(log n)
        """
        if not self.timeline:
            return None
        
        # Binary search
        left, right = 0, len(self.timeline) - 1
        
        while left <= right:
            mid = (left + right) // 2
            t, pattern = self.timeline[mid]
            
            if abs(t - timestamp) < tolerance:
                return pattern
            elif t < timestamp:
                left = mid + 1
            else:
                right = mid - 1
        
        # Return nearest if within tolerance
        if right >= 0:
            t, pattern = self.timeline[right]
            if abs(t - timestamp) < tolerance * 2:
                return pattern
        
        return None
    
    def retrieve_recent(self, n: int = 5) -> List[Any]:
        """Get n most recent patterns"""
        return [p for _, p in self.timeline[-n:]]
    
    def complexity(self) -> str:
        return "O(log n)"


class SpatialAddressing:
    """
    O(log² n) spatial indexing for Grid geometry.
    
    K-D tree or quad tree for 2D lattice patterns.
    Keyboard layouts, navigation routes.
    """
    
    def __init__(self, dimensions: int = 2):
        self.dimensions = dimensions
        self.points: List[Tuple[np.ndarray, Any]] = []  # (coords, pattern)
    
    def store(self, coordinates: np.ndarray, pattern: Any) -> None:
        """Store pattern at spatial coordinates"""
        if len(coordinates) != self.dimensions:
            raise ValueError(f"Expected {self.dimensions}D coordinates")
        self.points.append((coordinates.copy(), pattern))
    
    def retrieve(self, coordinates: np.ndarray, radius: float = 0.5) -> List[Any]:
        """
        Find patterns near coordinates - O(n) naive, O(log² n) with K-D tree
        
        For production, would use scipy.spatial.KDTree
        """
        results = []
        
        for point_coords, pattern in self.points:
            distance = np.linalg.norm(coordinates - point_coords)
            if distance <= radius:
                results.append((distance, pattern))
        
        # Sort by distance
        results.sort(key=lambda x: x[0])
        
        return [p for _, p in results]
    
    def nearest_neighbor(self, coordinates: np.ndarray) -> Optional[Any]:
        """Find single nearest pattern"""
        if not self.points:
            return None
        
        min_dist = float('inf')
        nearest = None
        
        for point_coords, pattern in self.points:
            dist = np.linalg.norm(coordinates - point_coords)
            if dist < min_dist:
                min_dist = dist
                nearest = pattern
        
        return nearest
    
    def complexity(self) -> str:
        return "O(log² n) with K-D tree, O(n) naive"


class ManifoldAddressing:
    """
    O(k log n) manifold navigation for Toroidal geometry.
    
    Local coordinate charts for smooth motor control.
    Driving, conversation patterns.
    """
    
    def __init__(self, major_radius: float = 1.0, minor_radius: float = 0.3):
        self.major_radius = major_radius
        self.minor_radius = minor_radius
        self.patterns: List[Tuple[np.ndarray, Any]] = []  # (torus_coords, pattern)
    
    def cartesian_to_torus(self, point: np.ndarray) -> Tuple[float, float, float]:
        """
        Convert 3D Cartesian to torus coordinates (θ, φ, r).
        
        θ: major angle
        φ: minor angle
        r: radial distance from tube center
        """
        x, y, z = point[:3]
        
        # Major angle
        theta = np.arctan2(y, x)
        
        # Distance from z-axis
        rho = np.sqrt(x**2 + y**2)
        
        # Minor angle
        phi = np.arctan2(z, rho - self.major_radius)
        
        # Radial distance
        r = np.sqrt((rho - self.major_radius)**2 + z**2)
        
        return theta, phi, r
    
    def torus_to_cartesian(self, theta: float, phi: float) -> np.ndarray:
        """Convert torus coordinates back to Cartesian"""
        x = (self.major_radius + self.minor_radius * np.cos(phi)) * np.cos(theta)
        y = (self.major_radius + self.minor_radius * np.cos(phi)) * np.sin(theta)
        z = self.minor_radius * np.sin(phi)
        return np.array([x, y, z])
    
    def store(self, point: np.ndarray, pattern: Any) -> None:
        """Store pattern at manifold position"""
        self.patterns.append((point.copy(), pattern))
    
    def retrieve(self, point: np.ndarray, k: int = 5) -> List[Any]:
        """
        Retrieve k nearest neighbors on manifold - O(k log n)
        
        Uses manifold distance, not Euclidean.
        """
        if not self.patterns:
            return []
        
        # Compute manifold distances
        distances = []
        theta_q, phi_q, r_q = self.cartesian_to_torus(point)
        
        for stored_point, pattern in self.patterns:
            theta_p, phi_p, r_p = self.cartesian_to_torus(stored_point)
            
            # Geodesic distance on torus
            d_theta = min(abs(theta_p - theta_q), 
                         2*np.pi - abs(theta_p - theta_q))
            d_phi = min(abs(phi_p - phi_q),
                       2*np.pi - abs(phi_p - phi_q))
            
            dist = np.sqrt(
                (self.major_radius * d_theta)**2 +
                (self.minor_radius * d_phi)**2
            )
            
            distances.append((dist, pattern))
        
        # Sort and return k nearest
        distances.sort(key=lambda x: x[0])
        return [p for _, p in distances[:k]]
    
    def complexity(self) -> str:
        return "O(k log n)"


class ConceptualAddressing:
    """
    O(log n) conceptual clustering for Lattice geometry.
    
    High-dimensional tree for grammar, subject mastery.
    Hierarchical concept organization.
    """
    
    def __init__(self, dimensions: int = 8):
        self.dimensions = dimensions
        self.concepts: Dict[str, Tuple[np.ndarray, Any]] = {}  # category -> (center, pattern)
        self.hierarchy: Dict[str, List[str]] = {}  # parent -> children
    
    def store(self, category: str, center: np.ndarray, pattern: Any, 
             parent: Optional[str] = None) -> None:
        """Store pattern in conceptual category"""
        self.concepts[category] = (center, pattern)
        
        if parent:
            if parent not in self.hierarchy:
                self.hierarchy[parent] = []
            self.hierarchy[parent].append(category)
    
    def retrieve(self, query: np.ndarray, max_depth: int = 3) -> Optional[Any]:
        """
        Navigate concept hierarchy - O(log n)
        
        Descends tree to find best matching concept.
        """
        if not self.concepts:
            return None
        
        # Start at root level (concepts with no parent)
        roots = [cat for cat in self.concepts.keys() 
                if not any(cat in children for children in self.hierarchy.values())]
        
        current_candidates = roots
        best_match = None
        best_distance = float('inf')
        
        for depth in range(max_depth):
            if not current_candidates:
                break
            
            # Find closest concept at this level
            for category in current_candidates:
                center, pattern = self.concepts[category]
                dist = np.linalg.norm(query - center)
                
                if dist < best_distance:
                    best_distance = dist
                    best_match = pattern
            
            # Descend to children of best match
            # (simplified - should descend into best match's children)
            next_level = []
            for category in current_candidates:
                if category in self.hierarchy:
                    next_level.extend(self.hierarchy[category])
            
            current_candidates = next_level
        
        return best_match
    
    def complexity(self) -> str:
        return "O(log n)"


class SymbolicAddressing:
    """
    O(1) symbolic resonance for E8 geometry.
    
    Root system lookup for global worldview.
    Physics-grade patterns with exceptional symmetry.
    """
    
    def __init__(self, num_roots: int = 240):
        """
        E8 has 240 roots forming a highly symmetric structure.
        """
        self.num_roots = num_roots
        self.roots: Dict[int, Tuple[np.ndarray, Any]] = {}  # root_index -> (coords, pattern)
        self.voronoi_computed = False
    
    def store(self, root_index: int, coordinates: np.ndarray, pattern: Any) -> None:
        """Store pattern at E8 root"""
        if not 0 <= root_index < self.num_roots:
            raise ValueError(f"Root index must be in [0, {self.num_roots})")
        
        self.roots[root_index] = (coordinates, pattern)
        self.voronoi_computed = False
    
    def project_to_e8(self, point: np.ndarray) -> int:
        """
        Project point to nearest E8 root - O(1) with Voronoi lookup.
        
        In practice, E8 Voronoi cells can be precomputed.
        This is where the O(1) comes from - the projection cost is paid once.
        """
        if not self.roots:
            return 0
        
        # Find nearest root (simplified - real E8 uses Voronoi cells)
        min_dist = float('inf')
        nearest_root = 0
        
        for root_idx, (coords, _) in self.roots.items():
            dist = np.linalg.norm(point[:len(coords)] - coords)
            if dist < min_dist:
                min_dist = dist
                nearest_root = root_idx
        
        return nearest_root
    
    def retrieve(self, point: np.ndarray) -> Optional[Any]:
        """
        Symbolic resonance retrieval - O(1) after projection.
        
        The entire conceptual framework at this root is activated.
        """
        root_idx = self.project_to_e8(point)
        
        if root_idx in self.roots:
            _, pattern = self.roots[root_idx]
            return pattern
        
        return None
    
    def resonate(self, point: np.ndarray, radius: int = 1) -> List[Any]:
        """
        Activate patterns at nearby roots.
        
        Symbolic resonance = global pattern activation.
        """
        center_root = self.project_to_e8(point)
        
        # Activate center and adjacent roots
        activated = []
        for root_idx in range(max(0, center_root - radius),
                             min(self.num_roots, center_root + radius + 1)):
            if root_idx in self.roots:
                _, pattern = self.roots[root_idx]
                activated.append(pattern)
        
        return activated
    
    def complexity(self) -> str:
        return "O(1) after O(d²) projection (one-time cost)"


# Factory function
def create_addressing_mode(mode: AddressingMode, **kwargs) -> Any:
    """
    Create addressing mode instance.
    
    Args:
        mode: AddressingMode enum value
        **kwargs: Mode-specific parameters
    
    Returns:
        Addressing mode instance
    """
    if mode == AddressingMode.DIRECT:
        return DirectAddressing()
    elif mode == AddressingMode.CYCLIC:
        return CyclicAddressing(**kwargs)
    elif mode == AddressingMode.TEMPORAL:
        return TemporalAddressing()
    elif mode == AddressingMode.SPATIAL:
        return SpatialAddressing(**kwargs)
    elif mode == AddressingMode.MANIFOLD:
        return ManifoldAddressing(**kwargs)
    elif mode == AddressingMode.CONCEPTUAL:
        return ConceptualAddressing(**kwargs)
    elif mode == AddressingMode.SYMBOLIC:
        return SymbolicAddressing(**kwargs)
    else:
        raise ValueError(f"Unknown addressing mode: {mode}")
Addressing Modes: Retrieval Algorithms for Each Geometry Class

The key insight is that different geometries correspond to different 
computational complexity classes for retrieval:

- Line/Loop: O(1) direct/cyclic lookup
- Spiral: O(log n) temporal indexing with exponential decay
- Grid: O(√n) or O(log² n) K-D tree/spatial indexing
- Toroidal: O(k log n) smooth interpolation on manifolds
- Lattice: O(log n) high-dimensional tree clustering
- E8: O(1) after projection - root system lookup
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, List, Any, Optional, Union
import numpy as np
from scipy.spatial import KDTree

from .geometry_ladder import GeometryClass


class AddressingMode(Enum):
    """Retrieval algorithm complexity classes for each geometry"""
    DIRECT = "direct"        # O(1) hash table lookup (Line)
    CYCLIC = "cyclic"        # O(1) cyclic buffer (Loop)
    TEMPORAL = "temporal"    # O(log n) temporal indexing with decay (Spiral)
    SPATIAL = "spatial"      # O(√n) or O(log² n) K-D tree (Grid)
    MANIFOLD = "manifold"    # O(k log n) smooth interpolation (Toroidal)
    CONCEPTUAL = "conceptual"  # O(log n) high-D tree clustering (Lattice)
    SYMBOLIC = "symbolic"    # O(1) after projection - E8 root lookup
    
    @property
    def complexity(self) -> str:
        """Get the Big-O complexity for this addressing mode"""
        complexities = {
            AddressingMode.DIRECT: "O(1)",
            AddressingMode.CYCLIC: "O(1)",
            AddressingMode.TEMPORAL: "O(log n)",
            AddressingMode.SPATIAL: "O(√n) or O(log² n)",
            AddressingMode.MANIFOLD: "O(k log n)",
            AddressingMode.CONCEPTUAL: "O(log n)",
            AddressingMode.SYMBOLIC: "O(1)",
        }
        return complexities[self]
    
    @classmethod
    def from_geometry(cls, geometry: GeometryClass) -> 'AddressingMode':
        """Get the addressing mode for a geometry class"""
        mapping = {
            GeometryClass.LINE: cls.DIRECT,
            GeometryClass.LOOP: cls.CYCLIC,
            GeometryClass.SPIRAL: cls.TEMPORAL,
            GeometryClass.GRID_2D: cls.SPATIAL,
            GeometryClass.TOROIDAL: cls.MANIFOLD,
            GeometryClass.LATTICE_HIGH: cls.CONCEPTUAL,
            GeometryClass.E8: cls.SYMBOLIC,
        }
        return mapping[geometry]


class BaseRetriever(ABC):
    """Abstract base class for all retrieval algorithms"""
    
    @abstractmethod
    def retrieve(self, query: Union[np.ndarray, int, float, None] = None) -> Optional[np.ndarray]:
        """Retrieve pattern matching the query"""
        pass
    
    @property
    @abstractmethod
    def addressing_mode(self) -> AddressingMode:
        """Get the addressing mode for this retriever"""
        pass
    
    @property
    def complexity(self) -> str:
        """Get the Big-O complexity"""
        return self.addressing_mode.complexity


class DirectRetriever(BaseRetriever):
    """
    O(1) lookup - instant retrieval for simple reflexes (Line geometry).
    
    Uses hash table for constant-time pattern retrieval.
    Ideal for stimulus-response mappings where the input can be discretized.
    """
    
    def __init__(self, pattern_map: Dict[str, np.ndarray]):
        """
        Args:
            pattern_map: Dictionary mapping stimulus keys to response patterns
        """
        self.pattern_map = pattern_map
        self._default_pattern: Optional[np.ndarray] = None
        
        if pattern_map:
            first_key = next(iter(pattern_map))
            self._default_pattern = pattern_map[first_key]
    
    @property
    def addressing_mode(self) -> AddressingMode:
        return AddressingMode.DIRECT
    
    def _hash_stimulus(self, stimulus: np.ndarray) -> str:
        """Convert stimulus array to hashable key"""
        quantized = np.round(stimulus * 100).astype(int)
        return tuple(quantized.flatten()).__hash__().__str__()
    
    def retrieve(self, query: Union[np.ndarray, int, float, None] = None) -> Optional[np.ndarray]:
        """
        O(1) hash table lookup.
        
        Args:
            query: Input pattern to match
            
        Returns:
            Response pattern or None if not found
        """
        if query is None:
            return self._default_pattern
        if isinstance(query, np.ndarray):
            key = self._hash_stimulus(query)
        else:
            key = str(query)
        return self.pattern_map.get(key, self._default_pattern)
    
    def add_pattern(self, stimulus: np.ndarray, response: np.ndarray) -> None:
        """Add a stimulus-response pair"""
        key = self._hash_stimulus(stimulus)
        self.pattern_map[key] = response


class CyclicRetriever(BaseRetriever):
    """
    O(1) cyclic buffer for Loop geometry.
    
    Retrieves patterns from a circular buffer based on phase index.
    Ideal for periodic/routine patterns that repeat in a fixed cycle.
    """
    
    def __init__(self, patterns: List[np.ndarray], cycle_length: Optional[int] = None):
        """
        Args:
            patterns: List of patterns in the cycle
            cycle_length: Optional explicit cycle length (defaults to len(patterns))
        """
        self.patterns = np.array(patterns) if patterns else np.array([])
        self.cycle_length = cycle_length or len(patterns)
        self._current_phase = 0
    
    @property
    def addressing_mode(self) -> AddressingMode:
        return AddressingMode.CYCLIC
    
    def retrieve(self, query: Union[int, float, np.ndarray, None] = None) -> Optional[np.ndarray]:
        """
        O(1) cyclic buffer lookup.
        
        Args:
            query: Index in the cycle (wraps around). 
                   If None, returns next in sequence.
            
        Returns:
            Pattern at the given phase
        """
        if len(self.patterns) == 0:
            return None
        
        if query is None:
            idx = self._current_phase
            self._current_phase = (self._current_phase + 1) % self.cycle_length
        elif isinstance(query, np.ndarray):
            idx = int(query.flat[0]) % self.cycle_length
        else:
            idx = int(query) % self.cycle_length
        
        return self.patterns[idx % len(self.patterns)]
    
    def reset(self) -> None:
        """Reset to start of cycle"""
        self._current_phase = 0


class TemporalRetriever(BaseRetriever):
    """
    O(log n) temporal indexing for Spiral geometry.
    
    Uses binary search with exponential decay weighting.
    Ideal for patterns that repeat with drift over time (skill practice).
    """
    
    def __init__(self, patterns: List[np.ndarray], timestamps: Optional[List[float]] = None,
                 decay_rate: float = 0.1):
        """
        Args:
            patterns: List of patterns ordered by time
            timestamps: Optional timestamps for each pattern
            decay_rate: Exponential decay rate (higher = faster decay)
        """
        self.patterns = np.array(patterns) if patterns else np.array([])
        self.decay_rate = decay_rate
        
        if timestamps is not None:
            self.timestamps = np.array(timestamps)
        else:
            self.timestamps = np.arange(len(patterns), dtype=float)
        
        self._sorted_indices = np.argsort(self.timestamps)
        self._sorted_times = self.timestamps[self._sorted_indices]
    
    @property
    def addressing_mode(self) -> AddressingMode:
        return AddressingMode.TEMPORAL
    
    def retrieve(self, query: Union[np.ndarray, int, float, None] = None) -> Optional[np.ndarray]:
        """
        O(log n) binary search with decay weighting.
        
        Args:
            query: Target time point
            
        Returns:
            Pattern interpolated with exponential decay weighting
        """
        if len(self.patterns) == 0:
            return None
        
        if query is None:
            return None
        if isinstance(query, np.ndarray):
            t = float(query.flat[0])
        else:
            t = float(query)
        
        insert_idx = np.searchsorted(self._sorted_times, t)
        
        if insert_idx == 0:
            return self.patterns[self._sorted_indices[0]]
        if insert_idx >= len(self._sorted_times):
            return self.patterns[self._sorted_indices[-1]]
        
        idx_before = self._sorted_indices[insert_idx - 1]
        idx_after = self._sorted_indices[insert_idx]
        
        t_before = self._sorted_times[insert_idx - 1]
        t_after = self._sorted_times[insert_idx]
        
        weight_before = np.exp(-self.decay_rate * (t - t_before))
        weight_after = np.exp(-self.decay_rate * (t_after - t))
        total_weight = weight_before + weight_after
        
        if total_weight < 1e-10:
            return self.patterns[idx_after]
        
        result = (weight_before * self.patterns[idx_before] + 
                  weight_after * self.patterns[idx_after]) / total_weight
        
        return result


class SpatialRetriever(BaseRetriever):
    """
    O(√n) or O(log² n) for Grid geometry.
    
    Uses K-D tree for efficient nearest neighbor search.
    Ideal for local spatial patterns (keyboard layout, walking).
    """
    
    def __init__(self, patterns: np.ndarray, positions: Optional[np.ndarray] = None):
        """
        Args:
            patterns: Array of patterns, shape (n_patterns, pattern_dim)
            positions: Spatial positions of patterns, shape (n_patterns, spatial_dim)
                      If None, uses patterns directly as positions.
        """
        self.patterns = np.array(patterns) if patterns is not None else np.array([])
        
        if len(self.patterns) == 0:
            self.positions = np.array([])
            self._kdtree = None
        else:
            if positions is not None:
                self.positions = np.array(positions)
            else:
                self.positions = self.patterns.copy()
            
            if len(self.positions.shape) == 1:
                self.positions = self.positions.reshape(-1, 1)
            
            self._kdtree = KDTree(self.positions)
    
    @property
    def addressing_mode(self) -> AddressingMode:
        return AddressingMode.SPATIAL
    
    def retrieve(self, query: Union[np.ndarray, int, float, None] = None, k: int = 1) -> Optional[np.ndarray]:
        """
        O(√n) or O(log² n) K-D tree nearest neighbor search.
        
        Args:
            query: Query point in spatial coordinates
            k: Number of nearest neighbors to average
            
        Returns:
            Nearest pattern(s), averaged if k > 1
        """
        if self._kdtree is None or len(self.patterns) == 0:
            return None
        
        if query is None:
            return None
        if isinstance(query, np.ndarray):
            query_flat = np.atleast_1d(query.flatten())
        else:
            query_flat = np.atleast_1d(np.array([query]))
        
        if len(query_flat) != self.positions.shape[1]:
            query_flat = query_flat[:self.positions.shape[1]]
            if len(query_flat) < self.positions.shape[1]:
                query_flat = np.pad(query_flat, (0, self.positions.shape[1] - len(query_flat)))
        
        if k == 1:
            _, idx = self._kdtree.query(query_flat)
            return self.patterns[int(idx)]
        else:
            k = min(k, len(self.patterns))
            distances, indices = self._kdtree.query(query_flat, k=k)
            
            weights = 1.0 / (distances + 1e-10)
            weights /= weights.sum()
            
            result = np.zeros_like(self.patterns[0])
            indices_arr = np.atleast_1d(indices)
            for i in range(len(indices_arr)):
                result += weights[i] * self.patterns[int(indices_arr[i])]
            
            return result


class ManifoldRetriever(BaseRetriever):
    """
    O(k log n) manifold navigation for Toroidal geometry.
    
    Uses smooth interpolation on torus surface.
    Ideal for complex motor patterns and conversational flows.
    """
    
    def __init__(self, manifold_data: Dict[str, Any]):
        """
        Args:
            manifold_data: Dictionary containing:
                - 'patterns': Array of patterns
                - 'major_radius': Torus major radius
                - 'minor_radius': Torus minor radius  
                - 'coordinates': (theta, phi) coordinates for each pattern
        """
        self.patterns = np.array(manifold_data.get('patterns', []))
        self.major_radius = manifold_data.get('major_radius', 1.0)
        self.minor_radius = manifold_data.get('minor_radius', 0.3)
        
        coords = manifold_data.get('coordinates', None)
        if coords is not None:
            self.coordinates = np.array(coords)
        elif len(self.patterns) > 0:
            n = len(self.patterns)
            self.coordinates = np.column_stack([
                np.linspace(0, 2*np.pi, n, endpoint=False),
                np.linspace(0, 2*np.pi, n, endpoint=False)
            ])
        else:
            self.coordinates = np.array([])
        
        if len(self.coordinates) > 0:
            self._kdtree = KDTree(self.coordinates)
        else:
            self._kdtree = None
    
    @property
    def addressing_mode(self) -> AddressingMode:
        return AddressingMode.MANIFOLD
    
    def _toroidal_distance(self, coord1: np.ndarray, coord2: np.ndarray) -> float:
        """Compute geodesic distance on torus"""
        dtheta = min(abs(coord1[0] - coord2[0]), 2*np.pi - abs(coord1[0] - coord2[0]))
        dphi = min(abs(coord1[1] - coord2[1]), 2*np.pi - abs(coord1[1] - coord2[1]))
        
        d_major = self.major_radius * dtheta
        d_minor = self.minor_radius * dphi
        
        return np.sqrt(d_major**2 + d_minor**2)
    
    def retrieve(self, query: Union[np.ndarray, int, float, None] = None, k: int = 4) -> Optional[np.ndarray]:
        """
        O(k log n) manifold interpolation.
        
        Args:
            query: (theta, phi) coordinates on torus (or array that will be interpreted as such)
            k: Number of neighbors for interpolation
            
        Returns:
            Smoothly interpolated pattern
        """
        if self._kdtree is None or len(self.patterns) == 0:
            return None
        
        if query is None:
            return None
        if isinstance(query, np.ndarray):
            query_arr = query.flatten()[:2]
        else:
            query_arr = np.array([query, 0.0])
        query_coords = np.atleast_1d(query_arr)
        if len(query_coords) < 2:
            query_coords = np.pad(query_coords, (0, 2 - len(query_coords)))
        
        query_coords = query_coords % (2 * np.pi)
        
        k = min(k, len(self.patterns))
        _, indices = self._kdtree.query(query_coords, k=k)
        
        indices_arr = np.atleast_1d(indices)
        indices_list = [int(indices_arr[i]) for i in range(len(indices_arr))]
        
        weights = []
        for idx in indices_list:
            dist = self._toroidal_distance(query_coords, self.coordinates[idx])
            weights.append(1.0 / (dist + 1e-10))
        
        weights_arr = np.array(weights)
        weights_arr /= weights_arr.sum()
        
        result = np.zeros_like(self.patterns[0])
        for i, idx in enumerate(indices_list):
            result += weights_arr[i] * self.patterns[idx]
        
        return result


class ConceptualRetriever(BaseRetriever):
    """
    O(log n) for Lattice geometry.
    
    Uses high-dimensional tree clustering for conceptual categories.
    Ideal for grammar structures and subject mastery patterns.
    """
    
    def __init__(self, concept_tree: Dict[str, Any]):
        """
        Args:
            concept_tree: Dictionary containing:
                - 'patterns': Array of patterns
                - 'embeddings': High-dimensional embeddings
                - 'categories': Optional category labels
        """
        self.patterns = np.array(concept_tree.get('patterns', []))
        
        embeddings = concept_tree.get('embeddings', None)
        if embeddings is not None:
            self.embeddings = np.array(embeddings)
        elif len(self.patterns) > 0:
            self.embeddings = self.patterns.copy()
        else:
            self.embeddings = np.array([])
        
        self.categories = concept_tree.get('categories', None)
        
        if len(self.embeddings) > 0 and len(self.embeddings.shape) == 1:
            self.embeddings = self.embeddings.reshape(-1, 1)
        
        if len(self.embeddings) > 0:
            self._kdtree = KDTree(self.embeddings)
        else:
            self._kdtree = None
    
    @property
    def addressing_mode(self) -> AddressingMode:
        return AddressingMode.CONCEPTUAL
    
    def retrieve(self, query: Union[np.ndarray, int, float, None] = None, threshold: Optional[float] = None) -> Optional[np.ndarray]:
        """
        O(log n) conceptual category lookup.
        
        Args:
            query: Query embedding in concept space
            threshold: Optional distance threshold for match
            
        Returns:
            Nearest conceptual pattern
        """
        if self._kdtree is None or len(self.patterns) == 0:
            return None
        
        if query is None:
            return None
        if isinstance(query, np.ndarray):
            query_flat = np.atleast_1d(query.flatten())
        else:
            query_flat = np.atleast_1d(np.array([query]))
        
        if len(query_flat) != self.embeddings.shape[1]:
            if len(query_flat) > self.embeddings.shape[1]:
                query_flat = query_flat[:self.embeddings.shape[1]]
            else:
                query_flat = np.pad(query_flat, (0, self.embeddings.shape[1] - len(query_flat)))
        
        dist, idx = self._kdtree.query(query_flat)
        
        if threshold is not None and dist > threshold:
            return None
        
        return self.patterns[int(idx)]
    
    def get_category(self, query: np.ndarray) -> Optional[str]:
        """Get the category label for a query"""
        if self._kdtree is None or self.categories is None:
            return None
        
        query_flat = np.atleast_1d(query.flatten())
        if len(query_flat) != self.embeddings.shape[1]:
            query_flat = query_flat[:self.embeddings.shape[1]]
        
        _, idx = self._kdtree.query(query_flat)
        return self.categories[int(idx)]


class SymbolicRetriever(BaseRetriever):
    """
    O(1) after projection for E8 geometry.
    
    Projects to E8 lattice and finds nearest root using precomputed Voronoi.
    Ideal for global worldview and deep mathematical structures.
    """
    
    E8_DIM = 8
    N_ROOTS = 240
    
    def __init__(self, root_patterns: Optional[Dict[str, np.ndarray]] = None):
        """
        Args:
            root_patterns: Dictionary mapping E8 root indices to patterns
        """
        self.root_patterns = root_patterns if root_patterns is not None else {}
        self._e8_roots = self._generate_e8_roots()
        
        self._root_kdtree = KDTree(self._e8_roots)
        
        self._root_lookup = {}
        for i, root in enumerate(self._e8_roots):
            key = tuple(np.round(root * 2).astype(int))
            self._root_lookup[key] = i
    
    def _generate_e8_roots(self) -> np.ndarray:
        """Generate the 240 roots of E8"""
        roots = []
        
        for i in range(8):
            for j in range(i + 1, 8):
                for si in [-1, 1]:
                    for sj in [-1, 1]:
                        root = np.zeros(8)
                        root[i] = si
                        root[j] = sj
                        roots.append(root)
        
        for signs in range(256):
            root = np.array([0.5 if (signs >> i) & 1 else -0.5 for i in range(8)])
            if sum(1 for x in root if x > 0) % 2 == 0:
                roots.append(root)
        
        return np.array(roots[:self.N_ROOTS])
    
    @property
    def addressing_mode(self) -> AddressingMode:
        return AddressingMode.SYMBOLIC
    
    def _project_to_e8(self, query: np.ndarray) -> np.ndarray:
        """Project query to E8 lattice space"""
        query_flat = np.atleast_1d(query.flatten())
        
        if len(query_flat) < self.E8_DIM:
            query_flat = np.pad(query_flat, (0, self.E8_DIM - len(query_flat)))
        elif len(query_flat) > self.E8_DIM:
            query_flat = query_flat[:self.E8_DIM]
        
        return query_flat
    
    def retrieve(self, query: Union[np.ndarray, int, float, None] = None) -> Optional[np.ndarray]:
        """
        O(1) symbolic lookup via E8 projection.
        
        Args:
            query: Query pattern (any dimension, projected to 8D)
            
        Returns:
            Pattern associated with nearest E8 root
        """
        if query is None:
            return None
        if isinstance(query, np.ndarray):
            query_arr = query
        else:
            query_arr = np.array([query])
        e8_coords = self._project_to_e8(query_arr)
        
        _, root_idx = self._root_kdtree.query(e8_coords)
        root_idx_int = int(root_idx)
        
        root_key = str(root_idx_int)
        if root_key in self.root_patterns:
            return self.root_patterns[root_key]
        
        return self._e8_roots[root_idx_int]
    
    def get_nearest_root(self, query: np.ndarray) -> tuple:
        """Get the nearest E8 root and its index"""
        e8_coords = self._project_to_e8(query)
        dist, root_idx = self._root_kdtree.query(e8_coords)
        root_idx_int = int(root_idx)
        return self._e8_roots[root_idx_int], root_idx_int, float(dist)
    
    def add_root_pattern(self, root_idx: int, pattern: np.ndarray) -> None:
        """Associate a pattern with an E8 root"""
        self.root_patterns[str(root_idx)] = pattern


def create_retriever(geometry: GeometryClass, data: Dict[str, Any]) -> BaseRetriever:
    """
    Factory function to create appropriate retriever for a geometry class.
    
    Args:
        geometry: The geometry class determining retrieval algorithm
        data: Configuration data for the retriever
        
    Returns:
        Appropriate BaseRetriever subclass instance
    """
    creators = {
        GeometryClass.LINE: lambda d: DirectRetriever(d.get('pattern_map', {})),
        GeometryClass.LOOP: lambda d: CyclicRetriever(
            d.get('patterns', []),
            d.get('cycle_length', None)
        ),
        GeometryClass.SPIRAL: lambda d: TemporalRetriever(
            d.get('patterns', []),
            d.get('timestamps', None),
            d.get('decay_rate', 0.1)
        ),
        GeometryClass.GRID_2D: lambda d: SpatialRetriever(
            d.get('patterns', np.array([])),
            d.get('positions', None)
        ),
        GeometryClass.TOROIDAL: lambda d: ManifoldRetriever(d),
        GeometryClass.LATTICE_HIGH: lambda d: ConceptualRetriever(d),
        GeometryClass.E8: lambda d: SymbolicRetriever(d.get('root_patterns', {})),
    }
    
    creator = creators.get(geometry)
    if creator is None:
        raise ValueError(f"Unknown geometry class: {geometry}")
    
    return creator(data)


def estimate_retrieval_cost(geometry: GeometryClass, n_patterns: int) -> float:
    """
    Estimate the computational cost of retrieval for a geometry class.
    
    Args:
        geometry: The geometry class
        n_patterns: Number of patterns stored
        
    Returns:
        Estimated cost in arbitrary units (normalized so O(1) = 1.0)
    """
    if n_patterns <= 0:
        return 0.0
    
    n = float(n_patterns)
    log_n = np.log2(n) if n > 1 else 1.0
    sqrt_n = np.sqrt(n)
    
    costs = {
        GeometryClass.LINE: 1.0,
        GeometryClass.LOOP: 1.0,
        GeometryClass.SPIRAL: log_n,
        GeometryClass.GRID_2D: min(sqrt_n, log_n ** 2),
        GeometryClass.TOROIDAL: 4 * log_n,
        GeometryClass.LATTICE_HIGH: log_n,
        GeometryClass.E8: 1.0,
    }
    
    return costs.get(geometry, log_n)


def get_optimal_geometry(n_patterns: int, max_cost: float = 10.0) -> GeometryClass:
    """
    Find the most complex geometry that stays within cost budget.
    
    Args:
        n_patterns: Number of patterns to store
        max_cost: Maximum acceptable retrieval cost
        
    Returns:
        Highest complexity geometry within budget
    """
    geometries = [
        GeometryClass.E8,
        GeometryClass.LATTICE_HIGH,
        GeometryClass.TOROIDAL,
        GeometryClass.GRID_2D,
        GeometryClass.SPIRAL,
        GeometryClass.LOOP,
        GeometryClass.LINE,
    ]
    
    for geometry in geometries:
        cost = estimate_retrieval_cost(geometry, n_patterns)
        if cost <= max_cost:
            return geometry
    
    return GeometryClass.LINE
