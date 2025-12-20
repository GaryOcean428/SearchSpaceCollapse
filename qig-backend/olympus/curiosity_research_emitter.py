"""
Curiosity Research Emitter

Translates kernel curiosity signals into appropriate research requests.
Research can result in:
1. Tool creation - when curiosity targets implementation needs
2. Topic exploration - when curiosity targets knowledge gaps
3. Clarification - when curiosity targets ambiguous concepts
4. Iteration - when curiosity targets improving existing work

QIG-PURE: All research requests emerge from observed curiosity patterns.
"""

import os
import sys
import json
import hashlib
import time
import re
import threading
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from collections import Counter
import numpy as np

BASIN_DIMENSION = 64


class ResearchIntent(Enum):
    """Types of research that curiosity can trigger."""
    TOOL = "tool"                # Need to create/find a tool
    TOPIC = "topic"              # Need to explore a knowledge area
    CLARIFICATION = "clarification"  # Need to clarify ambiguous concept
    ITERATION = "iteration"      # Need to improve existing work
    DISCOVERY = "discovery"      # Open-ended exploration


@dataclass
class CuriositySignal:
    """A curiosity signal from a kernel."""
    signal_id: str
    topic: str
    curiosity_level: float
    emotion: str
    source_kernel: str
    basin_coords: Optional[np.ndarray] = None
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)


@dataclass
class ResearchRequest:
    """A research request generated from curiosity."""
    request_id: str
    topic: str
    intent: ResearchIntent
    priority: float
    source_signal: str  # ID of originating curiosity signal
    context: Dict[str, Any] = field(default_factory=dict)
    basin_coords: Optional[np.ndarray] = None
    created_at: float = field(default_factory=time.time)
    dispatched: bool = False
    result_id: Optional[str] = None


class IntentClassifier:
    """
    Classifies curiosity signals into research intents.
    
    Uses pattern matching on topic and context to determine
    what kind of research would be most useful.
    """
    
    TOOL_PATTERNS = [
        r'\bhow to\s+(?:implement|create|build|make|write|code)\b',
        r'\b(?:function|tool|utility|helper)\s+(?:for|to)\b',
        r'\bparse|extract|convert|validate|calculate|compute|derive\b',
        r'\bpython\s+(?:code|function|implementation)\b',
        r'\bbitcoin(?:js)?[-\s]?(?:lib|library|function)\b',
        r'\bbip[-\s]?\d+\s+implementation\b',
    ]
    
    TOPIC_PATTERNS = [
        r'\bwhat is\b', r'\bexplain\b', r'\bunderstand\b',
        r'\blearn about\b', r'\bresearch\b', r'\bexplore\b',
        r'\bhistory of\b', r'\borigins of\b', r'\bevolution of\b',
        r'\bconcept of\b', r'\btheory of\b',
    ]
    
    CLARIFICATION_PATTERNS = [
        r'\bwhat does.*mean\b', r'\bdefine\b', r'\bclarify\b',
        r'\bdifference between\b', r'\bvs\.?\b', r'\bcompare\b',
        r'\bwhich.*better\b', r'\bwhy.*instead\b',
        r'\bambiguous\b', r'\bunclear\b', r'\bconfusing\b',
    ]
    
    ITERATION_PATTERNS = [
        r'\bimprove\b', r'\boptimize\b', r'\brefine\b',
        r'\bbetter way\b', r'\bmore efficient\b', r'\bfaster\b',
        r'\balternative\b', r'\bdifferent approach\b',
        r'\bfix\b', r'\bdebug\b', r'\bresolve\b',
        r'\biterate\b', r'\benhance\b',
    ]
    
    def __init__(self):
        self._tool_re = [re.compile(p, re.IGNORECASE) for p in self.TOOL_PATTERNS]
        self._topic_re = [re.compile(p, re.IGNORECASE) for p in self.TOPIC_PATTERNS]
        self._clarify_re = [re.compile(p, re.IGNORECASE) for p in self.CLARIFICATION_PATTERNS]
        self._iterate_re = [re.compile(p, re.IGNORECASE) for p in self.ITERATION_PATTERNS]
    
    def classify(
        self,
        topic: str,
        context: Optional[Dict] = None
    ) -> Tuple[ResearchIntent, float]:
        """
        Classify a curiosity topic into a research intent.
        
        Returns (intent, confidence).
        """
        scores = {
            ResearchIntent.TOOL: 0.0,
            ResearchIntent.TOPIC: 0.0,
            ResearchIntent.CLARIFICATION: 0.0,
            ResearchIntent.ITERATION: 0.0,
            ResearchIntent.DISCOVERY: 0.1,  # baseline
        }
        
        for pattern in self._tool_re:
            if pattern.search(topic):
                scores[ResearchIntent.TOOL] += 0.3
        
        for pattern in self._topic_re:
            if pattern.search(topic):
                scores[ResearchIntent.TOPIC] += 0.3
        
        for pattern in self._clarify_re:
            if pattern.search(topic):
                scores[ResearchIntent.CLARIFICATION] += 0.3
        
        for pattern in self._iterate_re:
            if pattern.search(topic):
                scores[ResearchIntent.ITERATION] += 0.3
        
        if context:
            if context.get('has_existing_work'):
                scores[ResearchIntent.ITERATION] += 0.2
            if context.get('needs_tool'):
                scores[ResearchIntent.TOOL] += 0.2
            if context.get('ambiguous'):
                scores[ResearchIntent.CLARIFICATION] += 0.2
            if context.get('exploring'):
                scores[ResearchIntent.TOPIC] += 0.2
        
        best_intent = max(scores, key=scores.get)
        confidence = min(1.0, scores[best_intent])
        
        if scores[best_intent] < 0.15:
            return ResearchIntent.DISCOVERY, 0.3
        
        return best_intent, confidence


