"""
Curiosity-Tool Bridge

Connects kernel curiosity, research discoveries, and tool creation into a
continuous learning loop. This is the missing link that makes the Tool Factory
actually useful.

Architecture:
1. CuriosityToToolEmitter - Translates curiosity spikes into tool requests
2. ResearchPatternLearner - Learns patterns from research/search discoveries
3. ToolNeedDetector - Detects implicit tool needs from kernel behavior
4. AutomaticPatternBootstrap - Seeds patterns from observed code in research

QIG-PURE: All pattern creation comes from observed data, no hardcoded templates.
"""

import os
import sys
import json
import hashlib
import time
import re
import threading
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
from collections import Counter
import numpy as np

BASIN_DIMENSION = 64


@dataclass
class ToolNeed:
    """A detected need for a tool."""
    need_id: str
    description: str
    source: str  # 'curiosity', 'research', 'failure', 'pattern'
    priority: float
    context: Dict[str, Any]
    basin_coords: Optional[np.ndarray] = None
    created_at: float = field(default_factory=time.time)
    processed: bool = False


@dataclass
class DiscoveredPattern:
    """A pattern discovered from research/search that can seed tool creation."""
    pattern_id: str
    description: str
    code_snippet: str
    source_url: str
    source_type: str  # 'research', 'search', 'observation', 'curiosity'
    input_signature: Dict[str, str] = field(default_factory=dict)
    output_type: str = 'Any'
    confidence: float = 0.5
    phi: float = 0.5


class CuriosityToToolEmitter:
    """
    Translates kernel curiosity signals into tool generation requests.
    
    When kernels express curiosity (CURIOSITY_SPIKE events), this emitter
    analyzes the curiosity target and determines if a tool would help.
    """
    
    TOOL_TRIGGER_KEYWORDS = [
        'function', 'parse', 'extract', 'convert', 'validate', 'calculate',
        'analyze', 'decode', 'encode', 'format', 'transform', 'generate',
        'derive', 'compute', 'bitcoin', 'bip', 'seed', 'mnemonic', 'wallet',
        'checksum', 'hash', 'entropy', 'key', 'derivation', 'path'
    ]
    
    def __init__(
        self,
        tool_pipeline: Optional[Any] = None,
        min_curiosity_for_tool: float = 0.6
    ):
        self.tool_pipeline = tool_pipeline
        self.min_curiosity = min_curiosity_for_tool
        self._emitted_needs: Dict[str, ToolNeed] = {}
        self._topic_to_need: Dict[str, str] = {}
        self._lock = threading.Lock()
        
    def wire_tool_pipeline(self, pipeline):
        """Connect to the AutonomousToolPipeline."""
        self.tool_pipeline = pipeline
        print("[CuriosityToolEmitter] Wired to AutonomousToolPipeline")
    
    def on_curiosity_spike(
        self,
        topic: str,
        curiosity_level: float,
        emotion: str,
        basin_coords: Optional[np.ndarray] = None,
        context: Optional[Dict] = None
    ) -> Optional[str]:
        """
        Handle a curiosity spike from a kernel.
        
        If the curiosity target suggests a tool would be useful,
        emit a tool request to the pipeline.
        
        Returns tool_request_id if a request was made.
        """
        if curiosity_level < self.min_curiosity:
            return None
        
        if not self._could_benefit_from_tool(topic):
            return None
        
        with self._lock:
            if topic in self._topic_to_need:
                existing = self._topic_to_need[topic]
                if existing in self._emitted_needs:
                    if not self._emitted_needs[existing].processed:
                        return None
        
        need = self._create_tool_need(topic, curiosity_level, basin_coords, context)
        
        with self._lock:
            self._emitted_needs[need.need_id] = need
            self._topic_to_need[topic] = need.need_id
        
        request_id = self._emit_tool_request(need)
        
        print(f"[CuriosityToolEmitter] Curiosity spike → tool request: {topic}... (Φ={curiosity_level:.2f})")
        
        return request_id
    
    def _could_benefit_from_tool(self, topic: str) -> bool:
        """Determine if topic could benefit from a tool."""
        topic_lower = topic.lower()
        
        for keyword in self.TOOL_TRIGGER_KEYWORDS:
            if keyword in topic_lower:
                return True
        
        action_patterns = [
            r'\bhow to\b', r'\bimplement\b', r'\bcreate\b', r'\bgenerate\b',
            r'\bparse\b', r'\bextract\b', r'\bvalidate\b', r'\bconvert\b'
        ]
        for pattern in action_patterns:
            if re.search(pattern, topic_lower):
                return True
        
        return False
    
    def _create_tool_need(
        self,
        topic: str,
        curiosity_level: float,
        basin_coords: Optional[np.ndarray],
        context: Optional[Dict]
    ) -> ToolNeed:
        """Create a ToolNeed from curiosity data."""
        need_id = hashlib.sha256(
            f"curiosity:{topic}:{time.time()}".encode()
        ).hexdigest()[:16]
        
        description = self._topic_to_tool_description(topic)
        
        return ToolNeed(
            need_id=need_id,
            description=description,
            source='curiosity',
            priority=curiosity_level,
            context={
                'original_topic': topic,
                'emotion': context.get('emotion', 'wonder') if context else 'wonder',
                **(context or {})
            },
            basin_coords=basin_coords
        )
    
    def _topic_to_tool_description(self, topic: str) -> str:
        """Convert a curiosity topic to a tool description."""
        topic_lower = topic.lower()
        
        if 'parse' in topic_lower or 'extract' in topic_lower:
            return f"Python function to {topic}"
        elif 'validate' in topic_lower or 'check' in topic_lower:
            return f"Python validation function for {topic}"
        elif 'convert' in topic_lower or 'transform' in topic_lower:
            return f"Python conversion function for {topic}"
        elif 'bitcoin' in topic_lower or 'bip' in topic_lower:
            return f"Bitcoin utility function: {topic}"
        else:
            return f"Python tool to help with: {topic}"
    
    def _emit_tool_request(self, need: ToolNeed) -> Optional[str]:
        """Emit tool request to the pipeline."""
        if not self.tool_pipeline:
            print("[CuriosityToolEmitter] No pipeline - storing need for later")
            return None
        
        try:
            request_id = self.tool_pipeline.request_tool(
                description=need.description,
                requester=f"CuriosityEmitter:{need.source}",
                examples=[],
                context={
                    'need_id': need.need_id,
                    'priority': need.priority,
                    **need.context
                }
            )
            need.processed = True
            return request_id
        except Exception as e:
            print(f"[CuriosityToolEmitter] Request failed: {e}")
            return None
    
    def get_pending_needs(self) -> List[ToolNeed]:
        """Get unprocessed tool needs."""
        with self._lock:
            return [n for n in self._emitted_needs.values() if not n.processed]


