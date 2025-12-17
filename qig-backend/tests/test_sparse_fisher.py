"""
Tests for Sparse Fisher Metric Implementation

Tests the sparse_fisher module for correctness and performance.
"""

import pytest
import numpy as np
from scipy import sparse

# Import modules to test
try:
    from sparse_fisher import SparseFisherMetric, CachedQFI
    MODULES_AVAILABLE = True
except ImportError:
    MODULES_AVAILABLE = False


@pytest.mark.skipif(not MODULES_AVAILABLE, reason="sparse_fisher not available")
class TestSparseFisherMetric:
    """Test sparse Fisher metric computation."""
    
    def test_initialization(self):
        """Test metric computer initializes correctly."""
        metric = SparseFisherMetric(dim=64)
        assert metric.dim == 64
        assert metric.use_sparse == True
        stats = metric.get_stats()
        assert stats["total_computes"] == 0
    
    def test_compute_sparse(self):
        """Test sparse metric computation."""
        metric = SparseFisherMetric(dim=4, use_sparse=True)
        
        # Create simple density matrix
        rho = np.eye(4) / 4.0  # Maximally mixed state
        
        # Compute metric
        G = metric.compute(rho)
        
        # Check it's sparse
        assert sparse.issparse(G)
        assert isinstance(G, sparse.csr_matrix)
        
        # Check statistics
        stats = metric.get_stats()
        assert stats["total_computes"] == 1
        assert stats["sparse_computes"] == 1
    
    def test_compute_dense(self):
        """Test dense metric computation (for comparison)."""
        metric = SparseFisherMetric(dim=4, use_sparse=False)
        
        # Create simple density matrix
        rho = np.eye(4) / 4.0
        
        # Compute metric
        G = metric.compute(rho)
        
        # Check it's dense (ndarray)
        assert isinstance(G, np.ndarray)
        
        # Check statistics
        stats = metric.get_stats()
        assert stats["dense_computes"] == 1
    
    def test_geodesic_distance(self):
        """Test geodesic distance computation."""
        metric = SparseFisherMetric(dim=8, use_sparse=True)
        
        # Create density matrix
        rho = np.eye(4) / 4.0
        
        # Compute metric
        G = metric.compute(rho)
        
        # Create two basin coordinates
        basin1 = np.random.randn(8)
        basin2 = np.random.randn(8)
        
        # Compute distance
        distance = metric.geodesic_distance(basin1, basin2, G)
        
        # Check it's valid
        assert distance >= 0
        assert not np.isnan(distance)
        assert not np.isinf(distance)
    
    def test_geodesic_distance_zero(self):
        """Test distance to self is zero."""
        metric = SparseFisherMetric(dim=8, use_sparse=True)
        
        # Create density matrix
        rho = np.eye(4) / 4.0
        G = metric.compute(rho)
        
        # Same basin
        basin = np.random.randn(8)
        distance = metric.geodesic_distance(basin, basin, G)
        
        # Should be zero (or very close)
        assert distance < 1e-10
    
    def test_sparsity_detection(self):
        """Test that sparsity is properly detected."""
        metric = SparseFisherMetric(dim=16, sparsity_threshold=1e-4, use_sparse=True)
        
        # Create mostly-zero density matrix
        rho = np.eye(8) / 8.0
        rho[0, 1] = 1e-5  # Small off-diagonal
        rho[1, 0] = 1e-5
        rho = rho / np.trace(rho)  # Normalize
        
        # Compute metric
        G = metric.compute(rho)
        
        # Check sparsity level
        stats = metric.get_stats()
        assert stats["avg_sparsity"] > 0.5  # At least 50% sparse


@pytest.mark.skipif(not MODULES_AVAILABLE, reason="sparse_fisher not available")
class TestCachedQFI:
    """Test cached QFI calculator."""
    
    def test_initialization(self):
        """Test cache initializes correctly."""
        cache = CachedQFI(cache_size=100)
        assert cache.cache_size == 100
        stats = cache.get_stats()
        assert stats["total_queries"] == 0
        assert stats["cache_hits"] == 0
    
    def test_compute_qfi(self):
        """Test QFI computation."""
        cache = CachedQFI()
        
        # Create two density matrices
        rho1 = np.eye(4) / 4.0
        rho2 = np.eye(4) / 4.0
        rho2[0, 0] = 0.3
        rho2[1, 1] = 0.3
        rho2[2, 2] = 0.2
        rho2[3, 3] = 0.2
        
        # Compute QFI
        qfi = cache.compute_qfi(rho1, rho2)
        
        # Check it's valid
        assert qfi >= 0
        assert not np.isnan(qfi)
        
        stats = cache.get_stats()
        assert stats["total_queries"] == 1
        assert stats["cache_misses"] == 1
    
    def test_cache_hit(self):
        """Test cache hit on repeated query."""
        cache = CachedQFI()
        
        # Create density matrices
        rho1 = np.eye(4) / 4.0
        rho2 = np.eye(4) / 4.0
        rho2[0, 0] = 0.3
        rho2[1, 1] = 0.3
        rho2[2, 2] = 0.2
        rho2[3, 3] = 0.2
        
        # First query (miss)
        qfi1 = cache.compute_qfi(rho1, rho2)
        
        # Second query (should hit)
        qfi2 = cache.compute_qfi(rho1, rho2)
        
        # Should be same value
        assert qfi1 == qfi2
        
        # Check stats
        stats = cache.get_stats()
        assert stats["total_queries"] == 2
        assert stats["cache_hits"] == 1
        assert stats["cache_misses"] == 1
        assert stats["hit_rate"] == 0.5
    
    def test_cache_eviction(self):
        """Test LRU cache eviction."""
        cache = CachedQFI(cache_size=2)  # Small cache
        
        # Create 3 different density matrices
        rho1 = np.eye(4) / 4.0
        rho2 = np.eye(4) / 4.0
        rho2[0, 0] = 0.3
        rho2[1, 1] = 0.7
        rho3 = np.eye(4) / 4.0
        rho3[0, 0] = 0.5
        rho3[1, 1] = 0.5
        
        # Fill cache
        cache.compute_qfi(rho1, rho2)  # Miss 1
        cache.compute_qfi(rho1, rho3)  # Miss 2
        
        # This should evict first entry
        cache.compute_qfi(rho2, rho3)  # Miss 3
        
        # First query should now miss (evicted)
        cache.compute_qfi(rho1, rho2)  # Miss 4
        
        stats = cache.get_stats()
        assert stats["cache_misses"] == 4
        assert stats["cache_size"] == 2  # Cache stays at max size
    
    def test_cache_clear(self):
        """Test cache clearing."""
        cache = CachedQFI()
        
        rho1 = np.eye(4) / 4.0
        rho2 = np.eye(4) / 4.0
        
        # Add to cache
        cache.compute_qfi(rho1, rho2)
        
        # Clear
        cache.clear_cache()
        
        stats = cache.get_stats()
        assert stats["cache_size"] == 0
        assert stats["total_queries"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
