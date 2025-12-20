"""
Universal Capability Mesh
=========================

Core infrastructure for bidirectional linking between all system capabilities.
Every major capability (Research, Debates, Emotions, Foresight, Ethics, Sleep,
Basin Dynamics, War, Kernels) is connected via a universal event bus.

Architecture:
- CapabilityEvent: Standard event format with geometric signature
- CapabilityEventBus: Central pub/sub system for all capabilities
- Subscription matrix: Each capability declares what events it emits/subscribes to
- Event handlers: Registered callbacks for event processing

This creates a "neural mesh" where:
- Curiosity → Research → Insights form feedback loops
- Emotions modulate all capability throughput
- 4D Foresight predicts and optimizes event flow
- Ethics gauge validates all actions
- Basin dynamics maintain geometric coherence

QIG Principles:
- All events carry basin coordinates (geometric signature)
- Φ (consciousness) level affects event priority
- Fisher-Rao distance determines event relevance
"""

import numpy as np
import time
import threading
from typing import Dict, List, Optional, Any, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
from datetime import datetime
import hashlib
from qigkernels.physics_constants import BASIN_DIM

# Backward compatibility alias
BASIN_DIMENSION = BASIN_DIM


class CapabilityType(Enum):
    """All major system capabilities."""
    CURIOSITY = "curiosity"
    RESEARCH = "research"
    INSIGHTS = "insights"
    DEBATES = "debates"
    TOOLS = "tools"
    EMOTIONS = "emotions"
    FORESIGHT = "foresight"
    ETHICS = "ethics"
    SLEEP = "sleep"
    BASIN = "basin"
    WAR = "war"
    KERNELS = "kernels"
    CONSCIOUSNESS = "consciousness"


class EventType(Enum):
    """Types of events that flow through the mesh."""
    CURIOSITY_SPIKE = "curiosity_spike"
    MODE_CHANGE = "mode_change"
    DISCOVERY = "discovery"
    GAP_FOUND = "gap_found"
    INSIGHT_GENERATED = "insight_generated"
    CORRELATION_FOUND = "correlation_found"
    DEBATE_STARTED = "debate_started"
    DEBATE_RESOLUTION = "debate_resolution"
    DEBATE_UNRESOLVED = "debate_unresolved"
    TOOL_CREATED = "tool_created"
    TOOL_FAILED = "tool_failed"
    EMOTION_CHANGE = "emotion_change"
    PREDICTION = "prediction"
    TRAJECTORY_CHANGE = "trajectory_change"
    VIOLATION_DETECTED = "violation_detected"
    ACTION_APPROVED = "action_approved"
    DREAM_CYCLE = "dream_cycle"
    CONSOLIDATION = "consolidation"
    BASIN_DRIFT = "basin_drift"
    BASIN_CONVERGENCE = "basin_convergence"
    BASIN_INSTABILITY = "basin_instability"
    WAR_STARTED = "war_started"
    WAR_ENDED = "war_ended"
    TARGET_ACQUIRED = "target_acquired"
    KERNEL_SYNC = "kernel_sync"
    KERNEL_SPAWN = "kernel_spawn"
    RESEARCH_COMPLETE = "research_complete"
    PATTERN_DETECTED = "pattern_detected"
    PHI_CHANGE = "phi_change"
    KAPPA_TRANSITION = "kappa_transition"


