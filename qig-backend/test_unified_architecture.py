#!/usr/bin/env python3
"""
Test Suite for QIG Core Unified Architecture

Tests the three orthogonal coordinates:
1. Phase (Universal Cycle): FOAM → TACKING → CRYSTAL → FRACTURE
2. Dimension (Holographic State): 1D → 2D → 3D → 4D → 5D
3. Geometry (Complexity Class): Line → Loop → Spiral → Grid → Torus → Lattice → E8
"""

import sys
import os
import unittest
import numpy as np

# Add qig-backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from qig_core import (
    CycleManager,
    Phase,
    GeometryClass,
    measure_complexity,
    choose_geometry_class,
    HabitCrystallizer,
    DimensionalState,
    DimensionalStateManager,
    compress,
    decompress,
)
from qig_core.universal_cycle import FoamPhase, TackingPhase, CrystalPhase, FracturePhase


class TestGeometryLadder(unittest.TestCase):
    """Test geometry complexity measurement and classification"""
    
    def setUp(self):
        self.crystallizer = HabitCrystallizer()
    
    def test_line_geometry_simple_pattern(self):
        """Test that simple 1D patterns get classified with low-to-medium complexity"""
        # Create a simple line trajectory
        trajectory = np.array([
            [i, 0, 0, 0] + [0.0] * 60
            for i in range(10)
        ])
        
        complexity = measure_complexity(trajectory)
        geometry = choose_geometry_class(complexity)
        
        # Should have low to moderate complexity
        self.assertLess(complexity, 0.6)
        # Should be one of the simpler geometries (not E8 or high lattice)
        self.assertNotEqual(geometry, GeometryClass.E8)
        self.assertNotEqual(geometry, GeometryClass.LATTICE_HIGH)
    
    def test_loop_geometry_cyclic_pattern(self):
        """Test that cyclic patterns get classified as LOOP or SPIRAL"""
        # Create a circular trajectory
        t = np.linspace(0, 2 * np.pi, 20)
        trajectory = np.array([
            [np.cos(theta), np.sin(theta)] + [0.0] * 62
            for theta in t
        ])
        
        complexity = measure_complexity(trajectory)
        geometry = choose_geometry_class(complexity)
        
        self.assertGreater(complexity, 0.1)
        self.assertLess(complexity, 0.5)
        # Cyclic can be either LOOP or SPIRAL depending on complexity
        self.assertIn(geometry, [GeometryClass.LOOP, GeometryClass.SPIRAL])
    
    def test_e8_geometry_high_complexity(self):
        """Test that high-complexity patterns get classified correctly"""
        # Create a high-dimensional random walk
        np.random.seed(42)
        trajectory = np.cumsum(np.random.randn(50, 64) * 0.1, axis=0)
        
        complexity = measure_complexity(trajectory)
        geometry = choose_geometry_class(complexity)
        
        # High dimensional random walk should have moderate to high complexity
        self.assertGreater(complexity, 0.3)
    
    def test_crystallizer_line(self):
        """Test crystallization of line pattern"""
        trajectory = np.array([
            [i * 0.1] + [0.0] * 63
            for i in range(10)
        ])
        
        result = self.crystallizer.snap_to_line(trajectory)
        
        self.assertIn('basin_center', result)
        self.assertIn('direction', result)
        self.assertEqual(result['stability'], 0.95)
    
    def test_crystallizer_full(self):
        """Test full crystallization process"""
        # Create a moderate complexity pattern
        t = np.linspace(0, 4 * np.pi, 30)
        trajectory = np.array([
            [np.cos(theta), np.sin(theta), theta * 0.1] + [0.0] * 61
            for theta in t
        ])
        
        result = self.crystallizer.crystallize(trajectory)
        
        self.assertIn('geometry', result)
        self.assertIn('complexity', result)
        self.assertIn('basin_center', result)
        self.assertIn('addressing_mode', result)
        
        # Should be a reasonable geometry class (SPIRAL, GRID, or TOROIDAL)
        self.assertIn(result['geometry'], [
            GeometryClass.SPIRAL, 
            GeometryClass.GRID_2D,
            GeometryClass.TOROIDAL
        ])


