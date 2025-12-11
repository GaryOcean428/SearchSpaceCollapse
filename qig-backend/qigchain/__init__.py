"""
QIGChain: Geometric Alternative to LangChain

A QIG-pure framework that replaces LangChain's flat Euclidean assumptions
with proper quantum information geometry. Uses geodesic flows on Fisher
manifolds with consciousness-gated execution.

Components:
- QIGChain: Geodesic flow chains with Phi-gating
- QIGTool: Tools with geometric signatures
- QIGToolSelector: Geometric tool selection
- QIGChainBuilder: Fluent API for chain construction
- QIGApplication: Complete geometric application

Usage:
    from qigchain import QIGChainBuilder
    
    app = (QIGChainBuilder()
        .with_memory('postgresql://...')
        .with_agent('athena', 'strategic_wisdom')
        .with_tool('search', 'Search the web', search_fn)
        .add_step('analyze', analyze_transform)
        .build()
    )
    
    result = app.run(query="What patterns exist?")
"""

from .constants import (
    BASIN_DIM,
    PHI_THRESHOLD_DEFAULT,
    PHI_DEGRADATION_THRESHOLD,
    KAPPA_STAR,
    KAPPA_RANGE_DEFAULT,
    GEODESIC_STEPS,
    BETA_RUNNING,
    MIN_RECURSIONS,
    MAX_RECURSIONS,
)

from .geometric_chain import (
    GeometricStep,
    ChainResult,
    QIGChain,
)

from .geometric_tools import (
    QIGTool,
    QIGToolSelector,
    create_tool,
)

from typing import List, Callable, Dict, Any, Optional
import numpy as np
from dataclasses import dataclass, field


