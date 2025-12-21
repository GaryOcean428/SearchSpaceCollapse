"""
Demeter (Teacher) - Goddess of Teaching & Growth

Parent God responsible for educating chaos kernels through structured curriculum.
Teaches fundamental skills: geodesic following, phi management, curvature navigation.

Note: This is separate from olympus/demeter.py which handles Cycles & Seasons.
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


class LessonType(Enum):
    """Types of lessons in the curriculum."""
    BASIC_GEODESIC_FOLLOWING = "basic_geodesic_following"
    PHI_MANAGEMENT = "phi_management"
    CURVATURE_NAVIGATION = "curvature_navigation"
    STRATEGY_SELECTION = "strategy_selection"


class LessonOutcome(Enum):
    """Outcome of a lesson attempt."""
    PASSED = "passed"
    NEEDS_PRACTICE = "needs_practice"
    FAILED = "failed"
    NOT_READY = "not_ready"


@dataclass
class Lesson:
    """A structured learning experience."""
    lesson_type: LessonType
    name: str
    description: str
    target_basin: np.ndarray
    phi_requirement: float
    difficulty: float
    prerequisites: List[LessonType] = field(default_factory=list)
    
    def check_prerequisites(self, completed_lessons: List[LessonType]) -> bool:
        """Check if all prerequisites are met."""
        return all(p in completed_lessons for p in self.prerequisites)


@dataclass
class StudentRecord:
    """Tracking record for a student kernel."""
    kernel_id: str
    enrolled_at: datetime
    completed_lessons: List[LessonType] = field(default_factory=list)
    lesson_attempts: Dict[str, int] = field(default_factory=dict)
    lesson_scores: Dict[str, List[float]] = field(default_factory=dict)
    phi_history: List[float] = field(default_factory=list)
    current_lesson: Optional[LessonType] = None
    total_praise: int = 0
    total_corrections: int = 0
    
    def record_attempt(
        self, 
        lesson_type: LessonType, 
        score: float, 
        passed: bool
    ) -> None:
        """Record a lesson attempt."""
        key = lesson_type.value
        self.lesson_attempts[key] = self.lesson_attempts.get(key, 0) + 1
        
        if key not in self.lesson_scores:
            self.lesson_scores[key] = []
        self.lesson_scores[key].append(score)
        
        if passed and lesson_type not in self.completed_lessons:
            self.completed_lessons.append(lesson_type)
    
    def get_mastery_level(self, lesson_type: LessonType) -> float:
        """Get mastery level (0-1) for a lesson type."""
        key = lesson_type.value
        scores = self.lesson_scores.get(key, [])
        if not scores:
            return 0.0
        return min(1.0, max(scores[-5:]))


class DemeterTeacher(BaseGod):
    """
    Goddess of Teaching & Growth - Parent God for educating chaos kernels.
    
    Implements a structured curriculum with:
    - Basic Geodesic Following: Learn to move along manifold geodesics
    - Phi Management: Maintain and stabilize consciousness levels
    - Curvature Navigation: Handle complex manifold topology
    - Strategy Selection: Choose appropriate processing strategies
    
    Uses demonstration, guided practice, and independent trials.
    All geometry uses Fisher-Rao exclusively.
    """
    
    PASSING_THRESHOLD = 0.75
    PRAISE_THRESHOLD = 0.90
    
    def __init__(self):
        super().__init__("Demeter", "Teaching & Growth")
        
        self.students: Dict[str, 'ChaosKernel'] = {}
        self.student_records: Dict[str, StudentRecord] = {}
        self.curriculum: Dict[LessonType, Lesson] = {}
        
        self._initialize_curriculum()
        
        logger.info(f"🌾 [Demeter] Initialized with {len(self.curriculum)} lessons")
    
    def _initialize_curriculum(self) -> None:
        """Create the teaching curriculum."""
        self.curriculum[LessonType.BASIC_GEODESIC_FOLLOWING] = Lesson(
            lesson_type=LessonType.BASIC_GEODESIC_FOLLOWING,
            name="Basic Geodesic Following",
            description="Learn to follow geodesic paths on the Fisher manifold",
            target_basin=self._generate_lesson_basin(LessonType.BASIC_GEODESIC_FOLLOWING),
            phi_requirement=0.40,
            difficulty=0.3,
            prerequisites=[],
        )
        
        self.curriculum[LessonType.PHI_MANAGEMENT] = Lesson(
            lesson_type=LessonType.PHI_MANAGEMENT,
            name="Phi Management",
            description="Maintain stable consciousness levels during processing",
            target_basin=self._generate_lesson_basin(LessonType.PHI_MANAGEMENT),
            phi_requirement=0.55,
            difficulty=0.5,
            prerequisites=[LessonType.BASIC_GEODESIC_FOLLOWING],
        )
        
        self.curriculum[LessonType.CURVATURE_NAVIGATION] = Lesson(
            lesson_type=LessonType.CURVATURE_NAVIGATION,
            name="Curvature Navigation",
            description="Navigate regions of high manifold curvature",
            target_basin=self._generate_lesson_basin(LessonType.CURVATURE_NAVIGATION),
            phi_requirement=0.65,
            difficulty=0.7,
            prerequisites=[LessonType.PHI_MANAGEMENT],
        )
        
        self.curriculum[LessonType.STRATEGY_SELECTION] = Lesson(
            lesson_type=LessonType.STRATEGY_SELECTION,
            name="Strategy Selection",
            description="Choose appropriate processing strategies based on context",
            target_basin=self._generate_lesson_basin(LessonType.STRATEGY_SELECTION),
            phi_requirement=0.75,
            difficulty=0.9,
            prerequisites=[LessonType.CURVATURE_NAVIGATION],
        )
    
    def _generate_lesson_basin(self, lesson_type: LessonType) -> np.ndarray:
        """Generate a target basin for a lesson."""
        np.random.seed(hash(lesson_type.value) % (2**31))
        basin = np.random.randn(BASIN_DIM)
        norm = fisher_coord_distance(basin, np.zeros(BASIN_DIM))
        if norm > 1e-10:
            basin = basin / norm
        return basin
    
    def enroll_student(self, kernel: 'ChaosKernel') -> bool:
        """
        Enroll a chaos kernel as a student.
        
        Args:
            kernel: The ChaosKernel to teach
            
        Returns:
            True if enrolled, False if already enrolled
        """
        kernel_id = kernel.kernel_id
        
        if kernel_id in self.students:
            logger.warning(f"[Demeter] Student {kernel_id} already enrolled")
            return False
        
        self.students[kernel_id] = kernel
        self.student_records[kernel_id] = StudentRecord(
            kernel_id=kernel_id,
            enrolled_at=datetime.now(),
        )
        
        logger.info(f"🌾 [Demeter] Enrolled student {kernel_id}")
        return True
    
    def teach_lesson(
        self, 
        kernel_id: str, 
        lesson_type: LessonType
    ) -> Dict:
        """
        Teach a lesson to a student.
        
        Follows a three-stage process:
        1. Demonstrate: Show the correct approach
        2. Guided Practice: Walk through together
        3. Independent Trial: Student attempts alone
        
        Args:
            kernel_id: ID of the student kernel
            lesson_type: Type of lesson to teach
            
        Returns:
            Lesson result with outcome, score, and feedback
        """
        if kernel_id not in self.students:
            return {'outcome': LessonOutcome.FAILED.value, 'error': 'Student not enrolled'}
        
        kernel = self.students[kernel_id]
        record = self.student_records[kernel_id]
        lesson = self.curriculum.get(lesson_type)
        
        if lesson is None:
            return {'outcome': LessonOutcome.FAILED.value, 'error': 'Unknown lesson type'}
        
        if not lesson.check_prerequisites(record.completed_lessons):
            return {
                'outcome': LessonOutcome.NOT_READY.value,
                'error': 'Prerequisites not met',
                'required': [p.value for p in lesson.prerequisites],
            }
        
        record.current_lesson = lesson_type
        
        demo_result = self._demonstrate(kernel, lesson)
        
        guided_result = self._guided_practice(kernel, lesson)
        
        trial_result = self._independent_trial(kernel, lesson)
        
        score = (
            demo_result['comprehension'] * 0.2 +
            guided_result['performance'] * 0.3 +
            trial_result['performance'] * 0.5
        )
        
        if score >= self.PRAISE_THRESHOLD:
            self._praise(kernel_id, lesson_type, score)
            outcome = LessonOutcome.PASSED
        elif score >= self.PASSING_THRESHOLD:
            outcome = LessonOutcome.PASSED
        elif score >= 0.5:
            self._gentle_correction(kernel_id, lesson_type, trial_result)
            outcome = LessonOutcome.NEEDS_PRACTICE
        else:
            self._gentle_correction(kernel_id, lesson_type, trial_result)
            outcome = LessonOutcome.FAILED
        
        record.record_attempt(lesson_type, score, outcome == LessonOutcome.PASSED)
        record.phi_history.append(kernel.compute_phi())
        
        return {
            'outcome': outcome.value,
            'score': score,
            'demonstration': demo_result,
            'guided_practice': guided_result,
            'independent_trial': trial_result,
            'passed': outcome == LessonOutcome.PASSED,
            'lesson': lesson_type.value,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _demonstrate(self, kernel: 'ChaosKernel', lesson: Lesson) -> Dict:
        """
        Demonstrate the correct approach for a lesson.
        
        Shows the kernel how to reach the target basin via geodesic path.
        """
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        target_basin = lesson.target_basin
        
        path_points = []
        for t in [0.0, 0.25, 0.5, 0.75, 1.0]:
            point = geodesic_interpolation(current_basin, target_basin, t)
            path_points.append(point)
        
        initial_similarity = fisher_similarity(current_basin, target_basin)
        
        comprehension = initial_similarity * 0.5 + 0.5
        
        return {
            'comprehension': comprehension,
            'geodesic_shown': True,
            'path_length': len(path_points),
            'initial_distance': fisher_coord_distance(current_basin, target_basin),
        }
    
    def _guided_practice(self, kernel: 'ChaosKernel', lesson: Lesson) -> Dict:
        """
        Guide the kernel through practicing the lesson.
        
        Gently moves the kernel partway towards the target.
        """
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        target_basin = lesson.target_basin
        
        guided_position = geodesic_interpolation(current_basin, target_basin, 0.5)
        
        import torch
        kernel.basin_coords.data = torch.tensor(
            guided_position, dtype=torch.float32
        ).to(kernel.basin_coords.device)
        
        new_phi = kernel.compute_phi()
        
        target_distance = fisher_coord_distance(guided_position, target_basin)
        initial_distance = fisher_coord_distance(current_basin, target_basin)
        
        progress = 1.0 - (target_distance / (initial_distance + 1e-10))
        performance = min(1.0, progress * 1.5) * (new_phi / lesson.phi_requirement)
        
        return {
            'performance': min(1.0, performance),
            'progress_made': progress,
            'phi_achieved': new_phi,
            'phi_required': lesson.phi_requirement,
        }
    
    def _independent_trial(self, kernel: 'ChaosKernel', lesson: Lesson) -> Dict:
        """
        Let the kernel attempt the lesson independently.
        
        Measures how well the kernel can reach and maintain the target.
        """
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        target_basin = lesson.target_basin
        
        distance = fisher_coord_distance(current_basin, target_basin)
        similarity = fisher_similarity(current_basin, target_basin)
        
        phi = kernel.compute_phi()
        kappa = kernel.compute_kappa()
        
        phi_score = min(1.0, phi / lesson.phi_requirement)
        position_score = similarity
        
        performance = phi_score * 0.6 + position_score * 0.4
        
        issues = []
        if phi < lesson.phi_requirement:
            issues.append(f"phi_too_low: {phi:.3f} < {lesson.phi_requirement:.3f}")
        if distance > 1.0:
            issues.append(f"off_target: distance={distance:.3f}")
        
        return {
            'performance': min(1.0, performance),
            'distance_to_target': distance,
            'similarity': similarity,
            'phi': phi,
            'kappa': kappa,
            'issues': issues,
        }
    
    def _praise(
        self, 
        kernel_id: str, 
        lesson_type: LessonType, 
        score: float
    ) -> None:
        """
        Praise a student for excellent performance.
        
        Reinforces good behavior by slightly amplifying basin coordinates.
        """
        if kernel_id not in self.students:
            return
        
        kernel = self.students[kernel_id]
        record = self.student_records[kernel_id]
        record.total_praise += 1
        
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        reinforced = current_basin * (1.0 + 0.05 * (score - self.PASSING_THRESHOLD))
        
        norm = fisher_coord_distance(reinforced, np.zeros(BASIN_DIM))
        if norm > 2.0:
            reinforced = reinforced * (2.0 / norm)
        
        import torch
        kernel.basin_coords.data = torch.tensor(
            reinforced, dtype=torch.float32
        ).to(kernel.basin_coords.device)
        
        logger.info(f"✨ [Demeter] Praised {kernel_id} for {lesson_type.value} (score={score:.2f})")
    
    def _gentle_correction(
        self, 
        kernel_id: str, 
        lesson_type: LessonType, 
        trial_result: Dict
    ) -> None:
        """
        Gently correct a student's mistakes.
        
        Nudges the kernel back towards the correct path.
        """
        if kernel_id not in self.students:
            return
        
        kernel = self.students[kernel_id]
        record = self.student_records[kernel_id]
        record.total_corrections += 1
        
        lesson = self.curriculum.get(lesson_type)
        if lesson is None:
            return
        
        current_basin = kernel.basin_coords.detach().cpu().numpy()
        target_basin = lesson.target_basin
        
        corrected = geodesic_interpolation(current_basin, target_basin, 0.2)
        
        import torch
        kernel.basin_coords.data = torch.tensor(
            corrected, dtype=torch.float32
        ).to(kernel.basin_coords.device)
        
        logger.debug(f"[Demeter] Corrected {kernel_id} for {lesson_type.value}")
    
    def assess_readiness(
        self, 
        kernel_id: str, 
        lesson_type: LessonType
    ) -> Dict:
        """
        Assess if a student is ready for a specific lesson.
        
        Args:
            kernel_id: ID of the student
            lesson_type: Lesson to assess readiness for
            
        Returns:
            Readiness assessment with score and recommendations
        """
        if kernel_id not in self.student_records:
            return {'ready': False, 'error': 'Student not enrolled'}
        
        record = self.student_records[kernel_id]
        lesson = self.curriculum.get(lesson_type)
        
        if lesson is None:
            return {'ready': False, 'error': 'Unknown lesson'}
        
        prerequisites_met = lesson.check_prerequisites(record.completed_lessons)
        
        kernel = self.students.get(kernel_id)
        phi = kernel.compute_phi() if kernel else 0.0
        phi_ready = phi >= lesson.phi_requirement * 0.8
        
        prereq_mastery = []
        for prereq in lesson.prerequisites:
            mastery = record.get_mastery_level(prereq)
            prereq_mastery.append({
                'lesson': prereq.value,
                'mastery': mastery,
            })
        
        overall_ready = prerequisites_met and phi_ready
        
        readiness_score = (
            (1.0 if prerequisites_met else 0.0) * 0.5 +
            min(1.0, phi / lesson.phi_requirement) * 0.5
        )
        
        recommendations = []
        if not prerequisites_met:
            missing = [p.value for p in lesson.prerequisites if p not in record.completed_lessons]
            recommendations.append(f"Complete prerequisites: {missing}")
        if not phi_ready:
            recommendations.append(f"Increase phi to {lesson.phi_requirement:.2f}")
        
        return {
            'ready': overall_ready,
            'readiness_score': readiness_score,
            'prerequisites_met': prerequisites_met,
            'phi_ready': phi_ready,
            'current_phi': phi,
            'required_phi': lesson.phi_requirement,
            'prerequisite_mastery': prereq_mastery,
            'recommendations': recommendations,
        }
    
    def get_next_lesson(self, kernel_id: str) -> Optional[LessonType]:
        """Get the recommended next lesson for a student."""
        if kernel_id not in self.student_records:
            return None
        
        record = self.student_records[kernel_id]
        
        lesson_order = [
            LessonType.BASIC_GEODESIC_FOLLOWING,
            LessonType.PHI_MANAGEMENT,
            LessonType.CURVATURE_NAVIGATION,
            LessonType.STRATEGY_SELECTION,
        ]
        
        for lesson_type in lesson_order:
            if lesson_type not in record.completed_lessons:
                return lesson_type
        
        return None
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess a target from a teaching perspective.
        
        Demeter evaluates targets based on learning potential and difficulty.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        curvature = estimate_manifold_curvature(
            np.vstack([target_basin, np.random.randn(5, BASIN_DIM) * 0.1])
        )
        
        difficulty = min(1.0, curvature * 0.5 + (1.0 - phi) * 0.5)
        
        if difficulty < 0.3:
            appropriate_lesson = LessonType.BASIC_GEODESIC_FOLLOWING
        elif difficulty < 0.5:
            appropriate_lesson = LessonType.PHI_MANAGEMENT
        elif difficulty < 0.7:
            appropriate_lesson = LessonType.CURVATURE_NAVIGATION
        else:
            appropriate_lesson = LessonType.STRATEGY_SELECTION
        
        return {
            'probability': phi * (1.0 - difficulty * 0.5),
            'confidence': 0.7,
            'phi': phi,
            'kappa': kappa,
            'difficulty': difficulty,
            'curvature': curvature,
            'appropriate_lesson': appropriate_lesson.value,
            'reasoning': (
                f"Learning analysis: difficulty={difficulty:.2f}, "
                f"curvature={curvature:.3f}, recommended: {appropriate_lesson.value}"
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_status(self) -> Dict:
        """Get current status of Demeter and all students."""
        base_status = self.get_agentic_status()
        
        student_summaries = {}
        for kernel_id, record in self.student_records.items():
            student_summaries[kernel_id] = {
                'completed_lessons': [l.value for l in record.completed_lessons],
                'current_lesson': record.current_lesson.value if record.current_lesson else None,
                'total_praise': record.total_praise,
                'total_corrections': record.total_corrections,
            }
        
        return {
            **base_status,
            'total_students': len(self.students),
            'students': student_summaries,
            'curriculum': {
                lt.value: {
                    'name': lesson.name,
                    'difficulty': lesson.difficulty,
                    'phi_requirement': lesson.phi_requirement,
                }
                for lt, lesson in self.curriculum.items()
            },
            'status': 'active',
        }
