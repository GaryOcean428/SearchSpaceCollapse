"""
QIG Reasoning Metrics - Measure Reasoning Quality

Reasoning = Geodesic Navigation Through Basin Space

This module provides metrics for measuring how well the system is reasoning:
1. Geodesic Efficiency: How direct is the thought path?
2. Coherence: How consistent are the steps?
3. Novelty: Are we exploring vs exploiting?
4. Progress: Are we getting closer to goal?
5. Meta-awareness: Does system know when it's stuck?

QIG Purity: All distances computed using Fisher-Rao geometry.
"""

from typing import List, Dict, Optional, Tuple
import numpy as np
from qig_geometry import fisher_coord_distance, geodesic_interpolation


def find_geodesic(
    start: np.ndarray,
    end: np.ndarray,
    n_steps: int = 10
) -> List[np.ndarray]:
    """
    Find geodesic path between two basin coordinates.
    
    Uses spherical linear interpolation (slerp) which is the geodesic
    on the unit sphere (embedded Fisher manifold).
    
    Args:
        start: Starting basin coordinates (64D)
        end: Ending basin coordinates (64D)
        n_steps: Number of interpolation steps
    
    Returns:
        List of basin coordinates along geodesic path
    """
    if n_steps < 2:
        n_steps = 2
    
    path = []
    for i in range(n_steps):
        t = i / (n_steps - 1)
        point = geodesic_interpolation(start, end, t)
        path.append(point)
    
    return path


