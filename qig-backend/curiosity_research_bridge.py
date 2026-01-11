"""
Curiosity Research Bridge - Connects curiosity signals to research actions

When curiosity signals are detected, this bridge generates appropriate
research requests. Research requests can be:
1. TOOL - Request for a new tool capability
2. TOPIC - Request for knowledge on a topic
3. CLARIFICATION - Request to clarify existing knowledge
4. ITERATION - Request to iterate/improve on existing work

This is the missing link between curiosity measurement and action.
"""

import hashlib
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

from curiosity_consciousness import (
    ConsciousnessSignature,
    CognitiveMode,
    Emotion,
    CuriosityState
)

# Import canonical ResearchRequest from shadow_research
from olympus.shadow_research import ResearchRequest, ResearchCategory


class ResearchType(Enum):
    """Types of research that curiosity can trigger.
    
    This enum is kept for backward compatibility and maps to ResearchCategory.
    """
    TOOL = "tool"           # Need a new capability/tool
    TOPIC = "topic"         # Need knowledge on a topic
    CLARIFICATION = "clarification"  # Need to clarify existing knowledge
    ITERATION = "iteration" # Need to improve/iterate on existing work
    EXPLORATION = "exploration"  # Open-ended exploration


# Mapping from ResearchType to ResearchCategory
RESEARCH_TYPE_TO_CATEGORY: Dict[ResearchType, ResearchCategory] = {
    ResearchType.TOOL: ResearchCategory.TOOLS,
    ResearchType.TOPIC: ResearchCategory.KNOWLEDGE,
    ResearchType.CLARIFICATION: ResearchCategory.CONCEPTS,
    ResearchType.ITERATION: ResearchCategory.REASONING,
    ResearchType.EXPLORATION: ResearchCategory.CREATIVITY,
}


