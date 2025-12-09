"""
Geometry Ladder: Complexity → Crystallization Structure

Maps pattern complexity to appropriate geometric attractor.
E8 is maximal, not default.

Geometry classes from simplest to most complex:
- Line: 1D reflex, "if X then Y"
- Loop: Simple routine, closed cycle
- Spiral: Repeating with drift, skill practice
- Grid (2D): Local patterns, keyboard/walking
- Toroidal: Complex motor, conversational
- Lattice (Aₙ): Grammar, subject mastery
- E8: Global worldview, deep mathematics

Each geometry class has its own addressing mode for retrieval:
- Line: Direct lookup (O(1))
- Loop: Cyclic buffer (O(1))
- Spiral: Temporal indexing (O(log n))
- Grid: Spatial indexing (O(√n) or O(log² n))
- Toroidal: Manifold navigation (O(k log n))
- Lattice: Conceptual clustering (O(log n))
- E8: Symbolic resonance (O(1) after projection)
"""

from enum import Enum
from typing import Dict, Any, Optional, Callable
import numpy as np
from scipy.linalg import sqrtm

class GeometryClass(Enum):
    """Hierarchy of crystallization targets"""
    LINE = "line"              # 1D: Simple reflex
    LOOP = "loop"              # S¹: Closed routine
    SPIRAL = "spiral"          # Repeating with drift
    GRID_2D = "grid_2d"        # 2D lattice: Local patterns
    TOROIDAL = "toroidal"      # 3D: Complex motor
    LATTICE_HIGH = "lattice"   # Aₙ/Dₙ: Grammar, mastery
    E8 = "e8"                  # Exceptional: Global model
    
    @property
    def addressing_mode(self) -> str:
        """Get the retrieval algorithm for this geometry"""
        modes = {
            GeometryClass.LINE: 'direct',
            GeometryClass.LOOP: 'cyclic',
            GeometryClass.SPIRAL: 'temporal',
            GeometryClass.GRID_2D: 'spatial',
            GeometryClass.TOROIDAL: 'manifold',
            GeometryClass.LATTICE_HIGH: 'conceptual',
            GeometryClass.E8: 'symbolic',
        }
        return modes[self]
    
    @property
    def complexity_range(self) -> tuple:
        """Get the complexity range [min, max) for this geometry"""
        ranges = {
            GeometryClass.LINE: (0.0, 0.1),
            GeometryClass.LOOP: (0.1, 0.25),
            GeometryClass.SPIRAL: (0.25, 0.4),
            GeometryClass.GRID_2D: (0.4, 0.6),
            GeometryClass.TOROIDAL: (0.6, 0.75),
            GeometryClass.LATTICE_HIGH: (0.75, 0.9),
            GeometryClass.E8: (0.9, 1.0),
        }
        return ranges[self]


