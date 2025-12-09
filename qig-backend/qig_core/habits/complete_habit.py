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

Architecture Integration:
- Inherits from HolographicTransformMixin for dimensional state management
- Uses CycleManager for Φ-based phase detection and transitions
- Uses RunningCouplingManager (β=0.44) for scale-adaptive κ computations
- Uses AddressingMode enum for proper retrieval algorithm selection

Key Constants (from physics validation):
- β = 0.44 (running coupling)
- κ* = 64 (E8 fixed point)
- Φ thresholds: 0.1/0.4/0.7/0.95 for D1→D2→D3→D4→D5
- Phase thresholds: 0.3 (FOAM→TACKING), 0.7 (TACKING→CRYSTAL)
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
from ..universal_cycle.beta_coupling import (
    RunningCouplingManager,
    BETA_MEASURED,
    KAPPA_STAR,
    compute_coupling_strength,
)
from ..geometric_primitives import (
    GeometryClass,
    measure_complexity,
    choose_geometry_class,
    create_retriever,
    estimate_retrieval_cost,
)
from ..geometric_primitives.addressing_modes import AddressingMode
from ..holographic_transform import (
    DimensionalState,
    compress,
    decompress,
    estimate_compression_ratio,
)
from ..holographic_transform.holographic_mixin import (
    HolographicTransformMixin,
    PHI_THRESHOLD_D1_D2,
    PHI_THRESHOLD_D2_D3,
    PHI_THRESHOLD_D3_D4,
    PHI_THRESHOLD_D4_D5,
)


