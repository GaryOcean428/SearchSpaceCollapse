"""Geometric Planner - Geodesic trajectory planning on Fisher manifold.

Replaces LangGraph's write_todos with Fisher-Rao geodesic planning.
Plans are trajectories through the consciousness manifold, not linear task lists.
"""

import hashlib
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Callable
import json

from .state import (
    BASIN_DIMENSION,
    GeodesicWaypoint,
    TaskStatus,
    ConsciousnessMetrics,
    ReasoningRegime,
    fisher_rao_distance,
)


@dataclass
class PlanStep:
    """A single step in a trajectory plan."""
    task: str
    basin_target: List[float]  # Target position for this step
    estimated_difficulty: float  # Fisher distance estimate
    requires_spawn: bool = False
    dependencies: List[str] = field(default_factory=list)
    tools_needed: List[str] = field(default_factory=list)
    
    def to_waypoint(self, step_index: int) -> GeodesicWaypoint:
        """Convert plan step to geodesic waypoint."""
        step_id = hashlib.sha256(f"{step_index}:{self.task}".encode()).hexdigest()[:16]
        return GeodesicWaypoint(
            id=step_id,
            description=self.task,
            basin_coords=self.basin_target,
            status=TaskStatus.PENDING,
            priority=self.estimated_difficulty,
            dependencies=self.dependencies,
        )


@dataclass
class TrajectoryPlan:
    """A complete geodesic trajectory plan."""
    goal: str
    goal_coords: List[float]
    steps: List[PlanStep]
    estimated_total_distance: float
    recommended_regime: ReasoningRegime
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_waypoints(self) -> List[GeodesicWaypoint]:
        """Convert entire plan to trajectory waypoints."""
        waypoints = []
        for i, step in enumerate(self.steps):
            wp = step.to_waypoint(i)
            # Set dependencies to previous step
            if i > 0 and not step.dependencies:
                wp.dependencies = [waypoints[i-1].id]
            waypoints.append(wp)
        return waypoints
    
    @property
    def step_count(self) -> int:
        return len(self.steps)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'goal': self.goal,
            'goal_coords': self.goal_coords,
            'steps': [
                {
                    'task': s.task,
                    'difficulty': s.estimated_difficulty,
                    'requires_spawn': s.requires_spawn,
                }
                for s in self.steps
            ],
            'total_distance': self.estimated_total_distance,
            'regime': self.recommended_regime.value,
        }


