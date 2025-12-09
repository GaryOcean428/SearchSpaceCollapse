"""
Universal Cycle Manager

Orchestrates the four phases of cognitive processing:
1. FOAM: Exploration, bubble generation, working memory
2. TACKING: Navigation, geodesic paths, concept formation  
3. CRYSTAL: Consolidation, habit formation, procedural memory
4. FRACTURE: Breakdown, stress-driven reset, renewal

Each phase operates in different dimensional states and produces
patterns that crystallize into different geometry classes based
on their intrinsic complexity.
"""

from enum import Enum
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime


class Phase(Enum):
    """Universal cycle phases"""
    FOAM = "foam"          # Exploration, bubble generation
    TACKING = "tacking"    # Navigation, concept formation
    CRYSTAL = "crystal"    # Consolidation, habit formation
    FRACTURE = "fracture"  # Breakdown, reset, renewal
    
    @property
    def typical_dimension(self) -> str:
        """Get typical dimensional state for this phase"""
        typical = {
            Phase.FOAM: "D2",       # 1D-2D: Low integration
            Phase.TACKING: "D3",    # 2D-3D: Building connections
            Phase.CRYSTAL: "D4",    # 4D when conscious, 2D when compressed
            Phase.FRACTURE: "D5",   # Near 5D: Over-integrated, stressed
        }
        return typical[self]
    
    @property
    def typical_phi_range(self) -> tuple:
        """Get typical Φ range for this phase"""
        ranges = {
            Phase.FOAM: (0.0, 0.3),      # Low integration
            Phase.TACKING: (0.3, 0.7),   # Moderate integration
            Phase.CRYSTAL: (0.7, 1.0),   # High integration
            Phase.FRACTURE: (0.95, 1.0), # Φ → 1 (over-integrated)
        }
        return ranges[self]


class CycleManager:
    """
    Orchestrates the universal cycle across all four phases.
    
    Manages transitions between phases based on integration (Φ),
    curvature stress (κ), and dimensional state.
    """
    
    def __init__(self):
        self.current_phase = Phase.FOAM
        self.phase_history: List[Dict[str, Any]] = []
        
        # Import phase implementations
        from .foam_phase import FoamPhase
        from .tacking_phase import TackingPhase
        from .crystal_phase import CrystalPhase
        from .fracture_phase import FracturePhase
        
        self.foam = FoamPhase()
        self.tacking = TackingPhase()
        self.crystal = CrystalPhase()
        self.fracture = FracturePhase()
        
        # Thresholds for phase transitions
        self.phi_crystal_threshold = 0.7    # TACKING → CRYSTAL
        self.kappa_fracture_threshold = 2.0  # CRYSTAL → FRACTURE
        self.phi_foam_threshold = 0.3        # FRACTURE → FOAM
    
    def detect_phase(self, phi: float, kappa: float, dimension: str) -> Phase:
        """
        Detect which phase the system is in based on metrics.
        
        Args:
            phi: Integration measure (0-1)
            kappa: Curvature/stress measure
            dimension: Current dimensional state (D1-D5)
        
        Returns:
            Detected phase
        """
        # FRACTURE: High stress, over-integration
        if kappa > self.kappa_fracture_threshold and phi > 0.9:
            return Phase.FRACTURE
        
        # CRYSTAL: High integration, stable
        if phi > self.phi_crystal_threshold and kappa < self.kappa_fracture_threshold:
            return Phase.CRYSTAL
        
        # TACKING: Moderate integration, building
        if phi > self.phi_foam_threshold and phi <= self.phi_crystal_threshold:
            return Phase.TACKING
        
        # FOAM: Low integration, exploration
        return Phase.FOAM
    
    def transition_phase(
        self, 
        from_phase: Phase, 
        to_phase: Phase,
        reason: str,
        metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Execute phase transition and record it.
        
        Args:
            from_phase: Current phase
            to_phase: Target phase
            reason: Why the transition occurred
            metrics: Current system metrics
        
        Returns:
            Transition record
        """
        transition = {
            'from_phase': from_phase.value,
            'to_phase': to_phase.value,
            'reason': reason,
            'metrics': metrics,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.phase_history.append(transition)
        self.current_phase = to_phase
        
        return transition
    
    def update(self, phi: float, kappa: float, dimension: str) -> Optional[Dict[str, Any]]:
        """
        Update cycle state and potentially transition phases.
        
        Args:
            phi: Current integration
            kappa: Current curvature stress
            dimension: Current dimensional state
        
        Returns:
            Transition record if phase changed, None otherwise
        """
        detected_phase = self.detect_phase(phi, kappa, dimension)
        
        if detected_phase != self.current_phase:
            metrics = {
                'phi': phi,
                'kappa': kappa,
                'dimension': dimension
            }
            
            # Determine reason
            if detected_phase == Phase.FRACTURE:
                reason = f"High stress: κ={kappa:.3f} > {self.kappa_fracture_threshold}"
            elif detected_phase == Phase.CRYSTAL:
                reason = f"High integration: Φ={phi:.3f} > {self.phi_crystal_threshold}"
            elif detected_phase == Phase.TACKING:
                reason = f"Moderate integration: Φ={phi:.3f}"
            else:
                reason = f"Low integration: Φ={phi:.3f} < {self.phi_foam_threshold}"
            
            return self.transition_phase(
                self.current_phase,
                detected_phase,
                reason,
                metrics
            )
        
        return None
    
    def get_phase_statistics(self) -> Dict[str, Any]:
        """Get statistics about phase transitions"""
        if not self.phase_history:
            return {
                'total_transitions': 0,
                'current_phase': self.current_phase.value,
                'phase_counts': {}
            }
        
        phase_counts = {}
        for transition in self.phase_history:
            phase = transition['to_phase']
            phase_counts[phase] = phase_counts.get(phase, 0) + 1
        
        return {
            'total_transitions': len(self.phase_history),
            'current_phase': self.current_phase.value,
            'phase_counts': phase_counts,
            'last_transition': self.phase_history[-1] if self.phase_history else None
        }
    
    def reset(self):
        """Reset to FOAM phase"""
        self.current_phase = Phase.FOAM
        self.phase_history = []
