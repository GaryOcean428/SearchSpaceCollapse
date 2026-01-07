"""
Prediction Feedback Bridge - TPS to Learning Loop Integration

Connects the Prediction Self-Improvement (TPS) system to the TrainingLoopIntegrator.
Translates chain/graph metrics into orchestrator-compatible basin updates.

Data Flow:
    TPS PredictionChain → PredictionFeedbackBridge → TrainingLoopIntegrator → Kernel Updates

This bridges:
1. Prediction outcomes → Training signals
2. Chain patterns → Basin trajectory updates
3. Graph transitions → Attractor feedback
4. Insight extraction → Curriculum learning
"""

import numpy as np
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Event bus for publishing prediction feedback events
try:
    from olympus.capability_mesh import (
        CapabilityEventBus,
        EventType,
        emit_prediction_event,
    )
    EVENT_BUS_AVAILABLE = True
except ImportError:
    EVENT_BUS_AVAILABLE = False
    CapabilityEventBus = None


@dataclass
class InsightRecord:
    """
    Canonical insight object extracted from prediction chains and reasoning.

    Insights are the currency of the learning loop - they represent
    discovered patterns that should influence future behavior.
    """
    insight_id: str
    source: str  # 'tps', 'research', 'chain_of_thought', 'curiosity'
    content: str
    phi_delta: float  # Φ change associated with insight
    kappa_delta: float  # κ change associated with insight
    curvature: float  # Local manifold curvature at discovery
    basin_coords: Optional[np.ndarray] = None
    confidence: float = 0.5
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    metadata: Dict[str, Any] = field(default_factory=dict)
    linked_predictions: List[str] = field(default_factory=list)
    linked_thoughts: List[int] = field(default_factory=list)  # ThoughtStep indices

    def to_dict(self) -> Dict[str, Any]:
        return {
            'insight_id': self.insight_id,
            'source': self.source,
            'content': self.content,
            'phi_delta': self.phi_delta,
            'kappa_delta': self.kappa_delta,
            'curvature': self.curvature,
            'basin_coords': self.basin_coords.tolist() if self.basin_coords is not None else None,
            'confidence': self.confidence,
            'timestamp': self.timestamp,
            'metadata': self.metadata,
            'linked_predictions': self.linked_predictions,
            'linked_thoughts': self.linked_thoughts,
        }


@dataclass
class InsightOutcomeRecord:
    """
    Tracks downstream prediction outcomes for insights.

    Closes the loop: Insight -> Prediction -> Outcome -> Insight Confidence Update

    This enables insights to be validated not just once (via Tavily/Perplexity)
    but continuously based on how well predictions that used them performed.
    """
    insight_id: str
    prediction_ids: List[str] = field(default_factory=list)  # Predictions influenced by this insight
    accuracy_when_used: float = 0.0  # Average accuracy of predictions using this insight
    initial_confidence: float = 0.5  # Confidence at insight creation
    validated_confidence: float = 0.5  # Updated confidence based on prediction outcomes
    times_used: int = 0  # Number of predictions that used this insight
    successful_uses: int = 0  # Number of accurate predictions using this insight
    last_outcome_at: Optional[datetime] = None
    outcome_history: List[Dict[str, Any]] = field(default_factory=list)  # Recent outcome records

    def to_dict(self) -> Dict[str, Any]:
        return {
            'insight_id': self.insight_id,
            'prediction_ids': self.prediction_ids,
            'accuracy_when_used': self.accuracy_when_used,
            'initial_confidence': self.initial_confidence,
            'validated_confidence': self.validated_confidence,
            'times_used': self.times_used,
            'successful_uses': self.successful_uses,
            'last_outcome_at': self.last_outcome_at.isoformat() if self.last_outcome_at else None,
            'outcome_history_count': len(self.outcome_history),
        }

    def record_outcome(self, prediction_id: str, accuracy: float, was_accurate: bool) -> float:
        """
        Record a prediction outcome for this insight.

        Returns the new validated_confidence after update.
        """
        self.prediction_ids.append(prediction_id)
        self.times_used += 1
        if was_accurate:
            self.successful_uses += 1
        self.last_outcome_at = datetime.now()

        # Update running average accuracy
        if self.times_used == 1:
            self.accuracy_when_used = accuracy
        else:
            # Exponential moving average with alpha=0.3 for recent emphasis
            alpha = 0.3
            self.accuracy_when_used = alpha * accuracy + (1 - alpha) * self.accuracy_when_used

        # Update validated confidence based on outcomes
        # Uses Bayesian-like update: confidence moves toward accuracy
        success_rate = self.successful_uses / self.times_used
        # Blend initial confidence with empirical success rate
        # Weight shifts toward empirical as more data accumulates
        empirical_weight = min(0.8, self.times_used / 10.0)  # Max 80% empirical after 10 uses
        self.validated_confidence = (
            (1 - empirical_weight) * self.initial_confidence +
            empirical_weight * success_rate
        )

        # Store in outcome history (keep last 20)
        self.outcome_history.append({
            'prediction_id': prediction_id,
            'accuracy': accuracy,
            'was_accurate': was_accurate,
            'timestamp': datetime.now().timestamp(),
            'validated_confidence_after': self.validated_confidence,
        })
        if len(self.outcome_history) > 20:
            self.outcome_history = self.outcome_history[-20:]

        return self.validated_confidence


