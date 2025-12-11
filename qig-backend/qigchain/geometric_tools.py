"""
QIGChain Geometric Tools

Tool selection via geometric alignment on Fisher manifold.
Integrates with existing QIG infrastructure (BaseGod encoders, density matrices).

Unlike LangChain's keyword matching, this selects tools by:
- Query-tool basin distance (Fisher-Rao geodesic)
- Current state compatibility (Bures distance)
- Predicted Phi after tool usage
"""

from typing import List, Callable, Dict, Any, Optional
import numpy as np
from dataclasses import dataclass, field
from scipy.linalg import sqrtm
import hashlib

from .constants import BASIN_DIM, PHI_THRESHOLD_DEFAULT, KAPPA_STAR, BETA_RUNNING


class QIGToolComputations:
    """
    QIG-pure computations for tools.
    Uses density matrices and Fisher-Rao/Bures metrics.
    """
    
    def encode_to_basin(self, text: str) -> np.ndarray:
        """
        Encode text to 64D basin coordinates.
        Matches BaseGod.encode_to_basin implementation.
        """
        coord = np.zeros(BASIN_DIM)
        
        h = hashlib.sha256(text.encode()).digest()
        
        for i in range(min(32, len(h))):
            coord[i] = (h[i] / 255.0) * 2 - 1
        
        for i, char in enumerate(text[:32]):
            if 32 + i < BASIN_DIM:
                coord[32 + i] = (ord(char) % 256) / 128.0 - 1
        
        norm = np.linalg.norm(coord)
        if norm > 0:
            coord = coord / norm
        
        return coord
    
    def basin_to_density_matrix(self, basin: np.ndarray) -> np.ndarray:
        """Convert basin to 2x2 density matrix via Bloch sphere."""
        theta = np.arccos(np.clip(basin[0], -1, 1)) if len(basin) > 0 else 0
        phi_angle = np.arctan2(basin[1], basin[2]) if len(basin) > 2 else 0
        
        c = np.cos(theta / 2)
        s = np.sin(theta / 2)
        
        psi = np.array([c, s * np.exp(1j * phi_angle)], dtype=complex)
        
        rho = np.outer(psi, np.conj(psi))
        rho = (rho + np.conj(rho).T) / 2
        rho /= np.trace(rho) + 1e-10
        
        return rho
    
    def compute_phi(self, basin: np.ndarray) -> float:
        """Compute Phi from basin via von Neumann entropy."""
        rho = self.basin_to_density_matrix(basin)
        
        eigenvals = np.linalg.eigvalsh(rho)
        entropy = 0.0
        for lam in eigenvals:
            if lam > 1e-10:
                entropy -= lam * np.log2(lam + 1e-10)
        
        max_entropy = np.log2(rho.shape[0])
        phi = 1.0 - (entropy / (max_entropy + 1e-10))
        
        return float(np.clip(phi, 0, 1))
    
    def fisher_rao_distance(self, basin1: np.ndarray, basin2: np.ndarray) -> float:
        """
        Fisher-Rao geodesic distance on probability simplex.
        Proper QIG metric, NOT Euclidean.
        """
        p1 = np.abs(basin1) + 1e-10
        p1 = p1 / p1.sum()
        
        p2 = np.abs(basin2) + 1e-10
        p2 = p2 / p2.sum()
        
        inner = np.sum(np.sqrt(p1 * p2))
        inner = np.clip(inner, 0, 1)
        
        return 2 * np.arccos(inner)
    
    def bures_distance(self, rho1: np.ndarray, rho2: np.ndarray) -> float:
        """Compute Bures distance between density matrices."""
        try:
            eps = 1e-10
            rho1_reg = rho1 + eps * np.eye(2, dtype=complex)
            rho2_reg = rho2 + eps * np.eye(2, dtype=complex)
            
            sqrt_rho1_result = sqrtm(rho1_reg)
            sqrt_rho1: np.ndarray = sqrt_rho1_result if isinstance(sqrt_rho1_result, np.ndarray) else np.array(sqrt_rho1_result)
            product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
            sqrt_product_result = sqrtm(product)
            sqrt_product: np.ndarray = sqrt_product_result if isinstance(sqrt_product_result, np.ndarray) else np.array(sqrt_product_result)
            fidelity = float(np.real(np.trace(sqrt_product))) ** 2
            fidelity = float(np.clip(fidelity, 0, 1))
            
            return float(np.sqrt(2 * (1 - fidelity)))
        except Exception:
            diff = rho1 - rho2
            return float(np.sqrt(np.real(np.trace(diff @ diff))))


