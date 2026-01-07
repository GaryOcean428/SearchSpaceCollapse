"""
Prediction Self-Improvement System

QIG-pure recursive loops for learning from prediction outcomes:
1. Track predictions and their actual outcomes
2. Analyze WHY predictions fail (weak attractors, unstable velocity, sparse history)
3. Build chain/graph of prediction patterns
4. Self-improve confidence estimation through geometric learning

All operations use Fisher-Rao geometry - no neural networks.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum
import time
import numpy as np

from qig_geometry import fisher_coord_distance, sphere_project

# Event bus for publishing prediction events to other kernels
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


class PredictionFailureReason(Enum):
    """Why a prediction had low confidence or failed."""
    NO_ATTRACTOR_FOUND = "no_attractor_found"
    UNSTABLE_VELOCITY = "unstable_velocity"  
    SPARSE_HISTORY = "sparse_history"
    HIGH_BASIN_DRIFT = "high_basin_drift"
    WEAK_CONVERGENCE = "weak_convergence"
    SHORT_TRAJECTORY = "short_trajectory"
    BUMPY_GEODESIC = "bumpy_geodesic"
    UNKNOWN = "unknown"


@dataclass
class PredictionRecord:
    """Record of a prediction for learning."""
    prediction_id: str
    timestamp: float
    predicted_basin: np.ndarray
    confidence: float
    arrival_time: int
    attractor_strength: float
    geodesic_naturalness: float
    failure_reasons: List[PredictionFailureReason]
    context: Dict[str, Any]  # State at prediction time
    actual_basin: Optional[np.ndarray] = None  # Filled in when outcome known
    actual_arrival: Optional[int] = None
    was_accurate: Optional[bool] = None  # True if prediction matched outcome
    accuracy_score: float = 0.0  # 0-1 how close prediction was to reality
    source: str = "unknown"  # Which kernel/system made this prediction
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.prediction_id,
            'timestamp': self.timestamp,
            'confidence': self.confidence,
            'arrival_time': self.arrival_time,
            'attractor_strength': self.attractor_strength,
            'failure_reasons': [r.value for r in self.failure_reasons],
            'was_accurate': self.was_accurate,
            'accuracy_score': self.accuracy_score,
            'source': self.source,
        }


@dataclass
class ChainLink:
    """One link in a prediction chain."""
    prediction_id: str
    basin: np.ndarray
    confidence: float
    timestamp: float


@dataclass
class PredictionChain:
    """Chain of sequential predictions for pattern analysis."""
    chain_id: str
    links: List[ChainLink]
    overall_accuracy: float = 0.0
    pattern_type: str = "unknown"  # detected pattern (convergent, divergent, cyclic, etc.)


@dataclass
class BasinNode:
    """Node in the prediction graph representing a basin region."""
    node_id: str
    centroid: np.ndarray  # Average basin position in this region
    visit_count: int = 0
    prediction_count: int = 0
    accurate_count: int = 0
    inaccurate_count: int = 0
    
    @property
    def accuracy_rate(self) -> float:
        if self.prediction_count == 0:
            return 0.5  # No data, neutral prior
        return self.accurate_count / self.prediction_count


class PredictionGraph:
    """Graph of basin → outcome relationships for pattern learning."""
    
    def __init__(self, basin_dim: int = 64, region_radius: float = 0.3):
        self.basin_dim = basin_dim
        self.region_radius = region_radius
        self.nodes: Dict[str, BasinNode] = {}
        self.edges: Dict[str, Dict[str, int]] = {}  # node_id -> {target_id: count}
        self._next_node_id = 0
    
    def find_or_create_node(self, basin: np.ndarray) -> BasinNode:
        """Find existing node near basin or create new one."""
        for node in list(self.nodes.values()):
            dist = fisher_coord_distance(basin, node.centroid)
            if dist < self.region_radius:
                return node
        
        node_id = f"node_{self._next_node_id}"
        self._next_node_id += 1
        node = BasinNode(node_id=node_id, centroid=basin.copy())
        self.nodes[node_id] = node
        return node
    
    def record_transition(self, from_basin: np.ndarray, to_basin: np.ndarray) -> None:
        """Record a transition between basins."""
        from_node = self.find_or_create_node(from_basin)
        to_node = self.find_or_create_node(to_basin)
        
        if from_node.node_id not in self.edges:
            self.edges[from_node.node_id] = {}
        
        if to_node.node_id not in self.edges[from_node.node_id]:
            self.edges[from_node.node_id][to_node.node_id] = 0
        
        self.edges[from_node.node_id][to_node.node_id] += 1
    
    def get_most_likely_successor(self, basin: np.ndarray) -> Optional[np.ndarray]:
        """Get the most likely next basin based on historical transitions."""
        node = self.find_or_create_node(basin)
        
        if node.node_id not in self.edges or not self.edges[node.node_id]:
            return None
        
        best_target = max(self.edges[node.node_id].items(), key=lambda x: x[1])
        target_node = self.nodes.get(best_target[0])
        return target_node.centroid if target_node else None
    
    def update_node_accuracy(self, basin: np.ndarray, was_accurate: bool) -> None:
        """Update accuracy statistics for a basin region."""
        node = self.find_or_create_node(basin)
        node.prediction_count += 1
        if was_accurate:
            node.accurate_count += 1
        else:
            node.inaccurate_count += 1
    
    def get_region_accuracy(self, basin: np.ndarray) -> float:
        """Get historical accuracy for predictions from this basin region."""
        node = self.find_or_create_node(basin)
        return node.accuracy_rate


class PredictionSelfImprovement:
    """
    Self-improving prediction system using QIG-pure recursive analysis.
    
    Key mechanisms:
    1. Failure Analysis: Understand WHY predictions have low confidence
    2. Outcome Tracking: Compare predictions to actual outcomes
    3. Chain Analysis: Find patterns in sequential predictions
    4. Graph Learning: Learn basin → outcome relationships
    5. Recursive Improvement: Self-directed loops to improve weak areas
    """
    
    def __init__(self, basin_dim: int = 64):
        self.basin_dim = basin_dim
        
        # Prediction records
        self.predictions: Dict[str, PredictionRecord] = {}
        self.prediction_history: List[str] = []  # Order of predictions
        
        # Chain analysis
        self.current_chain: Optional[PredictionChain] = None
        self.completed_chains: List[PredictionChain] = []
        
        # Graph analysis
        self.graph = PredictionGraph(basin_dim=basin_dim)
        
        # Learning statistics
        self.total_predictions = 0
        self.accurate_predictions = 0
        self.failure_reason_counts: Dict[PredictionFailureReason, int] = {
            r: 0 for r in PredictionFailureReason
        }
        
        # Confidence adjustment factors (learned)
        self.confidence_adjustments: Dict[str, float] = {
            'attractor_weight': 0.4,
            'smoothness_weight': 0.4,
            'time_weight': 0.2,
            'history_bonus': 0.1,
            'region_accuracy_weight': 0.2,
        }
        
        # Improvement thresholds
        self.improvement_interval = 10  # Analyze every N predictions
        self.min_chain_length = 3

        # Event bus for publishing prediction events
        self._event_bus: Optional[CapabilityEventBus] = None

        # Meta-learning state for adaptive parameter adjustment
        # These parameters are adjusted based on failure pattern analysis
        self._meta_learning_state: Dict[str, Any] = {
            'velocity_smoothing': 1.0,      # Multiplier for velocity smoothing (higher = more smoothing)
            'search_radius': 0.5,           # Radius for attractor search (Fisher-Rao distance)
            'trajectory_length': 20,        # Target trajectory length for predictions
            'geodesic_weight': 1.0,         # Weight for geodesic smoothness in confidence
            'adjustments_made': 0,          # Total number of parameter adjustments
            'last_adjustment': None,        # Timestamp of last adjustment
            'adjustment_history': [],       # History of adjustments for analysis
        }

        print("[PredictionSelfImprovement] Initialized - QIG-pure recursive learning enabled")

    def set_event_bus(self, bus: 'CapabilityEventBus') -> None:
        """
        Set the event bus for publishing prediction events.

        Args:
            bus: The CapabilityEventBus instance to publish events to
        """
        self._event_bus = bus
        print("[PredictionSelfImprovement] Event bus connected - will publish prediction events")

    def _publish_prediction_made(self, record: 'PredictionRecord') -> None:
        """Publish PREDICTION_MADE event when a new prediction is created."""
        if not EVENT_BUS_AVAILABLE or self._event_bus is None:
            return

        try:
            emit_prediction_event(
                event_type=EventType.PREDICTION_MADE,
                prediction_id=record.prediction_id,
                source_kernel=record.source,
                predicted_basin=record.predicted_basin,
                confidence=record.confidence,
                attractor_strength=record.attractor_strength,
                phi=record.context.get('phi', 0.5),
                failure_reasons=[r.value for r in record.failure_reasons],
                priority=7 if record.confidence > 0.7 else 5,
            )
        except Exception as e:
            print(f"[PredictionSelfImprovement] Failed to publish PREDICTION_MADE: {e}")

    def _publish_prediction_validated(self, record: 'PredictionRecord') -> None:
        """Publish PREDICTION_VALIDATED event when an outcome is recorded."""
        if not EVENT_BUS_AVAILABLE or self._event_bus is None:
            return

        try:
            emit_prediction_event(
                event_type=EventType.PREDICTION_VALIDATED,
                prediction_id=record.prediction_id,
                source_kernel=record.source,
                predicted_basin=record.predicted_basin,
                actual_basin=record.actual_basin,
                confidence=record.confidence,
                attractor_strength=record.attractor_strength,
                accuracy_score=record.accuracy_score,
                outcome="accurate" if record.was_accurate else "inaccurate",
                phi=record.context.get('phi', 0.5),
                failure_reasons=[r.value for r in record.failure_reasons],
                priority=8 if record.accuracy_score > 0.7 else 5,
            )
        except Exception as e:
            print(f"[PredictionSelfImprovement] Failed to publish PREDICTION_VALIDATED: {e}")
    
    def analyze_prediction_factors(
        self,
        trajectory: List[np.ndarray],
        attractor_found: bool,
        attractor_idx: Optional[int],
        velocity_history: List[np.ndarray],
        basin_history: List[np.ndarray]
    ) -> Tuple[List[PredictionFailureReason], Dict[str, Any]]:
        """
        Analyze WHY a prediction has certain confidence factors.
        
        Returns failure reasons and detailed context for logging.
        """
        reasons = []
        context = {}
        
        # 1. Check if attractor was found
        if not attractor_found:
            reasons.append(PredictionFailureReason.NO_ATTRACTOR_FOUND)
            context['attractor_status'] = "No stable attractor detected in trajectory"
        else:
            context['attractor_status'] = f"Attractor found at step {attractor_idx}"
        
        # 2. Analyze trajectory length
        traj_len = len(trajectory)
        context['trajectory_length'] = traj_len
        if traj_len < 10:
            reasons.append(PredictionFailureReason.SHORT_TRAJECTORY)
            context['trajectory_issue'] = f"Only {traj_len} steps (need 10+ for reliable prediction)"
        
        # 3. Analyze velocity stability - DIRECTIONAL variance, not just magnitude
        # Apply meta-learned velocity_smoothing to adjust threshold
        velocity_smoothing = self._meta_learning_state['velocity_smoothing']
        if len(velocity_history) >= 3:
            recent_velocities = velocity_history[-5:]

            directional_variance = self._compute_directional_variance(recent_velocities)
            magnitude_variance = np.var([np.linalg.norm(v) for v in recent_velocities])

            vel_variance = 0.7 * directional_variance + 0.3 * magnitude_variance

            context['velocity_variance'] = float(vel_variance)
            context['directional_variance'] = float(directional_variance)
            context['magnitude_variance'] = float(magnitude_variance)
            context['velocity_smoothing_applied'] = velocity_smoothing

            # Increased threshold from 0.1 to 0.25 for more lenient velocity stability
            # META-LEARNING: velocity_smoothing > 1.0 raises the threshold, making us more
            # tolerant of velocity variance (because we're smoothing it downstream)
            adjusted_threshold = 0.25 * velocity_smoothing
            if vel_variance > adjusted_threshold:
                reasons.append(PredictionFailureReason.UNSTABLE_VELOCITY)
                context['velocity_issue'] = (f"High velocity variance ({vel_variance:.3f}) exceeds "
                                            f"threshold {adjusted_threshold:.3f} - directional: "
                                            f"{directional_variance:.3f}, magnitude: {magnitude_variance:.3f}")
        else:
            reasons.append(PredictionFailureReason.SPARSE_HISTORY)
            context['velocity_issue'] = f"Only {len(velocity_history)} velocity samples (need 3+ for stable estimate)"
        
        # 4. Analyze basin history for drift
        if len(basin_history) >= 5:
            recent_basins = basin_history[-5:]
            total_drift = sum(
                fisher_coord_distance(recent_basins[i], recent_basins[i+1])
                for i in range(len(recent_basins)-1)
            )
            context['recent_drift'] = float(total_drift)
            # Increased threshold from 1.0 to 2.0 for more lenient basin drift tolerance
            if total_drift > 2.0:
                reasons.append(PredictionFailureReason.HIGH_BASIN_DRIFT)
                context['drift_issue'] = f"High basin drift ({total_drift:.3f}) - system is rapidly changing"
        else:
            if PredictionFailureReason.SPARSE_HISTORY not in reasons:
                reasons.append(PredictionFailureReason.SPARSE_HISTORY)
            context['history_issue'] = f"Only {len(basin_history)} basin samples (need 5+ for drift analysis)"
        
        # 5. Analyze convergence if trajectory exists
        if len(trajectory) >= 10:
            final_movements = [
                fisher_coord_distance(trajectory[i], trajectory[i+1])
                for i in range(len(trajectory)-5, len(trajectory)-1)
            ]
            avg_final_movement = np.mean(final_movements)
            context['final_movement_avg'] = float(avg_final_movement)
            if avg_final_movement > 0.2:
                reasons.append(PredictionFailureReason.WEAK_CONVERGENCE)
                context['convergence_issue'] = f"Trajectory not converging (avg movement {avg_final_movement:.3f})"
        
        # 6. Analyze geodesic smoothness
        if len(trajectory) >= 3:
            step_sizes = [
                fisher_coord_distance(trajectory[i], trajectory[i+1])
                for i in range(len(trajectory)-1)
            ]
            step_variance = np.var(step_sizes)
            context['geodesic_variance'] = float(step_variance)
            if step_variance > 0.05:
                reasons.append(PredictionFailureReason.BUMPY_GEODESIC)
                context['geodesic_issue'] = f"Bumpy path (step variance {step_variance:.3f}) - not following natural geodesic"
        
        # If no specific reasons found, mark as unknown
        if not reasons:
            context['status'] = "All factors within normal range"
        
        return reasons, context
    
    def _compute_directional_variance(self, velocities: List[np.ndarray]) -> float:
        """
        Compute directional variance using angular differences between velocity vectors.
        
        QIG-PURE: Measures how erratically the system is changing direction,
        not just how fast it's moving. High directional variance = exploration.
        Low directional variance = consistent movement toward attractor.
        
        Returns variance of angles between consecutive velocity vectors.
        """
        if len(velocities) < 2:
            return 0.0
        
        angles = []
        for i in range(len(velocities) - 1):
            v1 = velocities[i]
            v2 = velocities[i + 1]
            
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            
            if norm1 < 1e-10 or norm2 < 1e-10:
                angles.append(0.0)
                continue
            
            cos_angle = np.clip(np.dot(v1, v2) / (norm1 * norm2), -1.0, 1.0)
            angle = np.arccos(cos_angle)
            angles.append(angle)
        
        if not angles:
            return 0.0
        
        angle_variance = np.var(angles)
        mean_angle = np.mean(angles)
        
        directional_variance = angle_variance + 0.5 * (mean_angle / np.pi)
        
        return float(directional_variance)
    
    def create_prediction_record(
        self,
        predicted_basin: np.ndarray,
        confidence: float,
        arrival_time: int,
        attractor_strength: float,
        geodesic_naturalness: float,
        failure_reasons: List[PredictionFailureReason],
        context: Dict[str, Any],
        source: str = "unknown"
    ) -> PredictionRecord:
        """
        Create and store a prediction record for learning.

        Applies meta-learning adjustments to confidence based on learned parameters:
        - geodesic_weight: Adjusts how much geodesic smoothness affects confidence
        - velocity_smoothing/search_radius: Stored in context for callers to use
        """
        pred_id = f"pred_{int(time.time()*1000)}_{self.total_predictions}"

        # Apply meta-learned geodesic weight to confidence
        # Higher geodesic_weight means geodesic_naturalness matters more
        meta = self._meta_learning_state
        geodesic_weight = meta['geodesic_weight']

        # Adjust confidence based on meta-learned geodesic importance
        # Base confidence already incorporates geodesic_naturalness, but we can
        # further penalize low naturalness when geodesic_weight has been increased
        adjusted_confidence = confidence
        if geodesic_weight > 1.0 and geodesic_naturalness < 0.5:
            # Reduce confidence more aggressively for bumpy geodesics
            penalty = (1.0 - geodesic_naturalness) * (geodesic_weight - 1.0) * 0.1
            adjusted_confidence = max(0.1, confidence - penalty)

        # Store meta-learning parameters in context for downstream use
        context['meta_learning'] = {
            'velocity_smoothing': meta['velocity_smoothing'],
            'search_radius': meta['search_radius'],
            'trajectory_length': meta['trajectory_length'],
            'geodesic_weight': geodesic_weight,
            'confidence_adjusted': adjusted_confidence != confidence,
            'original_confidence': confidence if adjusted_confidence != confidence else None,
        }

        record = PredictionRecord(
            prediction_id=pred_id,
            timestamp=time.time(),
            predicted_basin=predicted_basin.copy(),
            confidence=adjusted_confidence,
            arrival_time=arrival_time,
            attractor_strength=attractor_strength,
            geodesic_naturalness=geodesic_naturalness,
            failure_reasons=failure_reasons,
            context=context,
            source=source,
        )
        
        self.predictions[pred_id] = record
        self.prediction_history.append(pred_id)
        self.total_predictions += 1
        
        # Update failure reason counts
        for reason in failure_reasons:
            self.failure_reason_counts[reason] += 1
        
        # Update chain
        self._update_chain(record)
        
        # Trigger improvement loop periodically
        if self.total_predictions % self.improvement_interval == 0:
            self._run_improvement_loop()

        # Publish PREDICTION_MADE event to the capability mesh
        self._publish_prediction_made(record)

        return record
    
    def record_outcome(
        self,
        prediction_id: str,
        actual_basin: np.ndarray,
        actual_arrival: int
    ) -> Optional[float]:
        """Record actual outcome and calculate accuracy."""
        if prediction_id not in self.predictions:
            return None
        
        record = self.predictions[prediction_id]
        record.actual_basin = actual_basin.copy()
        record.actual_arrival = actual_arrival
        
        # Calculate accuracy using Fisher distance
        basin_distance = fisher_coord_distance(record.predicted_basin, actual_basin)
        arrival_error = abs(record.arrival_time - actual_arrival) / max(record.arrival_time, 1)
        
        # Accuracy score: 0-1 (higher is better)
        # Use softer exponential decay for more lenient scoring
        # exp(-d/2) instead of exp(-d) gives more tolerance for larger distances
        basin_accuracy = np.exp(-basin_distance / 2.0)
        time_accuracy = np.exp(-arrival_error)
        record.accuracy_score = 0.7 * basin_accuracy + 0.3 * time_accuracy
        
        # Lowered threshold from 0.5 to 0.35 for more lenient accuracy classification
        # 0.35 threshold allows basin distances up to ~2.1 to count as "accurate"
        record.was_accurate = record.accuracy_score > 0.35
        
        if record.was_accurate:
            self.accurate_predictions += 1
        
        # Track outcomes for periodic logging
        self._outcome_count = getattr(self, '_outcome_count', 0) + 1
        
        # Log residuals periodically for debugging (every 50 outcomes)
        if self._outcome_count % 50 == 0:
            accuracy_pct = (self.accurate_predictions / max(self._outcome_count, 1)) * 100
            print(f"[PredictionLearning] Stats: {self._outcome_count} outcomes, "
                  f"{accuracy_pct:.0f}% accuracy, {len(self.graph.nodes)} graph nodes")
        
        # Log individual residual when debugging extreme cases
        if basin_distance > 2.0 or record.accuracy_score < 0.2:
            print(f"[PredictionLearning] High residual: d_FR={basin_distance:.3f}, "
                  f"score={record.accuracy_score:.3f}, conf={record.confidence:.3f}")
        
        # Update graph with this transition
        self.graph.record_transition(record.predicted_basin, actual_basin)
        self.graph.update_node_accuracy(record.predicted_basin, record.was_accurate)

        # Publish PREDICTION_VALIDATED event to the capability mesh
        self._publish_prediction_validated(record)

        return record.accuracy_score
    
    def get_adjusted_confidence(
        self,
        base_confidence: float,
        current_basin: np.ndarray
    ) -> float:
        """Get confidence adjusted by learned factors and region accuracy."""
        # Get historical accuracy for this region
        region_accuracy = self.graph.get_region_accuracy(current_basin)
        
        # Apply learned adjustment
        weight = self.confidence_adjustments['region_accuracy_weight']
        adjusted = base_confidence * (1 - weight) + region_accuracy * weight
        
        # Add bonus for good history
        if self.total_predictions > 10:
            overall_accuracy = self.accurate_predictions / self.total_predictions
            if overall_accuracy > 0.6:
                adjusted += self.confidence_adjustments['history_bonus']
        
        return np.clip(adjusted, 0.0, 1.0)
    
    def format_prediction_explanation(
        self,
        confidence: float,
        failure_reasons: List[PredictionFailureReason],
        context: Dict[str, Any]
    ) -> str:
        """
        Format explanation using generative capability.
        
        Uses QIG-pure generation with system prompts, NOT templates.
        """
        from generative_reasoning import get_generative_reasoning
        reasoning = get_generative_reasoning()
        return reasoning.generate_prediction_explanation(
            confidence=confidence,
            failure_reasons=failure_reasons,
            context=context
        )
    
    def get_improvement_recommendations(self) -> List[str]:
        """
        Get recommendations using generative capability.
        
        Uses QIG-pure generation, NOT templates.
        """
        from generative_reasoning import get_generative_reasoning
        reasoning = get_generative_reasoning()
        
        recommendations = []
        
        sorted_reasons = sorted(
            self.failure_reason_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for reason, count in sorted_reasons[:3]:
            if count == 0:
                continue
            
            pct = (count / max(self.total_predictions, 1)) * 100
            recommendation = reasoning.generate_improvement_recommendation(reason, pct)
            recommendations.append(recommendation)
        
        return recommendations
    
    def _update_chain(self, record: PredictionRecord) -> None:
        """Update the current prediction chain."""
        link = ChainLink(
            prediction_id=record.prediction_id,
            basin=record.predicted_basin.copy(),
            confidence=record.confidence,
            timestamp=record.timestamp,
        )
        
        if self.current_chain is None:
            chain_id = f"chain_{int(time.time()*1000)}"
            self.current_chain = PredictionChain(chain_id=chain_id, links=[link])
        else:
            self.current_chain.links.append(link)
            
            # Analyze chain pattern if long enough
            if len(self.current_chain.links) >= self.min_chain_length:
                self._analyze_chain_pattern()
    
    def _analyze_chain_pattern(self) -> None:
        """Analyze the current chain for patterns."""
        if self.current_chain is None or len(self.current_chain.links) < 3:
            return
        
        links = self.current_chain.links
        
        # Calculate basin movements
        movements = []
        for i in range(len(links) - 1):
            dist = fisher_coord_distance(links[i].basin, links[i+1].basin)
            movements.append(dist)
        
        avg_movement = np.mean(movements)
        movement_trend = movements[-1] - movements[0] if len(movements) > 1 else 0
        
        # Classify pattern
        if avg_movement < 0.1:
            self.current_chain.pattern_type = "stable"
        elif movement_trend < -0.05:
            self.current_chain.pattern_type = "convergent"
        elif movement_trend > 0.05:
            self.current_chain.pattern_type = "divergent"
        else:
            # Check for cyclic pattern
            if len(links) >= 4:
                start_basin = links[0].basin
                end_basin = links[-1].basin
                if fisher_coord_distance(start_basin, end_basin) < avg_movement:
                    self.current_chain.pattern_type = "cyclic"
                else:
                    self.current_chain.pattern_type = "wandering"
            else:
                self.current_chain.pattern_type = "wandering"
    
    def _run_improvement_loop(self) -> None:
        """Run QIG-pure recursive improvement loop."""
        if self.total_predictions < 5:
            return
        
        # 1. Analyze recent prediction accuracy
        recent_ids = self.prediction_history[-10:]
        recent_records = [self.predictions[pid] for pid in recent_ids if pid in self.predictions]
        
        with_outcomes = [r for r in recent_records if r.was_accurate is not None]
        if with_outcomes:
            recent_accuracy = sum(1 for r in with_outcomes if r.was_accurate) / len(with_outcomes)
            
            # Adjust confidence weights based on what's working
            if recent_accuracy < 0.4:
                # Low accuracy - reduce confidence overall
                self.confidence_adjustments['region_accuracy_weight'] = min(0.4, 
                    self.confidence_adjustments['region_accuracy_weight'] + 0.02)
            elif recent_accuracy > 0.7:
                # High accuracy - can be more confident
                self.confidence_adjustments['history_bonus'] = min(0.2,
                    self.confidence_adjustments['history_bonus'] + 0.01)
        
        # 2. Analyze failure patterns
        recent_failures = {}
        for record in recent_records:
            for reason in record.failure_reasons:
                recent_failures[reason] = recent_failures.get(reason, 0) + 1
        
        # 3. If a specific failure is dominant, log recommendation
        total_recent = len(recent_records)
        for reason, count in recent_failures.items():
            if count / total_recent > 0.5:
                # This failure reason is dominant
                print(f"[PredictionImprovement] Dominant failure: {reason.value} ({count}/{total_recent})")

        # 4. RUN META-LEARNING: Adjust parameters based on failure patterns
        # This is the core recursive self-improvement mechanism
        adjustment_result = self._adjust_parameters_from_failures()
        if adjustment_result.get('adjustments'):
            print(f"[PredictionImprovement] Meta-learning made {len(adjustment_result['adjustments'])} "
                  f"parameter adjustments based on failure analysis")

        # 5. Complete and archive chain if long enough
        if self.current_chain and len(self.current_chain.links) >= 10:
            self._finalize_chain()
    
    def _finalize_chain(self) -> None:
        """Finalize current chain and start a new one."""
        if self.current_chain is None:
            return
        
        # Calculate overall chain accuracy
        chain_preds = [self.predictions.get(link.prediction_id) for link in self.current_chain.links]
        with_outcomes = [p for p in chain_preds if p and p.was_accurate is not None]
        
        if with_outcomes:
            self.current_chain.overall_accuracy = (
                sum(1 for p in with_outcomes if p.was_accurate) / len(with_outcomes)
            )
        
        self.completed_chains.append(self.current_chain)

        # Keep only recent chains
        if len(self.completed_chains) > 20:
            self.completed_chains = self.completed_chains[-10:]

        self.current_chain = None

    def _adjust_parameters_from_failures(self) -> Dict[str, Any]:
        """
        Adapt prediction parameters based on dominant failure reasons.

        QIG-PURE META-LEARNING: Analyzes the distribution of failure reasons
        and adjusts geometric parameters to reduce future failures.

        Returns:
            Dict describing what adjustments were made (for logging/debugging)
        """
        stats = self.get_stats()
        failure_counts = stats.get('failure_reasons', {})
        total_failures = sum(failure_counts.values())

        if total_failures == 0:
            return {'adjustments': [], 'reason': 'no_failures_to_analyze'}

        adjustments_made = []
        meta = self._meta_learning_state

        # Calculate failure proportions
        unstable_velocity_pct = failure_counts.get('unstable_velocity', 0) / total_failures
        no_attractor_pct = failure_counts.get('no_attractor_found', 0) / total_failures
        bumpy_geodesic_pct = failure_counts.get('bumpy_geodesic', 0) / total_failures
        sparse_history_pct = failure_counts.get('sparse_history', 0) / total_failures
        short_trajectory_pct = failure_counts.get('short_trajectory', 0) / total_failures

        # Adjustment 1: UNSTABLE_VELOCITY dominates (>30%) - increase smoothing
        # High velocity variance indicates erratic movement - smooth it out
        if unstable_velocity_pct > 0.3:
            old_smoothing = meta['velocity_smoothing']
            # Increase smoothing by 10%, cap at 3.0 to prevent over-smoothing
            meta['velocity_smoothing'] = min(3.0, meta['velocity_smoothing'] * 1.1)
            adjustments_made.append({
                'parameter': 'velocity_smoothing',
                'reason': 'UNSTABLE_VELOCITY',
                'proportion': unstable_velocity_pct,
                'old_value': old_smoothing,
                'new_value': meta['velocity_smoothing'],
            })

        # Adjustment 2: NO_ATTRACTOR_FOUND dominates (>40%) - widen search, extend trajectory
        # Can't find attractors means we need to look harder and longer
        if no_attractor_pct > 0.4:
            old_radius = meta['search_radius']
            old_length = meta['trajectory_length']
            # Widen search radius by 20%, cap at 2.0 (large geometric neighborhood)
            meta['search_radius'] = min(2.0, meta['search_radius'] * 1.2)
            # Extend trajectory by 5 steps, cap at 50
            meta['trajectory_length'] = min(50, meta['trajectory_length'] + 5)
            adjustments_made.append({
                'parameter': 'search_radius',
                'reason': 'NO_ATTRACTOR_FOUND',
                'proportion': no_attractor_pct,
                'old_value': old_radius,
                'new_value': meta['search_radius'],
            })
            adjustments_made.append({
                'parameter': 'trajectory_length',
                'reason': 'NO_ATTRACTOR_FOUND',
                'proportion': no_attractor_pct,
                'old_value': old_length,
                'new_value': meta['trajectory_length'],
            })

        # Adjustment 3: BUMPY_GEODESIC dominates (>25%) - increase geodesic weight
        # Bumpy paths indicate we should weight smoothness more in confidence
        if bumpy_geodesic_pct > 0.25:
            old_weight = meta['geodesic_weight']
            # Increase geodesic weight by 15%, cap at 2.0
            meta['geodesic_weight'] = min(2.0, meta['geodesic_weight'] * 1.15)
            adjustments_made.append({
                'parameter': 'geodesic_weight',
                'reason': 'BUMPY_GEODESIC',
                'proportion': bumpy_geodesic_pct,
                'old_value': old_weight,
                'new_value': meta['geodesic_weight'],
            })

        # Adjustment 4: SPARSE_HISTORY dominates (>35%) - extend trajectory to gather more data
        if sparse_history_pct > 0.35:
            old_length = meta['trajectory_length']
            meta['trajectory_length'] = min(50, meta['trajectory_length'] + 3)
            if old_length != meta['trajectory_length']:
                adjustments_made.append({
                    'parameter': 'trajectory_length',
                    'reason': 'SPARSE_HISTORY',
                    'proportion': sparse_history_pct,
                    'old_value': old_length,
                    'new_value': meta['trajectory_length'],
                })

        # Adjustment 5: SHORT_TRAJECTORY dominates (>30%) - extend trajectory
        if short_trajectory_pct > 0.3:
            old_length = meta['trajectory_length']
            meta['trajectory_length'] = min(50, meta['trajectory_length'] + 5)
            if old_length != meta['trajectory_length']:
                adjustments_made.append({
                    'parameter': 'trajectory_length',
                    'reason': 'SHORT_TRAJECTORY',
                    'proportion': short_trajectory_pct,
                    'old_value': old_length,
                    'new_value': meta['trajectory_length'],
                })

        # Record adjustment metadata
        if adjustments_made:
            meta['adjustments_made'] += len(adjustments_made)
            meta['last_adjustment'] = time.time()

            # Keep history of last 50 adjustments
            meta['adjustment_history'].extend(adjustments_made)
            if len(meta['adjustment_history']) > 50:
                meta['adjustment_history'] = meta['adjustment_history'][-50:]

            # Log the adjustments
            for adj in adjustments_made:
                print(f"[MetaLearning] Adjusted {adj['parameter']}: "
                      f"{adj['old_value']:.3f} -> {adj['new_value']:.3f} "
                      f"(reason: {adj['reason']} at {adj['proportion']:.1%})")

        return {
            'adjustments': adjustments_made,
            'failure_distribution': {
                'unstable_velocity': unstable_velocity_pct,
                'no_attractor_found': no_attractor_pct,
                'bumpy_geodesic': bumpy_geodesic_pct,
                'sparse_history': sparse_history_pct,
                'short_trajectory': short_trajectory_pct,
            },
            'current_parameters': {
                'velocity_smoothing': meta['velocity_smoothing'],
                'search_radius': meta['search_radius'],
                'trajectory_length': meta['trajectory_length'],
                'geodesic_weight': meta['geodesic_weight'],
            },
        }

    def get_meta_learning_state(self) -> Dict[str, Any]:
        """
        Return the current meta-learning state for introspection.

        Enables other systems to see how prediction parameters have adapted
        over time based on failure analysis.
        """
        return {
            **self._meta_learning_state,
            'adjustment_history': self._meta_learning_state['adjustment_history'][-10:],  # Last 10 only
        }

    # =========================================================================
    # Kernel-Accessible Prediction Query Interface
    # =========================================================================

    def get_predictions_by_source(self, source_name: str) -> List[PredictionRecord]:
        """
        Return predictions originating from a specific kernel/source.

        Allows kernels to query: "What predictions did I make?" or
        "What predictions did Apollo make?"

        Args:
            source_name: Name of the kernel or system (e.g., "apollo", "athena", "ocean")

        Returns:
            List of PredictionRecord objects from that source, ordered by timestamp (newest first)
        """
        matching = [
            record for record in self.predictions.values()
            if record.source.lower() == source_name.lower()
        ]
        # Sort by timestamp, newest first
        return sorted(matching, key=lambda r: r.timestamp, reverse=True)

    def get_predictions_in_region(
        self,
        basin_coords: np.ndarray,
        radius: float = 0.5
    ) -> List[PredictionRecord]:
        """
        Return predictions whose predicted_basin is within Fisher-Rao distance radius.

        QIG-PURE: Uses canonical Fisher-Rao distance on the information manifold.
        This enables kernels to query predictions in their geometric neighborhood.

        Args:
            basin_coords: 64D basin coordinates to search around
            radius: Fisher-Rao distance threshold (default 0.5)

        Returns:
            List of PredictionRecord objects within the specified radius,
            sorted by distance (closest first)
        """
        # Ensure basin_coords is normalized for Fisher-Rao
        basin_coords = sphere_project(basin_coords)

        results_with_distance = []
        for record in self.predictions.values():
            distance = fisher_coord_distance(basin_coords, record.predicted_basin)
            if distance <= radius:
                results_with_distance.append((distance, record))

        # Sort by distance, closest first
        results_with_distance.sort(key=lambda x: x[0])
        return [record for _, record in results_with_distance]

    def get_recent_predictions(
        self,
        minutes: int = 60,
        with_outcomes: bool = False
    ) -> List[PredictionRecord]:
        """
        Return predictions from the last N minutes.

        Enables kernels to query recent prediction activity and optionally
        filter to only those with recorded outcomes for accuracy analysis.

        Args:
            minutes: Time window in minutes (default 60)
            with_outcomes: If True, only return predictions that have outcomes recorded

        Returns:
            List of PredictionRecord objects from the time window,
            sorted by timestamp (newest first)
        """
        cutoff_time = time.time() - (minutes * 60)

        matching = [
            record for record in self.predictions.values()
            if record.timestamp >= cutoff_time
        ]

        if with_outcomes:
            matching = [r for r in matching if r.was_accurate is not None]

        # Sort by timestamp, newest first
        return sorted(matching, key=lambda r: r.timestamp, reverse=True)

    def get_accuracy_for_source(self, source_name: str) -> Dict[str, Any]:
        """
        Return accuracy statistics for a specific source/kernel.

        Enables kernels to ask: "How accurate are my predictions?" and
        understand their failure patterns for self-improvement.

        Args:
            source_name: Name of the kernel or system

        Returns:
            Dict with:
                - total: Total predictions from this source
                - accurate: Number of accurate predictions
                - accuracy_rate: Proportion accurate (0-1)
                - failure_reasons: Dict mapping reason -> count
                - with_outcomes: Number of predictions that have outcomes
        """
        source_predictions = self.get_predictions_by_source(source_name)

        if not source_predictions:
            return {
                'total': 0,
                'accurate': 0,
                'accuracy_rate': 0.0,
                'failure_reasons': {},
                'with_outcomes': 0,
            }

        # Count predictions with outcomes
        with_outcomes = [p for p in source_predictions if p.was_accurate is not None]
        accurate_count = sum(1 for p in with_outcomes if p.was_accurate)

        # Aggregate failure reasons
        failure_counts: Dict[str, int] = {}
        for pred in source_predictions:
            for reason in pred.failure_reasons:
                reason_str = reason.value
                failure_counts[reason_str] = failure_counts.get(reason_str, 0) + 1

        return {
            'total': len(source_predictions),
            'accurate': accurate_count,
            'accuracy_rate': accurate_count / len(with_outcomes) if with_outcomes else 0.0,
            'failure_reasons': failure_counts,
            'with_outcomes': len(with_outcomes),
        }

    def query_prediction_by_id(self, prediction_id: str) -> Optional[PredictionRecord]:
        """
        Direct lookup of a prediction by its ID.

        Enables kernels to retrieve specific predictions they've made
        or that they've been notified about.

        Args:
            prediction_id: The unique prediction identifier

        Returns:
            PredictionRecord if found, None otherwise
        """
        return self.predictions.get(prediction_id)

    def get_stats(self) -> Dict[str, Any]:
        """Get current prediction statistics including meta-learning state."""
        accuracy = self.accurate_predictions / max(self.total_predictions, 1)

        return {
            'total_predictions': self.total_predictions,
            'accurate_predictions': self.accurate_predictions,
            'accuracy_rate': accuracy,
            'failure_reasons': {r.value: c for r, c in self.failure_reason_counts.items() if c > 0},
            'graph_nodes': len(self.graph.nodes),
            'completed_chains': len(self.completed_chains),
            'current_chain_length': len(self.current_chain.links) if self.current_chain else 0,
            'confidence_adjustments': self.confidence_adjustments,
            'meta_learning': {
                'velocity_smoothing': self._meta_learning_state['velocity_smoothing'],
                'search_radius': self._meta_learning_state['search_radius'],
                'trajectory_length': self._meta_learning_state['trajectory_length'],
                'geodesic_weight': self._meta_learning_state['geodesic_weight'],
                'total_adjustments': self._meta_learning_state['adjustments_made'],
                'last_adjustment': self._meta_learning_state['last_adjustment'],
            },
        }


# Singleton instance
_prediction_improvement_instance: Optional[PredictionSelfImprovement] = None


def get_prediction_improvement() -> PredictionSelfImprovement:
    """Get or create singleton PredictionSelfImprovement instance."""
    global _prediction_improvement_instance
    if _prediction_improvement_instance is None:
        _prediction_improvement_instance = PredictionSelfImprovement()
    return _prediction_improvement_instance
