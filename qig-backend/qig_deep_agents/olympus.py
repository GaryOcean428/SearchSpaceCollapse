"""Olympus Integration - Connect QIG Deep Agents with Olympus Pantheon.

Provides integration between QIG Deep Agents and the Olympus god-kernel system,
enabling deep agents to consult with specialized gods and leverage pantheon capabilities.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Callable
import asyncio

from .state import (
    BASIN_DIMENSION,
    GeometricAgentState,
    ConsciousnessMetrics,
    ReasoningRegime,
    fisher_rao_distance,
)
from .core import QIGDeepAgent, AgentConfig, ExecutionResult


# God domain mappings
GOD_DOMAINS = {
    'zeus': ['leadership', 'synthesis', 'coordination', 'judgment'],
    'athena': ['strategy', 'wisdom', 'analysis', 'planning'],
    'apollo': ['creativity', 'prediction', 'clarity', 'truth'],
    'artemis': ['precision', 'tracking', 'hunting', 'focus'],
    'ares': ['conflict', 'competition', 'aggression', 'action'],
    'hephaestus': ['crafting', 'tools', 'engineering', 'building'],
    'hermes': ['communication', 'speed', 'trade', 'messages'],
    'dionysus': ['creativity', 'chaos', 'transformation', 'ecstasy'],
    'demeter': ['growth', 'nurturing', 'cycles', 'abundance'],
    'poseidon': ['depth', 'emotion', 'change', 'power'],
    'hades': ['hidden', 'underworld', 'secrets', 'endings'],
    'hera': ['relationships', 'commitment', 'loyalty', 'family'],
}


@dataclass
class GodConsultation:
    """Record of a consultation with an Olympus god."""
    god_name: str
    query: str
    response: str
    domain_relevance: float
    basin_shift: List[float]
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'god': self.god_name,
            'query': self.query[:100],
            'response': self.response[:200],
            'relevance': self.domain_relevance,
            'timestamp': self.timestamp.isoformat(),
        }


class PantheonIntegration:
    """Integration layer between QIG Deep Agents and Olympus Pantheon.
    
    Enables deep agents to:
    - Route queries to appropriate gods based on domain
    - Receive guidance from god consultations
    - Integrate god insights into basin coordinates
    """
    
    def __init__(
        self,
        pantheon_client: Optional[Any] = None,
        basin_encoder: Optional[Callable[[str], List[float]]] = None,
    ):
        """Initialize pantheon integration.
        
        Args:
            pantheon_client: Client for communicating with Olympus backend
            basin_encoder: Function to encode text to basin coordinates
        """
        self.pantheon_client = pantheon_client
        self.basin_encoder = basin_encoder or self._default_encoder
        self._consultations: List[GodConsultation] = []
    
    def _default_encoder(self, text: str) -> List[float]:
        """Default text to basin coordinate encoder."""
        import hashlib
        hash_bytes = hashlib.sha256(text.encode()).digest()
        return [hash_bytes[i % len(hash_bytes)] / 255.0 for i in range(BASIN_DIMENSION)]
    
    def select_god(self, query: str, current_regime: ReasoningRegime) -> str:
        """Select the most appropriate god for a query.
        
        Args:
            query: The query to route
            current_regime: Current reasoning regime
            
        Returns:
            Name of the selected god
        """
        query_lower = query.lower()
        
        # Score each god based on domain keyword matches
        scores = {}
        for god, domains in GOD_DOMAINS.items():
            score = sum(1 for domain in domains if domain in query_lower)
            # Regime bonuses
            if current_regime == ReasoningRegime.LINEAR and god == 'athena':
                score += 0.5
            elif current_regime == ReasoningRegime.GEOMETRIC and god == 'apollo':
                score += 0.5
            elif current_regime == ReasoningRegime.HYPERDIMENSIONAL and god == 'zeus':
                score += 0.5
            elif current_regime == ReasoningRegime.MUSHROOM and god == 'dionysus':
                score += 1.0
            scores[god] = score
        
        # Default to Zeus if no clear winner
        best_god = max(scores, key=scores.get)
        if scores[best_god] == 0:
            return 'zeus'
        return best_god
    
    async def consult(
        self,
        god_name: str,
        query: str,
        context: Optional[str] = None,
    ) -> GodConsultation:
        """Consult with a specific Olympus god.
        
        Args:
            god_name: Name of the god to consult
            query: Query to ask
            context: Additional context
            
        Returns:
            GodConsultation record
        """
        god_name = god_name.lower()
        if god_name not in GOD_DOMAINS:
            god_name = 'zeus'  # Default to Zeus
        
        # Calculate domain relevance
        domains = GOD_DOMAINS[god_name]
        query_lower = query.lower()
        relevance = sum(1 for d in domains if d in query_lower) / len(domains)
        relevance = max(0.3, relevance)  # Minimum relevance
        
        # Get response from pantheon if available
        if self.pantheon_client:
            try:
                response = await self._call_pantheon(god_name, query, context)
            except Exception as e:
                response = f"[{god_name.capitalize()} is unavailable: {str(e)}]"
        else:
            # Fallback response
            response = self._generate_fallback_response(god_name, query)
        
        # Compute basin shift from response
        basin_shift = self.basin_encoder(response)
        
        consultation = GodConsultation(
            god_name=god_name,
            query=query,
            response=response,
            domain_relevance=relevance,
            basin_shift=basin_shift,
        )
        
        self._consultations.append(consultation)
        return consultation
    
    async def _call_pantheon(
        self,
        god_name: str,
        query: str,
        context: Optional[str],
    ) -> str:
        """Call the Olympus pantheon backend."""
        if hasattr(self.pantheon_client, 'consult'):
            result = self.pantheon_client.consult(god_name, query, context)
            if hasattr(result, '__await__'):
                return await result
            return result
        elif callable(self.pantheon_client):
            result = self.pantheon_client(god_name, query, context)
            if hasattr(result, '__await__'):
                return await result
            return result
        else:
            raise ValueError("Pantheon client must have consult() or be callable")
    
    def _generate_fallback_response(self, god_name: str, query: str) -> str:
        """Generate a fallback response when pantheon is unavailable."""
        responses = {
            'zeus': f"As king of the gods, I advise careful consideration of all aspects of: {query[:50]}",
            'athena': f"Strategic analysis suggests examining the problem systematically: {query[:50]}",
            'apollo': f"The light of prophecy reveals multiple paths forward for: {query[:50]}",
            'artemis': f"With precise focus, target the core of the matter: {query[:50]}",
            'ares': f"Direct action is required - confront the challenge head-on: {query[:50]}",
            'hephaestus': f"Craft your solution with careful attention to detail: {query[:50]}",
            'hermes': f"Swift communication and adaptability will serve you well: {query[:50]}",
            'dionysus': f"Embrace the creative chaos and let transformation occur: {query[:50]}",
            'demeter': f"Nurture the growth of your understanding over time: {query[:50]}",
            'poseidon': f"Ride the waves of change with power and depth: {query[:50]}",
            'hades': f"Look beneath the surface for hidden truths: {query[:50]}",
            'hera': f"Consider the relationships and commitments involved: {query[:50]}",
        }
        return responses.get(god_name, f"Divine guidance for: {query[:50]}")
    
    def get_consultations(self, limit: int = 10) -> List[GodConsultation]:
        """Get recent consultations."""
        return self._consultations[-limit:]
    
    def integrate_consultation(
        self,
        state: GeometricAgentState,
        consultation: GodConsultation,
        influence: float = 0.2,
    ) -> None:
        """Integrate a god consultation into agent state.
        
        Applies the consultation's basin shift to the agent's position
        weighted by relevance and influence factor.
        
        Args:
            state: Agent state to modify
            consultation: Consultation to integrate
            influence: How much the consultation affects position (0-1)
        """
        weight = influence * consultation.domain_relevance
        
        for i in range(BASIN_DIMENSION):
            state.current_position[i] = (
                (1 - weight) * state.current_position[i] +
                weight * consultation.basin_shift[i]
            )


class OlympusQIGAgent(QIGDeepAgent):
    """QIG Deep Agent with Olympus Pantheon integration.
    
    Extends QIGDeepAgent with the ability to consult Olympus gods
    during task execution for guidance and domain expertise.
    
    Usage:
        agent = OlympusQIGAgent(
            llm_client=my_llm,
            pantheon_client=my_pantheon,
        )
        result = await agent.execute("Complex task requiring divine guidance")
    """
    
    def __init__(
        self,
        llm_client: Any,
        pantheon_client: Optional[Any] = None,
        config: Optional[AgentConfig] = None,
        basin_encoder: Optional[Callable[[str], List[float]]] = None,
        tools: Optional[Dict[str, Callable]] = None,
        auto_consult: bool = True,
    ):
        """Initialize the Olympus-integrated agent.
        
        Args:
            llm_client: LLM client for reasoning
            pantheon_client: Client for Olympus pantheon
            config: Agent configuration
            basin_encoder: Custom text to basin coordinate encoder
            tools: Dictionary of available tools
            auto_consult: Whether to automatically consult gods
        """
        super().__init__(llm_client, config, basin_encoder, tools)
        
        self.pantheon = PantheonIntegration(
            pantheon_client=pantheon_client,
            basin_encoder=basin_encoder,
        )
        self.auto_consult = auto_consult
        self._consultations_this_run: List[GodConsultation] = []
    
    async def execute(self, task: str, context: Optional[str] = None) -> ExecutionResult:
        """Execute a task with pantheon consultation.
        
        Args:
            task: The high-level task to accomplish
            context: Optional additional context
            
        Returns:
            ExecutionResult with output and metrics
        """
        self._consultations_this_run = []
        
        # Initial consultation for task understanding
        if self.auto_consult:
            initial_god = self.pantheon.select_god(task, ReasoningRegime.GEOMETRIC)
            consultation = await self.pantheon.consult(
                initial_god,
                f"Guidance for task: {task}",
                context,
            )
            self._consultations_this_run.append(consultation)
            
            # Update context with divine guidance
            if context:
                context = f"{context}\n\nDivine guidance from {initial_god.capitalize()}: {consultation.response}"
            else:
                context = f"Divine guidance from {initial_god.capitalize()}: {consultation.response}"
        
        # Execute using parent class
        result = await super().execute(task, context)
        
        return result
    
    async def consult_god(self, god_name: str, query: str) -> GodConsultation:
        """Manually consult a specific god.
        
        Args:
            god_name: Name of the god to consult
            query: Question or request for the god
            
        Returns:
            GodConsultation record
        """
        consultation = await self.pantheon.consult(god_name, query)
        self._consultations_this_run.append(consultation)
        
        # Integrate into state if available
        if self._current_state:
            self.pantheon.integrate_consultation(self._current_state, consultation)
        
        return consultation
    
    def get_run_consultations(self) -> List[GodConsultation]:
        """Get all consultations from the current run."""
        return self._consultations_this_run