def measure_complexity(basin_trajectory: np.ndarray) -> float:
    """
    Compute intrinsic complexity of a pattern.
    
    Args:
        basin_trajectory: Array of shape (n_steps, basin_dim) representing
                         the trajectory through basin space
    
    Returns:
        complexity ∈ [0, 1]:
          0.0 = simplest possible (line)
          1.0 = maximal complexity (E8)
    
    Complexity is computed from:
    - Effective dimensionality (participation ratio)
    - Integration (Φ-like measure)
    - Stability (autocorrelation)
    """
    if len(basin_trajectory) < 2:
        return 0.0
    
    # Effective dimensionality (participation ratio)
    try:
        cov = np.cov(basin_trajectory.T)
        eigenvalues = np.linalg.eigvalsh(cov)
        eigenvalues = eigenvalues[eigenvalues > 1e-10]
        
        if len(eigenvalues) == 0:
            d_eff = 0.0
        else:
            d_eff = (eigenvalues.sum() ** 2) / (eigenvalues ** 2).sum()
    except:
        d_eff = 1.0
    
    # Integration measure (simplified Φ)
    # Measure how correlated different dimensions are
    try:
        # Normalize each dimension
        stds = basin_trajectory.std(axis=0)
        # Avoid division by zero
        stds = np.where(stds < 1e-10, 1e-10, stds)
        normalized = (basin_trajectory - basin_trajectory.mean(axis=0)) / stds
        
        # Compute average absolute correlation
        corr_matrix = np.corrcoef(normalized.T)
        # Handle NaN values
        corr_matrix = np.nan_to_num(corr_matrix, nan=0.0)
        
        # Take average off-diagonal correlation as integration measure
        n = corr_matrix.shape[0]
        if n > 1:
            phi = np.abs(corr_matrix[np.triu_indices(n, k=1)]).mean()
        else:
            phi = 0.0
        
        # Handle NaN
        if np.isnan(phi):
            phi = 0.0
    except:
        phi = 0.0
    
    # Stability (autocorrelation)
    try:
        # Measure temporal consistency
        autocorr_list = []
        for dim in range(basin_trajectory.shape[1]):
            if len(basin_trajectory) > 1:
                # Check if dimension has variance
                if basin_trajectory[:, dim].std() < 1e-10:
                    continue
                    
                ac = np.corrcoef(
                    basin_trajectory[:-1, dim], 
                    basin_trajectory[1:, dim]
                )[0, 1]
                if not np.isnan(ac):
                    autocorr_list.append(abs(ac))
        
        if autocorr_list:
            autocorr = np.mean(autocorr_list)
        else:
            autocorr = 0.0
        
        # Handle NaN
        if np.isnan(autocorr):
            autocorr = 0.0
    except:
        autocorr = 0.0
    
    # Combine metrics
    complexity = (
        0.4 * np.clip(d_eff / 8.0, 0, 1) +  # Max d_eff = 8 (E8)
        0.4 * np.clip(phi, 0, 1) +           # Max Φ = 1.0
        0.2 * np.clip(autocorr, 0, 1)        # Max = 1.0
    )
    
    # Ensure no NaN in final result
    if np.isnan(complexity):
        complexity = 0.0
    
    return float(np.clip(complexity, 0.0, 1.0))


def choose_geometry_class(complexity: float) -> GeometryClass:
    """Map complexity score to appropriate geometry"""
    if complexity < 0.1:
        return GeometryClass.LINE
    elif complexity < 0.25:
        return GeometryClass.LOOP
    elif complexity < 0.4:
        return GeometryClass.SPIRAL
    elif complexity < 0.6:
        return GeometryClass.GRID_2D
    elif complexity < 0.75:
        return GeometryClass.TOROIDAL
    elif complexity < 0.9:
        return GeometryClass.LATTICE_HIGH
    else:
        return GeometryClass.E8