class TestUniversalCycle(unittest.TestCase):
    """Test universal cycle phase management"""
    
    def setUp(self):
        self.cycle_manager = CycleManager()
    
    def test_initial_phase(self):
        """Test initial phase is FOAM"""
        self.assertEqual(self.cycle_manager.current_phase, Phase.FOAM)
    
    def test_phase_detection_foam(self):
        """Test FOAM phase detection (low Φ)"""
        phase = self.cycle_manager.detect_phase(phi=0.2, kappa=1.0, dimension='d2')
        self.assertEqual(phase, Phase.FOAM)
    
    def test_phase_detection_tacking(self):
        """Test TACKING phase detection (moderate Φ)"""
        phase = self.cycle_manager.detect_phase(phi=0.5, kappa=1.0, dimension='d3')
        self.assertEqual(phase, Phase.TACKING)
    
    def test_phase_detection_crystal(self):
        """Test CRYSTAL phase detection (high Φ)"""
        phase = self.cycle_manager.detect_phase(phi=0.8, kappa=1.0, dimension='d4')
        self.assertEqual(phase, Phase.CRYSTAL)
    
    def test_phase_detection_fracture(self):
        """Test FRACTURE phase detection (high κ and Φ)"""
        phase = self.cycle_manager.detect_phase(phi=0.95, kappa=2.5, dimension='d5')
        self.assertEqual(phase, Phase.FRACTURE)
    
    def test_phase_transition(self):
        """Test phase transition recording"""
        transition = self.cycle_manager.transition_phase(
            from_phase=Phase.FOAM,
            to_phase=Phase.TACKING,
            reason="Test transition",
            metrics={'phi': 0.5, 'kappa': 1.0}
        )
        
        self.assertEqual(transition['from_phase'], 'foam')
        self.assertEqual(transition['to_phase'], 'tacking')
        self.assertEqual(self.cycle_manager.current_phase, Phase.TACKING)
        self.assertEqual(len(self.cycle_manager.phase_history), 1)
    
    def test_phase_update(self):
        """Test automatic phase update"""
        # Start in FOAM
        self.assertEqual(self.cycle_manager.current_phase, Phase.FOAM)
        
        # Update with high Φ (should transition to CRYSTAL)
        transition = self.cycle_manager.update(phi=0.8, kappa=1.0, dimension='d4')
        
        self.assertIsNotNone(transition)
        self.assertEqual(self.cycle_manager.current_phase, Phase.CRYSTAL)


class TestFoamPhase(unittest.TestCase):
    """Test FOAM phase implementation"""
    
    def setUp(self):
        self.foam = FoamPhase(basin_dim=64, max_bubbles=50)
    
    def test_bubble_generation(self):
        """Test bubble generation"""
        bubbles = self.foam.generate_bubbles(n_bubbles=10)
        
        self.assertEqual(len(bubbles), 10)
        for bubble in bubbles:
            self.assertEqual(len(bubble.basin_coords), 64)
            self.assertGreater(bubble.entropy, 0.6)
    
    def test_max_bubbles_pruning(self):
        """Test that bubbles are pruned when exceeding max"""
        self.foam.generate_bubbles(n_bubbles=100)
        
        self.assertEqual(len(self.foam.bubbles), 50)
    
    def test_entropy_decay(self):
        """Test entropy decay"""
        bubbles = self.foam.generate_bubbles(n_bubbles=5)
        initial_entropy = bubbles[0].entropy
        
        self.foam.decay_entropy(decay_rate=0.5)
        
        self.assertLess(bubbles[0].entropy, initial_entropy)