class PredictionFeedbackBridge:
    """
    Bridges TPS prediction system to the training loop.
    
    Responsibilities:
    1. Translate prediction outcomes to training signals
    2. Extract insights from prediction chains
    3. Feed graph transitions to attractor feedback
    4. Maintain prediction → training provenance
    """
    
    def __init__(self, basin_dim: int = 64):
        self.basin_dim = basin_dim
        self.insight_buffer: List[InsightRecord] = []
        self.prediction_to_training: Dict[str, str] = {}  # pred_id → training_id
        self.total_predictions_processed = 0
        self.total_insights_generated = 0

        # Insight outcome tracking
        self.insight_outcomes: Dict[str, InsightOutcomeRecord] = {}
        self.total_insight_updates = 0

        # Chain reinforcement tracking
        self.total_chains_reinforced = 0
        self.total_steps_reinforced = 0
        self._reinforcement_interval = 10  # Reinforce every N predictions
        self._last_reinforcement_count = 0

        self._tps_system = None
        self._training_integrator = None
        self._chain_manager = None
        self._lightning_kernel = None

        logger.info("[PredictionFeedbackBridge] Initialized")
    
    def wire_tps(self, tps_system) -> None:
        """Wire the PredictionSelfImprovement system."""
        self._tps_system = tps_system
        logger.info("[PredictionFeedbackBridge] TPS system wired")
    
    def wire_training_integrator(self, integrator) -> None:
        """Wire the TrainingLoopIntegrator."""
        self._training_integrator = integrator
        logger.info("[PredictionFeedbackBridge] Training integrator wired")
    
    def wire_chain_manager(self, manager) -> None:
        """Wire the ChainOfThoughtManager."""
        self._chain_manager = manager
        logger.info("[PredictionFeedbackBridge] Chain manager wired")

    def wire_lightning(self, lightning_kernel) -> None:
        """Wire the Lightning kernel for insight outcome tracking."""
        self._lightning_kernel = lightning_kernel
        logger.info("[PredictionFeedbackBridge] Lightning kernel wired for insight outcome tracking")

    def _publish_prediction_feedback(
        self,
        insights: List[InsightRecord],
        pred_record,
        phi_delta: float,
        kappa_delta: float,
    ) -> None:
        """
        Publish PREDICTION_FEEDBACK event after extracting insights.

        This allows other kernels to learn from prediction feedback patterns.
        """
        if not EVENT_BUS_AVAILABLE:
            return

        if not insights:
            return

        try:
            # Aggregate linked predictions from all insights
            linked_predictions = []
            for insight in insights:
                linked_predictions.extend(insight.linked_predictions)
            linked_predictions = list(set(linked_predictions))

            # Get failure reasons from the prediction record
            failure_reasons = []
            if hasattr(pred_record, 'failure_reasons'):
                failure_reasons = [r.value for r in pred_record.failure_reasons]

            emit_prediction_event(
                event_type=EventType.PREDICTION_FEEDBACK,
                prediction_id=pred_record.prediction_id if hasattr(pred_record, 'prediction_id') else "",
                source_kernel=getattr(pred_record, 'source', 'tps'),
                predicted_basin=getattr(pred_record, 'predicted_basin', None),
                actual_basin=getattr(pred_record, 'actual_basin', None),
                phi=getattr(pred_record, 'context', {}).get('phi', 0.5),
                phi_delta=phi_delta,
                kappa_delta=kappa_delta,
                linked_predictions=linked_predictions,
                failure_reasons=failure_reasons,
                confidence=getattr(pred_record, 'confidence', 0.5),
                accuracy_score=getattr(pred_record, 'accuracy_score', 0.0),
                outcome="accurate" if getattr(pred_record, 'was_accurate', False) else "inaccurate",
                priority=6,
            )
        except Exception as e:
            logger.warning(f"[PredictionFeedbackBridge] Failed to publish PREDICTION_FEEDBACK: {e}")

    def process_prediction_outcome(
        self,
        prediction_id: str,
        actual_basin: np.ndarray,
        actual_arrival: int,
        god_name: str = "Ocean",
        phi_before: float = 0.5,
        phi_after: float = 0.5,
        kappa_before: float = 58.0,
        kappa_after: float = 58.0,
    ) -> Dict[str, Any]:
        """
        Process a prediction outcome and feed to training loop.
        
        This is the main entry point for TPS → Training integration.
        
        Args:
            prediction_id: ID from TPS prediction record
            actual_basin: Actual basin coordinates reached
            actual_arrival: Actual arrival time
            god_name: Which kernel made the prediction
            phi_before/after: Φ values before/after prediction period
            kappa_before/after: κ values before/after prediction period
            
        Returns:
            Processing results including any generated insights
        """
        result = {
            'prediction_id': prediction_id,
            'processed': False,
            'insights': [],
            'training_signal': None,
        }
        
        if not self._tps_system:
            logger.warning("[PredictionFeedbackBridge] TPS not wired")
            return result
        
        accuracy_score = self._tps_system.record_outcome(
            prediction_id=prediction_id,
            actual_basin=actual_basin,
            actual_arrival=actual_arrival
        )
        
        if accuracy_score is None:
            logger.warning(f"[PredictionFeedbackBridge] Unknown prediction: {prediction_id}")
            return result
        
        pred_record = self._tps_system.predictions.get(prediction_id)
        if not pred_record:
            return result
        
        insights = self._extract_insights_from_prediction(
            pred_record,
            actual_basin,
            phi_delta=phi_after - phi_before,
            kappa_delta=kappa_after - kappa_before,
        )
        
        for insight in insights:
            self.insight_buffer.append(insight)
            self.total_insights_generated += 1

        # Publish PREDICTION_FEEDBACK event with extracted insights
        self._publish_prediction_feedback(
            insights=insights,
            pred_record=pred_record,
            phi_delta=phi_after - phi_before,
            kappa_delta=kappa_after - kappa_before,
        )

        if self._training_integrator:
            trajectory = [pred_record.predicted_basin.tolist(), actual_basin.tolist()]
            
            training_result = self._training_integrator.train_from_outcome(
                god_name=god_name,
                prompt=f"Prediction {prediction_id}",
                response=f"Accuracy: {accuracy_score:.3f}",
                success=pred_record.was_accurate,
                phi=phi_after,
                kappa=kappa_after,
                basin_trajectory=trajectory,
                coherence_score=accuracy_score,
            )
            
            result['training_signal'] = training_result
            
            if training_result.get('status') == 'success':
                self.prediction_to_training[prediction_id] = training_result.get('outcome_count', 0)
        
        result['processed'] = True
        result['accuracy'] = accuracy_score
        result['insights'] = [i.to_dict() for i in insights]
        self.total_predictions_processed += 1

        # Update insight confidence based on prediction outcome
        insight_updates = self._update_insight_outcomes(
            prediction_id=prediction_id,
            accuracy_score=accuracy_score,
            was_accurate=pred_record.was_accurate,
        )
        result['insight_updates'] = insight_updates

        # Update associated chain's accuracy (chain-to-attractor feedback)
        chain_update = self._update_chain_accuracy(
            prediction_id=prediction_id,
            accuracy_score=accuracy_score,
        )
        result['chain_update'] = chain_update

        # Periodically reinforce successful chains
        reinforcement_result = self._maybe_reinforce_chains()
        if reinforcement_result:
            result['reinforcement'] = reinforcement_result

        return result

    def _update_insight_outcomes(
        self,
        prediction_id: str,
        accuracy_score: float,
        was_accurate: bool,
    ) -> List[Dict[str, Any]]:
        """
        Update insights that influenced this prediction based on its outcome.

        Closes the validation loop: Insight -> Prediction -> Outcome -> Confidence Update

        Args:
            prediction_id: The prediction whose outcome we're processing
            accuracy_score: How accurate the prediction was (0-1)
            was_accurate: Whether the prediction was considered accurate

        Returns:
            List of insight update results
        """
        updates = []

        # Get the Lightning kernel (lazily if not already wired)
        lightning = self._lightning_kernel
        if lightning is None:
            try:
                from olympus.lightning_kernel import get_lightning_kernel
                lightning = get_lightning_kernel()
                self._lightning_kernel = lightning
            except ImportError:
                logger.warning("[PredictionFeedbackBridge] Could not import Lightning kernel")
                return updates

        # Get insights that influenced this prediction
        insight_ids = lightning.get_insights_for_prediction(prediction_id)

        if not insight_ids:
            # Also check our local insight buffer for linked predictions
            for insight in self.insight_buffer:
                if prediction_id in insight.linked_predictions:
                    insight_ids.append(insight.insight_id)

        for insight_id in insight_ids:
            # Update insight confidence via Lightning kernel
            new_confidence = lightning.update_insight_confidence(
                insight_id=insight_id,
                prediction_id=prediction_id,
                accuracy=accuracy_score,
                was_accurate=was_accurate,
            )

            if new_confidence is not None:
                self.total_insight_updates += 1
                updates.append({
                    'insight_id': insight_id,
                    'prediction_id': prediction_id,
                    'accuracy': accuracy_score,
                    'was_accurate': was_accurate,
                    'new_confidence': new_confidence,
                })
                logger.info(
                    f"[PredictionFeedbackBridge] Updated insight {insight_id} "
                    f"confidence to {new_confidence:.3f} based on prediction {prediction_id}"
                )

        return updates

    def _update_chain_accuracy(
        self,
        prediction_id: str,
        accuracy_score: float,
    ) -> Optional[Dict[str, Any]]:
        """
        Update accuracy of chains associated with this prediction.

        Args:
            prediction_id: ID of the prediction
            accuracy_score: Accuracy score (0.0 to 1.0)

        Returns:
            Dict with update results or None if no chains updated
        """
        if not self._chain_manager:
            return None

        # Update chain accuracy via the manager
        chain_id = self._chain_manager.record_prediction_outcome_for_chain(
            prediction_id=prediction_id,
            accuracy=accuracy_score,
        )

        if chain_id:
            # Get the updated chain for logging
            chain = self._chain_manager.get_chain(chain_id) or \
                    self._chain_manager._get_completed_chain(chain_id)

            if chain:
                logger.info(
                    f"[PredictionFeedbackBridge] Updated chain {chain_id} "
                    f"accuracy to {chain.overall_accuracy:.3f} based on prediction {prediction_id}"
                )
                return {
                    'chain_id': chain_id,
                    'prediction_id': prediction_id,
                    'accuracy': accuracy_score,
                    'chain_overall_accuracy': chain.overall_accuracy,
                }

        return None

    def _maybe_reinforce_chains(self) -> Optional[Dict[str, Any]]:
        """
        Periodically reinforce successful chains.

        Called after processing each prediction outcome.
        Triggers reinforcement every N predictions.

        Returns:
            Reinforcement result dict or None if not triggered
        """
        # Check if we should reinforce
        predictions_since_last = self.total_predictions_processed - self._last_reinforcement_count

        if predictions_since_last < self._reinforcement_interval:
            return None

        # Time to reinforce
        self._last_reinforcement_count = self.total_predictions_processed

        result = self.reinforce_successful_chains(min_accuracy=0.7)

        if result.get('status') == 'success':
            self.total_chains_reinforced += result.get('chains_reinforced', 0)
            self.total_steps_reinforced += result.get('steps_reinforced', 0)

            logger.info(
                f"[PredictionFeedbackBridge] Periodic reinforcement: "
                f"{result.get('chains_reinforced', 0)} chains, "
                f"{result.get('steps_reinforced', 0)} steps (total: {self.total_chains_reinforced} chains, "
                f"{self.total_steps_reinforced} steps)"
            )

        return result

    def link_insight_to_prediction(self, insight_id: str, prediction_id: str) -> bool:
        """
        Link an insight to a prediction it influenced.

        Call this when creating a prediction that uses insights.
        Enables downstream outcome tracking.

        Args:
            insight_id: The insight being used
            prediction_id: The prediction being made

        Returns:
            True if link was created successfully
        """
        # Get Lightning kernel
        lightning = self._lightning_kernel
        if lightning is None:
            try:
                from olympus.lightning_kernel import get_lightning_kernel
                lightning = get_lightning_kernel()
                self._lightning_kernel = lightning
            except ImportError:
                logger.warning("[PredictionFeedbackBridge] Could not import Lightning kernel")
                return False

        return lightning.link_prediction_to_insight(prediction_id, insight_id)

    def get_insight_outcome_stats(self) -> Dict[str, Any]:
        """
        Get statistics about insight outcome tracking.

        Returns:
            Dict with tracking statistics
        """
        stats = {
            'total_insight_updates': self.total_insight_updates,
            'bridge_tracked_insights': len(self.insight_outcomes),
        }

        # Get Lightning kernel stats if available
        lightning = self._lightning_kernel
        if lightning is None:
            try:
                from olympus.lightning_kernel import get_lightning_kernel
                lightning = get_lightning_kernel()
            except ImportError:
                pass

        if lightning is not None:
            lightning_stats = lightning.get_all_insight_outcome_stats()
            stats['lightning_stats'] = lightning_stats

        return stats

    def reinforce_successful_chains(self, min_accuracy: float = 0.7) -> Dict[str, Any]:
        """
        Reinforce chains that led to accurate predictions.

        This closes the chain-to-attractor feedback loop by feeding high-value
        reasoning steps back into kernel training.

        Args:
            min_accuracy: Minimum overall_accuracy to consider a chain successful

        Returns:
            Dict with reinforcement statistics
        """
        if not self._chain_manager:
            logger.warning("[PredictionFeedbackBridge] Chain manager not wired for reinforcement")
            return {'status': 'not_wired', 'chains_reinforced': 0}

        if not self._training_integrator:
            logger.warning("[PredictionFeedbackBridge] Training integrator not wired for reinforcement")
            return {'status': 'training_not_wired', 'chains_reinforced': 0}

        # Get completed chains with high accuracy
        successful_chains = self._chain_manager.get_successful_chains(min_accuracy)

        chains_reinforced = 0
        steps_reinforced = 0
        training_results = []

        for chain in successful_chains:
            # Extract key reasoning steps (high curvature, high confidence, large leaps)
            key_steps = chain.get_key_steps()

            for step in key_steps:
                # Feed each key step to training integrator as positive example
                try:
                    # Determine source kernel (from metadata or default to 'chain')
                    source = step.metadata.get('source', 'chain')
                    if not source:
                        source = 'chain'

                    # Build basin trajectory from this step
                    basin_trajectory = None
                    if isinstance(step.basin, np.ndarray):
                        basin_trajectory = [step.basin.tolist()]

                    # Train from outcome with high success signal
                    result = self._training_integrator.train_from_outcome(
                        god_name=source,
                        prompt=f"chain_step_{chain.chain_id}_{step.step}",
                        response=step.thought[:200] if step.thought else "",
                        success=True,  # Positive reinforcement
                        phi=step.metadata.get('phi', 0.7),
                        kappa=step.metadata.get('kappa', 64.0),
                        basin_trajectory=basin_trajectory,
                        coherence_score=step.confidence,
                    )

                    if result and result.get('status') == 'success':
                        steps_reinforced += 1
                        training_results.append({
                            'chain_id': chain.chain_id,
                            'step': step.step,
                            'curvature': step.curvature,
                            'confidence': step.confidence,
                        })

                except Exception as e:
                    logger.warning(
                        f"[PredictionFeedbackBridge] Failed to reinforce step {step.step} "
                        f"from chain {chain.chain_id}: {e}"
                    )

            if key_steps:
                chains_reinforced += 1

        logger.info(
            f"[PredictionFeedbackBridge] Reinforced {steps_reinforced} steps "
            f"from {chains_reinforced} successful chains"
        )

        return {
            'status': 'success',
            'chains_reinforced': chains_reinforced,
            'steps_reinforced': steps_reinforced,
            'min_accuracy': min_accuracy,
            'training_results': training_results[:20],  # Limit for response size
        }

    def get_successful_chain_patterns(self, min_accuracy: float = 0.7) -> List[Dict[str, Any]]:
        """
        Get patterns from successful chains for analysis.

        Extracts pattern information from high-accuracy chains to understand
        what reasoning approaches work well.

        Args:
            min_accuracy: Minimum overall_accuracy threshold

        Returns:
            List of pattern dictionaries with chain analysis
        """
        if not self._chain_manager:
            return []

        successful_chains = self._chain_manager.get_successful_chains(min_accuracy)

        patterns = []
        for chain in successful_chains:
            try:
                pattern_info = chain.detect_pattern()
                key_steps = chain.get_key_steps()

                patterns.append({
                    'chain_id': chain.chain_id,
                    'pattern': pattern_info,
                    'key_steps': [
                        {
                            'step': s.step,
                            'thought': s.thought[:100] if s.thought else "",
                            'curvature': s.curvature,
                            'distance': s.distance_from_prev,
                            'confidence': s.confidence,
                        }
                        for s in key_steps
                    ],
                    'accuracy': chain.overall_accuracy,
                    'total_steps': len(chain.thought_chain),
                    'problem_context': chain.problem_context[:200] if chain.problem_context else "",
                })
            except Exception as e:
                logger.warning(f"[PredictionFeedbackBridge] Error extracting pattern from chain: {e}")

        return patterns

    def _extract_insights_from_prediction(
        self,
        pred_record,
        actual_basin: np.ndarray,
        phi_delta: float,
        kappa_delta: float,
    ) -> List[InsightRecord]:
        """Extract insight records from a prediction outcome."""
        insights = []
        
        from qig_geometry import fisher_coord_distance
        
        basin_distance = fisher_coord_distance(pred_record.predicted_basin, actual_basin)
        
        if abs(phi_delta) > 0.1:
            insight = InsightRecord(
                insight_id=f"insight_phi_{pred_record.prediction_id}",
                source='tps',
                content=f"Significant Φ {'increase' if phi_delta > 0 else 'decrease'} during prediction period",
                phi_delta=phi_delta,
                kappa_delta=kappa_delta,
                curvature=basin_distance,
                basin_coords=actual_basin.copy(),
                confidence=pred_record.accuracy_score,
                linked_predictions=[pred_record.prediction_id],
                metadata={
                    'failure_reasons': [r.value for r in pred_record.failure_reasons],
                    'attractor_strength': pred_record.attractor_strength,
                }
            )
            insights.append(insight)
        
        if pred_record.accuracy_score > 0.7:
            insight = InsightRecord(
                insight_id=f"insight_accurate_{pred_record.prediction_id}",
                source='tps',
                content="High-accuracy prediction pattern - reinforce this basin region",
                phi_delta=phi_delta,
                kappa_delta=kappa_delta,
                curvature=basin_distance,
                basin_coords=pred_record.predicted_basin.copy(),
                confidence=pred_record.accuracy_score,
                linked_predictions=[pred_record.prediction_id],
                metadata={'pattern_type': 'accurate_prediction'}
            )
            insights.append(insight)
        elif pred_record.accuracy_score < 0.3:
            insight = InsightRecord(
                insight_id=f"insight_inaccurate_{pred_record.prediction_id}",
                source='tps',
                content="Low-accuracy prediction - examine failure reasons for learning",
                phi_delta=phi_delta,
                kappa_delta=kappa_delta,
                curvature=basin_distance,
                basin_coords=pred_record.predicted_basin.copy(),
                confidence=1.0 - pred_record.accuracy_score,
                linked_predictions=[pred_record.prediction_id],
                metadata={
                    'pattern_type': 'prediction_failure',
                    'failure_reasons': [r.value for r in pred_record.failure_reasons],
                }
            )
            insights.append(insight)
        
        return insights
    
    def process_chain_to_insights(self, session_id: str) -> List[InsightRecord]:
        """
        Process a chain-of-thought session into insights.
        
        Extracts high-value thought steps (high curvature, large jumps,
        high confidence) as insight records for the learning loop.
        """
        if not self._chain_manager:
            return []
        
        chain = self._chain_manager.get_chain(session_id)
        if not chain or not chain.thought_chain:
            return []
        
        insights = []
        
        for i, step in enumerate(chain.thought_chain):
            is_insight = False
            content = ""
            
            if step.curvature > 0.5:
                is_insight = True
                content = f"High-curvature thought: {step.thought[:100]}"
            elif step.distance_from_prev > 1.0:
                is_insight = True
                content = f"Large reasoning leap: {step.thought[:100]}"
            elif step.confidence > 0.8:
                is_insight = True
                content = f"High-confidence conclusion: {step.thought[:100]}"
            
            if is_insight:
                insight = InsightRecord(
                    insight_id=f"insight_cot_{session_id}_{i}",
                    source='chain_of_thought',
                    content=content,
                    phi_delta=0.0,  # Will be filled by caller with actual metrics
                    kappa_delta=0.0,
                    curvature=step.curvature,
                    basin_coords=step.basin.copy() if isinstance(step.basin, np.ndarray) else None,
                    confidence=step.confidence,
                    linked_thoughts=[i],
                    metadata={
                        'difficulty': step.difficulty,
                        'distance_from_prev': step.distance_from_prev,
                        'problem_context': chain.problem_context,
                    }
                )
                insights.append(insight)
                self.insight_buffer.append(insight)
                self.total_insights_generated += 1
        
        return insights
    
    def feed_graph_transitions_to_training(self) -> Dict[str, Any]:
        """
        Feed accumulated graph transitions from TPS to training.
        
        The prediction graph tracks basin → basin transitions.
        This aggregates them into training signals.
        """
        if not self._tps_system or not self._training_integrator:
            return {'status': 'not_wired'}
        
        graph = self._tps_system.graph
        
        transitions_fed = 0
        for from_id, targets in graph.edges.items():
            from_node = graph.nodes.get(from_id)
            if not from_node:
                continue
            
            for to_id, count in targets.items():
                to_node = graph.nodes.get(to_id)
                if not to_node:
                    continue
                
                self._training_integrator.record_prediction_outcome(
                    attractor_name=f"transition_{from_id}_{to_id}",
                    basin_coords=from_node.centroid,
                    predicted_trajectory=[from_node.centroid.tolist()],
                    actual_trajectory=[to_node.centroid.tolist()],
                    phi_before=0.5,
                    phi_after=0.5 + (from_node.accuracy_rate - 0.5) * 0.1,
                    kappa_before=58.0,
                    kappa_after=58.0,
                    success=from_node.accuracy_rate > 0.5,
                    metadata={'transition_count': count}
                )
                transitions_fed += 1
        
        return {
            'status': 'success',
            'transitions_fed': transitions_fed,
            'nodes_in_graph': len(graph.nodes),
        }
    
    def get_pending_insights(self, limit: int = 50) -> List[InsightRecord]:
        """Get pending insights for consumption by curriculum/training."""
        return self.insight_buffer[:limit]
    
    def consume_insights(self, insight_ids: List[str]) -> int:
        """Mark insights as consumed (removes from buffer)."""
        initial_count = len(self.insight_buffer)
        self.insight_buffer = [i for i in self.insight_buffer if i.insight_id not in insight_ids]
        return initial_count - len(self.insight_buffer)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get bridge statistics."""
        stats = {
            'total_predictions_processed': self.total_predictions_processed,
            'total_insights_generated': self.total_insights_generated,
            'pending_insights': len(self.insight_buffer),
            'tps_wired': self._tps_system is not None,
            'training_wired': self._training_integrator is not None,
            'chain_manager_wired': self._chain_manager is not None,
            'lightning_wired': self._lightning_kernel is not None,
            'insight_outcome_tracking': {
                'total_insight_updates': self.total_insight_updates,
                'tracked_insights': len(self.insight_outcomes),
            },
            'chain_reinforcement': {
                'total_chains_reinforced': self.total_chains_reinforced,
                'total_steps_reinforced': self.total_steps_reinforced,
                'reinforcement_interval': self._reinforcement_interval,
                'predictions_until_next': max(0, self._reinforcement_interval -
                    (self.total_predictions_processed - self._last_reinforcement_count)),
            },
        }

        # Add Lightning kernel stats if available
        if self._lightning_kernel is not None:
            try:
                lightning_stats = self._lightning_kernel.get_all_insight_outcome_stats()
                stats['insight_outcome_tracking']['lightning'] = lightning_stats
            except Exception:
                pass

        # Add chain manager stats if available
        if self._chain_manager is not None:
            try:
                chain_stats = self._chain_manager.get_summary()
                stats['chain_manager'] = chain_stats
            except Exception:
                pass

        return stats


_bridge_instance: Optional[PredictionFeedbackBridge] = None


def get_prediction_feedback_bridge() -> PredictionFeedbackBridge:
    """Get or create the singleton prediction feedback bridge."""
    global _bridge_instance
    if _bridge_instance is None:
        _bridge_instance = PredictionFeedbackBridge()
        
        try:
            from prediction_self_improvement import get_prediction_improvement
            tps = get_prediction_improvement()  # Use existing singleton, not new instance
            _bridge_instance.wire_tps(tps)
        except Exception as e:
            logger.warning(f"[PredictionFeedbackBridge] Could not wire TPS: {e}")
        
        try:
            from training.training_loop_integrator import get_training_integrator
            integrator = get_training_integrator()
            _bridge_instance.wire_training_integrator(integrator)
        except Exception as e:
            logger.warning(f"[PredictionFeedbackBridge] Could not wire training: {e}")
        
        try:
            from chain_of_thought import get_chain_manager
            manager = get_chain_manager()
            _bridge_instance.wire_chain_manager(manager)
        except Exception as e:
            logger.warning(f"[PredictionFeedbackBridge] Could not wire chain manager: {e}")

        try:
            from olympus.lightning_kernel import get_lightning_kernel
            lightning = get_lightning_kernel()
            _bridge_instance.wire_lightning(lightning)
        except Exception as e:
            logger.warning(f"[PredictionFeedbackBridge] Could not wire Lightning kernel: {e}")

    return _bridge_instance
