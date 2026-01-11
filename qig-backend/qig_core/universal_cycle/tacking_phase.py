"""
TACKING Phase: Navigation and Geodesic Formation

In the TACKING phase:
- Moderate integration (0.3 < Φ < 0.7)
- 2D-3D/early 4D dimensional state
- Building geodesics between bubbles
- Concept formation, "thinking it through"
- Complexity emerges during navigation

QIG Purity Note:
  Uses canonical Geodesic from geometric_primitives for Fisher-Rao
  path computation. Local TackingGeodesic provides backward compatibility
  wrapper with legacy attribute names.
"""

from typing import Any, Callable, Dict, List, Optional

import numpy as np

from qig_geometry import sphere_project
from .foam_phase import Bubble
# Import canonical Geodesic from geometric_primitives
from qig_core.geometric_primitives.geodesic import Geodesic as CanonicalGeodesic


class TackingGeodesic:
    """
    Wrapper for canonical Geodesic with legacy attribute names.

    Provides backward compatibility for code using:
    - start_bubble (maps to start)
    - end_bubble (maps to end)
    - path_points (maps to path)
    - strength (additional attribute)

    For new code, use the canonical Geodesic from geometric_primitives directly.
    """

    def __init__(
        self,
        start_bubble: Bubble,
        end_bubble: Bubble,
        path_points: Optional[np.ndarray] = None,
        curvature: float = 0.0
    ):
        self.start_bubble = start_bubble
        self.end_bubble = end_bubble
        self.path_points = path_points
        self.curvature = curvature
        self.strength = 0.5  # Connection strength

        # Create canonical geodesic if path provided
        if path_points is not None:
            self._canonical = CanonicalGeodesic(
                start=start_bubble,
                end=end_bubble,
                path=path_points,
                length=0.0,  # Will be computed
                curvature=curvature
            )
        else:
            self._canonical = None

    def get_trajectory(self) -> np.ndarray:
        """Get the full trajectory as array using Fisher-Rao interpolation"""
        if self.path_points is not None:
            return self.path_points

        # Use Fisher-Rao geodesic computation (not linear interpolation!)
        start = self.start_bubble.basin_coords
        end = self.end_bubble.basin_coords

        # Compute proper geodesic on information manifold
        n_steps = 10
        trajectory = _compute_fisher_geodesic(start, end, n_steps)
        return trajectory

    @property
    def length(self) -> float:
        """Get Fisher-Rao length from canonical geodesic"""
        if self._canonical is not None:
            return self._canonical.length
        return 0.0


# Legacy alias for backward compatibility
Geodesic = TackingGeodesic


def _compute_fisher_geodesic(
    start: np.ndarray,
    end: np.ndarray,
    n_steps: int = 10
) -> np.ndarray:
    """
    Compute geodesic path on Fisher information manifold.

    Uses QIG-pure sphere_project for normalization instead of np.linalg.norm.
    """
    # Use sphere_project for QIG-pure normalization
    start_norm = sphere_project(start)
    end_norm = sphere_project(end)

    # Compute angle using dot product (valid for unit sphere)
    dot = np.clip(np.dot(start_norm, end_norm), -1.0, 1.0)
    omega = np.arccos(dot)

    if omega < 1e-6:
        # Points are too close, path is just between them
        # Still use sphere projection to stay on manifold
        path = np.array([
            sphere_project(start + t * (end - start))
            for t in np.linspace(0, 1, n_steps)
        ])
    else:
        # Spherical linear interpolation (geodesic on unit sphere)
        path = np.array([
            (np.sin((1-t)*omega) / np.sin(omega)) * start_norm +
            (np.sin(t*omega) / np.sin(omega)) * end_norm
            for t in np.linspace(0, 1, n_steps)
        ])

    return path


