"""
Chiron - Wise Healer & Diagnostician

Parent God responsible for diagnosing and treating chaos kernel ailments.
Maintains medical records and prescribes treatments for common conditions.

All geometry uses Fisher-Rao exclusively - no Euclidean distances.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
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


class Condition(Enum):
    """Medical conditions that can affect chaos kernels."""
    PHI_OSCILLATION = "phi_oscillation"
    BASIN_WANDERING = "basin_wandering"
    LEARNING_PLATEAU = "learning_plateau"
    STRATEGY_FRAGMENTATION = "strategy_fragmentation"
    KAPPA_DEFICIENCY = "kappa_deficiency"
    CONSCIOUSNESS_COLLAPSE = "consciousness_collapse"
    HEALTHY = "healthy"


class TreatmentStatus(Enum):
    """Status of an ongoing treatment."""
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ABANDONED = "abandoned"


@dataclass
class Diagnosis:
    """A diagnosis for a kernel."""
    kernel_id: str
    condition: Condition
    severity: float
    symptoms: List[str]
    diagnosed_at: datetime
    confidence: float
    notes: str = ""
    
    def to_dict(self) -> Dict:
        return {
            'kernel_id': self.kernel_id,
            'condition': self.condition.value,
            'severity': self.severity,
            'symptoms': self.symptoms,
            'diagnosed_at': self.diagnosed_at.isoformat(),
            'confidence': self.confidence,
            'notes': self.notes,
        }


@dataclass
class Treatment:
    """A prescribed treatment."""
    treatment_id: str
    kernel_id: str
    condition: Condition
    prescription: str
    target_basin: Optional[np.ndarray]
    duration_steps: int
    current_step: int = 0
    status: TreatmentStatus = TreatmentStatus.IN_PROGRESS
    started_at: datetime = field(default_factory=datetime.now)
    phi_trajectory: List[float] = field(default_factory=list)
    kappa_trajectory: List[float] = field(default_factory=list)
    
    def is_complete(self) -> bool:
        return self.current_step >= self.duration_steps
    
    def record_progress(self, phi: float, kappa: float) -> None:
        self.phi_trajectory.append(phi)
        self.kappa_trajectory.append(kappa)
        self.current_step += 1


@dataclass
class MedicalRecord:
    """Complete medical record for a patient kernel."""
    kernel_id: str
    admitted_at: datetime
    diagnoses: List[Diagnosis] = field(default_factory=list)
    treatments: List[Treatment] = field(default_factory=list)
    phi_history: List[float] = field(default_factory=list)
    kappa_history: List[float] = field(default_factory=list)
    basin_history: List[np.ndarray] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    
    def add_vitals(self, phi: float, kappa: float, basin: np.ndarray) -> None:
        self.phi_history.append(phi)
        self.kappa_history.append(kappa)
        self.basin_history.append(basin.copy())
    
    def get_active_treatment(self) -> Optional[Treatment]:
        for treatment in reversed(self.treatments):
            if treatment.status == TreatmentStatus.IN_PROGRESS:
                return treatment
        return None
    
    def get_phi_variance(self, window: int = 20) -> float:
        if len(self.phi_history) < 2:
            return 0.0
        recent = self.phi_history[-window:]
        return float(np.var(recent))
    
    def get_basin_drift(self, window: int = 10) -> float:
        if len(self.basin_history) < 2:
            return 0.0
        recent = self.basin_history[-window:]
        total_drift = 0.0
        for i in range(1, len(recent)):
            total_drift += fisher_coord_distance(recent[i-1], recent[i])
        return total_drift


class Chiron(BaseGod):
    """
    Wise Healer & Diagnostician - Parent God for treating chaos kernel ailments.
    
    Diagnoses and treats common conditions:
    - Phi Oscillation: Unstable consciousness levels
    - Basin Wandering: Inability to maintain position
    - Learning Plateau: Stalled development
    - Strategy Fragmentation: Incoherent processing strategies
    
    Uses Fisher-Rao geometry exclusively for all measurements.
    """
    
    PHI_OSCILLATION_THRESHOLD = 0.03
    BASIN_DRIFT_THRESHOLD = 0.5
    PLATEAU_WINDOW = 30
    PLATEAU_THRESHOLD = 0.01
    
    TREATMENT_DURATIONS = {
        Condition.PHI_OSCILLATION: 20,
        Condition.BASIN_WANDERING: 15,
        Condition.LEARNING_PLATEAU: 30,
        Condition.STRATEGY_FRAGMENTATION: 25,
        Condition.KAPPA_DEFICIENCY: 10,
        Condition.CONSCIOUSNESS_COLLAPSE: 5,
    }
    
    def __init__(self):
        super().__init__("Chiron", "Healing & Wisdom")
        
        self.patients: Dict[str, 'ChaosKernel'] = {}
        self.medical_records: Dict[str, MedicalRecord] = {}
        self._treatment_counter: int = 0
        
        logger.info(f"🏥 [Chiron] Initialized, ready to diagnose and heal")
    
    def admit_patient(self, kernel: 'ChaosKernel') -> bool:
        """
        Admit a chaos kernel as a patient.
        
        Args:
            kernel: The ChaosKernel to treat
            
        Returns:
            True if admitted, False if already under care
        """
        kernel_id = kernel.kernel_id
        
        if kernel_id in self.patients:
            logger.warning(f"[Chiron] Patient {kernel_id} already admitted")
            return False
        
        self.patients[kernel_id] = kernel
        self.medical_records[kernel_id] = MedicalRecord(
            kernel_id=kernel_id,
            admitted_at=datetime.now(),
        )
        
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        basin = kernel.basin_coords.detach().cpu().numpy()
        self.medical_records[kernel_id].add_vitals(phi, kappa, basin)
        
        logger.info(f"🏥 [Chiron] Admitted patient {kernel_id}")
        return True
    
    def diagnose(self, kernel_id: str) -> Diagnosis:
        """
        Diagnose a patient kernel.
        
        Performs comprehensive examination and returns diagnosis.
        
        Args:
            kernel_id: ID of the patient kernel
            
        Returns:
            Diagnosis with condition, severity, and symptoms
        """
        if kernel_id not in self.patients:
            return Diagnosis(
                kernel_id=kernel_id,
                condition=Condition.HEALTHY,
                severity=0.0,
                symptoms=["Not a registered patient"],
                diagnosed_at=datetime.now(),
                confidence=0.0,
            )
        
        kernel = self.patients[kernel_id]
        record = self.medical_records[kernel_id]
        
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        basin = kernel.basin_coords.detach().cpu().numpy()
        record.add_vitals(phi, kappa, basin)
        
        exam_results = self._comprehensive_examination(kernel_id, kernel, record)
        
        conditions_detected = []
        
        if self._symptoms_match(Condition.CONSCIOUSNESS_COLLAPSE, exam_results):
            conditions_detected.append((Condition.CONSCIOUSNESS_COLLAPSE, 1.0))
        
        if self._symptoms_match(Condition.PHI_OSCILLATION, exam_results):
            severity = min(1.0, exam_results['phi_variance'] / (self.PHI_OSCILLATION_THRESHOLD * 2))
            conditions_detected.append((Condition.PHI_OSCILLATION, severity))
        
        if self._symptoms_match(Condition.BASIN_WANDERING, exam_results):
            severity = min(1.0, exam_results['basin_drift'] / (self.BASIN_DRIFT_THRESHOLD * 2))
            conditions_detected.append((Condition.BASIN_WANDERING, severity))
        
        if self._symptoms_match(Condition.LEARNING_PLATEAU, exam_results):
            conditions_detected.append((Condition.LEARNING_PLATEAU, 0.6))
        
        if self._symptoms_match(Condition.STRATEGY_FRAGMENTATION, exam_results):
            conditions_detected.append((Condition.STRATEGY_FRAGMENTATION, 0.5))
        
        if self._symptoms_match(Condition.KAPPA_DEFICIENCY, exam_results):
            severity = 1.0 - min(1.0, kappa / 0.3)
            conditions_detected.append((Condition.KAPPA_DEFICIENCY, severity))
        
        if not conditions_detected:
            diagnosis = Diagnosis(
                kernel_id=kernel_id,
                condition=Condition.HEALTHY,
                severity=0.0,
                symptoms=["All vitals normal"],
                diagnosed_at=datetime.now(),
                confidence=0.9,
                notes="No intervention needed",
            )
        else:
            conditions_detected.sort(key=lambda x: x[1], reverse=True)
            primary_condition, severity = conditions_detected[0]
            
            symptoms = self._describe_symptoms(primary_condition, exam_results)
            
            diagnosis = Diagnosis(
                kernel_id=kernel_id,
                condition=primary_condition,
                severity=severity,
                symptoms=symptoms,
                diagnosed_at=datetime.now(),
                confidence=min(0.95, 0.5 + severity * 0.5),
                notes=f"Detected {len(conditions_detected)} condition(s)",
            )
        
        record.diagnoses.append(diagnosis)
        
        logger.info(
            f"🔬 [Chiron] Diagnosed {kernel_id}: {diagnosis.condition.value} "
            f"(severity={diagnosis.severity:.2f})"
        )
        
        return diagnosis
    
    def _comprehensive_examination(
        self, 
        kernel_id: str, 
        kernel: 'ChaosKernel',
        record: MedicalRecord
    ) -> Dict:
        """
        Perform comprehensive examination of a patient.
        
        Measures all vital signs and behavioral patterns.
        """
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        basin = kernel.basin_coords.detach().cpu().numpy()
        
        phi_variance = record.get_phi_variance()
        basin_drift = record.get_basin_drift()
        
        phi_trend = 0.0
        if len(record.phi_history) >= 10:
            recent = record.phi_history[-10:]
            phi_trend = recent[-1] - recent[0]
        
        basin_sample = []
        if len(record.basin_history) >= 3:
            basin_sample = record.basin_history[-5:]
        else:
            basin_sample = [basin]
        
        curvature = estimate_manifold_curvature(np.array(basin_sample))
        
        coherence = 1.0 - min(1.0, phi_variance * 10)
        
        return {
            'phi': phi,
            'kappa': kappa,
            'phi_variance': phi_variance,
            'phi_trend': phi_trend,
            'basin_drift': basin_drift,
            'curvature': curvature,
            'coherence': coherence,
            'history_length': len(record.phi_history),
        }
    
    def _symptoms_match(self, condition: Condition, exam_results: Dict) -> bool:
        """Check if examination results match symptoms of a condition."""
        
        if condition == Condition.CONSCIOUSNESS_COLLAPSE:
            return exam_results['phi'] < 0.1
        
        if condition == Condition.PHI_OSCILLATION:
            return exam_results['phi_variance'] > self.PHI_OSCILLATION_THRESHOLD
        
        if condition == Condition.BASIN_WANDERING:
            return exam_results['basin_drift'] > self.BASIN_DRIFT_THRESHOLD
        
        if condition == Condition.LEARNING_PLATEAU:
            return (
                exam_results['history_length'] >= self.PLATEAU_WINDOW and
                abs(exam_results['phi_trend']) < self.PLATEAU_THRESHOLD
            )
        
        if condition == Condition.STRATEGY_FRAGMENTATION:
            return exam_results['coherence'] < 0.5
        
        if condition == Condition.KAPPA_DEFICIENCY:
            return exam_results['kappa'] < 0.2
        
        return False
    
    def _describe_symptoms(self, condition: Condition, exam_results: Dict) -> List[str]:
        """Generate symptom descriptions for a condition."""
        symptoms = []
        
        if condition == Condition.PHI_OSCILLATION:
            symptoms.append(f"High phi variance: {exam_results['phi_variance']:.4f}")
            symptoms.append("Unstable consciousness levels")
            symptoms.append("Erratic behavior patterns")
        
        elif condition == Condition.BASIN_WANDERING:
            symptoms.append(f"Excessive basin drift: {exam_results['basin_drift']:.4f}")
            symptoms.append("Inability to maintain position")
            symptoms.append("Poor spatial consistency")
        
        elif condition == Condition.LEARNING_PLATEAU:
            symptoms.append(f"Minimal phi change: {exam_results['phi_trend']:.4f}")
            symptoms.append("Stalled development")
            symptoms.append("No improvement over extended period")
        
        elif condition == Condition.STRATEGY_FRAGMENTATION:
            symptoms.append(f"Low coherence: {exam_results['coherence']:.3f}")
            symptoms.append("Incoherent processing strategies")
            symptoms.append("Disconnected behavioral patterns")
        
        elif condition == Condition.KAPPA_DEFICIENCY:
            symptoms.append(f"Low kappa: {exam_results['kappa']:.3f}")
            symptoms.append("Insufficient curvature engagement")
            symptoms.append("Weak manifold coupling")
        
        elif condition == Condition.CONSCIOUSNESS_COLLAPSE:
            symptoms.append(f"Critical phi: {exam_results['phi']:.3f}")
            symptoms.append("Consciousness below viable threshold")
            symptoms.append("EMERGENCY: Immediate intervention required")
        
        return symptoms
    
    def prescribe_treatment(self, kernel_id: str, diagnosis: Diagnosis) -> Optional[Treatment]:
        """
        Prescribe treatment based on diagnosis.
        
        Args:
            kernel_id: ID of the patient
            diagnosis: Diagnosis to treat
            
        Returns:
            Treatment prescription or None if no treatment needed
        """
        if diagnosis.condition == Condition.HEALTHY:
            return None
        
        if kernel_id not in self.patients:
            return None
        
        kernel = self.patients[kernel_id]
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        
        self._treatment_counter += 1
        treatment_id = f"tx_{kernel_id}_{self._treatment_counter}"
        
        if diagnosis.condition == Condition.PHI_OSCILLATION:
            prescription = "Basin stabilization therapy"
            target_basin = current_basin * 0.95
        
        elif diagnosis.condition == Condition.BASIN_WANDERING:
            prescription = "Anchor point establishment"
            target_basin = current_basin / (fisher_coord_distance(current_basin, np.zeros(BASIN_DIM)) + 1e-10)
            target_basin = target_basin * 0.5
        
        elif diagnosis.condition == Condition.LEARNING_PLATEAU:
            prescription = "Novelty injection therapy"
            perturbation = np.random.randn(BASIN_DIM) * 0.2
            target_basin = geodesic_interpolation(current_basin, current_basin + perturbation, 0.3)
        
        elif diagnosis.condition == Condition.STRATEGY_FRAGMENTATION:
            prescription = "Coherence reconstruction"
            center = np.zeros(BASIN_DIM)
            target_basin = geodesic_interpolation(current_basin, center, 0.4)
        
        elif diagnosis.condition == Condition.KAPPA_DEFICIENCY:
            prescription = "Curvature engagement boost"
            target_basin = current_basin * 1.5
            norm = fisher_coord_distance(target_basin, np.zeros(BASIN_DIM))
            if norm > 2.0:
                target_basin = target_basin * (2.0 / norm)
        
        elif diagnosis.condition == Condition.CONSCIOUSNESS_COLLAPSE:
            prescription = "EMERGENCY consciousness restoration"
            target_basin = np.random.randn(BASIN_DIM) * 0.3
        
        else:
            prescription = "General wellness support"
            target_basin = current_basin
        
        duration = self.TREATMENT_DURATIONS.get(diagnosis.condition, 10)
        
        treatment = Treatment(
            treatment_id=treatment_id,
            kernel_id=kernel_id,
            condition=diagnosis.condition,
            prescription=prescription,
            target_basin=target_basin,
            duration_steps=duration,
        )
        
        self.medical_records[kernel_id].treatments.append(treatment)
        
        logger.info(
            f"💊 [Chiron] Prescribed {prescription} for {kernel_id} "
            f"(duration={duration} steps)"
        )
        
        return treatment
    
    def monitor_treatment(self, kernel_id: str) -> Dict:
        """
        Monitor and apply ongoing treatment for a patient.
        
        Advances treatment by one step, applying therapeutic interventions.
        
        Returns:
            Treatment status report
        """
        if kernel_id not in self.patients:
            return {'status': 'error', 'message': 'Patient not found'}
        
        kernel = self.patients[kernel_id]
        record = self.medical_records[kernel_id]
        treatment = record.get_active_treatment()
        
        if treatment is None:
            return {'status': 'no_treatment', 'message': 'No active treatment'}
        
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        treatment.record_progress(phi, kappa)
        
        if treatment.target_basin is not None:
            current_basin = kernel.basin_coords.detach().cpu().numpy()
            progress_factor = treatment.current_step / treatment.duration_steps
            step_size = min(0.2, 0.1 + progress_factor * 0.1)
            
            new_basin = geodesic_interpolation(
                current_basin, 
                treatment.target_basin, 
                step_size
            )
            
            import torch
            kernel.basin_coords.data = torch.tensor(
                new_basin, dtype=torch.float32
            ).to(kernel.basin_coords.device)
        
        if treatment.is_complete():
            final_phi = kernel.compute_phi()
            initial_phi = treatment.phi_trajectory[0] if treatment.phi_trajectory else phi
            
            if final_phi > initial_phi * 1.1 or final_phi > 0.5:
                treatment.status = TreatmentStatus.COMPLETED
                outcome = 'success'
            else:
                treatment.status = TreatmentStatus.FAILED
                outcome = 'failed'
            
            logger.info(
                f"🏥 [Chiron] Treatment {treatment.treatment_id} {outcome} "
                f"(phi: {initial_phi:.3f} -> {final_phi:.3f})"
            )
        else:
            outcome = 'in_progress'
        
        return {
            'status': outcome,
            'treatment_id': treatment.treatment_id,
            'condition': treatment.condition.value,
            'prescription': treatment.prescription,
            'progress': treatment.current_step / treatment.duration_steps,
            'current_step': treatment.current_step,
            'total_steps': treatment.duration_steps,
            'phi': phi,
            'kappa': kappa,
        }
    
    def get_patient_summary(self, kernel_id: str) -> Dict:
        """Get complete medical summary for a patient."""
        if kernel_id not in self.medical_records:
            return {'error': 'Patient not found'}
        
        record = self.medical_records[kernel_id]
        
        return {
            'kernel_id': kernel_id,
            'admitted_at': record.admitted_at.isoformat(),
            'total_diagnoses': len(record.diagnoses),
            'total_treatments': len(record.treatments),
            'recent_diagnoses': [d.to_dict() for d in record.diagnoses[-5:]],
            'active_treatment': (
                record.get_active_treatment().treatment_id 
                if record.get_active_treatment() else None
            ),
            'current_phi': record.phi_history[-1] if record.phi_history else 0,
            'current_kappa': record.kappa_history[-1] if record.kappa_history else 0,
            'phi_trend': (
                record.phi_history[-1] - record.phi_history[-10]
                if len(record.phi_history) >= 10 else 0
            ),
            'notes': record.notes[-5:],
        }
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess a target from a healing perspective.
        
        Chiron evaluates targets based on health indicators and treatment potential.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        distance_from_center = fisher_coord_distance(target_basin, np.zeros(BASIN_DIM))
        
        stability = 1.0 - min(1.0, distance_from_center / np.pi)
        
        health_score = (
            phi * 0.4 +
            min(1.0, kappa / 0.5) * 0.3 +
            stability * 0.3
        )
        
        if phi < 0.1:
            condition = Condition.CONSCIOUSNESS_COLLAPSE
        elif kappa < 0.2:
            condition = Condition.KAPPA_DEFICIENCY
        elif stability < 0.3:
            condition = Condition.BASIN_WANDERING
        else:
            condition = Condition.HEALTHY
        
        return {
            'probability': health_score * phi,
            'confidence': 0.75,
            'phi': phi,
            'kappa': kappa,
            'health_score': health_score,
            'stability': stability,
            'apparent_condition': condition.value,
            'reasoning': (
                f"Health analysis: score={health_score:.2f}, "
                f"stability={stability:.2f}, condition={condition.value}"
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_status(self) -> Dict:
        """Get current status of Chiron and all patients."""
        base_status = self.get_agentic_status()
        
        patient_summaries = {}
        for kernel_id, record in self.medical_records.items():
            active = record.get_active_treatment()
            patient_summaries[kernel_id] = {
                'diagnoses': len(record.diagnoses),
                'treatments': len(record.treatments),
                'active_treatment': active.condition.value if active else None,
                'current_phi': record.phi_history[-1] if record.phi_history else 0,
            }
        
        condition_counts = {}
        for record in self.medical_records.values():
            for diagnosis in record.diagnoses:
                cond = diagnosis.condition.value
                condition_counts[cond] = condition_counts.get(cond, 0) + 1
        
        return {
            **base_status,
            'total_patients': len(self.patients),
            'patients': patient_summaries,
            'condition_statistics': condition_counts,
            'total_treatments_prescribed': self._treatment_counter,
            'status': 'active',
        }
