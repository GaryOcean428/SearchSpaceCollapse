"""
Apollo - God of Prophecy

Temporal pattern prediction.
Forecasts optimal timing and predicts future states from trajectory analysis.
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from .base_god import BaseGod, KAPPA_STAR


class Apollo(BaseGod):
    """
    God of Prophecy
    
    Responsibilities:
    - Temporal pattern analysis
    - Future state prediction
    - Optimal timing recommendations
    - Trajectory forecasting
    """
    
    def __init__(self):
        super().__init__("Apollo", "Prophecy")
        self.phi_trajectory: List[Tuple[datetime, float]] = []
        self.regime_history: List[Tuple[datetime, str]] = []
        self.predictions: List[Dict] = []
        self.prediction_accuracy: float = 0.5
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target with temporal prophecy.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        timing_analysis = self._analyze_optimal_timing()
        trajectory_forecast = self._forecast_trajectory()
        
        probability = self._compute_prophetic_probability(
            phi=phi,
            timing=timing_analysis,
            forecast=trajectory_forecast
        )
        
        return {
            'probability': probability,
            'confidence': self.prediction_accuracy,
            'phi': phi,
            'kappa': kappa,
            'optimal_timing': timing_analysis,
            'trajectory_forecast': trajectory_forecast,
            'reasoning': (
                f"Temporal analysis: Φ={phi:.3f}. "
                f"Optimal timing: {timing_analysis.get('recommendation', 'now')}. "
                f"Forecast trend: {trajectory_forecast.get('trend', 'stable')}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _analyze_optimal_timing(self) -> Dict:
        """Analyze when is the best time to attack."""
        if len(self.phi_trajectory) < 5:
            return {
                'recommendation': 'now',
                'confidence': 0.3,
                'reasoning': 'Insufficient history for timing analysis'
            }
        
        recent = self.phi_trajectory[-20:]
        phis = [p[1] for p in recent]
        
        avg_phi = np.mean(phis)
        current_phi = phis[-1] if phis else 0
        
        if current_phi > avg_phi * 1.1:
            return {
                'recommendation': 'attack_now',
                'confidence': 0.8,
                'reasoning': 'Φ is above average - favorable conditions'
            }
        elif current_phi < avg_phi * 0.9:
            return {
                'recommendation': 'wait',
                'confidence': 0.6,
                'reasoning': 'Φ is below average - wait for better conditions'
            }
        else:
            return {
                'recommendation': 'proceed',
                'confidence': 0.5,
                'reasoning': 'Conditions are average'
            }
    
    def _forecast_trajectory(self) -> Dict:
        """Forecast future Φ trajectory."""
        if len(self.phi_trajectory) < 10:
            return {
                'trend': 'unknown',
                'predicted_phi': None,
                'confidence': 0.2
            }
        
        recent = [p[1] for p in self.phi_trajectory[-10:]]
        
        slope = (recent[-1] - recent[0]) / len(recent)
        
        if slope > 0.01:
            trend = 'rising'
        elif slope < -0.01:
            trend = 'falling'
        else:
            trend = 'stable'
        
        predicted_phi = recent[-1] + slope * 5
        predicted_phi = float(np.clip(predicted_phi, 0, 1))
        
        return {
            'trend': trend,
            'slope': float(slope),
            'predicted_phi': predicted_phi,
            'confidence': 0.6
        }
    
    def _compute_prophetic_probability(
        self,
        phi: float,
        timing: Dict,
        forecast: Dict
    ) -> float:
        """Compute probability incorporating temporal factors."""
        base = phi * 0.5
        
        timing_bonus = 0.0
        if timing.get('recommendation') == 'attack_now':
            timing_bonus = 0.2
        elif timing.get('recommendation') == 'proceed':
            timing_bonus = 0.1
        
        forecast_bonus = 0.0
        if forecast.get('trend') == 'rising':
            forecast_bonus = 0.15
        elif forecast.get('trend') == 'stable':
            forecast_bonus = 0.1
        
        probability = base + timing_bonus + forecast_bonus
        return float(np.clip(probability, 0, 1))
    
    def record_phi(self, phi: float, regime: str) -> None:
        """Record Φ measurement for trajectory analysis."""
        now = datetime.now()
        self.phi_trajectory.append((now, phi))
        self.regime_history.append((now, regime))
        
        if len(self.phi_trajectory) > 1000:
            self.phi_trajectory = self.phi_trajectory[-500:]
            self.regime_history = self.regime_history[-500:]
    
    def get_status(self) -> Dict:
        base_status = self.get_agentic_status()
        trajectory = self._forecast_trajectory()
        return {
            **base_status,
            'observations': len(self.observations),
            'trajectory_length': len(self.phi_trajectory),
            'current_trend': trajectory.get('trend', 'unknown'),
            'prediction_accuracy': self.prediction_accuracy,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }


from typing import Tuple