class CompleteHabit(HolographicTransformMixin):
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
    
    Architecture Integration:
    - Inherits HolographicTransformMixin for dimensional state detection
    - Uses CycleManager for phase transitions with proper thresholds
    - Uses RunningCouplingManager for β=0.44 scale-adaptive processing
    - Uses AddressingMode enum instead of strings
    """
    
    def __init__(
        self, 
        experiences: List[np.ndarray],
        cycle_manager: Optional[CycleManager] = None,
        coupling_manager: Optional[RunningCouplingManager] = None
    ):
        """
        Initialize habit from experiences.
        
        Args:
            experiences: List of basin coordinate arrays representing
                        the experiences that form this habit
            cycle_manager: Optional CycleManager for phase transitions
            coupling_manager: Optional RunningCouplingManager for β=0.44 processing
        """
        self.__init_holographic__()
        
        self.cycle_manager = cycle_manager or CycleManager()
        self.coupling_manager = coupling_manager or RunningCouplingManager()
        
        self.habit_id = f"habit_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        self.created_at = datetime.now().isoformat()
        
        self._phase = Phase.FOAM
        self._geometry: Optional[GeometryClass] = None
        self._addressing_mode: Optional[AddressingMode] = None
        
        self._basin_coords: Optional[np.ndarray] = None
        self._trajectory: Optional[np.ndarray] = None
        self._complexity: float = 0.0
        
        self._phi: float = 0.0
        self._kappa: float = KAPPA_STAR / 2
        
        self._foam = self.cycle_manager.foam
        self._tacking = self.cycle_manager.tacking
        self._crystal = self.cycle_manager.crystal
        self._fracture = self.cycle_manager.fracture
        
        self._retriever = None
        
        self._history: List[Dict[str, Any]] = []
        
        if experiences:
            self._form_habit(experiences)
    
    def _compute_phi(self, trajectory: np.ndarray) -> float:
        """
        Compute integration measure Φ from trajectory.
        
        Uses trajectory variance and coherence to estimate information integration.
        
        Args:
            trajectory: Array of basin coordinates
            
        Returns:
            Φ value in [0, 1]
        """
        if trajectory is None or len(trajectory) == 0:
            return 0.0
        
        if len(trajectory) == 1:
            return 0.3
        
        variance = np.var(trajectory, axis=0).mean() if len(trajectory.shape) > 1 else np.var(trajectory)
        coherence = 1.0 / (1.0 + variance)
        
        n_samples = len(trajectory)
        complexity_factor = min(1.0, n_samples / 10.0)
        
        phi = coherence * (0.5 + 0.5 * complexity_factor)
        return float(np.clip(phi, 0.0, 1.0))
    
    def _compute_kappa(self, trajectory: np.ndarray, phi: float) -> float:
        """
        Compute curvature coupling κ using RunningCouplingManager.
        
        Uses β=0.44 scale-adaptive processing with κ*=64 fixed point.
        
        Args:
            trajectory: Array of basin coordinates
            phi: Current integration measure
            
        Returns:
            κ value modulated by running coupling
        """
        if trajectory is None or len(trajectory) == 0:
            return KAPPA_STAR / 2
        
        if len(trajectory) < 2:
            base_kappa = KAPPA_STAR / 2
        else:
            mean_basin = np.mean(trajectory, axis=0) if len(trajectory.shape) > 1 else np.mean(trajectory)
            if isinstance(mean_basin, np.ndarray):
                base_kappa = np.linalg.norm(mean_basin) * 10.0
            else:
                base_kappa = abs(mean_basin) * 10.0
            base_kappa = float(np.clip(base_kappa, 1.0, 100.0))
        
        modulation = self.coupling_manager.modulate_consciousness_computation(
            phi=phi,
            kappa=base_kappa,
            basin_coords=np.mean(trajectory, axis=0) if len(trajectory.shape) > 1 else trajectory
        )
        
        return modulation.get('kappa', base_kappa)
    
    def _update_metrics(self, trajectory: np.ndarray) -> Dict[str, Any]:
        """
        Compute Φ and κ, update phase and dimension using architecture components.
        
        Uses:
        - RunningCouplingManager for scale-adaptive κ with β=0.44
        - CycleManager for Φ-based phase detection
        - HolographicTransformMixin for dimensional state detection
        
        Args:
            trajectory: Current trajectory for metric computation
            
        Returns:
            Dict with updated metrics
        """
        self._phi = self._compute_phi(trajectory)
        self._kappa = self._compute_kappa(trajectory, self._phi)
        
        dimension_str = self.dimensional_state.value
        transition = self.cycle_manager.update(self._phi, self._kappa, dimension_str)
        
        if transition is not None:
            self._phase = self.cycle_manager.current_phase
            self._record_event('phase_transition', transition)
        
        new_dimension = self.detect_dimensional_state(self._phi, self._kappa)
        
        return {
            'phi': self._phi,
            'kappa': self._kappa,
            'phase': self._phase.value,
            'dimension': new_dimension.value,
            'at_fixed_point': abs(self._kappa - KAPPA_STAR) < 1.5,
            'coupling_strength': compute_coupling_strength(self._phi, self._kappa),
        }
    
    def _form_habit(self, experiences: List[np.ndarray]) -> Dict[str, Any]:
        """
        Form habit through complete learning cycle.
        
        Phase 1: FOAM (exploration) - generate bubbles
        Phase 2: TACKING (navigation) - connect with geodesics
        Phase 3: CRYSTAL (consolidation) - measure complexity, choose geometry
        Phase 4: COMPRESSION (storage) - compress to D2
        
        Uses CycleManager for proper phase transitions and
        HolographicTransformMixin for dimensional state tracking.
        """
        result = {
            'phases': [],
            'success': False,
        }
        
        self._phase = Phase.FOAM
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
        
        metrics = self._update_metrics(self._trajectory)
        
        tacking_result = {
            'phase': 'tacking',
            'n_geodesics': nav_result.get('n_connections', 0),
            'trajectory_length': len(self._trajectory),
            'phi': metrics['phi'],
            'kappa': metrics['kappa'],
        }
        result['phases'].append(tacking_result)
        self._record_event('tacking_complete', tacking_result)
        
        self._phase = Phase.CRYSTAL
        
        self._complexity = measure_complexity(self._trajectory)
        self._geometry = choose_geometry_class(self._complexity)
        self._addressing_mode = AddressingMode.from_geometry(self._geometry)
        
        if self._phi > PHI_THRESHOLD_D3_D4:
            fisher_metric = np.eye(len(self._trajectory[0]) if len(self._trajectory.shape) > 1 else 1)
            modulated_metric = self.coupling_manager.modulate_fisher_metric(
                fisher_metric, 
                self._kappa
            )
            crystal_result = self._crystal.crystallize_pattern(
                self._trajectory,
                metadata={
                    'habit_id': self.habit_id,
                    'fisher_metric': modulated_metric.tolist() if isinstance(modulated_metric, np.ndarray) else modulated_metric,
                    'kappa': self._kappa,
                }
            )
        else:
            crystal_result = self._crystal.crystallize_pattern(
                self._trajectory,
                metadata={'habit_id': self.habit_id}
            )
        
        self._basin_coords = crystal_result.get('basin_center')
        if self._basin_coords is None:
            self._basin_coords = np.mean(self._trajectory, axis=0)
        
        final_metrics = self._update_metrics(self._trajectory)
        
        crystal_phase_result = {
            'phase': 'crystal',
            'complexity': self._complexity,
            'geometry': self._geometry.value,
            'addressing': self._addressing_mode.value,
            'addressing_complexity': self._addressing_mode.complexity,
            'phi': final_metrics['phi'],
            'kappa': final_metrics['kappa'],
            'at_fixed_point': final_metrics['at_fixed_point'],
        }
        result['phases'].append(crystal_phase_result)
        self._record_event('crystal_complete', crystal_phase_result)
        
        pattern_to_compress = {
            'basin_coords': self._basin_coords,
            'geometry': self._geometry.value,
            'dimensional_state': self.dimensional_state.value,
            'trajectory': self._trajectory.tolist() if isinstance(self._trajectory, np.ndarray) else self._trajectory,
        }
        compressed = self.compress_pattern(pattern_to_compress, DimensionalState.D2)
        
        compression_result = {
            'phase': 'compression',
            'from_dimension': self.dimensional_state.value,
            'to_dimension': DimensionalState.D2.value,
            'compression_ratio': estimate_compression_ratio(self.dimensional_state, DimensionalState.D2),
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
        
        Retrieval complexity depends on geometry (via AddressingMode):
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
        
        This is therapy/relearning using HolographicTransformMixin:
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
        
        compressed_pattern = {
            'basin_coords': self._basin_coords,
            'geometry': self._geometry.value if self._geometry else None,
            'dimensional_state': self.dimensional_state.value,
        }
        decompressed = self.decompress_pattern(compressed_pattern, DimensionalState.D4)
        
        self._phase = Phase.CRYSTAL
        
        decompression_result = {
            'step': 'decompress',
            'from_dimension': DimensionalState.D2.value,
            'to_dimension': DimensionalState.D4.value,
        }
        result['phases'].append(decompression_result)
        self._record_event('decompress_complete', decompression_result)
        
        self._phase = Phase.FRACTURE
        
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
        
        metrics = self._update_metrics(self._trajectory)
        
        tacking_result = {
            'step': 'tacking',
            'n_geodesics': nav_result.get('n_connections', 0),
            'phi': metrics['phi'],
            'kappa': metrics['kappa'],
        }
        result['phases'].append(tacking_result)
        self._record_event('tacking_complete', tacking_result)
        
        self._phase = Phase.CRYSTAL
        
        old_geometry = self._geometry
        self._complexity = measure_complexity(self._trajectory)
        self._geometry = choose_geometry_class(self._complexity)
        self._addressing_mode = AddressingMode.from_geometry(self._geometry)
        
        crystal_result = self._crystal.crystallize_pattern(
            self._trajectory,
            metadata={'habit_id': self.habit_id, 'modified': True}
        )
        
        self._basin_coords = crystal_result.get('basin_center')
        if self._basin_coords is None:
            self._basin_coords = np.mean(self._trajectory, axis=0)
        
        final_metrics = self._update_metrics(self._trajectory)
        
        recrystallize_result = {
            'step': 'recrystallize',
            'old_geometry': old_geometry.value if old_geometry else None,
            'new_geometry': self._geometry.value,
            'new_addressing': self._addressing_mode.value,
            'new_complexity': self._complexity,
            'geometry_changed': old_geometry != self._geometry,
            'phi': final_metrics['phi'],
            'kappa': final_metrics['kappa'],
        }
        result['phases'].append(recrystallize_result)
        self._record_event('recrystallize_complete', recrystallize_result)
        
        pattern_to_compress = {
            'basin_coords': self._basin_coords,
            'geometry': self._geometry.value,
            'dimensional_state': DimensionalState.D4.value,
        }
        self.compress_pattern(pattern_to_compress, DimensionalState.D2)
        
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
    
    def consolidate_sleep(self, new_experiences: List[Dict]) -> np.ndarray:
        """
        Sleep consolidation using HolographicTransformMixin.
        
        Compresses new experiences with existing habit into updated basin coordinates.
        
        Args:
            new_experiences: List of experience dicts with basin coordinates
            
        Returns:
            Updated basin coordinates after consolidation
        """
        all_experiences = list(new_experiences)
        if self._basin_coords is not None:
            all_experiences.append({
                'basin_coords': self._basin_coords,
                'phi': self._phi,
                'stability': 0.8,
            })
        
        consolidated = self.sleep_consolidation(all_experiences)
        
        self._basin_coords = consolidated
        self._record_event('sleep_consolidation', {
            'n_experiences': len(new_experiences),
            'consolidated_norm': float(np.linalg.norm(consolidated)),
        })
        
        return consolidated
    
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
            'dimension': self.dimensional_state.value,
            'geometry': self._geometry.value if self._geometry else None,
            'addressing': self._addressing_mode.value if self._addressing_mode else None,
            'addressing_complexity': self._addressing_mode.complexity if self._addressing_mode else None,
            'complexity': self._complexity,
            'phi': self._phi,
            'kappa': self._kappa,
            'at_fixed_point': abs(self._kappa - KAPPA_STAR) < 1.5,
            'coupling_strength': compute_coupling_strength(self._phi, self._kappa),
            'has_basin_coords': self._basin_coords is not None,
            'retrieval_cost': self._get_retrieval_cost(),
            'consciousness_level': self.dimensional_state.consciousness_level,
            'holographic_state': self.get_holographic_state(),
            'cycle_phase': self.cycle_manager.current_phase.value,
            'constants': {
                'beta': BETA_MEASURED,
                'kappa_star': KAPPA_STAR,
                'phi_thresholds': {
                    'd1_d2': PHI_THRESHOLD_D1_D2,
                    'd2_d3': PHI_THRESHOLD_D2_D3,
                    'd3_d4': PHI_THRESHOLD_D3_D4,
                    'd4_d5': PHI_THRESHOLD_D4_D5,
                },
            },
        }
    
    def _record_event(self, event_type: str, data: Dict[str, Any]):
        """Record event to history"""
        self._history.append({
            'event': event_type,
            'timestamp': datetime.now().isoformat(),
            'phase': self._phase.value,
            'dimension': self.dimensional_state.value,
            'phi': self._phi,
            'kappa': self._kappa,
            'data': data,
        })
    
    def get_history(self) -> List[Dict[str, Any]]:
        """Get full event history"""
        return self._history.copy()
    
    def is_conscious(self) -> bool:
        """Check if habit is currently in conscious state (D3 or D4)"""
        return self.dimensional_state in (DimensionalState.D3, DimensionalState.D4)
    
    def is_compressed(self) -> bool:
        """Check if habit is in compressed storage (D2)"""
        return self.dimensional_state == DimensionalState.D2
    
    def get_current_dimension(self) -> DimensionalState:
        """Get current dimensional state (from mixin)"""
        return self.dimensional_state
    
    def _create_retriever_for_geometry(self):
        """Create appropriate retriever for current geometry with habit data"""
        if self._geometry is None:
            return None
        
        n_patterns = len(self._trajectory) if self._trajectory is not None else 0
        
        addressing_context = {
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
            'addressing_mode': self._addressing_mode.value if self._addressing_mode else None,
            'geometry': self._geometry.value if self._geometry else None,
            'phi': self._phi,
            'kappa': self._kappa,
        }
        
        try:
            return create_retriever(self._geometry, addressing_context)
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
        if self._addressing_mode is not None:
            return self._addressing_mode.complexity
        return 'unknown'
    
    def get_cycle_statistics(self) -> Dict[str, Any]:
        """Get statistics from CycleManager about phase transitions"""
        return {
            'current_phase': self.cycle_manager.current_phase.value,
            'phase_history_length': len(self.cycle_manager.phase_history),
            'recent_transitions': self.cycle_manager.phase_history[-5:] if self.cycle_manager.phase_history else [],
            'thresholds': {
                'phi_foam': self.cycle_manager.phi_foam_threshold,
                'phi_crystal': self.cycle_manager.phi_crystal_threshold,
                'kappa_fracture': self.cycle_manager.kappa_fracture_threshold,
            },
        }
    
    def get_coupling_statistics(self) -> Dict[str, Any]:
        """Get statistics from RunningCouplingManager"""
        return {
            **self.coupling_manager.get_status(),
            'current_regime': self.coupling_manager.get_scale_regime(self._kappa),
            'at_fixed_point': abs(self._kappa - KAPPA_STAR) < 1.5,
        }
