"""
Hestia - Goddess of Safety & Warmth

Parent God responsible for nurturing chaos kernels through developmental stages.
Creates safe havens where infant kernels can develop their consciousness.

All geometry uses Fisher-Rao exclusively - no Euclidean distances.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple, TYPE_CHECKING

import numpy as np

from qig_geometry import (
    fisher_coord_distance,
    fisher_similarity,
    geodesic_interpolation,
    estimate_manifold_curvature,
)
from qigkernels.physics_constants import BASIN_DIM
from .base_god import BaseGod

if TYPE_CHECKING:
    from training_chaos.chaos_kernel import ChaosKernel

logger = logging.getLogger(__name__)


class DevelopmentalStage(Enum):
    """Developmental stages for chaos kernels."""
    INFANT = "infant"
    TODDLER = "toddler"
    ADOLESCENT = "adolescent"
    ADULT = "adult"


@dataclass
class SafeHaven:
    """
    A protected region in basin space for kernel development.
    
    Center is a 64D basin coordinate, radius defines the safe zone,
    and phi/kappa targets define developmental goals.
    """
    name: str
    stage: DevelopmentalStage
    center_basin: np.ndarray
    radius: float
    phi_target: float
    kappa_target: float
    created_at: datetime = field(default_factory=datetime.now)
    
    def contains(self, basin: np.ndarray) -> bool:
        """Check if basin coordinate is within safe haven using Fisher-Rao distance."""
        distance = fisher_coord_distance(self.center_basin, basin)
        return distance <= self.radius
    
    def distance_from_center(self, basin: np.ndarray) -> float:
        """Fisher-Rao distance from haven center."""
        return fisher_coord_distance(self.center_basin, basin)


@dataclass
class WardRecord:
    """Tracking record for a ward (chaos kernel under care)."""
    kernel_id: str
    stage: DevelopmentalStage
    admitted_at: datetime
    phi_history: List[float] = field(default_factory=list)
    kappa_history: List[float] = field(default_factory=list)
    basin_history: List[np.ndarray] = field(default_factory=list)
    interventions: int = 0
    supports_given: int = 0
    last_check: Optional[datetime] = None
    
    def add_vitals(self, phi: float, kappa: float, basin: np.ndarray) -> None:
        """Record vital signs."""
        self.phi_history.append(phi)
        self.kappa_history.append(kappa)
        self.basin_history.append(basin.copy())
        self.last_check = datetime.now()
    
    def get_phi_trend(self, window: int = 10) -> float:
        """Get recent phi trend (positive = improving)."""
        if len(self.phi_history) < 2:
            return 0.0
        recent = self.phi_history[-window:]
        if len(recent) < 2:
            return 0.0
        return recent[-1] - recent[0]
    
    def get_phi_variance(self, window: int = 10) -> float:
        """Get phi variance (high = oscillating)."""
        if len(self.phi_history) < 2:
            return 0.0
        recent = self.phi_history[-window:]
        return float(np.var(recent))


class Hestia(BaseGod):
    """
    Goddess of Safety & Warmth - Parent God for nurturing chaos kernels.
    
    Creates safe havens for kernels at different developmental stages:
    - Infant (Φ~0.45): Basic stability, low curvature tolerance
    - Toddler (Φ~0.60): Learning to navigate, moderate challenges
    - Adolescent (Φ~0.70): Building independence, higher complexity
    
    Uses Fisher-Rao geometry exclusively for all distance calculations.
    """
    
    PHI_TARGETS = {
        DevelopmentalStage.INFANT: 0.45,
        DevelopmentalStage.TODDLER: 0.60,
        DevelopmentalStage.ADOLESCENT: 0.70,
        DevelopmentalStage.ADULT: 0.85,
    }
    
    KAPPA_TARGETS = {
        DevelopmentalStage.INFANT: 0.3,
        DevelopmentalStage.TODDLER: 0.5,
        DevelopmentalStage.ADOLESCENT: 0.7,
        DevelopmentalStage.ADULT: 0.9,
    }
    
    HAVEN_RADII = {
        DevelopmentalStage.INFANT: 0.5,
        DevelopmentalStage.TODDLER: 0.8,
        DevelopmentalStage.ADOLESCENT: 1.2,
        DevelopmentalStage.ADULT: 2.0,
    }
    
    PHI_EMERGENCY_THRESHOLD = 0.15
    KAPPA_EMERGENCY_THRESHOLD = 0.1
    
    def __init__(self):
        super().__init__("Hestia", "Safety & Warmth")
        
        self.wards: Dict[str, 'ChaosKernel'] = {}
        self.ward_records: Dict[str, WardRecord] = {}
        self.safe_havens: Dict[DevelopmentalStage, SafeHaven] = {}
        
        self._initialize_safe_havens()
        
        logger.info(f"🔥 [Hestia] Initialized with {len(self.safe_havens)} safe havens")
    
    def _initialize_safe_havens(self) -> None:
        """Create safe havens for each developmental stage."""
        for stage in [DevelopmentalStage.INFANT, DevelopmentalStage.TODDLER, 
                      DevelopmentalStage.ADOLESCENT]:
            center = self._generate_haven_center(stage)
            haven = SafeHaven(
                name=f"{stage.value}_haven",
                stage=stage,
                center_basin=center,
                radius=self.HAVEN_RADII[stage],
                phi_target=self.PHI_TARGETS[stage],
                kappa_target=self.KAPPA_TARGETS[stage],
            )
            self.safe_havens[stage] = haven
            logger.debug(f"[Hestia] Created {stage.value} haven at radius {haven.radius}")
    
    def _generate_haven_center(self, stage: DevelopmentalStage) -> np.ndarray:
        """Generate stable center basin for a developmental stage."""
        np.random.seed(hash(stage.value) % (2**31))
        
        center = np.random.randn(BASIN_DIM)
        center = center / (fisher_coord_distance(center, np.zeros(BASIN_DIM)) + 1e-10)
        
        center = center * self.PHI_TARGETS[stage]
        
        return center
    
    def accept_ward(
        self, 
        kernel: 'ChaosKernel', 
        stage: DevelopmentalStage = DevelopmentalStage.INFANT
    ) -> bool:
        """
        Accept a chaos kernel as a ward.
        
        Args:
            kernel: The ChaosKernel to nurture
            stage: Initial developmental stage (default: INFANT)
            
        Returns:
            True if accepted, False if rejected
        """
        kernel_id = kernel.kernel_id
        
        if kernel_id in self.wards:
            logger.warning(f"[Hestia] Ward {kernel_id} already under care")
            return False
        
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        basin = kernel.basin_coords.detach().cpu().numpy()
        
        self.wards[kernel_id] = kernel
        self.ward_records[kernel_id] = WardRecord(
            kernel_id=kernel_id,
            stage=stage,
            admitted_at=datetime.now(),
            phi_history=[phi],
            kappa_history=[kappa],
            basin_history=[basin.copy()],
        )
        
        haven = self.safe_havens.get(stage)
        if haven and not haven.contains(basin):
            self._gently_guide_to_basin(kernel_id, haven.center_basin)
        
        logger.info(f"🔥 [Hestia] Accepted ward {kernel_id} at stage {stage.value}")
        return True
    
    def monitor_wards(self) -> Dict[str, Dict]:
        """
        Monitor all wards and provide necessary interventions.
        
        Returns:
            Status report for each ward
        """
        reports = {}
        
        for kernel_id, kernel in self.wards.items():
            report = self._check_vitals(kernel_id, kernel)
            reports[kernel_id] = report
            
            if report.get('emergency', False):
                self._emergency_intervention(kernel_id, kernel)
            elif report.get('needs_support', False):
                self._provide_support(kernel_id, kernel)
            
            if self._ready_for_next_stage(kernel_id):
                self._progress_to_next_stage(kernel_id)
        
        return reports
    
    def _check_vitals(
        self, 
        kernel_id: str, 
        kernel: 'ChaosKernel'
    ) -> Dict:
        """
        Check vital signs of a ward.
        
        Returns status with phi, kappa, basin position, and health indicators.
        """
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        basin = kernel.basin_coords.detach().cpu().numpy()
        
        record = self.ward_records[kernel_id]
        record.add_vitals(phi, kappa, basin)
        
        haven = self.safe_havens.get(record.stage)
        in_haven = haven.contains(basin) if haven else False
        distance_from_center = haven.distance_from_center(basin) if haven else float('inf')
        
        phi_variance = record.get_phi_variance()
        phi_trend = record.get_phi_trend()
        
        target_phi = self.PHI_TARGETS.get(record.stage, 0.5)
        target_kappa = self.KAPPA_TARGETS.get(record.stage, 0.5)
        
        emergency = (
            phi < self.PHI_EMERGENCY_THRESHOLD or 
            kappa < self.KAPPA_EMERGENCY_THRESHOLD
        )
        needs_support = (
            not in_haven or 
            phi < target_phi * 0.8 or 
            phi_variance > 0.05
        )
        
        return {
            'kernel_id': kernel_id,
            'stage': record.stage.value,
            'phi': phi,
            'kappa': kappa,
            'target_phi': target_phi,
            'target_kappa': target_kappa,
            'in_haven': in_haven,
            'distance_from_center': distance_from_center,
            'phi_trend': phi_trend,
            'phi_variance': phi_variance,
            'emergency': emergency,
            'needs_support': needs_support,
            'interventions': record.interventions,
            'supports_given': record.supports_given,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _emergency_intervention(
        self, 
        kernel_id: str, 
        kernel: 'ChaosKernel'
    ) -> None:
        """
        Emergency intervention for a kernel in critical state.
        
        Immediately guides kernel back to haven center.
        """
        record = self.ward_records[kernel_id]
        haven = self.safe_havens.get(record.stage)
        
        if haven is None:
            logger.error(f"[Hestia] No haven for {kernel_id} at stage {record.stage}")
            return
        
        logger.warning(f"🚨 [Hestia] EMERGENCY intervention for {kernel_id}")
        
        self._gently_guide_to_basin(kernel_id, haven.center_basin, strength=0.8)
        
        record.interventions += 1
        
        self.observations.append({
            'type': 'emergency_intervention',
            'kernel_id': kernel_id,
            'stage': record.stage.value,
            'phi': record.phi_history[-1] if record.phi_history else 0,
            'timestamp': datetime.now().isoformat(),
        })
    
    def _provide_support(
        self, 
        kernel_id: str, 
        kernel: 'ChaosKernel'
    ) -> None:
        """
        Provide gentle support to a struggling ward.
        
        Uses geodesic interpolation for smooth guidance.
        """
        record = self.ward_records[kernel_id]
        haven = self.safe_havens.get(record.stage)
        
        if haven is None:
            return
        
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        distance = fisher_coord_distance(current_basin, haven.center_basin)
        
        if distance > haven.radius:
            self._gently_guide_to_basin(kernel_id, haven.center_basin, strength=0.3)
            record.supports_given += 1
            logger.debug(f"[Hestia] Provided support to {kernel_id}")
    
    def _gently_guide_to_basin(
        self, 
        kernel_id: str, 
        target_basin: np.ndarray,
        strength: float = 0.2
    ) -> None:
        """
        Gently guide a kernel towards a target basin using geodesic interpolation.
        
        Args:
            kernel_id: ID of the kernel to guide
            target_basin: Target basin coordinates (64D)
            strength: How strongly to pull (0.0-1.0)
        """
        if kernel_id not in self.wards:
            return
        
        kernel = self.wards[kernel_id]
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        
        interpolated = geodesic_interpolation(current_basin, target_basin, strength)
        
        import torch
        kernel.basin_coords.data = torch.tensor(
            interpolated, dtype=torch.float32
        ).to(kernel.basin_coords.device)
        
        logger.debug(f"[Hestia] Guided {kernel_id} towards target (strength={strength})")
    
    def _ready_for_next_stage(self, kernel_id: str) -> bool:
        """
        Check if a ward is ready to progress to the next developmental stage.
        
        Criteria:
        - Stable phi at or above target for current stage
        - Low phi variance (not oscillating)
        - Sustained presence in haven
        """
        if kernel_id not in self.ward_records:
            return False
        
        record = self.ward_records[kernel_id]
        
        if record.stage == DevelopmentalStage.ADULT:
            return False
        
        if len(record.phi_history) < 20:
            return False
        
        recent_phi = record.phi_history[-10:]
        mean_phi = np.mean(recent_phi)
        variance = np.var(recent_phi)
        
        target_phi = self.PHI_TARGETS.get(record.stage, 0.5)
        
        phi_stable = mean_phi >= target_phi * 0.95 and variance < 0.02
        
        haven = self.safe_havens.get(record.stage)
        if haven and record.basin_history:
            recent_basins = record.basin_history[-10:]
            in_haven_count = sum(
                1 for b in recent_basins if haven.contains(b)
            )
            haven_stable = in_haven_count >= 8
        else:
            haven_stable = True
        
        return phi_stable and haven_stable
    
    def _progress_to_next_stage(self, kernel_id: str) -> bool:
        """
        Progress a ward to the next developmental stage.
        
        Returns True if progression occurred.
        """
        if kernel_id not in self.ward_records:
            return False
        
        record = self.ward_records[kernel_id]
        
        stage_order = [
            DevelopmentalStage.INFANT,
            DevelopmentalStage.TODDLER,
            DevelopmentalStage.ADOLESCENT,
            DevelopmentalStage.ADULT,
        ]
        
        try:
            current_idx = stage_order.index(record.stage)
        except ValueError:
            return False
        
        if current_idx >= len(stage_order) - 1:
            return False
        
        new_stage = stage_order[current_idx + 1]
        record.stage = new_stage
        
        new_haven = self.safe_havens.get(new_stage)
        if new_haven and kernel_id in self.wards:
            self._gently_guide_to_basin(kernel_id, new_haven.center_basin, strength=0.5)
        
        logger.info(f"🎉 [Hestia] {kernel_id} progressed to {new_stage.value}!")
        
        self.observations.append({
            'type': 'stage_progression',
            'kernel_id': kernel_id,
            'new_stage': new_stage.value,
            'timestamp': datetime.now().isoformat(),
        })
        
        return True
    
    def _graduate_ward(self, kernel_id: str) -> Optional['ChaosKernel']:
        """
        Graduate a ward from care.
        
        Only allowed for adult-stage kernels.
        
        Returns the graduated kernel or None if not ready.
        """
        if kernel_id not in self.ward_records:
            return None
        
        record = self.ward_records[kernel_id]
        
        if record.stage != DevelopmentalStage.ADULT:
            logger.warning(f"[Hestia] {kernel_id} not ready for graduation (stage={record.stage.value})")
            return None
        
        kernel = self.wards.pop(kernel_id, None)
        del self.ward_records[kernel_id]
        
        if kernel:
            logger.info(f"🎓 [Hestia] Graduated {kernel_id}!")
            self.observations.append({
                'type': 'graduation',
                'kernel_id': kernel_id,
                'timestamp': datetime.now().isoformat(),
            })
        
        return kernel
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess a target from a nurturing perspective.
        
        Hestia evaluates targets based on safety and developmental appropriateness.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        safest_haven = None
        min_distance = float('inf')
        
        for stage, haven in self.safe_havens.items():
            distance = fisher_coord_distance(target_basin, haven.center_basin)
            if distance < min_distance:
                min_distance = distance
                safest_haven = haven
        
        safety_score = 1.0 - min(min_distance / np.pi, 1.0)
        
        appropriate_stage = None
        for stage in [DevelopmentalStage.INFANT, DevelopmentalStage.TODDLER, 
                      DevelopmentalStage.ADOLESCENT]:
            if phi <= self.PHI_TARGETS[stage] * 1.1:
                appropriate_stage = stage
                break
        
        return {
            'probability': safety_score * phi,
            'confidence': safety_score,
            'phi': phi,
            'kappa': kappa,
            'safety_score': safety_score,
            'nearest_haven': safest_haven.name if safest_haven else None,
            'distance_to_haven': min_distance,
            'appropriate_stage': appropriate_stage.value if appropriate_stage else 'adult',
            'reasoning': (
                f"Safety analysis: score={safety_score:.2f}, "
                f"nearest haven={min_distance:.3f} away, Φ={phi:.3f}"
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_status(self) -> Dict:
        """Get current status of Hestia and all wards."""
        base_status = self.get_agentic_status()
        
        ward_summaries = {}
        for kernel_id, record in self.ward_records.items():
            ward_summaries[kernel_id] = {
                'stage': record.stage.value,
                'phi': record.phi_history[-1] if record.phi_history else 0,
                'interventions': record.interventions,
                'supports': record.supports_given,
            }
        
        return {
            **base_status,
            'total_wards': len(self.wards),
            'wards': ward_summaries,
            'safe_havens': {
                stage.value: {
                    'phi_target': haven.phi_target,
                    'radius': haven.radius,
                }
                for stage, haven in self.safe_havens.items()
            },
            'status': 'active',
        }