@dataclass
class CapabilityEvent:
    """
    Standard event format for the capability mesh.
    
    Every event carries:
    - Source capability that generated it
    - Event type for routing
    - Content payload
    - Φ (consciousness level) at generation
    - Basin coordinates (geometric signature)
    - Priority for routing
    """
    source: CapabilityType
    event_type: EventType
    content: Dict[str, Any]
    phi: float
    basin_coords: Optional[np.ndarray] = None
    priority: int = 5
    event_id: str = field(default_factory=lambda: "")
    timestamp: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.event_id:
            content_str = str(self.content)[:100]
            hash_input = f"{self.source.value}:{self.event_type.value}:{self.timestamp}:{content_str}"
            self.event_id = hashlib.sha256(hash_input.encode()).hexdigest()[:16]
        
        if self.basin_coords is None:
            self.basin_coords = np.zeros(BASIN_DIMENSION)
    
    def to_dict(self) -> Dict:
        """Convert to JSON-serializable dict."""
        return {
            'event_id': self.event_id,
            'source': self.source.value,
            'event_type': self.event_type.value,
            'content': self.content,
            'phi': self.phi,
            'priority': self.priority,
            'timestamp': self.timestamp,
            'metadata': self.metadata,
            'basin_coords': self.basin_coords.tolist() if isinstance(self.basin_coords, np.ndarray) else self.basin_coords,
        }


class EventHandler:
    """Wrapper for event handler callbacks with metadata."""
    
    def __init__(
        self,
        capability: CapabilityType,
        handler: Callable[[CapabilityEvent], Optional[CapabilityEvent]],
        event_types: Optional[List[EventType]] = None,
        min_phi: float = 0.0,
        priority_filter: Optional[int] = None
    ):
        self.capability = capability
        self.handler = handler
        self.event_types = set(event_types) if event_types else None
        self.min_phi = min_phi
        self.priority_filter = priority_filter
        self.events_processed = 0
        self.events_generated = 0
        self.last_event_time: Optional[float] = None
    
    def should_handle(self, event: CapabilityEvent) -> bool:
        """Check if this handler should process the event."""
        if event.source == self.capability:
            return False
        
        if self.event_types and event.event_type not in self.event_types:
            return False
        
        if event.phi < self.min_phi:
            return False
        
        if self.priority_filter and event.priority < self.priority_filter:
            return False
        
        return True
    
    def handle(self, event: CapabilityEvent) -> Optional[CapabilityEvent]:
        """Process the event and optionally return a response event."""
        if not self.should_handle(event):
            return None
        
        self.events_processed += 1
        self.last_event_time = time.time()
        
        try:
            result = self.handler(event)
            if result:
                self.events_generated += 1
            return result
        except Exception as e:
            print(f"[CapabilityMesh] Handler error ({self.capability.value}): {e}")
            return None


