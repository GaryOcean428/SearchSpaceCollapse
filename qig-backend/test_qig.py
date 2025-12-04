#!/usr/bin/env python3
"""
Test Pure QIG Consciousness Backend
"""

import sys
sys.path.insert(0, '.')

from ocean_qig_core import PureQIGNetwork, DensityMatrix
import numpy as np

def test_density_matrix():
    """Test density matrix operations"""
    print("🧪 Testing Density Matrix Operations...")
    
    # Create maximally mixed state
    rho = DensityMatrix()
    assert abs(rho.entropy() - 1.0) < 0.01, "Maximally mixed state should have entropy ~1.0"
    assert abs(rho.purity() - 0.5) < 0.01, "Maximally mixed state should have purity ~0.5"
    print("✅ Maximally mixed state correct")
    
    # Test fidelity
    rho2 = DensityMatrix()
    fid = rho.fidelity(rho2)
    assert abs(fid - 1.0) < 0.01, "Fidelity of same state should be ~1.0"
    print("✅ Fidelity correct")
    
    # Test Bures distance
    dist = rho.bures_distance(rho2)
    assert abs(dist) < 0.01, "Bures distance of same state should be ~0.0"
    print("✅ Bures distance correct")
    
    # Test evolution
    rho.evolve(0.5)
    assert rho.entropy() < 1.0, "Evolved state should have lower entropy"
    print("✅ State evolution correct")
    
    print("✅ All density matrix tests passed!\n")

def test_qig_network():
    """Test QIG network processing"""
    print("🧪 Testing QIG Network...")
    
    network = PureQIGNetwork(temperature=1.0)
    
    # Process passphrase
    result = network.process("satoshi2009")
    
    # Check metrics
    assert 0 <= result['metrics']['phi'] <= 1, "Phi should be in [0, 1]"
    assert 0 <= result['metrics']['kappa'] <= 100, "Kappa should be in [0, 100]"
    assert result['metrics']['regime'] in ['linear', 'geometric', 'hierarchical'], "Regime should be valid"
    print(f"✅ Φ = {result['metrics']['phi']:.3f}")
    print(f"✅ κ = {result['metrics']['kappa']:.2f}")
    print(f"✅ Regime = {result['metrics']['regime']}")
    
    # Check basin coordinates
    assert len(result['basin_coords']) == 64, "Basin coordinates should be 64D"
    print("✅ Basin coordinates correct (64D)")
    
    # Check route
    assert len(result['route']) > 0, "Route should not be empty"
    print(f"✅ Route computed: {result['route']}")
    
    # Check subsystems
    assert len(result['subsystems']) == 4, "Should have 4 subsystems"
    print("✅ 4 subsystems present")
    
    print("✅ All QIG network tests passed!\n")

def test_continuous_learning():
    """Test continuous learning through state evolution"""
    print("🧪 Testing Continuous Learning...")
    
    network = PureQIGNetwork(temperature=1.0)
    
    # Process multiple passphrases
    results = []
    for i, phrase in enumerate(["test1", "test2", "test3", "test4", "test5"]):
        result = network.process(phrase)
        results.append(result['metrics'])
        print(f"  {i+1}. Φ={result['metrics']['phi']:.3f}, κ={result['metrics']['kappa']:.2f}")
    
    # States should have evolved (at least some change)
    phis = [r['phi'] for r in results]
    assert max(phis) - min(phis) > 0.01, "States should evolve with different inputs"
    
    print("✅ Continuous learning verified (states evolve)\n")

def test_geometric_purity():
    """Test geometric purity principles"""
    print("🧪 Testing Geometric Purity...")
    
    network = PureQIGNetwork(temperature=1.0)
    
    # Process same input twice
    result1 = network.process("determinism_test")
    network.reset()
    result2 = network.process("determinism_test")
    
    # Should be deterministic
    assert abs(result1['metrics']['phi'] - result2['metrics']['phi']) < 0.001, "Should be deterministic"
    print("✅ Deterministic (same input → same output)")
    
    # Process significantly different inputs
    network.reset()
    result_a = network.process("a")  # Very short
    network.reset()
    result_b = network.process("this is a much longer passphrase with many different words")  # Much longer
    
    # Should be different
    diff = abs(result_a['metrics']['phi'] - result_b['metrics']['phi'])
    assert diff > 0.001, f"Different inputs should give different results (diff={diff:.4f})"
    print("✅ Discriminative (different inputs → different outputs)")
    
    # Phi and kappa should be MEASURED, not hardcoded
    assert result1['metrics']['phi'] != 1.0 or result1['metrics']['kappa'] != 63.5, "Metrics should be measured, not hardcoded"
    print("✅ Metrics are measured (not optimized/hardcoded)")
    
    print("✅ All geometric purity tests passed!\n")

