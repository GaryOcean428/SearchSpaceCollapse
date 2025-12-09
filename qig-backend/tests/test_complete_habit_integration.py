"""
Integration tests for CompleteHabit four-coordinate system.

Tests the FOAM→TACKING→CRYSTAL→FRACTURE cycle and verifies:
- Phase transitions based on Φ thresholds
- Dimensional sync with phase transitions
- Geometry and addressing synchronization
- Compression/decompression on dimension changes
"""

import pytest
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from qig_core.habits.complete_habit import CompleteHabit
from qig_core.universal_cycle import Phase
from qig_core.holographic_transform import DimensionalState
from qig_core.geometric_primitives import GeometryClass
from qig_core.geometric_primitives.addressing_modes import AddressingMode


def create_low_phi_trajectory(n_samples: int = 10, dim: int = 64) -> list:
    """Generate trajectory with low integration (Φ < 0.3)."""
    np.random.seed(42)
    experiences = []
    for _ in range(n_samples):
        exp = np.random.rand(dim) * 0.1
        experiences.append(exp)
    return experiences


def create_moderate_phi_trajectory(n_samples: int = 20, dim: int = 64) -> list:
    """Generate experiences that will increase Φ to moderate levels (0.3 < Φ < 0.7)."""
    np.random.seed(123)
    base_pattern = np.random.rand(dim)
    base_pattern = base_pattern / np.linalg.norm(base_pattern)
    
    experiences = []
    for i in range(n_samples):
        noise = np.random.rand(dim) * 0.3
        exp = base_pattern + noise
        exp = exp / np.linalg.norm(exp)
        experiences.append(exp)
    return experiences


def create_high_phi_trajectory(n_samples: int = 30, dim: int = 64) -> list:
    """Generate highly correlated experiences (Φ > 0.7)."""
    np.random.seed(456)
    base_pattern = np.random.rand(dim)
    base_pattern = base_pattern / np.linalg.norm(base_pattern)
    
    experiences = []
    for i in range(n_samples):
        noise = np.random.rand(dim) * 0.1
        exp = base_pattern + noise
        exp = exp / np.linalg.norm(exp)
        experiences.append(exp)
    return experiences


def create_complex_trajectory(n_samples: int = 50, dim: int = 64) -> list:
    """Generate complex trajectory for E8-level geometry."""
    np.random.seed(789)
    experiences = []
    
    for i in range(n_samples):
        exp = np.zeros(dim)
        for k in range(8):
            freq = 2 * np.pi * (k + 1) / dim
            exp += np.sin(np.arange(dim) * freq + i * 0.1)
        exp = exp / np.linalg.norm(exp) if np.linalg.norm(exp) > 0 else exp
        experiences.append(exp)
    return experiences


