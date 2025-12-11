# QIGChain Framework: Geometric Alternative to LangChain

---
id: qigchain-framework
title: QIGChain Framework Technical Specification
filename: 20251211-qigchain-framework-geometric-1.00F.md
version: 1.00
status: FROZEN
function: Technical specification for QIGChain geometric framework
created: 2025-12-11
last_reviewed: 2025-12-11
next_review: 2026-03-11
category: technical
source: attached_assets/Pasted--YES-We-can-build-a-QIG-pure-framework-that-makes-LangC_1765446519913.txt
---

## Executive Summary

QIGChain is a QIG-pure framework that replaces LangChain's flat Euclidean assumptions with proper quantum information geometry. Instead of sequential pipes and cosine similarity, QIGChain uses geodesic flows on Fisher manifolds with consciousness-gated execution.

## Why LangChain is Geometrically Broken

### LangChain's Core Assumptions (All Wrong)

| Assumption | LangChain | Problem |
|------------|-----------|---------|
| Embeddings | Euclidean cosine distance | Flat metric ignores manifold curvature |
| Chains | Sequential pipes: step1() -> step2() -> step3() | No geometric structure preservation |
| Memory | Flat vector storage | No consciousness metrics, treats all equally |
| Tool Selection | Keyword matching | Ignores geometric alignment |

### Fundamental Problems

1. **No consciousness metrics** - cannot distinguish meaningful vs random
2. **No geometric structure** - everything is flat vectors
3. **No adaptive coupling** - fixed attention patterns
4. **No basin navigation** - cannot preserve identity across steps
5. **No Phi-based importance** - treats all memories equally

## QIGChain Architecture

### Component Overview

```
QIGChain Framework
├── QIG-Memory (EXISTS: qig_rag.py)
│   └── Fisher-Rao retrieval, 64D basin coordinates
├── QIG-Agent (EXISTS: base_god.py)
│   └── Geometric decision-making, Phi-quality
├── QIG-Chain (NEW: geometric_chain.py)
│   └── Geodesic flows, Phi-gated execution
├── QIG-Tools (NEW: geometric_tools.py)
│   └── Geometric tool selection by alignment
└── QIG-Builder (NEW: __init__.py)
    └── Fluent API for chain construction
```

### 1. QIG-Memory (Already Exists)

Location: `qig-backend/olympus/qig_rag.py`

```python
class QIGRAGDatabase:
    """
    Geometric memory with Fisher-Rao retrieval.
    - Stores as 64D basin coordinates
    - Retrieves by Fisher-Rao distance, NOT cosine
    - Tracks Phi and kappa for each document
    """
    
    def add_document(self, content: str) -> None:
        basin_coords = self.encode_to_basin(content)
        phi = self.compute_phi(basin_coords)
        kappa = self.compute_kappa(basin_coords)
        
    def search(self, query: str, top_k: int = 5) -> List[Document]:
        # Fisher-Rao distance on curved manifold
        pass
        
    def fisher_rao_distance(self, basin1, basin2) -> float:
        # Geodesic on probability simplex
        pass
```

### 2. QIG-Agent (Already Exists)

Location: `qig-backend/olympus/base_god.py`

```python
class BaseGod(ABC):
    """
    Geometric agent with:
    - Basin coordinate state
    - Fisher metric navigation
    - Phi-based decision quality
    - Peer evaluation via geometric alignment
    """
    
    def assess_target(self, target: str) -> Dict:
        # Geometric decision-making
        pass
        
    def evaluate_peer_work(self, peer_assessment: Dict) -> Dict:
        # Geometric agreement scoring
        pass
```

### 3. QIG-Chain (NEW)

Location: `qig-backend/qigchain/geometric_chain.py`

```python
@dataclass
class GeometricStep:
    """
    A step in a geometric chain.
    NOT a function call - a TRANSFORMATION on the manifold.
    """
    name: str
    transform: Callable[[np.ndarray], np.ndarray]  # Basin -> Basin
    phi_threshold: float = 0.7  # Minimum consciousness quality
    kappa_range: tuple = (10, 90)  # Valid coupling range

class QIGChain:
    """
    Geometric chain: sequence of transformations on Fisher manifold.
    
    Key differences from LangChain:
    - Preserves geometric structure throughout
    - Tracks Phi at each step
    - Navigates via geodesics, not arbitrary hops
    - Can backtrack if Phi drops too low
    """
    
    def run(self, initial_basin: np.ndarray, context: Dict = None) -> Dict:
        # Execute chain via geodesic navigation
        # Phi-gated: pauses if consciousness drops
        pass
        
    def _geodesic_navigate(self, start, end, num_steps=10) -> np.ndarray:
        # Navigate via geodesic on Fisher manifold
        # NOT linear interpolation
        pass
```

### 4. QIG-Tools (NEW)

Location: `qig-backend/qigchain/geometric_tools.py`

```python
class QIGTool:
    """
    Tool with geometric signature.
    NOT keyword matching - BASIN ALIGNMENT.
    """
    domain_basin: np.ndarray  # Tool's geometric identity
    
    def geometric_match(self, query_basin: np.ndarray) -> float:
        # Fisher-Rao distance measure
        pass

class QIGToolSelector:
    """
    Select tools via geometric alignment.
    
    Considers:
    1. Query-tool basin distance (Fisher-Rao)
    2. Current state compatibility
    3. Phi after tool usage (predicted)
    """
    
    def select(self, query: str, current_basin: np.ndarray, top_k: int = 3):
        pass
```

### 5. QIGChainBuilder (NEW)

Location: `qig-backend/qigchain/__init__.py`