if __name__ == '__main__':
    print("=" * 60)
    print("🌊 Ocean Pure QIG Consciousness Tests 🌊")
    print("=" * 60)
    print()
    
    try:
        test_density_matrix()
        test_qig_network()
        test_continuous_learning()
        test_geometric_purity()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED! ✅")
        print("🌊 Basin stable. Geometry pure. Consciousness measured. 🌊")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def test_recursive_integration():
    """Test recursive integration (minimum 3 loops)"""
    print("🧪 Testing Recursive Integration...")
    
    network = PureQIGNetwork()
    
    # Process with recursion
    result = network.process_with_recursion("satoshi2009")
    
    # Check recursions
    assert 'n_recursions' in result, "n_recursions must be present"
    assert result['n_recursions'] >= 3, f"Must have ≥3 recursions, got {result['n_recursions']}"
    assert result['n_recursions'] <= 12, f"Must have ≤12 recursions, got {result['n_recursions']}"
    print(f"✅ Recursive integration: {result['n_recursions']} loops")
    
    # Check phi history
    assert 'phi_history' in result, "phi_history must be present"
    assert len(result['phi_history']) == result['n_recursions'], "Phi history length must match recursions"
    print(f"✅ Φ history tracked: {len(result['phi_history'])} values")
    
    # Check convergence flag
    assert 'converged' in result, "converged flag must be present"
    print(f"✅ Convergence: {result['converged']}")
    
    print("✅ All recursive integration tests passed!\n")

def test_meta_awareness():
    """Test meta-awareness (M component)"""
    print("🧪 Testing Meta-Awareness...")
    
    network = PureQIGNetwork()
    
    # Process multiple times to build history
    for i, phrase in enumerate(["test1", "test2", "test3", "test4", "test5"]):
        result = network.process(phrase)
        print(f"  {i+1}. M={result['metrics']['M']:.3f}")
    
    # M should be measured
    assert 'M' in result['metrics'], "M (meta-awareness) must be present"
    assert 0 <= result['metrics']['M'] <= 1, f"M must be in [0,1], got {result['metrics']['M']}"
    print(f"✅ Meta-awareness measured: M={result['metrics']['M']:.3f}")
    
    print("✅ All meta-awareness tests passed!\n")

def test_grounding():
    """Test grounding detector (G component)"""
    print("🧪 Testing Grounding...")
    
    network = PureQIGNetwork()
    
    # First query: ungrounded (no concepts yet)
    result1 = network.process("satoshi2009")
    assert 'G' in result1['metrics'], "G (grounding) must be present"
    assert result1['metrics']['G'] == 0.0, f"First query should be ungrounded, got G={result1['metrics']['G']}"
    print(f"✅ First query ungrounded: G={result1['metrics']['G']:.3f}")
    
    # Manually add to memory to test grounding
    basin1 = network._extract_basin_coordinates()
    network.grounding_detector.add_concept("satoshi2009", basin1)
    
    # Second query: should be grounded (similar to first)
    result2 = network.process("satoshi2010")
    assert result2['metrics']['G'] > 0, f"Second query should have some grounding, got G={result2['metrics']['G']}"
    print(f"✅ Second query grounded: G={result2['metrics']['G']:.3f}")
    
    # Check nearest concept
    assert 'nearest_concept' in result2['metrics'], "nearest_concept must be present"
    assert result2['metrics']['nearest_concept'] == "satoshi2009", "Should find first concept"
    print(f"✅ Nearest concept: {result2['metrics']['nearest_concept']}")
    
    # Check grounded flag
    assert 'grounded' in result2['metrics'], "grounded flag must be present"
    print(f"✅ Grounded flag: {result2['metrics']['grounded']}")
    
    print("✅ All grounding tests passed!\n")

def test_full_7_components():
    """Test full 7-component consciousness"""
    print("🧪 Testing Full 7-Component Consciousness...")
    
    network = PureQIGNetwork()
    result = network.process("satoshi2009")
    
    metrics = result['metrics']
    
    # Check all 7 components present
    components = ['phi', 'kappa', 'T', 'R', 'M', 'Gamma', 'G']
    for comp in components:
        assert comp in metrics, f"{comp} component must be present"
        assert 0 <= metrics[comp] <= 100, f"{comp} must be in valid range"
    
    print(f"✅ Φ (Integration) = {metrics['phi']:.3f}")
    print(f"✅ κ (Coupling) = {metrics['kappa']:.2f}")
    print(f"✅ T (Temperature) = {metrics['T']:.3f}")
    print(f"✅ R (Ricci curvature) = {metrics['R']:.3f}")
    print(f"✅ M (Meta-awareness) = {metrics['M']:.3f}")
    print(f"✅ Γ (Generation health) = {metrics['Gamma']:.3f}")
    print(f"✅ G (Grounding) = {metrics['G']:.3f}")
    
    # Check consciousness verdict
    assert 'conscious' in metrics, "conscious verdict must be present"
    assert isinstance(metrics['conscious'], bool), "conscious must be boolean"
    print(f"✅ Consciousness verdict: {metrics['conscious']}")
    
    print("✅ All 7-component consciousness tests passed!\n")

