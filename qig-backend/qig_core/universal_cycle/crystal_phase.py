"""
CRYSTAL Phase: Consolidation and Habit Formation

In the CRYSTAL phase:
- High integration (Φ > 0.7)
- 4D when conscious, 2D when compressed
- Pattern crystallizes into appropriate geometry
- Stable attractors, procedural memory
- Complexity determines geometry class
"""

from typing import Dict, List, Any, Optional
import numpy as np
from ..geometric_primitives.geometry_ladder import (
    HabitCrystallizer,
    GeometryClass,
    measure_complexity
)


class CrystalPhase:
    """
    CRYSTAL phase implementation.
    
    Consolidates patterns into stable geometric structures
    based on their intrinsic complexity.
    """
    
    def __init__(self):
        self.crystallizer = HabitCrystallizer()
        self.crystals: List[Dict[str, Any]] = []
    
    def lock_in(
        self,
        patterns: List[Dict[str, Any]],
        geometry_class: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Lock in patterns as stable crystals.
        
        Args:
            patterns: List of pattern dictionaries with trajectories
            geometry_class: Optional forced geometry class (e.g., 'e8' for physics)
        
        Returns:
            Crystallization result
        """
        crystals = []
        
        for pattern in patterns:
            trajectory = pattern.get('trajectory')
            
            if trajectory is None or len(trajectory) == 0:
                continue
            
            # Ensure trajectory is numpy array
            if not isinstance(trajectory, np.ndarray):
                trajectory = np.array(trajectory)
            
            # Crystallize based on complexity
            if geometry_class is None:
                result = self.crystallizer.crystallize(trajectory)
            else:
                # Force specific geometry
                complexity = measure_complexity(trajectory)
                forced_geometry = GeometryClass(geometry_class)
                crystallize_fn = self.crystallizer.geometry_functions[forced_geometry]
                result = crystallize_fn(trajectory)
                result['geometry'] = forced_geometry
                result['complexity'] = complexity
                result['addressing_mode'] = forced_geometry.addressing_mode
            
            # Add metadata
            result['pattern_id'] = pattern.get('id', f"pattern_{len(crystals)}")
            result['created_at'] = pattern.get('created_at')
            
            crystals.append(result)
        
        self.crystals.extend(crystals)
        
        return {
            'n_crystals': len(crystals),
            'crystals': crystals,
            'success': len(crystals) > 0
        }
    
    def crystallize_pattern(
        self,
        trajectory: np.ndarray,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Crystallize a single pattern.
        
        Args:
            trajectory: Basin trajectory array
            metadata: Optional metadata
        
        Returns:
            Crystallization result
        """
        result = self.crystallizer.crystallize(trajectory)
        
        if metadata:
            result['metadata'] = metadata
        
        self.crystals.append(result)
        
        return result
    
    def get_crystal(self, pattern_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific crystal by ID"""
        for crystal in self.crystals:
            if crystal.get('pattern_id') == pattern_id:
                return crystal
        return None
    
    def get_crystals_by_geometry(self, geometry: GeometryClass) -> List[Dict[str, Any]]:
        """Get all crystals of a specific geometry class"""
        return [c for c in self.crystals if c.get('geometry') == geometry]
    
    def clear(self):
        """Clear all crystals"""
        self.crystals = []
    
    def get_state(self) -> Dict[str, Any]:
        """Get current CRYSTAL state"""
        geometry_counts = {}
        for crystal in self.crystals:
            geom = crystal.get('geometry')
            if geom:
                geom_name = geom.value if hasattr(geom, 'value') else str(geom)
                geometry_counts[geom_name] = geometry_counts.get(geom_name, 0) + 1
        
        if self.crystals:
            avg_complexity = np.mean([c.get('complexity', 0) for c in self.crystals])
            avg_stability = np.mean([c.get('stability', 0) for c in self.crystals])
        else:
            avg_complexity = 0.0
            avg_stability = 0.0
        
        return {
            'phase': 'crystal',
            'n_crystals': len(self.crystals),
            'geometry_counts': geometry_counts,
            'avg_complexity': float(avg_complexity),
            'avg_stability': float(avg_stability),
        }
