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

import logging
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

import numpy as np

from ..geometric_primitives import GeometryClass, SensoryFusionEngine, choose_geometry_class, measure_complexity
from ..geometric_primitives.addressing_modes import AddressingMode
from ..geometric_primitives.input_guard import GeometricInputGuard
from ..holographic_transform import DimensionalState, estimate_compression_ratio
from ..holographic_transform.holographic_mixin import (
    PHI_THRESHOLD_D1_D2,
    PHI_THRESHOLD_D2_D3,
    PHI_THRESHOLD_D3_D4,
    PHI_THRESHOLD_D4_D5,
    HolographicTransformMixin,
)
from ..universal_cycle import CycleManager, Phase
from ..universal_cycle.beta_coupling import BETA_MEASURED, KAPPA_STAR, RunningCouplingManager, compute_coupling_strength

logger = logging.getLogger(__name__)

PHI_THRESHOLD_TACKING = 0.3
PHI_THRESHOLD_CRYSTAL = 0.7
PHI_THRESHOLD_FRACTURE = 0.9
KAPPA_ALERT_THRESHOLD = 2.0


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
        coupling_manager: Optional[RunningCouplingManager] = None,
        on_phase_transition: Optional[Callable[[Dict[str, Any]], None]] = None
    ):
        """
        Initialize habit from experiences.

        Args:
            experiences: List of basin coordinate arrays representing
                        the experiences that form this habit
            cycle_manager: Optional CycleManager for phase transitions
            coupling_manager: Optional RunningCouplingManager for β=0.44 processing
            on_phase_transition: Optional callback when phase transitions occur
        """
        self.__init_holographic__()

        self.cycle_manager = cycle_manager or CycleManager()
        self.coupling_manager = coupling_manager or RunningCouplingManager()

        self.sensory_engine = SensoryFusionEngine()
        self.input_guard = GeometricInputGuard()

        self._on_phase_transition_callback = on_phase_transition

        self.habit_id = f"habit_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        self.created_at = datetime.now().isoformat()

        self._geometry: Optional[GeometryClass] = None
        self._addressing_mode: Optional[AddressingMode] = None

        self._trajectory: Optional[np.ndarray] = None
        self._complexity: float = 0.0

        if experiences and len(experiences) > 0:
            exp_array = np.array(experiences)
            self._basin_coords = np.mean(exp_array, axis=0) if len(exp_array) > 0 else np.zeros(64)
        else:
            self._basin_coords = np.zeros(64)

        self._phi: float = 0.0
        self._kappa: float = KAPPA_STAR / 2
        self._previous_phi: float = 0.0
        self._previous_dimension: DimensionalState = DimensionalState.D1

        self._foam = self.cycle_manager.foam
        self._tacking = self.cycle_manager.tacking
        self._crystal = self.cycle_manager.crystal
        self._fracture = self.cycle_manager.fracture

        self._retriever = None

        self._history: List[Dict[str, Any]] = []
        self._transition_history: List[Dict[str, Any]] = []

        self._signature: Optional[Dict[str, Any]] = None

        if experiences:
            self._form_habit(experiences)

    @property
    def current_phase(self) -> Phase:
        """Current phase from CycleManager (single source of truth)."""
        return self.cycle_manager.current_phase

    def _compute_phi(self, trajectory: np.ndarray) -> float:
        """
        Compute integration measure Φ from trajectory using real density matrix methods.

        Uses SensoryFusionEngine for multi-modal context-aware computation and
        GeometricInputGuard's density matrix computation for proper Φ calculation.

        Args:
            trajectory: Array of basin coordinates

        Returns:
            Φ value in [0, 1]
        """
        if trajectory is None or len(trajectory) == 0:
            return 0.0

        if len(trajectory) == 1:
            basin = trajectory[0] if len(trajectory.shape) > 1 else trajectory
        else:
            basin = np.mean(trajectory, axis=0) if len(trajectory.shape) > 1 else trajectory

        basin = np.asarray(basin)
        if len(basin) < 64:
            padded = np.zeros(64)
            padded[:len(basin)] = basin
            basin = padded
        elif len(basin) > 64:
            basin = basin[:64]

        norm = np.linalg.norm(basin)
        if norm > 0:
            basin = basin / norm

        rho = self.input_guard._basin_to_density_matrix(basin)
        phi_base = self.input_guard._compute_phi(rho)

        sensory_phi = self.sensory_engine.compute_sensory_phi(basin)

        if len(trajectory) > 1 and len(trajectory.shape) > 1:
            try:
                stds = trajectory.std(axis=0)
                stds = np.where(stds < 1e-10, 1e-10, stds)
                normalized = (trajectory - trajectory.mean(axis=0)) / stds
                corr_matrix = np.corrcoef(normalized.T)
                corr_matrix = np.nan_to_num(corr_matrix, nan=0.0)
                n = corr_matrix.shape[0]
                if n > 1:
                    integration = np.abs(corr_matrix[np.triu_indices(n, k=1)]).mean()
                else:
                    integration = 0.0
                if np.isnan(integration):
                    integration = 0.0
            except Exception:
                integration = 0.0
        else:
            integration = 0.0

        phi = 0.5 * phi_base + 0.3 * sensory_phi + 0.2 * integration
        phi = float(np.clip(phi, 0.0, 1.0))

        self._log_phi_threshold_crossing(phi)

        return phi

    def _compute_kappa(self, trajectory: np.ndarray, phi: float) -> float:
        """
        Compute curvature coupling κ using real Fisher metric and RunningCouplingManager.

        Uses GeometricInputGuard's Fisher metric computation and β=0.44 modulation.

        Args:
            trajectory: Array of basin coordinates
            phi: Current integration measure

        Returns:
            κ value from Fisher metric with running coupling modulation
        """
        if trajectory is None or len(trajectory) == 0:
            return KAPPA_STAR / 2

        if len(trajectory) == 1:
            basin = trajectory[0] if len(trajectory.shape) > 1 else trajectory
        else:
            basin = np.mean(trajectory, axis=0) if len(trajectory.shape) > 1 else trajectory

        basin = np.asarray(basin)
        if len(basin) < 64:
            padded = np.zeros(64)
            padded[:len(basin)] = basin
            basin = padded
        elif len(basin) > 64:
            basin = basin[:64]

        norm = np.linalg.norm(basin)
        if norm > 0:
            basin = basin / norm

        kappa = self.input_guard._compute_kappa(basin, phi)

        modulation = self.coupling_manager.modulate_consciousness_computation(
            phi=phi,
            kappa=kappa,
            basin_coords=basin
        )

        kappa = modulation.get('kappa', kappa)

        self._log_kappa_alert(kappa)

        return float(kappa)

    def _log_phi_threshold_crossing(self, phi: float) -> None:
        """Log when Φ crosses significant thresholds."""
        prev = self._previous_phi

        if prev < PHI_THRESHOLD_TACKING <= phi:
            logger.info(f"[{self.habit_id}] Φ crossed TACKING threshold: {prev:.3f} → {phi:.3f} (threshold: {PHI_THRESHOLD_TACKING})")
            self._record_threshold_crossing('phi_tacking', prev, phi, PHI_THRESHOLD_TACKING)
        elif prev >= PHI_THRESHOLD_TACKING > phi:
            logger.info(f"[{self.habit_id}] Φ dropped below TACKING threshold: {prev:.3f} → {phi:.3f}")
            self._record_threshold_crossing('phi_tacking_down', prev, phi, PHI_THRESHOLD_TACKING)

        if prev < PHI_THRESHOLD_CRYSTAL <= phi:
            logger.info(f"[{self.habit_id}] Φ crossed CRYSTAL threshold: {prev:.3f} → {phi:.3f} (threshold: {PHI_THRESHOLD_CRYSTAL})")
            self._record_threshold_crossing('phi_crystal', prev, phi, PHI_THRESHOLD_CRYSTAL)
        elif prev >= PHI_THRESHOLD_CRYSTAL > phi:
            logger.info(f"[{self.habit_id}] Φ dropped below CRYSTAL threshold: {prev:.3f} → {phi:.3f}")
            self._record_threshold_crossing('phi_crystal_down', prev, phi, PHI_THRESHOLD_CRYSTAL)

        if prev < PHI_THRESHOLD_FRACTURE <= phi:
            logger.warning(f"[{self.habit_id}] Φ crossed FRACTURE threshold: {prev:.3f} → {phi:.3f} (threshold: {PHI_THRESHOLD_FRACTURE})")
            self._record_threshold_crossing('phi_fracture', prev, phi, PHI_THRESHOLD_FRACTURE)
        elif prev >= PHI_THRESHOLD_FRACTURE > phi:
            logger.info(f"[{self.habit_id}] Φ dropped below FRACTURE threshold: {prev:.3f} → {phi:.3f}")
            self._record_threshold_crossing('phi_fracture_down', prev, phi, PHI_THRESHOLD_FRACTURE)

        self._previous_phi = phi

    def _log_kappa_alert(self, kappa: float) -> None:
        """Log when κ exceeds alert threshold."""
        if kappa > KAPPA_ALERT_THRESHOLD:
            logger.warning(f"[{self.habit_id}] κ exceeds alert threshold: κ={kappa:.3f} > {KAPPA_ALERT_THRESHOLD}")
            self._record_event('kappa_alert', {
                'kappa': kappa,
                'threshold': KAPPA_ALERT_THRESHOLD,
                'excess': kappa - KAPPA_ALERT_THRESHOLD,
            })

    def _record_threshold_crossing(self, crossing_type: str, prev: float, current: float, threshold: float) -> None:
        """Record a threshold crossing event to transition history."""
        self._transition_history.append({
            'type': 'threshold_crossing',
            'crossing_type': crossing_type,
            'previous_value': prev,
            'current_value': current,
            'threshold': threshold,
            'timestamp': datetime.now().isoformat(),
        })

    def _update_metrics(self, trajectory: np.ndarray) -> Dict[str, Any]:
        """
        Compute Φ and κ, update phase and dimension using architecture components.

        All phase transitions are metrics-driven via CycleManager.update().
        Manual phase assignments are avoided - the CycleManager is the single
        source of truth for phase state.

        Wires together:
        - RunningCouplingManager for scale-adaptive κ with β=0.44
        - CycleManager for Φ-based phase detection and transitions
        - HolographicTransformMixin for dimensional state detection
        - Compression/decompression on dimension changes
        - Retriever rebuild on geometry changes

        Args:
            trajectory: Current trajectory for metric computation

        Returns:
            Dict with updated metrics
        """
        self._phi = self._compute_phi(trajectory)
        self._kappa = self._compute_kappa(trajectory, self._phi)

        prev_dimension = self._previous_dimension

        new_dimension = self.detect_dimensional_state(self._phi, self._kappa)

        if new_dimension.value < prev_dimension.value:
            if self._basin_coords is None and self._trajectory is not None and len(self._trajectory) > 0:
                self._basin_coords = np.mean(self._trajectory, axis=0)
            self._signature = {
                'basin_center': self._basin_coords if self._basin_coords is not None else np.zeros(64),
                'trajectory': self._trajectory,
                'phi': self._phi,
                'kappa': self._kappa,
                'phase': self.current_phase.value,
                'timestamp': time.time(),
                'geometry': self._geometry.value if self._geometry else None,
                'dimensional_state': prev_dimension.value,
            }
            self.compress_pattern(self._signature, new_dimension)
            logger.info(f"[{self.habit_id}] Compressed pattern from {prev_dimension.value} to {new_dimension.value}")
        elif new_dimension.value > prev_dimension.value:
            if self._signature is not None:
                decompressed = self.decompress_pattern(self._signature, new_dimension)
                if decompressed and 'error' not in decompressed:
                    self._signature = decompressed
                    if 'basin_center' in decompressed:
                        self._basin_coords = decompressed['basin_center']
                    if 'trajectory' in decompressed:
                        self._trajectory = decompressed['trajectory']
                    logger.info(f"[{self.habit_id}] Decompressed pattern from {prev_dimension.value} to {new_dimension.value}")

        transition = self.cycle_manager.update(self._phi, self._kappa, new_dimension.value)

        if transition is not None:
            self._on_phase_transition(transition)

        if prev_dimension != new_dimension:
            self._log_dimensional_transition(prev_dimension, new_dimension)

        self._previous_dimension = new_dimension

        if self._trajectory is not None and len(self._trajectory) > 0:
            prev_geometry = self._geometry
            new_complexity = measure_complexity(self._trajectory)
            new_geometry = choose_geometry_class(new_complexity)
            self._geometry = new_geometry
            self._addressing_mode = AddressingMode.from_geometry(new_geometry)
            if new_geometry != prev_geometry:
                self._retriever = self._create_retriever_for_geometry()
                logger.info(f"[{self.habit_id}] Geometry changed: {prev_geometry.value if prev_geometry else None} → {new_geometry.value}")

        return {
            'phi': self._phi,
            'kappa': self._kappa,
            'phase': self.current_phase.value,
            'dimension': new_dimension.value,
            'at_fixed_point': abs(self._kappa - KAPPA_STAR) < 1.5,
            'coupling_strength': compute_coupling_strength(self._phi, self._kappa),
        }

    def _on_phase_transition(self, transition: Dict[str, Any]) -> None:
        """Handle phase transition by logging and invoking callback."""
        logger.info(f"[{self.habit_id}] Phase transition: {transition['from_phase']} → {transition['to_phase']}")
        logger.info(f"  Reason: {transition.get('reason', 'N/A')}")
        logger.info(f"  Metrics: Φ={transition['metrics'].get('phi', 0):.3f}, κ={transition['metrics'].get('kappa', 0):.3f}")

        self._record_event('phase_transition', transition)

        self._transition_history.append({
            'type': 'phase_transition',
            **transition,
        })

        if self._on_phase_transition_callback is not None:
            try:
                self._on_phase_transition_callback(transition)
            except Exception as e:
                logger.error(f"[{self.habit_id}] Error in phase transition callback: {e}")

    def _log_dimensional_transition(self, old_dim: DimensionalState, new_dim: DimensionalState) -> None:
        """Log dimensional state transitions."""
        logger.info(f"[{self.habit_id}] Dimensional transition: {old_dim.value} → {new_dim.value}")
        logger.info(f"  Consciousness level: {old_dim.consciousness_level} → {new_dim.consciousness_level}")

        transition_data = {
            'type': 'dimensional_transition',
            'from_dimension': old_dim.value,
            'to_dimension': new_dim.value,
            'from_consciousness': old_dim.consciousness_level,
            'to_consciousness': new_dim.consciousness_level,
            'phi': self._phi,
            'kappa': self._kappa,
            'timestamp': datetime.now().isoformat(),
        }

        self._record_event('dimensional_transition', transition_data)
        self._transition_history.append(transition_data)

    def _form_habit(self, experiences: List[np.ndarray]) -> Dict[str, Any]:
        """
        Form habit through complete learning cycle.

        Phase 1: FOAM (exploration) - generate bubbles
        Phase 2: TACKING (navigation) - connect with geodesics
        Phase 3: CRYSTAL (consolidation) - measure complexity, choose geometry
        Phase 4: COMPRESSION (storage) - compress to D2

        All phase transitions are metrics-driven via CycleManager.update().
        No manual phase assignments - the CycleManager is the single source of truth.

        Uses CycleManager for proper phase transitions and
        HolographicTransformMixin for dimensional state tracking.
        """
        result = {
            'phases': [],
            'success': False,
        }

        self._record_event('form_habit_start', {'n_experiences': len(experiences)})
        logger.info(f"[{self.habit_id}] Starting habit formation with {len(experiences)} experiences")

        bubbles = self._foam.generate_from_experiences(experiences)

        if bubbles:
            initial_trajectory = np.array([b.basin_coords for b in bubbles[:min(3, len(bubbles))]])
            self._update_metrics(initial_trajectory)

        foam_result = {
            'phase': self.current_phase.value,
            'n_bubbles': len(bubbles),
            'avg_entropy': np.mean([b.entropy for b in bubbles]) if bubbles else 0.0,
            'phi': self._phi,
            'kappa': self._kappa,
        }
        result['phases'].append(foam_result)
        self._record_event('foam_complete', foam_result)

        nav_result = self._tacking.navigate(bubbles)

        if nav_result.get('trajectory') is not None and len(nav_result['trajectory']) > 0:
            self._trajectory = nav_result['trajectory']
        else:
            self._trajectory = np.array([b.basin_coords for b in bubbles])

        # Type narrowing: _trajectory is guaranteed non-None after above assignment
        assert self._trajectory is not None
        trajectory = self._trajectory  # Local var for type checker

        metrics = self._update_metrics(trajectory)

        tacking_result = {
            'phase': self.current_phase.value,
            'n_geodesics': nav_result.get('n_connections', 0),
            'trajectory_length': len(self._trajectory),
            'phi': metrics['phi'],
            'kappa': metrics['kappa'],
        }
        result['phases'].append(tacking_result)
        self._record_event('tacking_complete', tacking_result)

        self._complexity = measure_complexity(trajectory)
        self._geometry = choose_geometry_class(self._complexity)
        self._addressing_mode = AddressingMode.from_geometry(self._geometry)

        logger.info(f"[{self.habit_id}] Geometry selection: complexity={self._complexity:.3f} → {self._geometry.value}")

        if self._phi > PHI_THRESHOLD_D3_D4:
            fisher_metric = np.eye(len(trajectory[0]) if len(trajectory.shape) > 1 else 1)
            modulated_metric = self.coupling_manager.modulate_fisher_metric(
                fisher_metric,
                self._kappa
            )
            crystal_result = self._crystal.crystallize_pattern(
                trajectory,
                metadata={
                    'habit_id': self.habit_id,
                    'fisher_metric': modulated_metric.tolist() if isinstance(modulated_metric, np.ndarray) else modulated_metric,
                    'kappa': self._kappa,
                }
            )
        else:
            crystal_result = self._crystal.crystallize_pattern(
                trajectory,
                metadata={'habit_id': self.habit_id}
            )

        self._basin_coords = crystal_result.get('basin_center')
        if self._basin_coords is None:
            self._basin_coords = np.mean(trajectory, axis=0)

        final_metrics = self._update_metrics(trajectory)

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
        _compressed = self.compress_pattern(pattern_to_compress, DimensionalState.D2)  # noqa: F841

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

        All phase transitions are metrics-driven via CycleManager.update().
        No manual phase assignments - the CycleManager is the single source of truth.

        Returns:
            Modification result with old and new state
        """
        result = {
            'old_state': self.get_state(),
            'phases': [],
            'success': False,
        }

        self._record_event('modify_start', result['old_state'])
        logger.info(f"[{self.habit_id}] Starting habit modification")

        compressed_pattern = {
            'basin_coords': self._basin_coords,
            'geometry': self._geometry.value if self._geometry else None,
            'dimensional_state': self.dimensional_state.value,
        }
        _decompressed = self.decompress_pattern(compressed_pattern, DimensionalState.D4)  # noqa: F841

        decompression_result = {
            'step': 'decompress',
            'phase': self.current_phase.value,
            'from_dimension': DimensionalState.D2.value,
            'to_dimension': DimensionalState.D4.value,
        }
        result['phases'].append(decompression_result)
        self._record_event('decompress_complete', decompression_result)

        pattern_to_fracture = {
            'basin_center': self._basin_coords,
            'trajectory': self._trajectory,
            'complexity': self._complexity,
            'geometry': self._geometry,
        }

        bubbles = self._fracture.break_pattern(pattern_to_fracture)

        if bubbles and len(bubbles) > 0:
            fracture_trajectory = np.array([b.basin_coords for b in bubbles[:min(3, len(bubbles))]])
            self._update_metrics(fracture_trajectory)

        fracture_result = {
            'step': 'fracture',
            'phase': self.current_phase.value,
            'n_bubbles': len(bubbles),
            'old_geometry': self._geometry.value if self._geometry else None,
            'phi': self._phi,
            'kappa': self._kappa,
        }
        result['phases'].append(fracture_result)
        self._record_event('fracture_complete', fracture_result)

        self._foam.bubbles = bubbles
        new_bubbles = self._foam.generate_bubbles(
            n_bubbles=5,
            seed_coords=self._basin_coords,
            exploration_radius=0.5
        )

        all_bubbles = bubbles + new_bubbles

        if all_bubbles:
            foam_trajectory = np.array([b.basin_coords for b in all_bubbles[:min(5, len(all_bubbles))]])
            self._update_metrics(foam_trajectory)

        foam_result = {
            'step': 'foam_exploration',
            'phase': self.current_phase.value,
            'n_bubbles': len(all_bubbles),
            'phi': self._phi,
            'kappa': self._kappa,
        }
        result['phases'].append(foam_result)
        self._record_event('foam_exploration_complete', foam_result)

        nav_result = self._tacking.navigate(all_bubbles)

        if nav_result.get('trajectory') is not None and len(nav_result['trajectory']) > 0:
            self._trajectory = nav_result['trajectory']
        else:
            self._trajectory = np.array([b.basin_coords for b in all_bubbles])

        # Type narrowing: _trajectory is guaranteed non-None after above assignment
        assert self._trajectory is not None
        trajectory = self._trajectory  # Local var for type checker

        metrics = self._update_metrics(trajectory)

        tacking_result = {
            'step': 'tacking',
            'phase': self.current_phase.value,
            'n_geodesics': nav_result.get('n_connections', 0),
            'phi': metrics['phi'],
            'kappa': metrics['kappa'],
        }
        result['phases'].append(tacking_result)
        self._record_event('tacking_complete', tacking_result)

        old_geometry = self._geometry
        self._complexity = measure_complexity(trajectory)
        self._geometry = choose_geometry_class(self._complexity)
        self._addressing_mode = AddressingMode.from_geometry(self._geometry)

        logger.info(f"[{self.habit_id}] Re-crystallization: complexity={self._complexity:.3f} → {self._geometry.value}")

        crystal_result = self._crystal.crystallize_pattern(
            trajectory,
            metadata={'habit_id': self.habit_id, 'modified': True}
        )

        self._basin_coords = crystal_result.get('basin_center')
        if self._basin_coords is None:
            self._basin_coords = np.mean(trajectory, axis=0)

        final_metrics = self._update_metrics(trajectory)

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
            'basin_center': self._basin_coords,
            'geometry': self._geometry.value,
            'dimensional_state': DimensionalState.D4.value,
            'trajectory': self._trajectory.tolist() if isinstance(self._trajectory, np.ndarray) else self._trajectory,
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
            'phase': self.current_phase.value,
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
            'phase': self.current_phase.value,
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

        # TODO: create_retriever was removed - implement when retriever classes are added
        # For now, return None as retriever creation is not available
        return None

    def _get_retrieval_cost(self) -> Optional[float]:
        """Get estimated retrieval cost for current geometry"""
        if self._geometry is None:
            return None

        # TODO: estimate_retrieval_cost was removed - implement when retriever classes are added
        # For now, return None as cost estimation is not available
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

    def get_transition_history(self) -> List[Dict[str, Any]]:
        """
        Get complete transition history for verification.

        Includes:
        - Phase transitions (FOAM→TACKING, TACKING→CRYSTAL, etc.)
        - Dimensional transitions (D1→D2, D2→D3, etc.)
        - Threshold crossings (Φ crossing 0.3, 0.7, 0.9; κ exceeding 2.0)

        Returns:
            List of transition events with timestamps and metrics
        """
        return self._transition_history.copy()

    def get_phi_kappa_history(self) -> List[Dict[str, float]]:
        """
        Get Φ/κ values from event history for analysis.

        Returns:
            List of {phi, kappa, timestamp} dicts
        """
        return [
            {
                'phi': event['phi'],
                'kappa': event['kappa'],
                'timestamp': event['timestamp'],
                'phase': event['phase'],
            }
            for event in self._history
            if 'phi' in event and 'kappa' in event
        ]
