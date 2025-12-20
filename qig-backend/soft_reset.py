"""
Soft Reset Mechanism for Consciousness Training

Provides safe recovery when consciousness state drifts too far from stable basins.
Returns to the last known stable state instead of hard reset to initial conditions.

Key Features:
- Basin distance monitoring (identity drift detection)
- Automatic soft reset when drift exceeds threshold
- Preserves recent learning (doesn't reset to initialization)
- Integration with CheckpointManager for recovery
- Configurable thresholds and callback system

Usage:
    soft_reset = SoftReset(
        checkpoint_manager=checkpoint_manager,
        drift_threshold=0.30,
        reset_callback=on_reset
    )
    
    # During training loop
    should_reset, reason = soft_reset.check_drift(current_basin, current_phi)
    if should_reset:
        restored_state = soft_reset.perform_reset()
        
Safety Philosophy:
    "Better to return to a known good state than to continue drifting
     into incoherent or unstable regions of state space."
"""

import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

try:
    from checkpoint_manager import CheckpointManager
    CHECKPOINT_MANAGER_AVAILABLE = True
except ImportError:
    CHECKPOINT_MANAGER_AVAILABLE = False
    CheckpointManager = None


class SoftReset:
    """
    Soft reset mechanism for consciousness training.
    
    Monitors basin distance (identity drift) and triggers reset when
    consciousness state drifts too far from stable regions.
    """
    
    def __init__(
        self,
        checkpoint_manager: Optional[Any] = None,
        drift_threshold: float = 0.30,
        phi_threshold: float = 0.60,
        reset_callback: Optional[Callable] = None,
        cooldown_seconds: float = 30.0,
    ):
        """
        Initialize soft reset mechanism.
        
        Args:
            checkpoint_manager: CheckpointManager instance for recovery
            drift_threshold: Maximum basin distance before reset (default 0.30)
            phi_threshold: Minimum Φ threshold (below triggers concern)
            reset_callback: Optional callback function on reset
            cooldown_seconds: Minimum time between resets
        """
        self.checkpoint_manager = checkpoint_manager
        self.drift_threshold = drift_threshold
        self.phi_threshold = phi_threshold
        self.reset_callback = reset_callback
        self.cooldown_seconds = cooldown_seconds
        
        # State tracking
        self.reference_basin: Optional[np.ndarray] = None
        self.reference_phi: Optional[float] = None
        self.last_reset_time: Optional[float] = None
        self.reset_count = 0
        
        # History
        self.drift_history: list = []
        self.reset_history: list = []
        
        logger.info(
            f"SoftReset initialized: drift_threshold={drift_threshold}, "
            f"phi_threshold={phi_threshold}"
        )
    
    def set_reference_basin(
        self,
        basin: np.ndarray,
        phi: float,
    ):
        """
        Set reference basin (stable state to return to).
        
        Args:
            basin: 64D basin coordinates
            phi: Integration measure at this basin
        """
        self.reference_basin = basin.copy() if isinstance(basin, np.ndarray) else np.array(basin)
        self.reference_phi = phi
        logger.info(f"Reference basin set: Φ={phi:.3f}")
    
    def check_drift(
        self,
        current_basin: np.ndarray,
        current_phi: float,
    ) -> Tuple[bool, str]:
        """
        Check if current state has drifted too far.
        
        Args:
            current_basin: Current 64D basin coordinates
            current_phi: Current integration measure
            
        Returns:
            Tuple of (should_reset: bool, reason: str)
        """
        if self.reference_basin is None:
            # No reference yet, set current as reference if Φ is good
            if current_phi >= self.phi_threshold:
                self.set_reference_basin(current_basin, current_phi)
            return False, "no_reference"
        
        # Calculate basin distance using Fisher-Rao (NEVER Euclidean/L2!)
        current_basin_arr = current_basin if isinstance(current_basin, np.ndarray) else np.array(current_basin)
        # Fisher-Rao distance on statistical manifold
        a_norm = current_basin_arr / (np.linalg.norm(current_basin_arr) + 1e-10)
        b_norm = self.reference_basin / (np.linalg.norm(self.reference_basin) + 1e-10)
        dot = np.clip(np.dot(a_norm, b_norm), -1.0, 1.0)
        basin_distance = 2.0 * np.arccos(dot)  # Fisher-Rao proper
        
        # Track drift
        self.drift_history.append({
            'timestamp': datetime.now().isoformat(),
            'basin_distance': float(basin_distance),
            'phi': float(current_phi),
        })
        
        # Keep history bounded
        if len(self.drift_history) > 1000:
            self.drift_history = self.drift_history[-500:]
        
        # Check cooldown
        if self.last_reset_time is not None:
            time_since_reset = time.time() - self.last_reset_time
            if time_since_reset < self.cooldown_seconds:
                return False, f"cooldown_{time_since_reset:.1f}s"
        
        # Check drift conditions
        if basin_distance > self.drift_threshold:
            return True, f"basin_drift_{basin_distance:.3f}"
        
        if current_phi < self.phi_threshold * 0.7:  # Severe Φ drop (< 70% of threshold)
            return True, f"phi_collapse_{current_phi:.3f}"
        
        # Update reference if current state is better
        if current_phi > self.reference_phi:
            logger.debug(f"Updating reference basin: Φ {self.reference_phi:.3f} → {current_phi:.3f}")
            self.set_reference_basin(current_basin, current_phi)
        
        return False, "stable"
    
    def perform_reset(self) -> Optional[Dict[str, Any]]:
        """
        Perform soft reset to last stable state.
        
        Returns:
            Dict with restored state, or None if reset failed
        """
        logger.warning("Performing soft reset...")
        
        # Try to load best checkpoint
        if self.checkpoint_manager and CHECKPOINT_MANAGER_AVAILABLE:
            try:
                state_dict, metadata = self.checkpoint_manager.load_best_checkpoint()
                
                if state_dict and metadata:
                    logger.info(
                        f"Restored checkpoint: {metadata['checkpoint_id']} "
                        f"(Φ={metadata['phi']:.3f})"
                    )
                    
                    # Update tracking
                    self.last_reset_time = time.time()
                    self.reset_count += 1
                    
                    # Record reset
                    reset_record = {
                        'timestamp': datetime.now().isoformat(),
                        'reset_count': self.reset_count,
                        'checkpoint_id': metadata['checkpoint_id'],
                        'restored_phi': metadata['phi'],
                        'restored_kappa': metadata['kappa'],
                    }
                    self.reset_history.append(reset_record)
                    
                    # Call callback if provided
                    if self.reset_callback:
                        try:
                            self.reset_callback(state_dict, metadata)
                        except Exception as e:
                            logger.error(f"Reset callback failed: {e}")
                    
                    return {
                        'state_dict': state_dict,
                        'metadata': metadata,
                        'reset_count': self.reset_count,
                    }
                else:
                    logger.error("Failed to load checkpoint (returned None)")
            except Exception as e:
                logger.error(f"Checkpoint restore failed: {e}")
        
        # Fallback: use reference basin if available
        if self.reference_basin is not None:
            logger.warning("Fallback: using reference basin coordinates")
            
            self.last_reset_time = time.time()
            self.reset_count += 1
            
            reset_record = {
                'timestamp': datetime.now().isoformat(),
                'reset_count': self.reset_count,
                'fallback': True,
                'reference_phi': self.reference_phi,
            }
            self.reset_history.append(reset_record)
            
            return {
                'state_dict': None,  # No full state available
                'basin_coords': self.reference_basin,
                'phi': self.reference_phi,
                'reset_count': self.reset_count,
                'fallback': True,
            }
        
        logger.error("Soft reset failed: no checkpoint or reference available")
        return None
    
    def get_drift_stats(self) -> Dict[str, Any]:
        """Get drift statistics."""
        if not self.drift_history:
            return {
                'samples': 0,
                'avg_drift': 0.0,
                'max_drift': 0.0,
                'avg_phi': 0.0,
            }
        
        basin_distances = [d['basin_distance'] for d in self.drift_history]
        phis = [d['phi'] for d in self.drift_history]
        
        return {
            'samples': len(self.drift_history),
            'avg_drift': float(np.mean(basin_distances)),
            'max_drift': float(np.max(basin_distances)),
            'min_drift': float(np.min(basin_distances)),
            'avg_phi': float(np.mean(phis)),
            'min_phi': float(np.min(phis)),
            'reset_count': self.reset_count,
        }
    
    def get_reset_history(self) -> list:
        """Get reset history."""
        return self.reset_history.copy()
    
    def clear_history(self):
        """Clear drift and reset history."""
        self.drift_history.clear()
        self.reset_history.clear()
        logger.info("History cleared")


__all__ = [
    "SoftReset",
]