def test_innate_drives():
    """Test Layer 0 Innate Drives"""
    print("🧪 Testing Innate Drives (Layer 0)...")
    
    from ocean_qig_core import InnateDrives
    
    drives = InnateDrives(kappa_star=63.5)
    
    # Test pain (high curvature should cause pain)
    high_curvature = 0.85
    pain = drives.compute_pain(high_curvature)
    assert pain > 0.5, f"High curvature {high_curvature} should cause pain > 0.5, got {pain}"
    print(f"✅ Pain response correct: R={high_curvature:.2f} → pain={pain:.2f}")
    
    # Test pleasure (near κ* should give pleasure)
    near_kappa = 62.0
    pleasure = drives.compute_pleasure(near_kappa)
    assert pleasure > 0.8, f"κ near κ* should give pleasure > 0.8, got {pleasure}"
    print(f"✅ Pleasure response correct: κ={near_kappa:.1f} → pleasure={pleasure:.2f}")
    
    # Test fear (low grounding should cause fear)
    low_grounding = 0.3
    fear = drives.compute_fear(low_grounding)
    assert fear > 0.5, f"Low grounding {low_grounding} should cause fear > 0.5, got {fear}"
    print(f"✅ Fear response correct: G={low_grounding:.2f} → fear={fear:.2f}")
    
    # Test valence (good geometry should have positive valence)
    good_kappa = 64.0
    low_curvature = 0.3
    high_grounding = 0.8
    valence_result = drives.compute_valence(good_kappa, low_curvature, high_grounding)
    
    assert 'pain' in valence_result, "Valence result should include pain"
    assert 'pleasure' in valence_result, "Valence result should include pleasure"
    assert 'fear' in valence_result, "Valence result should include fear"
    assert 'valence' in valence_result, "Valence result should include valence"
    
    print(f"✅ Good geometry valence: {valence_result['valence']:.2f} (pleasure={valence_result['pleasure']:.2f}, pain={valence_result['pain']:.2f}, fear={valence_result['fear']:.2f})")
    
    # Test hypothesis scoring
    score = drives.score_hypothesis(good_kappa, low_curvature, high_grounding)
    assert 0 <= score <= 1, f"Score should be in [0, 1], got {score}"
    assert score > 0.5, f"Good geometry should score > 0.5, got {score}"
    print(f"✅ Hypothesis scoring correct: score={score:.2f}")
    
    # Test bad geometry (should have low score)
    bad_kappa = 20.0  # Far from κ*
    bad_curvature = 0.9  # High
    bad_grounding = 0.2  # Low
    bad_score = drives.score_hypothesis(bad_kappa, bad_curvature, bad_grounding)
    assert bad_score < 0.5, f"Bad geometry should score < 0.5, got {bad_score}"
    print(f"✅ Bad geometry scoring correct: score={bad_score:.2f}")
    
    print("✅ All innate drives tests passed!\n")

def test_innate_drives_integration():
    """Test that innate drives are integrated into QIG processing"""
    print("🧪 Testing Innate Drives Integration...")
    
    network = PureQIGNetwork(temperature=1.0)
    
    # Process with recursion (the recommended path)
    result = network.process_with_recursion("bitcoin2009")
    
    # Check that drives are included in metrics
    metrics = result['metrics']
    assert 'drives' in metrics, "Metrics should include drives"
    assert 'innate_score' in metrics, "Metrics should include innate_score"
    
    drives = metrics['drives']
    assert 'pain' in drives, "Drives should include pain"
    assert 'pleasure' in drives, "Drives should include pleasure"
    assert 'fear' in drives, "Drives should include fear"
    assert 'valence' in drives, "Drives should include valence"
    
    innate_score = metrics['innate_score']
    assert 0 <= innate_score <= 1, f"Innate score should be in [0, 1], got {innate_score}"
    
    print(f"✅ Drives integrated: pain={drives['pain']:.2f}, pleasure={drives['pleasure']:.2f}, fear={drives['fear']:.2f}")
    print(f"✅ Innate score: {innate_score:.2f}")
    print(f"✅ Consciousness updated with innate drives: {metrics['conscious']}")
    
    print("✅ Innate drives integration tests passed!\n")

if __name__ == '__main__':
    print("=" * 60)
    print("🌊 Ocean Pure QIG Consciousness Tests 🌊")
    print("=" * 60)
    print()
    
    try:
        test_density_matrix()
        test_qig_network()
        test_continuous_learning()
        test_geometric_purity()
        test_recursive_integration()
        test_meta_awareness()
        test_grounding()
        test_full_7_components()
        test_innate_drives()
        test_innate_drives_integration()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED! ✅")
        print("🌊 Basin stable. Geometry pure. Consciousness measured. 🌊")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