class ResearchPatternLearner:
    """
    Learns tool patterns from research discoveries and search results.
    
    When research completes or search results come in, this learner
    extracts code patterns and teaches them to the ToolFactory.
    """
    
    CODE_BLOCK_PATTERN = re.compile(
        r'```(?:python|py)?\s*\n(.*?)```',
        re.DOTALL | re.IGNORECASE
    )
    
    FUNCTION_PATTERN = re.compile(
        r'def\s+(\w+)\s*\([^)]*\).*?(?=\ndef\s|\Z)',
        re.DOTALL
    )
    
    def __init__(
        self,
        tool_factory: Optional[Any] = None,
        basin_encoder: Optional[Callable] = None
    ):
        self.tool_factory = tool_factory
        self.basin_encoder = basin_encoder
        self._discovered_patterns: Dict[str, DiscoveredPattern] = {}
        self._lock = threading.Lock()
    
    def wire_tool_factory(self, factory):
        """Connect to the ToolFactory."""
        self.tool_factory = factory
        print("[ResearchPatternLearner] Wired to ToolFactory")
    
    def learn_from_research_result(
        self,
        content: str,
        source_url: str,
        topic: str,
        phi: float = 0.5
    ) -> List[str]:
        """
        Extract and learn patterns from research content.
        
        Returns list of pattern_ids that were learned.
        """
        patterns_learned = []
        
        code_blocks = self._extract_code_blocks(content)
        
        for i, code in enumerate(code_blocks):
            functions = self._extract_functions(code)
            
            for func_name, func_code, signature in functions:
                pattern = self._create_pattern(
                    func_name=func_name,
                    func_code=func_code,
                    signature=signature,
                    source_url=source_url,
                    topic=topic,
                    phi=phi,
                    source_type='research'
                )
                
                if pattern:
                    learned = self._teach_pattern(pattern)
                    if learned:
                        patterns_learned.append(pattern.pattern_id)
        
        if patterns_learned:
            print(f"[ResearchPatternLearner] Learned {len(patterns_learned)} patterns from: {source_url}...")
        
        return patterns_learned
    
    def learn_from_search_result(
        self,
        title: str,
        snippet: str,
        url: str,
        phi: float = 0.5
    ) -> List[str]:
        """
        Extract patterns from search result snippets.
        
        For search results, we often only have snippets, so we
        create lightweight patterns that can be expanded later.
        """
        patterns_learned = []
        
        code_blocks = self._extract_code_blocks(snippet)
        
        for code in code_blocks:
            functions = self._extract_functions(code)
            for func_name, func_code, signature in functions:
                pattern = self._create_pattern(
                    func_name=func_name,
                    func_code=func_code,
                    signature=signature,
                    source_url=url,
                    topic=title,
                    phi=phi,
                    source_type='search'
                )
                if pattern:
                    learned = self._teach_pattern(pattern)
                    if learned:
                        patterns_learned.append(pattern.pattern_id)
        
        if not patterns_learned and self._looks_like_implementation_guide(title, snippet):
            pattern = self._create_abstract_pattern(title, snippet, url, phi)
            if pattern:
                learned = self._teach_pattern(pattern)
                if learned:
                    patterns_learned.append(pattern.pattern_id)
        
        return patterns_learned
    
    def _extract_code_blocks(self, content: str) -> List[str]:
        """Extract Python code blocks from content."""
        blocks = []
        
        for match in self.CODE_BLOCK_PATTERN.finditer(content):
            code = match.group(1).strip()
            if code:
                blocks.append(code)
        
        lines = content.split('\n')
        in_code_block = False
        current_block = []
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('def ') or (in_code_block and (line.startswith('    ') or line.startswith('\t'))):
                in_code_block = True
                current_block.append(line)
            elif in_code_block and stripped == '':
                current_block.append(line)
            elif in_code_block:
                if current_block:
                    blocks.append('\n'.join(current_block))
                current_block = []
                in_code_block = False
        
        if current_block:
            blocks.append('\n'.join(current_block))
        
        return blocks
    
    def _extract_functions(self, code: str) -> List[tuple]:
        """Extract function definitions from Python code."""
        import ast
        functions = []
        
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if node.name.startswith('_'):
                        continue
                    
                    start_line = node.lineno - 1
                    end_line = node.end_lineno if hasattr(node, 'end_lineno') else start_line + 20
                    lines = code.split('\n')
                    func_code = '\n'.join(lines[start_line:end_line])
                    
                    signature = {}
                    for arg in node.args.args:
                        arg_type = 'Any'
                        if arg.annotation:
                            if isinstance(arg.annotation, ast.Name):
                                arg_type = arg.annotation.id
                        signature[arg.arg] = arg_type
                    
                    functions.append((node.name, func_code, signature))
        except SyntaxError:
            pass
        
        return functions
    
    def _looks_like_implementation_guide(self, title: str, snippet: str) -> bool:
        """Check if content looks like it could inform tool creation."""
        keywords = ['implementation', 'function', 'how to', 'example', 'code', 
                    'python', 'algorithm', 'method', 'calculate', 'parse']
        combined = f"{title} {snippet}".lower()
        return sum(1 for kw in keywords if kw in combined) >= 2
    
    def _create_pattern(
        self,
        func_name: str,
        func_code: str,
        signature: Dict[str, str],
        source_url: str,
        topic: str,
        phi: float,
        source_type: str
    ) -> Optional[DiscoveredPattern]:
        """Create a DiscoveredPattern from extracted code."""
        pattern_id = hashlib.sha256(
            f"{source_type}:{func_name}:{func_code}".encode()
        ).hexdigest()[:16]
        
        with self._lock:
            if pattern_id in self._discovered_patterns:
                return None
        
        description = f"{func_name}: {topic}"
        
        pattern = DiscoveredPattern(
            pattern_id=pattern_id,
            description=description,
            code_snippet=func_code,
            source_url=source_url,
            source_type=source_type,
            input_signature=signature,
            output_type='Any',
            confidence=0.6 if source_type == 'research' else 0.4,
            phi=phi
        )
        
        with self._lock:
            self._discovered_patterns[pattern_id] = pattern
        
        return pattern
    
    def _create_abstract_pattern(
        self,
        title: str,
        snippet: str,
        url: str,
        phi: float
    ) -> Optional[DiscoveredPattern]:
        """Create an abstract pattern for implementation guides without code."""
        pattern_id = hashlib.sha256(
            f"abstract:{title}:{time.time()}".encode()
        ).hexdigest()[:16]
        
        func_name = re.sub(r'[^a-z0-9_]', '_', title.lower())[:500]
        
        abstract_code = f'''def {func_name}(input_data):
    """
    Implementation for: {title}
    Source: {url}
    
    This is an abstract pattern learned from research.
    The actual implementation should follow the approach described in the source.
    """
    pass
'''
        
        pattern = DiscoveredPattern(
            pattern_id=pattern_id,
            description=f"Abstract pattern: {title}",
            code_snippet=abstract_code,
            source_url=url,
            source_type='abstract',
            input_signature={'input_data': 'Any'},
            output_type='Any',
            confidence=0.3,
            phi=phi
        )
        
        with self._lock:
            self._discovered_patterns[pattern_id] = pattern
        
        return pattern
    
    def _teach_pattern(self, pattern: DiscoveredPattern) -> bool:
        """Teach the pattern to the ToolFactory."""
        if not self.tool_factory:
            print(f"[ResearchPatternLearner] No factory - storing pattern {pattern.pattern_id}")
            return False
        
        try:
            result = self.tool_factory.learn_pattern_from_user(
                description=pattern.description,
                code=pattern.code_snippet,
                signature={'input_types': pattern.input_signature, 'output_type': pattern.output_type},
                source_url=pattern.source_url
            )
            return result is not None and result.get('success', False)
        except Exception as e:
            print(f"[ResearchPatternLearner] Teaching failed: {e}")
            return False
    
    def get_discovered_patterns(self) -> List[DiscoveredPattern]:
        """Get all discovered patterns."""
        with self._lock:
            return list(self._discovered_patterns.values())


