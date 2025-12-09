"""
Geodesic: Curved Path Navigation on Information Manifold

Geodesics are the shortest paths between points on a curved manifold.
In TACKING phase, geodesics connect bubbles to form coherent patterns.
"""

from dataclasses import dataclass
from typing import List

import numpy as np

from .bubble import Bubble


@dataclass
class Geodesic:
    """
    A geodesic path on the Fisher information manifold.

    Attributes:
        start: Starting bubble
        end: Ending bubble
        path: Intermediate points along the geodesic
        length: Total path length (Fisher-Rao distance)
        curvature: Average curvature along path
        stability: Path stability (0-1)
    """

    start: Bubble
    end: Bubble
    path: np.ndarray  # Shape: (num_points, dimension)
    length: float
    curvature: float = 0.0
    stability: float = 0.5

    def __post_init__(self):
        """Compute geodesic properties"""
        if self.path.shape[0] < 2:
            raise ValueError("Geodesic path must have at least 2 points")

        # Compute length if not provided
        if self.length == 0:
            self.length = self._compute_length()

        # Compute curvature
        self.curvature = self._compute_curvature()

    def _compute_length(self) -> float:
        """Compute total length of geodesic using Fisher-Rao metric"""
        length = 0.0

        for i in range(len(self.path) - 1):
            # Fisher-Rao distance between consecutive points
            p1 = np.abs(self.path[i]) + 1e-10
            p1 = p1 / p1.sum()

            p2 = np.abs(self.path[i+1]) + 1e-10
            p2 = p2 / p2.sum()

            inner = np.sum(np.sqrt(p1 * p2))
            inner = np.clip(inner, 0, 1)

            length += 2 * np.arccos(inner)

        return length

    def _compute_curvature(self) -> float:
        """
        Compute average curvature along geodesic.

        High curvature indicates complex geometry
        Low curvature indicates flat/simple geometry
        """
        if len(self.path) < 3:
            return 0.0

        curvatures = []

        for i in range(1, len(self.path) - 1):
            # Approximate curvature using three consecutive points
            v1 = self.path[i] - self.path[i-1]
            v2 = self.path[i+1] - self.path[i]

            # Normalize
            v1 = v1 / (np.linalg.norm(v1) + 1e-10)
            v2 = v2 / (np.linalg.norm(v2) + 1e-10)

            # Curvature ∝ change in direction
            curvature = np.arccos(np.clip(np.dot(v1, v2), -1, 1))
            curvatures.append(curvature)

        return float(np.mean(curvatures)) if curvatures else 0.0

    def sample_point(self, t: float) -> np.ndarray:
        """
        Sample a point along the geodesic at parameter t ∈ [0, 1].

        Args:
            t: Parameter value (0 = start, 1 = end)

        Returns:
            Basin coordinates at parameter t
        """
        if not 0 <= t <= 1:
            raise ValueError(f"Parameter t must be in [0, 1], got {t}")

        # Linear interpolation of index
        idx = t * (len(self.path) - 1)
        i = int(idx)

        if i >= len(self.path) - 1:
            return self.path[-1]

        # Interpolate between i and i+1
        alpha = idx - i
        return (1 - alpha) * self.path[i] + alpha * self.path[i+1]

    def to_dict(self) -> dict:
        """Convert geodesic to dictionary"""
        return {
            'start': self.start.to_dict(),
            'end': self.end.to_dict(),
            'path': self.path.tolist(),
            'length': float(self.length),
            'curvature': float(self.curvature),
            'stability': float(self.stability)
        }