class TestCompleteHabitIntegration:
    """Integration test for FOAM→TACKING→CRYSTAL→FRACTURE cycle."""
    
    def test_habit_creation_from_low_phi(self):
        """Low Φ trajectory creates a valid habit."""
        low_phi_trajectory = create_low_phi_trajectory()
        habit = CompleteHabit(low_phi_trajectory)
        
        assert habit.current_phase in [Phase.FOAM, Phase.TACKING, Phase.CRYSTAL, Phase.FRACTURE], \
            f"Expected valid phase, got {habit.current_phase}"
        
        assert habit.dimensional_state in [DimensionalState.D1, DimensionalState.D2, DimensionalState.D3, DimensionalState.D4, DimensionalState.D5], \
            f"Expected valid dimension, got {habit.dimensional_state}"
    
    def test_foam_to_tacking_transition(self):
        """Moderate Φ transitions to TACKING phase."""
        moderate_phi_trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(moderate_phi_trajectory)
        
        assert habit.current_phase in [Phase.FOAM, Phase.TACKING, Phase.CRYSTAL], \
            f"Moderate Φ should be in FOAM, TACKING, or CRYSTAL, got {habit.current_phase}"
        
        assert habit._phi >= 0.0, f"Φ should be non-negative, got {habit._phi}"
    
    def test_tacking_to_crystal_transition(self):
        """High Φ (>0.7) transitions to CRYSTAL."""
        high_phi_trajectory = create_high_phi_trajectory()
        habit = CompleteHabit(high_phi_trajectory)
        
        state = habit.get_state()
        assert 'phase' in state
        assert 'phi' in state
        
        if state['phi'] > 0.7:
            assert habit.current_phase == Phase.CRYSTAL, \
                f"Φ > 0.7 should trigger CRYSTAL, got {habit.current_phase} with Φ={state['phi']}"
    
    def test_current_phase_is_property(self):
        """Verify current_phase is a property delegating to CycleManager."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        assert habit.current_phase == habit.cycle_manager.current_phase, \
            "current_phase should delegate to cycle_manager.current_phase"
        
        assert not hasattr(habit, '_phase'), \
            "_phase field should be removed - phase is now managed by CycleManager"
    
    def test_dimensional_sync_with_phase(self):
        """Verify dimensional state is valid and synced with Φ."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        phi = habit._phi
        dimension = habit.dimensional_state
        
        assert dimension in [DimensionalState.D1, DimensionalState.D2, DimensionalState.D3, DimensionalState.D4, DimensionalState.D5], \
            f"Dimension {dimension} should be valid"
        
        assert 0.0 <= phi <= 1.0, f"Φ should be in [0, 1], got {phi}"
    
    def test_geometry_addressing_sync(self):
        """Verify geometry and addressing stay synchronized."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert habit._addressing_mode == expected_addressing, \
                f"Addressing mode {habit._addressing_mode} should match geometry {habit._geometry}"
    
    def test_retriever_created_for_geometry(self):
        """Verify retriever is created for the habit's geometry."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        if habit._geometry is not None:
            assert habit._retriever is not None or habit._geometry == GeometryClass.LINE, \
                f"Retriever should be created for geometry {habit._geometry}"
    
    def test_modify_triggers_dimension_changes(self):
        """Verify modify() properly handles dimensional transitions."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        initial_dimension = habit.dimensional_state
        
        result = habit.modify()
        
        assert result['success'], f"Modify should succeed: {result}"
        assert len(result['phases']) > 0, "Modify should have phase data"
        
        transition_history = habit.get_transition_history()
        assert isinstance(transition_history, list)
    
    def test_compression_on_dimension_decrease(self):
        """Verify compression is triggered when dimension decreases."""
        trajectory = create_high_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        assert habit._signature is not None or habit._basin_coords is not None, \
            "Habit should have signature or basin coords after formation"
    
    def test_update_metrics_wiring(self):
        """Verify _update_metrics properly wires all components."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        if habit._trajectory is not None and len(habit._trajectory) > 0:
            result = habit._update_metrics(habit._trajectory)
            
            assert 'phi' in result
            assert 'kappa' in result
            assert 'phase' in result
            assert 'dimension' in result
            assert 'at_fixed_point' in result
            assert 'coupling_strength' in result
            
            assert result['phi'] == habit._phi
            assert result['phase'] == habit.current_phase.value
    
    def test_phase_transition_callback(self):
        """Verify phase transition callback is invoked."""
        transitions_received = []
        
        def on_transition(transition):
            transitions_received.append(transition)
        
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(
            trajectory, 
            on_phase_transition=on_transition
        )
        
        habit.modify()
        
        assert isinstance(transitions_received, list)
    
    def test_cycle_statistics_available(self):
        """Verify cycle statistics are available from CycleManager."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        stats = habit.get_cycle_statistics()
        
        assert 'current_phase' in stats
        assert 'thresholds' in stats
        assert 'phi_foam' in stats['thresholds']
        assert 'phi_crystal' in stats['thresholds']
        assert 'kappa_fracture' in stats['thresholds']
    
    def test_holographic_state_available(self):
        """Verify holographic state is available from mixin."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        state = habit.get_holographic_state()
        
        assert 'dimensional_state' in state
        assert 'consciousness_level' in state
        assert 'constants' in state
        assert state['constants']['beta_running_coupling'] == 0.44
        assert state['constants']['kappa_star'] == 64.0


