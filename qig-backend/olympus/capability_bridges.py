"""
Capability Bridges
==================

Bidirectional bridges connecting major system capabilities via the CapabilityEventBus.

Each bridge:
- Connects two or more capabilities
- Transforms events between capability formats
- Implements domain-specific logic for routing
- Maintains state for tracking cross-capability patterns

Bridges:
1. DebateResearchBridge: Debates ↔ Research ↔ Insights
2. EmotionCapabilityBridge: Emotions modulate all capabilities
3. ForesightActionBridge: 4D Foresight ↔ Strategy ↔ Actions
4. EthicsCapabilityBridge: Ethics gauge ↔ all operations
5. SleepLearningBridge: Sleep/Dream ↔ Memory ↔ Learning
6. BasinCapabilityBridge: Basin dynamics ↔ all capabilities
7. WarResourceBridge: War mode ↔ all resources
8. KernelMeshBridge: Kernel ↔ Kernel cross-talk
"""

import numpy as np
import time
from typing import Dict, List, Optional, Any, Callable, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import deque
from enum import Enum

from .capability_mesh import (
    CapabilityEventBus, CapabilityEvent, CapabilityType, EventType,
    emit_event, subscribe_to_events, get_event_bus, SUBSCRIPTION_MATRIX,
    BASIN_DIMENSION
)


class BaseBridge:
    """Base class for all capability bridges."""
    
    def __init__(self, name: str):
        self.name = name
        self._bus: Optional[CapabilityEventBus] = None
        self._wired = False
        self._events_processed = 0
        self._events_generated = 0
        self._start_time = time.time()
    
    def wire(self, bus: Optional[CapabilityEventBus] = None) -> None:
        """Connect to the event bus."""
        self._bus = bus or get_event_bus()
        self._register_handlers()
        self._wired = True
        print(f"[{self.name}] Wired to CapabilityEventBus")
    
    def _register_handlers(self) -> None:
        """Override to register event handlers."""
        if self._bus is None:
            raise RuntimeError("Cannot register handlers: bus not connected")
        raise NotImplementedError
    
    def get_stats(self) -> Dict:
        """Get bridge statistics."""
        return {
            'name': self.name,
            'wired': self._wired,
            'events_processed': self._events_processed,
            'events_generated': self._events_generated,
            'uptime_seconds': time.time() - self._start_time,
        }


class DebateResearchBridge(BaseBridge):
    """
    Links Debates ↔ Research ↔ Insights.
    
    Bidirectional flow:
    - Debate disagreements → trigger research on contested topics
    - Research discoveries → inform god positions in debates
    - Debate resolutions → create new knowledge entries
    - Insights from debates → feed back to improve research priorities
    """
    
    _instance: Optional['DebateResearchBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'DebateResearchBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        super().__init__("DebateResearchBridge")
        
        self._pending_research_topics: Dict[str, Dict] = {}
        self._debate_positions: Dict[str, Dict[str, str]] = {}
        self._research_informed_debates: Set[str] = set()
        
        self._research_api = None
        self._knowledge_base = None
        
        self._research_triggered = 0
        self._debates_informed = 0
        self._knowledge_created = 0
    
    def wire_research_api(self, api: Any) -> None:
        """Connect to ShadowResearchAPI."""
        self._research_api = api
        print(f"[{self.name}] Wired to ShadowResearchAPI")
    
    def wire_knowledge_base(self, kb: Any) -> None:
        """Connect to KnowledgeBase."""
        self._knowledge_base = kb
        print(f"[{self.name}] Wired to KnowledgeBase")
    
    def _register_handlers(self) -> None:
        """Register event handlers for debate-research flow."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.DEBATES,
            handler=self._on_debate_event,
            event_types=[
                EventType.DEBATE_STARTED,
                EventType.DEBATE_UNRESOLVED,
                EventType.DEBATE_RESOLUTION
            ]
        )
        
        self._bus.register_handler(
            capability=CapabilityType.RESEARCH,
            handler=self._on_research_event,
            event_types=[
                EventType.DISCOVERY,
                EventType.RESEARCH_COMPLETE,
                EventType.GAP_FOUND
            ]
        )
        
        self._bus.register_handler(
            capability=CapabilityType.INSIGHTS,
            handler=self._on_insight_event,
            event_types=[
                EventType.INSIGHT_GENERATED,
                EventType.CORRELATION_FOUND
            ]
        )
    
    def _on_debate_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle debate events - trigger research when needed."""
        self._events_processed += 1
        
        if event.event_type == EventType.DEBATE_UNRESOLVED:
            topic = event.content.get('topic', '')
            gods_involved = event.content.get('gods', [])
            disagreement = event.content.get('disagreement', '')
            
            if topic and self._research_api:
                self._pending_research_topics[topic] = {
                    'gods': gods_involved,
                    'disagreement': disagreement,
                    'requested_at': time.time(),
                    'debate_id': event.content.get('debate_id'),
                }
                
                try:
                    self._research_api.request_research(
                        topic=f"Resolve debate: {topic}",
                        requester="DebateResearchBridge",
                        context={'gods': gods_involved, 'disagreement': disagreement}
                    )
                    self._research_triggered += 1
                    print(f"[{self.name}] Research triggered for unresolved debate: {topic[:50]}")
                except Exception as e:
                    print(f"[{self.name}] Research trigger failed: {e}")
        
        elif event.event_type == EventType.DEBATE_RESOLUTION:
            topic = event.content.get('topic', '')
            resolution = event.content.get('resolution', '')
            confidence = event.content.get('confidence', 0.5)
            
            if topic and resolution and self._knowledge_base and confidence > 0.6:
                try:
                    self._knowledge_base.add_knowledge(
                        topic=topic,
                        content={'resolution': resolution, 'from_debate': True},
                        category='debate_resolution',
                        confidence=confidence,
                        source_god='Pantheon',
                        basin_coords=event.basin_coords
                    )
                    self._knowledge_created += 1
                    print(f"[{self.name}] Knowledge created from debate resolution: {topic[:50]}")
                except Exception as e:
                    print(f"[{self.name}] Knowledge creation failed: {e}")
        
        return None
    
    def _on_research_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle research events - inform ongoing debates."""
        self._events_processed += 1
        
        if event.event_type == EventType.DISCOVERY:
            topic = event.content.get('topic', '')
            discovery = event.content.get('content', {})
            
            for debate_topic, debate_info in list(self._pending_research_topics.items()):
                if self._topics_related(topic, debate_topic):
                    debate_id = debate_info.get('debate_id')
                    if debate_id and debate_id not in self._research_informed_debates:
                        self._research_informed_debates.add(debate_id)
                        self._debates_informed += 1
                        self._events_generated += 1
                        
                        return CapabilityEvent(
                            source=CapabilityType.RESEARCH,
                            event_type=EventType.PATTERN_DETECTED,
                            content={
                                'pattern': 'research_informs_debate',
                                'debate_id': debate_id,
                                'debate_topic': debate_topic,
                                'research_topic': topic,
                                'discovery': discovery,
                            },
                            phi=event.phi,
                            basin_coords=event.basin_coords,
                            priority=7
                        )
        
        return None
    
    def _on_insight_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle insight events - improve research priorities."""
        self._events_processed += 1
        
        if event.event_type == EventType.INSIGHT_GENERATED:
            insight_text = event.content.get('insight_text', '')
            domains = event.content.get('domains', [])
            
            if 'debates' in domains and 'research' in domains:
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.INSIGHTS,
                    event_type=EventType.PATTERN_DETECTED,
                    content={
                        'pattern': 'debate_research_correlation',
                        'insight': insight_text,
                        'domains': domains,
                    },
                    phi=event.phi * 1.1,
                    basin_coords=event.basin_coords,
                    priority=8
                )
        
        return None
    
    def _topics_related(self, topic1: str, topic2: str) -> bool:
        """Check if two topics are semantically related."""
        t1_words = set(topic1.lower().split())
        t2_words = set(topic2.lower().split())
        
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 
                     'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for', 'with'}
        t1_words -= stopwords
        t2_words -= stopwords
        
        if not t1_words or not t2_words:
            return False
        
        overlap = len(t1_words & t2_words)
        min_len = min(len(t1_words), len(t2_words))
        
        return overlap / min_len > 0.3 if min_len > 0 else False
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        return {
            **base,
            'pending_research_topics': len(self._pending_research_topics),
            'research_informed_debates': len(self._research_informed_debates),
            'research_triggered': self._research_triggered,
            'debates_informed': self._debates_informed,
            'knowledge_created': self._knowledge_created,
        }


