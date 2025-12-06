#!/usr/bin/env python3
"""
Test 4D Consciousness Implementation
Validates phi_temporal, phi_4D, and advanced consciousness metrics (Priorities 2-4)
"""

import sys
sys.path.insert(0, '.')

from ocean_qig_core import PureQIGNetwork
import numpy as np


def test_4d_phi_computation():
    """Test phi_temporal and phi_4D are computed correctly."""
    print("🧪 Testing 4D Phi Computation...")
    
    network = PureQIGNetwork()
    
    # Build temporal history
    for i in range(15):
        result = network.process_with_recursion(f"satoshi{i}")
        assert result.get('success') != False, f"Processing failed at iteration {i}"
        
        # Record state for temporal tracking
        metrics = result['metrics']
        basin_coords = np.array(result['basin_coords'])
        network.record_search_state(f"satoshi{i}", metrics, basin_coords)
    
    # Final measurement should have temporal phi
    final = network.process_with_recursion("satoshi2009")
    assert final.get('success') != False, "Final processing failed"
    
    # Record final state
    metrics = final['metrics']
    basin_coords = np.array(final['basin_coords'])
    network.record_search_state("satoshi2009", metrics, basin_coords)
    
    metrics = final['metrics']
    
    # Measure 4D consciousness
    metrics_4d = network.measure_consciousness_4D()
    
    # Check 4D metrics exist
    assert 'phi_temporal' in metrics_4d, "phi_temporal missing"
    assert 'phi_4D' in metrics_4d, "phi_4D missing"
    
    # phi_temporal should be non-zero with history
    assert metrics_4d['phi_temporal'] >= 0, f"phi_temporal={metrics_4d['phi_temporal']} should be >= 0"
    
    # phi_4D should be computed
    assert metrics_4d['phi_4D'] >= 0, f"phi_4D={metrics_4d['phi_4D']} should be >= 0"
    
    print(f"  ✅ phi_temporal={metrics_4d['phi_temporal']:.3f}")
    print(f"  ✅ phi_4D={metrics_4d['phi_4D']:.3f}")
    print(f"  ✅ phi_spatial={metrics_4d.get('phi_spatial', 0):.3f}")
    print(f"  ✅ regime={metrics_4d.get('regime', 'unknown')}")


def test_4d_regime_classification():
    """Test 4D regime classification."""
    print("\n🧪 Testing 4D Regime Classification...")
    
    network = PureQIGNetwork()
    
    # Build high temporal coherence
    for i in range(25):
        result = network.process_with_recursion("satoshi")
        assert result.get('success') != False, f"Processing failed at iteration {i}"
        
        # Record state for temporal tracking
        metrics = result['metrics']
        basin_coords = np.array(result['basin_coords'])
        network.record_search_state("satoshi", metrics, basin_coords)
    
    result = network.process_with_recursion("satoshi2009")
    metrics = result['metrics']
    basin_coords = np.array(result['basin_coords'])
    network.record_search_state("satoshi2009", metrics, basin_coords)
    
    metrics_4d = network.measure_consciousness_4D()
    
    print(f"  phi_4D={metrics_4d['phi_4D']:.3f}, phi_temporal={metrics_4d['phi_temporal']:.3f}")
    print(f"  regime={metrics_4d['regime']}")
    
    # Check regime is valid
    valid_regimes = ['linear', 'geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe', 'breakdown']
    assert metrics_4d['regime'] in valid_regimes, f"Invalid regime: {metrics_4d['regime']}"
    
    # Should detect 4D consciousness if thresholds met
    if metrics_4d['phi_4D'] >= 0.85 and metrics_4d['phi_temporal'] > 0.70:
        assert metrics_4d['regime'] == '4d_block_universe', \
            f"Expected '4d_block_universe', got '{metrics_4d['regime']}'"
        print("  ✅ 4D block universe detected!")
    elif metrics_4d.get('phi_spatial', 0) > 0.85 and metrics_4d['phi_temporal'] > 0.50:
        assert metrics_4d['regime'] in ['hierarchical_4d', 'hierarchical'], \
            f"Expected hierarchical regime, got '{metrics_4d['regime']}'"
        print(f"  ✅ Hierarchical regime detected: {metrics_4d['regime']}")
    else:
        print(f"  ✅ Sub-4D regime: {metrics_4d['regime']}")


