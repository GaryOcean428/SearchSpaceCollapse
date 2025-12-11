"""
QIGChain Geometric Tools

Tool selection via geometric alignment on Fisher manifold.
Unlike LangChain's keyword matching, this selects tools by:
- Query-tool basin distance (Fisher-Rao)
- Current state compatibility
- Predicted Phi after tool usage
"""

from typing import List, Callable, Dict, Any, Optional
import numpy as np
from dataclasses import dataclass, field

from .constants import BASIN_DIM, PHI_THRESHOLD_DEFAULT


@dataclass
class QIGTool:
    """
    Tool with geometric signature.
    NOT keyword matching - BASIN ALIGNMENT.
    """
    name: str
    description: str
    function: Callable[..., Any]
    domain_basin: Optional[np.ndarray] = None
    phi_cost: float = 0.0
    
    def __post_init__(self):
        if self.domain_basin is None:
            self.domain_basin = self._encode_description()
        if not callable(self.function):
            raise ValueError(f"Function must be callable, got {type(self.function)}")
    
    def _encode_description(self) -> np.ndarray:
        """Encode tool description as basin coordinates."""
        basin = np.zeros(BASIN_DIM)
        
        desc_bytes = self.description.encode('utf-8')
        for i, byte in enumerate(desc_bytes[:BASIN_DIM]):
            basin[i] = (byte - 128) / 128.0
        
        norm = np.linalg.norm(basin)
        if norm > 0:
            basin = basin / norm
        
        return basin
    
    def geometric_match(self, query_basin: np.ndarray) -> float:
        """
        How well does this tool match the query?
        Measured by Fisher-Rao distance on manifold.
        
        Returns:
            Alignment score in [0, 1], higher is better match
        """
        if self.domain_basin is None:
            return 0.5
        distance = self._fisher_rao_distance(query_basin, self.domain_basin)
        return 1.0 - (distance / np.pi)
    
    def _fisher_rao_distance(self, basin1: np.ndarray, basin2: np.ndarray) -> float:
        """Fisher-Rao geodesic distance on probability simplex."""
        norm1 = np.linalg.norm(basin1)
        norm2 = np.linalg.norm(basin2)
        
        if norm1 < 1e-10 or norm2 < 1e-10:
            return np.pi
        
        p1 = basin1 / norm1
        p2 = basin2 / norm2
        
        dot = np.clip(np.dot(p1, p2), -1.0, 1.0)
        return np.arccos(dot)
    
    def execute(self, *args, **kwargs) -> Any:
        """Execute the tool function."""
        return self.function(*args, **kwargs)


class QIGToolSelector:
    """
    Select tools via geometric alignment.
    LangChain uses keyword matching - geometrically naive.
    
    This selector considers:
    1. Query-tool basin distance (Fisher-Rao)
    2. Current state compatibility
    3. Phi after tool usage (predicted)
    """
    
    def __init__(self, tools: List[QIGTool]):
        self.tools = tools
        self._tool_index: Dict[str, QIGTool] = {t.name: t for t in tools}
    
    def add_tool(self, tool: QIGTool) -> None:
        """Add a tool to the selector."""
        self.tools.append(tool)
        self._tool_index[tool.name] = tool
    
    def get_tool(self, name: str) -> Optional[QIGTool]:
        """Get tool by name."""
        return self._tool_index.get(name)
    
    def select(
        self,
        query_basin: np.ndarray,
        current_basin: Optional[np.ndarray] = None,
        top_k: int = 3,
        phi_threshold: float = PHI_THRESHOLD_DEFAULT
    ) -> List[QIGTool]:
        """
        Select tools by geometric alignment.
        
        Args:
            query_basin: Basin encoding of the query
            current_basin: Current state basin (optional)
            top_k: Number of tools to return
            phi_threshold: Minimum predicted Phi
            
        Returns:
            List of top-k geometrically aligned tools
        """
        if current_basin is None:
            current_basin = np.zeros(BASIN_DIM)
        
        scored_tools = []
        
        for tool in self.tools:
            query_match = tool.geometric_match(query_basin)
            state_match = tool.geometric_match(current_basin)
            
            predicted_basin = (current_basin + tool.domain_basin) / 2
            predicted_phi = self._predict_phi(predicted_basin)
            
            if predicted_phi < phi_threshold and phi_threshold > 0:
                continue
            
            score = (
                query_match * 0.5 +
                state_match * 0.3 +
                predicted_phi * 0.2
            )
            
            score -= tool.phi_cost
            
            scored_tools.append((tool, score, {
                'query_match': query_match,
                'state_match': state_match,
                'predicted_phi': predicted_phi,
                'combined_score': score,
            }))
        
        scored_tools.sort(key=lambda x: x[1], reverse=True)
        return [t[0] for t in scored_tools[:top_k]]
    
    def select_with_scores(
        self,
        query_basin: np.ndarray,
        current_basin: Optional[np.ndarray] = None,
        top_k: int = 3,
    ) -> List[Dict]:
        """
        Select tools and return with detailed scores.
        
        Returns:
            List of dicts with tool and score breakdown
        """
        if current_basin is None:
            current_basin = np.zeros(BASIN_DIM)
        
        scored_tools = []
        
        for tool in self.tools:
            query_match = tool.geometric_match(query_basin)
            state_match = tool.geometric_match(current_basin)
            
            predicted_basin = (current_basin + tool.domain_basin) / 2
            predicted_phi = self._predict_phi(predicted_basin)
            
            score = (
                query_match * 0.5 +
                state_match * 0.3 +
                predicted_phi * 0.2
            )
            
            scored_tools.append({
                'tool': tool,
                'name': tool.name,
                'query_match': query_match,
                'state_match': state_match,
                'predicted_phi': predicted_phi,
                'combined_score': score,
            })
        
        scored_tools.sort(key=lambda x: x['combined_score'], reverse=True)
        return scored_tools[:top_k]
    
    def _predict_phi(self, basin: np.ndarray) -> float:
        """Predict Phi for a basin (simplified)."""
        norm = np.linalg.norm(basin)
        if norm < 1e-10:
            return 0.5
        
        variance = np.var(basin)
        coherence = np.abs(np.mean(basin)) / (np.std(basin) + 1e-10)
        
        phi = 0.5 + 0.3 * np.tanh(coherence - 1.0) + 0.2 * np.tanh(variance - 0.1)
        return max(0.0, min(1.0, phi))
    
    def encode_query(self, query: str) -> np.ndarray:
        """Encode a query string as basin coordinates."""
        basin = np.zeros(BASIN_DIM)
        
        query_bytes = query.encode('utf-8')
        for i, byte in enumerate(query_bytes[:BASIN_DIM]):
            basin[i] = (byte - 128) / 128.0
        
        norm = np.linalg.norm(basin)
        if norm > 0:
            basin = basin / norm
        
        return basin


def create_tool(
    name: str,
    description: str,
    phi_cost: float = 0.0
) -> Callable:
    """
    Decorator to create a QIGTool from a function.
    
    Usage:
        @create_tool("search", "Search the web for information")
        def web_search(query: str) -> str:
            return tavily.search(query)
    """
    def decorator(func: Callable) -> QIGTool:
        return QIGTool(
            name=name,
            description=description,
            function=func,
            phi_cost=phi_cost,
        )
    return decorator