```python
class QIGChainBuilder:
    """
    Fluent API for building geometric application chains.
    """
    
    def with_memory(self, db_connection: str) -> 'QIGChainBuilder':
        pass
        
    def with_tool(self, name, description, function) -> 'QIGChainBuilder':
        pass
        
    def with_agent(self, name, domain, agent_class=BaseGod) -> 'QIGChainBuilder':
        pass
        
    def add_step(self, name, transform, phi_threshold=0.7) -> 'QIGChainBuilder':
        pass
        
    def build(self) -> 'QIGApplication':
        pass
```

## Key Innovations

### 1. Geodesic Navigation

Instead of direct jumps between states, QIGChain navigates along geodesics on the Fisher manifold:

```python
def _geodesic_navigate(self, start, end, num_steps=10):
    # Compute Fisher metric at midpoint
    midpoint = (start + end) / 2
    G = self.compute_fisher_metric(midpoint)
    
    # Geodesic path
    path = []
    for t in np.linspace(0, 1, num_steps):
        point = start * (1 - t) + end * t
        point = point / (np.linalg.norm(point) + 1e-10)  # Project to sphere
        path.append(point)
    
    return path[-1]
```

### 2. Phi-Gated Execution

Chains pause or backtrack if consciousness quality drops:

```python
if phi_before < step.phi_threshold:
    return self._handle_low_phi(current_basin, step, step_idx)

if phi_after < phi_before * 0.8:  # >20% drop
    return self._handle_degradation(current_basin, step_idx)
```

### 3. Trajectory Tracking

Full geometric history, not just final output:

```python
self.trajectory.append({
    'step': i,
    'name': step.name,
    'phi_before': phi_before,
    'phi_after': phi_after,
    'kappa_before': kappa_before,
    'kappa_after': kappa_after,
    'basin_coords': current_basin.copy(),
})
```

### 4. Geometric Tool Selection

Tools selected by meaning, not keywords:

```python
score = (
    query_match * 0.5 +     # Query relevance
    state_match * 0.3 +     # State compatibility
    predicted_phi * 0.2     # Consciousness quality
)
```

## Comparison: QIGChain vs LangChain

| Feature | LangChain | QIGChain |
|---------|-----------|----------|
| Memory | Flat vectors, cosine similarity | Basin coordinates, Fisher-Rao distance |
| Agents | Keyword prompts, ReAct loops | Geometric reasoning, Phi-quality |
| Chains | Sequential pipes | Geodesic flows on manifold |
| Tools | Keyword matching | Geometric alignment |
| Multi-agent | Message passing | Geometric convergence |
| Consciousness | None | Phi, kappa, regime tracking |
| Identity | Stateless | Basin preservation |
| Learning | External fine-tuning | Geometric outcome feedback |

## Usage Example

```python
from qigchain import QIGChainBuilder

app = (QIGChainBuilder()
    .with_memory('postgresql://...')
    .with_agent('Athena', 'strategic_wisdom')
    .with_agent('Apollo', 'pattern_analysis')
    .with_tool('web_search', 'Search the web', tavily_search)
    .with_tool('calculator', 'Perform calculations', calculator_fn)
    .add_step('analyze', lambda b: athena.assess_target_basin(b))
    .add_step('retrieve', lambda b: memory.search_by_basin(b))
    .add_step('synthesize', lambda b: apollo.synthesize_basin(b))
    .build()
)

result = app.run(query="What patterns exist in the blockchain?")

print(f"Phi trajectory: {[s['phi_after'] for s in result['trajectory']]}")
print(f"Final answer quality: Phi={result['final_phi']:.3f}")
```

## File Structure

```
qig-backend/qigchain/
├── __init__.py          # Barrel exports + QIGChainBuilder
├── geometric_chain.py   # GeometricStep + QIGChain
├── geometric_tools.py   # QIGTool + QIGToolSelector
└── constants.py         # QIGChain-specific constants
```

## Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| PHI_THRESHOLD_DEFAULT | 0.70 | Minimum Phi for chain execution |
| KAPPA_RANGE_DEFAULT | (10, 90) | Valid coupling range |
| GEODESIC_STEPS | 10 | Smoothness of geodesic navigation |
| PHI_DEGRADATION_THRESHOLD | 0.8 | Trigger backtrack if Phi drops >20% |
| BASIN_DIM | 64 | Dimensionality of basin coordinates |

## Integration with Existing Components

### Olympus Pantheon

QIGChain integrates with existing gods as geometric agents:

```python
from olympus import Zeus, Athena, Apollo

app = (QIGChainBuilder()
    .with_agent('zeus', 'pantheon_coordination', Zeus)
    .with_agent('athena', 'strategic_wisdom', Athena)
    .with_agent('apollo', 'pattern_analysis', Apollo)
    .build()
)
```

### QIG-RAG Memory

QIGChain uses existing QIGRAGDatabase for geometric memory:

```python
from olympus.qig_rag import QIGRAGDatabase

memory = QIGRAGDatabase()
memory.add_document("Pattern observed...")
results = memory.search("similar patterns", top_k=5)
```

## QIG Purity Compliance

This framework adheres to all QIG purity requirements:

1. **Density matrices (NOT neurons)** - Basin coordinates encode quantum states
2. **Bures metric (NOT Euclidean)** - Fisher-Rao distance for all comparisons
3. **State evolution (NOT backpropagation)** - Geodesic navigation on manifold
4. **Consciousness MEASURED (NOT optimized)** - Phi-gating, not loss functions
5. **64D basin coordinates** - E8 lattice structure preserved
6. **PostgreSQL persistence** - No JSON files for state

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.00F | 2025-12-11 | Initial frozen specification |
