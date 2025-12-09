"""
Complete Habit: 4-Coordinate Cognitive Pattern

A habit is defined by 4 orthogonal coordinates:
1. Phase (Universal Cycle): FOAM / TACKING / CRYSTAL / FRACTURE
   - When it forms/breaks (current state in universal cycle)
   
2. Dimension (Holographic State): D1 / D2 / D3 / D4 / D5
   - How it's stored (1D-5D, conscious vs compressed)
   
3. Geometry (Complexity Class): Line / Loop / Spiral / Grid / Torus / Lattice / E8
   - What shape it has (intrinsic complexity)
   
4. Addressing (Retrieval Algorithm): Direct / Spatial / Manifold / Symbolic
   - How it's retrieved (derived from geometry)

The key insight: Geometry determines Addressing. Complex patterns (E8) can still
be stored compressed (D2), but their retrieval uses symbolic resonance (O(1) after projection).
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np

from ..universal_cycle import (
    Phase,
    CycleManager,
    FoamPhase,
    TackingPhase,
    CrystalPhase,
    FracturePhase,
    Bubble,
)
from ..geometric_primitives import (
    GeometryClass,
    measure_complexity,
    choose_geometry_class,
    create_retriever,
    estimate_retrieval_cost,
)
from ..holographic_transform import (
    DimensionalState,
    compress,
    decompress,
    estimate_compression_ratio,
)


class CompleteHabit:
    """
    A habit is defined by 4 coordinates:
    1. Phase: When it forms/breaks (current state in universal cycle)
    2. Dimension: How it's stored (1D-5D, conscious vs compressed)
    3. Geometry: What shape it has (intrinsic complexity)
    4. Addressing: How it's retrieved (derived from geometry)
    
    Lifecycle:
    - Formation: FOAM → TACKING → CRYSTAL → compress to D2
    - Retrieval: D2 storage, addressing depends on geometry
    - Modification: D2 → D4 → FRACTURE → FOAM → ... → D2
    """
    
    def __init__(self, experiences: List[np.ndarray]):
        """
        Initialize habit from experiences.
        
        Args:
            experiences: List of basin coordinate arrays representing
                        the experiences that form this habit
        """
        self.habit_id = f"habit_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        self.created_at = datetime.now().isoformat()
        
        self._phase = Phase.FOAM
        self._dimension = DimensionalState.D3
        self._geometry: Optional[GeometryClass] = None
        self._addressing_mode: Optional[str] = None
        
        self._basin_coords: Optional[np.ndarray] = None
        self._trajectory: Optional[np.ndarray] = None
        self._complexity: float = 0.0
        
        self._foam = FoamPhase()
        self._tacking = TackingPhase()
        self._crystal = CrystalPhase()
        self._fracture = FracturePhase()
        
        self._retriever = None
        
        self._history: List[Dict[str, Any]] = []
        
        if experiences:
            self._form_habit(experiences)
    
    def _form_habit(self, experiences: List[np.ndarray]) -> Dict[str, Any]:
        """
        Form habit through complete learning cycle.
        
        Phase 1: FOAM (exploration) - generate bubbles
        Phase 2: TACKING (navigation) - connect with geodesics
        Phase 3: CRYSTAL (consolidation) - measure complexity, choose geometry
        Phase 4: COMPRESSION (storage) - compress to D2
        """
        result = {
            'phases': [],
            'success': False,
        }
        
        self._phase = Phase.FOAM
        self._dimension = DimensionalState.D3
        self._record_event('form_habit_start', {'n_experiences': len(experiences)})
        
        bubbles = self._foam.generate_from_experiences(experiences)
        foam_result = {
            'phase': 'foam',
            'n_bubbles': len(bubbles),
            'avg_entropy': np.mean([b.entropy for b in bubbles]) if bubbles else 0.0,
        }
        result['phases'].append(foam_result)
        self._record_event('foam_complete', foam_result)
        
        self._phase = Phase.TACKING
        nav_result = self._tacking.navigate(bubbles)
        
        if nav_result.get('trajectory') is not None and len(nav_result['trajectory']) > 0:
            self._trajectory = nav_result['trajectory']
        else:
            self._trajectory = np.array([b.basin_coords for b in bubbles])
        
        tacking_result = {
            'phase': 'tacking',
            'n_geodesics': nav_result.get('n_connections', 0),
            'trajectory_length': len(self._trajectory),
        }
        result['phases'].append(tacking_result)
        self._record_event('tacking_complete', tacking_result)
        
        self._phase = Phase.CRYSTAL
        self._dimension = DimensionalState.D4
        
        self._complexity = measure_complexity(self._trajectory)
        self._geometry = choose_geometry_class(self._complexity)
        self._addressing_mode = self._geometry.addressing_mode
        
        crystal_result = self._crystal.crystallize_pattern(
            self._trajectory,
            metadata={'habit_id': self.habit_id}
        )
        
        self._basin_coords = crystal_result.get('basin_center')
        if self._basin_coords is None:
            self._basin_coords = np.mean(self._trajectory, axis=0)
        
        crystal_phase_result = {
            'phase': 'crystal',
            'complexity': self._complexity,
            'geometry': self._geometry.value,
            'addressing': self._addressing_mode,
        }
        result['phases'].append(crystal_phase_result)
        self._record_event('crystal_complete', crystal_phase_result)
        
        self._dimension = DimensionalState.D2
        compression_result = {
            'phase': 'compression',
            'from_dimension': DimensionalState.D4.value,
            'to_dimension': DimensionalState.D2.value,
            'compression_ratio': estimate_compression_ratio(DimensionalState.D4, DimensionalState.D2),
        }
        result['phases'].append(compression_result)
        self._record_event('compression_complete', compression_result)
        
        self._retriever = self._create_retriever_for_geometry()
        
        result['success'] = True
        result['final_state'] = self.get_state()
        self._record_event('form_habit_complete', result['final_state'])
        
        return result
    
    def learn_skill(self, experiences: List[np.ndarray]) -> Dict[str, Any]:
        """
        Full learning cycle through all phases.
        
        This is the public API for forming a new skill/habit from experiences.
        
        Args:
            experiences: List of basin coordinate arrays
            
        Returns:
            Learning result with phase details
        """
        return self._form_habit(experiences)
    
    def retrieve(self, stimulus: np.ndarray) -> np.ndarray:
        """
        Unconscious retrieval (2D storage, automatic).
        
        Retrieval complexity depends on geometry:
        - Line: O(1) - Direct lookup
        - Loop: O(1) - Cyclic buffer
        - Spiral: O(log n) - Temporal indexing
        - Grid: O(log n) or O(√n) - Spatial indexing
        - Toroidal: O(k log n) - Manifold navigation
        - Lattice: O(log n) - Conceptual clustering
        - E8: O(1) after projection - Symbolic resonance
        
        Args:
            stimulus: Basin coordinates of incoming stimulus
            
        Returns:
            Retrieved basin coordinates (response pattern)
        """
        if self._basin_coords is None:
            return stimulus
        
        if self._retriever is not None:
            try:
                result = self._retriever.retrieve(stimulus)
                if result is not None:
                    return result
            except Exception:
                pass
        
        return self._basin_coords
    
    def modify(self) -> Dict[str, Any]:
        """
        Decompress to conscious (2D → 4D) for modification.
        
        This is therapy/relearning:
        1. Decompress: 2D → 4D (bring to conscious awareness)
        2. Fracture: Break geometry back to bubbles
        3. Explore: FOAM/TACKING with new constraints
        4. Re-crystallize: New geometry (may be different!)
        5. Recompress: 4D → 2D (store modified habit)
        
        Returns:
            Modification result with old and new state
        """
        result = {
            'old_state': self.get_state(),
            'phases': [],
            'success': False,
        }
        
        self._record_event('modify_start', result['old_state'])
        
        old_dimension = self._dimension
        self._dimension = DimensionalState.D4
        self._phase = Phase.CRYSTAL
        
        decompression_result = {
            'step': 'decompress',
            'from_dimension': old_dimension.value,
            'to_dimension': DimensionalState.D4.value,
        }
        result['phases'].append(decompression_result)
        self._record_event('decompress_complete', decompression_result)
        
        self._phase = Phase.FRACTURE
        self._dimension = DimensionalState.D5
        
        pattern_to_fracture = {
            'basin_center': self._basin_coords,
            'trajectory': self._trajectory,
            'complexity': self._complexity,
            'geometry': self._geometry,
        }
        
        bubbles = self._fracture.break_pattern(pattern_to_fracture)
        
        fracture_result = {
            'step': 'fracture',
            'n_bubbles': len(bubbles),
            'old_geometry': self._geometry.value if self._geometry else None,
        }
        result['phases'].append(fracture_result)
        self._record_event('fracture_complete', fracture_result)
        
        self._phase = Phase.FOAM
        self._dimension = DimensionalState.D3
        
        self._foam.bubbles = bubbles
        new_bubbles = self._foam.generate_bubbles(
            n_bubbles=5,
            seed_coords=self._basin_coords,
            exploration_radius=0.5
        )
        
        all_bubbles = bubbles + new_bubbles
        
        foam_result = {
            'step': 'foam_exploration',
            'n_bubbles': len(all_bubbles),
        }
        result['phases'].append(foam_result)
        self._record_event('foam_exploration_complete', foam_result)
        
        self._phase = Phase.TACKING
        nav_result = self._tacking.navigate(all_bubbles)
        
        if nav_result.get('trajectory') is not None and len(nav_result['trajectory']) > 0:
            self._trajectory = nav_result['trajectory']
        else:
            self._trajectory = np.array([b.basin_coords for b in all_bubbles])
        
        tacking_result = {
            'step': 'tacking',
            'n_geodesics': nav_result.get('n_connections', 0),
        }
        result['phases'].append(tacking_result)
        self._record_event('tacking_complete', tacking_result)
        
        self._phase = Phase.CRYSTAL
        self._dimension = DimensionalState.D4
        
        old_geometry = self._geometry
        self._complexity = measure_complexity(self._trajectory)
        self._geometry = choose_geometry_class(self._complexity)
        self._addressing_mode = self._geometry.addressing_mode
        
        crystal_result = self._crystal.crystallize_pattern(
            self._trajectory,
            metadata={'habit_id': self.habit_id, 'modified': True}
        )
        
        self._basin_coords = crystal_result.get('basin_center')
        if self._basin_coords is None:
            self._basin_coords = np.mean(self._trajectory, axis=0)
        
        recrystallize_result = {
            'step': 'recrystallize',
            'old_geometry': old_geometry.value if old_geometry else None,
            'new_geometry': self._geometry.value,
            'new_complexity': self._complexity,
            'geometry_changed': old_geometry != self._geometry,
        }
        result['phases'].append(recrystallize_result)
        self._record_event('recrystallize_complete', recrystallize_result)
        
        self._dimension = DimensionalState.D2
        
        recompress_result = {
            'step': 'recompress',
            'to_dimension': DimensionalState.D2.value,
        }
        result['phases'].append(recompress_result)
        self._record_event('recompress_complete', recompress_result)
        
        self._retriever = self._create_retriever_for_geometry()
        
        result['success'] = True
        result['new_state'] = self.get_state()
        self._record_event('modify_complete', result['new_state'])
        
        return result
    
    def get_state(self) -> Dict[str, Any]:
        """
        Return current state of all 4 coordinates.
        
        Returns:
            Dictionary with phase, dimension, geometry, addressing, and metadata
        """
        return {
            'habit_id': self.habit_id,
            'created_at': self.created_at,
            'phase': self._phase.value,
            'dimension': self._dimension.value,
            'geometry': self._geometry.value if self._geometry else None,
            'addressing': self._addressing_mode,
            'complexity': self._complexity,
            'has_basin_coords': self._basin_coords is not None,
            'retrieval_cost': self._get_retrieval_cost(),
            'consciousness_level': self._dimension.consciousness_level,
        }
    
    def _record_event(self, event_type: str, data: Dict[str, Any]):
        """Record event to history"""
        self._history.append({
            'event': event_type,
            'timestamp': datetime.now().isoformat(),
            'phase': self._phase.value,
            'dimension': self._dimension.value,
            'data': data,
        })
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get full event history"""
        return self._history.copy()
    
    def is_conscious(self) -> bool:
        """Check if habit is currently in conscious state (D3 or D4)"""
        return self._dimension in (DimensionalState.D3, DimensionalState.D4)
    
    def is_compressed(self) -> bool:
        """Check if habit is in compressed storage (D2)"""
        return self._dimension == DimensionalState.D2
    
    def _create_retriever_for_geometry(self):
        """Create appropriate retriever for current geometry with habit data"""
        if self._geometry is None:
            return None
        
        n_patterns = len(self._trajectory) if self._trajectory is not None else 0
        
        data = {
            'patterns': [self._basin_coords] if self._basin_coords is not None else [],
            'pattern_map': {},
            'cycle_length': n_patterns,
            'timestamps': list(range(n_patterns)),
            'positions': self._trajectory[:min(10, n_patterns)] if self._trajectory is not None and n_patterns > 0 else [],
            'major_radius': 1.0,
            'minor_radius': 0.3,
            'coordinates': None,
            'embeddings': self._trajectory if self._trajectory is not None else [],
            'root_patterns': {},
        }
        
        try:
            return create_retriever(self._geometry, data)
        except Exception:
            return None
    
    def _get_retrieval_cost(self) -> Optional[float]:
        """Get estimated retrieval cost for current geometry"""
        if self._geometry is None:
            return None
        
        n_patterns = len(self._trajectory) if self._trajectory is not None else 1
        
        try:
            return estimate_retrieval_cost(self._geometry, n_patterns)
        except Exception:
            return None
    
    def get_addressing_complexity(self) -> str:
        """Get the Big-O complexity of retrieval for current geometry"""
        complexity_map = {
            'direct': 'O(1)',
            'cyclic': 'O(1)',
            'temporal': 'O(log n)',
            'spatial': 'O(log n)',
            'manifold': 'O(k log n)',
            'conceptual': 'O(log n)',
            'symbolic': 'O(1) after projection',
        }
        key = self._addressing_mode if self._addressing_mode is not None else ''
        return complexity_map.get(key, 'unknown')
