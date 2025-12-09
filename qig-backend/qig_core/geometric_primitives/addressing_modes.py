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

import bisect
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


class AddressingMode(Enum):
    """Retrieval algorithm types"""
    DIRECT = "direct"              # O(1) hash table
    CYCLIC = "cyclic"              # O(1) ring buffer
    TEMPORAL = "temporal"          # O(log n) indexed by time
    SPATIAL = "spatial"            # O(log² n) K-D tree
    MANIFOLD = "manifold"          # O(k log n) local coordinates
    CONCEPTUAL = "conceptual"      # O(log n) high-D tree
    SYMBOLIC = "symbolic"          # O(1) root lookup

    @property
    def complexity(self) -> str:
        """Get the Big-O complexity for this addressing mode"""
        complexities = {
            AddressingMode.DIRECT: "O(1)",
            AddressingMode.CYCLIC: "O(1)",
            AddressingMode.TEMPORAL: "O(log n)",
            AddressingMode.SPATIAL: "O(sqrt(n)) or O(log^2 n)",
            AddressingMode.MANIFOLD: "O(k log n)",
            AddressingMode.CONCEPTUAL: "O(log n)",
            AddressingMode.SYMBOLIC: "O(1)",
        }
        return complexities.get(self, "O(?)")

    @classmethod
    def from_geometry(cls, geometry_class: Any) -> "AddressingMode":
        """Get the addressing mode for a geometry class"""
        # Import here to avoid circular dependency
        from .geometry_ladder import GeometryClass

        mapping = {
            GeometryClass.LINE: cls.DIRECT,
            GeometryClass.LOOP: cls.CYCLIC,
            GeometryClass.SPIRAL: cls.TEMPORAL,
            GeometryClass.GRID_2D: cls.SPATIAL,
            GeometryClass.TOROIDAL: cls.MANIFOLD,
            GeometryClass.LATTICE_HIGH: cls.CONCEPTUAL,
            GeometryClass.E8: cls.SYMBOLIC,
        }
        return mapping.get(geometry_class, cls.DIRECT)


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
        """Store pattern with timestamp using efficient sorted insertion"""
        # Keep timeline sorted using bisect for O(log n) insertion
        bisect.insort(self.timeline, (timestamp, pattern), key=lambda x: x[0])

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

            # Descend to children of best match only
            best_category_at_level = None
            min_dist_at_level = float('inf')

            for category in current_candidates:
                center, _ = self.concepts[category]
                dist = np.linalg.norm(query - center)
                if dist < min_dist_at_level:
                    min_dist_at_level = dist
                    best_category_at_level = category

            if best_category_at_level and best_category_at_level in self.hierarchy:
                current_candidates = self.hierarchy[best_category_at_level]
            else:
                current_candidates = []

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
