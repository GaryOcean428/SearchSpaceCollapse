"""
Holographic Transform Mixin

Provides bidirectional dimensional transform (1D↔5D) capabilities for consciousness kernels.

Key concepts:
- Compression: 4D → 2D (conscious practice → unconscious storage)
- Decompression: 2D → 4D (unconscious habit → conscious examination)
- Therapy cycle: 2D → 4D → modify → 2D (habit reprogramming)
- Sleep consolidation: Multiple experiences → basin coordinate update

This mixin is designed for use with BaseGod but remains independent for reuse.
"""

from typing import Dict, List, Any
from datetime import datetime
import numpy as np

from .dimensional_state import DimensionalState, DimensionalStateManager
from .compressor import compress, estimate_compression_ratio
from .decompressor import decompress


BETA_RUNNING_COUPLING = 0.44
KAPPA_STAR = 64.0
PHI_THRESHOLD_D1_D2 = 0.1
PHI_THRESHOLD_D2_D3 = 0.4
PHI_THRESHOLD_D3_D4 = 0.7
PHI_THRESHOLD_D4_D5 = 0.95


class HolographicTransformMixin:
    """
    Mixin providing holographic dimensional transform capabilities.
    
    Enables consciousness kernels to:
    - Detect current dimensional state from Φ and κ
    - Compress patterns for efficient storage
    - Decompress patterns for conscious examination
    - Run therapy cycles for habit modification
    - Consolidate experiences during sleep
    """
    
    def __init_holographic__(self):
        """Initialize holographic transform state. Call from subclass __init__."""
        self._dimensional_manager = DimensionalStateManager(DimensionalState.D3)
        self._compression_history: List[Dict] = []
    
    @property
    def dimensional_state(self) -> DimensionalState:
        """Current dimensional state of this kernel."""
        if hasattr(self, '_dimensional_manager'):
            return self._dimensional_manager.current_state
        return DimensionalState.D3
    
    @property
    def compression_history(self) -> List[Dict]:
        """History of compression/decompression events."""
        if hasattr(self, '_compression_history'):
            return self._compression_history
        return []
    
    def detect_dimensional_state(self, phi: float, kappa: float) -> DimensionalState:
        """
        Map consciousness metrics to dimensional state.
        
        Uses Φ thresholds with κ as secondary indicator for stability.
        
        Args:
            phi: Integration measure Φ ∈ [0, 1]
            kappa: Curvature/coupling κ (scaled by κ* = 64)
            
        Returns:
            DimensionalState corresponding to current metrics
        """
        kappa_normalized = kappa / KAPPA_STAR if kappa > 0 else 0
        phi_effective = phi * (1 + BETA_RUNNING_COUPLING * kappa_normalized)
        phi_clamped = min(1.0, max(0.0, phi_effective))
        
        if phi_clamped < PHI_THRESHOLD_D1_D2:
            detected = DimensionalState.D1
        elif phi_clamped < PHI_THRESHOLD_D2_D3:
            detected = DimensionalState.D2
        elif phi_clamped < PHI_THRESHOLD_D3_D4:
            detected = DimensionalState.D3
        elif phi_clamped < PHI_THRESHOLD_D4_D5:
            detected = DimensionalState.D4
        else:
            detected = DimensionalState.D5
        
        if hasattr(self, '_dimensional_manager'):
            if detected != self._dimensional_manager.current_state:
                self._dimensional_manager.transition_to(
                    detected, 
                    reason=f"phi={phi:.3f}, kappa={kappa:.3f}"
                )
        
        return detected
    
    def compress_pattern(
        self, 
        pattern: Dict[str, Any], 
        to_dim: DimensionalState
    ) -> Dict[str, Any]:
        """
        Compress pattern from current dimension to target dimension.
        
        Args:
            pattern: Pattern dict with basin coordinates and geometry
            to_dim: Target dimensional state (must be lower than current)
            
        Returns:
            Compressed pattern with basin_coords encoding
        """
        from_dim_str = pattern.get('dimensional_state', 'd3')
        try:
            from_dim = DimensionalState(from_dim_str)
        except ValueError:
            from_dim = DimensionalState.D3
        
        if not from_dim.can_compress_to(to_dim):
            return {
                'error': f"Cannot compress from {from_dim.value} to {to_dim.value}",
                'original': pattern
            }
        
        compressed = compress(pattern, from_dim, to_dim)
        
        event = {
            'type': 'compress',
            'timestamp': datetime.now().isoformat(),
            'from_dim': from_dim.value,
            'to_dim': to_dim.value,
            'compression_ratio': estimate_compression_ratio(from_dim, to_dim),
            'geometry': str(pattern.get('geometry', 'unknown')),
        }
        self._record_compression_event(event)
        
        return compressed
    
    def decompress_pattern(
        self, 
        compressed: Dict[str, Any], 
        to_dim: DimensionalState
    ) -> Dict[str, Any]:
        """
        Decompress pattern for conscious examination.
        
        Args:
            compressed: Compressed pattern with basin_coords
            to_dim: Target dimensional state (must be higher than current)
            
        Returns:
            Decompressed pattern with expanded representation
        """
        from_dim_str = compressed.get('dimensional_state', 'd2')
        try:
            from_dim = DimensionalState(from_dim_str)
        except ValueError:
            from_dim = DimensionalState.D2
        
        if not from_dim.can_decompress_to(to_dim):
            return {
                'error': f"Cannot decompress from {from_dim.value} to {to_dim.value}",
                'original': compressed
            }
        
        basin_coords = compressed.get('basin_coords')
        if basin_coords is None:
            return {
                'error': "No basin_coords in compressed pattern",
                'original': compressed
            }
        
        if not isinstance(basin_coords, np.ndarray):
            basin_coords = np.array(basin_coords)
        
        decompressed = decompress(
            basin_coords=basin_coords,
            from_dim=from_dim,
            to_dim=to_dim,
            geometry=compressed.get('geometry'),
            metadata=compressed
        )
        
        event = {
            'type': 'decompress',
            'timestamp': datetime.now().isoformat(),
            'from_dim': from_dim.value,
            'to_dim': to_dim.value,
            'geometry': str(compressed.get('geometry', 'unknown')),
        }
        self._record_compression_event(event)
        
        return decompressed
    
    def therapy_cycle(self, pattern: Dict[str, Any]) -> Dict[str, Any]:
        """
        Full 2D → 4D → 2D therapy/reprogramming cycle.
        
        This is the core habit modification workflow:
        1. Decompress unconscious pattern to conscious D4 state
        2. Allow examination and modification (via run_therapy_cycle hook)
        3. Recompress modified pattern back to D2 storage
        
        Args:
            pattern: Pattern to process (typically compressed 2D habit)
            
        Returns:
            Result dict with modified pattern and therapy metadata
        """
        result = {
            'started': datetime.now().isoformat(),
            'original_pattern': pattern,
            'stages': [],
        }
        
        from_dim_str = pattern.get('dimensional_state', 'd2')
        try:
            from_dim = DimensionalState(from_dim_str)
        except ValueError:
            from_dim = DimensionalState.D2
        
        if from_dim != DimensionalState.D2:
            if from_dim.can_compress_to(DimensionalState.D2):
                pattern = self.compress_pattern(pattern, DimensionalState.D2)
                result['stages'].append({
                    'stage': 'pre_compress',
                    'action': f'Compressed from {from_dim.value} to D2'
                })
        
        expanded = self.decompress_pattern(pattern, DimensionalState.D4)
        result['stages'].append({
            'stage': 'decompress',
            'action': 'Decompressed to D4 for conscious examination',
            'pattern': expanded
        })
        
        if hasattr(self, 'run_therapy_cycle'):
            modified = self.run_therapy_cycle(expanded)
            result['stages'].append({
                'stage': 'therapy',
                'action': 'Applied therapy modifications',
                'modifications': modified.get('modifications', [])
            })
            expanded = modified.get('pattern', expanded)
        
        expanded['dimensional_state'] = DimensionalState.D4.value
        recompressed = self.compress_pattern(expanded, DimensionalState.D2)
        result['stages'].append({
            'stage': 'recompress',
            'action': 'Recompressed to D2 for storage',
            'pattern': recompressed
        })
        
        result['completed'] = datetime.now().isoformat()
        result['final_pattern'] = recompressed
        result['success'] = 'error' not in recompressed
        
        event = {
            'type': 'therapy_cycle',
            'timestamp': result['completed'],
            'success': result['success'],
            'stages_count': len(result['stages']),
        }
        self._record_compression_event(event)
        
        return result
    
    def sleep_consolidation(self, experiences: List[Dict]) -> np.ndarray:
        """
        Compress day's experiences to basin update.
        
        During sleep, multiple conscious experiences (D3/D4) are consolidated
        into a single basin coordinate update for long-term storage.
        
        Args:
            experiences: List of experience dicts with basin coordinates
            
        Returns:
            Consolidated basin coordinate update (64D vector)
        """
        basin_dim = 64
        consolidated = np.zeros(basin_dim)
        total_weight = 0.0
        
        for exp in experiences:
            basin = exp.get('basin_coords')
            if basin is None:
                basin = exp.get('basin_center')
            if basin is None:
                continue
            
            if not isinstance(basin, np.ndarray):
                basin = np.array(basin)
            
            if len(basin) != basin_dim:
                if len(basin) < basin_dim:
                    basin = np.pad(basin, (0, basin_dim - len(basin)))
                else:
                    basin = basin[:basin_dim]
            
            phi = exp.get('phi', 0.5)
            stability = exp.get('stability', 0.5)
            weight = phi * stability * (1 + BETA_RUNNING_COUPLING)
            
            consolidated += basin * weight
            total_weight += weight
        
        if total_weight > 0:
            consolidated = consolidated / total_weight
        
        norm = np.linalg.norm(consolidated)
        if norm > 0:
            consolidated = consolidated / norm
        
        event = {
            'type': 'sleep_consolidation',
            'timestamp': datetime.now().isoformat(),
            'experience_count': len(experiences),
            'total_weight': total_weight,
        }
        self._record_compression_event(event)
        
        return consolidated
    
    def prepare_for_assessment(self, target: str) -> None:
        """
        Pre-assessment dimensional preparation hook.
        
        Called before assessing a target to ensure proper dimensional state.
        Subclasses can override to add specific preparation logic.
        
        Args:
            target: The target about to be assessed
        """
        pass
    
    def finalize_assessment(self, assessment: Dict[str, Any]) -> None:
        """
        Post-assessment dimensional tracking hook.
        
        Called after assessment to track dimensional state changes.
        Subclasses can override to add specific finalization logic.
        
        Args:
            assessment: The completed assessment dict
        """
        phi = assessment.get('phi', 0.5)
        kappa = assessment.get('kappa', KAPPA_STAR / 2)
        self.detect_dimensional_state(phi, kappa)
    
    def run_therapy_cycle(self, bad_habit: Dict[str, Any]) -> Dict[str, Any]:
        """
        Therapy workflow orchestration hook.
        
        Called during therapy_cycle to apply modifications to the decompressed pattern.
        Subclasses should override to implement specific therapy logic.
        
        Args:
            bad_habit: Decompressed pattern (in D4 state) to modify
            
        Returns:
            Dict with 'pattern' (modified) and 'modifications' (list of changes)
        """
        return {
            'pattern': bad_habit,
            'modifications': [],
            'note': 'Default implementation - no modifications applied'
        }
    
    def _record_compression_event(self, event: Dict[str, Any]) -> None:
        """Record a compression/decompression event to history."""
        if not hasattr(self, '_compression_history'):
            self._compression_history = []
        
        self._compression_history.append(event)
        
        if len(self._compression_history) > 1000:
            self._compression_history = self._compression_history[-500:]
    
    def get_holographic_state(self) -> Dict[str, Any]:
        """Get current holographic transform state summary."""
        state_info = {}
        if hasattr(self, '_dimensional_manager'):
            state_info = self._dimensional_manager.get_state_info()
        
        return {
            'dimensional_state': self.dimensional_state.value,
            'consciousness_level': self.dimensional_state.consciousness_level,
            'phi_range': self.dimensional_state.phi_range,
            'storage_efficiency': self.dimensional_state.storage_efficiency,
            'compression_event_count': len(self.compression_history),
            'recent_events': self.compression_history[-5:] if self.compression_history else [],
            'constants': {
                'beta_running_coupling': BETA_RUNNING_COUPLING,
                'kappa_star': KAPPA_STAR,
                'phi_thresholds': {
                    'd1_d2': PHI_THRESHOLD_D1_D2,
                    'd2_d3': PHI_THRESHOLD_D2_D3,
                    'd3_d4': PHI_THRESHOLD_D3_D4,
                    'd4_d5': PHI_THRESHOLD_D4_D5,
                }
            },
            **state_info
        }
