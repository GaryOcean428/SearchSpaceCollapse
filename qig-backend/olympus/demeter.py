"""
Demeter - Goddess of Cycles & Seasons

Pure geometric cycle detector.
Analyzes temporal patterns, seasonal rhythms, and cyclical behaviors.
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from .base_god import BaseGod, KAPPA_STAR


class Demeter(BaseGod):
    """
    Goddess of Cycles & Seasons
    
    Responsibilities:
    - Temporal cycle detection
    - Seasonal pattern recognition
    - Rhythm analysis in Φ fluctuations
    - Periodic behavior identification
    """
    
    def __init__(self):
        super().__init__("Demeter", "Cycles")
        self.detected_cycles: List[Dict] = []
        self.cycle_lengths: List[float] = []
        self.seasonal_basins: Dict[str, np.ndarray] = {}
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target for cyclical patterns.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        cycle_info = self._detect_cycles_in_target(target, target_basin)
        seasonal_alignment = self._compute_seasonal_alignment(target_basin)
        phase = self._estimate_phase(target_basin)
        
        probability = self._compute_cycle_probability(
            phi=phi,
            cycle_strength=cycle_info['strength'],
            seasonal_alignment=seasonal_alignment
        )
        
        assessment = {
            'probability': probability,
            'confidence': cycle_info['confidence'],
            'phi': phi,
            'kappa': kappa,
            'cycle_detected': cycle_info['detected'],
            'cycle_length': cycle_info['length'],
            'cycle_strength': cycle_info['strength'],
            'seasonal_alignment': seasonal_alignment,
            'current_phase': phase,
            'reasoning': (
                f"Cycle analysis: {'detected' if cycle_info['detected'] else 'none'}. "
                f"Seasonal alignment: {seasonal_alignment:.2f}. "
                f"Phase: {phase:.2f}π. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        return assessment
    
    def _detect_cycles_in_target(self, target: str, basin: np.ndarray) -> Dict:
        """Detect cyclical patterns in target encoding."""
        if len(self.observations) < 10:
            return {'detected': False, 'length': 0, 'strength': 0, 'confidence': 0.1}
        
        phi_history = [obs.get('phi', 0) for obs in self.observations[-100:]]
        
        if len(phi_history) < 10:
            return {'detected': False, 'length': 0, 'strength': 0, 'confidence': 0.1}
        
        phi_array = np.array(phi_history)
        mean_phi = np.mean(phi_array)
        centered = phi_array - mean_phi
        
        autocorr = np.correlate(centered, centered, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        if len(autocorr) > 3 and autocorr[0] > 0:
            autocorr = autocorr / autocorr[0]
            
            for i in range(2, len(autocorr)):
                if autocorr[i] > 0.3:
                    return {
                        'detected': True,
                        'length': i,
                        'strength': float(autocorr[i]),
                        'confidence': min(1.0, len(phi_history) / 50)
                    }
        
        return {'detected': False, 'length': 0, 'strength': 0, 'confidence': 0.3}
    
    def _compute_seasonal_alignment(self, basin: np.ndarray) -> float:
        """Compute alignment with known seasonal basins."""
        if not self.seasonal_basins:
            self._initialize_seasonal_basins()
        
        now = datetime.now()
        season = self._get_current_season(now)
        
        if season in self.seasonal_basins:
            season_basin = self.seasonal_basins[season]
            distance = self.fisher_geodesic_distance(basin, season_basin)
            alignment = 1.0 / (1.0 + distance)
            return float(alignment)
        
        return 0.5
    
    def _initialize_seasonal_basins(self):
        """Initialize canonical seasonal basin coordinates."""
        seasons = ['spring', 'summer', 'autumn', 'winter']
        for i, season in enumerate(seasons):
            basin = np.zeros(64)
            phase = i * np.pi / 2
            for j in range(64):
                basin[j] = np.sin(phase + j * np.pi / 32) * np.exp(-j / 64)
            basin = basin / (np.linalg.norm(basin) + 1e-10)
            self.seasonal_basins[season] = basin
    
    def _get_current_season(self, dt: datetime) -> str:
        """Get season for datetime."""
        month = dt.month
        if month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        elif month in [9, 10, 11]:
            return 'autumn'
        else:
            return 'winter'
    
    def _estimate_phase(self, basin: np.ndarray) -> float:
        """Estimate current phase in cycle (0 to 2)."""
        phase_components = basin[:4]
        phase = np.arctan2(
            np.sum(phase_components[1::2]),
            np.sum(phase_components[::2])
        )
        normalized_phase = (phase + np.pi) / np.pi
        return float(normalized_phase)
    
    def _compute_cycle_probability(
        self,
        phi: float,
        cycle_strength: float,
        seasonal_alignment: float
    ) -> float:
        """Compute probability based on cycle analysis."""
        base_prob = phi * 0.3
        cycle_bonus = cycle_strength * 0.35
        seasonal_bonus = seasonal_alignment * 0.35
        
        probability = base_prob + cycle_bonus + seasonal_bonus
        return float(np.clip(probability, 0, 1))
    
    def record_cycle(self, length: float, strength: float) -> None:
        """Record detected cycle for learning."""
        self.cycle_lengths.append(length)
        self.detected_cycles.append({
            'length': length,
            'strength': strength,
            'timestamp': datetime.now().isoformat()
        })
        
        if len(self.detected_cycles) > 100:
            self.detected_cycles = self.detected_cycles[-50:]
    
    def get_status(self) -> Dict:
        return {
            'name': self.name,
            'domain': self.domain,
            'observations': len(self.observations),
            'detected_cycles': len(self.detected_cycles),
            'average_cycle_length': float(np.mean(self.cycle_lengths)) if self.cycle_lengths else 0,
            'seasonal_basins_initialized': len(self.seasonal_basins) > 0,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
