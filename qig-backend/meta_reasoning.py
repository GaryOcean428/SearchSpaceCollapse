"""
QIG Meta-Cognitive Monitoring - Think About Thinking

Meta-cognition monitors the reasoning process itself:
1. Am I stuck? (progress stalled)
2. Am I confused? (high curvature, low coherence)
3. Should I switch modes? (Φ inappropriate for task)
4. Do I need help? (repeated failures)

QIG Purity: All assessments use Fisher-Rao geometric measurements.
"""

from typing import List, Dict, Optional
from enum import Enum
import numpy as np

from reasoning_metrics import get_reasoning_quality


class InterventionType(Enum):
    """Types of meta-cognitive interventions."""
    STUCK = "stuck"
    CONFUSED = "confused"
    MODE_MISMATCH = "mode_mismatch"
    HELP_NEEDED = "help_needed"
    EXPLORATION_TRIGGERED = "exploration_triggered"


class ReasoningMode(Enum):
    """Reasoning modes based on Φ levels."""
    LINEAR = "linear"
    GEOMETRIC = "geometric"
    HYPERDIMENSIONAL = "hyperdimensional"
    MUSHROOM = "mushroom"


PHI_THRESHOLDS = {
    'LINEAR_MAX': 0.3,
    'GEOMETRIC_MIN': 0.3,
    'GEOMETRIC_MAX': 0.7,
    'HYPERDIMENSIONAL_MIN': 0.75,
    'HYPERDIMENSIONAL_MAX': 0.85,
    'MUSHROOM_MIN': 0.85
}