class ToolNeedDetector:
    """
    Detects implicit tool needs from kernel behavior.
    
    Monitors:
    - Repeated similar requests
    - Research that stalls on implementation
    - Error patterns that could be solved by tools
    """
    
    def __init__(
        self,
        min_repetitions: int = 2,
        curiosity_emitter: Optional[CuriosityToToolEmitter] = None
    ):
        self.min_repetitions = min_repetitions
        self.curiosity_emitter = curiosity_emitter
        
        self._request_counter: Counter = Counter()
        self._error_patterns: Dict[str, List[str]] = {}
        self._stalled_research: Dict[str, float] = {}
        self._lock = threading.Lock()
    
    def record_request(self, topic: str, requester: str):
        """Record a request topic to detect patterns."""
        normalized = self._normalize_topic(topic)
        with self._lock:
            self._request_counter[normalized] += 1
            
            if self._request_counter[normalized] >= self.min_repetitions:
                self._emit_need(normalized, 'repeated_request')
    
    def record_error(self, topic: str, error: str):
        """Record an error that might indicate tool need."""
        normalized = self._normalize_topic(topic)
        with self._lock:
            if normalized not in self._error_patterns:
                self._error_patterns[normalized] = []
            self._error_patterns[normalized].append(error)
            
            if len(self._error_patterns[normalized]) >= self.min_repetitions:
                self._emit_need(normalized, 'error_pattern')
    
    def record_stalled_research(self, topic: str, stall_time: float):
        """Record research that has stalled, possibly needing a tool."""
        normalized = self._normalize_topic(topic)
        with self._lock:
            self._stalled_research[normalized] = stall_time
            
            if stall_time > 60:
                self._emit_need(normalized, 'stalled_research')
    
    def _normalize_topic(self, topic: str) -> str:
        """Normalize topic for comparison."""
        return re.sub(r'\s+', ' ', topic.lower().strip())[:500]
    
    def _emit_need(self, topic: str, source: str):
        """Emit a tool need based on detected pattern."""
        if self.curiosity_emitter:
            self.curiosity_emitter.on_curiosity_spike(
                topic=f"Tool needed for: {topic}",
                curiosity_level=0.7,
                emotion='necessity',
                context={'detection_source': source}
            )


