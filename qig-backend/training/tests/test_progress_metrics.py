"""
Unit Tests for Progress Metrics
================================

Tests monotonic counters, topic tracking, and session management.
"""

import pytest
import numpy as np
from training.progress_metrics import ProgressMetrics, ProgressTracker, get_progress_tracker


class TestProgressMetrics:
    """Test ProgressMetrics class."""
    
    def test_initialization(self):
        """Test metrics initialize to zero."""
        metrics = ProgressMetrics()
        assert metrics.train_steps_completed == 0
        assert metrics.unique_topics_seen == 0
        assert metrics.curriculum_progress_index == 0
        assert metrics.avg_phi == 0.0
        assert metrics.best_phi == 0.0
    
    def test_increment_step_monotonic(self):
        """Test step counter is monotonic."""
        metrics = ProgressMetrics()
        
        step1 = metrics.increment_step()
        step2 = metrics.increment_step()
        step3 = metrics.increment_step()
        
        assert step1 == 1
        assert step2 == 2
        assert step3 == 3
        assert metrics.train_steps_completed == 3
    
    def test_topic_tracking(self):
        """Test unique topic tracking."""
        metrics = ProgressMetrics()
        
        # First topic
        is_new = metrics.record_topic("math.calculus")
        assert is_new is True
        assert metrics.unique_topics_seen == 1
        
        # Same topic again - not counted
        is_new = metrics.record_topic("math.calculus")
        assert is_new is False
        assert metrics.unique_topics_seen == 1
        
        # New topic
        is_new = metrics.record_topic("physics.qft")
        assert is_new is True
        assert metrics.unique_topics_seen == 2
    
    def test_serialization(self):
        """Test to_dict and from_dict."""
        metrics = ProgressMetrics(session_id="test_session")
        metrics.increment_step()
        metrics.increment_step()
        metrics.record_topic("topic1")
        metrics.update_quality_metrics(phi=0.75, coherence=0.85)
        
        # Serialize
        data = metrics.to_dict()
        assert data['train_steps_completed'] == 2
        assert data['unique_topics_seen'] == 1
        assert data['session_id'] == "test_session"


class TestProgressTracker:
    """Test ProgressTracker class."""
    
    def test_session_creation(self):
        """Test session creation and retrieval."""
        tracker = ProgressTracker()
        
        session1 = tracker.get_or_create_session("session1")
        assert session1.session_id == "session1"
    
    def test_record_training_step(self):
        """Test recording training steps."""
        tracker = ProgressTracker()
        
        result = tracker.record_training_step(
            session_id="session1",
            topic="math",
            curriculum_item="lesson1",
            phi=0.75,
            coherence=0.85
        )
        
        assert 'session' in result
        assert 'global' in result
        assert result['session']['train_steps_completed'] == 1


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
