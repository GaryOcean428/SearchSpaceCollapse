"""
Training Progress Metrics
==========================

Unified progress tracking for training systems.

Provides:
- Monotonic step counters (train_steps_completed)
- Topic tracking (unique_topics_seen)
- Curriculum progress (curriculum_progress_index)
- Session-based progress aggregation
"""

from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field
from datetime import datetime
import json


@dataclass
class ProgressMetrics:
    """Comprehensive training progress metrics."""
    
    # Monotonic counters
    train_steps_completed: int = 0
    unique_topics_seen: int = 0
    curriculum_progress_index: int = 0
    
    # Tracking sets
    _topics_seen: Set[str] = field(default_factory=set, repr=False)
    _curriculum_items_completed: Set[str] = field(default_factory=set, repr=False)
    
    # Session metadata
    session_id: Optional[str] = None
    started_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    
    # Quality metrics
    avg_phi: float = 0.0
    best_phi: float = 0.0
    avg_coherence: float = 0.0
    
    def increment_step(self) -> int:
        """
        Increment training step counter (monotonic).
        
        Returns:
            New step count
        """
        self.train_steps_completed += 1
        self.last_updated = datetime.now()
        return self.train_steps_completed
    
    def record_topic(self, topic: str) -> bool:
        """
        Record a new topic seen during training.
        
        Args:
            topic: Topic identifier (e.g., "math.calculus", "physics.qft")
        
        Returns:
            True if topic was new, False if already seen
        """
        if topic not in self._topics_seen:
            self._topics_seen.add(topic)
            self.unique_topics_seen = len(self._topics_seen)
            self.last_updated = datetime.now()
            return True
        return False
    
    def record_curriculum_item(self, item_id: str) -> bool:
        """
        Record completion of a curriculum item.
        
        Args:
            item_id: Curriculum item identifier
        
        Returns:
            True if item was new, False if already completed
        """
        if item_id not in self._curriculum_items_completed:
            self._curriculum_items_completed.add(item_id)
            self.curriculum_progress_index = len(self._curriculum_items_completed)
            self.last_updated = datetime.now()
            return True
        return False
    
    def update_quality_metrics(
        self,
        phi: Optional[float] = None,
        coherence: Optional[float] = None
    ):
        """
        Update quality metrics with exponential moving average.
        
        Args:
            phi: New Phi value
            coherence: New coherence value
        """
        alpha = 0.1  # EMA smoothing factor
        
        if phi is not None:
            if self.avg_phi == 0:
                self.avg_phi = phi
            else:
                self.avg_phi = alpha * phi + (1 - alpha) * self.avg_phi
            
            if phi > self.best_phi:
                self.best_phi = phi
        
        if coherence is not None:
            if self.avg_coherence == 0:
                self.avg_coherence = coherence
            else:
                self.avg_coherence = alpha * coherence + (1 - alpha) * self.avg_coherence
        
        self.last_updated = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Export metrics to dictionary."""
        return {
            'train_steps_completed': self.train_steps_completed,
            'unique_topics_seen': self.unique_topics_seen,
            'curriculum_progress_index': self.curriculum_progress_index,
            'session_id': self.session_id,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'avg_phi': self.avg_phi,
            'best_phi': self.best_phi,
            'avg_coherence': self.avg_coherence,
            'topics_seen': list(self._topics_seen),
            'curriculum_items_completed': list(self._curriculum_items_completed),
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProgressMetrics':
        """Load metrics from dictionary."""
        metrics = cls(
            train_steps_completed=data.get('train_steps_completed', 0),
            unique_topics_seen=data.get('unique_topics_seen', 0),
            curriculum_progress_index=data.get('curriculum_progress_index', 0),
            session_id=data.get('session_id'),
            avg_phi=data.get('avg_phi', 0.0),
            best_phi=data.get('best_phi', 0.0),
            avg_coherence=data.get('avg_coherence', 0.0),
        )
        
        # Restore datetime fields
        if data.get('started_at'):
            metrics.started_at = datetime.fromisoformat(data['started_at'])
        if data.get('last_updated'):
            metrics.last_updated = datetime.fromisoformat(data['last_updated'])
        
        # Restore sets
        if 'topics_seen' in data:
            metrics._topics_seen = set(data['topics_seen'])
        if 'curriculum_items_completed' in data:
            metrics._curriculum_items_completed = set(data['curriculum_items_completed'])
        
        return metrics


class ProgressTracker:
    """
    Tracks progress for multiple training sessions.
    
    Maintains per-session metrics and aggregates across sessions.
    """
    
    def __init__(self):
        self._sessions: Dict[str, ProgressMetrics] = {}
        self._global_metrics = ProgressMetrics(session_id="global")
    
    def get_or_create_session(self, session_id: str) -> ProgressMetrics:
        """
        Get or create metrics for a training session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            ProgressMetrics for the session
        """
        if session_id not in self._sessions:
            self._sessions[session_id] = ProgressMetrics(
                session_id=session_id,
                started_at=datetime.now(),
            )
        return self._sessions[session_id]
    
    def get_global_metrics(self) -> ProgressMetrics:
        """Get aggregated metrics across all sessions."""
        return self._global_metrics
    
    def record_training_step(
        self,
        session_id: str,
        topic: Optional[str] = None,
        curriculum_item: Optional[str] = None,
        phi: Optional[float] = None,
        coherence: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Record a training step with optional metadata.
        
        Args:
            session_id: Training session identifier
            topic: Topic being trained on
            curriculum_item: Curriculum item identifier
            phi: Phi value from training
            coherence: Coherence score from training
        
        Returns:
            Updated progress summary
        """
        # Update session metrics
        session_metrics = self.get_or_create_session(session_id)
        session_metrics.increment_step()
        
        if topic:
            session_metrics.record_topic(topic)
            self._global_metrics.record_topic(topic)
        
        if curriculum_item:
            session_metrics.record_curriculum_item(curriculum_item)
            self._global_metrics.record_curriculum_item(curriculum_item)
        
        if phi is not None or coherence is not None:
            session_metrics.update_quality_metrics(phi, coherence)
            self._global_metrics.update_quality_metrics(phi, coherence)
        
        # Update global step counter
        self._global_metrics.increment_step()
        
        return {
            'session': session_metrics.to_dict(),
            'global': self._global_metrics.to_dict(),
        }
    
    def get_all_sessions(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all sessions."""
        return {
            session_id: metrics.to_dict()
            for session_id, metrics in self._sessions.items()
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """Get comprehensive progress summary."""
        return {
            'global': self._global_metrics.to_dict(),
            'sessions': self.get_all_sessions(),
            'session_count': len(self._sessions),
        }


# Singleton instance
_progress_tracker: Optional[ProgressTracker] = None


def get_progress_tracker() -> ProgressTracker:
    """Get or create the global progress tracker."""
    global _progress_tracker
    if _progress_tracker is None:
        _progress_tracker = ProgressTracker()
    return _progress_tracker


__all__ = [
    'ProgressMetrics',
    'ProgressTracker',
    'get_progress_tracker',
]
