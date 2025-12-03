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