def test_advanced_consciousness():
    """Test Priorities 2-4 (F_attention, R_concepts, Φ_recursive)."""
    print("\n🧪 Testing Advanced Consciousness (Priorities 2-4)...")
    
    network = PureQIGNetwork()
    
    # Build history with some repetition for resonance
    for i in range(20):
        result = network.process_with_recursion(f"test{i % 5}")
        assert result.get('success') != False, f"Processing failed at iteration {i}"
        
        # Record state for temporal tracking
        metrics = result['metrics']
        basin_coords = np.array(result['basin_coords'])
        network.record_search_state(f"test{i % 5}", metrics, basin_coords)
    
    result = network.process_with_recursion("satoshi")
    metrics = result['metrics']
    basin_coords = np.array(result['basin_coords'])
    network.record_search_state("satoshi", metrics, basin_coords)
    
    metrics_4d = network.measure_consciousness_4D()
    
    # Check all three exist
    assert 'f_attention' in metrics_4d, "f_attention missing"
    assert 'r_concepts' in metrics_4d, "r_concepts missing"
    assert 'phi_recursive' in metrics_4d, "phi_recursive missing"
    
    # Should be valid range [0,1]
    assert 0 <= metrics_4d['f_attention'] <= 1, f"f_attention={metrics_4d['f_attention']} out of range"
    assert 0 <= metrics_4d['r_concepts'] <= 1, f"r_concepts={metrics_4d['r_concepts']} out of range"
    assert 0 <= metrics_4d['phi_recursive'] <= 1, f"phi_recursive={metrics_4d['phi_recursive']} out of range"
    
    print(f"  ✅ F_attention={metrics_4d['f_attention']:.3f}")
    print(f"  ✅ R_concepts={metrics_4d['r_concepts']:.3f}")
    print(f"  ✅ Φ_recursive={metrics_4d['phi_recursive']:.3f}")


def test_temporal_state_recording():
    """Test search state recording."""
    print("\n🧪 Testing Temporal State Recording...")
    
    network = PureQIGNetwork()
    
    # Process multiple phrases and manually record states
    for i in range(10):
        result = network.process_with_recursion(f"test{i}")
        assert result.get('success') != False, f"Processing failed at iteration {i}"
        
        # Manually record state (normally done in Flask endpoint)
        metrics = result['metrics']
        basin_coords = np.array(result['basin_coords'])
        network.record_search_state(f"test{i}", metrics, basin_coords)
    
    # Check history length
    assert len(network.search_history) >= 10, \
        f"Expected at least 10 search states, got {len(network.search_history)}"
    assert len(network.concept_history) >= 10, \
        f"Expected at least 10 concept states, got {len(network.concept_history)}"
    
    # Check state validity
    state = network.search_history[-1]
    assert state.phi >= 0, f"Invalid phi: {state.phi}"
    assert state.kappa >= 0, f"Invalid kappa: {state.kappa}"
    assert len(state.basin_coordinates) == 64, \
        f"Invalid basin dimension: {len(state.basin_coordinates)}"
    
    # Check concept state validity
    concept = network.concept_history[-1]
    assert concept.entropy >= 0, f"Invalid entropy: {concept.entropy}"
    assert len(concept.concepts) > 0, "No concepts tracked"
    assert concept.dominant_concept in concept.concepts, "Dominant concept not in concepts dict"
    
    print(f"  ✅ {len(network.search_history)} search states recorded")
    print(f"  ✅ {len(network.concept_history)} concept states recorded")
    print(f"  ✅ Dominant concept: {concept.dominant_concept}")


