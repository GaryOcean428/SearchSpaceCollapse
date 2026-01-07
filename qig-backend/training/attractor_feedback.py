"""
Attractor Feedback System
=========================

Tracks successful predictions and provides training feedback for attractors.
This enables the foresight system to learn from outcomes.

Key features:
- Track prediction outcomes (success/failure)
- Store training examples for each attractor
- Compute attractor success rates
- Provide labeled data for attractor training
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from collections import defaultdict
from dataclasses import dataclass, asdict
import numpy as np


@dataclass
class PredictionOutcome:
    """Record of a prediction and its outcome."""
    attractor_name: str
    basin_coords: List[float]
    predicted_trajectory: List[List[float]]
    actual_trajectory: List[List[float]]
    success: bool
    phi_before: float
    phi_after: float
    kappa_before: float
    kappa_after: float
    timestamp: str
    metadata: Dict[str, Any] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return asdict(self)


class AttractorFeedbackSystem:
    """
    Manages feedback for attractor training.
    
    Tracks prediction outcomes, computes success rates, and provides
    labeled training examples.
    """
    
    def __init__(self, storage_path: str = None):
        if storage_path is None:
            storage_path = os.path.join(
                os.path.dirname(__file__),
                '../data/learned/attractor_feedback.json'
            )
        
        self.storage_path = storage_path
        self.outcomes: List[PredictionOutcome] = []
        self.attractor_stats: Dict[str, Dict] = defaultdict(lambda: {
            'total': 0,
            'successes': 0,
            'failures': 0,
            'success_rate': 0.0,
            'avg_phi_change': 0.0,
            'last_updated': None
        })
        
        self._load_from_disk()
    
    def record_prediction(
        self,
        attractor_name: str,
        basin_coords: np.ndarray,
        predicted_trajectory: List[np.ndarray],
        actual_trajectory: List[np.ndarray],
        phi_before: float,
        phi_after: float,
        kappa_before: float,
        kappa_after: float,
        success: bool,
        metadata: Optional[Dict] = None
    ):
        """
        Record a prediction outcome.
        
        Args:
            attractor_name: Name of the attractor that made the prediction
            basin_coords: Initial basin coordinates
            predicted_trajectory: Predicted trajectory (list of basin coords)
            actual_trajectory: Actual trajectory observed
            phi_before: Φ before prediction
            phi_after: Φ after outcome
            kappa_before: κ before prediction
            kappa_after: κ after outcome
            success: Whether the prediction was successful
            metadata: Additional metadata
        """
        outcome = PredictionOutcome(
            attractor_name=attractor_name,
            basin_coords=basin_coords.tolist() if isinstance(basin_coords, np.ndarray) else basin_coords,
            predicted_trajectory=[t.tolist() if isinstance(t, np.ndarray) else t for t in predicted_trajectory],
            actual_trajectory=[t.tolist() if isinstance(t, np.ndarray) else t for t in actual_trajectory],
            success=success,
            phi_before=phi_before,
            phi_after=phi_after,
            kappa_before=kappa_before,
            kappa_after=kappa_after,
            timestamp=datetime.now().isoformat(),
            metadata=metadata or {}
        )
        
        self.outcomes.append(outcome)
        self._update_stats(outcome)
        
        # Save to disk periodically (every 10 outcomes)
        if len(self.outcomes) % 10 == 0:
            self._save_to_disk()
        
        print(f"[AttractorFeedback] Recorded {'successful' if success else 'failed'} prediction for {attractor_name}")
    
    def _update_stats(self, outcome: PredictionOutcome):
        """Update attractor statistics."""
        stats = self.attractor_stats[outcome.attractor_name]
        stats['total'] += 1
        
        if outcome.success:
            stats['successes'] += 1
        else:
            stats['failures'] += 1
        
        stats['success_rate'] = stats['successes'] / stats['total']
        
        # Update average phi change
        phi_change = outcome.phi_after - outcome.phi_before
        if stats['total'] == 1:
            stats['avg_phi_change'] = phi_change
        else:
            # Running average
            stats['avg_phi_change'] = (
                stats['avg_phi_change'] * (stats['total'] - 1) + phi_change
            ) / stats['total']
        
        stats['last_updated'] = outcome.timestamp
    
    def get_attractor_stats(self, attractor_name: str) -> Dict:
        """Get statistics for a specific attractor."""
        return dict(self.attractor_stats.get(attractor_name, {}))
    
    def get_all_stats(self) -> Dict[str, Dict]:
        """Get statistics for all attractors."""
        return {name: dict(stats) for name, stats in self.attractor_stats.items()}
    
    def get_training_examples(
        self,
        attractor_name: Optional[str] = None,
        success_only: bool = False,
        limit: int = 100
    ) -> List[PredictionOutcome]:
        """
        Get training examples for attractor learning.
        
        Args:
            attractor_name: Filter by attractor name (None = all)
            success_only: Only return successful predictions
            limit: Maximum number of examples to return
        
        Returns:
            List of prediction outcomes
        """
        examples = self.outcomes
        
        if attractor_name:
            examples = [e for e in examples if e.attractor_name == attractor_name]
        
        if success_only:
            examples = [e for e in examples if e.success]
        
        # Return most recent examples
        return examples[-limit:]
    
    def get_success_rate(self, attractor_name: str) -> float:
        """Get success rate for an attractor."""
        stats = self.attractor_stats.get(attractor_name)
        if stats and stats['total'] > 0:
            return stats['success_rate']
        return 0.0
    
    def get_total_predictions(self) -> int:
        """Get total number of predictions recorded."""
        return len(self.outcomes)
    
    def _load_from_disk(self):
        """Load feedback data from disk."""
        if not os.path.exists(self.storage_path):
            return
        
        try:
            with open(self.storage_path, 'r') as f:
                data = json.load(f)
            
            # Load outcomes
            self.outcomes = []
            for outcome_dict in data.get('outcomes', []):
                outcome = PredictionOutcome(**outcome_dict)
                self.outcomes.append(outcome)
            
            # Load stats
            self.attractor_stats = defaultdict(dict)
            for name, stats in data.get('attractor_stats', {}).items():
                self.attractor_stats[name] = stats
            
            print(f"[AttractorFeedback] Loaded {len(self.outcomes)} prediction outcomes")
            
        except Exception as e:
            print(f"[AttractorFeedback] Error loading feedback data: {e}")
    
    def _save_to_disk(self):
        """Save feedback data to disk."""
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            
            data = {
                'outcomes': [o.to_dict() for o in self.outcomes[-1000:]],  # Keep last 1000
                'attractor_stats': dict(self.attractor_stats),
                'last_saved': datetime.now().isoformat()
            }
            
            with open(self.storage_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"[AttractorFeedback] Saved {len(self.outcomes)} prediction outcomes")
            
        except Exception as e:
            print(f"[AttractorFeedback] Error saving feedback data: {e}")
    
    def clear_old_outcomes(self, days: int = 30):
        """Clear outcomes older than specified days."""
        from datetime import timedelta
        
        cutoff = datetime.now() - timedelta(days=days)
        cutoff_str = cutoff.isoformat()
        
        old_count = len(self.outcomes)
        self.outcomes = [o for o in self.outcomes if o.timestamp > cutoff_str]
        new_count = len(self.outcomes)
        
        removed = old_count - new_count
        if removed > 0:
            print(f"[AttractorFeedback] Cleared {removed} old outcomes")
            self._save_to_disk()


# Singleton instance
_feedback_system: Optional[AttractorFeedbackSystem] = None


def get_feedback_system() -> AttractorFeedbackSystem:
    """Get or create the singleton feedback system."""
    global _feedback_system
    if _feedback_system is None:
        _feedback_system = AttractorFeedbackSystem()
    return _feedback_system