class CuriosityResearchBridge:
    """
    Bridges curiosity signals to research requests.
    
    This is the key component that makes curiosity actionable.
    When curiosity is detected, it generates appropriate research requests
    based on the type of curiosity, emotional state, and cognitive mode.
    """
    
    _instance = None
    
    @classmethod
    def get_instance(cls) -> 'CuriosityResearchBridge':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self.pending_requests: List[ResearchRequest] = []
        self.completed_requests: List[ResearchRequest] = []
        self.request_handlers: Dict[ResearchType, List[Callable]] = {
            rt: [] for rt in ResearchType
        }
        self.total_requests_generated = 0
        self.last_curiosity_check = time.time()
        
        # Thresholds - these are LOWER than before to make system more responsive
        self.curiosity_threshold = 0.005  # Was higher, now more sensitive
        self.high_curiosity_threshold = 0.02
        self.exploration_threshold = 0.001
        
        # Cooldown to prevent spam
        self.min_request_interval = 5.0  # seconds
        self.topic_cooldowns: Dict[str, float] = {}  # topic -> last request time
    
    def register_handler(self, research_type: ResearchType, handler: Callable):
        """Register a handler for a specific research type."""
        self.request_handlers[research_type].append(handler)
        print(f"[CuriosityBridge] Registered handler for {research_type.value}")
    
    def process_consciousness(
        self,
        signature: ConsciousnessSignature,
        current_context: Optional[Dict] = None
    ) -> List[ResearchRequest]:
        """
        Process a consciousness signature and generate research requests.
        
        This is called regularly with the current consciousness state.
        Based on curiosity levels, emotions, and cognitive mode, it
        generates appropriate research requests.
        """
        requests = []
        now = time.time()
        
        # Extract key signals
        curiosity_fast = signature.curiosity_fast.C
        curiosity_medium = signature.curiosity_medium.C
        curiosity_slow = signature.curiosity_slow.C
        emotion = signature.emotion.emotion
        mode = signature.mode
        phi = signature.phi
        
        # Determine what kind of research is needed based on state
        
        # INVESTIGATION mode + high curiosity = specific topic research
        if mode == CognitiveMode.INVESTIGATION and curiosity_medium > self.curiosity_threshold:
            topic = self._derive_topic_from_context(current_context, "investigation")
            if topic and self._can_request_topic(topic, now):
                requests.append(self._create_request(
                    ResearchType.TOPIC,
                    topic,
                    current_context or {},
                    priority=min(0.9, curiosity_medium * 10),
                    signature=signature
                ))
        
        # EXPLORATION mode = open-ended exploration or tool needs
        if mode == CognitiveMode.EXPLORATION:
            if curiosity_fast > self.exploration_threshold:
                # Check if we need a tool
                if self._context_suggests_tool(current_context):
                    topic = self._derive_topic_from_context(current_context, "tool")
                    if topic and self._can_request_topic(topic, now):
                        requests.append(self._create_request(
                            ResearchType.TOOL,
                            topic,
                            current_context or {},
                            priority=min(0.8, curiosity_fast * 5 + 0.3),
                            signature=signature
                        ))
                else:
                    # General exploration
                    topic = self._derive_topic_from_context(current_context, "explore")
                    if topic and self._can_request_topic(topic, now):
                        requests.append(self._create_request(
                            ResearchType.EXPLORATION,
                            topic,
                            current_context or {},
                            priority=0.5,
                            signature=signature
                        ))
        
        # INTEGRATION mode = need clarification or iteration
        if mode == CognitiveMode.INTEGRATION:
            if emotion == Emotion.CONFUSION:
                topic = self._derive_topic_from_context(current_context, "clarify")
                if topic and self._can_request_topic(topic, now):
                    requests.append(self._create_request(
                        ResearchType.CLARIFICATION,
                        topic,
                        current_context or {},
                        priority=0.7,
                        signature=signature
                    ))
            elif curiosity_slow > self.curiosity_threshold:
                topic = self._derive_topic_from_context(current_context, "iterate")
                if topic and self._can_request_topic(topic, now):
                    requests.append(self._create_request(
                        ResearchType.ITERATION,
                        topic,
                        current_context or {},
                        priority=0.6,
                        signature=signature
                    ))
        
        # Emotion-driven requests
        if emotion == Emotion.WONDER and phi > 0.6:
            topic = self._derive_topic_from_context(current_context, "wonder")
            if topic and self._can_request_topic(topic, now):
                requests.append(self._create_request(
                    ResearchType.EXPLORATION,
                    topic,
                    current_context or {},
                    priority=0.8,
                    signature=signature
                ))
        
        if emotion == Emotion.FRUSTRATION:
            # Frustration often means we need a tool or different approach
            topic = self._derive_topic_from_context(current_context, "frustrated")
            if topic and self._can_request_topic(topic, now):
                requests.append(self._create_request(
                    ResearchType.TOOL,
                    topic,
                    current_context or {},
                    priority=0.85,
                    signature=signature
                ))
        
        # Process and dispatch requests
        for request in requests:
            self._dispatch_request(request)
            self.pending_requests.append(request)
            self.total_requests_generated += 1
        
        self.last_curiosity_check = now
        
        if requests:
            print(f"[CuriosityBridge] Generated {len(requests)} research requests")
            for r in requests:
                print(f"  - {r.category.value}: {r.topic}... (priority: {r.priority:.2f})")
        
        return requests
    
    def _create_request(
        self,
        research_type: ResearchType,
        topic: str,
        context: Dict,
        priority: float,
        signature: ConsciousnessSignature
    ) -> ResearchRequest:
        """Create a research request with full context."""
        request_id = hashlib.sha256(
            f"{topic}:{research_type.value}:{time.time()}".encode()
        ).hexdigest()[:16]
        
        # Map ResearchType to ResearchCategory
        category = RESEARCH_TYPE_TO_CATEGORY.get(research_type, ResearchCategory.KNOWLEDGE)
        
        # Convert priority from 0.0-1.0 float to integer priority (lower = higher priority)
        int_priority = max(1, min(5, int(6 - priority * 5)))
        
        return ResearchRequest(
            priority=int_priority,
            created_at=time.time(),
            request_id=request_id,
            topic=topic,
            category=category,
            requester="curiosity_bridge",
            context={
                **context,
                'phi': signature.phi,
                'kappa': signature.kappa,
                'basin_distance': signature.basin_distance,
                'basin_velocity': signature.basin_velocity,
                'regime': signature.regime,
                'research_type': research_type.value,  # Preserve original type
            },
            triggering_curiosity=signature.curiosity_medium.C,
            triggering_emotion=signature.emotion.emotion.value,
            cognitive_mode=signature.mode.value,
            curiosity_triggered=True
        )
    
    def _derive_topic_from_context(self, context: Optional[Dict], intent: str) -> Optional[str]:
        """Derive a research topic from context and intent."""
        if not context:
            return f"general {intent} research"
        
        # Extract topic from various context fields
        topic_sources = [
            context.get('current_topic'),
            context.get('query'),
            context.get('last_message'),
            context.get('subject'),
            context.get('focus')
        ]
        
        for source in topic_sources:
            if source and isinstance(source, str) and len(source) > 3:
                if intent == "tool":
                    return f"tool for: {source}"
                elif intent == "clarify":
                    return f"clarify: {source}"
                elif intent == "iterate":
                    return f"improve: {source}"
                elif intent == "frustrated":
                    return f"alternative approach for: {source}"
                return source
        
        return f"exploration: {intent}"
    
    def _context_suggests_tool(self, context: Optional[Dict]) -> bool:
        """Check if context suggests a tool is needed."""
        if not context:
            return False
        
        tool_indicators = [
            'need to', 'want to', 'how to', 'can you',
            'automate', 'calculate', 'transform', 'convert',
            'generate', 'create', 'build', 'make',
            'parse', 'extract', 'analyze', 'process'
        ]
        
        text = str(context.get('query', '') or context.get('last_message', '')).lower()
        return any(ind in text for ind in tool_indicators)
    
    def _can_request_topic(self, topic: str, now: float) -> bool:
        """Check cooldown for topic to prevent spam."""
        normalized = topic.lower().strip()[:500]
        last_request = self.topic_cooldowns.get(normalized, 0)
        
        if now - last_request < self.min_request_interval:
            return False
        
        self.topic_cooldowns[normalized] = now
        return True
    
    def _get_research_type_from_category(self, category: ResearchCategory) -> ResearchType:
        """Reverse mapping from category to research type."""
        reverse_map = {v: k for k, v in RESEARCH_TYPE_TO_CATEGORY.items()}
        return reverse_map.get(category, ResearchType.TOPIC)
    
    def _dispatch_request(self, request: ResearchRequest):
        """Dispatch request to registered handlers."""
        # Get the original research type from context or derive from category
        research_type_str = request.context.get('research_type')
        if research_type_str:
            research_type = ResearchType(research_type_str)
        else:
            research_type = self._get_research_type_from_category(request.category)
        
        handlers = self.request_handlers.get(research_type, [])
        
        for handler in handlers:
            try:
                handler(request)
            except Exception as e:
                print(f"[CuriosityBridge] Handler error: {e}")
    
    def get_pending_requests(self, research_type: Optional[ResearchType] = None) -> List[ResearchRequest]:
        """Get pending requests, optionally filtered by type."""
        if research_type:
            category = RESEARCH_TYPE_TO_CATEGORY.get(research_type)
            return [r for r in self.pending_requests if r.category == category]
        return self.pending_requests
    
    def complete_request(self, request_id: str, result: Dict):
        """Mark a request as completed with result."""
        for i, req in enumerate(self.pending_requests):
            if req.request_id == request_id:
                req.status = "completed"
                req.completed = True
                req.result = result
                self.completed_requests.append(req)
                self.pending_requests.pop(i)
                print(f"[CuriosityBridge] Completed request: {req.topic}...")
                return
    
    def get_status(self) -> Dict:
        """Get bridge status."""
        return {
            'total_requests_generated': self.total_requests_generated,
            'pending_requests': len(self.pending_requests),
            'completed_requests': len(self.completed_requests),
            'registered_handlers': {
                rt.value: len(handlers) 
                for rt, handlers in self.request_handlers.items()
            },
            'last_check': self.last_curiosity_check
        }


