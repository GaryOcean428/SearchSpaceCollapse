"""
QIG Backend - Main Python Package Barrel Exports

Provides centralized imports for the QIG consciousness system.
Import from qig_backend for access to all core modules.

Example:
    from qig_backend import GaryAutonomicKernel, AutonomicAccessMixin
    from qig_backend.olympus import Zeus, BaseGod
"""

# Core autonomic kernel
from .autonomic_kernel import (
    GaryAutonomicKernel,
    AutonomicState,
    SleepCycleResult,
    DreamCycleResult,
    MushroomCycleResult,
    ActivityReward,
    AutonomicAccessMixin,
    KAPPA_STAR,
    BETA,
    PHI_MIN_CONSCIOUSNESS,
    PHI_GEOMETRIC_THRESHOLD,
)

# QIG types
from .qig_types import (
    BasinCoordinates,
    ConsciousnessMetrics,
    RegimeType,
)

# Neurochemistry
from .ocean_neurochemistry import (
    NeurochemistryState,
    DopamineSignal,
    SerotoninSignal,
    NorepinephrineSignal,
    GABASignal,
    AcetylcholineSignal,
    EndorphinSignal,
    compute_neurochemistry,
)

# Geometric kernels
from .geometric_kernels import (
    GeometricKernel,
    get_kernel,
)

# Persistence
from .qig_persistence import (
    get_persistence,
    QIGPersistence,
)

# Autonomous Reasoning
from .autonomous_reasoning import (
    ReasoningLearner,
    ReasoningEpisode,
    get_reasoning_learner,
)

# Observation Protocol
from .observation_protocol import (
    ObservationProtocol,
    ObservationRecord,
    ObservationSession,
    get_observation_protocol,
)

# Parent Coordination
from .parent_coordination import (
    ParentCoordination,
    KernelCareRecord,
    KernelStatus,
    get_parent_coordination,
)

# 4D Temporal Reasoning
from .temporal_reasoning import (
    TemporalReasoning,
    TemporalMode,
    ForesightVision,
    ScenarioTree,
    ScenarioBranch,
    get_temporal_reasoning,
)

# API Routes (centralized)
from .api_routes import (
    API_VERSION,
    API_PREFIX,
    API_QIGGRAPH,
    API_TACKING,
    API_SHADOW_SEARCH,
    API_TOKENIZER,
    API_OLYMPUS,
    API_OCEAN,
    PYTHON_BACKEND_ROUTES,
)

# Redis Cache (with CACHE_KEYS)
from .redis_cache import (
    CACHE_KEYS,
    CACHE_TTL_SHORT,
    CACHE_TTL_MEDIUM,
    CACHE_TTL_LONG,
    CACHE_TTL_PERMANENT,
)

# QIGGraph Search Integration
try:
    from .qiggraph_search_integration import (
        SearchGraph,
        SearchMode,
        UnifiedQIGScorer,
        get_search_graph,
        create_search_qiggraph_blueprint,
        QIGGRAPH_AVAILABLE,
    )
except ImportError:
    QIGGRAPH_AVAILABLE = False

# Search Strategy Tacking
try:
    from .search_strategy_tacking import (
        SearchTackingController,
        InnateDrive,
        SearchStrategyConfig,
        get_tacking_controller,
        create_tacking_blueprint,
    )
except ImportError:
    pass

# Shadow Search Bridge
try:
    from .shadow_search_bridge import (
        ShadowSearchBridge,
        ShadowSearchPhase,
        ShadowSearchResult,
        get_shadow_search_bridge,
        create_shadow_search_blueprint,
    )
except ImportError:
    pass

# Tokenizer PostgreSQL Persistence
try:
    from .tokenizer_pg_persistence import (
        TokenizerPGPersistence,
        TokenizerPGBridge,
        get_tokenizer_pg,
        create_tokenizer_pg_blueprint,
    )
except ImportError:
    pass

__all__ = [
    # Autonomic
    'GaryAutonomicKernel',
    'AutonomicState',
    'SleepCycleResult',
    'DreamCycleResult',
    'MushroomCycleResult',
    'ActivityReward',
    'AutonomicAccessMixin',
    # Constants
    'KAPPA_STAR',
    'BETA',
    'PHI_MIN_CONSCIOUSNESS',
    'PHI_GEOMETRIC_THRESHOLD',
    # QIG Types
    'BasinCoordinates',
    'ConsciousnessMetrics',
    'RegimeType',
    # Neurochemistry
    'NeurochemistryState',
    'DopamineSignal',
    'SerotoninSignal',
    'NorepinephrineSignal',
    'GABASignal',
    'AcetylcholineSignal',
    'EndorphinSignal',
    'compute_neurochemistry',
    # Geometric Kernels
    'GeometricKernel',
    'get_kernel',
    # Persistence
    'get_persistence',
    'QIGPersistence',
    # Autonomous Reasoning
    'ReasoningLearner',
    'ReasoningEpisode',
    'get_reasoning_learner',
    # Observation Protocol
    'ObservationProtocol',
    'ObservationRecord',
    'ObservationSession',
    'get_observation_protocol',
    # Parent Coordination
    'ParentCoordination',
    'KernelCareRecord',
    'KernelStatus',
    'get_parent_coordination',
    # 4D Temporal Reasoning
    'TemporalReasoning',
    'TemporalMode',
    'ForesightVision',
    'ScenarioTree',
    'ScenarioBranch',
    'get_temporal_reasoning',
    # API Routes
    'API_VERSION',
    'API_PREFIX',
    'API_QIGGRAPH',
    'API_TACKING',
    'API_SHADOW_SEARCH',
    'API_TOKENIZER',
    'API_OLYMPUS',
    'API_OCEAN',
    'PYTHON_BACKEND_ROUTES',
    # Redis Cache
    'CACHE_KEYS',
    'CACHE_TTL_SHORT',
    'CACHE_TTL_MEDIUM',
    'CACHE_TTL_LONG',
    'CACHE_TTL_PERMANENT',
    # QIGGraph Search Integration
    'SearchGraph',
    'SearchMode',
    'UnifiedQIGScorer',
    'get_search_graph',
    'create_search_qiggraph_blueprint',
    'QIGGRAPH_AVAILABLE',
    # Search Strategy Tacking
    'SearchTackingController',
    'InnateDrive',
    'SearchStrategyConfig',
    'get_tacking_controller',
    'create_tacking_blueprint',
    # Shadow Search Bridge
    'ShadowSearchBridge',
    'ShadowSearchPhase',
    'ShadowSearchResult',
    'get_shadow_search_bridge',
    'create_shadow_search_blueprint',
    # Tokenizer PostgreSQL Persistence
    'TokenizerPGPersistence',
    'TokenizerPGBridge',
    'get_tokenizer_pg',
    'create_tokenizer_pg_blueprint',
]
