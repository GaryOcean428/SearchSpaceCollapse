"""
Tests for Checkpoint Manager

Tests Φ-based checkpoint ranking, pruning, and recovery.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import numpy as np

try:
    from checkpoint_manager import CheckpointManager
    CHECKPOINT_MANAGER_AVAILABLE = True
except ImportError:
    CHECKPOINT_MANAGER_AVAILABLE = False


@pytest.mark.skipif(not CHECKPOINT_MANAGER_AVAILABLE, reason="checkpoint_manager not available")
class TestCheckpointManager:
    """Test checkpoint manager."""
    
    def test_initialization(self):
        """Test manager initializes correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(checkpoint_dir=tmpdir, keep_top_k=5)
            assert manager.keep_top_k == 5
            assert len(manager.checkpoint_index) == 0
            stats = manager.get_stats()
            assert stats['total_checkpoints'] == 0
    
    def test_save_checkpoint(self):
        """Test saving checkpoint."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(checkpoint_dir=tmpdir, keep_top_k=5)
            
            # Create dummy state
            state_dict = {
                'subsystems': [{'activation': 0.5}],
                'attention': np.eye(4).tolist(),
            }
            basin_coords = np.random.randn(64)
            
            # Save checkpoint
            checkpoint_id = manager.save_checkpoint(
                state_dict=state_dict,
                phi=0.72,
                kappa=64.2,
                regime="geometric",
                basin_coords=basin_coords,
            )
            
            assert checkpoint_id is not None
            assert len(manager.checkpoint_index) == 1
            
            # Check stats
            stats = manager.get_stats()
            assert stats['total_checkpoints'] == 1
            assert stats['best_phi'] == 0.72
    
    def test_skip_low_phi(self):
        """Test skipping checkpoints with low Φ."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(
                checkpoint_dir=tmpdir,
                keep_top_k=5,
                phi_threshold_for_save=0.70
            )
            
            state_dict = {'test': 'data'}
            
            # Try to save with low Φ (should be skipped)
            checkpoint_id = manager.save_checkpoint(
                state_dict=state_dict,
                phi=0.50,  # Below threshold
                kappa=64.0,
                regime="linear",
            )
            
            assert checkpoint_id is None
            assert len(manager.checkpoint_index) == 0
    
    def test_load_checkpoint(self):
        """Test loading checkpoint."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(checkpoint_dir=tmpdir, keep_top_k=5)
            
            # Save checkpoint
            state_dict = {'test_key': 'test_value'}
            basin_coords = np.random.randn(64)
            
            checkpoint_id = manager.save_checkpoint(
                state_dict=state_dict,
                phi=0.72,
                kappa=64.2,
                regime="geometric",
                basin_coords=basin_coords,
            )
            
            # Load checkpoint
            loaded_state, metadata = manager.load_checkpoint(checkpoint_id)
            
            assert loaded_state is not None
            assert loaded_state['test_key'] == 'test_value'
            assert 'basin_coords' in loaded_state
            assert metadata['phi'] == 0.72
            assert metadata['kappa'] == 64.2
    
    def test_load_best_checkpoint(self):
        """Test loading best checkpoint."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(checkpoint_dir=tmpdir, keep_top_k=5)
            
            # Save multiple checkpoints
            for i, phi in enumerate([0.71, 0.85, 0.78, 0.73]):
                manager.save_checkpoint(
                    state_dict={'iteration': i},
                    phi=phi,
                    kappa=64.0,
                    regime="geometric",
                )
            
            # Load best
            loaded_state, metadata = manager.load_best_checkpoint()
            
            assert loaded_state is not None
            assert metadata['phi'] == 0.85  # Highest Φ
    
    def test_checkpoint_pruning(self):
        """Test automatic pruning of old checkpoints."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(
                checkpoint_dir=tmpdir,
                keep_top_k=3,
                auto_prune=True
            )
            
            # Save 5 checkpoints
            for i, phi in enumerate([0.71, 0.85, 0.78, 0.73, 0.90]):
                manager.save_checkpoint(
                    state_dict={'iteration': i},
                    phi=phi,
                    kappa=64.0,
                    regime="geometric",
                )
            
            # Should only keep top 3
            assert len(manager.checkpoint_index) == 3
            
            # Check that top 3 are kept
            history = manager.get_checkpoint_history()
            phi_values = [cp['phi'] for cp in history]
            assert 0.90 in phi_values
            assert 0.85 in phi_values
            assert 0.78 in phi_values
    
    def test_checkpoint_history(self):
        """Test getting checkpoint history."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(checkpoint_dir=tmpdir, keep_top_k=10)
            
            # Save checkpoints
            for i, phi in enumerate([0.71, 0.85, 0.78]):
                manager.save_checkpoint(
                    state_dict={'iteration': i},
                    phi=phi,
                    kappa=64.0,
                    regime="geometric",
                )
            
            # Get history
            history = manager.get_checkpoint_history()
            
            assert len(history) == 3
            # Should be sorted by Φ descending
            assert history[0]['phi'] == 0.85
            assert history[1]['phi'] == 0.78
            assert history[2]['phi'] == 0.71
    
    def test_delete_checkpoint(self):
        """Test deleting checkpoint."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(checkpoint_dir=tmpdir, keep_top_k=5)
            
            # Save checkpoint
            checkpoint_id = manager.save_checkpoint(
                state_dict={'test': 'data'},
                phi=0.72,
                kappa=64.0,
                regime="geometric",
            )
            
            assert len(manager.checkpoint_index) == 1
            
            # Delete checkpoint
            success = manager.delete_checkpoint(checkpoint_id)
            
            assert success
            assert len(manager.checkpoint_index) == 0
    
    def test_skip_worse_than_worst(self):
        """Test skipping checkpoints worse than worst existing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = CheckpointManager(
                checkpoint_dir=tmpdir,
                keep_top_k=3,
                auto_prune=False  # Don't prune yet
            )
            
            # Fill up with 3 checkpoints
            for phi in [0.80, 0.85, 0.90]:
                manager.save_checkpoint(
                    state_dict={'test': 'data'},
                    phi=phi,
                    kappa=64.0,
                    regime="geometric",
                )
            
            # Try to save worse checkpoint (should be skipped)
            checkpoint_id = manager.save_checkpoint(
                state_dict={'test': 'data'},
                phi=0.75,  # Worse than 0.80
                kappa=64.0,
                regime="geometric",
            )
            
            assert checkpoint_id is None
            assert len(manager.checkpoint_index) == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