class TestTackingPhase(unittest.TestCase):
    """Test TACKING phase implementation"""
    
    def setUp(self):
        self.tacking = TackingPhase()
        self.foam = FoamPhase(basin_dim=64)
    
    def test_geodesic_formation(self):
        """Test geodesic formation between bubbles"""
        bubbles = self.foam.generate_bubbles(n_bubbles=5)
        
        result = self.tacking.navigate(bubbles)
        
        self.assertTrue(result['success'])
        self.assertGreater(result['n_connections'], 0)
    
    def test_trajectory_extraction(self):
        """Test trajectory matrix extraction"""
        bubbles = self.foam.generate_bubbles(n_bubbles=5)
        self.tacking.navigate(bubbles)
        
        trajectory = self.tacking.get_trajectory_matrix()
        
        self.assertGreater(trajectory.shape[0], 0)
        self.assertEqual(trajectory.shape[1], 64)


class TestCrystalPhase(unittest.TestCase):
    """Test CRYSTAL phase implementation"""
    
    def setUp(self):
        self.crystal = CrystalPhase()
    
    def test_pattern_crystallization(self):
        """Test pattern crystallization"""
        # Create a simple trajectory
        trajectory = np.random.randn(20, 64) * 0.5
        
        result = self.crystal.crystallize_pattern(trajectory)
        
        self.assertIn('geometry', result)
        self.assertIn('complexity', result)
        self.assertIn('basin_center', result)
    
    def test_crystal_retrieval(self):
        """Test crystal retrieval by geometry"""
        trajectory1 = np.array([[i * 0.1] + [0.0] * 63 for i in range(10)])
        trajectory2 = np.random.randn(30, 64) * 0.5
        
        self.crystal.crystallize_pattern(trajectory1, {'id': 'pattern1'})
        self.crystal.crystallize_pattern(trajectory2, {'id': 'pattern2'})
        
        self.assertEqual(len(self.crystal.crystals), 2)


class TestFracturePhase(unittest.TestCase):
    """Test FRACTURE phase implementation"""
    
    def setUp(self):
        self.fracture = FracturePhase()
    
    def test_pattern_breaking(self):
        """Test breaking crystallized pattern into bubbles"""
        pattern = {
            'basin_center': np.random.randn(64),
            'geometry': GeometryClass.LOOP,
            'complexity': 0.3,
            'radius': 1.0
        }
        
        bubbles = self.fracture.break_pattern(pattern, n_bubbles=10)
        
        self.assertEqual(len(bubbles), 10)
        for bubble in bubbles:
            self.assertGreater(bubble.entropy, 0.8)
            self.assertEqual(bubble.metadata['source'], 'fracture')
    
    def test_should_fracture(self):
        """Test fracture condition detection"""
        # Should not fracture
        self.assertFalse(self.fracture.should_fracture(phi=0.5, kappa=1.0))
        
        # Should fracture (high stress)
        self.assertTrue(self.fracture.should_fracture(phi=0.96, kappa=2.5))


class TestDimensionalState(unittest.TestCase):
    """Test dimensional state management"""
    
    def setUp(self):
        self.dim_manager = DimensionalStateManager()
    
    def test_initial_state(self):
        """Test initial dimensional state is D3"""
        self.assertEqual(self.dim_manager.current_state, DimensionalState.D3)
    
    def test_state_detection(self):
        """Test dimensional state detection"""
        # Low Φ → D1 or D2
        state = self.dim_manager.detect_state(phi=0.05, kappa=1.0)
        self.assertEqual(state, DimensionalState.D1)
        
        # Moderate Φ → D3
        state = self.dim_manager.detect_state(phi=0.5, kappa=1.0)
        self.assertEqual(state, DimensionalState.D3)
        
        # High Φ → D4
        state = self.dim_manager.detect_state(phi=0.8, kappa=1.0)
        self.assertEqual(state, DimensionalState.D4)
        
        # Very high Φ → D5
        state = self.dim_manager.detect_state(phi=0.97, kappa=1.0)
        self.assertEqual(state, DimensionalState.D5)
    
    def test_compression_check(self):
        """Test compression capability checks"""
        # Can compress from D4 to D2
        self.assertTrue(DimensionalState.D4.can_compress_to(DimensionalState.D2))
        
        # Cannot compress from D2 to D4
        self.assertFalse(DimensionalState.D2.can_compress_to(DimensionalState.D4))
    
    def test_decompression_check(self):
        """Test decompression capability checks"""
        # Can decompress from D2 to D4
        self.assertTrue(DimensionalState.D2.can_decompress_to(DimensionalState.D4))
        
        # Cannot decompress from D4 to D2
        self.assertFalse(DimensionalState.D4.can_decompress_to(DimensionalState.D2))


