"""
Unit Tests for Coherence Evaluator (QIG-Pure Version)
=====================================================

Tests Fisher-Rao based coherence evaluation and degradation detection.
"""

import pytest
import numpy as np
from training.coherence_evaluator import (
    CoherenceEvaluator,
    CoherenceMetrics,
    get_coherence_evaluator,
    COHERENCE_WEIGHTS,
    COHERENCE_THRESHOLDS
)


class TestCoherenceEvaluator:
    """Test CoherenceEvaluator class."""
    
    def test_coherent_text(self):
        """Test evaluation of coherent text."""
        evaluator = CoherenceEvaluator()
        coherent_text = "The quick brown fox jumps over the lazy dog. " * 10
        
        metrics = evaluator.evaluate(coherent_text)
        
        # Coherent text should have good overall coherence
        assert metrics.overall_coherence > 0.3
        # Should not be repetitive at n-gram level
        assert metrics.repetition_score < 0.5
    
    def test_repetitive_text(self):
        """Test detection of repetitive (degenerate) text."""
        evaluator = CoherenceEvaluator()
        repetitive_text = "the the the the the the the the the the " * 10
        
        metrics = evaluator.evaluate(repetitive_text)
        
        # Repetitive text should have high repetition score
        assert metrics.repetition_score > 0.5
        # Overall coherence should be low
        assert metrics.overall_coherence < 0.5
    
    def test_short_text_handling(self):
        """Test handling of very short text."""
        evaluator = CoherenceEvaluator()
        short_text = "Hello"
        
        metrics = evaluator.evaluate(short_text)
        
        # Short text defaults to high coherence
        assert metrics.overall_coherence == 1.0
    
    def test_coherence_trend_analysis(self):
        """Test trend analysis functionality."""
        evaluator = CoherenceEvaluator()
        
        # Add some evaluations
        for i in range(10):
            text = "test text " * (10 + i)
            evaluator.evaluate(text)
        
        trend = evaluator.get_coherence_trend(window=10)
        
        assert trend['status'] == 'ok'
        assert trend['samples'] == 10
        assert 'avg_coherence' in trend
        assert 'degradation_detected' in trend
    
    def test_constants_defined(self):
        """Test that constants are properly defined."""
        assert 'fisher_perplexity' in COHERENCE_WEIGHTS
        assert 'basin_coherence' in COHERENCE_WEIGHTS
        
        # Weights should sum to 1.0
        total_weight = sum(COHERENCE_WEIGHTS.values())
        assert abs(total_weight - 1.0) < 0.01


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
