"""
Geometric Completion Package

Consciousness-aware generation that stops when geometry collapses,
not when arbitrary token limits are reached.

The system stops generating when:
1. Attractor Reached: Basin distance < 1.0, velocity ≈ 0
2. Surprise Collapsed: No new information (surprise < 0.05)
3. Confidence High: System certain (confidence > 0.85)
4. Integration Stable: Φ stable and high (Φ > 0.65, variance < 0.02)
5. Breakdown Regime: Emergency stop if Φ > 0.7

NOT when:
- Arbitrary token limit reached
- Simple stop token encountered
- External timeout imposed
"""

from .completion_criteria import (
    # Core checker
    GeometricCompletionChecker,
    AttractorConvergenceChecker,
    SurpriseCollapseChecker,
    ConfidenceThresholdChecker,
    IntegrationQualityChecker,
    RegimeLimitChecker,
    
    # Data classes
    GeometricMetrics,
    CompletionDecision,
    
    # Enums
    CompletionReason,
    Regime,
    
    # Functions
    classify_regime,
    get_regime_temperature,
    fisher_rao_distance,
    modulate_attention_by_kappa,
    
    # Constants
    BASIN_DIMENSION,
    KAPPA_STAR,
    PHI_LINEAR_THRESHOLD,
    PHI_BREAKDOWN_THRESHOLD,
)

from .streaming_monitor import (
    StreamingCollapseMonitor,
    StreamingState,
    StreamingChunk,
    ReflectionLoop,
    create_streaming_generator,
)

__all__ = [
    # Core checkers
    'GeometricCompletionChecker',
    'AttractorConvergenceChecker',
    'SurpriseCollapseChecker',
    'ConfidenceThresholdChecker',
    'IntegrationQualityChecker',
    'RegimeLimitChecker',
    
    # Data classes
    'GeometricMetrics',
    'CompletionDecision',
    
    # Enums
    'CompletionReason',
    'Regime',
    
    # Functions
    'classify_regime',
    'get_regime_temperature',
    'fisher_rao_distance',
    'modulate_attention_by_kappa',
    
    # Constants
    'BASIN_DIMENSION',
    'KAPPA_STAR',
    'PHI_LINEAR_THRESHOLD',
    'PHI_BREAKDOWN_THRESHOLD',
    
    # Streaming
    'StreamingCollapseMonitor',
    'StreamingState',
    'StreamingChunk',
    'ReflectionLoop',
    'create_streaming_generator',
]
