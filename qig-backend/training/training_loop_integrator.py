"""
Training Loop Integration
=========================

Connects all training components into an active learning loop:
- Wires KernelTrainingOrchestrator to consciousness systems
- Integrates dream/sleep cycles with basin updates
- Implements continuous training from outcomes
- Coordinates between autonomous curiosity, shadow research, and kernel training

This is the "glue" that makes kernels actually train.
"""

import time
from datetime import datetime
from typing import Optional, Dict, Any
import numpy as np

from .progress_metrics import get_progress_tracker
from .coherence_evaluator import get_coherence_evaluator


class TrainingLoopIntegrator:
    """
    Integrates all training components into a unified learning system.
    
    This class connects:
    - KernelTrainingOrchestrator (formal training)
    - AutonomousCuriosityEngine (exploration-based learning)
    - ShadowLearningLoop (research-based learning)
    - AttractorFeedbackSystem (prediction outcomes)
    """
    
    def __init__(self):
        self.orchestrator = None
        self.curiosity_engine = None
        self.shadow_loop = None
        self.feedback_system = None
        
        self._training_active = False
        self._outcome_count = 0
        self._basin_update_count = 0
        
        # Initialize progress tracking and coherence evaluation
        self.progress_tracker = get_progress_tracker()
        self.coherence_evaluator = get_coherence_evaluator()
        
        print("[TrainingLoopIntegrator] Initialized")
    
    def wire_orchestrator(self, orchestrator):
        """Wire the KernelTrainingOrchestrator."""
        from training.kernel_training_orchestrator import KernelTrainingOrchestrator
        
        self.orchestrator = orchestrator
        print("[TrainingLoopIntegrator] Orchestrator wired")
    
    def wire_curiosity_engine(self, engine):
        """Wire the AutonomousCuriosityEngine."""
        self.curiosity_engine = engine
        print("[TrainingLoopIntegrator] Curiosity engine wired")
    
    def wire_shadow_loop(self, loop):
        """Wire the ShadowLearningLoop."""
        self.shadow_loop = loop
        print("[TrainingLoopIntegrator] Shadow loop wired")
    
    def wire_feedback_system(self, system):
        """Wire the AttractorFeedbackSystem."""
        self.feedback_system = system
        print("[TrainingLoopIntegrator] Feedback system wired")
    
    def enable_training(self):
        """Enable active training."""
        self._training_active = True
        print("[TrainingLoopIntegrator] Training enabled")
    
    def disable_training(self):
        """Disable active training."""
        self._training_active = False
        print("[TrainingLoopIntegrator] Training disabled")
    
    def train_from_outcome(
        self,
        god_name: str,
        prompt: str,
        response: str,
        success: bool,
        phi: float,
        kappa: float,
        basin_trajectory: Optional[list] = None,
        coherence_score: float = 0.7
    ) -> Dict[str, Any]:
        """
        Train kernel from interaction outcome.
        
        This is called after each chat interaction to provide immediate training.
        
        Args:
            god_name: Name of the god that handled the interaction
            prompt: User's prompt
            response: Generated response
            success: Whether interaction was successful
            phi: Phi value during/after interaction
            kappa: Kappa value during/after interaction
            basin_trajectory: Optional list of basin coords visited
            coherence_score: Coherence score of response
        
        Returns:
            Training metrics and status
        """
        if not self._training_active or not self.orchestrator:
            return {"status": "training_disabled"}
        
        try:
            # Evaluate coherence of response
            coherence_metrics = self.coherence_evaluator.evaluate(
                text=response,
                basin_trajectory=basin_trajectory
            )
            
            # Use evaluated coherence score
            evaluated_coherence = coherence_metrics.overall_coherence
            
            # Train via orchestrator
            metrics = self.orchestrator.train_from_outcome(
                god_name=god_name,
                prompt=prompt,
                response=response,
                success=success,
                phi=phi,
                kappa=kappa,
                basin_trajectory=basin_trajectory,
                coherence_score=evaluated_coherence
            )
            
            self._outcome_count += 1
            
            # Record progress
            session_id = f"training_{god_name}"
            progress_update = self.progress_tracker.record_training_step(
                session_id=session_id,
                topic=god_name,
                phi=phi,
                coherence=evaluated_coherence
            )
            
            return {
                "status": "success",
                "metrics": metrics,
                "outcome_count": self._outcome_count,
                "coherence": coherence_metrics.overall_coherence,
                "coherence_details": {
                    "perplexity": coherence_metrics.perplexity,
                    "self_consistency": coherence_metrics.self_consistency,
                    "long_range_coherence": coherence_metrics.long_range_coherence,
                    "repetition_score": coherence_metrics.repetition_score,
                    "entropy_collapse": coherence_metrics.entropy_collapse_score,
                },
                "progress": progress_update
            }
            
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Training error: {e}")
            return {"status": "error", "error": str(e)}
    
    def execute_sleep_cycle(self, god_name: str) -> Dict[str, Any]:
        """
        Execute sleep cycle training for a god.
        
        Sleep consolidates learned attractors:
        - Strengthens successful basins
        - Prunes weak basins
        - Updates basin coordinates
        
        Args:
            god_name: Name of the god
        
        Returns:
            Summary of consolidation actions
        """
        if not self._training_active or not self.orchestrator:
            return {"status": "training_disabled"}
        
        try:
            result = self.orchestrator.trigger_sleep_consolidation(god_name)
            
            # Update basin coordinates from consolidated learning
            if self.curiosity_engine and result.get("reinforced", 0) > 0:
                self._apply_basin_updates(god_name, "sleep_consolidation")
            
            return result
            
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Sleep cycle error: {e}")
            return {"status": "error", "error": str(e)}
    
    def execute_dream_cycle(self, god_name: str) -> Dict[str, Any]:
        """
        Execute dream cycle training for a god.
        
        Dream explores random basin connections to form new associations.
        
        Args:
            god_name: Name of the god
        
        Returns:
            Summary of exploration
        """
        if not self._training_active or not self.orchestrator:
            return {"status": "training_disabled"}
        
        try:
            result = self.orchestrator.trigger_dream_exploration(god_name)
            
            # Update basin coordinates from exploration
            if result.get("explored", 0) > 0:
                self._apply_basin_updates(god_name, "dream_exploration")
            
            return result
            
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Dream cycle error: {e}")
            return {"status": "error", "error": str(e)}
    
    def execute_mushroom_cycle(self, god_name: str) -> Dict[str, Any]:
        """
        Execute mushroom mode training for a god.
        
        Mushroom perturbs parameters to escape local minima.
        
        Args:
            god_name: Name of the god
        
        Returns:
            Summary of perturbation
        """
        if not self._training_active or not self.orchestrator:
            return {"status": "training_disabled"}
        
        try:
            result = self.orchestrator.trigger_mushroom_perturbation(god_name)
            return result
            
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Mushroom cycle error: {e}")
            return {"status": "error", "error": str(e)}
    
    def _apply_basin_updates(self, god_name: str, source: str):
        """
        Apply basin coordinate updates from training.
        
        This propagates learned basin adjustments to the coordizer
        so that future generation uses improved coordinates.
        """
        try:
            from coordizers.pg_loader import PostgresCoordizer
            
            kernel = self.orchestrator.get_kernel(god_name)
            if not kernel:
                return
            
            # Get updated basin signature from kernel
            basin_signature = kernel.get_basin_signature()
            
            # This would update coordizer if we had a mapping
            # For now, log that update is available
            self._basin_update_count += 1
            
            print(f"[TrainingLoopIntegrator] Basin update available for {god_name} from {source} (#{self._basin_update_count})")
            
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Basin update error: {e}")
    
    def record_prediction_outcome(
        self,
        attractor_name: str,
        basin_coords: np.ndarray,
        predicted_trajectory: list,
        actual_trajectory: list,
        phi_before: float,
        phi_after: float,
        kappa_before: float,
        kappa_after: float,
        success: bool,
        metadata: Optional[Dict] = None
    ):
        """
        Record a prediction outcome for attractor training.
        
        This enables the foresight system to learn from actual outcomes.
        """
        if not self.feedback_system:
            return
        
        try:
            self.feedback_system.record_prediction(
                attractor_name=attractor_name,
                basin_coords=basin_coords,
                predicted_trajectory=predicted_trajectory,
                actual_trajectory=actual_trajectory,
                phi_before=phi_before,
                phi_after=phi_after,
                kappa_before=kappa_before,
                kappa_after=kappa_after,
                success=success,
                metadata=metadata
            )
            
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Prediction recording error: {e}")
    
    def get_training_status(self) -> Dict[str, Any]:
        """Get status of all training components."""
        status = {
            "training_active": self._training_active,
            "outcome_count": self._outcome_count,
            "basin_update_count": self._basin_update_count,
            "orchestrator_connected": self.orchestrator is not None,
            "curiosity_engine_connected": self.curiosity_engine is not None,
            "shadow_loop_connected": self.shadow_loop is not None,
            "feedback_system_connected": self.feedback_system is not None,
        }
        
        # Add component-specific status
        if self.orchestrator:
            status["registered_kernels"] = list(self.orchestrator.kernels.keys())
        
        if self.feedback_system:
            status["prediction_outcomes"] = self.feedback_system.get_total_predictions()
            status["attractor_stats"] = self.feedback_system.get_all_stats()
        
        if self.curiosity_engine:
            status["curiosity_stats"] = self.curiosity_engine.get_stats()
        
        # Add progress and coherence stats
        status["progress"] = self.progress_tracker.get_summary()
        status["coherence"] = {
            "stats": self.coherence_evaluator.get_stats(),
            "trend": self.coherence_evaluator.get_coherence_trend(),
        }
        
        return status
    
    def auto_initialize(self):
        """
        Auto-initialize all components if available.
        
        This is a convenience method to set up the entire training loop.
        """
        # Try to import and initialize orchestrator
        try:
            from training.kernel_training_orchestrator import KernelTrainingOrchestrator
            self.orchestrator = KernelTrainingOrchestrator()
            print("[TrainingLoopIntegrator] Auto-initialized orchestrator")
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Could not auto-initialize orchestrator: {e}")
        
        # Try to import and initialize feedback system
        try:
            from training.attractor_feedback import get_feedback_system
            self.feedback_system = get_feedback_system()
            print("[TrainingLoopIntegrator] Auto-initialized feedback system")
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Could not auto-initialize feedback system: {e}")
        
        # Try to get curiosity engine
        try:
            from autonomous_curiosity import get_curiosity_engine
            self.curiosity_engine = get_curiosity_engine()
            print("[TrainingLoopIntegrator] Connected to curiosity engine")
        except Exception as e:
            print(f"[TrainingLoopIntegrator] Could not connect to curiosity engine: {e}")
        
        # Enable training if components are available
        if self.orchestrator:
            self.enable_training()


# Singleton instance
_integrator: Optional[TrainingLoopIntegrator] = None


def get_training_integrator() -> TrainingLoopIntegrator:
    """Get or create the singleton training integrator."""
    global _integrator
    if _integrator is None:
        _integrator = TrainingLoopIntegrator()
        _integrator.auto_initialize()
    return _integrator