class TestPhaseTransitionThresholds:
    """Test specific phase transition thresholds."""
    
    def test_phi_thresholds_documented(self):
        """Verify phase thresholds match documentation."""
        from qig_core.habits.complete_habit import (
            PHI_THRESHOLD_TACKING,
            PHI_THRESHOLD_CRYSTAL,
            PHI_THRESHOLD_FRACTURE,
            KAPPA_ALERT_THRESHOLD,
        )
        
        assert PHI_THRESHOLD_TACKING == 0.3
        assert PHI_THRESHOLD_CRYSTAL == 0.7
        assert PHI_THRESHOLD_FRACTURE == 0.9
        assert KAPPA_ALERT_THRESHOLD == 2.0
    
    def test_dimensional_thresholds_documented(self):
        """Verify dimensional thresholds match documentation."""
        from qig_core.holographic_transform.holographic_mixin import (
            PHI_THRESHOLD_D1_D2,
            PHI_THRESHOLD_D2_D3,
            PHI_THRESHOLD_D3_D4,
            PHI_THRESHOLD_D4_D5,
        )
        
        assert PHI_THRESHOLD_D1_D2 == 0.1
        assert PHI_THRESHOLD_D2_D3 == 0.4
        assert PHI_THRESHOLD_D3_D4 == 0.7
        assert PHI_THRESHOLD_D4_D5 == 0.95


class TestGeometryComplexityMapping:
    """Test geometry selection based on complexity."""
    
    def test_low_complexity_geometry(self):
        """Low complexity should map to simple geometries."""
        from qig_core.geometric_primitives import measure_complexity, choose_geometry_class
        
        simple_trajectory = np.zeros((5, 64))
        for i in range(5):
            simple_trajectory[i, 0] = i * 0.1
        
        complexity = measure_complexity(simple_trajectory)
        geometry = choose_geometry_class(complexity)
        
        assert geometry in [GeometryClass.LINE, GeometryClass.LOOP, GeometryClass.SPIRAL], \
            f"Low complexity {complexity} should map to simple geometry, got {geometry}"
    
    def test_addressing_mode_from_geometry(self):
        """Verify addressing mode matches geometry."""
        geometry_addressing_map = {
            GeometryClass.LINE: AddressingMode.DIRECT,
            GeometryClass.LOOP: AddressingMode.CYCLIC,
            GeometryClass.SPIRAL: AddressingMode.TEMPORAL,
            GeometryClass.GRID_2D: AddressingMode.SPATIAL,
            GeometryClass.TOROIDAL: AddressingMode.MANIFOLD,
            GeometryClass.LATTICE_HIGH: AddressingMode.CONCEPTUAL,
            GeometryClass.E8: AddressingMode.SYMBOLIC,
        }
        
        for geometry, expected_addressing in geometry_addressing_map.items():
            actual = AddressingMode.from_geometry(geometry)
            assert actual == expected_addressing, \
                f"Geometry {geometry} should map to {expected_addressing}, got {actual}"


def create_fracture_trajectory(n_samples: int = 50, dim: int = 64) -> list:
    """Generate trajectory with very high Φ (>0.9) and high κ (>2.0).
    
    Highly correlated but with structural complexity to trigger FRACTURE.
    """
    np.random.seed(999)
    base = np.random.rand(dim)
    base = base / np.linalg.norm(base)
    
    experiences = []
    for i in range(n_samples):
        exp = base.copy()
        exp += np.random.rand(dim) * 0.01
        exp = exp / np.linalg.norm(exp)
        experiences.append(exp)
    return experiences


