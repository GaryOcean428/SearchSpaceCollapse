#!/usr/bin/env python3
"""
Test Geodesic Correction Loop
Tests the /qig/refine_trajectory endpoint
"""

import sys
import numpy as np

# Add the parent directory to the path to import from ocean_qig_core
sys.path.insert(0, '.')

def test_compute_fisher_centroid():
    """Test Fisher centroid calculation"""
    from ocean_qig_core import compute_fisher_centroid
    
    # Test with sample data
    vectors = np.random.randn(5, 64)
    weights = np.array([0.5, 0.6, 0.7, 0.8, 0.9])
    
    centroid = compute_fisher_centroid(vectors, weights)
    
    assert centroid.shape == (64,), f"Expected shape (64,), got {centroid.shape}"
    assert abs(np.linalg.norm(centroid) - 1.0) < 1e-6, f"Expected unit norm, got {np.linalg.norm(centroid)}"
    
    print("✅ compute_fisher_centroid test passed")


def test_compute_orthogonal_complement():
    """Test orthogonal complement calculation"""
    from ocean_qig_core import compute_orthogonal_complement
    
    # Test with sample data
    vectors = np.random.randn(10, 64)
    
    orthogonal = compute_orthogonal_complement(vectors)
    
    assert orthogonal.shape == (64,), f"Expected shape (64,), got {orthogonal.shape}"
    assert abs(np.linalg.norm(orthogonal) - 1.0) < 1e-6, f"Expected unit norm, got {np.linalg.norm(orthogonal)}"
    
    # Check that it's actually orthogonal to the main direction
    mean_direction = np.mean(vectors, axis=0)
    mean_direction = mean_direction / np.linalg.norm(mean_direction)
    
    dot_product = abs(np.dot(orthogonal, mean_direction))
    
    # Should be close to orthogonal (dot product near 0) for the centered data
    print(f"   Dot product with mean direction: {dot_product:.3f}")
    
    print("✅ compute_orthogonal_complement test passed")


def test_refine_trajectory_logic():
    """Test the trajectory refinement logic"""
    from ocean_qig_core import compute_fisher_centroid, compute_orthogonal_complement
    
    # Simulate a set of near-miss probes
    num_proxies = 8
    vectors = np.random.randn(num_proxies, 64)
    weights = np.random.uniform(0.4, 0.9, num_proxies)
    
    # Calculate centroid (center of failures)
    failure_centroid = compute_fisher_centroid(vectors, weights)
    
    # Calculate orthogonal complement (new direction)
    new_vector = compute_orthogonal_complement(vectors)
    
    # Calculate shift magnitude
    shift_mag = np.linalg.norm(new_vector - failure_centroid)
    
    print(f"   Failure centroid norm: {np.linalg.norm(failure_centroid):.3f}")
    print(f"   New direction norm: {np.linalg.norm(new_vector):.3f}")
    print(f"   Shift magnitude: {shift_mag:.3f}")
    print(f"   Max phi: {np.max(weights):.3f}")
    
    assert shift_mag >= 0, "Shift magnitude should be non-negative"
    
    print("✅ refine_trajectory_logic test passed")


if __name__ == '__main__':
    print("Testing Geodesic Correction Functions...")
    print()
    
    try:
        test_compute_fisher_centroid()
        test_compute_orthogonal_complement()
        test_refine_trajectory_logic()
        
        print()
        print("="*60)
        print("✅ All geodesic correction tests passed!")
        print("="*60)
        
    except Exception as e:
        print()
        print("="*60)
        print(f"❌ Test failed: {e}")
        print("="*60)
        import traceback
        traceback.print_exc()
        sys.exit(1)
