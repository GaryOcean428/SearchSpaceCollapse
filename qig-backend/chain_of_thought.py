"""
QIG Chain-of-Thought Tracing - Geometric Reasoning Visualization

Makes reasoning visible by tracing basin trajectories:
- Each thought = basin state + verbal explanation
- Distance from previous step (Fisher-Rao)
- Local curvature (difficulty indicator)
- Human-readable rendering

QIG Purity: All measurements use Fisher-Rao geometry.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
import numpy as np
import time
import json

from qig_geometry import (
    fisher_coord_distance, 
    estimate_manifold_curvature
)
from reasoning_metrics import get_reasoning_quality


@dataclass
class ThoughtStep:
    """A single step in the chain of thought."""
    step: int
    basin: np.ndarray
    thought: str
    distance_from_prev: float
    curvature: float
    difficulty: str
    timestamp: float
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """Convert to serializable dictionary."""
        return {
            'step': self.step,
            'basin': self.basin.tolist() if isinstance(self.basin, np.ndarray) else self.basin,
            'thought': self.thought,
            'distance_from_prev': float(self.distance_from_prev),
            'curvature': float(self.curvature),
            'difficulty': self.difficulty,
            'timestamp': self.timestamp,
            'metadata': self.metadata
        }


class GeometricChainOfThought:
    """
    Trace reasoning through basin space.
    
    Each thought = basin state + verbal explanation
    Provides full geometric telemetry for reasoning transparency.
    """
    
    CURVATURE_THRESHOLDS = {
        'low': 0.3,
        'medium': 0.6,
        'high': 1.0
    }
    
    def __init__(
        self, 
        basin_decoder: Optional[Callable[[np.ndarray], str]] = None,
        basin_dim: int = 64
    ):
        """
        Initialize chain-of-thought tracer.
        
        Args:
            basin_decoder: Optional function to decode basin to text
            basin_dim: Dimension of basin coordinates
        """
        self.basin_decoder = basin_decoder or self._default_decoder
        self.basin_dim = basin_dim
        self.thought_chain: List[ThoughtStep] = []
        self.quality_tracker = get_reasoning_quality()
    
    def _default_decoder(self, basin: np.ndarray) -> str:
        """
        Default basin decoder - shows geometric properties.
        
        QIG PURITY: Uses Fisher-Rao distance from origin instead of Euclidean norm.
        """
        origin = np.zeros(self.basin_dim)
        fisher_distance = fisher_coord_distance(basin, origin)
        
        local_curvature = 0.0
        if len(self.thought_chain) >= 2:
            recent_basins = [step.basin for step in self.thought_chain[-3:]]
            recent_basins.append(basin)
            points = np.array(recent_basins)
            local_curvature = estimate_manifold_curvature(points, basin)
        
        max_component = int(np.argmax(np.abs(basin)))
        
        return f"Basin state: d_FR={fisher_distance:.3f}, κ_local={local_curvature:.3f}, max_dim={max_component}"
    
    def _compute_local_curvature(
        self, 
        current_basin: np.ndarray,
        window_size: int = 5
    ) -> float:
        """
        Compute local curvature at current position.
        
        Uses recent points from chain to estimate manifold curvature.
        High curvature = difficult region to navigate.
        """
        if len(self.thought_chain) < 2:
            return 0.0
        
        recent_basins = [step.basin for step in self.thought_chain[-window_size:]]
        recent_basins.append(current_basin)
        
        points = np.array(recent_basins)
        curvature = estimate_manifold_curvature(points, current_basin)
        
        return float(curvature)
    
    def _classify_difficulty(self, curvature: float) -> str:
        """Classify difficulty based on curvature."""
        if curvature < self.CURVATURE_THRESHOLDS['low']:
            return 'low'
        elif curvature < self.CURVATURE_THRESHOLDS['medium']:
            return 'medium'
        else:
            return 'high'
    
    def think_step(
        self, 
        current_basin: np.ndarray,
        thought_text: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> ThoughtStep:
        """
        Record one reasoning step with full telemetry.
        
        Args:
            current_basin: Current basin coordinates
            thought_text: Optional verbal description of thought
            metadata: Optional additional metadata
        
        Returns:
            ThoughtStep with geometric properties
        """
        current_basin = np.array(current_basin)
        step_number = len(self.thought_chain) + 1
        
        if self.thought_chain:
            prev_basin = self.thought_chain[-1].basin
            step_distance = fisher_coord_distance(prev_basin, current_basin)
        else:
            step_distance = 0.0
        
        curvature = self._compute_local_curvature(current_basin)
        difficulty = self._classify_difficulty(curvature)
        
        if thought_text is None:
            thought_text = self.basin_decoder(current_basin)
        
        step_record = ThoughtStep(
            step=step_number,
            basin=current_basin,
            thought=thought_text,
            distance_from_prev=step_distance,
            curvature=curvature,
            difficulty=difficulty,
            timestamp=time.time(),
            metadata=metadata or {}
        )
        
        self.thought_chain.append(step_record)
        self.quality_tracker.add_to_history(current_basin)
        
        return step_record
    
    def add_thought(
        self,
        basin: np.ndarray,
        thought: str,
        **metadata
    ) -> ThoughtStep:
        """Convenience method to add a thought with text."""
        return self.think_step(basin, thought_text=thought, metadata=metadata)
    
    def render_chain(self, include_basins: bool = False) -> str:
        """
        Human-readable chain-of-thought rendering.
        
        Args:
            include_basins: Whether to include raw basin vectors
        
        Returns:
            Formatted string representation of reasoning chain
        """
        output = "=== Reasoning Trace ===\n\n"
        
        for step in self.thought_chain:
            output += f"Step {step.step}:\n"
            output += f"  Thought: {step.thought}\n"
            output += f"  Geometry: distance={step.distance_from_prev:.3f}, "
            output += f"curvature={step.curvature:.3f} ({step.difficulty})\n"
            
            if include_basins:
                basin_preview = step.basin[:5].tolist()
                output += f"  Basin preview: {basin_preview}...\n"
            
            if step.metadata:
                output += f"  Metadata: {step.metadata}\n"
            
            output += "\n"
        
        total_distance = sum(s.distance_from_prev for s in self.thought_chain)
        avg_curvature = np.mean([s.curvature for s in self.thought_chain]) if self.thought_chain else 0
        
        difficulties = [s.difficulty for s in self.thought_chain]
        high_difficulty_count = difficulties.count('high')
        
        output += "=== Summary ===\n"
        output += f"Total steps: {len(self.thought_chain)}\n"
        output += f"Total Fisher-Rao distance: {total_distance:.3f}\n"
        output += f"Average curvature: {avg_curvature:.3f}\n"
        output += f"High-difficulty steps: {high_difficulty_count}\n"
        
        if len(self.thought_chain) >= 2:
            basins = [s.basin for s in self.thought_chain]
            coherence = self.quality_tracker.measure_coherence(basins)
            output += f"Path coherence: {coherence:.3f}\n"
        
        return output
    
    def get_summary(self) -> Dict:
        """Get reasoning chain summary as dict."""
        if not self.thought_chain:
            return {
                'total_steps': 0,
                'total_distance': 0.0,
                'average_curvature': 0.0,
                'coherence': 1.0,
                'difficulty_distribution': {'low': 0, 'medium': 0, 'high': 0}
            }
        
        total_distance = sum(s.distance_from_prev for s in self.thought_chain)
        avg_curvature = np.mean([s.curvature for s in self.thought_chain])
        
        difficulty_dist = {'low': 0, 'medium': 0, 'high': 0}
        for step in self.thought_chain:
            difficulty_dist[step.difficulty] += 1
        
        basins = [s.basin for s in self.thought_chain]
        coherence = self.quality_tracker.measure_coherence(basins) if len(basins) >= 2 else 1.0
        
        return {
            'total_steps': len(self.thought_chain),
            'total_distance': float(total_distance),
            'average_curvature': float(avg_curvature),
            'coherence': float(coherence),
            'difficulty_distribution': difficulty_dist,
            'thoughts': [s.thought for s in self.thought_chain]
        }
    
    def to_json(self) -> str:
        """Export chain to JSON."""
        data = {
            'chain': [step.to_dict() for step in self.thought_chain],
            'summary': self.get_summary()
        }
        return json.dumps(data, indent=2)
    
    def clear(self) -> None:
        """Clear the thought chain for new reasoning session."""
        self.thought_chain = []
        self.quality_tracker.clear_history()
    
    def get_path(self) -> List[np.ndarray]:
        """Get basin path from chain."""
        return [step.basin for step in self.thought_chain]


class ReasoningTraceRecorder:
    """
    Record and persist reasoning traces for analysis.
    
    Integrates with PostgreSQL for long-term storage
    and analysis of reasoning patterns.
    """
    
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or f"session_{int(time.time())}"
        self.chains: List[GeometricChainOfThought] = []
        self.current_chain: Optional[GeometricChainOfThought] = None
    
    def start_new_chain(
        self, 
        problem_description: str,
        basin_decoder: Optional[Callable] = None
    ) -> GeometricChainOfThought:
        """Start a new reasoning chain."""
        chain = GeometricChainOfThought(basin_decoder=basin_decoder)
        chain.think_step(
            np.random.randn(64),
            thought_text=f"Starting: {problem_description}",
            metadata={'type': 'problem_start'}
        )
        
        self.current_chain = chain
        self.chains.append(chain)
        
        return chain
    
    def get_all_summaries(self) -> List[Dict]:
        """Get summaries of all recorded chains."""
        return [chain.get_summary() for chain in self.chains]
    
    def export_session(self) -> Dict:
        """Export entire session for persistence."""
        return {
            'session_id': self.session_id,
            'timestamp': time.time(),
            'chains': [
                {
                    'chain': [step.to_dict() for step in chain.thought_chain],
                    'summary': chain.get_summary()
                }
                for chain in self.chains
            ],
            'total_chains': len(self.chains),
            'total_thoughts': sum(len(c.thought_chain) for c in self.chains)
        }


_trace_recorder_instance: Optional[ReasoningTraceRecorder] = None


def get_trace_recorder(session_id: Optional[str] = None) -> ReasoningTraceRecorder:
    """Get or create trace recorder instance."""
    global _trace_recorder_instance
    if _trace_recorder_instance is None or (session_id and session_id != _trace_recorder_instance.session_id):
        _trace_recorder_instance = ReasoningTraceRecorder(session_id)
    return _trace_recorder_instance


__all__ = [
    'ThoughtStep',
    'GeometricChainOfThought',
    'ReasoningTraceRecorder',
    'get_trace_recorder',
]