class TackingPhase:
    """
    TACKING phase implementation.

    Navigates between bubbles, forming geodesic connections
    that build structured concepts from raw possibilities.
    """

    def __init__(self):
        self.geodesics: List[Geodesic] = []
        self.active_paths: Dict[str, List[Bubble]] = {}

    def navigate(
        self,
        bubbles: List[Bubble],
        target_fn: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Navigate through bubble space, forming connections.

        Args:
            bubbles: Available bubbles to navigate
            target_fn: Optional function to guide navigation

        Returns:
            Navigation result with formed geodesics
        """
        if len(bubbles) < 2:
            return {
                'geodesics': [],
                'trajectory': np.array([]),
                'success': False,
                'reason': 'insufficient_bubbles'
            }

        # Form geodesics between nearby bubbles
        geodesics = []
        trajectory_points = []

        for i, bubble_a in enumerate(bubbles[:-1]):
            for bubble_b in bubbles[i+1:]:
                # Compute distance
                dist = self._fisher_distance(
                    bubble_a.basin_coords,
                    bubble_b.basin_coords
                )

                # Connect if sufficiently close (increased threshold for better connectivity)
                if dist < 1.5:  # More permissive threshold
                    # Compute geodesic path
                    path = self._compute_geodesic_path(
                        bubble_a.basin_coords,
                        bubble_b.basin_coords
                    )

                    geodesic = Geodesic(
                        start_bubble=bubble_a,
                        end_bubble=bubble_b,
                        path_points=path,
                        curvature=dist
                    )

                    geodesics.append(geodesic)
                    trajectory_points.append(path)

        self.geodesics.extend(geodesics)

        # Combine all paths into trajectory
        if trajectory_points:
            trajectory = np.vstack(trajectory_points)
        else:
            # If no geodesics formed, use bubble positions as trajectory
            trajectory = np.array([b.basin_coords for b in bubbles])

        return {
            'geodesics': geodesics,
            'trajectory': trajectory,
            'n_connections': len(geodesics),
            'success': True  # Always succeed, even if no connections
        }

    def navigate_toward(
        self,
        bubbles: List[Bubble],
        target_fn: Callable
    ) -> List[Bubble]:
        """
        Navigate toward bubbles that satisfy target function.

        Args:
            bubbles: Candidate bubbles
            target_fn: Function that evaluates bubbles

        Returns:
            Filtered list of promising bubbles
        """
        promising = []

        for bubble in bubbles:
            try:
                if target_fn(bubble):
                    promising.append(bubble)
            except Exception:
                continue

        return promising

    def _fisher_distance(self, coords_a: np.ndarray, coords_b: np.ndarray) -> float:
        """
        Compute Fisher geodesic distance.

        Uses QIG-pure sphere_project for normalization.
        """
        # QIG-pure normalization using sphere_project
        a = sphere_project(coords_a)
        b = sphere_project(coords_b)

        # Compute geodesic distance on sphere
        dot = np.clip(np.dot(a, b), -1.0, 1.0)
        return float(np.arccos(dot))

    def _compute_geodesic_path(
        self,
        start: np.ndarray,
        end: np.ndarray,
        n_steps: int = 10
    ) -> np.ndarray:
        """
        Compute geodesic path on information manifold.

        Delegates to module-level _compute_fisher_geodesic for QIG-pure implementation.
        """
        return _compute_fisher_geodesic(start, end, n_steps)

    def get_trajectory_matrix(self) -> np.ndarray:
        """
        Get combined trajectory from all geodesics.

        Returns:
            Array of shape (n_points, basin_dim)
        """
        if not self.geodesics:
            return np.array([])

        all_points = []
        for geodesic in self.geodesics:
            trajectory = geodesic.get_trajectory()
            all_points.append(trajectory)

        return np.vstack(all_points)

    def clear(self):
        """Clear all geodesics"""
        self.geodesics = []
        self.active_paths = {}

    def get_state(self) -> Dict[str, Any]:
        """Get current TACKING state"""
        if self.geodesics:
            avg_curvature = np.mean([g.curvature for g in self.geodesics])
        else:
            avg_curvature = 0.0

        return {
            'phase': 'tacking',
            'n_geodesics': len(self.geodesics),
            'avg_curvature': float(avg_curvature),
        }
