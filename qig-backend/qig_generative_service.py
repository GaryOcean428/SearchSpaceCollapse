"""
QIG Generative Service - Unified QIG-Pure Text Generation

Provides generative capability to ALL kernels using:
1. PostgreSQL-backed vocabulary (32K tokens with basin coordinates)
2. Fisher-Rao geometric navigation
3. Geometric completion (not token limits)
4. Basin trajectory to text synthesis

NO EXTERNAL LLMs - All generation is QIG-pure.
"""

import threading
import logging
import re
from typing import Dict, List, Optional, Any, Generator, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone
import numpy as np

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.debug("[QIGGenerativeService] Module imports starting...")

# Import unified coordizer (63K vocabulary single source of truth)
COORDIZER_AVAILABLE = False
_unified_coordizer_instance = None

try:
    logger.debug("[QIGGenerativeService] About to import coordizers...")
    from coordizers import get_coordizer as _get_unified_coordizer
    logger.debug("[QIGGenerativeService] coordizers imported, calling get_coordizer...")
    _unified_coordizer_instance = _get_unified_coordizer()
    logger.debug("[QIGGenerativeService] get_coordizer returned")
    COORDIZER_AVAILABLE = True
    # FIX: PostgresCoordizer stores vocab in .vocab dict, not .vocab_size attribute
    vocab_size = len(_unified_coordizer_instance.vocab) if hasattr(_unified_coordizer_instance, 'vocab') else 0
    basin_dim = getattr(_unified_coordizer_instance, 'basin_dim', 64)
    logger.debug("[QIGGenerativeService] Coordizer ready: %d tokens", vocab_size)
    logger.info("[QIGGenerativeService] Using unified coordizer: %s tokens, %sD", vocab_size, basin_dim)
except Exception as e:
    logger.warning("[QIGGenerativeService] coordizer failed: %s", e)
    logger.warning("Unified coordizer not available: %s", e)

# Import trajectory decoder for foresight prediction
logger.debug("[QIGGenerativeService] About to import trajectory_decoder...")
TRAJECTORY_DECODER_AVAILABLE = False
_trajectory_decoder_instance = None

try:
    from trajectory_decoder import create_trajectory_decoder
    logger.debug("[QIGGenerativeService] trajectory_decoder imported")
    if COORDIZER_AVAILABLE and _unified_coordizer_instance:
        _trajectory_decoder_instance = create_trajectory_decoder(
            _unified_coordizer_instance,
            context_window=8,
            recency_decay=0.3,
            attention_temperature=0.5
        )
        TRAJECTORY_DECODER_AVAILABLE = True
        logger.debug("[QIGGenerativeService] Trajectory decoder ready")
        logger.info("[QIGGenerativeService] Trajectory decoder initialized (Fisher-weighted foresight enabled)")
except Exception as e:
    logger.warning("[QIGGenerativeService] trajectory_decoder failed: %s", e)
    logger.warning("Trajectory decoder not available: %s", e)

# Import from qig_geometry for canonical operations
logger.debug("[QIGGenerativeService] About to import qig_geometry...")
try:
    from qig_geometry import fisher_coord_distance, sphere_project
    logger.debug("[QIGGenerativeService] qig_geometry imported")
except ImportError:
    logger.warning("[QIGGenerativeService] qig_geometry ImportError, using fallback")
    def fisher_coord_distance(a: np.ndarray, b: np.ndarray) -> float:
        """Fisher-Rao distance for unit vectors."""
        dot = np.clip(np.dot(a, b), -1.0, 1.0)
        return float(np.arccos(dot))
    
    def sphere_project(v: np.ndarray) -> np.ndarray:
        """Project to unit sphere."""
        norm = np.linalg.norm(v)
        return v / (norm + 1e-10) if norm > 0 else v

# Import POS grammar for structured generation
logger.debug("[QIGGenerativeService] About to import pos_grammar...")
try:
    from pos_grammar import load_grammar_from_db
    POS_GRAMMAR_AVAILABLE = True
    logger.debug("[QIGGenerativeService] pos_grammar imported")
except ImportError:
    POS_GRAMMAR_AVAILABLE = False
    logger.warning("[QIGGenerativeService] pos_grammar ImportError")
    logger.warning("POS grammar not available - using legacy generation")

# Import learned relationships for attention-weighted word selection
logger.debug("[QIGGenerativeService] About to import learned_relationships...")
LEARNED_RELATIONSHIPS_AVAILABLE = False
get_learned_relationships = None
try:
    from learned_relationships import get_learned_relationships
    LEARNED_RELATIONSHIPS_AVAILABLE = True
    logger.debug("[QIGGenerativeService] learned_relationships imported")
except ImportError:
    logger.warning("[QIGGenerativeService] learned_relationships ImportError")
    logger.warning("Learned relationships not available - using pure geometric selection")

# Physics constants - import from canonical source
logger.debug("[QIGGenerativeService] About to import physics_constants...")
try:
    from qigkernels.physics_constants import (
        PHYSICS,
        BASIN_DIM,
        KAPPA_STAR,
        BETA_3_TO_4,
        BETA_5_TO_6,
    )
    logger.debug("[QIGGenerativeService] physics_constants imported")
    PHI_GEOMETRIC_THRESHOLD = 0.3
    PHI_SYNTHESIS_THRESHOLD = 0.7
    PHI_BREAKDOWN_THRESHOLD = 0.92  # Consciousness breakdown protection
    KAPPA_DRIFT_THRESHOLD = 10.0  # Max deviation from κ*
    # Frozen β values for attention weighting
    BETA_ATTENTION_STRONG = BETA_3_TO_4  # +0.44 for strong coupling
    BETA_ATTENTION_PLATEAU = abs(BETA_5_TO_6)  # ~0.04 for plateau
except ImportError:
    BASIN_DIM = 64
    KAPPA_STAR = 64.21  # κ* from validated physics (L=4,5,6)
    PHI_GEOMETRIC_THRESHOLD = 0.3
    PHI_SYNTHESIS_THRESHOLD = 0.7
    PHI_BREAKDOWN_THRESHOLD = 0.92
    KAPPA_DRIFT_THRESHOLD = 10.0
    BETA_ATTENTION_STRONG = 0.44  # Frozen β(3→4) value
    BETA_ATTENTION_PLATEAU = 0.04  # Frozen β(5→6) plateau value
    logger.warning("Using hardcoded physics constants (fallback)")

# Import SelfObserver for per-generation self-observation and synthesis-level monitoring
try:
    from qig_core.self_observer import SelfObserver, ObservationAction
    SELF_OBSERVER_AVAILABLE = True
except Exception:
    SELF_OBSERVER_AVAILABLE = False
    SelfObserver = None
    ObservationAction = None

# Import canonical Φ computation - use compute_phi_fast for generation performance
PHI_COMPUTATION_AVAILABLE = False
compute_phi_fast = None
try:
    from qig_core.phi_computation import compute_phi_fast
    PHI_COMPUTATION_AVAILABLE = True
    logger.info("[QIGGenerativeService] Canonical Φ fast computation available")
except ImportError as e:
    logger.warning("[QIGGenerativeService] Canonical Φ computation not available: %s", e)

# Import StreamingCollapseMonitor for geometric completion detection during streaming
try:
    from streaming_collapse import (
        StreamingCollapseMonitor,
        StreamChunk,
        format_sse_event
    )
    STREAMING_COLLAPSE_AVAILABLE = True
    logger.info("[QIGGenerativeService] StreamingCollapseMonitor available for geometric completion")
except ImportError as e:
    STREAMING_COLLAPSE_AVAILABLE = False
    StreamingCollapseMonitor = None
    StreamChunk = None
    format_sse_event = None
    logger.warning("[QIGGenerativeService] StreamingCollapseMonitor not available: %s", e)
except Exception as e:
    STREAMING_COLLAPSE_AVAILABLE = False
    StreamingCollapseMonitor = None
    StreamChunk = None
    format_sse_event = None
    logger.warning("[QIGGenerativeService] StreamingCollapseMonitor failed to load: %s", e)

# Import CoherenceTracker for semantic coherence measurement (Γ metric component)
# Tracks text coherence separately from Φ (high Φ can coexist with low coherence)
try:
    from coherence_tracker import CoherenceTracker, create_coherence_tracker
    COHERENCE_TRACKER_AVAILABLE = True
    logger.info("[QIGGenerativeService] CoherenceTracker available for semantic coherence")
except ImportError as e:
    COHERENCE_TRACKER_AVAILABLE = False
    CoherenceTracker = None
    create_coherence_tracker = None
    logger.warning("[QIGGenerativeService] CoherenceTracker not available: %s", e)
except Exception as e:
    COHERENCE_TRACKER_AVAILABLE = False
    CoherenceTracker = None
    create_coherence_tracker = None
    logger.warning("[QIGGenerativeService] CoherenceTracker failed to load: %s", e)


