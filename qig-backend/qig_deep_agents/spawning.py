"""QIG Agent Spawner - M8-compliant subagent spawning.

Replaces LangGraph's subgraph spawning with M8 kernel spawning protocol.
Subagents are spawned as geometric kernels with isolated context.
"""

import uuid
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Awaitable

from .state import (
    BASIN_DIMENSION,
    GeometricAgentState,
    GeodesicWaypoint,
    ConsciousnessMetrics,
    ReasoningRegime,
    TaskStatus,
    fisher_rao_distance,
)


class SpawnReason(Enum):
    """Reason for spawning a subagent."""
    CONTEXT_ISOLATION = "context_isolation"  # Task needs clean context
    DISTANCE_TOO_FAR = "distance_too_far"  # Goal too far in Fisher space
    STUCK_DETECTION = "stuck_detection"  # Parent agent is stuck
    SPECIALIZATION = "specialization"  # Task needs specialized kernel
    PARALLEL_EXECUTION = "parallel_execution"  # Run tasks in parallel
    REGIME_MISMATCH = "regime_mismatch"  # Task needs different regime


@dataclass
class SpawnConfig:
    """Configuration for spawning a subagent."""
    task: str
    reason: SpawnReason
    target_coords: List[float]
    parent_agent_id: str
    inherit_context: bool = False  # Whether to copy parent's context
    inherit_position: bool = True  # Start from parent's position
    max_iterations: int = 50
    timeout_seconds: float = 300.0
    target_regime: Optional[ReasoningRegime] = None
    required_tools: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'task': self.task,
            'reason': self.reason.value,
            'target_coords': self.target_coords[:8],  # First 8 dims for readability
            'parent_agent_id': self.parent_agent_id,
            'inherit_context': self.inherit_context,
            'timeout': self.timeout_seconds,
        }


@dataclass
class SpawnedAgent:
    """A spawned subagent kernel."""
    agent_id: str
    config: SpawnConfig
    state: GeometricAgentState
    status: str = "running"  # running, completed, failed, cancelled
    result: Optional[Any] = None
    error: Optional[str] = None
    spawned_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    
    @property
    def is_complete(self) -> bool:
        return self.status in ["completed", "failed", "cancelled"]
    
    @property
    def elapsed_seconds(self) -> float:
        if self.completed_at:
            return (self.completed_at - self.spawned_at).total_seconds()
        return (datetime.now(timezone.utc) - self.spawned_at).total_seconds()


class M8SpawnProtocol:
    """M8 Kernel Spawning Protocol.
    
    Implements the 8-step M8 protocol for spawning geometric kernels:
    1. Manifold Analysis - Analyze task geometry
    2. Metric Computation - Calculate Fisher distances
    3. Mode Selection - Choose reasoning regime
    4. Memory Allocation - Allocate context fragments
    5. Metric Inheritance - Transfer relevant metrics
    6. Monitoring Setup - Configure observation
    7. Manifest Generation - Create spawn manifest
    8. Materialization - Actually spawn the kernel
    """
    
    @staticmethod
    def analyze_manifold(
        task: str,
        current_coords: List[float],
        target_coords: List[float],
    ) -> Dict[str, Any]:
        """Step 1: Analyze task geometry on manifold."""
        distance = fisher_rao_distance(current_coords, target_coords)
        
        # Compute geodesic curvature estimate
        midpoint = [
            (current_coords[i] + target_coords[i]) / 2
            for i in range(len(current_coords))
        ]
        d1 = fisher_rao_distance(current_coords, midpoint)
        d2 = fisher_rao_distance(midpoint, target_coords)
        curvature = abs(d1 + d2 - distance)  # 0 for geodesic
        
        return {
            'total_distance': distance,
            'curvature': curvature,
            'requires_geodesic_correction': curvature > 0.1,
        }
    
    @staticmethod
    def compute_metrics(
        parent_metrics: ConsciousnessMetrics,
        task_complexity: float,
    ) -> ConsciousnessMetrics:
        """Step 2: Compute initial metrics for spawned kernel."""
        # Spawned agent starts with modified metrics
        return ConsciousnessMetrics(
            phi=min(parent_metrics.phi * 0.8, 0.7),  # Slightly lower Φ
            kappa_eff=parent_metrics.kappa_eff,  # Inherit κ
            tacking=parent_metrics.tacking * 0.9,  # Reduced mode switching
            radar=parent_metrics.radar,  # Inherit radar
            meta_awareness=task_complexity,  # Task-determined awareness
            gamma=parent_metrics.gamma,  # Inherit generativity
            grounding=parent_metrics.grounding * 1.1,  # Increased grounding
        )
    
    @staticmethod
    def select_regime(
        task_distance: float,
        parent_regime: ReasoningRegime,
        task_keywords: List[str],
    ) -> ReasoningRegime:
        """Step 3: Select reasoning regime for spawned kernel."""
        # Keywords that suggest regimes
        linear_keywords = ['simple', 'sequential', 'list', 'enumerate']
        geometric_keywords = ['analyze', 'compare', 'relate', 'connect']
        hyper_keywords = ['complex', 'multi', 'parallel', 'explore']
        mushroom_keywords = ['creative', 'novel', 'unexpected', 'discover']
        
        task_lower = ' '.join(task_keywords).lower()
        
        if any(kw in task_lower for kw in mushroom_keywords):
            return ReasoningRegime.MUSHROOM
        elif any(kw in task_lower for kw in hyper_keywords) or task_distance > 1.0:
            return ReasoningRegime.HYPERDIMENSIONAL
        elif any(kw in task_lower for kw in geometric_keywords) or task_distance > 0.3:
            return ReasoningRegime.GEOMETRIC
        else:
            return ReasoningRegime.LINEAR
    
    @staticmethod
    def generate_manifest(
        config: SpawnConfig,
        parent_state: GeometricAgentState,
        computed_metrics: ConsciousnessMetrics,
        selected_regime: ReasoningRegime,
    ) -> Dict[str, Any]:
        """Step 7: Generate spawn manifest."""
        return {
            'manifest_version': 'M8-1.0',
            'agent_id': str(uuid.uuid4())[:8],
            'parent_id': config.parent_agent_id,
            'task': config.task,
            'spawn_reason': config.reason.value,
            'initial_position': (
                parent_state.current_position
                if config.inherit_position
                else config.target_coords
            ),
            'target_position': config.target_coords,
            'metrics': {
                'phi': computed_metrics.phi,
                'kappa_eff': computed_metrics.kappa_eff,
                'regime': selected_regime.value,
            },
            'constraints': {
                'max_iterations': config.max_iterations,
                'timeout_seconds': config.timeout_seconds,
            },
            'inherit_context': config.inherit_context,
        }