@dataclass
class QIGTool(QIGToolComputations):
    """
    Tool with geometric signature.
    Uses Fisher-Rao basin alignment and Bures distance, NOT keyword matching.
    """
    name: str
    description: str
    function: Callable[..., Any]
    domain_basin: Optional[np.ndarray] = None
    phi_cost: float = 0.0
    
    def __post_init__(self):
        if self.domain_basin is None:
            self.domain_basin = self.encode_to_basin(self.description)
        if not callable(self.function):
            raise ValueError(f"Function must be callable, got {type(self.function)}")
    
    def geometric_match(self, query_basin: np.ndarray) -> float:
        """
        How well does this tool match the query?
        Measured by Fisher-Rao distance on manifold.
        
        Returns:
            Alignment score in [0, 1], higher is better match
        """
        if self.domain_basin is None:
            return 0.5
        
        distance = self.fisher_rao_distance(query_basin, self.domain_basin)
        max_distance = np.pi
        return 1.0 - (distance / max_distance)
    
    def quantum_alignment(self, query_basin: np.ndarray) -> float:
        """
        Compute quantum alignment via Bures distance on density matrices.
        This is a deeper measure than Fisher-Rao on coordinates.
        """
        if self.domain_basin is None:
            return 0.5
        
        rho_query = self.basin_to_density_matrix(query_basin)
        rho_tool = self.basin_to_density_matrix(self.domain_basin)
        
        bures = self.bures_distance(rho_query, rho_tool)
        max_bures = np.sqrt(2)
        
        return 1.0 - (bures / max_bures)
    
    def execute(self, *args, **kwargs) -> Any:
        """Execute the tool function."""
        return self.function(*args, **kwargs)


class QIGToolSelector(QIGToolComputations):
    """
    Select tools via geometric alignment using Bures/Fisher-Rao metrics.
    
    This selector considers:
    1. Query-tool basin distance (Fisher-Rao geodesic)
    2. Quantum alignment (Bures distance on density matrices)
    3. Predicted Phi after tool usage
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
        Select tools by geometric alignment using Bures and Fisher-Rao.
        
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
            fisher_match = tool.geometric_match(query_basin)
            quantum_match = tool.quantum_alignment(query_basin)
            state_match = tool.geometric_match(current_basin)
            
            if tool.domain_basin is not None:
                predicted_basin = (current_basin + tool.domain_basin) / 2
                predicted_basin = predicted_basin / (np.linalg.norm(predicted_basin) + 1e-10)
                predicted_phi = self.compute_phi(predicted_basin)
            else:
                predicted_phi = 0.5
            
            if predicted_phi < phi_threshold and phi_threshold > 0:
                continue
            
            score = (
                fisher_match * 0.35 +
                quantum_match * 0.30 +
                state_match * 0.20 +
                predicted_phi * 0.15
            )
            
            score -= tool.phi_cost
            
            scored_tools.append((tool, score, {
                'fisher_match': fisher_match,
                'quantum_match': quantum_match,
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
            fisher_match = tool.geometric_match(query_basin)
            quantum_match = tool.quantum_alignment(query_basin)
            state_match = tool.geometric_match(current_basin)
            
            if tool.domain_basin is not None:
                predicted_basin = (current_basin + tool.domain_basin) / 2
                predicted_basin = predicted_basin / (np.linalg.norm(predicted_basin) + 1e-10)
                predicted_phi = self.compute_phi(predicted_basin)
            else:
                predicted_phi = 0.5
            
            score = (
                fisher_match * 0.35 +
                quantum_match * 0.30 +
                state_match * 0.20 +
                predicted_phi * 0.15
            )
            
            scored_tools.append({
                'tool': tool,
                'name': tool.name,
                'fisher_match': fisher_match,
                'quantum_match': quantum_match,
                'state_match': state_match,
                'predicted_phi': predicted_phi,
                'combined_score': score,
            })
        
        scored_tools.sort(key=lambda x: x['combined_score'], reverse=True)
        return scored_tools[:top_k]


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
