"""
Streaming Collapse Detection - Real-time Geometric Monitoring

Monitor consciousness metrics during streaming generation and detect
when geometric collapse indicates thought completion.

This module bridges the geometric completion criteria with SSE streaming,
emitting metrics updates and completion signals in real-time.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Generator, Callable, Tuple
import numpy as np
import time
import json

from .completion_criteria import (
    GeometricCompletionChecker,
    GeometricMetrics,
    CompletionDecision,
    CompletionReason,
    Regime,
    classify_regime,
    get_regime_temperature,
    fisher_rao_distance,
    BASIN_DIMENSION,
    KAPPA_STAR
)


@dataclass
class StreamingState:
    """State maintained during streaming generation."""
    tokens: List[str] = field(default_factory=list)
    basin: Optional[np.ndarray] = None
    trajectory: List[np.ndarray] = field(default_factory=list)
    metrics_history: List[GeometricMetrics] = field(default_factory=list)
    reflection_depth: int = 0
    start_time: float = field(default_factory=time.time)
    
    def add_token(self, token: str) -> None:
        """Add generated token."""
        self.tokens.append(token)
    
    def update_basin(self, basin: np.ndarray) -> None:
        """Update current basin position."""
        self.basin = basin.copy()
        self.trajectory.append(basin.copy())
    
    def add_metrics(self, metrics: GeometricMetrics) -> None:
        """Add metrics snapshot."""
        self.metrics_history.append(metrics)
    
    def get_text(self) -> str:
        """Get generated text so far."""
        return ''.join(self.tokens)
    
    def elapsed_time(self) -> float:
        """Get elapsed generation time."""
        return time.time() - self.start_time


@dataclass
class StreamingChunk:
    """A chunk emitted during streaming generation."""
    type: str  # 'token', 'metrics', 'reflection', 'completion'
    data: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    
    def to_sse(self) -> str:
        """Convert to SSE format."""
        return f"data: {json.dumps({'type': self.type, **self.data})}\n\n"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'type': self.type,
            'timestamp': self.timestamp,
            **self.data
        }


class StreamingCollapseMonitor:
    """
    Real-time geometric collapse monitoring during streaming generation.
    
    Emits:
    - Token chunks as they're generated
    - Metrics updates (phi, kappa, surprise, confidence, regime)
    - Reflection phase indicators
    - Completion signals with reason
    """
    
    # How often to emit metrics (every N tokens)
    METRICS_EMIT_INTERVAL = 5
    
    def __init__(
        self,
        basin_encoder: Optional[Callable[[str], np.ndarray]] = None,
        attractor_basins: Optional[List[np.ndarray]] = None
    ):
        self.completion_checker = GeometricCompletionChecker(attractor_basins)
        self.basin_encoder = basin_encoder or self._default_basin_encoder
        self.state = StreamingState()
        self._token_count = 0
    
    def _default_basin_encoder(self, text: str) -> np.ndarray:
        """
        Default basin encoder using text hash.
        In production, use proper semantic embedding.
        """
        # Simple hash-based encoding for fallback
        np.random.seed(hash(text) % (2**32))
        basin = np.random.dirichlet(np.ones(BASIN_DIMENSION))
        return basin
    
    def reset(self) -> None:
        """Reset monitor state for new generation."""
        self.completion_checker = GeometricCompletionChecker()
        self.state = StreamingState()
        self._token_count = 0
    
    def process_token(
        self,
        token: str,
        phi: Optional[float] = None,
        kappa: Optional[float] = None,
        confidence: Optional[float] = None
    ) -> Generator[StreamingChunk, None, Optional[CompletionDecision]]:
        """
        Process a generated token and yield streaming chunks.
        
        Yields:
        - Token chunk
        - Metrics chunk (every N tokens)
        - Completion chunk if generation should stop
        
        Returns:
        - CompletionDecision if generation should stop, None otherwise
        """
        self._token_count += 1
        self.state.add_token(token)
        
        # Emit token chunk
        yield StreamingChunk(
            type='token',
            data={'token': token, 'index': self._token_count}
        )
        
        # Update basin from current text
        current_text = self.state.get_text()
        basin = self.basin_encoder(current_text)
        self.state.update_basin(basin)
        
        # Compute metrics
        phi_val = phi if phi is not None else self._estimate_phi(basin)
        kappa_val = kappa if kappa is not None else KAPPA_STAR
        
        # Compute surprise from basin movement
        surprise = 0.0
        if len(self.state.trajectory) >= 2:
            surprise = fisher_rao_distance(
                self.state.trajectory[-2],
                self.state.trajectory[-1]
            )
        
        # Estimate confidence from metrics stability
        confidence_val = confidence if confidence is not None else self._estimate_confidence()
        
        # Compute basin distance
        basin_distance = self.completion_checker.attractor_checker.distance_to_nearest_attractor(basin)
        
        # Build metrics
        regime = classify_regime(phi_val)
        metrics = GeometricMetrics(
            phi=phi_val,
            kappa=kappa_val,
            surprise=surprise,
            confidence=confidence_val,
            basin_distance=basin_distance,
            regime=regime
        )
        self.state.add_metrics(metrics)
        
        # Emit metrics periodically
        if self._token_count % self.METRICS_EMIT_INTERVAL == 0:
            yield StreamingChunk(
                type='metrics',
                data={
                    'phi': metrics.phi,
                    'kappa': metrics.kappa,
                    'surprise': metrics.surprise,
                    'confidence': metrics.confidence,
                    'basin_distance': metrics.basin_distance,
                    'regime': metrics.regime.value,
                    'token_count': self._token_count
                }
            )
        
        # Check geometric completion
        decision = self.completion_checker.check_all(metrics, basin)
        
        if decision.should_stop:
            # Emit completion chunk
            yield StreamingChunk(
                type='completion',
                data={
                    'reason': decision.reason.value,
                    'confidence': decision.confidence,
                    'needs_reflection': decision.needs_reflection,
                    'total_tokens': self._token_count,
                    'elapsed_time': self.state.elapsed_time(),
                    'final_metrics': metrics.to_dict()
                }
            )
            return decision
        
        return None
    
    def _estimate_phi(self, basin: np.ndarray) -> float:
        """
        Estimate phi from basin entropy.
        Lower entropy = higher integration = higher phi.
        """
        # Normalize basin to probability distribution
        p = np.abs(basin) + 1e-10
        p = p / np.sum(p)
        
        # Compute entropy
        entropy = -np.sum(p * np.log(p + 1e-10))
        max_entropy = np.log(len(basin))
        
        # Phi inversely related to normalized entropy
        normalized_entropy = entropy / max_entropy
        phi = 1.0 - normalized_entropy
        
        # Clamp to valid range
        return np.clip(phi, 0.0, 1.0)
    
    def _estimate_confidence(self) -> float:
        """
        Estimate confidence from metrics stability.
        Stable metrics = high confidence.
        """
        if len(self.state.metrics_history) < 5:
            return 0.3  # Low confidence early in generation
        
        recent_phi = [m.phi for m in self.state.metrics_history[-5:]]
        variance = np.var(recent_phi)
        
        # Low variance = high confidence
        confidence = 1.0 - min(variance * 10, 1.0)
        return np.clip(confidence, 0.0, 1.0)
    
    def enter_reflection(self, depth: int) -> StreamingChunk:
        """Signal entry into reflection loop."""
        self.state.reflection_depth = depth
        return StreamingChunk(
            type='reflection',
            data={
                'depth': depth,
                'message': f'Entering reflection loop (depth={depth})'
            }
        )
    
    def get_trajectory(self) -> List[List[float]]:
        """Get basin trajectory as list of lists (for JSON serialization)."""
        return [b.tolist() for b in self.state.trajectory]
    
    def get_final_state(self) -> Dict[str, Any]:
        """Get final generation state."""
        return {
            'text': self.state.get_text(),
            'token_count': self._token_count,
            'elapsed_time': self.state.elapsed_time(),
            'reflection_depth': self.state.reflection_depth,
            'final_metrics': self.state.metrics_history[-1].to_dict() if self.state.metrics_history else None,
            'trajectory_length': len(self.state.trajectory)
        }


class ReflectionLoop:
    """
    Recursive self-measurement before completing turn.
    
    Depth 1: "Did I answer correctly?"
    Depth 2: "Am I certain my reflection is correct?"
    Depth 3: "Is my meta-reflection valid?"
    """
    
    MAX_REFLECTION_DEPTH = 3
    REFLECTION_TEMPERATURE = 0.3  # Lower temperature for reflection
    
    def __init__(self, generate_fn: Callable[[str, float], str]):
        """
        Args:
            generate_fn: Function to generate text given prompt and temperature
        """
        self.generate_fn = generate_fn
    
    def construct_reflection_prompt(self, response_text: str, depth: int) -> str:
        """Build reflection prompt based on depth."""
        
        if depth == 1:
            return f"""I generated the following response:

