"""
TACKING Phase: Navigation and Geodesic Formation

In the TACKING phase:
- Moderate integration (0.3 < Φ < 0.7)
- 2D-3D/early 4D dimensional state
- Building geodesics between bubbles
- Concept formation, "thinking it through"
- Complexity emerges during navigation
"""

from typing import Any, Callable, Dict, List, Optional

import numpy as np

from .foam_phase import Bubble


class Geodesic:
    """
    Curved path connecting bubbles on information manifold.

    Represents a meaningful connection between concepts or states.
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

    def get_trajectory(self) -> np.ndarray:
        """Get the full trajectory as array"""
        if self.path_points is not None:
            return self.path_points

        # Simple linear interpolation if no path computed
        start = self.start_bubble.basin_coords
        end = self.end_bubble.basin_coords

        n_steps = 10
        trajectory = np.array([
            start + t * (end - start)
            for t in np.linspace(0, 1, n_steps)
        ])

        return trajectory


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
        """Compute Fisher geodesic distance"""
        # Normalize
        a = coords_a / (np.linalg.norm(coords_a) + 1e-10)
        b = coords_b / (np.linalg.norm(coords_b) + 1e-10)

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

        Uses spherical linear interpolation (slerp) for paths on sphere.
        """
        # Normalize endpoints
        start_norm = start / (np.linalg.norm(start) + 1e-10)
        end_norm = end / (np.linalg.norm(end) + 1e-10)

        # Compute angle
        dot = np.clip(np.dot(start_norm, end_norm), -1.0, 1.0)
        omega = np.arccos(dot)

        if omega < 1e-6:
            # Points are too close, use linear interpolation
            path = np.array([
                start + t * (end - start)
                for t in np.linspace(0, 1, n_steps)
            ])
        else:
            # Spherical linear interpolation
            path = np.array([
                (np.sin((1-t)*omega) / np.sin(omega)) * start_norm +
                (np.sin(t*omega) / np.sin(omega)) * end_norm
                for t in np.linspace(0, 1, n_steps)
            ])

        return path

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