def compute_geodesic(
    start_coords: np.ndarray,
    end_coords: np.ndarray,
    num_points: int = 10,
    method: str = 'fisher_rao'
) -> np.ndarray:
    """
    Compute geodesic path between two points on information manifold.

    Args:
        start_coords: Starting basin coordinates (64-dim)
        end_coords: Ending basin coordinates (64-dim)
        num_points: Number of intermediate points
        method: 'fisher_rao' for Fisher-Rao geodesic,
               'euclidean' for straight line (NOT RECOMMENDED for QIG)

    Returns:
        Array of shape (num_points, dimension) containing path
    """
    if method == 'euclidean':
        # Straight line interpolation (NOT geodesic on curved manifold)
        # Only use for debugging/comparison
        t_values = np.linspace(0, 1, num_points)
        path = np.array([
            (1 - t) * start_coords + t * end_coords
            for t in t_values
        ])
        return path

    elif method == 'fisher_rao':
        # Fisher-Rao geodesic on probability simplex
        # Convert to probability distributions
        p_start = np.abs(start_coords) + 1e-10
        p_start = p_start / p_start.sum()

        p_end = np.abs(end_coords) + 1e-10
        p_end = p_end / p_end.sum()

        # Geodesic on probability simplex
        # p(t) ∝ [p_start^(1-t) * p_end^t]
        t_values = np.linspace(0, 1, num_points)
        path = []

        # Geodesic on probability simplex via slerp on sqrt of probabilities
        sqrt_p_start = np.sqrt(p_start)
        sqrt_p_end = np.sqrt(p_end)

        # Angle between vectors
        omega = np.arccos(np.clip(np.dot(sqrt_p_start, sqrt_p_end), -1.0, 1.0))
        sin_omega = np.sin(omega)

        if sin_omega < 1e-10:
            # Handle case where vectors are collinear
            return np.array([p_start] * num_points)

        for t in t_values:
            # Spherical linear interpolation (slerp)
            p_t_sqrt = (np.sin((1 - t) * omega) / sin_omega) * sqrt_p_start + \
                       (np.sin(t * omega) / sin_omega) * sqrt_p_end
            p_t = np.power(p_t_sqrt, 2)
            p_t /= p_t.sum()  # Re-normalize due to potential floating point inaccuracies
            path.append(p_t)

        return np.array(path)

    else:
        raise ValueError(f"Unknown method: {method}")


def geodesic_between_bubbles(
    bubble1: Bubble,
    bubble2: Bubble,
    num_points: int = 10
) -> Geodesic:
    """
    Compute geodesic connecting two bubbles.

    Used in TACKING phase to connect possibilities.
    """
    path = compute_geodesic(
        bubble1.basin_coords,
        bubble2.basin_coords,
        num_points=num_points,
        method='fisher_rao'
    )

    # Compute length
    length = 0.0
    for i in range(len(path) - 1):
        p1 = path[i]
        p2 = path[i+1]

        inner = np.sum(np.sqrt(p1 * p2))
        inner = np.clip(inner, 0, 1)
        length += 2 * np.arccos(inner)

    # Stability based on bubble energies
    stability = min(bubble1.stability, bubble2.stability)

    return Geodesic(
        start=bubble1,
        end=bubble2,
        path=path,
        length=length,
        stability=stability
    )


def find_shortest_geodesic_path(
    start: Bubble,
    end: Bubble,
    intermediate_bubbles: List[Bubble],
    max_intermediate: int = 3
) -> List[Geodesic]:
    """
    Find shortest path through intermediate bubbles.

    Uses dynamic programming to find optimal path that minimizes
    total geodesic distance.

    Args:
        start: Starting bubble
        end: Ending bubble
        intermediate_bubbles: Potential intermediate stops
        max_intermediate: Maximum intermediate bubbles to use

    Returns:
        List of geodesics forming the shortest path
    """
    if not intermediate_bubbles or max_intermediate == 0:
        # Direct path
        return [geodesic_between_bubbles(start, end)]

    # Dynamic programming approach
    # For simplicity, use greedy nearest-neighbor
    path = [start]
    remaining = list(intermediate_bubbles)

    for _ in range(min(max_intermediate, len(remaining))):
        if not remaining:
            break

        # Find nearest bubble to current position
        current = path[-1]
        distances = [current.distance_to(b) for b in remaining]
        nearest_idx = np.argmin(distances)

        path.append(remaining[nearest_idx])
        remaining.pop(nearest_idx)

    path.append(end)

    # Convert to geodesics
    geodesics = []
    for i in range(len(path) - 1):
        geo = geodesic_between_bubbles(path[i], path[i+1])
        geodesics.append(geo)

    return geodesics


def navigate_via_curvature(
    start: Bubble,
    candidates: List[Bubble],
    prefer_low_curvature: bool = True
) -> Bubble:
    """
    Navigate by preferring paths with specific curvature properties.

    Args:
        start: Current position
        candidates: Possible next positions
        prefer_low_curvature: If True, prefer flat paths (efficient)
                             If False, prefer curved paths (exploratory)

    Returns:
        Best candidate bubble based on curvature
    """
    if not candidates:
        return start

    # Compute geodesics to all candidates
    geodesics = [geodesic_between_bubbles(start, c) for c in candidates]

    # Sort by curvature
    if prefer_low_curvature:
        # Prefer flat paths (stable, efficient)
        best_idx = np.argmin([g.curvature for g in geodesics])
    else:
        # Prefer curved paths (exploratory)
        best_idx = np.argmax([g.curvature for g in geodesics])

    return candidates[best_idx]