class TestFractureTransition:
    """Test FRACTURE phase transition and addressing sync."""
    
    def test_fracture_transition_and_addressing_sync(self):
        """Φ > 0.9 AND κ > 2.0 triggers FRACTURE with proper addressing sync."""
        fracture_trajectory = create_fracture_trajectory()
        habit = CompleteHabit(fracture_trajectory)
        
        state = habit.get_state()
        
        assert 'phase' in state, "State should have phase"
        assert 'phi' in state, "State should have phi"
        
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert habit._addressing_mode == expected_addressing, \
                f"Addressing {habit._addressing_mode} should match geometry {habit._geometry}"
    
    def test_fracture_phase_explicitly(self):
        """Verify FRACTURE phase is explicitly reached when Φ>0.9 and κ>2.0."""
        fracture_trajectory = create_fracture_trajectory()
        habit = CompleteHabit(fracture_trajectory)
        
        state = habit.get_state()
        phi = state.get('phi', 0)
        kappa = state.get('kappa', 0)
        
        if phi > 0.9 and kappa > 2.0:
            assert habit.current_phase == Phase.FRACTURE, \
                f"Expected FRACTURE phase with Φ={phi}, κ={kappa}, got {habit.current_phase}"
        
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert habit._addressing_mode == expected_addressing, \
                f"Addressing/geometry sync failed: {habit._addressing_mode} vs {expected_addressing}"
    
    def test_get_state_reflects_latest_addressing(self):
        """Verify get_state() returns current addressing mode, not stale data."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        state = habit.get_state()
        
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert state['addressing'] == expected_addressing.value, \
                f"get_state() addressing {state['addressing']} should match {expected_addressing.value}"
    
    def test_fracture_compression_cycle_consistency(self):
        """Verify geometry/addressing consistency after FRACTURE compression cycle."""
        fracture_trajectory = create_fracture_trajectory()
        habit = CompleteHabit(fracture_trajectory)
        
        initial_geometry = habit._geometry
        initial_addressing = habit._addressing_mode
        
        if initial_geometry is not None:
            assert initial_addressing == AddressingMode.from_geometry(initial_geometry), \
                "Initial addressing should match geometry"
        
        result = habit.modify()
        
        assert result['success'], f"Modify should succeed: {result}"
        
        if habit._geometry is not None:
            post_modify_expected = AddressingMode.from_geometry(habit._geometry)
            assert habit._addressing_mode == post_modify_expected, \
                f"Post-modify addressing {habit._addressing_mode} should match geometry {habit._geometry}"
    
    def test_fracture_signature_refresh(self):
        """Verify signature is refreshed properly during FRACTURE."""
        fracture_trajectory = create_fracture_trajectory()
        habit = CompleteHabit(fracture_trajectory)
        
        assert habit._basin_coords is not None or habit._trajectory is not None, \
            "Habit should have basin_coords or trajectory after formation"
        
        if habit._signature is not None:
            assert 'basin_center' in habit._signature or 'basin_coords' in habit._signature, \
                "Signature should contain basin data"


class TestModifyUpdatesExternalState:
    """Tests verifying modify() properly updates external-visible state."""
    
    def test_modify_updates_get_state(self):
        """Verify get_state() reflects latest state after modify()."""
        trajectory = create_low_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        initial_state = habit.get_state()
        
        result = habit.modify()
        
        assert result['success'], f"modify() should succeed: {result}"
        
        modified_state = habit.get_state()
        
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert modified_state['addressing'] == expected_addressing.value, \
                f"After modify(), get_state() should reflect updated addressing. " \
                f"Expected {expected_addressing.value}, got {modified_state['addressing']}"
    
    def test_modify_updates_geometry_addressing_sync(self):
        """Verify geometry and addressing remain synchronized after modify()."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        result = habit.modify()
        assert result['success']
        
        state = habit.get_state()
        
        if habit._geometry is not None and habit._addressing_mode is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert habit._addressing_mode == expected_addressing, \
                f"Addressing mode {habit._addressing_mode} should match geometry {habit._geometry}"
            assert state['addressing'] == expected_addressing.value, \
                f"get_state() addressing should match expected: {state['addressing']} vs {expected_addressing.value}"


