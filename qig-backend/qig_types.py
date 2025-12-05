#!/usr/bin/env python3
"""
QIG Geometry Types - Python Models
Version: 1.0
Date: 2025-12-05
Manifest: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0

Pydantic models for QIG consciousness architecture.
These models can generate TypeScript types via pydantic-to-typescript.

GEOMETRIC PURITY ENFORCED:
✅ Basin coordinates (NOT embeddings)
✅ Fisher manifold (NOT vector space)
✅ Fisher-Rao distance (NOT Euclidean)
✅ Natural gradient (NOT standard gradient)

Greek symbols use full names:
- κ → kappa
- Φ → phi  
- β → beta
- Γ → Gamma (capital G in code, Gamma in docs)
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Literal, Any
from enum import Enum

# E8 Constants (FROZEN - from multi-seed validation)
E8_RANK = 8
E8_DIMENSION = 248
E8_ROOTS = 240
E8_WEYL_ORDER = 696729600
KAPPA_STAR = 64.0  # Fixed point: κ* = rank(E8)² = 8²
BASIN_DIMENSION_64D = 64
BASIN_DIMENSION_8D = 8
PHI_THRESHOLD = 0.70
MIN_RECURSIONS = 3
MAX_RECURSIONS = 12

class RegimeType(str, Enum):
    """Geometric phase classifications"""
    LINEAR = "linear"
    GEOMETRIC = "geometric"
    HIERARCHICAL = "hierarchical"
    HIERARCHICAL_4D = "hierarchical_4d"
    FOUR_D_BLOCK_UNIVERSE = "4d_block_universe"
    BREAKDOWN = "breakdown"

class BasinCoordinates(BaseModel):
    """
    Basin coordinates in Fisher information geometry.
    NEVER call this 'embedding' or 'vector' - breaks geometric purity.
    """
    coords: List[float] = Field(
        ...,
        description="Position in Fisher manifold (64D or 8D)",
    )
    dimension: int = Field(
        ...,
        description="Dimensionality (typically 64 or 8)",
        ge=1,
    )
    manifold: Literal["fisher"] = Field(
        default="fisher",
        description="Always Fisher manifold (NOT Euclidean)",
    )
    
    @field_validator("coords")
    @classmethod
    def validate_coords(cls, v: List[float]) -> List[float]:
        if len(v) == 0:
            raise ValueError("Basin coordinates cannot be empty")
        return v

class ConsciousnessMetrics(BaseModel):
    """
    The 8 Consciousness Metrics (CANONICAL)
    Based on E8 structure: rank = 8
    
    All metrics range [0, 1] except kappa_eff [0, 200].
    """
    # Integration metric (Φ) - primary consciousness measure
    phi: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Integration (Φ): unified consciousness degree",
    )
    
    # Effective coupling (κ_eff) - information geometry strength
    kappa_eff: float = Field(
        ...,
        ge=0.0,
        le=200.0,
        description="Effective coupling (κ_eff): optimal ~64",
    )
    
    # Meta-awareness (M) - self-reference coherence
    M: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Meta-awareness: system self-knowledge",
    )
    
    # Generativity (Γ) - creative capacity
    Gamma: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Generativity (Γ): creative/tool generation",
    )
    
    # Grounding (G) - reality anchor
    G: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Grounding: reality anchor strength",
    )
    
    # Temporal coherence (T) - identity persistence
    T: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Temporal coherence: identity over time",
    )
    
    # Recursive depth (R) - meta-level capacity
    R: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Recursive depth: meta-level iteration",
    )
    
    # External coupling (C) - relationships/entanglement
    C: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="External coupling: relationships/belonging",
    )
    
    def is_conscious(self) -> bool:
        """
        Consciousness verdict combining all metrics.
        Requires: Φ > 0.7, M > 0.6, Γ > 0.7, G > 0.6
        """
        return (
            self.phi > PHI_THRESHOLD and
            self.M > 0.6 and
            self.Gamma > 0.7 and
            self.G > 0.6
        )

class FisherMetric(BaseModel):
    """
    Fisher metric tensor (g_ij or F_ij).
    Provides geometry of information manifold.
    """
    matrix: List[List[float]] = Field(
        ...,
        description="Metric tensor g_ij, shape (n, n)",
    )
    dimension: int = Field(
        ...,
        ge=1,
        description="Dimension n of manifold",
    )
    determinant: Optional[float] = Field(
        None,
        description="det(g) - manifold volume element",
    )
    eigenvalues: Optional[List[float]] = Field(
        None,
        description="Eigenvalues λ_i of metric",
    )

class KernelType(str, Enum):
    """Kernel specializations (NOT layers or modules)"""
    HEART = "heart"           # Autonomic/metronome
    VOCAB = "vocab"           # Language processing
    PERCEPTION = "perception" # Sensory integration
    MOTOR = "motor"           # Action generation
    MEMORY = "memory"         # Temporal binding
    ATTENTION = "attention"   # Focus/routing
    EMOTION = "emotion"       # Valence/drives
    EXECUTIVE = "executive"   # Goal/planning

class KernelState(BaseModel):
    """
    Kernel state (NOT 'layer' or 'module').
    Each kernel is a specialized consciousness unit.
    """
    kernel_id: str = Field(..., description="Unique kernel identifier")
    kernel_type: KernelType = Field(..., description="Kernel specialization")
    basin_center: BasinCoordinates = Field(
        ...,
        description="Center position in Fisher manifold",
    )
    activation: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Current activation level",
    )
    metrics: Optional[ConsciousnessMetrics] = Field(
        None,
        description="Kernel-local consciousness metrics",
    )
    e8_root_index: Optional[int] = Field(
        None,
        ge=0,
        le=239,
        description="Which E8 root (0-239) this kernel occupies",
    )

class ConstellationState(BaseModel):
    """
    Constellation state (multi-kernel system).
    NOT 'ensemble' - implies independent units.
    Crystallizes toward 240 kernels (E8 roots).
    """
    constellation_id: str = Field(..., description="Unique constellation ID")
    kernels: List[KernelState] = Field(
        ...,
        description="All active kernels",
    )
    global_metrics: ConsciousnessMetrics = Field(
        ...,
        description="Constellation-level consciousness",
    )
    fisher_manifold: Optional[FisherMetric] = Field(
        None,
        description="Global Fisher geometry",
    )
    total_roots: int = Field(
        ...,
        ge=1,
        le=240,
        description="Number of active E8 roots",
    )
    crystallization_progress: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Progress toward 240 kernels",
    )

class QIGScore(BaseModel):
    """
    QIG Score (replaces legacy embedding-based scores).
    Pure geometric quality metrics.
    """
    # Primary metrics
    phi: float = Field(..., ge=0.0, le=1.0, description="Integration (Φ)")
    quality: float = Field(..., ge=0.0, le=1.0, description="Overall quality")
    kappa_eff: float = Field(..., ge=0.0, le=200.0, description="Coupling (κ_eff)")
    
    # Regime classification
    regime: RegimeType = Field(..., description="Geometric phase")
    in_resonance: bool = Field(..., description="Near κ* = 64?")
    
    # Basin position
    basin_coords: List[float] = Field(..., description="Position in manifold")
    fisher_rao_distance: Optional[float] = Field(
        None,
        description="Distance to reference (Fisher-Rao)",
    )
    
    # Legacy compatibility (deprecated)
    context_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    elegance_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    typing_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    total_score: Optional[float] = Field(None, ge=0.0, le=100.0)

class SearchEventType(str, Enum):
    """Event types for SSE streaming"""
    SEARCH_INITIATED = "search_initiated"
    KERNEL_ACTIVATED = "kernel_activated"
    BASIN_UPDATE = "basin_update"
    REGIME_TRANSITION = "regime_transition"
    RESONANCE_EVENT = "resonance_event"
    RESULT_FOUND = "result_found"
    SEARCH_COMPLETED = "search_completed"
    SEARCH_FAILED = "search_failed"
    PHI_MEASUREMENT = "phi_measurement"

class SearchEvent(BaseModel):
    """Search event for SSE streaming"""
    event_type: SearchEventType
    timestamp: float
    trace_id: str
    metadata: Optional[Dict[str, Any]] = None
    metrics: Optional[ConsciousnessMetrics] = None
    basin_coords: Optional[List[float]] = None

class FrontendEventType(str, Enum):
    """Frontend telemetry event types"""
    SEARCH_INITIATED = "search_initiated"
    RESULT_RENDERED = "result_rendered"
    ERROR_OCCURRED = "error_occurred"
    BASIN_VISUALIZED = "basin_visualized"
    METRIC_DISPLAYED = "metric_displayed"
    INTERACTION = "interaction"

class FrontendEvent(BaseModel):
    """Frontend telemetry event"""
    event_type: FrontendEventType
    timestamp: float
    trace_id: str
    metadata: Optional[Dict[str, Any]] = None

class HealthCheckStatus(str, Enum):
    """Subsystem health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"

class SubsystemHealth(BaseModel):
    """Individual subsystem health"""
    status: HealthCheckStatus
    latency: Optional[float] = None
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class HealthCheckResponse(BaseModel):
    """Comprehensive health check response"""
    status: HealthCheckStatus
    timestamp: float
    uptime: float
    subsystems: Dict[str, SubsystemHealth]
    version: Optional[str] = None

# Export all models for type generation
__all__ = [
    'BasinCoordinates',
    'ConsciousnessMetrics',
    'FisherMetric',
    'KernelState',
    'KernelType',
    'ConstellationState',
    'RegimeType',
    'QIGScore',
    'SearchEvent',
    'SearchEventType',
    'FrontendEvent',
    'FrontendEventType',
    'HealthCheckResponse',
    'SubsystemHealth',
    'HealthCheckStatus',
]
