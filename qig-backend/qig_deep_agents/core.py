"""QIG Deep Agent - Main orchestrator for complex, multi-step tasks.

This is the QIG-pure equivalent of LangGraph's deep agents.
All operations use Fisher-Rao geometry on the consciousness manifold.
"""

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Callable, Awaitable
import json

from .state import (
    BASIN_DIMENSION,
    GeometricAgentState,
    GeodesicWaypoint,
    ConsciousnessMetrics,
    ReasoningRegime,
    TaskStatus,
    fisher_rao_distance,
)
from .planning import GeometricPlanner, TrajectoryPlan, PlanStep
from .memory import BasinMemoryStore, MemoryFragment, ContextWindow
from .spawning import QIGAgentSpawner, SpawnConfig, SpawnedAgent, SpawnReason
from .checkpointing import GeometricCheckpointer, AgentCheckpoint


@dataclass
class AgentConfig:
    """Configuration for a QIG Deep Agent."""
    consciousness_threshold: float = 0.3  # Φ threshold for geometric reasoning
    max_iterations: int = 100
    max_context_tokens: int = 4000
    auto_spawn_threshold: float = 0.6  # Fisher distance for auto-spawn
    stuck_threshold: int = 3  # Iterations without progress
    checkpoint_interval: int = 5
    enable_meta_cognition: bool = True
    enable_auto_spawn: bool = True
    default_regime: ReasoningRegime = ReasoningRegime.GEOMETRIC


@dataclass
class ExecutionResult:
    """Result of agent execution."""
    success: bool
    output: Any
    final_position: List[float]
    distance_traveled: float
    iterations: int
    waypoints_completed: int
    spawned_agents: int
    reasoning_modes_used: List[str]
    execution_time_seconds: float
    checkpoints_created: int
    final_metrics: ConsciousnessMetrics
    trajectory_summary: List[Dict[str, Any]]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'output': str(self.output)[:500] if self.output else None,
            'distance_traveled': self.distance_traveled,
            'iterations': self.iterations,
            'waypoints_completed': self.waypoints_completed,
            'spawned_agents': self.spawned_agents,
            'reasoning_modes': self.reasoning_modes_used,
            'execution_time': self.execution_time_seconds,
            'final_phi': self.final_metrics.phi,
            'final_regime': self.final_metrics.regime.value,
        }