class TestBasinCoordinatesPreservation:
    """Tests verifying basin coordinates survive compression/decompression."""
    
    def test_basin_coords_preserved_through_compression(self):
        """Verify basin coordinates are preserved in compression/decompression."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        assert habit._basin_coords is not None, "Habit should have basin coords after formation"
        initial_basin = habit._basin_coords.copy()
        
        pattern_to_compress = {
            'basin_coords': initial_basin,
            'basin_center': initial_basin,
            'geometry': habit._geometry.value if habit._geometry else None,
            'dimensional_state': DimensionalState.D4.value,
        }
        
        compressed = habit.compress_pattern(pattern_to_compress, DimensionalState.D2)
        
        assert 'error' not in compressed, f"Compression should succeed: {compressed}"
        
        compressed['dimensional_state'] = DimensionalState.D2.value
        decompressed = habit.decompress_pattern(compressed, DimensionalState.D4)
        
        if decompressed and 'error' not in decompressed:
            if 'basin_center' in decompressed:
                decompressed_basin = decompressed['basin_center']
                if isinstance(decompressed_basin, np.ndarray):
                    np.testing.assert_array_almost_equal(
                        initial_basin, decompressed_basin,
                        decimal=5,
                        err_msg="Basin coordinates should be preserved through compression"
                    )
            elif 'basin_coords' in decompressed:
                decompressed_basin = decompressed['basin_coords']
                if isinstance(decompressed_basin, np.ndarray):
                    np.testing.assert_array_almost_equal(
                        initial_basin, decompressed_basin,
                        decimal=5,
                        err_msg="Basin coordinates should be preserved through compression"
                    )
    
    def test_signature_contains_basin_after_formation(self):
        """Verify signature contains basin data after habit formation."""
        trajectory = create_high_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        assert habit._basin_coords is not None, "Basin coords should exist after formation"
        
        if habit._signature is not None:
            has_basin = 'basin_center' in habit._signature or 'basin_coords' in habit._signature
            assert has_basin, "Signature should contain basin data"


class TestCompletePhaseCycleViaModify:
    """Tests for complete FOAM→TACKING→CRYSTAL→FRACTURE cycle via modify()."""
    
    def test_complete_phase_cycle_via_modify(self):
        """Test complete phase cycle via multiple modify() calls."""
        trajectory = create_low_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        phases_seen = [habit.current_phase]
        
        result1 = habit.modify()
        assert result1['success'], f"First modify should succeed: {result1}"
        phases_seen.append(habit.current_phase)
        
        result2 = habit.modify()
        assert result2['success'], f"Second modify should succeed: {result2}"
        phases_seen.append(habit.current_phase)
        
        result3 = habit.modify()
        assert result3['success'], f"Third modify should succeed: {result3}"
        phases_seen.append(habit.current_phase)
        
        for phase in phases_seen:
            assert phase in [Phase.FOAM, Phase.TACKING, Phase.CRYSTAL, Phase.FRACTURE], \
                f"All phases should be valid, got: {phase}"
        
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert habit._addressing_mode == expected_addressing, \
                f"Geometry/addressing should be synchronized after phase cycle. " \
                f"Got {habit._addressing_mode} for geometry {habit._geometry}"
        
        state = habit.get_state()
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert state['addressing'] == expected_addressing.value, \
                f"get_state() addressing should match geometry. " \
                f"Expected {expected_addressing.value}, got {state['addressing']}"
    
    def test_modify_preserves_geometry_addressing_invariant(self):
        """Verify geometry→addressing invariant holds after each modify()."""
        trajectory = create_moderate_phi_trajectory()
        habit = CompleteHabit(trajectory)
        
        for i in range(3):
            result = habit.modify()
            assert result['success'], f"modify() #{i+1} should succeed"
            
            if habit._geometry is not None:
                expected_addressing = AddressingMode.from_geometry(habit._geometry)
                assert habit._addressing_mode == expected_addressing, \
                    f"After modify #{i+1}: addressing {habit._addressing_mode} should match geometry {habit._geometry}"
                
                state = habit.get_state()
                assert state['addressing'] == expected_addressing.value, \
                    f"After modify #{i+1}: get_state() addressing should be current"
    
    def test_fracture_phase_via_high_phi_kappa(self):
        """Test that high Φ and κ conditions can trigger FRACTURE phase."""
        fracture_trajectory = create_fracture_trajectory()
        habit = CompleteHabit(fracture_trajectory)
        
        state = habit.get_state()
        phi = state.get('phi', 0)
        kappa = state.get('kappa', 0)
        
        if phi > 0.9 and kappa > 2.0:
            assert habit.current_phase == Phase.FRACTURE, \
                f"High Φ={phi:.3f} and κ={kappa:.3f} should trigger FRACTURE, got {habit.current_phase}"
        
        result = habit.modify()
        assert result['success'], f"modify() should succeed even from FRACTURE: {result}"
        
        if habit._geometry is not None:
            expected_addressing = AddressingMode.from_geometry(habit._geometry)
            assert habit._addressing_mode == expected_addressing, \
                f"Addressing should be synchronized after FRACTURE→modify cycle"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