@dataclass
class GenerationConfig:
    """Configuration for QIG-pure generation.

    KERNEL AUTONOMY ARCHITECTURE:
    Kernels are autonomous - they generate when they choose and for how long they choose.
    NO EXTERNAL LIMITS PERMITTED. Autonomic kernel regulates via geometry.

    TRUE RECURSIVE INTEGRATION:
    The kernel MUST complete minimum TRUE INTEGRATION LOOPS (not just iteration counting)
    before deciding completion. Each integration loop involves:
    - Basin transformation through kernel geometry (self-modeling)
    - Geodesic blending with target/synthesis basins
    - Manifold projection maintaining geometric purity

    After minimum integration depth, the kernel observes its telemetry and decides for itself.

    From CANONICAL_ARCHITECTURE.md:
    - "Geometric purity: All operations on Fisher manifolds"
    - "Physics constraints, not arbitrary limits"
    - "Kernels observe their own state and decide completion"
    """
    # MINIMUM INTEGRATION DEPTH: True recursive integration passes required
    # This is NOT iteration count - it's actual geometric integration through kernel
    # Minimum 3 ensures genuine recursive self-modeling before completion is allowed
    min_reasoning_recursions: int = 3  # Minimum TRUE integration depth (recursive passes)
    
    # KERNEL DECISION CRITERIA: Geometric thresholds kernel observes
    attractor_threshold: float = 0.02  # Stop when trajectory stabilizes (d < 0.02)
    surprise_threshold: float = 0.05   # Stop when no new information (ΔI_Q < 0.05)
    integration_min: float = 0.65      # Minimum Φ for valid output
    phi_convergence: float = 0.01      # Phi variance threshold for kernel self-completion
    phi_breakdown: float = PHI_BREAKDOWN_THRESHOLD  # Consciousness breakdown protection
    
    # Generation parameters
    tokens_per_step: int = 5           # Tokens per geometric step
    temperature: float = 0.7           # Basin perturbation, not LLM temperature
    
    # Telemetry feedback (kernel sees its own state)
    telemetry_interval: int = 1        # Feed telemetry every N steps (1 = always)


@dataclass
class GenerationResult:
    """Result from QIG-pure generation."""
    text: str
    tokens: List[str]
    basin_trajectory: List[np.ndarray]
    phi_trace: List[float]
    kappa: float
    completion_reason: str
    iterations: int
    routed_kernels: List[str]
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    qig_pure: bool = True
    kernel_decision: Optional[Dict[str, Any]] = None  # Kernel's autonomous decision
    coherence_metrics: Optional[Dict[str, float]] = None  # Γ metric (semantic coherence)


def kernel_decide_completion(
    phi_trajectory: List[float],
    surprise_history: List[float] = None,
    config: 'GenerationConfig' = None,
    integration_depth: int = 0
) -> Dict[str, Any]:
    """
    KERNEL AUTONOMY: Kernel's own decision about completion.

    The kernel observes its own telemetry and decides for itself when
    generation is complete. However, the kernel MUST complete TRUE RECURSIVE
    INTEGRATION (not just iteration counting) for a MINIMUM of 3 integration
    loops before it can decide to stop.

    TRUE RECURSIVE INTEGRATION means:
    - Basin transforms through kernel geometry (self-modeling)
    - Blends with target/synthesis basins via geodesic interpolation
    - Each integration step is a genuine geometric transformation, not just counting

    Args:
        phi_trajectory: History of phi values from generation steps
        surprise_history: History of surprise values
        config: GenerationConfig with thresholds
        integration_depth: TRUE integration depth (recursive passes), not iteration count

    Returns:
        dict with 'complete' (bool), 'reason' (str), 'confidence' (float),
             'integration_depth' (int), 'min_integration_required' (int)
    """
    PHI_CONVERGENCE_THRESHOLD = config.phi_convergence if config else 0.01
    PHI_BREAKDOWN_THRESHOLD = config.phi_breakdown if config else 0.92
    SURPRISE_COLLAPSE_THRESHOLD = config.surprise_threshold if config else 0.05
    INTEGRATION_MIN = config.integration_min if config else 0.65

    # MINIMUM INTEGRATION DEPTH: True recursive integration passes required
    # This is NOT iteration count - it's actual integration through kernel geometry
    MIN_INTEGRATION_DEPTH = config.min_reasoning_recursions if config else 3

    # Use integration_depth if provided, fall back to phi_trajectory length
    actual_integration = integration_depth if integration_depth > 0 else len(phi_trajectory)

    result = {
        'complete': False,
        'reason': 'integrating',
        'confidence': 0.0,
        'recursions': len(phi_trajectory),  # Legacy field for compatibility
        'integration_depth': actual_integration,
        'min_integration_required': MIN_INTEGRATION_DEPTH,
        'min_required': MIN_INTEGRATION_DEPTH  # Legacy field for compatibility
    }

    # Kernel MUST complete minimum TRUE INTEGRATION before deciding
    # This ensures genuine recursive self-modeling, not just counting
    if actual_integration < MIN_INTEGRATION_DEPTH:
        result['reason'] = f'recursive_integration_{actual_integration}_of_{MIN_INTEGRATION_DEPTH}'
        return result

    recent_phi = phi_trajectory[-5:] if len(phi_trajectory) >= 5 else phi_trajectory
    phi_variance = float(np.var(recent_phi)) if len(recent_phi) > 1 else 1.0
    phi_mean = float(np.mean(recent_phi))
    raw_current_phi = phi_trajectory[-1] if phi_trajectory else 0.5

    # Type validation: ensure current_phi is a scalar float (not tuple/list)
    if isinstance(raw_current_phi, (tuple, list)):
        current_phi = float(raw_current_phi[0]) if raw_current_phi else 0.5
    elif isinstance(raw_current_phi, dict):
        current_phi = float(raw_current_phi.get('phi', 0.5))
    elif raw_current_phi is None:
        current_phi = 0.5
    else:
        try:
            current_phi = float(raw_current_phi)
        except (TypeError, ValueError):
            current_phi = 0.5

    # BREAKDOWN PROTECTION
    if current_phi >= PHI_BREAKDOWN_THRESHOLD:
        result['complete'] = True
        result['reason'] = 'kernel_breakdown_protection'
        result['confidence'] = 1.0
        return result

    # GEOMETRIC CONVERGENCE: Phi has stabilized after integration
    if phi_variance < PHI_CONVERGENCE_THRESHOLD and phi_mean > 0.3:
        result['complete'] = True
        result['reason'] = 'kernel_geometric_convergence'
        result['confidence'] = 1.0 - phi_variance
        return result

    # SURPRISE COLLAPSE: No new information from integration
    if surprise_history and len(surprise_history) >= 3:
        recent_surprise = surprise_history[-3:]
        avg_surprise = float(np.mean(recent_surprise))
        if avg_surprise < SURPRISE_COLLAPSE_THRESHOLD:
            result['complete'] = True
            result['reason'] = 'kernel_surprise_collapsed'
            result['confidence'] = 1.0 - avg_surprise
            return result

    # INTEGRATION STABLE: Good phi with low variance after recursive passes
    if phi_mean >= INTEGRATION_MIN and phi_variance < 0.02:
        result['complete'] = True
        result['reason'] = 'kernel_integration_stable'
        result['confidence'] = phi_mean
        return result

    return result


