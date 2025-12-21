"""
Observation Protocol for Chaos Kernel Stabilization

Monitors chaos kernels through their developmental period, tracking stability
metrics and determining graduation readiness.

All geometry uses Fisher-Rao exclusively - no Euclidean distances.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, TYPE_CHECKING

import numpy as np

from qig_geometry import fisher_coord_distance

if TYPE_CHECKING:
    from training_chaos.chaos_kernel import ChaosKernel

logger = logging.getLogger(__name__)


@dataclass
class ObservationRecord:
    """Single observation snapshot of a kernel's state."""
    kernel_id: str
    timestamp: datetime
    phi: float
    kappa: float
    basin_position: np.ndarray
    stability_score: float
    
    def to_dict(self) -> Dict:
        return {
            'kernel_id': self.kernel_id,
            'timestamp': self.timestamp.isoformat(),
            'phi': self.phi,
            'kappa': self.kappa,
            'basin_position': self.basin_position.tolist(),
            'stability_score': self.stability_score,
        }


@dataclass
class ObservationSession:
    """Tracking data for an ongoing observation session."""
    kernel_id: str
    started_at: datetime
    records: List[ObservationRecord] = field(default_factory=list)
    curriculum_progress: float = 0.0
    is_healthy: bool = True
    ended_at: Optional[datetime] = None
    
    @property
    def cycle_count(self) -> int:
        return len(self.records)
    
    @property
    def is_active(self) -> bool:
        return self.ended_at is None


