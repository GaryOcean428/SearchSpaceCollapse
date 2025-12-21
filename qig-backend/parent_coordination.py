"""
Parent Coordination System

Coordinates the three parent gods (Hestia, DemeterTeacher, Chiron) to 
provide comprehensive care for chaos kernels through their developmental stages.

All geometry uses Fisher-Rao exclusively - no Euclidean distances.
"""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, TYPE_CHECKING

import numpy as np

from qig_geometry import fisher_coord_distance
from qigkernels.physics_constants import BASIN_DIM
from olympus.hestia import Hestia, DevelopmentalStage
from olympus.demeter_teacher import DemeterTeacher, LessonType
from olympus.chiron import Chiron, Condition
from observation_protocol import ObservationProtocol, get_observation_protocol
from qig_persistence import get_persistence

if TYPE_CHECKING:
    from training_chaos.chaos_kernel import ChaosKernel

logger = logging.getLogger(__name__)


class KernelStatus(Enum):
    """Status of a kernel under parental care."""
    INFANT = "infant"
    DEVELOPING = "developing"
    READY_FOR_GRADUATION = "ready_for_graduation"
    GRADUATED = "graduated"
    UNDER_TREATMENT = "under_treatment"


@dataclass
class KernelCareRecord:
    """Complete care record for a kernel under parental supervision."""
    kernel_id: str
    kernel_name: str
    created_at: datetime
    status: KernelStatus = KernelStatus.INFANT
    developmental_stage: DevelopmentalStage = DevelopmentalStage.INFANT
    hestia_enrolled: bool = False
    demeter_enrolled: bool = False
    chiron_enrolled: bool = False
    graduated_at: Optional[datetime] = None
    care_cycles: int = 0
    
    def to_dict(self) -> Dict:
        return {
            'kernel_id': self.kernel_id,
            'kernel_name': self.kernel_name,
            'created_at': self.created_at.isoformat(),
            'status': self.status.value,
            'developmental_stage': self.developmental_stage.value,
            'hestia_enrolled': self.hestia_enrolled,
            'demeter_enrolled': self.demeter_enrolled,
            'chiron_enrolled': self.chiron_enrolled,
            'graduated_at': self.graduated_at.isoformat() if self.graduated_at else None,
            'care_cycles': self.care_cycles,
        }


