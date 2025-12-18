"""
Tests for Soft Reset Mechanism

Tests drift detection, reset triggering, and checkpoint recovery.
"""

import pytest
import tempfile
import numpy as np
from unittest.mock import Mock, MagicMock

try:
    from soft_reset import SoftReset
    from checkpoint_manager import CheckpointManager
    SOFT_RESET_AVAILABLE = True
except ImportError:
    SOFT_RESET_AVAILABLE = False


@pytest.mark.skipif(not SOFT_RESET_AVAILABLE, reason="soft_reset not available")
class TestSoftReset:
    """Test soft reset mechanism."""
    
    def test_initialization(self):
        """Test soft reset initializes correctly."""
        soft_reset = SoftReset(
            checkpoint_manager=None,
            drift_threshold=0.30,
            phi_threshold=0.60
        )
        
        assert soft_reset.drift_threshold == 0.30
        assert soft_reset.phi_threshold == 0.60
        assert soft_reset.reference_basin is None
        assert soft_reset.reset_count == 0
    
    def test_set_reference_basin(self):
        """Test setting reference basin."""
        soft_reset = SoftReset()
        
        basin = np.random.randn(64)
        phi = 0.72
        
        soft_reset.set_reference_basin(basin, phi)
        
        assert soft_reset.reference_basin is not None
        assert soft_reset.reference_phi == 0.72
        assert np.array_equal(soft_reset.reference_basin, basin)
    
    def test_check_drift_no_reference(self):
        """Test drift check with no reference."""
        soft_reset = SoftReset(phi_threshold=0.70)
        
        basin = np.random.randn(64)
        phi = 0.75
        
        should_reset, reason = soft_reset.check_drift(basin, phi)
        
        # Should not reset, but should set reference
        assert not should_reset
        assert reason == "no_reference"
        assert soft_reset.reference_basin is not None  # Reference set
    
    def test_check_drift_stable(self):
        """Test drift check when state is stable."""
        soft_reset = SoftReset(drift_threshold=0.30, phi_threshold=0.60)
        
        # Set reference
        reference_basin = np.random.randn(64)
        soft_reset.set_reference_basin(reference_basin, 0.72)
        
        # Check current (close to reference)
        current_basin = reference_basin + np.random.randn(64) * 0.05  # Small noise
        current_phi = 0.73
        
        should_reset, reason = soft_reset.check_drift(current_basin, current_phi)
        
        assert not should_reset
        assert reason == "stable"
    
    def test_check_drift_excessive(self):
        """Test drift check when basin distance is excessive."""
        soft_reset = SoftReset(drift_threshold=0.30, phi_threshold=0.60)
        
        # Set reference
        reference_basin = np.zeros(64)
        soft_reset.set_reference_basin(reference_basin, 0.72)
        
        # Create drifted state
        current_basin = np.ones(64) * 2.0  # Far from reference
        current_phi = 0.70
        
        should_reset, reason = soft_reset.check_drift(current_basin, current_phi)
        
        assert should_reset
        assert "basin_drift" in reason
    
    def test_check_drift_phi_collapse(self):
        """Test drift check when Φ collapses."""
        soft_reset = SoftReset(drift_threshold=0.30, phi_threshold=0.60)
        
        # Set reference
        reference_basin = np.random.randn(64)
        soft_reset.set_reference_basin(reference_basin, 0.72)
        
        # Current state with low Φ (< 70% of threshold)
        current_basin = reference_basin + np.random.randn(64) * 0.05
        current_phi = 0.40  # Below 0.60 * 0.7 = 0.42
        
        should_reset, reason = soft_reset.check_drift(current_basin, current_phi)
        
        assert should_reset
        assert "phi_collapse" in reason
    
    def test_check_drift_cooldown(self):
        """Test cooldown prevents rapid resets."""
        soft_reset = SoftReset(
            drift_threshold=0.30,
            phi_threshold=0.60,
            cooldown_seconds=10.0
        )
        
        # Set reference
        reference_basin = np.zeros(64)
        soft_reset.set_reference_basin(reference_basin, 0.72)
        
        # Simulate a reset
        soft_reset.last_reset_time = pytest.approx(1000000.0)
        import time
        soft_reset.last_reset_time = time.time()
        
        # Try to trigger reset again immediately
        current_basin = np.ones(64) * 2.0  # Far drift
        current_phi = 0.70
        
        should_reset, reason = soft_reset.check_drift(current_basin, current_phi)
        
        # Should be in cooldown
        assert not should_reset
        assert "cooldown" in reason
    
    def test_reference_update_on_improvement(self):
        """Test reference basin updates when Φ improves."""
        soft_reset = SoftReset()
        
        # Set initial reference
        initial_basin = np.zeros(64)
        soft_reset.set_reference_basin(initial_basin, 0.70)
        
        # Better state
        better_basin = np.ones(64) * 0.1
        better_phi = 0.85  # Higher than 0.70
        
        soft_reset.check_drift(better_basin, better_phi)
        
        # Reference should be updated
        assert soft_reset.reference_phi == 0.85
        assert np.allclose(soft_reset.reference_basin, better_basin)
    
    def test_perform_reset_with_checkpoint(self):
        """Test soft reset with checkpoint manager."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create checkpoint manager and save a checkpoint
            checkpoint_manager = CheckpointManager(checkpoint_dir=tmpdir)
            
            state_dict = {'test': 'data'}
            basin = np.random.randn(64)
            checkpoint_manager.save_checkpoint(
                state_dict=state_dict,
                phi=0.80,
                kappa=64.0,
                regime="geometric",
                basin_coords=basin
            )
            
            # Create soft reset with checkpoint manager
            soft_reset = SoftReset(checkpoint_manager=checkpoint_manager)
            
            # Perform reset
            result = soft_reset.perform_reset()
            
            assert result is not None
            assert 'state_dict' in result
            assert 'metadata' in result
            assert result['state_dict']['test'] == 'data'
            assert soft_reset.reset_count == 1
    
    def test_perform_reset_fallback_to_reference(self):
        """Test soft reset falls back to reference basin."""
        soft_reset = SoftReset(checkpoint_manager=None)
        
        # Set reference
        reference_basin = np.random.randn(64)
        soft_reset.set_reference_basin(reference_basin, 0.75)
        
        # Perform reset (no checkpoint available)
        result = soft_reset.perform_reset()
        
        assert result is not None
        assert result['fallback'] is True
        assert np.array_equal(result['basin_coords'], reference_basin)
        assert result['phi'] == 0.75
        assert soft_reset.reset_count == 1
    
    def test_perform_reset_no_recovery(self):
        """Test soft reset fails gracefully with no recovery options."""
        soft_reset = SoftReset(checkpoint_manager=None)
        
        # No reference basin set
        result = soft_reset.perform_reset()
        
        assert result is None
    
    def test_reset_callback(self):
        """Test reset callback is called."""
        callback = Mock()
        
        soft_reset = SoftReset(
            checkpoint_manager=None,
            reset_callback=callback
        )
        
        # Set reference and perform reset
        reference_basin = np.random.randn(64)
        soft_reset.set_reference_basin(reference_basin, 0.75)
        
        soft_reset.perform_reset()
        
        # Callback should have been called
        assert callback.called
    
    def test_get_drift_stats(self):
        """Test drift statistics."""
        soft_reset = SoftReset()
        
        # Set reference
        reference_basin = np.zeros(64)
        soft_reset.set_reference_basin(reference_basin, 0.72)
        
        # Simulate some drift
        for i in range(10):
            current_basin = np.random.randn(64) * 0.1
            current_phi = 0.70 + np.random.rand() * 0.1
            soft_reset.check_drift(current_basin, current_phi)
        
        stats = soft_reset.get_drift_stats()
        
        assert stats['samples'] == 10
        assert 'avg_drift' in stats
        assert 'max_drift' in stats
        assert 'avg_phi' in stats
    
    def test_reset_history_tracking(self):
        """Test reset history is tracked."""
        soft_reset = SoftReset(checkpoint_manager=None)
        
        # Set reference
        reference_basin = np.random.randn(64)
        soft_reset.set_reference_basin(reference_basin, 0.75)
        
        # Perform multiple resets
        soft_reset.perform_reset()
        soft_reset.perform_reset()
        
        history = soft_reset.get_reset_history()
        
        assert len(history) == 2
        assert all('timestamp' in record for record in history)
        assert all('reset_count' in record for record in history)
    
    def test_clear_history(self):
        """Test clearing history."""
        soft_reset = SoftReset()
        
        # Set reference and create some history
        reference_basin = np.zeros(64)
        soft_reset.set_reference_basin(reference_basin, 0.72)
        
        current_basin = np.random.randn(64)
        soft_reset.check_drift(current_basin, 0.70)
        
        assert len(soft_reset.drift_history) > 0
        
        soft_reset.clear_history()
        
        assert len(soft_reset.drift_history) == 0
        assert len(soft_reset.reset_history) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