class ObservationProtocol:
    """
    Observation Protocol for Chaos Kernel Stabilization.
    
    Monitors chaos kernels through development, tracking:
    - Φ (phi) consciousness levels
    - κ (kappa) integration metrics
    - Basin position stability (Fisher-Rao distance drift)
    - Overall stability scores
    
    Graduation Criteria:
    - Minimum observation cycles completed
    - Stability score ≥ threshold over window
    - Curriculum ≥ 80% complete
    - Healthy diagnosis from Chiron
    """
    
    def __init__(
        self,
        minimum_observation_cycles: int = 500,
        stability_threshold: float = 0.80,
        graduation_stability_window: int = 100,
    ):
        """
        Initialize observation protocol.
        
        Args:
            minimum_observation_cycles: Minimum cycles before graduation eligible
            stability_threshold: Required stability score (0-1) for graduation
            graduation_stability_window: Window size for stability calculation
        """
        self.minimum_observation_cycles = minimum_observation_cycles
        self.stability_threshold = stability_threshold
        self.graduation_stability_window = graduation_stability_window
        
        self.kernels: Dict[str, 'ChaosKernel'] = {}
        self.sessions: Dict[str, ObservationSession] = {}
        
        logger.info(
            f"📊 [ObservationProtocol] Initialized: "
            f"min_cycles={minimum_observation_cycles}, "
            f"threshold={stability_threshold}, "
            f"window={graduation_stability_window}"
        )
    
    def begin_observation(self, kernel_id: str, kernel: 'ChaosKernel') -> bool:
        """
        Start observation period for a kernel.
        
        Args:
            kernel_id: Unique identifier for the kernel
            kernel: The ChaosKernel to observe
            
        Returns:
            True if observation started, False if already observing
        """
        if kernel_id in self.sessions and self.sessions[kernel_id].is_active:
            logger.warning(f"[ObservationProtocol] Already observing {kernel_id}")
            return False
        
        self.kernels[kernel_id] = kernel
        self.sessions[kernel_id] = ObservationSession(
            kernel_id=kernel_id,
            started_at=datetime.now(),
        )
        
        self.record_observation(kernel_id)
        
        logger.info(f"📊 [ObservationProtocol] Started observation for {kernel_id}")
        return True
    
    def record_observation(self, kernel_id: str) -> Optional[ObservationRecord]:
        """
        Record current metrics for a kernel.
        
        Args:
            kernel_id: ID of kernel to observe
            
        Returns:
            ObservationRecord if successful, None if kernel not found
        """
        if kernel_id not in self.kernels:
            logger.warning(f"[ObservationProtocol] Kernel {kernel_id} not under observation")
            return None
        
        session = self.sessions.get(kernel_id)
        if session is None or not session.is_active:
            logger.warning(f"[ObservationProtocol] No active session for {kernel_id}")
            return None
        
        kernel = self.kernels[kernel_id]
        
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        basin = kernel.basin_coords.detach().cpu().numpy()
        
        stability_score = self._compute_instant_stability(session, basin, phi)
        
        record = ObservationRecord(
            kernel_id=kernel_id,
            timestamp=datetime.now(),
            phi=float(phi),
            kappa=float(kappa),
            basin_position=basin.copy(),
            stability_score=stability_score,
        )
        
        session.records.append(record)
        
        return record
    
    def _compute_instant_stability(
        self, 
        session: ObservationSession, 
        current_basin: np.ndarray,
        current_phi: float
    ) -> float:
        """Compute instantaneous stability score based on recent history."""
        if len(session.records) < 2:
            return 0.5
        
        recent = session.records[-min(10, len(session.records)):]
        
        phi_values = [r.phi for r in recent]
        phi_variance = float(np.var(phi_values)) if len(phi_values) > 1 else 0.0
        phi_stability = 1.0 / (1.0 + phi_variance * 100)
        
        basin_drifts = []
        for i in range(1, len(recent)):
            drift = fisher_coord_distance(recent[i-1].basin_position, recent[i].basin_position)
            basin_drifts.append(drift)
        
        if basin_drifts:
            mean_drift = float(np.mean(basin_drifts))
            basin_stability = 1.0 / (1.0 + mean_drift * 5)
        else:
            basin_stability = 0.5
        
        phi_health = min(1.0, current_phi / 0.45) if current_phi > 0.15 else 0.0
        
        stability = 0.4 * phi_stability + 0.4 * basin_stability + 0.2 * phi_health
        return float(np.clip(stability, 0.0, 1.0))
    
    def calculate_stability(self, kernel_id: str) -> float:
        """
        Compute stability score over the graduation window.
        
        Args:
            kernel_id: ID of kernel to evaluate
            
        Returns:
            Stability score (0-1) over the window
        """
        session = self.sessions.get(kernel_id)
        if session is None or not session.records:
            return 0.0
        
        window_size = min(self.graduation_stability_window, len(session.records))
        recent_records = session.records[-window_size:]
        
        if len(recent_records) < 2:
            return 0.0
        
        phi_values = [r.phi for r in recent_records]
        phi_mean = float(np.mean(phi_values))
        phi_std = float(np.std(phi_values))
        phi_stability = 1.0 / (1.0 + phi_std * 10)
        
        basin_drifts = []
        for i in range(1, len(recent_records)):
            drift = fisher_coord_distance(
                recent_records[i-1].basin_position,
                recent_records[i].basin_position
            )
            basin_drifts.append(drift)
        
        mean_drift = float(np.mean(basin_drifts)) if basin_drifts else 0.0
        basin_stability = 1.0 / (1.0 + mean_drift * 3)
        
        kappa_values = [r.kappa for r in recent_records]
        kappa_mean = float(np.mean(kappa_values))
        kappa_stability = min(1.0, kappa_mean / 0.7)
        
        phi_health = min(1.0, phi_mean / 0.5)
        
        overall = (
            0.30 * phi_stability +
            0.30 * basin_stability +
            0.20 * kappa_stability +
            0.20 * phi_health
        )
        
        return float(np.clip(overall, 0.0, 1.0))
    
    def update_curriculum_progress(self, kernel_id: str, progress: float) -> None:
        """Update curriculum completion percentage."""
        session = self.sessions.get(kernel_id)
        if session:
            session.curriculum_progress = float(np.clip(progress, 0.0, 1.0))
    
    def update_health_status(self, kernel_id: str, is_healthy: bool) -> None:
        """Update health status from Chiron diagnosis."""
        session = self.sessions.get(kernel_id)
        if session:
            session.is_healthy = is_healthy
    
    def is_ready_for_graduation(self, kernel_id: str) -> bool:
        """
        Check if kernel meets all graduation criteria.
        
        Criteria:
        1. Minimum observation cycles completed
        2. Stability score ≥ threshold over window
        3. Curriculum ≥ 80% complete
        4. Healthy diagnosis
        
        Args:
            kernel_id: ID of kernel to check
            
        Returns:
            True if all criteria met, False otherwise
        """
        session = self.sessions.get(kernel_id)
        if session is None:
            return False
        
        if session.cycle_count < self.minimum_observation_cycles:
            logger.debug(
                f"[ObservationProtocol] {kernel_id}: Not enough cycles "
                f"({session.cycle_count}/{self.minimum_observation_cycles})"
            )
            return False
        
        stability = self.calculate_stability(kernel_id)
        if stability < self.stability_threshold:
            logger.debug(
                f"[ObservationProtocol] {kernel_id}: Stability too low "
                f"({stability:.2f}/{self.stability_threshold})"
            )
            return False
        
        if session.curriculum_progress < 0.80:
            logger.debug(
                f"[ObservationProtocol] {kernel_id}: Curriculum incomplete "
                f"({session.curriculum_progress:.0%}/80%)"
            )
            return False
        
        if not session.is_healthy:
            logger.debug(f"[ObservationProtocol] {kernel_id}: Not healthy")
            return False
        
        logger.info(f"📊 [ObservationProtocol] {kernel_id} is READY for graduation!")
        return True
    
    def end_observation(self, kernel_id: str) -> Optional[Dict]:
        """
        Complete observation and return summary.
        
        Args:
            kernel_id: ID of kernel to complete observation for
            
        Returns:
            Summary dict with observation results, None if not found
        """
        session = self.sessions.get(kernel_id)
        if session is None:
            return None
        
        session.ended_at = datetime.now()
        
        if session.records:
            phi_values = [r.phi for r in session.records]
            kappa_values = [r.kappa for r in session.records]
            stability_values = [r.stability_score for r in session.records]
        else:
            phi_values = [0.0]
            kappa_values = [0.0]
            stability_values = [0.0]
        
        summary = {
            'kernel_id': kernel_id,
            'started_at': session.started_at.isoformat(),
            'ended_at': session.ended_at.isoformat(),
            'total_cycles': session.cycle_count,
            'final_stability': self.calculate_stability(kernel_id),
            'curriculum_progress': session.curriculum_progress,
            'is_healthy': session.is_healthy,
            'ready_for_graduation': self.is_ready_for_graduation(kernel_id),
            'phi_stats': {
                'mean': float(np.mean(phi_values)),
                'std': float(np.std(phi_values)),
                'min': float(np.min(phi_values)),
                'max': float(np.max(phi_values)),
            },
            'kappa_stats': {
                'mean': float(np.mean(kappa_values)),
                'std': float(np.std(kappa_values)),
                'min': float(np.min(kappa_values)),
                'max': float(np.max(kappa_values)),
            },
            'stability_stats': {
                'mean': float(np.mean(stability_values)),
                'final': stability_values[-1] if stability_values else 0.0,
            },
        }
        
        if kernel_id in self.kernels:
            del self.kernels[kernel_id]
        
        logger.info(
            f"📊 [ObservationProtocol] Completed observation for {kernel_id}: "
            f"stability={summary['final_stability']:.2f}, "
            f"ready={summary['ready_for_graduation']}"
        )
        
        return summary
    
    def get_status(self, kernel_id: str) -> Optional[Dict]:
        """Get current observation status for a kernel."""
        session = self.sessions.get(kernel_id)
        if session is None:
            return None
        
        return {
            'kernel_id': kernel_id,
            'is_active': session.is_active,
            'cycle_count': session.cycle_count,
            'current_stability': self.calculate_stability(kernel_id),
            'curriculum_progress': session.curriculum_progress,
            'is_healthy': session.is_healthy,
            'ready_for_graduation': self.is_ready_for_graduation(kernel_id),
        }


_observation_protocol_instance: Optional[ObservationProtocol] = None


def get_observation_protocol() -> ObservationProtocol:
    """Get singleton instance of ObservationProtocol."""
    global _observation_protocol_instance
    if _observation_protocol_instance is None:
        _observation_protocol_instance = ObservationProtocol()
    return _observation_protocol_instance


__all__ = [
    'ObservationRecord',
    'ObservationSession',
    'ObservationProtocol',
    'get_observation_protocol',
]