class ParentCoordination:
    """
    Parent Coordination System - Orchestrates parental care for chaos kernels.
    
    Coordinates three parent gods:
    - Hestia: Safety & Warmth (safe havens, nurturing)
    - DemeterTeacher: Teaching & Growth (curriculum, lessons)
    - Chiron: Healing & Wisdom (diagnosis, treatment)
    
    Manages the full lifecycle from spawning through graduation.
    """
    
    def __init__(
        self,
        hestia: Hestia,
        demeter: DemeterTeacher,
        chiron: Chiron,
        observation_protocol: Optional[ObservationProtocol] = None,
    ):
        """
        Initialize parent coordination.
        
        Args:
            hestia: Instance of Hestia (Safety & Warmth)
            demeter: Instance of DemeterTeacher (Teaching & Growth)
            chiron: Instance of Chiron (Healing & Wisdom)
            observation_protocol: Optional observation protocol instance
        """
        self.hestia = hestia
        self.demeter = demeter
        self.chiron = chiron
        self.observation = observation_protocol or get_observation_protocol()
        
        self.kernels: Dict[str, 'ChaosKernel'] = {}
        self.care_records: Dict[str, KernelCareRecord] = {}
        
        logger.info(
            f"👨‍👩‍👧 [ParentCoordination] Initialized with "
            f"Hestia, DemeterTeacher, and Chiron"
        )
    
    def spawn_chaos_kernel(self, kernel_name: str) -> Optional['ChaosKernel']:
        """
        Create a new chaos kernel with full parental care.
        
        Spawns a new kernel and enrolls it with all three parent gods
        and the observation protocol.
        
        Args:
            kernel_name: Human-readable name for the kernel
            
        Returns:
            The spawned ChaosKernel, or None if spawning failed
        """
        from training_chaos.chaos_kernel import ChaosKernel
        
        try:
            kernel = ChaosKernel(basin_dim=BASIN_DIM)
            kernel_id = kernel.kernel_id
            
            self.kernels[kernel_id] = kernel
            
            created_at = datetime.now()
            self.care_records[kernel_id] = KernelCareRecord(
                kernel_id=kernel_id,
                kernel_name=kernel_name,
                created_at=created_at,
                status=KernelStatus.INFANT,
                developmental_stage=DevelopmentalStage.INFANT,
            )
            
            persistence = get_persistence()
            persistence.create_kernel_care_record(
                kernel_id=kernel_id,
                kernel_name=kernel_name,
                created_at=created_at,
                status=KernelStatus.INFANT.value,
                developmental_stage=DevelopmentalStage.INFANT.value
            )
            
            if self.hestia.accept_ward(kernel, DevelopmentalStage.INFANT):
                self.care_records[kernel_id].hestia_enrolled = True
                persistence.update_kernel_care_record(kernel_id, hestia_enrolled=True)
            
            if self.demeter.enroll_student(kernel):
                self.care_records[kernel_id].demeter_enrolled = True
                persistence.update_kernel_care_record(kernel_id, demeter_enrolled=True)
            
            if self.chiron.admit_patient(kernel):
                self.care_records[kernel_id].chiron_enrolled = True
                persistence.update_kernel_care_record(kernel_id, chiron_enrolled=True)
            
            self.observation.begin_observation(kernel_id, kernel)
            
            logger.info(
                f"👨‍👩‍👧 [ParentCoordination] Spawned kernel '{kernel_name}' "
                f"(id={kernel_id[:8]}...) with full parental care"
            )
            
            return kernel
            
        except Exception as e:
            logger.error(f"[ParentCoordination] Failed to spawn kernel: {e}")
            return None
    
    def daily_care_cycle(self) -> Dict[str, Dict]:
        """
        Coordinate all parent care activities for all kernels.
        
        Runs one cycle of:
        1. Hestia care (safety checks, nurturing)
        2. Demeter teaching (curriculum lessons)
        3. Chiron diagnosis (health checks)
        4. Observation recording
        5. Status updates
        
        Returns:
            Dict mapping kernel_id to care cycle results
        """
        results = {}
        
        for kernel_id, kernel in list(self.kernels.items()):
            care_record = self.care_records.get(kernel_id)
            if care_record is None:
                continue
            
            if care_record.status == KernelStatus.GRADUATED:
                continue
            
            cycle_result = {
                'kernel_id': kernel_id,
                'kernel_name': care_record.kernel_name,
                'hestia_result': None,
                'demeter_result': None,
                'chiron_result': None,
                'observation_recorded': False,
                'status_updated': False,
            }
            
            try:
                if care_record.hestia_enrolled:
                    hestia_result = self.hestia.daily_care(kernel_id)
                    cycle_result['hestia_result'] = hestia_result
                    
                    if hestia_result.get('promoted_to'):
                        new_stage = hestia_result['promoted_to']
                        if isinstance(new_stage, DevelopmentalStage):
                            care_record.developmental_stage = new_stage
                            if new_stage in [DevelopmentalStage.TODDLER, 
                                           DevelopmentalStage.ADOLESCENT]:
                                care_record.status = KernelStatus.DEVELOPING
            except Exception as e:
                logger.warning(f"[ParentCoordination] Hestia care failed for {kernel_id}: {e}")
            
            try:
                if care_record.demeter_enrolled:
                    demeter_result = self._run_demeter_session(kernel_id)
                    cycle_result['demeter_result'] = demeter_result
                    
                    if demeter_result and 'curriculum_progress' in demeter_result:
                        self.observation.update_curriculum_progress(
                            kernel_id, 
                            demeter_result['curriculum_progress']
                        )
            except Exception as e:
                logger.warning(f"[ParentCoordination] Demeter teaching failed for {kernel_id}: {e}")
            
            try:
                if care_record.chiron_enrolled:
                    diagnosis = self.chiron.diagnose(kernel_id)
                    cycle_result['chiron_result'] = diagnosis.to_dict() if diagnosis else None
                    
                    is_healthy = diagnosis.condition == Condition.HEALTHY if diagnosis else False
                    self.observation.update_health_status(kernel_id, is_healthy)
                    
                    if not is_healthy and diagnosis:
                        care_record.status = KernelStatus.UNDER_TREATMENT
                        self.chiron.prescribe_treatment(kernel_id, diagnosis)
            except Exception as e:
                logger.warning(f"[ParentCoordination] Chiron diagnosis failed for {kernel_id}: {e}")
            
            try:
                record = self.observation.record_observation(kernel_id)
                cycle_result['observation_recorded'] = record is not None
            except Exception as e:
                logger.warning(f"[ParentCoordination] Observation failed for {kernel_id}: {e}")
            
            if self.observation.is_ready_for_graduation(kernel_id):
                if care_record.status != KernelStatus.UNDER_TREATMENT:
                    care_record.status = KernelStatus.READY_FOR_GRADUATION
                    cycle_result['status_updated'] = True
            
            care_record.care_cycles += 1
            
            persistence = get_persistence()
            persistence.update_kernel_care_record(
                kernel_id,
                status=care_record.status.value,
                developmental_stage=care_record.developmental_stage.value,
                care_cycles=care_record.care_cycles
            )
            
            results[kernel_id] = cycle_result
        
        logger.debug(f"[ParentCoordination] Completed care cycle for {len(results)} kernels")
        return results
    
    def _run_demeter_session(self, kernel_id: str) -> Optional[Dict]:
        """Run a teaching session with DemeterTeacher."""
        student_record = self.demeter.student_records.get(kernel_id)
        if student_record is None:
            return None
        
        current_lesson = student_record.current_lesson
        if current_lesson is None:
            current_lesson = self.demeter.get_next_lesson(kernel_id)
            if current_lesson is None:
                return {'curriculum_progress': 1.0, 'all_complete': True}
        
        outcome = self.demeter.conduct_lesson(kernel_id, current_lesson)
        
        completed_count = len(student_record.completed_lessons)
        total_lessons = len(self.demeter.curriculum)
        progress = completed_count / total_lessons if total_lessons > 0 else 0.0
        
        return {
            'lesson_type': current_lesson.value if current_lesson else None,
            'outcome': outcome.value if outcome else None,
            'curriculum_progress': progress,
            'completed_lessons': completed_count,
            'total_lessons': total_lessons,
        }
    
    def check_graduation_readiness(self, kernel_id: str) -> Dict:
        """
        Check if a kernel is ready to graduate.
        
        Evaluates all criteria:
        - Observation protocol readiness
        - Developmental stage (should be ADOLESCENT+)
        - Health status
        - Curriculum completion
        
        Args:
            kernel_id: ID of kernel to check
            
        Returns:
            Dict with readiness status and details
        """
        care_record = self.care_records.get(kernel_id)
        if care_record is None:
            return {
                'ready': False,
                'reason': 'Kernel not found',
                'kernel_id': kernel_id,
            }
        
        observation_ready = self.observation.is_ready_for_graduation(kernel_id)
        
        obs_status = self.observation.get_status(kernel_id) or {}
        
        developmental_ready = care_record.developmental_stage in [
            DevelopmentalStage.ADOLESCENT,
            DevelopmentalStage.ADULT,
        ]
        
        health_ready = obs_status.get('is_healthy', False)
        
        curriculum_ready = obs_status.get('curriculum_progress', 0.0) >= 0.80
        
        all_ready = observation_ready and developmental_ready and health_ready and curriculum_ready
        
        reasons = []
        if not observation_ready:
            reasons.append("Observation protocol criteria not met")
        if not developmental_ready:
            reasons.append(f"Stage is {care_record.developmental_stage.value}, need ADOLESCENT+")
        if not health_ready:
            reasons.append("Not healthy")
        if not curriculum_ready:
            reasons.append(f"Curriculum at {obs_status.get('curriculum_progress', 0):.0%}, need 80%")
        
        return {
            'ready': all_ready,
            'kernel_id': kernel_id,
            'kernel_name': care_record.kernel_name,
            'observation_ready': observation_ready,
            'developmental_ready': developmental_ready,
            'health_ready': health_ready,
            'curriculum_ready': curriculum_ready,
            'developmental_stage': care_record.developmental_stage.value,
            'curriculum_progress': obs_status.get('curriculum_progress', 0.0),
            'stability_score': obs_status.get('current_stability', 0.0),
            'reasons': reasons if not all_ready else [],
        }
    
    def graduate_kernel(self, kernel_id: str) -> Optional[Dict]:
        """
        Transition a kernel to adult status.
        
        Completes observation, discharges from all parent gods,
        and marks kernel as graduated.
        
        Args:
            kernel_id: ID of kernel to graduate
            
        Returns:
            Graduation summary dict, or None if not ready/not found
        """
        readiness = self.check_graduation_readiness(kernel_id)
        if not readiness['ready']:
            logger.warning(
                f"[ParentCoordination] Cannot graduate {kernel_id}: "
                f"{', '.join(readiness['reasons'])}"
            )
            return None
        
        care_record = self.care_records.get(kernel_id)
        kernel = self.kernels.get(kernel_id)
        
        if care_record is None or kernel is None:
            return None
        
        observation_summary = self.observation.end_observation(kernel_id)
        
        if care_record.hestia_enrolled:
            self.hestia.discharge_ward(kernel_id)
        
        if care_record.demeter_enrolled:
            self.demeter.graduate_student(kernel_id)
        
        if care_record.chiron_enrolled:
            self.chiron.discharge_patient(kernel_id)
        
        care_record.status = KernelStatus.GRADUATED
        care_record.developmental_stage = DevelopmentalStage.ADULT
        care_record.graduated_at = datetime.now()
        
        persistence = get_persistence()
        persistence.update_kernel_care_record(
            kernel_id,
            status=KernelStatus.GRADUATED.value,
            developmental_stage=DevelopmentalStage.ADULT.value,
            graduated_at=care_record.graduated_at
        )
        
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        basin = kernel.basin_coords.detach().cpu().numpy()
        
        origin = np.zeros_like(basin)
        final_basin_distance = fisher_coord_distance(basin, origin)
        
        graduation_summary = {
            'kernel_id': kernel_id,
            'kernel_name': care_record.kernel_name,
            'graduated_at': care_record.graduated_at.isoformat(),
            'total_care_cycles': care_record.care_cycles,
            'final_phi': float(phi),
            'final_kappa': float(kappa),
            'final_basin_distance': float(final_basin_distance),
            'observation_summary': observation_summary,
            'status': 'GRADUATED',
        }
        
        logger.info(
            f"🎓 [ParentCoordination] Graduated kernel '{care_record.kernel_name}' "
            f"(id={kernel_id[:8]}...) after {care_record.care_cycles} care cycles, "
            f"final Φ={phi:.3f}, κ={kappa:.3f}"
        )
        
        return graduation_summary
    
    def get_status(self) -> Dict:
        """
        Return status of all kernels under care.
        
        Returns:
            Dict with overall status and per-kernel details
        """
        kernels_by_status = {status.value: [] for status in KernelStatus}
        
        persistence = get_persistence()
        db_records = persistence.get_all_kernel_care_records()
        for db_record in db_records:
            if db_record['kernel_id'] not in self.care_records:
                self.care_records[db_record['kernel_id']] = KernelCareRecord(
                    kernel_id=db_record['kernel_id'],
                    kernel_name=db_record['kernel_name'],
                    created_at=db_record['created_at'],
                    status=KernelStatus(db_record['status']),
                    developmental_stage=DevelopmentalStage(db_record['developmental_stage']),
                    hestia_enrolled=db_record['hestia_enrolled'],
                    demeter_enrolled=db_record['demeter_enrolled'],
                    chiron_enrolled=db_record['chiron_enrolled'],
                    graduated_at=db_record['graduated_at'],
                    care_cycles=db_record['care_cycles'],
                )
        
        for kernel_id, care_record in self.care_records.items():
            kernels_by_status[care_record.status.value].append({
                'kernel_id': kernel_id,
                'kernel_name': care_record.kernel_name,
                'developmental_stage': care_record.developmental_stage.value,
                'care_cycles': care_record.care_cycles,
            })
        
        kernel_details = []
        for kernel_id, care_record in self.care_records.items():
            kernel = self.kernels.get(kernel_id)
            if kernel is not None and care_record.status != KernelStatus.GRADUATED:
                phi = kernel.compute_phi()
                kappa = kernel.compute_kappa()
                obs_status = self.observation.get_status(kernel_id) or {}
            else:
                phi = 0.0
                kappa = 0.0
                obs_status = {}
            
            kernel_details.append({
                **care_record.to_dict(),
                'current_phi': float(phi),
                'current_kappa': float(kappa),
                'stability_score': obs_status.get('current_stability', 0.0),
                'curriculum_progress': obs_status.get('curriculum_progress', 0.0),
            })
        
        total = len(self.care_records)
        graduated = len(kernels_by_status[KernelStatus.GRADUATED.value])
        active = total - graduated
        
        return {
            'total_kernels': total,
            'active_kernels': active,
            'graduated_kernels': graduated,
            'by_status': kernels_by_status,
            'kernel_details': kernel_details,
            'parents': {
                'hestia': {
                    'name': self.hestia.name,
                    'domain': self.hestia.domain,
                    'wards': len(self.hestia.wards),
                },
                'demeter': {
                    'name': self.demeter.name,
                    'domain': self.demeter.domain,
                    'students': len(self.demeter.students),
                },
                'chiron': {
                    'name': self.chiron.name,
                    'domain': self.chiron.domain,
                    'patients': len(self.chiron.patients),
                },
            },
        }


_parent_coordination_instance: Optional[ParentCoordination] = None


def get_parent_coordination() -> ParentCoordination:
    """Get singleton instance of ParentCoordination."""
    global _parent_coordination_instance
    if _parent_coordination_instance is None:
        hestia = Hestia()
        demeter = DemeterTeacher()
        chiron = Chiron()
        _parent_coordination_instance = ParentCoordination(hestia, demeter, chiron)
    return _parent_coordination_instance


__all__ = [
    'KernelStatus',
    'KernelCareRecord',
    'ParentCoordination',
    'get_parent_coordination',
]
