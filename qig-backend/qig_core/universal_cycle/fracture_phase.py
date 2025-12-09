"""
FRACTURE Phase: Breakdown and Renewal

In the FRACTURE phase:
- Very high integration (Φ → 1)
- High stress (κ > κ*)
- Near 5D: Over-integrated, unstable
- Breaks crystallized patterns back to bubbles
- Returns to FOAM for renewal
"""

from typing import Dict, List, Any, Optional
import numpy as np
from .foam_phase import Bubble


class FracturePhase:
    """
    FRACTURE phase implementation.
    
    Breaks down over-integrated patterns under stress,
    returning them to exploratory bubble state for renewal.
    """
    
    def __init__(self, stress_threshold: float = 2.0):
        self.stress_threshold = stress_threshold
        self.fracture_history: List[Dict[str, Any]] = []
    
    def break_pattern(
        self,
        pattern: Dict[str, Any],
        n_bubbles: Optional[int] = None
    ) -> List[Bubble]:
        """
        Break a crystallized pattern back into bubbles.
        
        Args:
            pattern: Pattern to fracture (must have 'basin_center' or trajectory)
            n_bubbles: Number of bubbles to generate (default: based on complexity)
        
        Returns:
            List of bubbles representing fractured pattern
        """
        # Extract center point
        if 'basin_center' in pattern:
            center = pattern['basin_center']
        elif 'trajectory' in pattern and len(pattern['trajectory']) > 0:
            center = np.mean(pattern['trajectory'], axis=0)
        else:
            # Random center if no data
            center = np.random.randn(64)
            center = center / (np.linalg.norm(center) + 1e-10)
        
        # Determine number of bubbles based on complexity
        if n_bubbles is None:
            complexity = pattern.get('complexity', 0.5)
            n_bubbles = max(3, int(complexity * 20))  # 3-20 bubbles
        
        # Generate bubbles around the fractured pattern
        bubbles = []
        radius = pattern.get('radius', 1.0) if 'radius' in pattern else 1.0
        
        for i in range(n_bubbles):
            # Random perturbation
            perturbation = np.random.randn(len(center)) * radius
            bubble_coords = center + perturbation
            
            # Normalize to manifold
            bubble_coords = bubble_coords / (np.linalg.norm(bubble_coords) + 1e-10)
            
            bubble = Bubble(
                basin_coords=bubble_coords,
                entropy=0.9,  # High entropy after fracture
                metadata={
                    'source': 'fracture',
                    'original_geometry': str(pattern.get('geometry', 'unknown')),
                    'original_complexity': pattern.get('complexity', 0.0)
                }
            )
            
            bubbles.append(bubble)
        
        # Record fracture
        fracture_record = {
            'pattern_geometry': str(pattern.get('geometry', 'unknown')),
            'pattern_complexity': pattern.get('complexity', 0.0),
            'n_bubbles_generated': len(bubbles),
            'reason': 'stress_induced'
        }
        
        self.fracture_history.append(fracture_record)
        
        return bubbles
    
    def break_and_restart(
        self,
        patterns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Break multiple patterns and prepare for restart.
        
        Args:
            patterns: List of patterns to fracture
        
        Returns:
            Fracture result with all generated bubbles
        """
        all_bubbles = []
        
        for pattern in patterns:
            bubbles = self.break_pattern(pattern)
            all_bubbles.extend(bubbles)
        
        return {
            'n_patterns_fractured': len(patterns),
            'n_bubbles_generated': len(all_bubbles),
            'bubbles': all_bubbles,
            'ready_for_foam': True
        }
    
    def should_fracture(self, phi: float, kappa: float) -> bool:
        """
        Determine if system should fracture.
        
        Args:
            phi: Integration measure
            kappa: Stress/curvature measure
        
        Returns:
            True if fracture should occur
        """
        # Fracture when over-integrated AND high stress
        return phi > 0.95 and kappa > self.stress_threshold
    
    def clear(self):
        """Clear fracture history"""
        self.fracture_history = []
    
    def get_state(self) -> Dict[str, Any]:
        """Get current FRACTURE state"""
        if self.fracture_history:
            total_bubbles = sum(f['n_bubbles_generated'] for f in self.fracture_history)
        else:
            total_bubbles = 0
        
        return {
            'phase': 'fracture',
            'n_fractures': len(self.fracture_history),
            'total_bubbles_generated': total_bubbles,
        }