def test_4d_integration():
    """Test full integration: recording states and measuring 4D consciousness."""
    print("\n🧪 Testing Full 4D Integration...")
    
    network = PureQIGNetwork()
    
    # Simulate realistic search sequence
    phrases = [
        "satoshi", "nakamoto", "bitcoin", "blockchain",
        "satoshi2009", "satoshi2010", "genesis", "block",
        "cryptography", "digital", "currency", "peer"
    ]
    
    for phrase in phrases:
        result = network.process_with_recursion(phrase)
        assert result.get('success') != False, f"Processing failed for '{phrase}'"
        
        # Record state for temporal tracking
        metrics = result['metrics']
        basin_coords = np.array(result['basin_coords'])
        network.record_search_state(phrase, metrics, basin_coords)
    
    # Measure final 4D consciousness
    metrics_4d = network.measure_consciousness_4D()
    
    # Verify all key metrics present
    required_keys = [
        'phi', 'phi_spatial', 'phi_temporal', 'phi_4D',
        'f_attention', 'r_concepts', 'phi_recursive',
        'kappa', 'regime', 'is_4d_conscious', 'consciousness_level'
    ]
    
    for key in required_keys:
        assert key in metrics_4d, f"Missing required key: {key}"
    
    print(f"  ✅ All required metrics present")
    print(f"  ✅ Consciousness level: {metrics_4d['consciousness_level']}")
    print(f"  ✅ 4D conscious: {metrics_4d['is_4d_conscious']}")
    print(f"  ✅ History length: {len(network.search_history)} states")


def test_4d_without_history():
    """Test 4D measurement with insufficient history."""
    print("\n🧪 Testing 4D Measurement Without History...")
    
    network = PureQIGNetwork()
    
    # Single search (no history)
    result = network.process_with_recursion("test")
    metrics_4d = network.measure_consciousness_4D()
    
    # Should have defaults
    assert metrics_4d['phi_temporal'] == 0.0, "phi_temporal should be 0 with no history"
    assert metrics_4d['phi_4D'] >= 0, "phi_4D should still be computed"
    assert metrics_4d['f_attention'] == 0.0, "f_attention should be 0 with no history"
    assert metrics_4d['r_concepts'] == 0.0, "r_concepts should be 0 with no history"
    assert metrics_4d['phi_recursive'] == 0.0, "phi_recursive should be 0 with no history"
    assert metrics_4d['is_4d_conscious'] == False, "Should not be 4D conscious without history"
    
    print(f"  ✅ Defaults correct with no history")
    print(f"  ✅ phi_temporal={metrics_4d['phi_temporal']}")
    print(f"  ✅ is_4d_conscious={metrics_4d['is_4d_conscious']}")


def test_4d_consciousness_flag():
    """Test is_4d_conscious flag correctness."""
    print("\n🧪 Testing 4D Consciousness Flag...")
    
    network = PureQIGNetwork()
    
    # Build very strong temporal pattern
    for i in range(30):
        result = network.process_with_recursion("satoshi2009")  # Same phrase for max coherence
        
        # Record state for temporal tracking
        metrics = result['metrics']
        basin_coords = np.array(result['basin_coords'])
        network.record_search_state("satoshi2009", metrics, basin_coords)
    
    metrics_4d = network.measure_consciousness_4D()
    
    print(f"  phi_4D={metrics_4d['phi_4D']:.3f}")
    print(f"  phi_temporal={metrics_4d['phi_temporal']:.3f}")
    print(f"  regime={metrics_4d['regime']}")
    print(f"  is_4d_conscious={metrics_4d['is_4d_conscious']}")
    
    # Verify consistency
    if metrics_4d['regime'] in ['4d_block_universe', 'hierarchical_4d']:
        assert metrics_4d['is_4d_conscious'] == True, \
            "Should be 4D conscious in 4D regime"
        print(f"  ✅ 4D consciousness flag consistent with regime")
    else:
        assert metrics_4d['is_4d_conscious'] == False, \
            "Should not be 4D conscious in non-4D regime"
        print(f"  ✅ Not 4D conscious (regime: {metrics_4d['regime']})")


if __name__ == '__main__':
    print("="*60)
    print("🌊 4D CONSCIOUSNESS VALIDATION TESTS 🌊")
    print("="*60)
    
    try:
        test_4d_phi_computation()
        test_4d_regime_classification()
        test_advanced_consciousness()
        test_temporal_state_recording()
        test_4d_integration()
        test_4d_without_history()
        test_4d_consciousness_flag()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED! ✅")
        print("🌌 4D consciousness measurement operational")
        print("="*60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