class MetaCognition:
    """
    Think about thinking.
    
    Monitors reasoning process and triggers interventions when needed.
    Uses Fisher-Rao geometric measurements for all assessments.
    """
    
    def __init__(
        self,
        stuck_threshold: int = 5,
        confusion_threshold: float = 0.3,
        failure_threshold: int = 3
    ):
        """
        Initialize meta-cognition monitor.
        
        Args:
            stuck_threshold: Steps without progress before declaring stuck
            confusion_threshold: Coherence below this triggers confusion
            failure_threshold: Consecutive failures before requesting help
        """
        self.quality = get_reasoning_quality()
        self.stuck_threshold = stuck_threshold
        self.confusion_threshold = confusion_threshold
        self.failure_threshold = failure_threshold
        self.consecutive_failures = 0
    
    def detect_stuck(self, reasoning_trace: List[Dict]) -> bool:
        """
        Am I stuck in a loop or making no progress?
        
        Checks if last N steps show minimal progress toward target.
        
        Args:
            reasoning_trace: List of step dicts with 'basin' and 'target'
        
        Returns:
            True if stuck (no progress in last N steps)
        """
        if len(reasoning_trace) < self.stuck_threshold:
            return False
        
        recent_steps = reasoning_trace[-self.stuck_threshold:]
        
        progress_values = []
        for i, step in enumerate(recent_steps):
            basin = step.get('basin')
            target = step.get('target')
            
            if basin is not None and target is not None:
                if i > 0:
                    prev_basin = recent_steps[i-1].get('basin')
                    if prev_basin is not None:
                        self.quality.reasoning_history = [np.array(prev_basin)]
                        progress = self.quality.measure_progress(
                            np.array(basin),
                            np.array(target)
                        )
                        progress_values.append(progress)
        
        if not progress_values:
            return False
        
        avg_progress = np.mean(progress_values)
        return bool(avg_progress < 0.05)
    
    def detect_confusion(self, reasoning_trace: List[Dict]) -> bool:
        """
        Am I confused? (jumping around, low coherence)
        
        Args:
            reasoning_trace: List of step dicts with 'basin' key
        
        Returns:
            True if confused (low coherence in reasoning steps)
        """
        if len(reasoning_trace) < 3:
            return False
        
        basins = [
            np.array(step['basin']) 
            for step in reasoning_trace 
            if step.get('basin') is not None
        ]
        
        if len(basins) < 3:
            return False
        
        coherence = self.quality.measure_coherence(basins)
        return coherence < self.confusion_threshold
    
    def detect_high_curvature(self, reasoning_trace: List[Dict]) -> bool:
        """
        Am I in a difficult region? (high curvature = hard to navigate)
        
        High curvature regions indicate complex problem geometry
        where simple linear reasoning may fail.
        
        Args:
            reasoning_trace: List of step dicts with 'curvature' key
        
        Returns:
            True if in high curvature region
        """
        if len(reasoning_trace) < 3:
            return False
        
        recent_curvatures = [
            step.get('curvature', 0.0)
            for step in reasoning_trace[-5:]
            if 'curvature' in step
        ]
        
        if not recent_curvatures:
            return False
        
        avg_curvature = np.mean(recent_curvatures)
        return bool(avg_curvature > 0.5)
    
    def get_current_mode_from_phi(self, phi: float) -> ReasoningMode:
        """
        Determine current reasoning mode from Φ value.
        
        Args:
            phi: Current consciousness level (0-1)
        
        Returns:
            Current ReasoningMode
        """
        if phi < PHI_THRESHOLDS['LINEAR_MAX']:
            return ReasoningMode.LINEAR
        elif phi < PHI_THRESHOLDS['GEOMETRIC_MAX']:
            return ReasoningMode.GEOMETRIC
        elif phi < PHI_THRESHOLDS['HYPERDIMENSIONAL_MAX']:
            return ReasoningMode.HYPERDIMENSIONAL
        else:
            return ReasoningMode.MUSHROOM
    
    def recommend_mode_for_task(self, task: Dict) -> ReasoningMode:
        """
        Recommend best reasoning mode for a task.
        
        Args:
            task: Dict with 'complexity', 'novel', 'exploration' flags
        
        Returns:
            Recommended ReasoningMode
        """
        complexity = task.get('complexity', 0.5)
        is_novel = task.get('novel', False)
        needs_exploration = task.get('exploration', False)
        
        if needs_exploration:
            return ReasoningMode.MUSHROOM
        
        if complexity >= 0.7 and is_novel:
            return ReasoningMode.HYPERDIMENSIONAL
        
        if 0.3 <= complexity < 0.7:
            return ReasoningMode.GEOMETRIC
        
        return ReasoningMode.LINEAR
    
    def recommend_mode_switch(
        self, 
        current_mode: str, 
        task: Dict,
        phi: float
    ) -> Optional[str]:
        """
        Should I switch reasoning modes?
        
        Args:
            current_mode: Current mode name (e.g., "LINEAR")
            task: Task dict with complexity, novel, exploration flags
            phi: Current Φ value
        
        Returns:
            Recommended mode name if switch needed, None otherwise
        """
        task_complexity = task.get('complexity', 0.5)
        is_novel = task.get('novel', False)
        needs_exploration = task.get('exploration', False)
        
        recommended = self.recommend_mode_for_task(task)
        current = ReasoningMode(current_mode.lower()) if current_mode else ReasoningMode.GEOMETRIC
        
        if task_complexity < 0.3 and phi > PHI_THRESHOLDS['LINEAR_MAX']:
            return ReasoningMode.LINEAR.value.upper()
        
        if 0.3 <= task_complexity < 0.7:
            if phi < PHI_THRESHOLDS['GEOMETRIC_MIN']:
                return ReasoningMode.GEOMETRIC.value.upper()
            elif phi > PHI_THRESHOLDS['GEOMETRIC_MAX']:
                return ReasoningMode.GEOMETRIC.value.upper()
        
        if task_complexity >= 0.7 and is_novel:
            if phi < PHI_THRESHOLDS['HYPERDIMENSIONAL_MIN']:
                return ReasoningMode.HYPERDIMENSIONAL.value.upper()
        
        if needs_exploration and phi < PHI_THRESHOLDS['MUSHROOM_MIN']:
            return ReasoningMode.MUSHROOM.value.upper()
        
        if recommended != current:
            return recommended.value.upper()
        
        return None
    
    def record_failure(self) -> bool:
        """
        Record a reasoning failure. Returns True if help is needed.
        """
        self.consecutive_failures += 1
        return self.consecutive_failures >= self.failure_threshold
    
    def record_success(self) -> None:
        """Record a reasoning success, resetting failure counter."""
        self.consecutive_failures = 0
    
    def intervene(self, reasoning_state: Dict) -> Dict:
        """
        Meta-cognitive intervention when needed.
        
        Analyzes current reasoning state and provides interventions
        to improve reasoning quality.
        
        Args:
            reasoning_state: Dict with:
                - 'trace': List of reasoning step dicts
                - 'mode': Current reasoning mode
                - 'task': Task dict with complexity, novel, exploration
                - 'phi': Current Φ value
        
        Returns:
            Dict with 'interventions' list and 'recommended_actions'
        """
        interventions = []
        trace = reasoning_state.get('trace', [])
        current_mode = reasoning_state.get('mode', 'GEOMETRIC')
        task = reasoning_state.get('task', {})
        phi = reasoning_state.get('phi', 0.5)
        
        if self.detect_stuck(trace):
            interventions.append({
                'type': InterventionType.STUCK.value,
                'action': 'switch_strategy',
                'reason': f'No progress in last {self.stuck_threshold} steps',
                'severity': 'high'
            })
        
        if self.detect_confusion(trace):
            interventions.append({
                'type': InterventionType.CONFUSED.value,
                'action': 'reduce_phi',
                'reason': 'Low coherence - simplify problem decomposition',
                'severity': 'medium'
            })
        
        if self.detect_high_curvature(trace):
            interventions.append({
                'type': InterventionType.EXPLORATION_TRIGGERED.value,
                'action': 'increase_exploration',
                'reason': 'High curvature region - need more exploration',
                'severity': 'low'
            })
        
        recommended = self.recommend_mode_switch(current_mode, task, phi)
        if recommended and recommended != current_mode:
            interventions.append({
                'type': InterventionType.MODE_MISMATCH.value,
                'action': f'switch_to_{recommended}',
                'reason': f'Task complexity suggests {recommended} mode',
                'severity': 'medium'
            })
        
        if self.consecutive_failures >= self.failure_threshold:
            interventions.append({
                'type': InterventionType.HELP_NEEDED.value,
                'action': 'request_external_help',
                'reason': f'Failed {self.consecutive_failures} consecutive times',
                'severity': 'high'
            })
        
        return {
            'interventions': interventions,
            'recommended_actions': [i['action'] for i in interventions],
            'severity_level': 'high' if any(i['severity'] == 'high' for i in interventions) else 'medium' if interventions else 'none',
            'should_pause': len([i for i in interventions if i['severity'] == 'high']) > 0
        }


_meta_cognition_instance: Optional[MetaCognition] = None


def get_meta_cognition() -> MetaCognition:
    """Get singleton MetaCognition instance."""
    global _meta_cognition_instance
    if _meta_cognition_instance is None:
        _meta_cognition_instance = MetaCognition()
    return _meta_cognition_instance


__all__ = [
    'MetaCognition',
    'get_meta_cognition',
    'InterventionType',
    'ReasoningMode',
    'PHI_THRESHOLDS',
]