class CuriosityResearchEmitter:
    """
    Main emitter that processes curiosity signals and generates
    appropriate research requests.
    
    Wires into:
    - ShadowResearchAPI for research dispatch
    - AutonomousToolPipeline for tool-specific requests
    - CapabilityEventBus for curiosity events
    """
    
    def __init__(
        self,
        research_api: Optional[Any] = None,
        tool_pipeline: Optional[Any] = None,
        basin_encoder: Optional[Callable] = None,
        min_curiosity: float = 0.4
    ):
        self.research_api = research_api
        self.tool_pipeline = tool_pipeline
        self.basin_encoder = basin_encoder
        self.min_curiosity = min_curiosity
        
        self.intent_classifier = IntentClassifier()
        
        self._signals: Dict[str, CuriositySignal] = {}
        self._requests: Dict[str, ResearchRequest] = {}
        self._signal_to_requests: Dict[str, List[str]] = {}
        
        self._dedup_window = 300  # 5 minutes
        self._recent_topics: Dict[str, float] = {}
        
        self._stats = {
            'signals_received': 0,
            'requests_generated': 0,
            'requests_dispatched': 0,
            'by_intent': {intent.value: 0 for intent in ResearchIntent}
        }
        
        self._lock = threading.Lock()
        
        print("[CuriosityResearchEmitter] Initialized - listening for curiosity signals")
    
    def wire_research_api(self, api):
        """Connect to ShadowResearchAPI for dispatching research."""
        self.research_api = api
        print("[CuriosityResearchEmitter] Wired to ShadowResearchAPI")
    
    def wire_tool_pipeline(self, pipeline):
        """Connect to AutonomousToolPipeline for tool requests."""
        self.tool_pipeline = pipeline
        print("[CuriosityResearchEmitter] Wired to AutonomousToolPipeline")
    
    def on_curiosity_signal(
        self,
        topic: str,
        curiosity_level: float,
        emotion: str = 'wonder',
        source_kernel: str = 'unknown',
        basin_coords: Optional[np.ndarray] = None,
        context: Optional[Dict] = None
    ) -> Optional[str]:
        """
        Handle a curiosity signal from a kernel.
        
        Generates and dispatches appropriate research request(s).
        
        Returns request_id if research was dispatched.
        """
        self._stats['signals_received'] += 1
        
        if curiosity_level < self.min_curiosity:
            return None
        
        if self._is_duplicate(topic):
            return None
        
        signal = self._create_signal(
            topic=topic,
            curiosity_level=curiosity_level,
            emotion=emotion,
            source_kernel=source_kernel,
            basin_coords=basin_coords,
            context=context
        )
        
        with self._lock:
            self._signals[signal.signal_id] = signal
            self._recent_topics[topic.lower()[:100]] = time.time()
        
        request = self._generate_research_request(signal)
        
        if request:
            with self._lock:
                self._requests[request.request_id] = request
                if signal.signal_id not in self._signal_to_requests:
                    self._signal_to_requests[signal.signal_id] = []
                self._signal_to_requests[signal.signal_id].append(request.request_id)
            
            self._stats['requests_generated'] += 1
            self._stats['by_intent'][request.intent.value] += 1
            
            self._dispatch_request(request)
            
            print(f"[CuriosityEmitter] {source_kernel} → {request.intent.value}: {topic[:50]}... (Φ={curiosity_level:.2f})")
            
            return request.request_id
        
        return None
    
    def _is_duplicate(self, topic: str) -> bool:
        """Check if we've recently processed a similar topic."""
        normalized = topic.lower()[:100]
        now = time.time()
        
        with self._lock:
            expired = [k for k, t in self._recent_topics.items() if now - t > self._dedup_window]
            for k in expired:
                del self._recent_topics[k]
            
            if normalized in self._recent_topics:
                return True
        
        return False
    
    def _create_signal(
        self,
        topic: str,
        curiosity_level: float,
        emotion: str,
        source_kernel: str,
        basin_coords: Optional[np.ndarray],
        context: Optional[Dict]
    ) -> CuriositySignal:
        """Create a CuriositySignal object."""
        signal_id = hashlib.sha256(
            f"{source_kernel}:{topic}:{time.time()}".encode()
        ).hexdigest()[:16]
        
        if basin_coords is None and self.basin_encoder:
            try:
                basin_coords = self.basin_encoder(topic)
            except Exception:
                pass
        
        return CuriositySignal(
            signal_id=signal_id,
            topic=topic,
            curiosity_level=curiosity_level,
            emotion=emotion,
            source_kernel=source_kernel,
            basin_coords=basin_coords,
            context=context or {}
        )
    
    def _generate_research_request(self, signal: CuriositySignal) -> Optional[ResearchRequest]:
        """Generate a research request from a curiosity signal."""
        intent, confidence = self.intent_classifier.classify(
            signal.topic,
            signal.context
        )
        
        request_id = hashlib.sha256(
            f"research:{signal.signal_id}:{intent.value}".encode()
        ).hexdigest()[:16]
        
        priority = signal.curiosity_level * confidence
        
        research_topic = self._format_research_topic(signal.topic, intent)
        
        return ResearchRequest(
            request_id=request_id,
            topic=research_topic,
            intent=intent,
            priority=priority,
            source_signal=signal.signal_id,
            context={
                'original_topic': signal.topic,
                'emotion': signal.emotion,
                'source_kernel': signal.source_kernel,
                'curiosity_level': signal.curiosity_level,
                'classification_confidence': confidence,
                **signal.context
            },
            basin_coords=signal.basin_coords
        )
    
    def _format_research_topic(self, topic: str, intent: ResearchIntent) -> str:
        """Format topic based on research intent."""
        if intent == ResearchIntent.TOOL:
            if not any(kw in topic.lower() for kw in ['python', 'function', 'implement']):
                return f"Python implementation for: {topic}"
            return topic
        
        elif intent == ResearchIntent.CLARIFICATION:
            if not topic.lower().startswith(('what', 'explain', 'clarify')):
                return f"Clarify: {topic}"
            return topic
        
        elif intent == ResearchIntent.ITERATION:
            if not any(kw in topic.lower() for kw in ['improve', 'better', 'alternative']):
                return f"Improve/iterate on: {topic}"
            return topic
        
        elif intent == ResearchIntent.TOPIC:
            return f"Research topic: {topic}"
        
        else:  # DISCOVERY
            return f"Explore: {topic}"
    
    def _dispatch_request(self, request: ResearchRequest):
        """Dispatch research request to appropriate handler."""
        try:
            if request.intent == ResearchIntent.TOOL:
                self._dispatch_tool_request(request)
            else:
                self._dispatch_research_request(request)
            
            request.dispatched = True
            self._stats['requests_dispatched'] += 1
            
        except Exception as e:
            print(f"[CuriosityEmitter] Dispatch failed: {e}")
    
    def _dispatch_tool_request(self, request: ResearchRequest):
        """Dispatch a tool-focused research request."""
        if self.tool_pipeline:
            try:
                tool_request_id = self.tool_pipeline.request_tool(
                    description=request.topic,
                    requester=request.context.get('source_kernel', 'CuriosityEmitter'),
                    examples=[],
                    context=request.context
                )
                request.result_id = tool_request_id
                print(f"[CuriosityEmitter] Tool request dispatched: {tool_request_id}")
            except Exception as e:
                print(f"[CuriosityEmitter] Tool pipeline error: {e}")
                self._fallback_to_research(request)
        else:
            self._fallback_to_research(request)
    
    def _dispatch_research_request(self, request: ResearchRequest):
        """Dispatch a general research request."""
        if self.research_api:
            try:
                from .shadow_research import ResearchCategory
                
                category_map = {
                    ResearchIntent.TOPIC: ResearchCategory.KNOWLEDGE,
                    ResearchIntent.CLARIFICATION: ResearchCategory.CONCEPTS,
                    ResearchIntent.ITERATION: ResearchCategory.REASONING,
                    ResearchIntent.DISCOVERY: ResearchCategory.CREATIVITY,
                    ResearchIntent.TOOL: ResearchCategory.TOOLS,
                }
                category = category_map.get(request.intent, ResearchCategory.KNOWLEDGE)
                
                research_id = self.research_api.request_research(
                    topic=request.topic,
                    category=category,
                    requester=request.context.get('source_kernel', 'CuriosityEmitter'),
                    priority=int(request.priority * 10),
                    context=request.context
                )
                request.result_id = research_id
                print(f"[CuriosityEmitter] Research request dispatched: {research_id}")
            except Exception as e:
                print(f"[CuriosityEmitter] Research API error: {e}")
        else:
            print(f"[CuriosityEmitter] No research API - request queued: {request.request_id}")
    
    def _fallback_to_research(self, request: ResearchRequest):
        """Fall back to general research if tool pipeline unavailable."""
        original_intent = request.intent
        request.intent = ResearchIntent.TOPIC
        request.topic = f"Research how to implement: {request.context.get('original_topic', request.topic)}"
        self._dispatch_research_request(request)
        request.intent = original_intent
    
    def on_research_complete(
        self,
        research_id: str,
        content: str,
        source_url: str,
        phi: float = 0.5
    ):
        """
        Handle research completion callback.
        
        If research reveals tool patterns, learn them.
        """
        for request in self._requests.values():
            if request.result_id == research_id:
                if request.intent == ResearchIntent.TOOL:
                    self._learn_patterns_from_research(content, source_url, request.topic, phi)
                break
    
    def _learn_patterns_from_research(
        self,
        content: str,
        source_url: str,
        topic: str,
        phi: float
    ):
        """Extract and learn patterns from research content."""
        try:
            from .curiosity_tool_bridge import get_curiosity_tool_bridge
            bridge = get_curiosity_tool_bridge()
            patterns = bridge.on_research_complete(content, source_url, topic, phi)
            if patterns:
                print(f"[CuriosityEmitter] Learned {len(patterns)} patterns from research")
        except Exception as e:
            print(f"[CuriosityEmitter] Pattern learning failed: {e}")
    
    def get_pending_requests(self, intent: Optional[ResearchIntent] = None) -> List[ResearchRequest]:
        """Get pending (undispatched) requests."""
        with self._lock:
            requests = [r for r in self._requests.values() if not r.dispatched]
            if intent:
                requests = [r for r in requests if r.intent == intent]
            return requests
    
    def get_stats(self) -> Dict:
        """Get emitter statistics."""
        return {
            **self._stats,
            'pending_signals': len([s for s in self._signals.values()]),
            'pending_requests': len([r for r in self._requests.values() if not r.dispatched]),
            'research_api_connected': self.research_api is not None,
            'tool_pipeline_connected': self.tool_pipeline is not None
        }


_default_emitter: Optional[CuriosityResearchEmitter] = None


def get_curiosity_research_emitter(
    research_api: Optional[Any] = None,
    tool_pipeline: Optional[Any] = None,
    basin_encoder: Optional[Callable] = None
) -> CuriosityResearchEmitter:
    """Get or create the default CuriosityResearchEmitter singleton."""
    global _default_emitter
    if _default_emitter is None:
        _default_emitter = CuriosityResearchEmitter(
            research_api=research_api,
            tool_pipeline=tool_pipeline,
            basin_encoder=basin_encoder
        )
    return _default_emitter