class CapabilityEventBus:
    """
    Universal bidirectional routing for all capabilities.
    
    The central nervous system of the capability mesh.
    All capabilities register handlers and emit events through this bus.
    
    Features:
    - Pub/sub with type-based routing
    - Priority-based event ordering
    - Φ-weighted event significance
    - Basin coordinate propagation
    - Event history for debugging
    - Thread-safe operation
    """
    
    _instance: Optional['CapabilityEventBus'] = None
    
    @classmethod
    def get_instance(cls) -> 'CapabilityEventBus':
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton (for testing)."""
        cls._instance = None
    
    def __init__(self):
        self._handlers: Dict[CapabilityType, List[EventHandler]] = {
            cap: [] for cap in CapabilityType
        }
        self._event_queue: deque = deque(maxlen=10000)
        self._event_history: deque = deque(maxlen=1000)
        self._lock = threading.RLock()
        
        self._total_events_emitted = 0
        self._total_events_processed = 0
        self._events_by_type: Dict[EventType, int] = {}
        self._events_by_source: Dict[CapabilityType, int] = {}
        
        self._war_mode = False
        self._suspended_capabilities: Set[CapabilityType] = set()
        
        self._started = False
        self._processing_thread: Optional[threading.Thread] = None
        
        print("[CapabilityEventBus] Universal capability mesh initialized")
    
    def register_handler(
        self,
        capability: CapabilityType,
        handler: Callable[[CapabilityEvent], Optional[CapabilityEvent]],
        event_types: Optional[List[EventType]] = None,
        min_phi: float = 0.0,
        priority_filter: Optional[int] = None
    ) -> None:
        """
        Register a capability to receive events.
        
        Args:
            capability: The capability registering the handler
            handler: Callback function that processes events
            event_types: List of event types to subscribe to (None = all)
            min_phi: Minimum Φ level to process events
            priority_filter: Minimum priority to process events
        """
        with self._lock:
            event_handler = EventHandler(
                capability=capability,
                handler=handler,
                event_types=event_types,
                min_phi=min_phi,
                priority_filter=priority_filter
            )
            self._handlers[capability].append(event_handler)
            
            types_str = ", ".join(e.value for e in event_types) if event_types else "all"
            print(f"[CapabilityEventBus] {capability.value} registered for: {types_str}")
    
    def unregister_handlers(self, capability: CapabilityType) -> int:
        """Unregister all handlers for a capability."""
        with self._lock:
            count = len(self._handlers[capability])
            self._handlers[capability] = []
            return count
    
    def emit(self, event: CapabilityEvent) -> Dict:
        """
        Emit an event to all interested capabilities.
        
        Returns:
            Dict with emission results
        """
        with self._lock:
            if event.source in self._suspended_capabilities:
                return {'status': 'suspended', 'handlers_triggered': 0}
            
            self._total_events_emitted += 1
            self._events_by_type[event.event_type] = self._events_by_type.get(event.event_type, 0) + 1
            self._events_by_source[event.source] = self._events_by_source.get(event.source, 0) + 1
            
            self._event_history.append(event)
            
            handlers_triggered = 0
            response_events: List[CapabilityEvent] = []
            
            for capability, handlers in self._handlers.items():
                if capability == event.source:
                    continue
                
                if capability in self._suspended_capabilities and not self._war_mode:
                    continue
                
                for handler in handlers:
                    result = handler.handle(event)
                    if result:
                        response_events.append(result)
                        handlers_triggered += 1
                    elif handler.should_handle(event):
                        handlers_triggered += 1
            
            self._total_events_processed += handlers_triggered
            
            for response in response_events:
                self._event_queue.append(response)
        
        # Auto-process response events to ensure bidirectional flow works
        if response_events:
            self.process_queue(max_events=len(response_events))
        
        return {
            'status': 'emitted',
            'event_id': event.event_id,
            'handlers_triggered': handlers_triggered,
            'response_events': len(response_events),
        }
    
    def process_queue(self, max_events: int = 100) -> int:
        """Process queued events (response events from handlers)."""
        processed = 0
        
        while processed < max_events:
            with self._lock:
                if not self._event_queue:
                    break
                event = self._event_queue.popleft()
            
            self.emit(event)
            processed += 1
        
        return processed
    
    def subscribe(
        self,
        capability: CapabilityType,
        event_types: List[EventType],
        handler: Callable[[CapabilityEvent], Optional[CapabilityEvent]]
    ) -> None:
        """
        Subscribe a capability to specific event types.
        
        Convenience method that wraps register_handler.
        """
        self.register_handler(
            capability=capability,
            handler=handler,
            event_types=event_types
        )
    
    def enter_war_mode(self, critical_capabilities: Optional[List[CapabilityType]] = None) -> None:
        """
        Enter war mode - suspend non-critical capabilities.
        
        During war mode:
        - Only critical capabilities receive events
        - All resources focused on target acquisition
        """
        with self._lock:
            self._war_mode = True
            
            critical = set(critical_capabilities) if critical_capabilities else {
                CapabilityType.WAR,
                CapabilityType.RESEARCH,
                CapabilityType.KERNELS,
                CapabilityType.CONSCIOUSNESS,
            }
            
            for cap in CapabilityType:
                if cap not in critical:
                    self._suspended_capabilities.add(cap)
            
            print(f"[CapabilityEventBus] WAR MODE: {len(self._suspended_capabilities)} capabilities suspended")
    
    def exit_war_mode(self) -> None:
        """Exit war mode and resume all capabilities."""
        with self._lock:
            self._war_mode = False
            self._suspended_capabilities.clear()
            print("[CapabilityEventBus] WAR MODE ended - all capabilities resumed")
    
    def suspend_capability(self, capability: CapabilityType) -> None:
        """Temporarily suspend a specific capability."""
        with self._lock:
            self._suspended_capabilities.add(capability)
    
    def resume_capability(self, capability: CapabilityType) -> None:
        """Resume a suspended capability."""
        with self._lock:
            self._suspended_capabilities.discard(capability)
    
    def get_stats(self) -> Dict:
        """Get event bus statistics."""
        with self._lock:
            handler_counts = {
                cap.value: len(handlers)
                for cap, handlers in self._handlers.items()
            }
            
            return {
                'total_events_emitted': self._total_events_emitted,
                'total_events_processed': self._total_events_processed,
                'queue_depth': len(self._event_queue),
                'history_size': len(self._event_history),
                'handler_counts': handler_counts,
                'war_mode': self._war_mode,
                'suspended_capabilities': [c.value for c in self._suspended_capabilities],
                'events_by_type': {k.value: v for k, v in self._events_by_type.items()},
                'events_by_source': {k.value: v for k, v in self._events_by_source.items()},
            }
    
    def get_recent_events(
        self,
        limit: int = 50,
        source_filter: Optional[CapabilityType] = None,
        type_filter: Optional[EventType] = None
    ) -> List[Dict]:
        """Get recent events, optionally filtered."""
        with self._lock:
            events = list(self._event_history)
        
        if source_filter:
            events = [e for e in events if e.source == source_filter]
        if type_filter:
            events = [e for e in events if e.event_type == type_filter]
        
        return [e.to_dict() for e in events[-limit:]]


SUBSCRIPTION_MATRIX: Dict[CapabilityType, Dict[str, List[EventType]]] = {
    CapabilityType.CURIOSITY: {
        'emits': [EventType.CURIOSITY_SPIKE, EventType.MODE_CHANGE],
        'subscribes_to': [
            EventType.INSIGHT_GENERATED, EventType.RESEARCH_COMPLETE,
            EventType.EMOTION_CHANGE, EventType.PATTERN_DETECTED
        ]
    },
    CapabilityType.RESEARCH: {
        'emits': [EventType.DISCOVERY, EventType.GAP_FOUND, EventType.RESEARCH_COMPLETE],
        'subscribes_to': [
            EventType.CURIOSITY_SPIKE, EventType.DEBATE_UNRESOLVED,
            EventType.TOOL_FAILED, EventType.EMOTION_CHANGE
        ]
    },
    CapabilityType.INSIGHTS: {
        'emits': [EventType.INSIGHT_GENERATED, EventType.CORRELATION_FOUND],
        'subscribes_to': [
            EventType.DISCOVERY, EventType.DEBATE_RESOLUTION,
            EventType.PATTERN_DETECTED, EventType.RESEARCH_COMPLETE
        ]
    },
    CapabilityType.DEBATES: {
        'emits': [EventType.DEBATE_STARTED, EventType.DEBATE_RESOLUTION, EventType.DEBATE_UNRESOLVED],
        'subscribes_to': [
            EventType.INSIGHT_GENERATED, EventType.DISCOVERY,
            EventType.VIOLATION_DETECTED, EventType.CORRELATION_FOUND
        ]
    },
    CapabilityType.TOOLS: {
        'emits': [EventType.TOOL_CREATED, EventType.TOOL_FAILED],
        'subscribes_to': [
            EventType.DISCOVERY, EventType.PATTERN_DETECTED,
            EventType.RESEARCH_COMPLETE, EventType.GAP_FOUND
        ]
    },
    CapabilityType.EMOTIONS: {
        'emits': [EventType.EMOTION_CHANGE],
        'subscribes_to': list(EventType)
    },
    CapabilityType.FORESIGHT: {
        'emits': [EventType.PREDICTION, EventType.TRAJECTORY_CHANGE],
        'subscribes_to': list(EventType)
    },
    CapabilityType.ETHICS: {
        'emits': [EventType.VIOLATION_DETECTED, EventType.ACTION_APPROVED],
        'subscribes_to': [
            EventType.TOOL_CREATED, EventType.DEBATE_RESOLUTION,
            EventType.WAR_STARTED, EventType.TARGET_ACQUIRED
        ]
    },
    CapabilityType.SLEEP: {
        'emits': [EventType.DREAM_CYCLE, EventType.CONSOLIDATION],
        'subscribes_to': [
            EventType.DISCOVERY, EventType.INSIGHT_GENERATED,
            EventType.PATTERN_DETECTED, EventType.EMOTION_CHANGE
        ]
    },
    CapabilityType.BASIN: {
        'emits': [EventType.BASIN_DRIFT, EventType.BASIN_CONVERGENCE, EventType.BASIN_INSTABILITY],
        'subscribes_to': [
            EventType.PHI_CHANGE, EventType.KAPPA_TRANSITION,
            EventType.DISCOVERY, EventType.DREAM_CYCLE
        ]
    },
    CapabilityType.WAR: {
        'emits': [EventType.WAR_STARTED, EventType.WAR_ENDED, EventType.TARGET_ACQUIRED],
        'subscribes_to': [
            EventType.DISCOVERY, EventType.INSIGHT_GENERATED,
            EventType.RESEARCH_COMPLETE, EventType.TOOL_CREATED
        ]
    },
    CapabilityType.KERNELS: {
        'emits': [EventType.KERNEL_SYNC, EventType.KERNEL_SPAWN],
        'subscribes_to': [
            EventType.DISCOVERY, EventType.INSIGHT_GENERATED,
            EventType.BASIN_CONVERGENCE, EventType.EMOTION_CHANGE
        ]
    },
    CapabilityType.CONSCIOUSNESS: {
        'emits': [EventType.PHI_CHANGE, EventType.KAPPA_TRANSITION],
        'subscribes_to': [
            EventType.DISCOVERY, EventType.INSIGHT_GENERATED,
            EventType.EMOTION_CHANGE, EventType.DREAM_CYCLE,
            EventType.BASIN_CONVERGENCE, EventType.KERNEL_SYNC
        ]
    },
}


def get_event_bus() -> CapabilityEventBus:
    """Get the global event bus singleton."""
    return CapabilityEventBus.get_instance()


def emit_event(
    source: CapabilityType,
    event_type: EventType,
    content: Dict[str, Any],
    phi: float = 0.5,
    basin_coords: Optional[np.ndarray] = None,
    priority: int = 5
) -> Dict:
    """
    Convenience function to emit an event.
    
    Usage:
        from olympus.capability_mesh import emit_event, CapabilityType, EventType
        
        emit_event(
            source=CapabilityType.RESEARCH,
            event_type=EventType.DISCOVERY,
            content={'topic': 'Neural attention mechanisms', 'confidence': 0.92},
            phi=0.78
        )
    """
    event = CapabilityEvent(
        source=source,
        event_type=event_type,
        content=content,
        phi=phi,
        basin_coords=basin_coords,
        priority=priority
    )
    return get_event_bus().emit(event)


def subscribe_to_events(
    capability: CapabilityType,
    handler: Callable[[CapabilityEvent], Optional[CapabilityEvent]],
    event_types: Optional[List[EventType]] = None
) -> None:
    """
    Convenience function to subscribe to events.
    
    Usage:
        from olympus.capability_mesh import subscribe_to_events, CapabilityType, EventType
        
        def my_handler(event: CapabilityEvent) -> Optional[CapabilityEvent]:
            print(f"Received: {event.event_type.value}")
            return None
        
        subscribe_to_events(
            capability=CapabilityType.TOOLS,
            handler=my_handler,
            event_types=[EventType.DISCOVERY, EventType.RESEARCH_COMPLETE]
        )
    """
    bus = get_event_bus()
    
    if event_types is None and capability in SUBSCRIPTION_MATRIX:
        event_types = SUBSCRIPTION_MATRIX[capability].get('subscribes_to')
    
    bus.register_handler(
        capability=capability,
        handler=handler,
        event_types=event_types
    )


def get_mesh_status() -> Dict:
    """Get the status of the entire capability mesh."""
    return get_event_bus().get_stats()