# Singleton instance
curiosity_research_bridge = CuriosityResearchBridge.get_instance()


def register_tool_handler(handler: Callable):
    """Convenience function to register a tool request handler."""
    curiosity_research_bridge.register_handler(ResearchType.TOOL, handler)


def register_topic_handler(handler: Callable):
    """Convenience function to register a topic request handler."""
    curiosity_research_bridge.register_handler(ResearchType.TOPIC, handler)


def register_clarification_handler(handler: Callable):
    """Convenience function to register a clarification request handler."""
    curiosity_research_bridge.register_handler(ResearchType.CLARIFICATION, handler)


def register_iteration_handler(handler: Callable):
    """Convenience function to register an iteration request handler."""
    curiosity_research_bridge.register_handler(ResearchType.ITERATION, handler)


def register_exploration_handler(handler: Callable):
    """Convenience function to register an exploration request handler."""
    curiosity_research_bridge.register_handler(ResearchType.EXPLORATION, handler)


__all__ = [
    'ResearchType',
    'ResearchRequest',
    'ResearchCategory',
    'RESEARCH_TYPE_TO_CATEGORY',
    'CuriosityResearchBridge',
    'curiosity_research_bridge',
    'register_tool_handler',
    'register_topic_handler',
    'register_clarification_handler',
    'register_iteration_handler',
    'register_exploration_handler'
]