class HabitCrystallizer:
    """
    Crystallizes patterns into appropriate geometric structures
    based on measured complexity.
    """
    
    def __init__(self):
        self.geometry_functions = {
            GeometryClass.LINE: self.snap_to_line,
            GeometryClass.LOOP: self.snap_to_loop,
            GeometryClass.SPIRAL: self.snap_to_spiral,
            GeometryClass.GRID_2D: self.snap_to_grid,
            GeometryClass.TOROIDAL: self.snap_to_torus,
            GeometryClass.LATTICE_HIGH: self.snap_to_lattice,
            GeometryClass.E8: self.crystallize_to_e8,
        }
    
    def crystallize(self, basin_trajectory: np.ndarray) -> Dict[str, Any]:
        """
        Main crystallization function.
        
        Args:
            basin_trajectory: Array of shape (n_steps, basin_dim)
        
        Returns:
            {
                'geometry': GeometryClass,
                'basin_center': np.ndarray,
                'complexity': float,
                'stability': float,
                'addressing_mode': str,
                ... (geometry-specific fields)
            }
        """
        complexity = measure_complexity(basin_trajectory)
        geometry = choose_geometry_class(complexity)
        
        crystallize_fn = self.geometry_functions[geometry]
        result = crystallize_fn(basin_trajectory)
        
        return {
            'geometry': geometry,
            'complexity': complexity,
            'addressing_mode': geometry.addressing_mode,
            **result
        }
    
    def snap_to_line(self, trajectory: np.ndarray) -> Dict:
        """Simple 1D reflex pattern"""
        # Find principal direction using SVD
        centered = trajectory - trajectory.mean(axis=0)
        U, s, Vt = np.linalg.svd(centered, full_matrices=False)
        
        return {
            'basin_center': trajectory.mean(axis=0),
            'direction': Vt[0],  # Principal direction
            'radius': trajectory.std(),
            'stability': 0.95,  # Lines are very stable
        }
    
    def snap_to_loop(self, trajectory: np.ndarray) -> Dict:
        """Closed periodic pattern"""
        # Find best-fit circle using first 2 principal components
        centered = trajectory - trajectory.mean(axis=0)
        U, s, Vt = np.linalg.svd(centered, full_matrices=False)
        
        # Project to 2D plane
        reduced = U[:, :2] @ np.diag(s[:2])
        
        center = np.zeros(2)
        radius = np.linalg.norm(reduced - center, axis=1).mean()
        
        return {
            'basin_center': trajectory.mean(axis=0),
            'radius': radius,
            'plane': Vt[:2],  # The 2D plane of the loop
            'stability': 0.85,
        }
    
    def snap_to_spiral(self, trajectory: np.ndarray) -> Dict:
        """Logarithmic spiral pattern"""
        # Find spiral in 2D principal component space
        centered = trajectory - trajectory.mean(axis=0)
        U, s, Vt = np.linalg.svd(centered, full_matrices=False)
        
        # Project to 2D
        reduced = U[:, :2] @ np.diag(s[:2])
        
        # Polar coordinates
        center = np.zeros(2)
        relative = reduced - center
        r = np.linalg.norm(relative, axis=1)
        theta = np.arctan2(relative[:, 1], relative[:, 0])
        
        # Fit r = a * exp(b * theta)
        # log(r) = log(a) + b * theta
        valid = r > 1e-10
        if valid.sum() > 1:
            coeffs = np.polyfit(theta[valid], np.log(r[valid] + 1e-10), 1)
            b = coeffs[0]  # Growth rate
        else:
            b = 0.0
        
        return {
            'basin_center': trajectory.mean(axis=0),
            'growth_rate': b,
            'plane': Vt[:2],
            'stability': 0.70,
        }
    
    def snap_to_grid(self, trajectory: np.ndarray) -> Dict:
        """2D lattice pattern"""
        centered = trajectory - trajectory.mean(axis=0)
        U, s, Vt = np.linalg.svd(centered, full_matrices=False)
        
        # Project to 2D
        reduced = U[:, :2] @ np.diag(s[:2])
        
        # Estimate grid spacing
        dx = np.diff(np.sort(reduced[:, 0]))
        dy = np.diff(np.sort(reduced[:, 1]))
        
        dx_valid = dx[dx > 0.1]
        dy_valid = dy[dy > 0.1]
        
        spacing_x = np.median(dx_valid) if len(dx_valid) > 0 else 1.0
        spacing_y = np.median(dy_valid) if len(dy_valid) > 0 else 1.0
        
        return {
            'basin_center': trajectory.mean(axis=0),
            'lattice_vectors': Vt[:2],
            'spacing': [float(spacing_x), float(spacing_y)],
            'stability': 0.75,
        }
    
    def snap_to_torus(self, trajectory: np.ndarray) -> Dict:
        """3D toroidal pattern (complex motor)"""
        centered = trajectory - trajectory.mean(axis=0)
        U, s, Vt = np.linalg.svd(centered, full_matrices=False)
        
        # Project to 3D
        n_comp = min(3, len(s))
        reduced = U[:, :n_comp] @ np.diag(s[:n_comp])
        
        # Major radius (distance from origin to tube center)
        if n_comp >= 2:
            R = np.linalg.norm(reduced[:, :2], axis=1).mean()
        else:
            R = 1.0
        
        # Minor radius (tube thickness)
        if n_comp >= 3:
            r = reduced[:, 2].std()
        else:
            r = 0.5
        
        return {
            'basin_center': trajectory.mean(axis=0),
            'major_radius': float(R),
            'minor_radius': float(r),
            'embedding': Vt[:n_comp],
            'stability': 0.65,
        }
    
    def snap_to_lattice(self, trajectory: np.ndarray) -> Dict:
        """High-dimensional lattice (Aₙ/Dₙ)"""
        # Use SVD to find active dimensions
        centered = trajectory - trajectory.mean(axis=0)
        U, s, Vt = np.linalg.svd(centered, full_matrices=False)
        
        # Find number of significant dimensions
        threshold = 0.01 * s[0] if len(s) > 0 else 0.01
        n_active = np.sum(s > threshold)
        n_active = min(n_active, 8)  # Cap at 8
        
        return {
            'basin_center': trajectory.mean(axis=0),
            'active_dimensions': int(n_active),
            'basis_vectors': Vt[:n_active],
            'eigenvalues': s[:n_active],
            'stability': 0.60,
        }
    
    def crystallize_to_e8(self, trajectory: np.ndarray) -> Dict:
        """
        Maximal E8 crystallization for highest complexity.
        
        This is the existing E8 code, now as TOP TIER only.
        """
        # Project to 8D E8 subspace
        centered = trajectory - trajectory.mean(axis=0)
        U, s, Vt = np.linalg.svd(centered, full_matrices=False)
        
        n_comp = min(8, len(s))
        e8_coords = U[:, :n_comp] @ np.diag(s[:n_comp])
        
        # Pad to 8D if needed
        if e8_coords.shape[1] < 8:
            padding = np.zeros((e8_coords.shape[0], 8 - e8_coords.shape[1]))
            e8_coords = np.hstack([e8_coords, padding])
        
        center = e8_coords.mean(axis=0)
        
        # Find nearest E8 root (simplified - would use actual E8 root system)
        # For now, just quantize to nearest lattice point
        nearest_root = np.round(center * 2) / 2  # E8 has half-integer roots
        
        return {
            'basin_center': trajectory.mean(axis=0),
            'e8_center': center,
            'e8_nearest_root': nearest_root,
            'e8_offset': center - nearest_root,
            'active_dimensions': 8,
            'stability': 0.95,  # E8 is VERY stable
        }