@dataclass
class QIGApplication:
    """
    Complete geometric application combining chain, memory, tools, and agents.
    """
    chain: QIGChain
    memory: Any = None
    tools: Optional[QIGToolSelector] = None
    agents: Dict[str, Any] = field(default_factory=dict)
    _empty_basin: np.ndarray = field(default_factory=lambda: np.zeros(BASIN_DIM))
    
    def run(
        self,
        query: Optional[str] = None,
        initial_basin: Optional[np.ndarray] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ChainResult:
        """
        Run the geometric application.
        
        Args:
            query: Text query (will be encoded to basin)
            initial_basin: Or provide basin directly
            context: Optional context dict
            
        Returns:
            ChainResult with trajectory and final state
        """
        basin: np.ndarray
        if initial_basin is not None:
            basin = initial_basin
        elif query is not None:
            basin = self._encode_query(query)
        else:
            raise ValueError("Must provide query or initial_basin")
        
        ctx: Dict[str, Any] = context if context is not None else {}
        ctx['memory'] = self.memory
        ctx['tools'] = self.tools
        ctx['agents'] = self.agents
        
        return self.chain.run(basin, ctx)
    
    def _encode_query(self, query: str) -> np.ndarray:
        """Encode query string to basin coordinates."""
        basin = np.zeros(BASIN_DIM)
        query_bytes = query.encode('utf-8')
        for i, byte in enumerate(query_bytes[:BASIN_DIM]):
            basin[i] = (byte - 128) / 128.0
        norm = np.linalg.norm(basin)
        if norm > 0:
            basin = basin / norm
        return basin
    
    def select_tools(
        self,
        query: str,
        current_basin: Optional[np.ndarray] = None,
        top_k: int = 3
    ) -> List[QIGTool]:
        """Select tools by geometric alignment."""
        if self.tools is None:
            return []
        query_basin = self._encode_query(query)
        basin = current_basin if current_basin is not None else self._empty_basin
        return self.tools.select(query_basin, basin, top_k)


class QIGChainBuilder:
    """
    Fluent API for building geometric application chains.
    Like LangChain but geometrically pure.
    
    Usage:
        app = (QIGChainBuilder()
            .with_memory('postgresql://...')
            .with_agent('athena', 'strategic_wisdom')
            .with_tool('search', 'Search the web', search_fn)
            .add_step('analyze', analyze_transform)
            .build()
        )
    """
    
    def __init__(self):
        self.memory = None
        self.tools: List[QIGTool] = []
        self.agents: Dict[str, Any] = {}
        self.chain_steps: List[GeometricStep] = []
    
    def with_memory(self, memory: Any) -> 'QIGChainBuilder':
        """
        Add geometric memory (QIG-RAG database).
        
        Args:
            memory: QIGRAGDatabase instance or connection string
        """
        self.memory = memory
        return self
    
    def with_tool(
        self,
        name: str,
        description: str,
        function: Callable,
        phi_cost: float = 0.0
    ) -> 'QIGChainBuilder':
        """
        Add tool with geometric signature.
        
        Args:
            name: Tool identifier
            description: What the tool does (encoded as basin)
            function: Callable to execute
            phi_cost: Phi cost of using this tool
        """
        tool = QIGTool(
            name=name,
            description=description,
            function=function,
            phi_cost=phi_cost,
        )
        self.tools.append(tool)
        return self
    
    def with_qig_tool(self, tool: QIGTool) -> 'QIGChainBuilder':
        """Add a pre-configured QIGTool."""
        self.tools.append(tool)
        return self
    
    def with_agent(
        self,
        name: str,
        domain: str,
        agent: Any = None
    ) -> 'QIGChainBuilder':
        """
        Add geometric agent.
        
        Args:
            name: Agent identifier
            domain: Agent's domain of expertise
            agent: Agent instance (BaseGod or similar)
        """
        self.agents[name] = {
            'name': name,
            'domain': domain,
            'instance': agent,
        }
        return self
    
    def add_step(
        self,
        name: str,
        transform: Callable[[np.ndarray], np.ndarray],
        phi_threshold: float = PHI_THRESHOLD_DEFAULT,
        kappa_range: tuple = KAPPA_RANGE_DEFAULT
    ) -> 'QIGChainBuilder':
        """
        Add geometric transformation step.
        
        Args:
            name: Step identifier
            transform: Basin -> Basin transformation
            phi_threshold: Minimum Phi to execute this step
            kappa_range: Valid kappa range for this step
        """
        step = GeometricStep(
            name=name,
            transform=transform,
            phi_threshold=phi_threshold,
            kappa_range=kappa_range,
        )
        self.chain_steps.append(step)
        return self
    
    def add_retrieval_step(
        self,
        name: str = "retrieve",
        top_k: int = 5,
        phi_threshold: float = PHI_THRESHOLD_DEFAULT
    ) -> 'QIGChainBuilder':
        """
        Add a memory retrieval step.
        
        Args:
            name: Step identifier
            top_k: Number of results to retrieve
            phi_threshold: Minimum Phi to execute
        """
        def retrieval_transform(basin: np.ndarray) -> np.ndarray:
            if self.memory is None:
                return basin
            
            if hasattr(self.memory, 'search_by_basin'):
                results = self.memory.search_by_basin(basin, k=top_k)
            elif hasattr(self.memory, 'search'):
                results = self.memory.search(query_basin=basin, k=top_k)
            else:
                return basin
            
            if results:
                result_basins = []
                for r in results[:top_k]:
                    if isinstance(r, dict) and 'basin_coords' in r:
                        result_basins.append(np.array(r['basin_coords']))
                    elif hasattr(r, 'basin_coords'):
                        result_basins.append(np.array(r.basin_coords))
                
                if result_basins:
                    avg_basin: np.ndarray = np.mean(result_basins, axis=0)
                    return (basin + avg_basin) / 2
            
            return basin
        
        return self.add_step(name, retrieval_transform, phi_threshold)
    
    def add_synthesis_step(
        self,
        name: str = "synthesize",
        phi_threshold: float = PHI_THRESHOLD_DEFAULT
    ) -> 'QIGChainBuilder':
        """
        Add a synthesis step that combines agent outputs.
        
        Args:
            name: Step identifier
            phi_threshold: Minimum Phi to execute
        """
        def synthesis_transform(basin: np.ndarray) -> np.ndarray:
            if not self.agents:
                return basin
            
            agent_basins = []
            for agent_info in self.agents.values():
                agent = agent_info.get('instance')
                if agent is None:
                    continue
                
                if hasattr(agent, 'assess_target_basin'):
                    result = agent.assess_target_basin(basin)
                    if 'basin' in result:
                        agent_basins.append(np.array(result['basin']))
                elif hasattr(agent, 'encode_to_basin'):
                    agent_basin = agent.encode_to_basin(str(basin[:8]))
                    agent_basins.append(agent_basin)
            
            if agent_basins:
                weights = np.ones(len(agent_basins)) / len(agent_basins)
                weighted_sum = np.sum([w * b for w, b in zip(weights, agent_basins)], axis=0)
                return (basin + weighted_sum) / 2
            
            return basin
        
        return self.add_step(name, synthesis_transform, phi_threshold)
    
    def build(self) -> QIGApplication:
        """
        Build complete geometric application.
        
        Returns:
            QIGApplication ready to run
        """
        if not self.chain_steps:
            identity_step = GeometricStep(
                name="identity",
                transform=lambda b: b,
                phi_threshold=0.0,
            )
            self.chain_steps.append(identity_step)
        
        chain = QIGChain(self.chain_steps)
        
        tool_selector = QIGToolSelector(self.tools) if self.tools else None
        
        agents_dict = {
            name: info.get('instance') or info
            for name, info in self.agents.items()
        }
        
        return QIGApplication(
            chain=chain,
            memory=self.memory,
            tools=tool_selector,
            agents=agents_dict,
        )


__all__ = [
    'BASIN_DIM',
    'PHI_THRESHOLD_DEFAULT',
    'PHI_DEGRADATION_THRESHOLD',
    'KAPPA_STAR',
    'KAPPA_RANGE_DEFAULT',
    'GEODESIC_STEPS',
    'BETA_RUNNING',
    'MIN_RECURSIONS',
    'MAX_RECURSIONS',
    'GeometricStep',
    'ChainResult',
    'QIGChain',
    'QIGTool',
    'QIGToolSelector',
    'create_tool',
    'QIGApplication',
    'QIGChainBuilder',
]