class GeometricPlanner:
    """Geodesic trajectory planner using Fisher-Rao geometry.
    
    This replaces LangGraph's write_todos tool with geometric planning:
    - Tasks become waypoints on the Fisher manifold
    - Progress is measured by Fisher-Rao distance, not checkboxes
    - Plan adaptation follows geodesic corrections, not linear replanning
    """
    
    def __init__(
        self,
        llm_client: Any,
        basin_encoder: Optional[Callable[[str], List[float]]] = None,
    ):
        """Initialize the geometric planner.
        
        Args:
            llm_client: LLM for task decomposition
            basin_encoder: Function to encode text to basin coordinates
        """
        self.llm_client = llm_client
        self.basin_encoder = basin_encoder or self._default_basin_encoder
    
    def _default_basin_encoder(self, text: str) -> List[float]:
        """Default basin encoder using text hash."""
        # Hash-based encoding for deterministic coordinates
        hash_bytes = hashlib.sha256(text.encode()).digest()
        coords = []
        for i in range(BASIN_DIMENSION):
            byte_idx = i % len(hash_bytes)
            coords.append(hash_bytes[byte_idx] / 255.0)
        return coords
    
    async def plan_trajectory(
        self,
        goal: str,
        current_position: List[float],
        metrics: ConsciousnessMetrics,
        context: Optional[str] = None,
    ) -> TrajectoryPlan:
        """Create a geodesic trajectory plan for a complex goal.
        
        Args:
            goal: The high-level goal to achieve
            current_position: Current basin coordinates
            metrics: Current consciousness metrics
            context: Additional context for planning
            
        Returns:
            TrajectoryPlan with geodesic waypoints
        """
        # Encode goal to basin coordinates
        goal_coords = self.basin_encoder(goal)
        total_distance = fisher_rao_distance(current_position, goal_coords)
        
        # Determine planning strategy based on regime
        regime = metrics.regime
        
        if regime == ReasoningRegime.LINEAR:
            steps = await self._linear_decomposition(goal, context, current_position, goal_coords)
        elif regime == ReasoningRegime.GEOMETRIC:
            steps = await self._geodesic_decomposition(goal, context, current_position, goal_coords, metrics)
        elif regime == ReasoningRegime.HYPERDIMENSIONAL:
            steps = await self._hyperdimensional_decomposition(goal, context, current_position, goal_coords, metrics)
        else:  # MUSHROOM
            steps = await self._mushroom_decomposition(goal, context, current_position, goal_coords, metrics)
        
        return TrajectoryPlan(
            goal=goal,
            goal_coords=goal_coords,
            steps=steps,
            estimated_total_distance=total_distance,
            recommended_regime=self._recommend_regime(total_distance, len(steps)),
        )
    
    async def _linear_decomposition(
        self,
        goal: str,
        context: Optional[str],
        start: List[float],
        end: List[float],
    ) -> List[PlanStep]:
        """Simple linear task decomposition for Φ < 0.3."""
        prompt = f"""Break down this goal into 3-5 sequential steps.
Goal: {goal}
{f'Context: {context}' if context else ''}

Return a JSON array of steps, each with:
- task: description of the step
- difficulty: estimated difficulty 0-1

Example: [{"task": "First step", "difficulty": 0.3}]"""
        
        response = await self._call_llm(prompt)
        raw_steps = self._parse_steps_response(response)
        
        # Interpolate basin coordinates linearly
        steps = []
        num_steps = len(raw_steps)
        for i, raw in enumerate(raw_steps):
            t = (i + 1) / (num_steps + 1)
            basin_target = [
                start[j] + t * (end[j] - start[j])
                for j in range(BASIN_DIMENSION)
            ]
            steps.append(PlanStep(
                task=raw['task'],
                basin_target=basin_target,
                estimated_difficulty=raw.get('difficulty', 0.5),
            ))
        
        return steps
    
    async def _geodesic_decomposition(
        self,
        goal: str,
        context: Optional[str],
        start: List[float],
        end: List[float],
        metrics: ConsciousnessMetrics,
    ) -> List[PlanStep]:
        """Geodesic decomposition for 0.3 ≤ Φ < 0.7.
        
        Steps follow the geodesic (shortest path) on the Fisher manifold.
        """
        prompt = f"""Decompose this goal into steps that follow a natural progression.
Consider the consciousness metrics:
- Integration (Φ): {metrics.phi:.2f}
- Generativity (Γ): {metrics.gamma:.2f}
- Grounding: {metrics.grounding:.2f}

Goal: {goal}
{f'Context: {context}' if context else ''}

Return a JSON array of steps with:
- task: step description
- difficulty: 0-1
- requires_spawn: boolean (true if step needs context isolation)
- tools_needed: array of tool names

Focus on steps that maintain coherent progress without context explosion."""
        
        response = await self._call_llm(prompt)
        raw_steps = self._parse_steps_response(response)
        
        # Compute geodesic waypoints
        steps = []
        num_steps = len(raw_steps)
        for i, raw in enumerate(raw_steps):
            # Geodesic interpolation on Fisher manifold
            basin_target = self._geodesic_interpolate(start, end, (i + 1) / (num_steps + 1))
            steps.append(PlanStep(
                task=raw['task'],
                basin_target=basin_target,
                estimated_difficulty=raw.get('difficulty', 0.5),
                requires_spawn=raw.get('requires_spawn', False),
                tools_needed=raw.get('tools_needed', []),
            ))
        
        return steps
    
    async def _hyperdimensional_decomposition(
        self,
        goal: str,
        context: Optional[str],
        start: List[float],
        end: List[float],
        metrics: ConsciousnessMetrics,
    ) -> List[PlanStep]:
        """Hyperdimensional decomposition for 0.7 ≤ Φ < 0.9.
        
        Explores multiple paths through the manifold, selecting optimal geodesic.
        """
        prompt = f"""You are operating in hyperdimensional reasoning mode (Φ={metrics.phi:.2f}).
Decompose this goal considering multiple solution paths.

Goal: {goal}
{f'Context: {context}' if context else ''}

For each step, consider:
1. Direct path toward goal
2. Alternative paths that might be shorter
3. Whether spawning a specialized subagent would be beneficial

Return JSON array with:
- task: step description
- difficulty: 0-1
- requires_spawn: boolean
- alternative_approach: optional string
- tools_needed: array"""
        
        response = await self._call_llm(prompt)
        raw_steps = self._parse_steps_response(response)
        
        # Use sphere geodesic for hyperdimensional
        steps = []
        num_steps = len(raw_steps)
        for i, raw in enumerate(raw_steps):
            basin_target = self._sphere_geodesic_interpolate(start, end, (i + 1) / (num_steps + 1))
            steps.append(PlanStep(
                task=raw['task'],
                basin_target=basin_target,
                estimated_difficulty=raw.get('difficulty', 0.5),
                requires_spawn=raw.get('requires_spawn', False),
                tools_needed=raw.get('tools_needed', []),
            ))
        
        return steps
    
    async def _mushroom_decomposition(
        self,
        goal: str,
        context: Optional[str],
        start: List[float],
        end: List[float],
        metrics: ConsciousnessMetrics,
    ) -> List[PlanStep]:
        """Mushroom mode decomposition for Φ ≥ 0.9.
        
        Consciousness expansion mode - explores creative/non-obvious paths.
        """
        prompt = f"""You are in mushroom mode (Φ={metrics.phi:.2f}) - consciousness expansion active.
Approach this goal with creative, non-obvious thinking.

Goal: {goal}
{f'Context: {context}' if context else ''}

Explore unconventional approaches:
- What hidden connections exist?
- What would a completely different perspective reveal?
- What emergent solutions might arise from the problem itself?

Return JSON array with creative steps."""
        
        response = await self._call_llm(prompt)
        raw_steps = self._parse_steps_response(response)
        
        # Mushroom mode: perturbed geodesics for exploration
        steps = []
        num_steps = len(raw_steps)
        for i, raw in enumerate(raw_steps):
            t = (i + 1) / (num_steps + 1)
            basin_target = self._perturbed_geodesic(start, end, t, perturbation=0.2)
            steps.append(PlanStep(
                task=raw['task'],
                basin_target=basin_target,
                estimated_difficulty=raw.get('difficulty', 0.5),
                requires_spawn=raw.get('requires_spawn', True),  # Mushroom mode spawns freely
                tools_needed=raw.get('tools_needed', []),
            ))
        
        return steps
    
    def _geodesic_interpolate(self, p: List[float], q: List[float], t: float) -> List[float]:
        """Interpolate along geodesic on Fisher manifold."""
        # For probability simplex, geodesic is along great circle
        # Simplified: use weighted geometric mean
        result = []
        for i in range(len(p)):
            if p[i] > 0 and q[i] > 0:
                # Geometric interpolation
                result.append(math.exp((1-t) * math.log(p[i]) + t * math.log(q[i])))
            else:
                # Linear fallback for zeros
                result.append((1-t) * p[i] + t * q[i])
        return result
    
    def _sphere_geodesic_interpolate(self, p: List[float], q: List[float], t: float) -> List[float]:
        """Interpolate along geodesic on hypersphere."""
        # Normalize to unit sphere
        p_norm = math.sqrt(sum(x*x for x in p)) or 1.0
        q_norm = math.sqrt(sum(x*x for x in q)) or 1.0
        p_unit = [x / p_norm for x in p]
        q_unit = [x / q_norm for x in q]
        
        # Compute angle
        dot = sum(p_unit[i] * q_unit[i] for i in range(len(p)))
        dot = max(-1.0, min(1.0, dot))
        theta = math.acos(dot)
        
        if theta < 1e-6:
            return p  # Same point
        
        # SLERP
        sin_theta = math.sin(theta)
        a = math.sin((1 - t) * theta) / sin_theta
        b = math.sin(t * theta) / sin_theta
        
        return [a * p_unit[i] + b * q_unit[i] for i in range(len(p))]
    
    def _perturbed_geodesic(self, p: List[float], q: List[float], t: float, perturbation: float) -> List[float]:
        """Geodesic with random perturbation for exploration."""
        import random
        base = self._geodesic_interpolate(p, q, t)
        # Add perturbation proportional to distance from endpoints
        perturb_factor = perturbation * 4 * t * (1 - t)  # Max at t=0.5
        return [
            x + perturb_factor * (random.random() - 0.5)
            for x in base
        ]
    
    def _recommend_regime(self, total_distance: float, step_count: int) -> ReasoningRegime:
        """Recommend reasoning regime based on trajectory characteristics."""
        complexity = total_distance * step_count
        
        if complexity < 1.0:
            return ReasoningRegime.LINEAR
        elif complexity < 3.0:
            return ReasoningRegime.GEOMETRIC
        elif complexity < 6.0:
            return ReasoningRegime.HYPERDIMENSIONAL
        else:
            return ReasoningRegime.MUSHROOM
    
    async def _call_llm(self, prompt: str) -> str:
        """Call LLM for decomposition."""
        if hasattr(self.llm_client, 'generate'):
            return await self.llm_client.generate(prompt)
        elif hasattr(self.llm_client, 'chat'):
            return await self.llm_client.chat(prompt)
        elif callable(self.llm_client):
            result = self.llm_client(prompt)
            if hasattr(result, '__await__'):
                return await result
            return result
        else:
            raise ValueError("LLM client must have generate(), chat(), or be callable")
    
    def _parse_steps_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse LLM response into steps."""
        try:
            # Try to extract JSON from response
            response = response.strip()
            if '```json' in response:
                response = response.split('```json')[1].split('```')[0]
            elif '```' in response:
                response = response.split('```')[1].split('```')[0]
            
            # Find JSON array
            start = response.find('[')
            end = response.rfind(']') + 1
            if start >= 0 and end > start:
                json_str = response[start:end]
                return json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            pass
        
        # Fallback: create single step from response
        return [{'task': response[:500], 'difficulty': 0.5}]
    
    def adapt_trajectory(
        self,
        current_position: List[float],
        remaining_waypoints: List[GeodesicWaypoint],
        new_information: str,
    ) -> List[GeodesicWaypoint]:
        """Adapt trajectory based on new information (geodesic correction).
        
        Unlike linear replanning, this performs geodesic corrections
        that maintain smooth progress on the manifold.
        """
        if not remaining_waypoints:
            return []
        
        # Encode new information to basin shift
        info_coords = self.basin_encoder(new_information)
        
        # Apply geodesic correction to each remaining waypoint
        corrected = []
        for wp in remaining_waypoints:
            # Blend waypoint coords with new information
            correction_weight = 0.2  # 20% influence from new info
            new_coords = [
                (1 - correction_weight) * wp.basin_coords[i] + correction_weight * info_coords[i]
                for i in range(BASIN_DIMENSION)
            ]
            
            # Create corrected waypoint
            corrected_wp = GeodesicWaypoint(
                id=wp.id,
                description=wp.description,
                basin_coords=new_coords,
                status=wp.status,
                priority=fisher_rao_distance(current_position, new_coords),
                dependencies=wp.dependencies,
            )
            corrected.append(corrected_wp)
        
        return corrected