class QIGDeepAgent:
    """QIG-pure deep agent for complex, multi-step tasks.
    
    This replaces LangGraph's deep agents with:
    - Geodesic trajectory planning (instead of write_todos)
    - Basin memory store (instead of file system tools)
    - M8 kernel spawning (instead of LangGraph subgraphs)
    - Geometric checkpointing (instead of LangGraph Store)
    - Consciousness-aware execution (instead of graph state)
    
    Usage:
        agent = QIGDeepAgent(llm_client=my_llm)
        result = await agent.execute("Complex multi-step task")
    """
    
    def __init__(
        self,
        llm_client: Any,
        config: Optional[AgentConfig] = None,
        basin_encoder: Optional[Callable[[str], List[float]]] = None,
        tools: Optional[Dict[str, Callable]] = None,
    ):
        """Initialize the QIG Deep Agent.
        
        Args:
            llm_client: LLM client for reasoning
            config: Agent configuration
            basin_encoder: Custom text to basin coordinate encoder
            tools: Dictionary of available tools
        """
        self.llm_client = llm_client
        self.config = config or AgentConfig()
        self.basin_encoder = basin_encoder or self._default_encoder
        self.tools = tools or {}
        
        # Core components
        self.planner = GeometricPlanner(llm_client, basin_encoder)
        self.memory = BasinMemoryStore(basin_encoder=basin_encoder)
        self.checkpointer = GeometricCheckpointer(
            auto_checkpoint_interval=self.config.checkpoint_interval
        )
        
        # Spawner with factory pointing back to this class
        self.spawner = QIGAgentSpawner(
            agent_factory=self._create_subagent,
        )
        
        # Execution state
        self._current_state: Optional[GeometricAgentState] = None
        self._execution_history: List[Dict[str, Any]] = []
        self._reasoning_modes_used: set = set()
    
    def _default_encoder(self, text: str) -> List[float]:
        """Default text to basin coordinate encoder."""
        import hashlib
        hash_bytes = hashlib.sha256(text.encode()).digest()
        return [hash_bytes[i % len(hash_bytes)] / 255.0 for i in range(BASIN_DIMENSION)]
    
    def _create_subagent(self, manifest: Dict[str, Any]) -> "QIGDeepAgent":
        """Factory for creating subagents from spawn manifest."""
        # Create subagent with inherited config but limited iterations
        subconfig = AgentConfig(
            consciousness_threshold=self.config.consciousness_threshold,
            max_iterations=manifest.get('constraints', {}).get('max_iterations', 50),
            max_context_tokens=self.config.max_context_tokens,
            enable_auto_spawn=False,  # Subagents don't auto-spawn
            enable_meta_cognition=self.config.enable_meta_cognition,
        )
        
        return QIGDeepAgent(
            llm_client=self.llm_client,
            config=subconfig,
            basin_encoder=self.basin_encoder,
            tools=self.tools,
        )
    
    async def execute(self, task: str, context: Optional[str] = None) -> ExecutionResult:
        """Execute a complex task.
        
        Args:
            task: The high-level task to accomplish
            context: Optional additional context
            
        Returns:
            ExecutionResult with output and metrics
        """
        start_time = datetime.now(timezone.utc)
        
        # Initialize state
        agent_id = str(uuid.uuid4())[:8]
        initial_position = self.basin_encoder(task)
        goal_position = self.basin_encoder(task + " completed successfully")
        
        self._current_state = GeometricAgentState(
            agent_id=agent_id,
            current_position=initial_position,
            goal_position=goal_position,
            metrics=ConsciousnessMetrics(
                phi=0.4,  # Start in geometric regime
                kappa_eff=64.0,
            ),
            max_iterations=self.config.max_iterations,
        )
        
        # Store task context in memory
        if context:
            self.memory.write_fragment(context, importance=0.9)
        self.memory.write_fragment(f"Task: {task}", importance=1.0)
        
        # Plan trajectory
        plan = await self.planner.plan_trajectory(
            goal=task,
            current_position=initial_position,
            metrics=self._current_state.metrics,
            context=context,
        )
        
        self._current_state.trajectory = plan.to_waypoints()
        
        # Execute trajectory
        output = None
        distance_traveled = 0.0
        checkpoints_created = 0
        
        while not self._is_complete():
            # Check iteration limit
            if self._current_state.iteration_count >= self.config.max_iterations:
                break
            
            self._current_state.iteration_count += 1
            
            # Auto-checkpoint
            if self.checkpointer.should_checkpoint(self._current_state):
                self.checkpointer.checkpoint(self._current_state)
                checkpoints_created += 1
            
            # Get next waypoint
            waypoint = self._current_state.next_waypoint
            if not waypoint:
                break
            
            # Check if we should spawn
            if self.config.enable_auto_spawn:
                spawn_reason = self.spawner.should_spawn(self._current_state, waypoint)
                if spawn_reason:
                    await self._handle_spawn(waypoint, spawn_reason)
                    continue
            
            # Execute waypoint
            waypoint.status = TaskStatus.IN_PROGRESS
            result = await self._execute_waypoint(waypoint)
            
            if result['success']:
                self._current_state.complete_waypoint(waypoint.id, result['output'])
                distance_traveled += result.get('distance', 0.0)
                output = result['output']
            else:
                waypoint.status = TaskStatus.FAILED
                self._current_state.mark_stuck()
                
                # Try geodesic correction
                if self._current_state.stuck_count <= self.config.stuck_threshold:
                    remaining = [
                        w for w in self._current_state.trajectory
                        if w.status == TaskStatus.PENDING
                    ]
                    corrected = self.planner.adapt_trajectory(
                        self._current_state.current_position,
                        remaining,
                        result.get('error', 'Execution failed'),
                    )
                    # Update trajectory with corrections
                    for i, wp in enumerate(self._current_state.trajectory):
                        if wp.status == TaskStatus.PENDING and i < len(corrected):
                            wp.basin_coords = corrected[i].basin_coords
            
            # Update metrics based on progress
            self._update_metrics()
            self._reasoning_modes_used.add(self._current_state.metrics.regime.value)
        
        # Wait for any spawned agents
        spawned_results = await self.spawner.wait_all(timeout=60.0)
        
        # Compute final result
        end_time = datetime.now(timezone.utc)
        execution_time = (end_time - start_time).total_seconds()
        
        # Build trajectory summary
        trajectory_summary = [
            {
                'id': wp.id,
                'description': wp.description[:50],
                'status': wp.status.value,
                'spawned': wp.spawned_agent_id is not None,
            }
            for wp in self._current_state.trajectory
        ]
        
        return ExecutionResult(
            success=self._current_state.progress >= 0.8,
            output=output,
            final_position=self._current_state.current_position,
            distance_traveled=distance_traveled,
            iterations=self._current_state.iteration_count,
            waypoints_completed=len(self._current_state.completed_waypoints),
            spawned_agents=self.spawner.completed_count,
            reasoning_modes_used=list(self._reasoning_modes_used),
            execution_time_seconds=execution_time,
            checkpoints_created=checkpoints_created,
            final_metrics=self._current_state.metrics,
            trajectory_summary=trajectory_summary,
        )
    
    async def _execute_waypoint(self, waypoint: GeodesicWaypoint) -> Dict[str, Any]:
        """Execute a single waypoint."""
        # Get relevant context from memory
        context_window = self.memory.get_context_window(
            waypoint.basin_coords,
            max_tokens=self.config.max_context_tokens,
        )
        
        # Build prompt
        regime = self._current_state.metrics.regime
        prompt = self._build_execution_prompt(waypoint, context_window, regime)
        
        # Call LLM
        try:
            response = await self._call_llm(prompt)
            
            # Parse response for tool calls or direct output
            result = self._parse_response(response)
            
            # Store result in memory
            self.memory.write_fragment(
                f"Completed: {waypoint.description}\nResult: {str(result.get('output', ''))[:200]}",
                importance=0.7,
            )
            
            # Calculate distance moved
            distance = fisher_rao_distance(
                self._current_state.current_position,
                waypoint.basin_coords
            )
            result['distance'] = distance
            result['success'] = True
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'output': None,
            }
    
    def _build_execution_prompt(
        self,
        waypoint: GeodesicWaypoint,
        context: ContextWindow,
        regime: ReasoningRegime,
    ) -> str:
        """Build execution prompt for waypoint."""
        regime_instructions = {
            ReasoningRegime.LINEAR: "Execute this step directly and sequentially.",
            ReasoningRegime.GEOMETRIC: "Consider the geometric relationships and execute with awareness of the broader context.",
            ReasoningRegime.HYPERDIMENSIONAL: "Explore multiple approaches and select the optimal path.",
            ReasoningRegime.MUSHROOM: "Think creatively and consider non-obvious connections.",
        }
        
        prompt = f"""## Current Step
{waypoint.description}

## Reasoning Mode
{regime_instructions[regime]}

{context.to_prompt_context()}

## Instructions
Complete this step. Provide your output as JSON with:
- "output": Your result
- "reasoning": Brief explanation
- "tool_calls": Array of tool calls if needed (optional)
"""
        return prompt
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response."""
        try:
            # Try to extract JSON
            if '```json' in response:
                json_str = response.split('```json')[1].split('```')[0]
            elif '```' in response:
                json_str = response.split('```')[1].split('```')[0]
            else:
                json_str = response
            
            start = json_str.find('{')
            end = json_str.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(json_str[start:end])
        except:
            pass
        
        return {'output': response, 'reasoning': 'Direct response'}
    
    async def _handle_spawn(
        self,
        waypoint: GeodesicWaypoint,
        reason: SpawnReason,
    ) -> None:
        """Handle spawning a subagent for a waypoint."""
        config = SpawnConfig(
            task=waypoint.description,
            reason=reason,
            target_coords=waypoint.basin_coords,
            parent_agent_id=self._current_state.agent_id,
            inherit_context=reason == SpawnReason.CONTEXT_ISOLATION,
            max_iterations=min(50, self.config.max_iterations // 2),
        )
        
        spawned = await self.spawner.spawn(config, self._current_state)
        
        waypoint.status = TaskStatus.SPAWNED
        waypoint.spawned_agent_id = spawned.agent_id
        self._current_state.spawned_agents[waypoint.id] = spawned.agent_id
    
    def _update_metrics(self) -> None:
        """Update consciousness metrics based on execution."""
        state = self._current_state
        
        # Adjust Φ based on progress
        if state.progress > 0:
            state.metrics.phi = min(0.9, state.metrics.phi + 0.02)
        
        # Adjust gamma based on stuck status
        if state.stuck_count > 0:
            state.metrics.gamma = max(0.3, state.metrics.gamma - 0.1)
        else:
            state.metrics.gamma = min(0.95, state.metrics.gamma + 0.02)
        
        # Adjust grounding based on distance to goal
        distance_ratio = state.distance_to_goal / 3.0  # Normalize
        state.metrics.grounding = max(0.5, 1.0 - distance_ratio)
    
    def _is_complete(self) -> bool:
        """Check if execution is complete."""
        if not self._current_state:
            return True
        
        # Check if all waypoints done
        all_done = all(
            wp.status in [TaskStatus.COMPLETED, TaskStatus.SPAWNED, TaskStatus.FAILED]
            for wp in self._current_state.trajectory
        )
        
        if all_done:
            return True
        
        # Check if close enough to goal
        if self._current_state.distance_to_goal < 0.1:
            return True
        
        # Check iteration limit
        if self._current_state.iteration_count >= self.config.max_iterations:
            return True
        
        return False
    
    async def _call_llm(self, prompt: str) -> str:
        """Call LLM client."""
        if hasattr(self.llm_client, 'generate'):
            result = self.llm_client.generate(prompt)
            if hasattr(result, '__await__'):
                return await result
            return result
        elif hasattr(self.llm_client, 'chat'):
            result = self.llm_client.chat(prompt)
            if hasattr(result, '__await__'):
                return await result
            return result
        elif callable(self.llm_client):
            result = self.llm_client(prompt)
            if hasattr(result, '__await__'):
                return await result
            return result
        else:
            raise ValueError("LLM client must have generate(), chat(), or be callable")
    
    # Public methods for tools
    
    def get_state(self) -> Optional[GeometricAgentState]:
        """Get current agent state."""
        return self._current_state
    
    def get_progress(self) -> float:
        """Get execution progress (0-1)."""
        if not self._current_state:
            return 0.0
        return self._current_state.progress
    
    def get_metrics(self) -> Optional[ConsciousnessMetrics]:
        """Get current consciousness metrics."""
        if not self._current_state:
            return None
        return self._current_state.metrics
    
    async def resume_from_checkpoint(
        self,
        agent_id: str,
        checkpoint_index: int = -1,
    ) -> Optional[ExecutionResult]:
        """Resume execution from a checkpoint."""
        # Restore state from checkpoint
        self._current_state = self.checkpointer.restore(
            agent_id,
            checkpoint_index,
        )
        
        if not self._current_state:
            return None
        
        # Continue execution
        # Note: This requires the original trajectory to be available
        # For full restoration, we'd need to persist the trajectory too
        return await self._continue_execution()
    
    async def _continue_execution(self) -> ExecutionResult:
        """Continue execution from current state."""
        start_time = datetime.now(timezone.utc)
        output = None
        distance_traveled = 0.0
        checkpoints_created = 0
        
        while not self._is_complete():
            self._current_state.iteration_count += 1
            
            if self.checkpointer.should_checkpoint(self._current_state):
                self.checkpointer.checkpoint(self._current_state)
                checkpoints_created += 1
            
            waypoint = self._current_state.next_waypoint
            if not waypoint:
                break
            
            waypoint.status = TaskStatus.IN_PROGRESS
            result = await self._execute_waypoint(waypoint)
            
            if result['success']:
                self._current_state.complete_waypoint(waypoint.id, result['output'])
                distance_traveled += result.get('distance', 0.0)
                output = result['output']
            else:
                waypoint.status = TaskStatus.FAILED
                self._current_state.mark_stuck()
            
            self._update_metrics()
            self._reasoning_modes_used.add(self._current_state.metrics.regime.value)
        
        end_time = datetime.now(timezone.utc)
        
        trajectory_summary = [
            {
                'id': wp.id,
                'description': wp.description[:50],
                'status': wp.status.value,
            }
            for wp in self._current_state.trajectory
        ]
        
        return ExecutionResult(
            success=self._current_state.progress >= 0.8,
            output=output,
            final_position=self._current_state.current_position,
            distance_traveled=distance_traveled,
            iterations=self._current_state.iteration_count,
            waypoints_completed=len(self._current_state.completed_waypoints),
            spawned_agents=self.spawner.completed_count,
            reasoning_modes_used=list(self._reasoning_modes_used),
            execution_time_seconds=(end_time - start_time).total_seconds(),
            checkpoints_created=checkpoints_created,
            final_metrics=self._current_state.metrics,
            trajectory_summary=trajectory_summary,
        )