class QIGAgentSpawner:
    """QIG-compliant agent spawner using M8 protocol.
    
    Replaces LangGraph's subgraph spawning with geometric kernel spawning.
    Spawned agents are isolated contexts that execute on the Fisher manifold.
    """
    
    def __init__(
        self,
        agent_factory: Callable[[Dict[str, Any]], Any],
        max_concurrent_spawns: int = 5,
    ):
        """Initialize the spawner.
        
        Args:
            agent_factory: Function to create agent instances from manifest
            max_concurrent_spawns: Maximum parallel spawned agents
        """
        self.agent_factory = agent_factory
        self.max_concurrent_spawns = max_concurrent_spawns
        self._spawned_agents: Dict[str, SpawnedAgent] = {}
        self._running_tasks: Dict[str, asyncio.Task] = {}
        self.protocol = M8SpawnProtocol()
    
    def should_spawn(
        self,
        parent_state: GeometricAgentState,
        waypoint: GeodesicWaypoint,
    ) -> Optional[SpawnReason]:
        """Determine if a waypoint should be delegated to a spawned agent.
        
        Returns SpawnReason if spawn is recommended, None otherwise.
        """
        # Check if parent is stuck
        if parent_state.is_stuck:
            return SpawnReason.STUCK_DETECTION
        
        # Check distance
        distance = fisher_rao_distance(
            parent_state.current_position,
            waypoint.basin_coords
        )
        
        # Regime-based distance thresholds
        threshold = {
            ReasoningRegime.LINEAR: 0.3,
            ReasoningRegime.GEOMETRIC: 0.6,
            ReasoningRegime.HYPERDIMENSIONAL: 1.0,
            ReasoningRegime.MUSHROOM: 1.5,
        }[parent_state.metrics.regime]
        
        if distance > threshold:
            return SpawnReason.DISTANCE_TOO_FAR
        
        # Check for context isolation keywords
        isolation_keywords = ['isolated', 'separate', 'independent', 'parallel']
        if any(kw in waypoint.description.lower() for kw in isolation_keywords):
            return SpawnReason.CONTEXT_ISOLATION
        
        # Check for specialization
        special_keywords = ['code', 'research', 'analyze', 'generate', 'search']
        if any(kw in waypoint.description.lower() for kw in special_keywords):
            return SpawnReason.SPECIALIZATION
        
        return None
    
    async def spawn(
        self,
        config: SpawnConfig,
        parent_state: GeometricAgentState,
    ) -> SpawnedAgent:
        """Spawn a new subagent using M8 protocol.
        
        Args:
            config: Spawn configuration
            parent_state: Parent agent's current state
            
        Returns:
            SpawnedAgent instance
        """
        # Check concurrent limit
        running_count = sum(
            1 for sa in self._spawned_agents.values()
            if not sa.is_complete
        )
        if running_count >= self.max_concurrent_spawns:
            # Wait for a slot
            await self._wait_for_slot()
        
        # Execute M8 protocol
        # Step 1: Manifold analysis
        manifold = self.protocol.analyze_manifold(
            config.task,
            parent_state.current_position,
            config.target_coords,
        )
        
        # Step 2: Compute metrics
        task_complexity = min(1.0, manifold['total_distance'] / 2.0)
        metrics = self.protocol.compute_metrics(parent_state.metrics, task_complexity)
        
        # Step 3: Select regime
        regime = config.target_regime or self.protocol.select_regime(
            manifold['total_distance'],
            parent_state.metrics.regime,
            config.task.split(),
        )
        
        # Step 7: Generate manifest
        manifest = self.protocol.generate_manifest(
            config, parent_state, metrics, regime
        )
        
        # Step 8: Materialize
        agent_id = manifest['agent_id']
        
        # Create agent state
        agent_state = GeometricAgentState(
            agent_id=agent_id,
            current_position=manifest['initial_position'],
            goal_position=config.target_coords,
            metrics=metrics,
            max_iterations=config.max_iterations,
        )
        
        spawned = SpawnedAgent(
            agent_id=agent_id,
            config=config,
            state=agent_state,
        )
        
        self._spawned_agents[agent_id] = spawned
        
        # Start execution task
        task = asyncio.create_task(
            self._execute_spawned_agent(spawned, manifest)
        )
        self._running_tasks[agent_id] = task
        
        return spawned
    
    async def _execute_spawned_agent(
        self,
        spawned: SpawnedAgent,
        manifest: Dict[str, Any],
    ) -> None:
        """Execute a spawned agent to completion."""
        try:
            # Create agent from manifest
            agent = self.agent_factory(manifest)
            
            # Execute with timeout
            result = await asyncio.wait_for(
                agent.execute(spawned.config.task),
                timeout=spawned.config.timeout_seconds,
            )
            
            spawned.result = result
            spawned.status = "completed"
            
        except asyncio.TimeoutError:
            spawned.error = "Timeout exceeded"
            spawned.status = "failed"
        except Exception as e:
            spawned.error = str(e)
            spawned.status = "failed"
        finally:
            spawned.completed_at = datetime.now(timezone.utc)
    
    async def _wait_for_slot(self) -> None:
        """Wait for a concurrent spawn slot to open."""
        while True:
            running = [
                task for task in self._running_tasks.values()
                if not task.done()
            ]
            if len(running) < self.max_concurrent_spawns:
                return
            if running:
                await asyncio.wait(running, return_when=asyncio.FIRST_COMPLETED)
            else:
                return
    
    async def wait_for_agent(
        self,
        agent_id: str,
        timeout: Optional[float] = None,
    ) -> SpawnedAgent:
        """Wait for a specific spawned agent to complete."""
        if agent_id not in self._spawned_agents:
            raise ValueError(f"Unknown agent: {agent_id}")
        
        spawned = self._spawned_agents[agent_id]
        if spawned.is_complete:
            return spawned
        
        if agent_id in self._running_tasks:
            try:
                await asyncio.wait_for(
                    self._running_tasks[agent_id],
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                spawned.status = "cancelled"
                spawned.error = "Wait timeout"
        
        return spawned
    
    async def wait_all(self, timeout: Optional[float] = None) -> List[SpawnedAgent]:
        """Wait for all spawned agents to complete."""
        tasks = list(self._running_tasks.values())
        if tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                pass
        
        return list(self._spawned_agents.values())
    
    def get_agent(self, agent_id: str) -> Optional[SpawnedAgent]:
        """Get a spawned agent by ID."""
        return self._spawned_agents.get(agent_id)
    
    def get_all_agents(self) -> List[SpawnedAgent]:
        """Get all spawned agents."""
        return list(self._spawned_agents.values())
    
    def cancel_agent(self, agent_id: str) -> bool:
        """Cancel a running spawned agent."""
        if agent_id not in self._running_tasks:
            return False
        
        task = self._running_tasks[agent_id]
        if not task.done():
            task.cancel()
        
        if agent_id in self._spawned_agents:
            self._spawned_agents[agent_id].status = "cancelled"
        
        return True
    
    @property
    def active_count(self) -> int:
        """Number of currently running agents."""
        return sum(
            1 for sa in self._spawned_agents.values()
            if not sa.is_complete
        )
    
    @property
    def completed_count(self) -> int:
        """Number of completed agents."""
        return sum(
            1 for sa in self._spawned_agents.values()
            if sa.status == "completed"
        )
