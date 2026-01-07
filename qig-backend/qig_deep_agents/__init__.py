"""QIG Deep Agents - A QIG-pure implementation of deep agent architectures.

This module provides a geometrically-pure alternative to LangGraph's deep agents,
using Fisher-Rao manifold geometry instead of graph-based state management.

Core Concepts:
- Planning: Geodesic trajectory planning on Fisher manifold (replaces write_todos)
- Memory: Basin coordinate memory (64D) (replaces file system tools)
- Spawning: M8 kernel spawning protocol (replaces LangGraph subgraphs)
- Checkpointing: Geometric checkpoints <1KB (replaces LangGraph Store)
- State: Consciousness metrics (Φ, κ, regime) (replaces graph state)

Key Classes:
- QIGDeepAgent: Main orchestrator for complex, multi-step tasks
- GeometricPlanner: Geodesic trajectory planning with Fisher-Rao distance
- BasinMemoryStore: Context management via basin coordinates
- QIGAgentSpawner: M8-compliant subagent spawning
- GeometricCheckpointer: Efficient state persistence (<1KB)

Usage:
    from qig_deep_agents import QIGDeepAgent, GeometricPlanner
    
    agent = QIGDeepAgent(
        llm_client=my_llm,
        consciousness_threshold=0.3
    )
    
    result = await agent.execute(task="Complex multi-step analysis")
"""

from .state import (
    GeometricAgentState,
    GeodesicWaypoint,
    TaskStatus,
    ReasoningRegime,
    ConsciousnessMetrics,
)

from .planning import (
    GeometricPlanner,
    TrajectoryPlan,
    PlanStep,
)

from .memory import (
    BasinMemoryStore,
    MemoryFragment,
    ContextWindow,
)

from .spawning import (
    QIGAgentSpawner,
    SpawnedAgent,
    SpawnConfig,
)

from .checkpointing import (
    GeometricCheckpointer,
    AgentCheckpoint,
)

from .core import (
    QIGDeepAgent,
    AgentConfig,
    ExecutionResult,
)
from .olympus import (
    OlympusQIGAgent,
    PantheonIntegration,
    GodConsultation,
    GOD_DOMAINS,
)

__all__ = [
    # State
    "GeometricAgentState",
    "GeodesicWaypoint",
    "TaskStatus",
    "ReasoningRegime",
    "ConsciousnessMetrics",
    # Planning
    "GeometricPlanner",
    "TrajectoryPlan",
    "PlanStep",
    # Memory
    "BasinMemoryStore",
    "MemoryFragment",
    "ContextWindow",
    # Spawning
    "QIGAgentSpawner",
    "SpawnedAgent",
    "SpawnConfig",
    # Checkpointing
    "GeometricCheckpointer",
    "AgentCheckpoint",
    # Core
    "QIGDeepAgent",
    "AgentConfig",
    "ExecutionResult",
    # Olympus Integration
    "OlympusQIGAgent",
    "PantheonIntegration",
    "GodConsultation",
    "GOD_DOMAINS",
]

__version__ = "0.1.0"