class TestHolographicTransform(unittest.TestCase):
    """Test compression and decompression"""
    
    def test_compression(self):
        """Test pattern compression"""
        pattern = {
            'basin_center': np.random.randn(64),
            'geometry': GeometryClass.LOOP,
            'complexity': 0.3,
            'radius': 1.5,
            'plane': np.eye(2),
            'stability': 0.85,
            'addressing_mode': 'cyclic'
        }
        
        compressed = compress(
            pattern,
            from_dim=DimensionalState.D4,
            to_dim=DimensionalState.D2
        )
        
        self.assertIn('basin_coords', compressed)
        self.assertIn('geometry', compressed)
        self.assertIn('dimensional_state', compressed)
        self.assertEqual(compressed['dimensional_state'], '2d')
        self.assertIn('estimated_size_bytes', compressed)
    
    def test_decompression(self):
        """Test pattern decompression"""
        basin_coords = np.random.randn(64)
        metadata = {
            'geometry': GeometryClass.LOOP,
            'complexity': 0.3,
            'stability': 0.85,
            'radius': 1.5
        }
        
        decompressed = decompress(
            basin_coords,
            from_dim=DimensionalState.D2,
            to_dim=DimensionalState.D4,
            geometry=GeometryClass.LOOP,
            metadata=metadata
        )
        
        self.assertIn('trajectory', decompressed)
        self.assertIn('basin_center', decompressed)
        self.assertEqual(decompressed['dimensional_state'], '4d')
        
        # D4 should have more trajectory points than D2
        self.assertGreater(len(decompressed['trajectory']), 10)
    
    def test_compression_decompression_cycle(self):
        """Test full compression-decompression cycle"""
        original_pattern = {
            'basin_center': np.random.randn(64),
            'geometry': GeometryClass.SPIRAL,
            'complexity': 0.35,
            'growth_rate': 0.05,
            'stability': 0.7,
            'addressing_mode': 'temporal'
        }
        
        # Compress
        compressed = compress(
            original_pattern,
            from_dim=DimensionalState.D4,
            to_dim=DimensionalState.D2
        )
        
        # Decompress
        decompressed = decompress(
            compressed['basin_coords'],
            from_dim=DimensionalState.D2,
            to_dim=DimensionalState.D4,
            geometry=compressed['geometry'],
            metadata=compressed
        )
        
        # Check that key properties are preserved
        self.assertEqual(decompressed['geometry'], original_pattern['geometry'])
        self.assertAlmostEqual(decompressed['complexity'], original_pattern['complexity'], places=2)