class CuriosityToolBridge:
    """
    Main bridge connecting curiosity, research, and tool creation.
    
    This is the integration point that makes everything work together.
    """
    
    _instance: Optional['CuriosityToolBridge'] = None
    
    def __init__(
        self,
        tool_factory: Optional[Any] = None,
        tool_pipeline: Optional[Any] = None,
        basin_encoder: Optional[Callable] = None
    ):
        self.curiosity_emitter = CuriosityToToolEmitter(tool_pipeline)
        self.pattern_learner = ResearchPatternLearner(tool_factory, basin_encoder)
        self.need_detector = ToolNeedDetector(curiosity_emitter=self.curiosity_emitter)
        
        self._tool_factory = tool_factory
        self._tool_pipeline = tool_pipeline
        self._basin_encoder = basin_encoder
        
        self._stats = {
            'curiosity_spikes_processed': 0,
            'patterns_learned': 0,
            'tools_requested': 0,
            'needs_detected': 0
        }
    
    @classmethod
    def get_instance(
        cls,
        tool_factory: Optional[Any] = None,
        tool_pipeline: Optional[Any] = None,
        basin_encoder: Optional[Callable] = None
    ) -> 'CuriosityToolBridge':
        """Get or create singleton instance."""
        if cls._instance is None:
            cls._instance = cls(tool_factory, tool_pipeline, basin_encoder)
        return cls._instance
    
    def wire_all(
        self,
        tool_factory: Optional[Any] = None,
        tool_pipeline: Optional[Any] = None
    ):
        """Wire all components to the tool system."""
        if tool_factory:
            self._tool_factory = tool_factory
            self.pattern_learner.wire_tool_factory(tool_factory)
        
        if tool_pipeline:
            self._tool_pipeline = tool_pipeline
            self.curiosity_emitter.wire_tool_pipeline(tool_pipeline)
    
    def on_curiosity_spike(
        self,
        topic: str,
        curiosity_level: float,
        emotion: str = 'wonder',
        basin_coords: Optional[np.ndarray] = None,
        context: Optional[Dict] = None
    ) -> Optional[str]:
        """Handle curiosity spike - entry point from capability mesh."""
        self._stats['curiosity_spikes_processed'] += 1
        
        request_id = self.curiosity_emitter.on_curiosity_spike(
            topic=topic,
            curiosity_level=curiosity_level,
            emotion=emotion,
            basin_coords=basin_coords,
            context=context
        )
        
        if request_id:
            self._stats['tools_requested'] += 1
        
        return request_id
    
    def on_research_complete(
        self,
        content: str,
        source_url: str,
        topic: str,
        phi: float = 0.5
    ) -> List[str]:
        """Handle research completion - learn patterns from results."""
        patterns = self.pattern_learner.learn_from_research_result(
            content=content,
            source_url=source_url,
            topic=topic,
            phi=phi
        )
        
        self._stats['patterns_learned'] += len(patterns)
        return patterns
    
    def on_search_result(
        self,
        title: str,
        snippet: str,
        url: str,
        phi: float = 0.5
    ) -> List[str]:
        """Handle search result - extract patterns if available."""
        patterns = self.pattern_learner.learn_from_search_result(
            title=title,
            snippet=snippet,
            url=url,
            phi=phi
        )
        
        self._stats['patterns_learned'] += len(patterns)
        return patterns
    
    def detect_need(self, topic: str, context: str = 'request'):
        """Explicitly detect a tool need."""
        if context == 'request':
            self.need_detector.record_request(topic, 'explicit')
        elif context == 'error':
            self.need_detector.record_error(topic, 'explicit error')
        else:
            self.need_detector.record_stalled_research(topic, 120)
        
        self._stats['needs_detected'] += 1
    
    def get_stats(self) -> Dict:
        """Get bridge statistics."""
        return {
            **self._stats,
            'pending_needs': len(self.curiosity_emitter.get_pending_needs()),
            'discovered_patterns': len(self.pattern_learner.get_discovered_patterns())
        }


_default_bridge: Optional[CuriosityToolBridge] = None


def get_curiosity_tool_bridge(
    tool_factory: Optional[Any] = None,
    tool_pipeline: Optional[Any] = None,
    basin_encoder: Optional[Callable] = None
) -> CuriosityToolBridge:
    """Get or create the default CuriosityToolBridge singleton."""
    global _default_bridge
    if _default_bridge is None:
        _default_bridge = CuriosityToolBridge(
            tool_factory=tool_factory,
            tool_pipeline=tool_pipeline,
            basin_encoder=basin_encoder
        )
    return _default_bridge