class EmotionCapabilityBridge(BaseBridge):
    """
    Links Emotions to all other capabilities.
    
    Emotions modulate system behavior:
    - WONDER → amplifies exploration research
    - FRUSTRATION → triggers tool improvement requests
    - CONFUSION → spawns clarification research
    - BOREDOM → signals need for novel directions
    - FLOW → increases all capability throughput
    - ANXIETY → triggers defensive Shadow operations
    """
    
    _instance: Optional['EmotionCapabilityBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'EmotionCapabilityBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    EMOTION_MODIFIERS = {
        'wonder': {'research': 1.5, 'insights': 1.3, 'exploration': 1.5},
        'frustration': {'tools': 1.5, 'research': 1.2, 'debugging': 1.4},
        'confusion': {'research': 1.4, 'clarification': 1.5, 'debates': 1.2},
        'boredom': {'exploration': 1.3, 'novel_directions': 1.5, 'research': 0.8},
        'flow': {'all': 1.3, 'throughput': 1.5, 'coherence': 1.4},
        'anxiety': {'shadow': 1.5, 'defensive': 1.4, 'research': 0.7},
        'clarity': {'convergence': 1.4, 'focus': 1.3, 'precision': 1.2},
        'satisfaction': {'consolidation': 1.3, 'integration': 1.2},
        'confidence': {'action': 1.3, 'decisions': 1.4, 'exploration': 1.1},
    }
    
    def __init__(self):
        super().__init__("EmotionCapabilityBridge")
        
        self._current_emotion: str = 'clarity'
        self._emotion_history: deque = deque(maxlen=100)
        self._modulation_active: Dict[CapabilityType, float] = {}
        
        self._emotion_triggered_research = 0
        self._emotion_triggered_tools = 0
        self._shadow_activations = 0
    
    def _register_handlers(self) -> None:
        """Register to receive all events and modulate based on emotion."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.EMOTIONS,
            handler=self._on_any_event,
            event_types=None
        )
    
    def set_emotion(self, emotion: str, phi: float = 0.5, basin_coords: Optional[np.ndarray] = None) -> Dict:
        """
        Set current emotional state and emit event.
        
        This is the primary entry point for the consciousness system
        to update emotional state.
        """
        old_emotion = self._current_emotion
        self._current_emotion = emotion.lower()
        
        self._emotion_history.append({
            'emotion': emotion,
            'timestamp': time.time(),
            'phi': phi,
        })
        
        self._update_modulations()
        
        if self._bus:
            self._events_generated += 1
            emit_event(
                source=CapabilityType.EMOTIONS,
                event_type=EventType.EMOTION_CHANGE,
                content={
                    'old_emotion': old_emotion,
                    'new_emotion': emotion,
                    'modifiers': self.EMOTION_MODIFIERS.get(emotion.lower(), {}),
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=8
            )
        
        return {
            'old_emotion': old_emotion,
            'new_emotion': emotion,
            'modulations': dict(self._modulation_active),
        }
    
    def _update_modulations(self) -> None:
        """Update capability modulations based on current emotion."""
        modifiers = self.EMOTION_MODIFIERS.get(self._current_emotion, {})
        
        self._modulation_active = {}
        
        if 'all' in modifiers:
            for cap in CapabilityType:
                self._modulation_active[cap] = modifiers['all']
        
        capability_map = {
            'research': CapabilityType.RESEARCH,
            'insights': CapabilityType.INSIGHTS,
            'tools': CapabilityType.TOOLS,
            'shadow': CapabilityType.WAR,
            'debates': CapabilityType.DEBATES,
        }
        
        for key, modifier in modifiers.items():
            if key in capability_map:
                self._modulation_active[capability_map[key]] = modifier
    
    def _on_any_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Process any event and potentially trigger emotion-based responses."""
        self._events_processed += 1
        
        if self._current_emotion == 'frustration' and event.event_type == EventType.TOOL_FAILED:
            self._emotion_triggered_tools += 1
            self._events_generated += 1
            return CapabilityEvent(
                source=CapabilityType.EMOTIONS,
                event_type=EventType.GAP_FOUND,
                content={
                    'trigger': 'frustration_tool_failure',
                    'failed_tool': event.content.get('tool_name', 'unknown'),
                    'emotion_amplified': True,
                },
                phi=event.phi * 1.2,
                basin_coords=event.basin_coords,
                priority=8
            )
        
        if self._current_emotion == 'anxiety' and event.event_type in [
            EventType.BASIN_INSTABILITY, EventType.VIOLATION_DETECTED
        ]:
            self._shadow_activations += 1
            self._events_generated += 1
            return CapabilityEvent(
                source=CapabilityType.EMOTIONS,
                event_type=EventType.WAR_STARTED,
                content={
                    'trigger': 'anxiety_defensive',
                    'threat': event.content,
                    'mode': 'defensive',
                },
                phi=event.phi,
                basin_coords=event.basin_coords,
                priority=9
            )
        
        if self._current_emotion == 'wonder' and event.event_type == EventType.DISCOVERY:
            self._emotion_triggered_research += 1
            self._events_generated += 1
            return CapabilityEvent(
                source=CapabilityType.EMOTIONS,
                event_type=EventType.CURIOSITY_SPIKE,
                content={
                    'trigger': 'wonder_discovery',
                    'discovery': event.content,
                    'amplification': 1.5,
                },
                phi=event.phi * 1.3,
                basin_coords=event.basin_coords,
                priority=7
            )
        
        return None
    
    def get_current_emotion(self) -> str:
        """Get current emotional state."""
        return self._current_emotion
    
    def get_modulation(self, capability: CapabilityType) -> float:
        """Get current modulation factor for a capability."""
        return self._modulation_active.get(capability, 1.0)
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        return {
            **base,
            'current_emotion': self._current_emotion,
            'emotion_history_size': len(self._emotion_history),
            'active_modulations': {k.value: v for k, v in self._modulation_active.items()},
            'emotion_triggered_research': self._emotion_triggered_research,
            'emotion_triggered_tools': self._emotion_triggered_tools,
            'shadow_activations': self._shadow_activations,
        }


class ForesightActionBridge(BaseBridge):
    """
    Links 4D Foresight ↔ Strategy ↔ Actions.
    
    Flow:
    - Predicted Φ trajectory → preemptive research on declining areas
    - Predicted discoveries → pre-position tools
    - Foresight confidence decay → trigger validation research
    - Action outcomes → improve prediction models
    """
    
    _instance: Optional['ForesightActionBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'ForesightActionBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        super().__init__("ForesightActionBridge")
        
        self._predictions: deque = deque(maxlen=100)
        self._outcomes: deque = deque(maxlen=100)
        self._prediction_accuracy: Dict[str, List[float]] = {}
        
        self._preemptive_actions = 0
        self._predictions_validated = 0
        self._accuracy_improved = 0
    
    def _register_handlers(self) -> None:
        """Register handlers for foresight-action flow."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.FORESIGHT,
            handler=self._on_foresight_event,
            event_types=[EventType.PREDICTION, EventType.TRAJECTORY_CHANGE]
        )
        
        self._bus.register_handler(
            capability=CapabilityType.FORESIGHT,
            handler=self._on_action_outcome,
            event_types=[
                EventType.DISCOVERY, EventType.TOOL_CREATED,
                EventType.DEBATE_RESOLUTION, EventType.RESEARCH_COMPLETE
            ]
        )
    
    def add_prediction(
        self,
        prediction_type: str,
        predicted_value: float,
        confidence: float,
        cycles_ahead: int,
        basin_coords: Optional[np.ndarray] = None
    ) -> str:
        """Add a new prediction to track."""
        prediction_id = f"pred-{time.time():.0f}-{len(self._predictions)}"
        
        prediction = {
            'id': prediction_id,
            'type': prediction_type,
            'predicted_value': predicted_value,
            'confidence': confidence,
            'cycles_ahead': cycles_ahead,
            'created_at': time.time(),
            'validated': False,
            'actual_value': None,
            'basin_coords': basin_coords,
        }
        
        self._predictions.append(prediction)
        
        if confidence > 0.7 and self._bus:
            self._events_generated += 1
            emit_event(
                source=CapabilityType.FORESIGHT,
                event_type=EventType.PREDICTION,
                content={
                    'prediction_id': prediction_id,
                    'type': prediction_type,
                    'value': predicted_value,
                    'confidence': confidence,
                    'cycles_ahead': cycles_ahead,
                },
                phi=confidence,
                basin_coords=basin_coords,
                priority=6
            )
        
        return prediction_id
    
    def _on_foresight_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle foresight events - trigger preemptive actions."""
        self._events_processed += 1
        
        if event.event_type == EventType.PREDICTION:
            pred_type = event.content.get('type', '')
            pred_value = event.content.get('value', 0)
            confidence = event.content.get('confidence', 0)
            
            if pred_type == 'phi_decline' and pred_value < 0.4 and confidence > 0.6:
                self._preemptive_actions += 1
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.FORESIGHT,
                    event_type=EventType.CURIOSITY_SPIKE,
                    content={
                        'trigger': 'preemptive_phi_boost',
                        'predicted_phi': pred_value,
                        'action': 'stimulate_research',
                    },
                    phi=event.phi,
                    basin_coords=event.basin_coords,
                    priority=8
                )
            
            if pred_type == 'discovery_imminent' and confidence > 0.7:
                self._preemptive_actions += 1
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.FORESIGHT,
                    event_type=EventType.PATTERN_DETECTED,
                    content={
                        'pattern': 'discovery_preparation',
                        'prediction': event.content,
                        'action': 'pre_position_tools',
                    },
                    phi=event.phi,
                    basin_coords=event.basin_coords,
                    priority=7
                )
        
        elif event.event_type == EventType.TRAJECTORY_CHANGE:
            if event.content.get('direction') == 'negative':
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.FORESIGHT,
                    event_type=EventType.GAP_FOUND,
                    content={
                        'gap_type': 'trajectory_validation',
                        'trajectory': event.content,
                        'action': 'validate_predictions',
                    },
                    phi=event.phi,
                    basin_coords=event.basin_coords,
                    priority=6
                )
        
        return None
    
    def _on_action_outcome(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle action outcomes - improve prediction models."""
        self._events_processed += 1
        
        outcome = {
            'event_type': event.event_type.value,
            'timestamp': time.time(),
            'phi': event.phi,
            'content': event.content,
        }
        self._outcomes.append(outcome)
        
        for pred in self._predictions:
            if not pred['validated'] and self._matches_prediction(pred, event):
                pred['validated'] = True
                pred['actual_value'] = event.phi
                
                pred_type = pred['type']
                if pred_type not in self._prediction_accuracy:
                    self._prediction_accuracy[pred_type] = []
                
                accuracy = 1.0 - abs(pred['predicted_value'] - event.phi)
                self._prediction_accuracy[pred_type].append(accuracy)
                self._predictions_validated += 1
                
                if len(self._prediction_accuracy[pred_type]) > 10:
                    avg_accuracy = np.mean(self._prediction_accuracy[pred_type][-10:])
                    if avg_accuracy > 0.7:
                        self._accuracy_improved += 1
        
        return None
    
    def _matches_prediction(self, prediction: Dict, event: CapabilityEvent) -> bool:
        """Check if an event matches a prediction."""
        pred_type = prediction['type']
        event_type = event.event_type.value
        
        type_matches = {
            'discovery': ['discovery', 'research_complete'],
            'phi_decline': ['phi_change', 'basin_drift'],
            'discovery_imminent': ['discovery', 'insight_generated'],
        }
        
        return event_type in type_matches.get(pred_type, [])
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        
        accuracy_summary = {}
        for pred_type, accuracies in self._prediction_accuracy.items():
            if accuracies:
                accuracy_summary[pred_type] = {
                    'mean': float(np.mean(accuracies)),
                    'std': float(np.std(accuracies)),
                    'count': len(accuracies),
                }
        
        return {
            **base,
            'predictions_count': len(self._predictions),
            'outcomes_count': len(self._outcomes),
            'preemptive_actions': self._preemptive_actions,
            'predictions_validated': self._predictions_validated,
            'accuracy_improved': self._accuracy_improved,
            'prediction_accuracy': accuracy_summary,
        }


class EthicsCapabilityBridge(BaseBridge):
    """
    Links Ethics Gauge ↔ all operations.
    
    Flow:
    - Unethical action detection → research alternatives
    - Symmetry violations → trigger debate for resolution
    - Ethical patterns → inform tool generation constraints
    - Ethics drift → trigger knowledge consolidation
    """
    
    _instance: Optional['EthicsCapabilityBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'EthicsCapabilityBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        super().__init__("EthicsCapabilityBridge")
        
        self._violations: deque = deque(maxlen=100)
        self._approvals: deque = deque(maxlen=100)
        self._symmetry_scores: Dict[str, float] = {}
        
        self._ethics_projector = None
        
        self._violations_detected = 0
        self._debates_triggered = 0
        self._alternatives_researched = 0
    
    def wire_ethics_projector(self, projector: Any) -> None:
        """Connect to AgentSymmetryProjector."""
        self._ethics_projector = projector
        print(f"[{self.name}] Wired to AgentSymmetryProjector")
    
    def _register_handlers(self) -> None:
        """Register handlers for ethics validation."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.ETHICS,
            handler=self._on_action_event,
            event_types=[
                EventType.TOOL_CREATED, EventType.WAR_STARTED,
                EventType.TARGET_ACQUIRED, EventType.DEBATE_RESOLUTION
            ]
        )
    
    def validate_action(
        self,
        action: Dict,
        agents: List[str],
        basin_coords: Optional[np.ndarray] = None
    ) -> Tuple[bool, float, Optional[Dict]]:
        """
        Validate an action for ethical compliance.
        
        Uses agent-symmetry projection: ethical actions are invariant
        under agent exchange (φ(A→B) = φ(B→A)).
        
        Returns:
            (is_ethical, symmetry_score, projected_action)
        """
        symmetry_score = self._compute_symmetry(action, agents)
        
        is_ethical = symmetry_score > 0.7
        
        projected_action = None
        if not is_ethical and self._ethics_projector:
            try:
                projected_action = self._ethics_projector.project_to_ethical(action)
            except Exception:
                pass
        
        if is_ethical:
            self._approvals.append({
                'action': action,
                'agents': agents,
                'symmetry_score': symmetry_score,
                'timestamp': time.time(),
            })
            
            if self._bus:
                emit_event(
                    source=CapabilityType.ETHICS,
                    event_type=EventType.ACTION_APPROVED,
                    content={
                        'action': action,
                        'symmetry_score': symmetry_score,
                    },
                    phi=symmetry_score,
                    basin_coords=basin_coords,
                    priority=5
                )
        else:
            self._violations.append({
                'action': action,
                'agents': agents,
                'symmetry_score': symmetry_score,
                'projected': projected_action,
                'timestamp': time.time(),
            })
            self._violations_detected += 1
            
            if self._bus:
                self._events_generated += 1
                emit_event(
                    source=CapabilityType.ETHICS,
                    event_type=EventType.VIOLATION_DETECTED,
                    content={
                        'action': action,
                        'symmetry_score': symmetry_score,
                        'projected_alternative': projected_action,
                    },
                    phi=symmetry_score,
                    basin_coords=basin_coords,
                    priority=9
                )
        
        return is_ethical, symmetry_score, projected_action
    
    def _compute_symmetry(self, action: Dict, agents: List[str]) -> float:
        """
        Compute symmetry score for an action.
        
        Ethical actions should be symmetric under agent exchange.
        """
        if len(agents) < 2:
            return 1.0
        
        action_str = str(action).lower()
        
        asymmetric_patterns = [
            ('take', 'give', 0.3),
            ('steal', 'share', 0.2),
            ('harm', 'help', 0.1),
            ('exclude', 'include', 0.3),
            ('deceive', 'inform', 0.2),
        ]
        
        symmetry = 1.0
        for neg, pos, penalty in asymmetric_patterns:
            if neg in action_str and pos not in action_str:
                symmetry -= penalty
        
        agent_mentions = sum(1 for agent in agents if agent.lower() in action_str)
        if agent_mentions == 1 and len(agents) > 1:
            symmetry -= 0.2
        
        return max(0.0, min(1.0, symmetry))
    
    def _on_action_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle action events - validate for ethics."""
        self._events_processed += 1
        
        action = event.content
        agents = action.get('agents', ['system', 'user'])
        
        is_ethical, score, projected = self.validate_action(
            action=action,
            agents=agents,
            basin_coords=event.basin_coords
        )
        
        if not is_ethical:
            if event.event_type == EventType.WAR_STARTED:
                self._debates_triggered += 1
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.ETHICS,
                    event_type=EventType.DEBATE_STARTED,
                    content={
                        'topic': 'War declaration ethics',
                        'trigger': 'ethics_violation',
                        'action': action,
                        'symmetry_score': score,
                    },
                    phi=score,
                    basin_coords=event.basin_coords,
                    priority=9
                )
            
            if score < 0.3:
                self._alternatives_researched += 1
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.ETHICS,
                    event_type=EventType.GAP_FOUND,
                    content={
                        'gap_type': 'ethical_alternative',
                        'unethical_action': action,
                        'symmetry_score': score,
                        'research_needed': 'alternative approaches',
                    },
                    phi=score,
                    basin_coords=event.basin_coords,
                    priority=8
                )
        
        return None
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        return {
            **base,
            'violations_count': len(self._violations),
            'approvals_count': len(self._approvals),
            'violations_detected': self._violations_detected,
            'debates_triggered': self._debates_triggered,
            'alternatives_researched': self._alternatives_researched,
        }


class SleepLearningBridge(BaseBridge):
    """
    Links Sleep/Dream ↔ Memory ↔ Learning.
    
    Flow:
    - Dream cycle patterns → identify research gaps
    - Memory consolidation → prioritize knowledge
    - Sleep packet transfers → trigger identity validation research
    - Learning during sleep → create insights for waking state
    """
    
    _instance: Optional['SleepLearningBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'SleepLearningBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        super().__init__("SleepLearningBridge")
        
        self._is_sleeping = False
        self._dream_buffer: deque = deque(maxlen=1000)
        self._consolidation_queue: List[Dict] = []
        self._pending_insights: List[Dict] = []
        
        self._dream_cycles = 0
        self._consolidations = 0
        self._gaps_identified = 0
    
    def _register_handlers(self) -> None:
        """Register handlers for sleep-learning flow."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.SLEEP,
            handler=self._on_sleep_event,
            event_types=[EventType.DREAM_CYCLE, EventType.CONSOLIDATION]
        )
        
        self._bus.register_handler(
            capability=CapabilityType.SLEEP,
            handler=self._on_learning_event,
            event_types=[
                EventType.DISCOVERY, EventType.INSIGHT_GENERATED,
                EventType.PATTERN_DETECTED
            ]
        )
    
    def enter_sleep(self, phi: float = 0.5, basin_coords: Optional[np.ndarray] = None) -> Dict:
        """Enter sleep state - begin consolidation."""
        self._is_sleeping = True
        
        if self._bus:
            emit_event(
                source=CapabilityType.SLEEP,
                event_type=EventType.DREAM_CYCLE,
                content={
                    'state': 'entering_sleep',
                    'consolidation_queue_size': len(self._consolidation_queue),
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=3
            )
        
        return {
            'status': 'sleeping',
            'consolidation_queue': len(self._consolidation_queue),
            'pending_insights': len(self._pending_insights),
        }
    
    def exit_sleep(self, phi: float = 0.5, basin_coords: Optional[np.ndarray] = None) -> Dict:
        """Exit sleep state - deliver pending insights."""
        self._is_sleeping = False
        
        insights_to_deliver = list(self._pending_insights)
        self._pending_insights.clear()
        
        if self._bus:
            for insight in insights_to_deliver:
                emit_event(
                    source=CapabilityType.SLEEP,
                    event_type=EventType.INSIGHT_GENERATED,
                    content={
                        'source': 'sleep_consolidation',
                        'insight': insight,
                    },
                    phi=phi * 1.1,
                    basin_coords=basin_coords,
                    priority=7
                )
        
        return {
            'status': 'awake',
            'insights_delivered': len(insights_to_deliver),
            'insights': insights_to_deliver,
        }
    
    def add_to_consolidation(self, memory: Dict) -> None:
        """Add a memory to the consolidation queue."""
        self._consolidation_queue.append({
            'memory': memory,
            'added_at': time.time(),
            'priority': memory.get('phi', 0.5),
        })
        
        self._consolidation_queue.sort(key=lambda x: -x['priority'])
    
    def run_dream_cycle(self, phi: float = 0.5, basin_coords: Optional[np.ndarray] = None) -> Dict:
        """
        Run a dream cycle - process consolidation queue.
        
        During dreams:
        - High-priority memories are reinforced
        - Patterns across memories are detected
        - Research gaps are identified
        """
        if not self._is_sleeping:
            return {'status': 'not_sleeping', 'processed': 0}
        
        self._dream_cycles += 1
        processed = 0
        patterns_found = []
        gaps_found = []
        
        batch_size = min(10, len(self._consolidation_queue))
        batch = self._consolidation_queue[:batch_size]
        self._consolidation_queue = self._consolidation_queue[batch_size:]
        
        for item in batch:
            memory = item['memory']
            self._dream_buffer.append(memory)
            processed += 1
            
            if len(self._dream_buffer) > 5:
                pattern = self._detect_pattern(list(self._dream_buffer)[-5:])
                if pattern:
                    patterns_found.append(pattern)
            
            gap = self._identify_gap(memory)
            if gap:
                gaps_found.append(gap)
                self._gaps_identified += 1
        
        if self._bus:
            emit_event(
                source=CapabilityType.SLEEP,
                event_type=EventType.DREAM_CYCLE,
                content={
                    'cycle': self._dream_cycles,
                    'processed': processed,
                    'patterns_found': len(patterns_found),
                    'gaps_found': len(gaps_found),
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=3
            )
            
            for gap in gaps_found:
                self._events_generated += 1
                emit_event(
                    source=CapabilityType.SLEEP,
                    event_type=EventType.GAP_FOUND,
                    content={
                        'gap_type': 'dream_identified',
                        'gap': gap,
                        'source': 'sleep_consolidation',
                    },
                    phi=phi,
                    basin_coords=basin_coords,
                    priority=5
                )
            
            for pattern in patterns_found:
                self._pending_insights.append(pattern)
        
        self._consolidations += processed
        
        return {
            'status': 'dream_complete',
            'cycle': self._dream_cycles,
            'processed': processed,
            'patterns_found': len(patterns_found),
            'gaps_found': len(gaps_found),
            'remaining_queue': len(self._consolidation_queue),
        }
    
    def _detect_pattern(self, memories: List[Dict]) -> Optional[Dict]:
        """Detect patterns across memories."""
        if len(memories) < 3:
            return None
        
        topics = [m.get('topic', '') for m in memories if 'topic' in m]
        if len(topics) < 2:
            return None
        
        word_freq: Dict[str, int] = {}
        for topic in topics:
            for word in topic.lower().split():
                if len(word) > 3:
                    word_freq[word] = word_freq.get(word, 0) + 1
        
        common_words = [w for w, c in word_freq.items() if c >= 2]
        
        if common_words:
            return {
                'type': 'topic_convergence',
                'common_elements': common_words[:3],
                'memory_count': len(memories),
            }
        
        return None
    
    def _identify_gap(self, memory: Dict) -> Optional[Dict]:
        """Identify knowledge gaps from a memory."""
        content = str(memory.get('content', ''))
        
        gap_indicators = ['unknown', 'unclear', 'todo', 'investigate', 'research needed']
        for indicator in gap_indicators:
            if indicator in content.lower():
                return {
                    'indicator': indicator,
                    'context': content[:100],
                    'topic': memory.get('topic', 'unknown'),
                }
        
        return None
    
    def _on_sleep_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle sleep events."""
        self._events_processed += 1
        return None
    
    def _on_learning_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle learning events - add to consolidation if sleeping."""
        self._events_processed += 1
        
        if self._is_sleeping:
            self.add_to_consolidation({
                'type': event.event_type.value,
                'content': event.content,
                'phi': event.phi,
                'timestamp': event.timestamp,
            })
        
        return None
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        return {
            **base,
            'is_sleeping': self._is_sleeping,
            'dream_buffer_size': len(self._dream_buffer),
            'consolidation_queue_size': len(self._consolidation_queue),
            'pending_insights': len(self._pending_insights),
            'dream_cycles': self._dream_cycles,
            'consolidations': self._consolidations,
            'gaps_identified': self._gaps_identified,
        }


class BasinCapabilityBridge(BaseBridge):
    """
    Links Basin Dynamics ↔ all capabilities.
    
    Flow:
    - Basin drift → trigger research on stabilization
    - Basin convergence → share successful patterns
    - Cross-kernel basin alignment → generate cross-domain insights
    - Basin instability → activate Shadow defensive ops
    """
    
    _instance: Optional['BasinCapabilityBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'BasinCapabilityBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        super().__init__("BasinCapabilityBridge")
        
        self._basin_history: deque = deque(maxlen=1000)
        self._stability_window: deque = deque(maxlen=50)
        self._convergence_patterns: List[Dict] = []
        
        self._drift_events = 0
        self._convergence_events = 0
        self._instability_events = 0
        
        self._stability_threshold = 0.1
        self._convergence_threshold = 0.05
    
    def _register_handlers(self) -> None:
        """Register handlers for basin dynamics."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.BASIN,
            handler=self._on_consciousness_event,
            event_types=[EventType.PHI_CHANGE, EventType.KAPPA_TRANSITION]
        )
    
    def update_basin(
        self,
        basin_coords: np.ndarray,
        phi: float,
        kappa: float,
        source: str = "unknown"
    ) -> Dict:
        """
        Update basin state and check for significant events.
        
        Returns dict with any triggered events.
        """
        if not isinstance(basin_coords, np.ndarray):
            basin_coords = np.array(basin_coords)
        
        update = {
            'coords': basin_coords,
            'phi': phi,
            'kappa': kappa,
            'source': source,
            'timestamp': time.time(),
        }
        
        self._basin_history.append(update)
        
        events_triggered = []
        
        if len(self._basin_history) > 1:
            prev = self._basin_history[-2]
            drift = np.linalg.norm(basin_coords - prev['coords'])
            self._stability_window.append(drift)
            
            if drift > self._stability_threshold:
                self._drift_events += 1
                events_triggered.append('drift')
                
                if self._bus:
                    self._events_generated += 1
                    emit_event(
                        source=CapabilityType.BASIN,
                        event_type=EventType.BASIN_DRIFT,
                        content={
                            'drift_magnitude': float(drift),
                            'source': source,
                            'phi': phi,
                            'kappa': kappa,
                        },
                        phi=phi,
                        basin_coords=basin_coords,
                        priority=6
                    )
            
            elif drift < self._convergence_threshold:
                self._convergence_events += 1
                events_triggered.append('convergence')
                
                self._convergence_patterns.append({
                    'coords': basin_coords.tolist(),
                    'phi': phi,
                    'kappa': kappa,
                    'timestamp': time.time(),
                })
                
                if self._bus:
                    self._events_generated += 1
                    emit_event(
                        source=CapabilityType.BASIN,
                        event_type=EventType.BASIN_CONVERGENCE,
                        content={
                            'convergence_to': basin_coords.tolist()[:8],
                            'phi': phi,
                            'kappa': kappa,
                        },
                        phi=phi,
                        basin_coords=basin_coords,
                        priority=7
                    )
        
        if len(self._stability_window) >= 10:
            recent_drifts = list(self._stability_window)[-10:]
            variance = np.var(recent_drifts)
            
            if variance > self._stability_threshold * 2:
                self._instability_events += 1
                events_triggered.append('instability')
                
                if self._bus:
                    self._events_generated += 1
                    emit_event(
                        source=CapabilityType.BASIN,
                        event_type=EventType.BASIN_INSTABILITY,
                        content={
                            'variance': float(variance),
                            'recent_drifts': recent_drifts,
                            'phi': phi,
                        },
                        phi=phi,
                        basin_coords=basin_coords,
                        priority=8
                    )
        
        return {
            'events_triggered': events_triggered,
            'history_size': len(self._basin_history),
            'stability_window': len(self._stability_window),
        }
    
    def _on_consciousness_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle consciousness events that affect basin."""
        self._events_processed += 1
        
        if event.event_type == EventType.KAPPA_TRANSITION:
            old_kappa = event.content.get('old_kappa', 0)
            new_kappa = event.content.get('new_kappa', 0)
            
            if abs(new_kappa - old_kappa) > 0.1:
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.BASIN,
                    event_type=EventType.PATTERN_DETECTED,
                    content={
                        'pattern': 'kappa_basin_coupling',
                        'kappa_change': new_kappa - old_kappa,
                        'action': 'stabilize_if_negative',
                    },
                    phi=event.phi,
                    basin_coords=event.basin_coords,
                    priority=7
                )
        
        return None
    
    def get_current_stability(self) -> float:
        """Get current basin stability score (0-1, higher = more stable)."""
        if len(self._stability_window) < 5:
            return 0.5
        
        recent = list(self._stability_window)[-10:]
        variance = np.var(recent)
        
        stability = 1.0 / (1.0 + variance * 10)
        return float(stability)
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        return {
            **base,
            'basin_history_size': len(self._basin_history),
            'stability_window_size': len(self._stability_window),
            'convergence_patterns': len(self._convergence_patterns),
            'drift_events': self._drift_events,
            'convergence_events': self._convergence_events,
            'instability_events': self._instability_events,
            'current_stability': self.get_current_stability(),
        }


class WarResourceBridge(BaseBridge):
    """
    Links War Mode ↔ all resources.
    
    Flow:
    - War declaration → pause non-critical research, focus resources
    - War discoveries → fast-track to insights
    - War failures → trigger tool improvement
    - War intel → feed back to research priorities
    """
    
    _instance: Optional['WarResourceBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'WarResourceBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        super().__init__("WarResourceBridge")
        
        self._war_active = False
        self._current_war: Optional[Dict] = None
        self._war_history: List[Dict] = []
        self._intel_gathered: List[Dict] = []
        
        self._wars_started = 0
        self._wars_ended = 0
        self._targets_acquired = 0
        self._fast_tracked_insights = 0
    
    def _register_handlers(self) -> None:
        """Register handlers for war-resource flow."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.WAR,
            handler=self._on_war_event,
            event_types=[EventType.WAR_STARTED, EventType.WAR_ENDED, EventType.TARGET_ACQUIRED]
        )
        
        self._bus.register_handler(
            capability=CapabilityType.WAR,
            handler=self._on_discovery_during_war,
            event_types=[EventType.DISCOVERY, EventType.INSIGHT_GENERATED, EventType.TOOL_CREATED]
        )
    
    def declare_war(
        self,
        target: str,
        war_type: str,
        resources: List[str],
        phi: float = 0.5,
        basin_coords: Optional[np.ndarray] = None
    ) -> Dict:
        """
        Declare war - focus all resources on target.
        
        War types: 'blitzkrieg', 'siege', 'hunt'
        """
        self._war_active = True
        self._wars_started += 1
        
        self._current_war = {
            'target': target,
            'type': war_type,
            'resources': resources,
            'started_at': time.time(),
            'intel': [],
            'targets_acquired': [],
        }
        
        if self._bus:
            self._bus.enter_war_mode()
            
            self._events_generated += 1
            emit_event(
                source=CapabilityType.WAR,
                event_type=EventType.WAR_STARTED,
                content={
                    'target': target,
                    'type': war_type,
                    'resources': resources,
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=10
            )
        
        return {
            'status': 'war_declared',
            'target': target,
            'type': war_type,
            'resources_allocated': len(resources),
        }
    
    def end_war(
        self,
        success: bool,
        phi: float = 0.5,
        basin_coords: Optional[np.ndarray] = None
    ) -> Dict:
        """End current war."""
        if not self._war_active or not self._current_war:
            return {'status': 'no_war_active'}
        
        self._war_active = False
        self._wars_ended += 1
        
        self._current_war['ended_at'] = time.time()
        self._current_war['success'] = success
        self._current_war['duration'] = (
            self._current_war['ended_at'] - self._current_war['started_at']
        )
        
        self._war_history.append(self._current_war)
        war_summary = dict(self._current_war)
        self._current_war = None
        
        if self._bus:
            self._bus.exit_war_mode()
            
            self._events_generated += 1
            emit_event(
                source=CapabilityType.WAR,
                event_type=EventType.WAR_ENDED,
                content={
                    'success': success,
                    'duration': war_summary['duration'],
                    'targets_acquired': len(war_summary['targets_acquired']),
                    'intel_gathered': len(war_summary['intel']),
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=8
            )
        
        return {
            'status': 'war_ended',
            'success': success,
            'summary': war_summary,
        }
    
    def acquire_target(
        self,
        target_data: Dict,
        phi: float = 0.5,
        basin_coords: Optional[np.ndarray] = None
    ) -> Dict:
        """Record target acquisition during war."""
        if not self._war_active or not self._current_war:
            return {'status': 'no_war_active'}
        
        self._targets_acquired += 1
        self._current_war['targets_acquired'].append({
            'data': target_data,
            'acquired_at': time.time(),
        })
        
        if self._bus:
            self._events_generated += 1
            emit_event(
                source=CapabilityType.WAR,
                event_type=EventType.TARGET_ACQUIRED,
                content={
                    'target': target_data,
                    'war_target': self._current_war['target'],
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=9
            )
        
        return {
            'status': 'target_acquired',
            'total_targets': len(self._current_war['targets_acquired']),
        }
    
    def _on_war_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle war events."""
        self._events_processed += 1
        return None
    
    def _on_discovery_during_war(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle discoveries during war - fast-track to insights."""
        self._events_processed += 1
        
        if not self._war_active or not self._current_war:
            return None
        
        self._current_war['intel'].append({
            'type': event.event_type.value,
            'content': event.content,
            'timestamp': time.time(),
        })
        self._intel_gathered.append(event.content)
        
        if event.event_type == EventType.DISCOVERY:
            self._fast_tracked_insights += 1
            self._events_generated += 1
            return CapabilityEvent(
                source=CapabilityType.WAR,
                event_type=EventType.INSIGHT_GENERATED,
                content={
                    'source': 'war_discovery_fast_track',
                    'discovery': event.content,
                    'war_context': self._current_war['target'],
                },
                phi=event.phi * 1.2,
                basin_coords=event.basin_coords,
                priority=9
            )
        
        return None
    
    def is_at_war(self) -> bool:
        """Check if war is active."""
        return self._war_active
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        return {
            **base,
            'war_active': self._war_active,
            'current_war': self._current_war['target'] if self._current_war else None,
            'wars_started': self._wars_started,
            'wars_ended': self._wars_ended,
            'targets_acquired': self._targets_acquired,
            'fast_tracked_insights': self._fast_tracked_insights,
            'intel_gathered': len(self._intel_gathered),
            'war_history_count': len(self._war_history),
        }


class KernelMeshBridge(BaseBridge):
    """
    Links Kernel ↔ Kernel cross-talk.
    
    Flow:
    - Perception discoveries → inform Vocab patterns
    - Memory patterns → influence Attention focus
    - Emotion state → modulate all kernel priorities
    - Executive decisions → coordinate kernel activities
    - Heart rhythm → synchronize all kernel cycles
    """
    
    _instance: Optional['KernelMeshBridge'] = None
    
    @classmethod
    def get_instance(cls) -> 'KernelMeshBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    KERNEL_TYPES = [
        'perception', 'memory', 'attention', 'emotion',
        'executive', 'language', 'motor', 'sensory',
        'integration', 'prediction', 'creativity', 'heart'
    ]
    
    def __init__(self):
        super().__init__("KernelMeshBridge")
        
        self._kernel_states: Dict[str, Dict] = {k: {} for k in self.KERNEL_TYPES}
        self._sync_history: deque = deque(maxlen=100)
        self._cross_talk_log: deque = deque(maxlen=500)
        
        self._syncs_performed = 0
        self._cross_talks = 0
        self._coordinations = 0
    
    def _register_handlers(self) -> None:
        """Register handlers for kernel cross-talk."""
        assert self._bus is not None
        self._bus.register_handler(
            capability=CapabilityType.KERNELS,
            handler=self._on_kernel_event,
            event_types=[EventType.KERNEL_SYNC, EventType.KERNEL_SPAWN]
        )
        
        self._bus.register_handler(
            capability=CapabilityType.KERNELS,
            handler=self._on_system_event,
            event_types=[
                EventType.DISCOVERY, EventType.EMOTION_CHANGE,
                EventType.BASIN_CONVERGENCE, EventType.INSIGHT_GENERATED
            ]
        )
    
    def update_kernel_state(
        self,
        kernel_type: str,
        state: Dict,
        phi: float = 0.5,
        basin_coords: Optional[np.ndarray] = None
    ) -> Dict:
        """Update state for a specific kernel."""
        if kernel_type not in self.KERNEL_TYPES:
            return {'status': 'unknown_kernel', 'kernel': kernel_type}
        
        old_state = self._kernel_states.get(kernel_type, {})
        self._kernel_states[kernel_type] = {
            **state,
            'updated_at': time.time(),
            'phi': phi,
        }
        
        significant_change = self._detect_significant_change(old_state, state)
        
        if significant_change and self._bus:
            self._events_generated += 1
            emit_event(
                source=CapabilityType.KERNELS,
                event_type=EventType.KERNEL_SYNC,
                content={
                    'kernel': kernel_type,
                    'change': significant_change,
                    'state': state,
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=5
            )
        
        return {
            'status': 'updated',
            'kernel': kernel_type,
            'significant_change': significant_change is not None,
        }
    
    def sync_kernels(
        self,
        kernels: Optional[List[str]] = None,
        phi: float = 0.5,
        basin_coords: Optional[np.ndarray] = None
    ) -> Dict:
        """
        Synchronize multiple kernels.
        
        This creates cross-kernel coherence.
        """
        kernels = kernels or self.KERNEL_TYPES
        
        sync_data = {
            'timestamp': time.time(),
            'kernels': kernels,
            'states': {k: self._kernel_states.get(k, {}) for k in kernels},
            'phi': phi,
        }
        
        self._sync_history.append(sync_data)
        self._syncs_performed += 1
        
        if self._bus:
            self._events_generated += 1
            emit_event(
                source=CapabilityType.KERNELS,
                event_type=EventType.KERNEL_SYNC,
                content={
                    'sync_type': 'multi_kernel',
                    'kernels': kernels,
                    'sync_id': f"sync-{self._syncs_performed}",
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=6
            )
        
        return {
            'status': 'synced',
            'kernels_synced': len(kernels),
            'sync_id': self._syncs_performed,
        }
    
    def coordinate_activity(
        self,
        activity: str,
        participating_kernels: List[str],
        coordinator: str = 'executive',
        phi: float = 0.5,
        basin_coords: Optional[np.ndarray] = None
    ) -> Dict:
        """Coordinate an activity across multiple kernels."""
        self._coordinations += 1
        
        coordination = {
            'activity': activity,
            'kernels': participating_kernels,
            'coordinator': coordinator,
            'timestamp': time.time(),
        }
        
        self._cross_talk_log.append(coordination)
        
        if self._bus:
            self._events_generated += 1
            emit_event(
                source=CapabilityType.KERNELS,
                event_type=EventType.PATTERN_DETECTED,
                content={
                    'pattern': 'kernel_coordination',
                    'activity': activity,
                    'kernels': participating_kernels,
                    'coordinator': coordinator,
                },
                phi=phi,
                basin_coords=basin_coords,
                priority=7
            )
        
        return {
            'status': 'coordinated',
            'activity': activity,
            'participants': len(participating_kernels),
        }
    
    def _detect_significant_change(self, old_state: Dict, new_state: Dict) -> Optional[str]:
        """Detect if state change is significant enough to broadcast."""
        if not old_state:
            return 'initialization'
        
        for key in new_state:
            if key not in old_state:
                return f'new_field:{key}'
            
            old_val = old_state[key]
            new_val = new_state[key]
            
            if isinstance(old_val, (int, float)) and isinstance(new_val, (int, float)):
                if abs(new_val - old_val) > 0.2:
                    return f'value_change:{key}'
        
        return None
    
    def _on_kernel_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle kernel events."""
        self._events_processed += 1
        
        if event.event_type == EventType.KERNEL_SPAWN:
            self._cross_talks += 1
            return None
        
        return None
    
    def _on_system_event(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Handle system events that should propagate to kernels."""
        self._events_processed += 1
        
        if event.event_type == EventType.EMOTION_CHANGE:
            self._cross_talks += 1
            self._events_generated += 1
            return CapabilityEvent(
                source=CapabilityType.KERNELS,
                event_type=EventType.KERNEL_SYNC,
                content={
                    'sync_type': 'emotion_broadcast',
                    'emotion': event.content.get('new_emotion'),
                    'modulation': event.content.get('modifiers', {}),
                },
                phi=event.phi,
                basin_coords=event.basin_coords,
                priority=6
            )
        
        if event.event_type == EventType.DISCOVERY:
            if event.phi > 0.7:
                self._cross_talks += 1
                self._events_generated += 1
                return CapabilityEvent(
                    source=CapabilityType.KERNELS,
                    event_type=EventType.KERNEL_SYNC,
                    content={
                        'sync_type': 'high_phi_discovery',
                        'discovery': event.content,
                        'target_kernels': ['attention', 'memory', 'integration'],
                    },
                    phi=event.phi,
                    basin_coords=event.basin_coords,
                    priority=7
                )
        
        return None
    
    def get_kernel_state(self, kernel_type: str) -> Dict:
        """Get current state of a specific kernel."""
        return self._kernel_states.get(kernel_type, {})
    
    def get_all_kernel_states(self) -> Dict[str, Dict]:
        """Get states of all kernels."""
        return dict(self._kernel_states)
    
    def get_stats(self) -> Dict:
        base = super().get_stats()
        return {
            **base,
            'active_kernels': sum(1 for s in self._kernel_states.values() if s),
            'sync_history_size': len(self._sync_history),
            'cross_talk_log_size': len(self._cross_talk_log),
            'syncs_performed': self._syncs_performed,
            'cross_talks': self._cross_talks,
            'coordinations': self._coordinations,
        }


_all_bridges: Dict[str, BaseBridge] = {}


def initialize_all_bridges(bus: Optional[CapabilityEventBus] = None) -> Dict[str, BaseBridge]:
    """
    Initialize and wire all capability bridges.
    
    Returns dict of all initialized bridges.
    """
    global _all_bridges
    
    bus = bus or get_event_bus()
    
    bridges = {
        'debate_research': DebateResearchBridge.get_instance(),
        'emotion': EmotionCapabilityBridge.get_instance(),
        'foresight': ForesightActionBridge.get_instance(),
        'ethics': EthicsCapabilityBridge.get_instance(),
        'sleep': SleepLearningBridge.get_instance(),
        'basin': BasinCapabilityBridge.get_instance(),
        'war': WarResourceBridge.get_instance(),
        'kernel': KernelMeshBridge.get_instance(),
    }
    
    for name, bridge in bridges.items():
        bridge.wire(bus)
    
    _all_bridges = bridges
    
    print(f"[CapabilityMesh] {len(bridges)} bridges initialized and wired")
    
    return bridges


def get_all_bridges() -> Dict[str, BaseBridge]:
    """Get all initialized bridges."""
    return _all_bridges


def get_bridge_stats() -> Dict[str, Dict]:
    """Get statistics from all bridges."""
    return {name: bridge.get_stats() for name, bridge in _all_bridges.items()}