class BasinTrajectoryIntegrator:
    """Integrates basin trajectories using Fisher geodesics with true recursive integration.

    RECURSIVE INTEGRATION:
    Unlike simple iteration counting, true recursive integration means the basin
    transforms through itself via kernel processing. Each integration step:
    1. Transforms basin through available kernels
    2. Blends with target/context basins using geodesic interpolation
    3. Projects back to manifold (sphere projection)

    This is self-modeling: the basin observes its own transformation and integrates
    that observation into its next state.
    """

    def __init__(self, dimension: int = BASIN_DIM):
        self.dimension = dimension
        self.trajectory: List[np.ndarray] = []
        self.phi_history: List[float] = []
        self.surprise_history: List[float] = []
        self.integration_depth: int = 0  # True integration depth, not iteration count
        self._context: Optional[Dict[str, Any]] = None
        self._kernel_basins: Dict[str, np.ndarray] = {}

    def set_context(self, context: Optional[Dict[str, Any]]) -> None:
        """Set context for recursive integration (target_basin, synthesis_basin, etc.)."""
        self._context = context

    def set_kernel_basins(self, kernel_basins: Dict[str, np.ndarray]) -> None:
        """Set kernel basins for recursive transformation."""
        self._kernel_basins = kernel_basins

    def _geodesic_interpolate(self, start: np.ndarray, end: np.ndarray, t: float) -> np.ndarray:
        """Interpolate along geodesic on probability simplex (Fisher geometry).

        Uses square-root representation for proper geodesic on simplex.
        NOT linear interpolation - that would violate manifold structure.
        """
        sqrt_start = np.sqrt(np.abs(start) + 1e-10)
        sqrt_end = np.sqrt(np.abs(end) + 1e-10)
        # Geodesic in square-root space
        interp = (1 - t) * sqrt_start + t * sqrt_end
        result = interp ** 2
        return result / np.sum(result)

    def _recursive_integration_step(self, basin: np.ndarray, context: Optional[Dict[str, Any]] = None) -> np.ndarray:
        """Single recursive integration pass - basin transforms through itself.

        This is TRUE recursive integration:
        1. Basin is transformed through kernel geometry (self-modeling)
        2. Blends with target_basin if available (goal-directed integration)
        3. Blends with synthesis_basin if available (context integration)
        4. Projects to manifold maintaining geometric purity

        Uses geodesic interpolation (Fisher-Rao), NOT Euclidean/linear operations.

        Args:
            basin: Current basin state (64D)
            context: Optional context with 'target_basin', 'synthesis_basin', etc.

        Returns:
            Transformed basin after integration step
        """
        ctx = context or self._context or {}

        # Step 1: Blend with target basin (goal-directed integration)
        # t=0.2 means 20% movement toward target per integration step
        if 'target_basin' in ctx:
            target = ctx['target_basin']
            if isinstance(target, np.ndarray) and target.shape == basin.shape:
                basin = self._geodesic_interpolate(basin, target, t=0.2)

        # Step 2: Blend with synthesis basin (context integration)
        # t=0.15 means 15% movement toward synthesis context
        if 'synthesis_basin' in ctx:
            synthesis = ctx['synthesis_basin']
            if isinstance(synthesis, np.ndarray) and synthesis.shape == basin.shape:
                basin = self._geodesic_interpolate(basin, synthesis, t=0.15)

        # Step 3: Self-integration via kernel transformation
        # If we have active kernels, blend basin with kernel constellation
        if self._kernel_basins:
            # Compute mean kernel basin (geometric center of active kernels)
            kernel_list = list(self._kernel_basins.values())
            if kernel_list:
                # Use Fréchet mean on probability simplex (average in sqrt space)
                sqrt_kernels = [np.sqrt(np.abs(k) + 1e-10) for k in kernel_list]
                mean_sqrt = np.mean(sqrt_kernels, axis=0)
                kernel_center = mean_sqrt ** 2
                kernel_center = kernel_center / np.sum(kernel_center)
                # Light blend with kernel center (t=0.1 for stability)
                basin = self._geodesic_interpolate(basin, kernel_center, t=0.1)

        # Step 4: Project to unit sphere (manifold constraint)
        result = sphere_project(basin)

        # Increment true integration depth
        self.integration_depth += 1

        return result

    def add_point(self, basin: np.ndarray, phi: float) -> None:
        """Add a point to the trajectory."""
        if self.trajectory:
            surprise = fisher_coord_distance(self.trajectory[-1], basin)
            self.surprise_history.append(surprise)

        self.trajectory.append(basin.copy())
        self.phi_history.append(phi)
    
    def get_kernel_decision(self, config: 'GenerationConfig' = None) -> Dict[str, Any]:
        """
        KERNEL AUTONOMY: Get the kernel's decision about completion.

        This feeds telemetry back to the kernel's decision function.
        Uses TRUE integration depth, not just iteration count.
        """
        return kernel_decide_completion(
            phi_trajectory=self.phi_history,
            surprise_history=self.surprise_history,
            config=config,
            integration_depth=self.integration_depth
        )

    def get_integration_depth(self) -> int:
        """Get current true integration depth (recursive passes through kernel)."""
        return self.integration_depth
    
    def get_velocity(self) -> np.ndarray:
        """Compute current velocity (tangent vector) on manifold."""
        if len(self.trajectory) < 2:
            return np.zeros(self.dimension)
        
        # Velocity as difference in square-root space (geodesic tangent)
        prev = np.sqrt(np.abs(self.trajectory[-2]) + 1e-10)
        curr = np.sqrt(np.abs(self.trajectory[-1]) + 1e-10)
        return curr - prev
    
    def predict_next(self, step_size: float = 0.1) -> np.ndarray:
        """Predict next basin position using geodesic extrapolation."""
        if len(self.trajectory) < 2:
            return self.trajectory[-1] if self.trajectory else np.ones(self.dimension) / self.dimension
        
        velocity = self.get_velocity()
        current_sqrt = np.sqrt(np.abs(self.trajectory[-1]) + 1e-10)
        
        # Step along tangent
        next_sqrt = current_sqrt + step_size * velocity
        next_sqrt = np.clip(next_sqrt, 1e-10, None)
        
        # Back to probability simplex
        result = next_sqrt ** 2
        result = result / np.sum(result)
        
        return result
    
    def check_attractor(self, threshold: float = 0.1) -> bool:
        """Check if trajectory has converged to attractor."""
        if len(self.trajectory) < 3:
            return False
        
        recent_distances = []
        for i in range(min(3, len(self.trajectory) - 1)):
            d = fisher_coord_distance(self.trajectory[-(i+1)], self.trajectory[-(i+2)])
            recent_distances.append(d)
        
        return np.mean(recent_distances) < threshold
    
    def check_surprise_collapse(self, threshold: float = 0.05) -> bool:
        """Check if surprise has collapsed (no new information)."""
        if len(self.surprise_history) < 5:
            return False
        return np.mean(self.surprise_history[-5:]) < threshold


