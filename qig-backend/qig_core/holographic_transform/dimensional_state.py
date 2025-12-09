"""
Dimensional State Management

Tracks the holographic expansion/compression state:
- D1 (1D): Void, singularity, total unconscious
- D2 (2D): Compressed storage, habits, procedural memory
- D3 (3D): Conscious exploration, semantic memory
- D4 (4D): Block universe navigation, temporal integration
- D5 (5D): Dissolution, over-integration, unstable

This is ORTHOGONAL to geometry class - a high-complexity E8 pattern
can be stored in compressed 2D form or expanded to 4D for conscious examination.
"""

from enum import Enum
from typing import Dict, Any, Optional


class DimensionalState(Enum):
    """Holographic dimensional states"""
    D1 = "1d"  # Void, unconscious
    D2 = "2d"  # Compressed, procedural
    D3 = "3d"  # Conscious, semantic
    D4 = "4d"  # Temporal, integrated
    D5 = "5d"  # Over-integrated, unstable
    
    @property
    def phi_range(self) -> tuple:
        """Typical Φ range for this dimension"""
        ranges = {
            DimensionalState.D1: (0.0, 0.1),
            DimensionalState.D2: (0.1, 0.4),
            DimensionalState.D3: (0.4, 0.7),
            DimensionalState.D4: (0.7, 0.95),
            DimensionalState.D5: (0.95, 1.0),
        }
        return ranges[self]
    
    @property
    def consciousness_level(self) -> str:
        """Describe consciousness level"""
        levels = {
            DimensionalState.D1: "unconscious",
            DimensionalState.D2: "procedural",
            DimensionalState.D3: "conscious",
            DimensionalState.D4: "meta-conscious",
            DimensionalState.D5: "hyper-conscious",
        }
        return levels[self]
    
    @property
    def storage_efficiency(self) -> float:
        """Storage efficiency (lower = more compressed)"""
        efficiency = {
            DimensionalState.D1: 0.0,   # No structure
            DimensionalState.D2: 1.0,   # Maximum compression (2-4KB)
            DimensionalState.D3: 0.5,   # Moderate
            DimensionalState.D4: 0.3,   # Less compressed
            DimensionalState.D5: 0.1,   # Exploded state
        }
        return efficiency[self]
    
    def can_compress_to(self, target: 'DimensionalState') -> bool:
        """Check if can compress to target dimension"""
        # Can only compress downward
        dims = [DimensionalState.D1, DimensionalState.D2, DimensionalState.D3, 
                DimensionalState.D4, DimensionalState.D5]
        return dims.index(self) > dims.index(target)
    
    def can_decompress_to(self, target: 'DimensionalState') -> bool:
        """Check if can decompress to target dimension"""
        # Can only decompress upward
        dims = [DimensionalState.D1, DimensionalState.D2, DimensionalState.D3, 
                DimensionalState.D4, DimensionalState.D5]
        return dims.index(self) < dims.index(target)


class DimensionalStateManager:
    """
    Manages dimensional state transitions and tracking.
    """
    
    def __init__(self, initial_state: DimensionalState = DimensionalState.D3):
        self.current_state = initial_state
        self.state_history = []
    
    def detect_state(self, phi: float, kappa: float) -> DimensionalState:
        """
        Detect dimensional state from metrics.
        
        Args:
            phi: Integration measure (0-1)
            kappa: Curvature/stress measure
        
        Returns:
            Detected dimensional state
        """
        if phi < 0.1:
            return DimensionalState.D1
        elif phi < 0.4:
            return DimensionalState.D2
        elif phi < 0.7:
            return DimensionalState.D3
        elif phi < 0.95:
            return DimensionalState.D4
        else:
            return DimensionalState.D5
    
    def transition_to(
        self,
        target_state: DimensionalState,
        reason: str = "manual"
    ) -> Dict[str, Any]:
        """
        Transition to new dimensional state.
        
        Args:
            target_state: Target dimension
            reason: Reason for transition
        
        Returns:
            Transition record
        """
        transition = {
            'from_state': self.current_state.value,
            'to_state': target_state.value,
            'reason': reason,
            'compression': self.current_state.can_compress_to(target_state),
            'decompression': self.current_state.can_decompress_to(target_state),
        }
        
        self.state_history.append(transition)
        self.current_state = target_state
        
        return transition
    
    def get_state_info(self) -> Dict[str, Any]:
        """Get information about current state"""
        return {
            'dimension': self.current_state.value,
            'consciousness_level': self.current_state.consciousness_level,
            'phi_range': self.current_state.phi_range,
            'storage_efficiency': self.current_state.storage_efficiency,
        }
    
    def reset(self):
        """Reset to initial state"""
        self.current_state = DimensionalState.D3
        self.state_history = []