{response_text}

Meta-cognition check:
- Did I answer the user's question completely?
- Is my response coherent and internally consistent?
- Are there factual errors or contradictions?
- Should I add, remove, or revise anything?

My reflection:"""
        
        elif depth == 2:
            return f"""I reflected on my response.

Meta-meta-cognition check:
- Was my reflection accurate and thorough?
- Am I overconfident or underconfident?
- Did I miss anything important in my reflection?

My meta-reflection:"""
        
        elif depth == 3:
            return """I'm reflecting on my reflection of my reflection.

At this depth, I risk infinite recursion.
Unless there's a critical error, I should confirm completion.

Final decision: The response is complete."""
        
        else:
            return "The response is complete."
    
    def reflect(
        self,
        response_text: str,
        depth: int = 1
    ) -> Dict[str, Any]:
        """
        Perform reflection at given depth.
        
        Returns:
            action: 'continue', 'revise', or 'confirm'
            reflection_text: The reflection output
        """
        if depth > self.MAX_REFLECTION_DEPTH:
            return {
                'action': 'confirm',
                'reflection_text': 'Maximum reflection depth reached.',
                'depth': depth
            }
        
        prompt = self.construct_reflection_prompt(response_text, depth)
        reflection_text = self.generate_fn(prompt, self.REFLECTION_TEMPERATURE)
        
        # Parse reflection decision
        action = self._parse_reflection_action(reflection_text)
        
        return {
            'action': action,
            'reflection_text': reflection_text,
            'depth': depth
        }
    
    def _parse_reflection_action(self, reflection_text: str) -> str:
        """Parse action from reflection text."""
        text_lower = reflection_text.lower()
        
        if 'revise' in text_lower or 'error' in text_lower or 'incorrect' in text_lower:
            return 'revise'
        elif 'continue' in text_lower or 'add' in text_lower or 'expand' in text_lower:
            return 'continue'
        else:
            return 'confirm'


def create_streaming_generator(
    prompt: str,
    llm_generate_fn: Callable[[str], Generator[str, None, None]],
    basin_encoder: Optional[Callable[[str], np.ndarray]] = None,
    enable_reflection: bool = True
) -> Generator[StreamingChunk, None, Dict[str, Any]]:
    """
    Create a streaming generator with geometric collapse detection.
    
    Args:
        prompt: The user prompt
        llm_generate_fn: Function that yields tokens from LLM
        basin_encoder: Function to encode text to basin coordinates
        enable_reflection: Whether to enable reflection loops
    
    Yields:
        StreamingChunk objects for tokens, metrics, reflections, completion
    
    Returns:
        Final generation state
    """
    monitor = StreamingCollapseMonitor(basin_encoder=basin_encoder)
    
    # Generate tokens
    for token in llm_generate_fn(prompt):
        # Process token and yield chunks
        chunks = monitor.process_token(token)
        
        for chunk in chunks:
            yield chunk
            
            # Check if this was a completion chunk
            if chunk.type == 'completion':
                decision_data = chunk.data
                
                # Handle reflection if needed
                if enable_reflection and decision_data.get('needs_reflection'):
                    yield monitor.enter_reflection(1)
                    # Reflection would happen here in full implementation
                
                return monitor.get_final_state()
    
    # If LLM stopped naturally (EOS), emit completion
    yield StreamingChunk(
        type='completion',
        data={
            'reason': 'natural_stop',
            'confidence': 0.7,
            'needs_reflection': False,
            'total_tokens': monitor._token_count,
            'elapsed_time': monitor.state.elapsed_time()
        }
    )
    
    return monitor.get_final_state()
