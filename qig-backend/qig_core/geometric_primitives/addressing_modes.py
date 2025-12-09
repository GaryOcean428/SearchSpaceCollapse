"""
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