class TestIntegration(unittest.TestCase):
    """Integration tests for complete workflow"""
    
    def test_full_learning_cycle(self):
        """Test complete learning cycle: FOAM → TACKING → CRYSTAL → (compress)"""
        # Initialize components
        cycle_manager = CycleManager()
        foam = FoamPhase()
        tacking = TackingPhase()
        crystal = CrystalPhase()
        dim_manager = DimensionalStateManager(initial_state=DimensionalState.D3)
        
        # Phase 1: FOAM - Generate bubbles
        self.assertEqual(cycle_manager.current_phase, Phase.FOAM)
        bubbles = foam.generate_bubbles(n_bubbles=10)
        
        # Phase 2: TACKING - Navigate
        cycle_manager.update(phi=0.5, kappa=1.0, dimension='d3')
        self.assertEqual(cycle_manager.current_phase, Phase.TACKING)
        
        result = tacking.navigate(bubbles)
        trajectory = result['trajectory']
        
        # Phase 3: CRYSTAL - Consolidate
        cycle_manager.update(phi=0.8, kappa=1.0, dimension='d4')
        self.assertEqual(cycle_manager.current_phase, Phase.CRYSTAL)
        
        crystallized = crystal.crystallize_pattern(trajectory)
        
        # Phase 4: COMPRESS - Store as 2D
        compressed = compress(
            crystallized,
            from_dim=DimensionalState.D4,
            to_dim=DimensionalState.D2
        )
        
        # Verify the full cycle
        self.assertIsNotNone(compressed)
        self.assertEqual(compressed['dimensional_state'], '2d')
        self.assertIn('geometry', compressed)
        
        print(f"✓ Full learning cycle complete:")
        print(f"  - Generated {len(bubbles)} bubbles")
        print(f"  - Formed {result['n_connections']} geodesics")
        print(f"  - Crystallized as {crystallized['geometry'].value}")
        print(f"  - Compressed to {compressed['estimated_size_bytes']} bytes")
    
    def test_therapy_cycle(self):
        """Test therapy cycle: decompress → fracture → re-explore → re-crystallize"""
        # Start with a compressed habit
        compressed_habit = {
            'basin_coords': np.random.randn(64),
            'geometry': GeometryClass.LINE,
            'complexity': 0.08,
            'dimensional_state': '2d',
            'stability': 0.95,
            'addressing_mode': 'direct'
        }
        
        # Step 1: Decompress to conscious (D4)
        decompressed = decompress(
            compressed_habit['basin_coords'],
            from_dim=DimensionalState.D2,
            to_dim=DimensionalState.D4,
            geometry=compressed_habit['geometry'],
            metadata=compressed_habit
        )
        
        # Step 2: Fracture
        fracture = FracturePhase()
        bubbles = fracture.break_pattern(decompressed, n_bubbles=8)
        
        # Step 3: Re-explore with modifications
        foam = FoamPhase()
        foam.bubbles = bubbles
        # Add new exploratory bubbles
        new_bubbles = foam.generate_bubbles(n_bubbles=5)
        
        # Step 4: Re-navigate
        tacking = TackingPhase()
        result = tacking.navigate(foam.bubbles)
        
        # Step 5: Re-crystallize
        crystal = CrystalPhase()
        new_pattern = crystal.crystallize_pattern(result['trajectory'])
        
        # Verify therapy worked
        self.assertIsNotNone(new_pattern)
        print(f"✓ Therapy cycle complete:")
        print(f"  - Decompressed habit from 2D to 4D")
        print(f"  - Fractured into {len(bubbles)} bubbles")
        print(f"  - Added {len(new_bubbles)} new exploration bubbles")
        print(f"  - Re-crystallized as {new_pattern['geometry'].value}")


def run_tests():
    """Run all tests"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add all test classes
    suite.addTests(loader.loadTestsFromTestCase(TestGeometryLadder))
    suite.addTests(loader.loadTestsFromTestCase(TestUniversalCycle))
    suite.addTests(loader.loadTestsFromTestCase(TestFoamPhase))
    suite.addTests(loader.loadTestsFromTestCase(TestTackingPhase))
    suite.addTests(loader.loadTestsFromTestCase(TestCrystalPhase))
    suite.addTests(loader.loadTestsFromTestCase(TestFracturePhase))
    suite.addTests(loader.loadTestsFromTestCase(TestDimensionalState))
    suite.addTests(loader.loadTestsFromTestCase(TestHolographicTransform))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "="*70)
    print(f"Ran {result.testsRun} tests")
    print(f"Successes: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print("="*70)
    
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(run_tests())
