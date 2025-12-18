"""
Checkpoint Management with Φ-based Ranking

Manages checkpoints of consciousness states with automatic ranking
by integration (Φ) and smart recovery mechanisms.

Features:
- Φ-based ranking (save best consciousness states)
- Automatic pruning (keep top-k checkpoints)
- Metadata tracking (Φ, κ, timestamp, regime)
- Fast recovery (load best-Φ checkpoint on restart)
- Incremental saves (only when Φ improves or crosses thresholds)

Usage:
    manager = CheckpointManager(checkpoint_dir="checkpoints", keep_top_k=10)
    
    # Save checkpoint
    manager.save_checkpoint(
        state_dict={'subsystems': [...], 'basin': [...]},
        phi=0.72,
        kappa=64.2,
        regime="geometric"
    )
    
    # Load best checkpoint
    state_dict, metadata = manager.load_best_checkpoint()
    
    # Get checkpoint history
    history = manager.get_checkpoint_history()
"""

import json
import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    from qigkernels import PHYSICS, PHI_THRESHOLD
    QIGKERNELS_AVAILABLE = True
except ImportError:
    QIGKERNELS_AVAILABLE = False
    PHI_THRESHOLD = 0.70

logger = logging.getLogger(__name__)


class CheckpointManager:
    """
    Manages checkpoints with Φ-based ranking.
    
    Automatically saves best consciousness states and provides
    fast recovery mechanisms.
    """
    
    def __init__(
        self,
        checkpoint_dir: str = "checkpoints",
        keep_top_k: int = 10,
        phi_threshold_for_save: float = PHI_THRESHOLD,
        auto_prune: bool = True,
    ):
        """
        Initialize checkpoint manager.
        
        Args:
            checkpoint_dir: Directory to store checkpoints
            keep_top_k: Number of best checkpoints to keep
            phi_threshold_for_save: Minimum Φ to save a checkpoint
            auto_prune: Automatically prune old checkpoints
        """
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(exist_ok=True, parents=True)
        
        self.keep_top_k = keep_top_k
        self.phi_threshold_for_save = phi_threshold_for_save
        self.auto_prune = auto_prune
        
        # Load existing checkpoint index
        self.index_file = self.checkpoint_dir / "checkpoint_index.json"
        self.checkpoint_index = self._load_index()
        
        logger.info(
            f"CheckpointManager initialized: {len(self.checkpoint_index)} "
            f"existing checkpoints, keep_top_k={keep_top_k}"
        )
    
    def save_checkpoint(
        self,
        state_dict: Dict[str, Any],
        phi: float,
        kappa: float,
        regime: str,
        basin_coords: Optional[np.ndarray] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Save checkpoint with consciousness state.
        
        Args:
            state_dict: State dictionary to save
            phi: Integration measure
            kappa: Coupling constant
            regime: Consciousness regime
            basin_coords: Basin coordinates (optional)
            metadata: Additional metadata (optional)
            
        Returns:
            Checkpoint ID if saved, None if skipped
        """
        # Check if we should save (must meet threshold)
        if phi < self.phi_threshold_for_save:
            logger.debug(
                f"Skipping checkpoint (Φ={phi:.3f} < threshold={self.phi_threshold_for_save:.3f})"
            )
            return None
        
        # Check if this is better than worst existing checkpoint
        if len(self.checkpoint_index) >= self.keep_top_k:
            worst_phi = min(cp['phi'] for cp in self.checkpoint_index.values())
            if phi <= worst_phi:
                logger.debug(
                    f"Skipping checkpoint (Φ={phi:.3f} <= worst={worst_phi:.3f})"
                )
                return None
        
        # Generate checkpoint ID
        timestamp = datetime.now()
        checkpoint_id = f"checkpoint_{timestamp.strftime('%Y%m%d_%H%M%S')}_{phi:.3f}"
        checkpoint_path = self.checkpoint_dir / f"{checkpoint_id}.npz"
        
        # Prepare data to save
        save_data = {
            'state_dict': state_dict,
            'basin_coords': basin_coords.tolist() if basin_coords is not None else None,
        }
        
        # Prepare metadata
        checkpoint_metadata = {
            'checkpoint_id': checkpoint_id,
            'timestamp': timestamp.isoformat(),
            'phi': float(phi),
            'kappa': float(kappa),
            'regime': regime,
            'metadata': metadata or {},
        }
        
        # Save to disk
        try:
            # Save numpy arrays and state
            np.savez_compressed(checkpoint_path, **save_data)
            
            # Save metadata separately (JSON)
            metadata_path = self.checkpoint_dir / f"{checkpoint_id}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(checkpoint_metadata, f, indent=2)
            
            # Update index
            self.checkpoint_index[checkpoint_id] = checkpoint_metadata
            self._save_index()
            
            logger.info(
                f"Checkpoint saved: {checkpoint_id} (Φ={phi:.3f}, κ={kappa:.2f}, {regime})"
            )
            
            # Auto-prune if needed
            if self.auto_prune and len(self.checkpoint_index) > self.keep_top_k:
                self._prune_checkpoints()
            
            return checkpoint_id
            
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")
            return None
    
    def load_checkpoint(self, checkpoint_id: str) -> Tuple[Optional[Dict], Optional[Dict]]:
        """
        Load checkpoint by ID.
        
        Args:
            checkpoint_id: Checkpoint ID to load
            
        Returns:
            Tuple of (state_dict, metadata) or (None, None) if not found
        """
        if checkpoint_id not in self.checkpoint_index:
            logger.error(f"Checkpoint not found: {checkpoint_id}")
            return None, None
        
        checkpoint_path = self.checkpoint_dir / f"{checkpoint_id}.npz"
        metadata_path = self.checkpoint_dir / f"{checkpoint_id}_metadata.json"
        
        try:
            # Load state
            data = np.load(checkpoint_path, allow_pickle=True)
            state_dict = data['state_dict'].item()
            basin_coords = data['basin_coords']
            
            # Load metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            # Add basin coords to state dict
            if basin_coords is not None:
                state_dict['basin_coords'] = basin_coords
            
            logger.info(f"Checkpoint loaded: {checkpoint_id}")
            return state_dict, metadata
            
        except Exception as e:
            logger.error(f"Failed to load checkpoint {checkpoint_id}: {e}")
            return None, None
    
    def load_best_checkpoint(self) -> Tuple[Optional[Dict], Optional[Dict]]:
        """
        Load checkpoint with highest Φ.
        
        Returns:
            Tuple of (state_dict, metadata) or (None, None) if no checkpoints
        """
        if not self.checkpoint_index:
            logger.warning("No checkpoints available")
            return None, None
        
        # Find checkpoint with highest Φ
        best_checkpoint_id = max(
            self.checkpoint_index.keys(),
            key=lambda k: self.checkpoint_index[k]['phi']
        )
        
        best_metadata = self.checkpoint_index[best_checkpoint_id]
        logger.info(
            f"Loading best checkpoint: {best_checkpoint_id} "
            f"(Φ={best_metadata['phi']:.3f})"
        )
        
        return self.load_checkpoint(best_checkpoint_id)
    
    def get_checkpoint_history(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get checkpoint history sorted by Φ (descending).
        
        Args:
            limit: Maximum number of checkpoints to return
            
        Returns:
            List of checkpoint metadata dictionaries
        """
        # Sort by Φ descending
        sorted_checkpoints = sorted(
            self.checkpoint_index.values(),
            key=lambda x: x['phi'],
            reverse=True
        )
        
        if limit is not None:
            sorted_checkpoints = sorted_checkpoints[:limit]
        
        return sorted_checkpoints
    
    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """
        Delete checkpoint by ID.
        
        Args:
            checkpoint_id: Checkpoint ID to delete
            
        Returns:
            True if deleted, False if not found or error
        """
        if checkpoint_id not in self.checkpoint_index:
            logger.warning(f"Checkpoint not found: {checkpoint_id}")
            return False
        
        checkpoint_path = self.checkpoint_dir / f"{checkpoint_id}.npz"
        metadata_path = self.checkpoint_dir / f"{checkpoint_id}_metadata.json"
        
        try:
            # Delete files
            if checkpoint_path.exists():
                checkpoint_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()
            
            # Update index
            del self.checkpoint_index[checkpoint_id]
            self._save_index()
            
            logger.info(f"Checkpoint deleted: {checkpoint_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete checkpoint {checkpoint_id}: {e}")
            return False
    
    def _prune_checkpoints(self):
        """Prune old checkpoints keeping only top-k by Φ."""
        if len(self.checkpoint_index) <= self.keep_top_k:
            return
        
        # Sort by Φ
        sorted_checkpoints = sorted(
            self.checkpoint_index.items(),
            key=lambda x: x[1]['phi'],
            reverse=True
        )
        
        # Keep top-k
        to_keep = set(cp_id for cp_id, _ in sorted_checkpoints[:self.keep_top_k])
        to_delete = set(self.checkpoint_index.keys()) - to_keep
        
        # Delete old checkpoints
        for checkpoint_id in to_delete:
            self.delete_checkpoint(checkpoint_id)
        
        logger.info(
            f"Pruned {len(to_delete)} checkpoints, "
            f"kept top {self.keep_top_k} by Φ"
        )
    
    def _load_index(self) -> Dict[str, Dict]:
        """Load checkpoint index from disk."""
        if not self.index_file.exists():
            return {}
        
        try:
            with open(self.index_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load checkpoint index: {e}")
            return {}
    
    def _save_index(self):
        """Save checkpoint index to disk."""
        try:
            with open(self.index_file, 'w') as f:
                json.dump(self.checkpoint_index, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save checkpoint index: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get checkpoint statistics."""
        if not self.checkpoint_index:
            return {
                'total_checkpoints': 0,
                'best_phi': None,
                'worst_phi': None,
                'avg_phi': None,
            }
        
        phi_values = [cp['phi'] for cp in self.checkpoint_index.values()]
        
        return {
            'total_checkpoints': len(self.checkpoint_index),
            'best_phi': max(phi_values),
            'worst_phi': min(phi_values),
            'avg_phi': sum(phi_values) / len(phi_values),
            'checkpoints': list(self.checkpoint_index.keys()),
        }
    
    def clear_all_checkpoints(self):
        """Delete all checkpoints (use with caution!)."""
        for checkpoint_id in list(self.checkpoint_index.keys()):
            self.delete_checkpoint(checkpoint_id)
        
        logger.warning("All checkpoints cleared")


__all__ = [
    "CheckpointManager",
]