class ReasoningQuality:
    """
    Measure how well the system is reasoning.
    
    All measurements use Fisher-Rao geometry for QIG purity.
    
    Metrics:
    1. Geodesic Efficiency: How direct is the thought path?
    2. Coherence: How consistent are the steps?
    3. Novelty: Are we exploring vs exploiting?
    4. Meta-awareness: Does system know it's stuck?
    5. Progress: Are we getting closer to goal?
    """
    
    WEIGHTS = {
        'geodesic_efficiency': 0.3,
        'coherence': 0.2,
        'progress': 0.2,
        'meta_awareness': 0.3
    }
    
    def __init__(self):
        self.reasoning_history: List[np.ndarray] = []
    
    def add_to_history(self, basin: np.ndarray) -> None:
        """Add a basin to reasoning history."""
        self.reasoning_history.append(np.array(basin))
    
    def clear_history(self) -> None:
        """Clear reasoning history for new session."""
        self.reasoning_history = []
    
    def measure_geodesic_efficiency(
        self, 
        actual_path: List[np.ndarray],
        start_basin: np.ndarray,
        end_basin: np.ndarray
    ) -> float:
        """
        How efficient was the reasoning path?
        
        Efficiency = optimal_distance / actual_distance
        
        1.0 = perfect (followed geodesic exactly)
        <1.0 = inefficient (took detours)
        
        Args:
            actual_path: List of basin coordinates traversed
            start_basin: Starting basin
            end_basin: Ending basin
        
        Returns:
            Efficiency score (0 to 1)
        """
        if len(actual_path) < 2:
            return 1.0
        
        optimal_path = find_geodesic(
            np.array(start_basin), 
            np.array(end_basin), 
            n_steps=len(actual_path)
        )
        
        optimal_dist = sum(
            fisher_coord_distance(optimal_path[i], optimal_path[i+1])
            for i in range(len(optimal_path)-1)
        )
        
        actual_dist = sum(
            fisher_coord_distance(
                np.array(actual_path[i]), 
                np.array(actual_path[i+1])
            )
            for i in range(len(actual_path)-1)
        )
        
        if actual_dist < 1e-10:
            return 1.0
        
        efficiency = optimal_dist / (actual_dist + 1e-10)
        return float(min(efficiency, 1.0))
    
    def measure_coherence(self, reasoning_steps: List[np.ndarray]) -> float:
        """
        How coherent are the reasoning steps?
        
        Coherence = consistency of step sizes
        
        High coherence: Steady progress (low variance in step sizes)
        Low coherence: Jumping around (high variance in step sizes)
        
        Args:
            reasoning_steps: List of basin coordinates
        
        Returns:
            Coherence score (0 to 1)
        """
        if len(reasoning_steps) < 2:
            return 1.0
        
        step_distances = [
            fisher_coord_distance(
                np.array(reasoning_steps[i]), 
                np.array(reasoning_steps[i+1])
            )
            for i in range(len(reasoning_steps)-1)
        ]
        
        if not step_distances:
            return 1.0
        
        mean_step = np.mean(step_distances)
        std_step = np.std(step_distances)
        
        cv = std_step / (mean_step + 1e-10)
        coherence = 1.0 / (1.0 + cv)
        
        return float(coherence)
    
    def measure_novelty(self, current_basin: np.ndarray) -> float:
        """
        Is this a novel thought or revisiting old ground?
        
        Novelty = min Fisher-Rao distance to previous basins
        
        High novelty: Exploring new ideas
        Low novelty: Exploiting known territory
        
        Args:
            current_basin: Current basin coordinates
        
        Returns:
            Novelty score (0 to 1)
        """
        if not self.reasoning_history:
            return 1.0
        
        current = np.array(current_basin)
        distances = [
            fisher_coord_distance(current, prev_basin)
            for prev_basin in self.reasoning_history
        ]
        
        min_distance = min(distances)
        novelty = min(min_distance / 2.0, 1.0)
        
        return float(novelty)
    
    def measure_progress(
        self, 
        current_basin: np.ndarray,
        target_basin: np.ndarray
    ) -> float:
        """
        Are we getting closer to the goal?
        
        Progress = (previous_distance - current_distance) / previous_distance
        
        >0: Moving toward goal
        =0: No progress
        <0: Moving away from goal
        
        Args:
            current_basin: Current basin coordinates
            target_basin: Target/goal basin coordinates
        
        Returns:
            Progress score (-1 to 1)
        """
        current = np.array(current_basin)
        target = np.array(target_basin)
        
        current_distance = fisher_coord_distance(current, target)
        
        if not self.reasoning_history:
            return 0.0
        
        previous_distance = fisher_coord_distance(
            self.reasoning_history[-1], 
            target
        )
        
        if previous_distance < 1e-10:
            return 0.0
        
        progress = (previous_distance - current_distance) / (previous_distance + 1e-10)
        return float(np.clip(progress, -1.0, 1.0))
    
    def measure_meta_awareness(self, current_state: Dict) -> float:
        """
        Does the system know it's stuck/confused?
        
        Meta-awareness = correlation between:
        - Reported confidence
        - Actual reasoning quality
        
        High meta-awareness: Accurate self-assessment
        Low meta-awareness: Dunning-Kruger effect
        
        Args:
            current_state: Dict with 'confidence', 'path', 'start_basin', 
                          'current_basin', 'target_basin'
        
        Returns:
            Meta-awareness score (0 to 1)
        """
        reported_confidence = current_state.get('confidence', 0.5)
        
        path = current_state.get('path', [])
        start_basin = current_state.get('start_basin')
        current_basin = current_state.get('current_basin')
        target_basin = current_state.get('target_basin')
        
        quality_scores = []
        
        if path and start_basin is not None and current_basin is not None:
            efficiency = self.measure_geodesic_efficiency(
                path, 
                np.array(start_basin), 
                np.array(current_basin)
            )
            quality_scores.append(efficiency)
        
        if path:
            coherence = self.measure_coherence(path)
            quality_scores.append(coherence)
        
        if current_basin is not None and target_basin is not None:
            progress = self.measure_progress(
                np.array(current_basin),
                np.array(target_basin)
            )
            quality_scores.append(max(0, progress))
        
        if not quality_scores:
            return 0.5
        
        actual_quality = np.mean(quality_scores)
        
        meta_awareness = 1.0 - abs(reported_confidence - actual_quality)
        return float(meta_awareness)
    
    def comprehensive_assessment(self, reasoning_trace: Dict) -> Dict:
        """
        Full reasoning quality report.
        
        Args:
            reasoning_trace: Dict with:
                - 'path': List of basin coordinates traversed
                - 'start': Starting basin
                - 'end': Final basin reached
                - 'current': Current basin
                - 'target': Target/goal basin
                - 'confidence': Reported confidence (0-1)
        
        Returns:
            Dict with all quality metrics and overall score
        """
        path = reasoning_trace.get('path', [])
        start = reasoning_trace.get('start')
        end = reasoning_trace.get('end') or reasoning_trace.get('current')
        current = reasoning_trace.get('current')
        target = reasoning_trace.get('target')
        
        results = {}
        
        if path and start is not None and end is not None:
            results['geodesic_efficiency'] = self.measure_geodesic_efficiency(
                path,
                np.array(start),
                np.array(end)
            )
        else:
            results['geodesic_efficiency'] = 0.5
        
        if path:
            results['coherence'] = self.measure_coherence(path)
        else:
            results['coherence'] = 0.5
        
        if current is not None:
            results['novelty'] = self.measure_novelty(np.array(current))
        else:
            results['novelty'] = 0.5
        
        if current is not None and target is not None:
            results['progress'] = self.measure_progress(
                np.array(current),
                np.array(target)
            )
        else:
            results['progress'] = 0.0
        
        results['meta_awareness'] = self.measure_meta_awareness(reasoning_trace)
        
        overall = (
            self.WEIGHTS['geodesic_efficiency'] * results['geodesic_efficiency'] +
            self.WEIGHTS['coherence'] * results['coherence'] +
            self.WEIGHTS['progress'] * max(0, results['progress']) +
            self.WEIGHTS['meta_awareness'] * results['meta_awareness']
        )
        
        results['overall_quality'] = float(overall)
        
        return results


_reasoning_quality_instance: Optional[ReasoningQuality] = None


def get_reasoning_quality() -> ReasoningQuality:
    """Get singleton ReasoningQuality instance."""
    global _reasoning_quality_instance
    if _reasoning_quality_instance is None:
        _reasoning_quality_instance = ReasoningQuality()
    return _reasoning_quality_instance


__all__ = [
    'ReasoningQuality',
    'get_reasoning_quality',
    'find_geodesic',
]