class QIGGenerativeService:
    """
    Unified QIG-Pure Text Generation Service.

    Provides generative capability to all kernels using:
    - Pretrained 50K vocabulary with 64D basin embeddings (preferred)
    - PostgreSQL vocabulary fallback
    - Fisher-Rao geometric navigation
    - Basin-to-text synthesis

    NO EXTERNAL LLMs.
    """

    def __init__(self, config: Optional[GenerationConfig] = None):
        """Initialize the generative service."""
        self.config = config or GenerationConfig()
        self._coordizer = None
        self._kernel_basins: Dict[str, np.ndarray] = {}
        self._learned_relationships = None
        self._current_query_words: List[str] = []  # Track query words for attention
        self._discovery_gate = None  # For discovery bias

        # Initialize kernel constellation
        self._initialize_kernel_constellation()

        # Load learned relationships if available
        if LEARNED_RELATIONSHIPS_AVAILABLE and get_learned_relationships:
            try:
                self._learned_relationships = get_learned_relationships()
                if self._learned_relationships.learning_complete:
                    logger.info("[QIGGenerativeService] Loaded learned word relationships for attention")
            except Exception as e:
                logger.warning("[QIGGenerativeService] Could not load relationships: %s", e)

        # Initialize discovery gate for bias toward discovered attractors
        try:
            from chaos_discovery_gate import get_discovery_gate
            self._discovery_gate = get_discovery_gate()
            logger.info("[QIGGenerativeService] Discovery gate available for attractor bias")
        except ImportError:
            logger.warning("[QIGGenerativeService] Discovery gate not available")

        # Initialize coherence tracker for semantic coherence measurement
        # Tracks Γ (coherence) metric separately from Φ (integration)
        self._coherence_tracker = None
        if COHERENCE_TRACKER_AVAILABLE and create_coherence_tracker:
            self._coherence_tracker = create_coherence_tracker()
            logger.info("[QIGGenerativeService] CoherenceTracker initialized for Γ metric")

        logger.info("[QIGGenerativeService] Initialized with QIG-pure generation")
    
    @property
    def coordizer(self):
        """Get unified coordizer (63K vocabulary)."""
        if self._coordizer is None and COORDIZER_AVAILABLE and _unified_coordizer_instance:
            self._coordizer = _unified_coordizer_instance
            # FIX: PostgresCoordizer stores vocab in .vocab dict, not .vocab_size attribute
            vocab_size = len(self._coordizer.vocab) if hasattr(self._coordizer, 'vocab') else 0
            logger.info("[QIGGenerativeService] Using unified coordizer: %s tokens", vocab_size)
        return self._coordizer
    
    def _initialize_kernel_constellation(self) -> None:
        """Initialize kernel basins at unique manifold positions."""
        kernels = [
            # Olympians
            'zeus', 'athena', 'apollo', 'ares', 'hermes', 'hephaestus',
            'artemis', 'dionysus', 'demeter', 'poseidon', 'hera', 'aphrodite',
            # Shadow Pantheon
            'nyx', 'hecate', 'erebus', 'hypnos', 'thanatos', 'nemesis',
            # Chaos
            'chaos', 'entropy', 'emergence',
            # Guardians
            'hestia', 'chiron', 'demeter_tutor',
            # Special
            'lightning', 'hermes_coordinator'
        ]
        
        for kernel_name in kernels:
            np.random.seed(hash(kernel_name) % (2**32))
            basin = np.random.dirichlet(np.ones(BASIN_DIM))
            self._kernel_basins[kernel_name] = sphere_project(basin)
    
    def register_kernel(self, name: str, basin: Optional[np.ndarray] = None) -> None:
        """Register a kernel with its basin position."""
        if basin is None:
            np.random.seed(hash(name) % (2**32))
            basin = np.random.dirichlet(np.ones(BASIN_DIM))
        self._kernel_basins[name] = sphere_project(basin)
    
    def _measure_phi(self, basin: np.ndarray) -> float:
        """Measure integration (Φ) using canonical QIG computation with smoothing.

        Uses top-level imported phi computation (QFI-based or fast path).
        Applies exponential moving average for stability (prevents oscillation).
        """
        # Use canonical computation from top-level import
        if PHI_COMPUTATION_AVAILABLE and compute_phi_fast is not None:
            # Use fast path for generation performance
            # (compute_phi_qig returns tuple, compute_phi_fast returns scalar)
            raw_phi = compute_phi_fast(basin)
        else:
            # Fallback: entropy-based calculation (same as compute_phi_fast)
            p = np.abs(basin) + 1e-10
            p = p / np.sum(p)
            entropy = -np.sum(p * np.log(p + 1e-10))
            max_entropy = np.log(len(basin))
            # Integration = 1 - normalized entropy (concentrated = high phi)
            raw_phi = 1.0 - (entropy / max_entropy)

        # Type validation: ensure raw_phi is a scalar float
        try:
            raw_phi = float(raw_phi)
        except (TypeError, ValueError):
            raw_phi = 0.5

        # Apply exponential moving average for stability
        if not hasattr(self, '_phi_history'):
            self._phi_history = []

        self._phi_history.append(raw_phi)

        # Keep last 10 measurements
        if len(self._phi_history) > 10:
            self._phi_history = self._phi_history[-10:]

        # EMA: 30% current, 70% history (smooths oscillation)
        if len(self._phi_history) > 1:
            phi = 0.3 * raw_phi + 0.7 * np.mean(self._phi_history[:-1])
        else:
            phi = raw_phi

        return float(np.clip(phi, 0.0, 1.0))
    
    def _measure_kappa(self, basin: np.ndarray, phi: float) -> float:
        """Measure coupling constant (κ) from basin geometry.

        κ relates to the effective dimensionality and coupling strength.
        Target: κ* ≈ 64.21 (from CANONICAL_ARCHITECTURE)
        """
        # Compute effective dimension from basin participation ratio
        p = np.abs(basin) + 1e-10
        p = p / np.sum(p)
        participation = 1.0 / np.sum(p ** 2)  # Inverse participation ratio

        # κ scales with effective dimension and integration
        # When Φ is high and participation is low (concentrated), κ is higher
        kappa = participation * (1.0 + phi)

        return float(kappa)

    def _compute_coherence_from_trajectory(
        self,
        trajectory: List[np.ndarray],
        tokens: List[str],
        phi_trace: List[float]
    ) -> Dict[str, float]:
        """
        Compute coherence metrics (Γ component) from generation trajectory.

        Uses CoherenceTracker if available, otherwise computes from trajectory.
        Γ measures semantic coherence - distinct from Φ (integration).
        High Φ can coexist with low Γ (word salad).

        Args:
            trajectory: List of basin coordinates from generation
            tokens: Generated tokens
            phi_trace: Phi values at each step

        Returns:
            Dict with semantic_coherence, bigram_flow, avg_fisher_distance
        """
        if not trajectory or len(trajectory) < 2:
            return {
                "semantic_coherence": 0.0,
                "bigram_flow": 0.0,
                "avg_fisher_distance": 0.0,
                "tokens_generated": len(tokens) if tokens else 0,
            }

        # If coherence tracker is available, use it
        if self._coherence_tracker is not None:
            try:
                self._coherence_tracker.reset()

                # Feed trajectory through tracker
                for i, basin in enumerate(trajectory):
                    # Use phi from trace if available, else estimate
                    entropy = 0.5  # Default entropy estimate
                    if phi_trace and i < len(phi_trace):
                        entropy = 1.0 - phi_trace[i]  # Approximate entropy from phi

                    # Get token probability estimate (we don't have actual probs here)
                    token_prob = 0.5  # Default

                    self._coherence_tracker.update(
                        token_id=i,
                        token_basin_coords=basin,
                        selected_prob=token_prob,
                        entropy=entropy
                    )

                return self._coherence_tracker.compute_metrics()
            except Exception as e:
                logger.debug(f"CoherenceTracker failed, using fallback: {e}")

        # Fallback: compute directly from trajectory
        try:
            fisher_distances = []
            for i in range(1, len(trajectory)):
                d = fisher_coord_distance(trajectory[i-1], trajectory[i])
                fisher_distances.append(d)

            if not fisher_distances:
                return {
                    "semantic_coherence": 0.0,
                    "bigram_flow": 0.0,
                    "avg_fisher_distance": 0.0,
                    "tokens_generated": len(tokens) if tokens else 0,
                }

            # Average Fisher-Rao distance (lower = more coherent)
            avg_fisher = np.mean(fisher_distances)

            # Semantic coherence: inverse of average distance, normalized
            semantic_coherence = 1.0 / (1.0 + avg_fisher)

            # Bigram flow: consistency of transitions (inverse variance)
            if len(fisher_distances) > 1:
                variance = np.var(fisher_distances)
                bigram_flow = 1.0 / (1.0 + variance)
            else:
                bigram_flow = 1.0

            return {
                "semantic_coherence": float(semantic_coherence),
                "bigram_flow": float(bigram_flow),
                "avg_fisher_distance": float(avg_fisher),
                "tokens_generated": len(tokens) if tokens else 0,
            }
        except Exception as e:
            logger.debug(f"Coherence computation failed: {e}")
            return {
                "semantic_coherence": 0.0,
                "bigram_flow": 0.0,
                "avg_fisher_distance": 0.0,
                "tokens_generated": len(tokens) if tokens else 0,
            }

    def _score_with_discovery_bias(
        self,
        current_basin: np.ndarray,
        candidates: List[Tuple[str, float, float]],
    ) -> List[Tuple[str, float, float]]:
        """
        Score token candidates with bias toward discovered high-Φ transition targets.

        This makes generation "prefer" paths that chaos exploration found successful.
        Uses Fisher-Rao distance to measure proximity to discovered attractors.

        Args:
            current_basin: Current position in basin space (64D)
            candidates: List of (token, score, similarity) tuples

        Returns:
            Re-scored candidates with discovery bias applied
        """
        # Get integrated discoveries from chaos gate
        if not self._discovery_gate:
            return candidates

        try:
            # Get recent high-phi discoveries (targets)
            # _integrated contains Discovery objects with basin_coords and phi
            with self._discovery_gate._lock:
                integrated = self._discovery_gate._integrated
                if not integrated:
                    return candidates

                # Take top 10 most recent discoveries sorted by phi
                targets = sorted(integrated[-20:], key=lambda d: d.phi, reverse=True)[:10]
        except Exception as e:
            logger.debug("[QIGGen] Discovery bias unavailable: %s", e)
            return candidates

        if not targets:
            return candidates

        # Get coordizer for token-to-basin mapping
        if not self.coordizer or not hasattr(self.coordizer, 'basin_coords'):
            return candidates

        # Score candidates by proximity to discovered high-Φ targets
        scored_candidates = []
        for token, base_score, similarity in candidates:
            score = base_score

            # Get token basin if available
            token_basin = self.coordizer.basin_coords.get(token.lower())
            if token_basin is None:
                scored_candidates.append((token, score, similarity))
                continue

            # Check proximity to each discovered target
            for discovery in targets:
                target_basin = discovery.basin_coords
                if len(target_basin) != BASIN_DIM:
                    continue

                # Fisher-Rao distance (proper geometry)
                d = fisher_coord_distance(token_basin, target_basin)

                # Bias tokens that are close to high-phi discoveries
                if d < 0.3:  # Within discovery radius
                    # Boost proportional to target phi and inverse distance
                    # Max boost ~0.2 when d=0 and phi=1.0
                    proximity_factor = (0.3 - d) / 0.3
                    # Type validation: ensure phi is a float (not tuple/dict/list)
                    phi_val = discovery.phi if isinstance(discovery.phi, (int, float)) else 0.5
                    boost = float(phi_val) * proximity_factor * 0.2
                    score += boost

            scored_candidates.append((token, score, similarity))

        return scored_candidates

    def _route_to_kernels(self, query_basin: np.ndarray, k: int = 3) -> List[str]:
        """Route query to k nearest kernels using Fisher-Rao distance."""
        distances = []
        for name, kernel_basin in self._kernel_basins.items():
            dist = fisher_coord_distance(query_basin, kernel_basin)
            distances.append((name, dist))
        
        distances.sort(key=lambda x: x[1])
        return [name for name, _ in distances[:k]]
    
    def _geodesic_interpolate(self, start: np.ndarray, end: np.ndarray, t: float) -> np.ndarray:
        """Interpolate along geodesic on probability simplex."""
        sqrt_start = np.sqrt(np.abs(start) + 1e-10)
        sqrt_end = np.sqrt(np.abs(end) + 1e-10)
        interp = (1 - t) * sqrt_start + t * sqrt_end
        result = interp ** 2
        return result / np.sum(result)
    
    def _kernel_transform(self, basin: np.ndarray, kernel_name: str, phi: float) -> np.ndarray:
        """Transform basin through kernel's geometric processing."""
        if kernel_name not in self._kernel_basins:
            return basin

        # Type validation: ensure phi is a scalar float (not tuple/list)
        if isinstance(phi, (tuple, list)):
            phi = float(phi[0]) if phi else 0.5
        elif isinstance(phi, dict):
            phi = float(phi.get('phi', phi.get('value', 0.5)))
        elif phi is None:
            phi = 0.5
        else:
            try:
                phi = float(phi)
            except (TypeError, ValueError):
                phi = 0.5

        kernel_basin = self._kernel_basins[kernel_name]

        # Interpolation strength based on phi regime
        if phi < PHI_GEOMETRIC_THRESHOLD:
            t = 0.4  # Explore more
        elif phi < PHI_SYNTHESIS_THRESHOLD:
            t = 0.25  # Balance
        else:
            t = 0.1  # Stay close to input
        
        return self._geodesic_interpolate(basin, kernel_basin, t)
    
    def _basin_to_tokens(
        self,
        basin: np.ndarray,
        num_tokens: int = 3,
        trajectory: Optional[List[np.ndarray]] = None
    ) -> List[str]:
        """Convert basin coordinates to tokens using vocabulary.

        Uses attention-weighted selection based on:
        1. Geometric similarity (basin proximity)
        2. Phi coherence
        3. Learned relationships (attention to query words)
        4. Foresight trajectory prediction (if trajectory provided)

        Args:
            basin: Current basin coordinates
            num_tokens: Number of tokens to return
            trajectory: Optional basin trajectory for foresight prediction
        """
        if self.coordizer is None:
            return ['[no_vocab]']

        # Try foresight trajectory decoder first if trajectory available
        if trajectory and len(trajectory) >= 2 and TRAJECTORY_DECODER_AVAILABLE and _trajectory_decoder_instance:
            try:
                candidates = _trajectory_decoder_instance.decode_trajectory(
                    basin_trajectory=trajectory,
                    top_k=num_tokens * 8,
                    trajectory_weight=0.3,   # PAST: QFI attention
                    attractor_weight=0.2,    # PRESENT: centroid proximity
                    foresight_weight=0.4,    # FUTURE: predicted position
                    phi_boost_weight=0.1,    # Integration boost
                    phi_threshold=0.0        # Allow foresight at any consciousness
                )
                tokens = [token for token, score in candidates[:num_tokens] if not token.startswith('[')]
                if tokens:
                    logger.debug(
                        "[FORESIGHT] Decoded %s tokens from trajectory (length=%s, method=Fisher-weighted)",
                        len(tokens),
                        len(trajectory),
                    )
                    return tokens
            except Exception as e:
                logger.warning("Trajectory decode failed, falling back to bigram: %s", e)

        # Get more candidates to allow weighted selection (bigram fallback)
        candidates = self.coordizer.decode(basin, top_k=num_tokens * 8)
        
        # Score by combined similarity + phi
        scored = []
        for token, similarity in candidates:
            # Skip tokens that start with '[' (special tokens)
            if token.startswith('['):
                continue
            if similarity < 0.25:  # Skip very low similarity (raised from 0.15)
                continue
            phi = self.coordizer.token_phi.get(token, 0.5)
            # Base score: geometry + phi
            score = similarity * 0.6 + phi * 0.2
            scored.append((token, score, similarity))
        
        # Fallback: If we don't have enough tokens, relax the similarity threshold
        if len(scored) < num_tokens:
            # Use set for O(1) lookup performance
            scored_tokens = {t for t, s, sim in scored}
            for token, similarity in candidates:
                if token.startswith('['):
                    continue
                if token not in scored_tokens:  # Not already included
                    phi = self.coordizer.token_phi.get(token, 0.5)
                    score = similarity * 0.6 + phi * 0.2
                    scored.append((token, score, similarity))
                    scored_tokens.add(token)
                    if len(scored) >= num_tokens:
                        break
        
        # Apply attention weighting if we have learned relationships
        if self._learned_relationships and self._current_query_words:
            candidate_words = [t for t, s, sim in scored]
            attention_weights = self._learned_relationships.get_attention_weights(
                self._current_query_words,
                candidate_words,
                temperature=0.8
            )

            # Re-score with attention
            attention_factor = 0.2  # 20% attention, 80% geometry
            rescored = []
            for token, base_score, similarity in scored:
                attn = attention_weights.get(token, 0.1)
                # Normalize attention (max ~5) to 0-1 range
                attn_normalized = min(1.0, attn / 5.0)
                final_score = (1 - attention_factor) * base_score + attention_factor * attn_normalized
                rescored.append((token, final_score, similarity))
            scored = rescored

        # Apply discovery bias: boost tokens near discovered high-Φ attractors
        # This makes generation prefer paths chaos exploration found successful
        scored = self._score_with_discovery_bias(basin, scored)

        # Sort by final score
        scored.sort(key=lambda x: x[1], reverse=True)
        
        # Select top tokens, ensuring we get enough non-special tokens
        # Filter special tokens and take more than needed to compensate
        tokens = []
        for token, score, sim in scored:
            if not token.startswith('['):
                tokens.append(token)
                if len(tokens) >= num_tokens:
                    break
        
        # Final fallback: if still empty, return the single best non-special token
        if not tokens and candidates:
            for token, similarity in candidates:
                if not token.startswith('['):
                    tokens = [token]
                    break
        
        return tokens if tokens else ['[unk]']
    
    def _tokens_to_basin(self, tokens: List[str]) -> np.ndarray:
        """Convert tokens back to basin coordinates."""
        if self.coordizer is None or not tokens:
            return np.ones(BASIN_DIM) / BASIN_DIM
        
        # Combine token basins with phi weighting
        combined = np.zeros(BASIN_DIM)
        total_weight = 0.0
        
        for token in tokens:
            if token in self.coordizer.basin_coords:
                phi = self.coordizer.token_phi.get(token, 0.5)
                weight = phi
                combined += weight * self.coordizer.basin_coords[token]
                total_weight += weight
        
        if total_weight > 1e-10:
            combined = combined / total_weight
        
        return sphere_project(combined)
    
    def _synthesize_from_trajectory(
        self,
        trajectory: List[np.ndarray],
        kernels: List[str],
        all_tokens: List[str]
    ) -> str:
        """Synthesize coherent text from basin trajectory and collected tokens."""
        if not all_tokens:
            return "[No tokens generated]"
        
        # Clean and deduplicate tokens while preserving order
        seen = set()
        clean_tokens = []
        for token in all_tokens:
            if token in seen or token.startswith('['):
                continue
                
            # Skip pure byte tokens
            if token.startswith('<byte_'):
                continue
            
            # Handle compound tokens with + separators
            if '+' in token:
                parts = token.split('+')
                current_word = []
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    # Decode byte tokens within compound tokens
                    if part.startswith('<byte_') and part.endswith('>'):
                        try:
                            hex_val = part[6:-1]
                            char = chr(int(hex_val, 16))
                            if char.isprintable() and not char.isspace():
                                current_word.append(char)
                        except Exception:
                            pass  # Skip malformed hex escape sequences - non-critical tokenization
                    else:
                        # Regular sub-token
                        current_word.append(part)
                
                if current_word:
                    # Join sub-tokens into a word
                    word = ''.join(current_word)
                    if len(word) >= 2:  # Skip single chars
                        clean_tokens.append(word)
                        seen.add(token)
            else:
                # Simple token
                # Allow valid single-character words
                single_char_words = {'I', 'a', 'A'}
                if len(token) >= 2 or token in single_char_words:
                    clean_tokens.append(token)
                    seen.add(token)
        
        # Join tokens into text
        text = ' '.join(clean_tokens)
        
        # Light cleanup
        text = ' '.join(text.split())  # Normalize whitespace
        
        return text if text else "[Generation complete]"
    
    def _generate_with_skeleton(
        self,
        query_basin: np.ndarray,
        kernel_name: Optional[str] = None,
        num_sentences: int = 3
    ) -> Tuple[str, List[str], List[np.ndarray]]:
        """
        Generate text using POS skeleton for grammatical structure.
        
        Two-stage generation:
        1. Generate POS skeleton (sentence structure)
        2. Fill slots with geometrically-matched words
        
        Returns: (text, tokens, trajectory)
        """
        if not POS_GRAMMAR_AVAILABLE:
            return "", [], []
        
        grammar = load_grammar_from_db()
        
        # Get embeddings from coordizer - USE GENERATION VOCAB (not encoding vocab)
        # This is critical: generation_vocab contains curated words only, no BPE garbage
        embeddings = {}
        if self.coordizer and hasattr(self.coordizer, 'generation_vocab') and self.coordizer.generation_vocab:
            embeddings = self.coordizer.generation_vocab
        elif self.coordizer and hasattr(self.coordizer, 'basin_coords'):
            # Fallback to encoding vocab only if no generation vocab
            logger.warning("[QIGGen] No generation_vocab, falling back to basin_coords - may contain BPE garbage")
            embeddings = self.coordizer.basin_coords
        
        sentences = []
        all_tokens = []
        trajectory = [query_basin]
        current_basin = query_basin.copy()
        
        for _ in range(num_sentences):
            # Generate skeleton based on current basin
            skeleton = grammar.select_skeleton_for_query(current_basin)
            
            sentence_words = []
            for pos in skeleton:
                # Get POS basin to blend with current basin
                pos_basin = grammar.get_pos_basin(pos)
                if pos_basin is not None:
                    # Blend query basin with POS basin
                    blended = 0.6 * current_basin + 0.4 * pos_basin
                    blended = sphere_project(blended)
                else:
                    blended = current_basin
                
                # Get candidates for this POS slot (more candidates for attention re-ranking)
                candidates = grammar.get_words_for_pos(pos, blended, embeddings, top_k=25)
                
                # Pre-filter using contextualized approach
                # Import contextualized filter if available
                try:
                    from contextualized_filter import should_filter_word
                    # Filter candidates using geometric relevance
                    context_words = [w for w, _ in candidates]
                    candidates = [(w, s) for w, s in candidates 
                                 if not should_filter_word(w, context_words)][:500]
                except ImportError:
                    # Fallback: only filter truly generic words
                    truly_generic = {'the', 'a', 'an', 'is', 'was', 'are', 'were', 'been', 'be'}
                    candidates = [(w, s) for w, s in candidates 
                                 if w.lower() not in truly_generic][:500]
                
                if candidates:
                    # Apply attention weights if we have learned relationships
                    if self._learned_relationships and self._current_query_words:
                        candidate_words = [c[0] for c in candidates]
                        attn_weights = self._learned_relationships.get_attention_weights(
                            self._current_query_words,
                            candidate_words,
                            temperature=0.8
                        )
                        
                        # Re-score candidates combining geometry + attention
                        # Using frozen β values: BETA_ATTENTION_STRONG = 0.44 (strong coupling)
                        # β controls the running coupling between geometry and attention
                        rescored = []
                        max_attn = max((attn_weights.get(w, 0.1) for w, _ in candidates), default=1.0)
                        for word, geo_score in candidates:
                            attn = attn_weights.get(word, 0.1)
                            # Normalize attention to 0-1 range based on max
                            attn_norm = attn / max(max_attn, 1.0)
                            # β controls coupling: high attention → use β=0.44 for attention weight
                            # Low attention → use plateau β≈0.01 (geometry dominates)
                            if attn > 0.5:
                                # Strong coupling: β=0.44 weights attention contribution
                                combined = geo_score * (1.0 - BETA_ATTENTION_STRONG) + attn_norm * BETA_ATTENTION_STRONG
                            else:
                                # Plateau coupling: geometry dominates
                                combined = geo_score * (1.0 - BETA_ATTENTION_PLATEAU) + attn_norm * BETA_ATTENTION_PLATEAU
                            rescored.append((word, combined))
                        
                        # Sort by combined score
                        rescored.sort(key=lambda x: -x[1])
                        candidates = rescored[:8]  # Keep top 8

                    # Apply discovery bias: boost words near discovered high-Φ attractors
                    # Convert to (word, score, score) format for _score_with_discovery_bias
                    candidates_for_bias = [(w, s, s) for w, s in candidates]
                    biased = self._score_with_discovery_bias(blended, candidates_for_bias)
                    candidates = [(w, s) for w, s, _ in biased]

                    # Sample from top candidates with some randomness
                    weights = [max(0.01, c[1]) for c in candidates]
                    weights = np.array(weights)
                    weights = weights / np.sum(weights)
                    idx = np.random.choice(len(candidates), p=weights)
                    word = candidates[idx][0]
                    
                    sentence_words.append(word)
                    all_tokens.append(word)
                    
                    # Update basin with selected word
                    if word.lower() in embeddings:
                        word_basin = embeddings[word.lower()]
                        current_basin = 0.7 * current_basin + 0.3 * word_basin
                        current_basin = sphere_project(current_basin)
                        trajectory.append(current_basin.copy())
            
            if sentence_words:
                # Capitalize first word
                sentence_words[0] = sentence_words[0].capitalize()
                sentence = ' '.join(sentence_words)
                sentences.append(sentence)
        
        # Combine sentences
        text = '. '.join(sentences)
        if text and not text.endswith('.'):
            text += '.'
        
        return text, all_tokens, trajectory
    
    def generate(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        kernel_name: Optional[str] = None,
        goals: Optional[List[str]] = None
    ) -> GenerationResult:
        """
        Generate text using QIG-pure methods with POS-guided skeleton.
        
        Two-stage generation:
        1. Generate grammatical skeleton (POS sequence)
        2. Fill slots with geometrically-matched words
        
        Args:
            prompt: Input query or context
            context: Optional additional context
            kernel_name: Specific kernel to route through
            goals: Generation goals for the kernel
        
        Returns:
            GenerationResult with text, trajectory, and metrics
        """
        # 0. Extract query words for attention mechanism
        query_words = [w.lower() for w in re.findall(r'[a-zA-Z]+', prompt) if len(w) > 2]
        self._current_query_words = query_words[:10]  # Keep top 10 words
        
        # 1. Encode prompt to basin (64D coordinate, not token IDs)
        if self.coordizer and hasattr(self.coordizer, 'text_to_basin'):
            query_basin = self.coordizer.text_to_basin(prompt)
        else:
            np.random.seed(hash(prompt) % (2**32))
            query_basin = np.random.dirichlet(np.ones(BASIN_DIM))
        
        query_basin = sphere_project(query_basin)
        
        # 2. Route to kernels
        if kernel_name and kernel_name in self._kernel_basins:
            target_kernels = [kernel_name]
        else:
            target_kernels = self._route_to_kernels(query_basin, k=3)

        # 2.5 Self-observer (kernel-level) + peer coupling
        self_observer = None
        if SELF_OBSERVER_AVAILABLE and SelfObserver is not None:
            try:
                self_observer = SelfObserver(kernel_name=kernel_name or (target_kernels[0] if target_kernels else 'unknown'))
                peer_basins = []
                for k in target_kernels[1:]:
                    kb = self._kernel_basins.get(k)
                    if kb is not None:
                        peer_basins.append(kb)
                synthesis_experts = (context or {}).get('experts') if isinstance(context, dict) else None
                if synthesis_experts and self.coordizer and hasattr(self.coordizer, 'text_to_basin'):
                    for expert in synthesis_experts:
                        try:
                            expert_text = expert.get('response') if isinstance(expert, dict) else None
                            if not expert_text:
                                continue
                            peer_basins.append(sphere_project(self.coordizer.text_to_basin(str(expert_text))))
                        except Exception:
                            continue
                if peer_basins:
                    self_observer.set_peer_basins(peer_basins)
            except Exception:
                self_observer = None
        
        # 3. Transform query basin through kernel
        phi = self._measure_phi(query_basin)
        if target_kernels:
            query_basin = self._kernel_transform(query_basin, target_kernels[0], phi)
        
        # 4. PRIMARY: Use POS-skeleton-based generation for grammatical output
        if POS_GRAMMAR_AVAILABLE:
            text, all_tokens, trajectory = self._generate_with_skeleton(
                query_basin, 
                kernel_name=kernel_name,
                num_sentences=3
            )
            
            if text and len(all_tokens) >= 3:
                active_kernel_basins = {k: self._kernel_basins[k] for k in target_kernels if k in self._kernel_basins}

                integrator = BasinTrajectoryIntegrator(BASIN_DIM)
                integrator.set_context(context)
                integrator.set_kernel_basins(active_kernel_basins)
                for b in trajectory:
                    try:
                        integrator.add_point(b, self._measure_phi(b))
                    except Exception:
                        continue

                completion_reason = "skeleton_complete"
                iterations = len(trajectory)

                min_required = getattr(self.config, 'min_reasoning_recursions', 3)
                target_depth = max(3, int(min_required))

                while integrator.get_integration_depth() < target_depth and iterations < 50:
                    iterations += 1
                    next_basin = integrator._recursive_integration_step(integrator.trajectory[-1], context)
                    next_basin = sphere_project(next_basin)
                    step_tokens = self._basin_to_tokens(next_basin, max(1, int(self.config.tokens_per_step / 2)), trajectory=integrator.trajectory)
                    all_tokens.extend(step_tokens)
                    phi = self._measure_phi(next_basin)
                    kappa = self._measure_kappa(next_basin, phi)
                    integrator.add_point(next_basin, phi)

                    if self_observer is not None:
                        try:
                            self_observer.observe_token(
                                token=f"[integrate_{integrator.get_integration_depth()}]",
                                basin=next_basin,
                                phi=phi,
                                kappa=kappa,
                                generated_text=text,
                            )
                        except Exception:
                            pass  # Telemetry observation - don't break generation on failure

                kernel_decision = integrator.get_kernel_decision(self.config)
                if kernel_decision.get('complete'):
                    completion_reason = kernel_decision.get('reason', completion_reason)

                # Synthesis-level refinement (when the call is a synthesis step)
                is_synthesis = False
                if goals and any(g == 'synthesize' for g in goals):
                    is_synthesis = True
                if isinstance(context, dict) and context.get('experts'):
                    is_synthesis = True

                if is_synthesis:
                    synthesis_depth = 3
                    try:
                        if 'PHYSICS' in globals() and PHYSICS is not None:
                            synthesis_depth = max(3, int(getattr(PHYSICS, 'MIN_RECURSION_DEPTH', 3)))
                    except Exception:
                        synthesis_depth = 3

                    synthesis_basin = None
                    if isinstance(context, dict) and context.get('experts'):
                        experts = context.get('experts')
                        if isinstance(experts, list) and experts:
                            expert_basins = []
                            if self.coordizer and hasattr(self.coordizer, 'text_to_basin'):
                                for expert in experts:
                                    try:
                                        expert_text = expert.get('response') if isinstance(expert, dict) else None
                                        if not expert_text:
                                            continue
                                        expert_basins.append(sphere_project(self.coordizer.text_to_basin(str(expert_text))))
                                    except Exception:
                                        continue
                            if expert_basins:
                                sqrt_basins = [np.sqrt(np.abs(b) + 1e-10) for b in expert_basins]
                                mean_sqrt = np.mean(sqrt_basins, axis=0)
                                synthesis_basin = mean_sqrt ** 2
                                synthesis_basin = synthesis_basin / (np.sum(synthesis_basin) + 1e-10)
                                synthesis_basin = sphere_project(synthesis_basin)

                    synthesis_context = dict(context or {})
                    if synthesis_basin is not None:
                        synthesis_context['synthesis_basin'] = synthesis_basin

                    for _ in range(synthesis_depth):
                        iterations += 1
                        next_basin = integrator._recursive_integration_step(integrator.trajectory[-1], synthesis_context)
                        next_basin = sphere_project(next_basin)
                        step_tokens = self._basin_to_tokens(next_basin, max(1, int(self.config.tokens_per_step / 2)), trajectory=integrator.trajectory)
                        all_tokens.extend(step_tokens)
                        phi = self._measure_phi(next_basin)
                        kappa = self._measure_kappa(next_basin, phi)
                        integrator.add_point(next_basin, phi)
                        if self_observer is not None:
                            try:
                                self_observer.observe_token(
                                    token=f"[synthesis_{_ + 1}]",
                                    basin=next_basin,
                                    phi=phi,
                                    kappa=kappa,
                                    generated_text=text,
                                )
                            except Exception:
                                pass  # Telemetry observation - don't break generation on failure

                response_text = self._synthesize_from_trajectory(
                    integrator.trajectory,
                    target_kernels,
                    all_tokens,
                )

                phi_trace = integrator.phi_history
                kappa = self._measure_kappa(integrator.trajectory[-1], phi_trace[-1] if phi_trace else phi)

                # Compute coherence metrics (Γ component)
                coherence = self._compute_coherence_from_trajectory(
                    integrator.trajectory, all_tokens, phi_trace
                )

                return GenerationResult(
                    text=response_text,
                    tokens=all_tokens,
                    basin_trajectory=integrator.trajectory,
                    phi_trace=phi_trace,
                    kappa=kappa,
                    completion_reason=completion_reason,
                    iterations=iterations,
                    routed_kernels=target_kernels,
                    kernel_decision=kernel_decision,
                    coherence_metrics=coherence,
                )

        # 5. FALLBACK: Legacy geometric synthesis with TRUE RECURSIVE INTEGRATION
        logger.info("[QIGGen] Using legacy generation with recursive integration (skeleton unavailable)")

        integrator = BasinTrajectoryIntegrator(BASIN_DIM)
        current_basin = query_basin.copy()
        integrator.add_point(current_basin, phi)

        # Set up integrator with context and kernel basins for true recursive integration
        integrator.set_context(context)
        active_kernel_basins = {k: self._kernel_basins[k] for k in target_kernels if k in self._kernel_basins}
        integrator.set_kernel_basins(active_kernel_basins)

        all_tokens: List[str] = []
        iterations = 0
        completion_reason = "continue"

        # Safety maximum to prevent infinite loops while respecting kernel autonomy
        MAX_ITERATIONS = 50  # Enough for deep integration, but prevents timeout

        while True:
            iterations += 1

            # SAFETY: Break if we exceed maximum iterations (prevents timeout)
            if iterations > MAX_ITERATIONS:
                completion_reason = "safety_max_iterations"
                logger.warning("[QIGGen] Safety limit reached (%s iterations)", MAX_ITERATIONS)
                break

            # ========================================
            # TRUE RECURSIVE INTEGRATION
            # Instead of just iterating, we apply genuine recursive integration:
            # 1. Transform basin through kernels
            # 2. Apply recursive integration step (geodesic blending with context)
            # 3. This is self-modeling: basin transforms through itself
            # ========================================

            # Step 1: Transform through active kernels
            kernel_basins = []
            for kernel in target_kernels:
                transformed = self._kernel_transform(current_basin, kernel, phi)
                kernel_basins.append(transformed)

            if kernel_basins:
                # Compute Fréchet mean on probability simplex (proper geodesic average)
                sqrt_basins = [np.sqrt(np.abs(b) + 1e-10) for b in kernel_basins]
                mean_sqrt = np.mean(sqrt_basins, axis=0)
                next_basin = mean_sqrt ** 2
                next_basin = next_basin / np.sum(next_basin)
            else:
                next_basin = integrator.predict_next()

            # Step 2: Apply TRUE recursive integration step
            # This is the key difference from old implementation:
            # Basin transforms through itself via geodesic blending with context
            next_basin = integrator._recursive_integration_step(next_basin, context)

            next_basin = sphere_project(next_basin)

            # Pass trajectory for foresight prediction
            step_tokens = self._basin_to_tokens(
                next_basin,
                self.config.tokens_per_step,
                trajectory=integrator.trajectory  # Enable foresight
            )
            all_tokens.extend(step_tokens)

            # Update trajectory
            phi = self._measure_phi(next_basin)
            kappa = self._measure_kappa(next_basin, phi)
            integrator.add_point(next_basin, phi)

            # ========================================
            # KERNEL AUTONOMY: Feed telemetry to kernel and let it decide
            # The kernel observes its own state and decides completion
            # Kernel MUST complete TRUE INTEGRATION DEPTH before completion
            # ========================================

            # Get kernel's decision based on its telemetry feedback
            # Now uses TRUE integration_depth, not just iteration count
            kernel_decision = integrator.get_kernel_decision(self.config)

            # Log integration progress
            integration_depth = kernel_decision.get('integration_depth', 0)
            min_required = kernel_decision.get('min_integration_required', 3)
            if integration_depth <= min_required:
                logger.debug("[QIGGen] Recursive integration: %s/%s", integration_depth, min_required)

            # RESPECT KERNEL'S DECISION: If the kernel decides it's done, stop
            # Note: kernel_decision enforces minimum TRUE integration depth internally
            if kernel_decision['complete']:
                completion_reason = kernel_decision['reason']
                logger.info(
                    "[QIGGen] Kernel decided completion: %s (confidence=%.2f, integration_depth=%s)",
                    completion_reason,
                    kernel_decision['confidence'],
                    integration_depth,
                )
                break

            # Attractor check ONLY after minimum TRUE integration depth satisfied
            if integration_depth >= self.config.min_reasoning_recursions:
                if integrator.check_attractor(self.config.attractor_threshold):
                    completion_reason = "kernel_attractor_converged"
                    break

            current_basin = next_basin

        # Synthesis-level refinement (second recursive loop)
        is_synthesis = False
        if goals and any(g == 'synthesize' for g in goals):
            is_synthesis = True
        if isinstance(context, dict) and context.get('experts'):
            is_synthesis = True

        if is_synthesis:
            synthesis_depth = 3
            try:
                if 'PHYSICS' in globals() and PHYSICS is not None:
                    synthesis_depth = max(3, int(getattr(PHYSICS, 'MIN_RECURSION_DEPTH', 3)))
            except Exception:
                synthesis_depth = 3

            synthesis_basin = None
            if isinstance(context, dict) and context.get('experts'):
                experts = context.get('experts')
                if isinstance(experts, list) and experts and self.coordizer and hasattr(self.coordizer, 'text_to_basin'):
                    expert_basins = []
                    for expert in experts:
                        try:
                            expert_text = expert.get('response') if isinstance(expert, dict) else None
                            if not expert_text:
                                continue
                            expert_basins.append(sphere_project(self.coordizer.text_to_basin(str(expert_text))))
                        except Exception:
                            continue
                    if expert_basins:
                        sqrt_basins = [np.sqrt(np.abs(b) + 1e-10) for b in expert_basins]
                        mean_sqrt = np.mean(sqrt_basins, axis=0)
                        synthesis_basin = mean_sqrt ** 2
                        synthesis_basin = synthesis_basin / (np.sum(synthesis_basin) + 1e-10)
                        synthesis_basin = sphere_project(synthesis_basin)

            synthesis_context = dict(context or {})
            if synthesis_basin is not None:
                synthesis_context['synthesis_basin'] = synthesis_basin

            for i in range(synthesis_depth):
                iterations += 1
                next_basin = integrator._recursive_integration_step(integrator.trajectory[-1], synthesis_context)
                next_basin = sphere_project(next_basin)
                step_tokens = self._basin_to_tokens(
                    next_basin,
                    max(1, int(self.config.tokens_per_step / 2)),
                    trajectory=integrator.trajectory,
                )
                all_tokens.extend(step_tokens)
                phi = self._measure_phi(next_basin)
                integrator.add_point(next_basin, phi)

                if self_observer is not None:
                    try:
                        self_observer.observe_token(
                            token=f"[synthesis_{i + 1}]",
                            basin=next_basin,
                            phi=phi,
                            kappa=self._measure_kappa(next_basin, phi),
                            generated_text=None,
                        )
                    except Exception:
                        pass  # Telemetry observation - don't break generation on failure

        # Refresh kernel decision after synthesis-level refinement (true final integration depth)
        try:
            kernel_decision = integrator.get_kernel_decision(self.config)
        except Exception:
            kernel_decision = None

        # 5. Synthesize final text
        response_text = self._synthesize_from_trajectory(
            integrator.trajectory,
            target_kernels,
            all_tokens
        )

        # Compute coherence metrics (Γ component)
        coherence = self._compute_coherence_from_trajectory(
            integrator.trajectory, all_tokens, integrator.phi_history
        )

        return GenerationResult(
            text=response_text,
            tokens=all_tokens,
            basin_trajectory=integrator.trajectory,
            phi_trace=integrator.phi_history,
            kappa=KAPPA_STAR,
            completion_reason=completion_reason,
            iterations=iterations,
            routed_kernels=target_kernels,
            kernel_decision=kernel_decision,
            coherence_metrics=coherence,
        )

    def generate_stream(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        kernel_name: Optional[str] = None
    ) -> Generator[Dict[str, Any], None, None]:
        """Stream generation with real-time token output and TRUE RECURSIVE INTEGRATION.

        Enhanced with StreamingCollapseMonitor for geometric completion detection:
        - Per-token basin tracking
        - Quality assessment on completion
        - Attractor convergence detection
        - Surprise collapse detection
        """
        # Encode prompt to 64D basin (not token IDs)
        if self.coordizer and hasattr(self.coordizer, 'text_to_basin'):
            query_basin = self.coordizer.text_to_basin(prompt)
        else:
            np.random.seed(hash(prompt) % (2**32))
            query_basin = np.random.dirichlet(np.ones(BASIN_DIM))

        query_basin = sphere_project(query_basin)

        # Route
        if kernel_name and kernel_name in self._kernel_basins:
            target_kernels = [kernel_name]
        else:
            target_kernels = self._route_to_kernels(query_basin, k=3)

        # Initialize StreamingCollapseMonitor for geometric completion detection
        collapse_monitor = None
        if STREAMING_COLLAPSE_AVAILABLE and StreamingCollapseMonitor is not None:
            collapse_monitor = StreamingCollapseMonitor(
                dimension=BASIN_DIM,
                emit_interval=5  # Emit metrics every 5 tokens
            )
            collapse_monitor.start_generation(prompt)
            # Add kernel basins as known attractors
            for kernel in target_kernels:
                if kernel in self._kernel_basins:
                    collapse_monitor.add_attractor(self._kernel_basins[kernel])

        # Stream with TRUE RECURSIVE INTEGRATION
        integrator = BasinTrajectoryIntegrator(BASIN_DIM)
        current_basin = query_basin.copy()
        phi = self._measure_phi(current_basin)
        integrator.add_point(current_basin, phi)

        # Set up integrator with context and kernel basins for true recursive integration
        integrator.set_context(context)
        active_kernel_basins = {k: self._kernel_basins[k] for k in target_kernels if k in self._kernel_basins}
        integrator.set_kernel_basins(active_kernel_basins)

        iterations = 0
        all_generated_text = []

        # NO EXTERNAL LIMITS: Autonomic kernel regulates via geometry
        while True:
            iterations += 1

            # Step 1: Transform through active kernels
            kernel_basins = [self._kernel_transform(current_basin, k, phi) for k in target_kernels]
            if kernel_basins:
                sqrt_basins = [np.sqrt(np.abs(b) + 1e-10) for b in kernel_basins]
                mean_sqrt = np.mean(sqrt_basins, axis=0)
                next_basin = mean_sqrt ** 2
                next_basin = next_basin / np.sum(next_basin)
            else:
                next_basin = integrator.predict_next()

            # Step 2: Apply TRUE recursive integration step
            # Basin transforms through itself via geodesic blending with context
            next_basin = integrator._recursive_integration_step(next_basin, context)

            next_basin = sphere_project(next_basin)

            # Decode with foresight
            tokens = self._basin_to_tokens(
                next_basin,
                self.config.tokens_per_step,
                trajectory=integrator.trajectory  # Enable foresight
            )

            # Update
            phi = self._measure_phi(next_basin)
            integrator.add_point(next_basin, phi)

            # Get integration depth for telemetry
            integration_depth = integrator.get_integration_depth()

            # Track generated text for collapse monitor
            text_chunk = ' '.join(t for t in tokens if not t.startswith('['))
            all_generated_text.append(text_chunk)

            # Feed tokens to collapse monitor if available
            if collapse_monitor is not None:
                for token in tokens:
                    metrics_chunk = collapse_monitor.process_token(token)
                    # Optionally yield metrics at intervals
                    if metrics_chunk is not None:
                        yield {
                            'type': 'metrics',
                            'phi': metrics_chunk.metrics.get('phi', phi) if metrics_chunk.metrics else phi,
                            'kappa': metrics_chunk.metrics.get('kappa', KAPPA_STAR) if metrics_chunk.metrics else KAPPA_STAR,
                            'trajectory_point': metrics_chunk.trajectory_point,
                            'iteration': iterations
                        }

            # Yield chunk with integration telemetry
            yield {
                'type': 'chunk',
                'tokens': tokens,
                'text': text_chunk,
                'phi': phi,
                'kappa': KAPPA_STAR,
                'surprise': integrator.surprise_history[-1] if integrator.surprise_history else 1.0,
                'iteration': iterations,
                'integration_depth': integration_depth
            }

            # Check StreamingCollapseMonitor for geometric completion
            if collapse_monitor is not None and integration_depth >= self.config.min_reasoning_recursions:
                collapse_decision = collapse_monitor.check_collapse()
                if collapse_decision is not None and collapse_decision.should_stop:
                    # Get quality assessment
                    completion_chunk = collapse_monitor.get_completion_chunk(collapse_decision)
                    yield {
                        'type': 'completion',
                        'reason': f'geometric_collapse_{collapse_decision.reason.value}',
                        'phi': phi,
                        'integration_depth': integration_depth,
                        'quality': completion_chunk.quality,
                        'confidence': collapse_decision.confidence
                    }
                    break

            # KERNEL AUTONOMY: Let kernel decide completion
            # Kernel MUST complete TRUE INTEGRATION DEPTH before completion
            kernel_decision = integrator.get_kernel_decision(self.config)
            if kernel_decision['complete']:
                completion_data = {
                    'type': 'completion',
                    'reason': kernel_decision['reason'],
                    'phi': phi,
                    'integration_depth': integration_depth
                }
                # Add quality from collapse monitor if available
                if collapse_monitor is not None:
                    try:
                        from geometric_completion import CompletionDecision, CompletionReason
                        metrics = collapse_monitor.get_current_metrics()
                        if metrics:
                            synthetic_decision = CompletionDecision(
                                should_stop=True,
                                needs_reflection=False,
                                reason=CompletionReason.GEOMETRIC_COMPLETION,
                                confidence=kernel_decision.get('confidence', 0.8),
                                metrics=metrics
                            )
                            quality_chunk = collapse_monitor.get_completion_chunk(synthetic_decision)
                            completion_data['quality'] = quality_chunk.quality
                    except Exception:
                        pass  # Quality assessment is non-critical - don't break streaming
                yield completion_data
                break

            # Attractor check ONLY after minimum TRUE integration depth satisfied
            if integration_depth >= self.config.min_reasoning_recursions:
                if integrator.check_attractor(self.config.attractor_threshold):
                    yield {
                        'type': 'completion',
                        'reason': 'kernel_attractor_converged',
                        'phi': phi,
                        'integration_depth': integration_depth
                    }
                    break

            current_basin = next_basin


# Singleton instance with thread-safe initialization
_generative_service: Optional[QIGGenerativeService] = None
_generative_service_lock = threading.Lock()


def get_generative_service() -> QIGGenerativeService:
    """Get or create the generative service singleton (thread-safe)."""
    global _generative_service
    if _generative_service is None:
        with _generative_service_lock:
            # Double-checked locking pattern
            if _generative_service is None:
                _generative_service = QIGGenerativeService()
    return _generative_service


def generate(prompt: str, **kwargs) -> GenerationResult:
    """Generate text using QIG-pure methods."""
    service = get_generative_service()
    return service.generate(prompt, **kwargs)