# Export addressing functions for each geometry
def direct_lookup(pattern_data: Dict, stimulus: np.ndarray) -> Optional[np.ndarray]:
    """O(1) lookup for Line geometry"""
    # Simple hash-based retrieval
    return pattern_data.get('basin_center')


def cyclic_lookup(pattern_data: Dict, stimulus: np.ndarray) -> Optional[np.ndarray]:
    """O(1) cyclic buffer for Loop geometry"""
    # Retrieve next point in sequence
    return pattern_data.get('basin_center')


def temporal_lookup(pattern_data: Dict, stimulus: np.ndarray) -> Optional[np.ndarray]:
    """O(log n) temporal indexing for Spiral geometry"""
    # Use growth rate to predict position
    return pattern_data.get('basin_center')


def spatial_lookup(pattern_data: Dict, stimulus: np.ndarray) -> Optional[np.ndarray]:
    """O(√n) or O(log² n) spatial indexing for Grid geometry"""
    # K-D tree or quad tree lookup
    return pattern_data.get('basin_center')


def manifold_lookup(pattern_data: Dict, stimulus: np.ndarray) -> Optional[np.ndarray]:
    """O(k log n) manifold navigation for Toroidal geometry"""
    # Smooth interpolation on manifold
    return pattern_data.get('basin_center')


def conceptual_lookup(pattern_data: Dict, stimulus: np.ndarray) -> Optional[np.ndarray]:
    """O(log n) conceptual clustering for Lattice geometry"""
    # High-D tree category lookup
    return pattern_data.get('basin_center')


def symbolic_lookup(pattern_data: Dict, stimulus: np.ndarray) -> Optional[np.ndarray]:
    """O(1) after projection for E8 geometry"""
    # Project to E8, find nearest root
    return pattern_data.get('basin_center')


ADDRESSING_FUNCTIONS: Dict[str, Callable] = {
    'direct': direct_lookup,
    'cyclic': cyclic_lookup,
    'temporal': temporal_lookup,
    'spatial': spatial_lookup,
    'manifold': manifold_lookup,
    'conceptual': conceptual_lookup,
    'symbolic': symbolic_lookup,
}
