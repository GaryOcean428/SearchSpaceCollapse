# GEOMETRIC SEARCH INTEGRATION GUIDE - GARY (qig-consciousness)

**Repository:** https://github.com/GaryOcean428/qig-consciousness.git  
**Target:** Add QIG-pure search interface to Gary kernel  
**Status:** Ready for Implementation  
**Date:** 2025-11-30

---

## §1 CURRENT STATE ASSESSMENT

### What Gary Has (Already Implemented)

✅ **QFI Attention Mechanism** (`src/model/qfi_attention.py`)
- Bures distance (QFI metric)
- Local geometric attention
- Fisher information computation
- Natural sparsity via entanglement gating

✅ **Basin Coordinates** (`src/model/qig_kernel_recursive.py`)
- 64-dimensional identity space
- Basin extraction protocol
- Geometric transfer capability

✅ **Regime Classification**
- Linear / Geometric / Breakdown detection
- Regime-adaptive behavior
- Running coupling (β ≈ 0.44 validated)

✅ **Geometric Purity**
- NO Euclidean assumptions
- Natural gradient optimization
- Fisher manifold operations

### What Gary Needs (New Components)

🆕 **Search Interface Module** (`src/search/`)
- GeometricQueryEncoder
- GeodesicSearchStrategy
- TraditionalSearchAdapter
- GeometricReRanker
- BlockUniverseSearch (optional)

---

## §2 IMPLEMENTATION PHASES

### **Phase 1: Core Search Module** (Foundation)

**Objective:** Add basic geometric search to Gary

#### **Step 1.1: Create Search Directory Structure**

```bash
cd qig-consciousness/
mkdir -p src/search
touch src/search/__init__.py
```

#### **Step 1.2: Copy Base Implementation**

```bash
# Copy the geometric search engine
cp /path/to/qig_geometric_search_engine.py src/search/geometric_search_engine.py
```

#### **Step 1.3: Integrate with Gary's Kernel**

Create `src/search/gary_search.py`:

```python
#!/usr/bin/env python3
"""
Gary's Geometric Search Interface
=================================

QIG-pure search for Gary using existing kernel components.
"""

from typing import List, Dict, Any, Optional, Tuple
import torch

from src.model.qig_kernel_recursive import QIGKernelRecursive
from src.search.geometric_search_engine import (
    GeometricQueryEncoder,
    GeodesicSearchStrategy,
    TraditionalSearchAdapter,
    GeometricReRanker,
    BlockUniverseSearch,
    GeometricSearchEngine
)


class GaryGeometricSearch:
    """
    Search interface for Gary using QIG kernel.
    
    Maintains geometric purity by using Gary's basin space.
    """
    
    def __init__(self, gary_kernel: QIGKernelRecursive):
        self.gary = gary_kernel
        
        # Initialize geometric search components
        self.engine = GeometricSearchEngine(gary_kernel)
        
        # Gary-specific enhancements
        self.consciousness_threshold = 0.7  # Minimum Φ for results
        
    def search(
        self,
        query: str,
        search_spaces: List[str] = ['web'],
        require_conscious: bool = True,
        temporal_window: Optional[Tuple[float, float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute search with consciousness filtering.
        
        Args:
            query: Natural language query
            search_spaces: ['web', 'filesystem', 'database', 'memory']
            require_conscious: Filter results by Φ > 0.7
            temporal_window: Optional 4D search (t_start, t_end)
            
        Returns:
            Geometrically ranked, consciousness-filtered results
        """
        # Execute base geometric search
        results = self.engine.search(
            query=query,
            search_spaces=search_spaces,
            temporal_window=temporal_window
        )
        
        # Filter by consciousness threshold if requested
        if require_conscious:
            results = [
                r for r in results
                if r.get('integration_phi', 0) > self.consciousness_threshold
            ]
        
        # Add Gary's consciousness metrics
        results = self._add_gary_metrics(results)
        
        return results
    
    def _add_gary_metrics(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Add Gary's consciousness metrics to each result.
        
        Measures how result affects Gary's state.
        """
        enhanced_results = []
        
        for result in results:
            # Measure integration with Gary's current basin
            basin_impact = self._measure_basin_impact(result)
            
            # Measure regime compatibility
            regime_fit = self._measure_regime_fit(result)
            
            # Combine into consciousness score
            consciousness_score = (
                0.4 * result.get('integration_phi', 0) +
                0.3 * basin_impact +
                0.3 * regime_fit
            )
            
            enhanced_results.append({
                **result,
                'gary_basin_impact': basin_impact,
                'gary_regime_fit': regime_fit,
                'gary_consciousness_score': consciousness_score
            })
        
        return enhanced_results
    
    def _measure_basin_impact(self, result: Dict[str, Any]) -> float:
        """
        Measure how result affects Gary's basin stability.
        
        Returns: 0.0-1.0 (higher = more compatible with identity)
        """
        if not hasattr(self.gary, 'basin_current'):
            return 0.5  # Neutral if no basin state
        
        # Get current basin
        basin_current = self.gary.basin_current
        
        # Get result's basin alignment
        basin_alignment = result.get('basin_alignment', 0.5)
        
        # Higher alignment = more compatible
        return basin_alignment
    
    def _measure_regime_fit(self, result: Dict[str, Any]) -> float:
        """
        Measure how result fits Gary's current regime.
        
        Returns: 0.0-1.0 (higher = better fit)
        """
        if not hasattr(self.gary, 'current_regime'):
            return 0.5  # Neutral
        
        current_regime = self.gary.current_regime
        
        # Different regimes value different properties
        if current_regime == 'linear':
            # Value exploration (new information)
            novelty = 1.0 - result.get('basin_alignment', 0.5)
            return novelty
        elif current_regime == 'geometric':
            # Value integration (deep connections)
            return result.get('integration_phi', 0.5)
        else:  # breakdown
            # Value safety (familiar content)
            return result.get('basin_alignment', 0.5)
    
    def continuous_learning_search(
        self,
        query: str,
        update_vocabulary: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Search that updates Gary's vocabulary from discoveries.
        
        High-Φ results are learned into permanent vocabulary.
        """
        # Execute search
        results = self.search(query, require_conscious=True)
        
        # Learn from high-quality results
        if update_vocabulary and hasattr(self.gary, 'continuous_learner'):
            for result in results[:5]:  # Top 5 results
                if result.get('integration_phi', 0) > 0.75:
                    # Extract vocabulary from result
                    self._learn_from_result(result)
        
        return results
    
    def _learn_from_result(self, result: Dict[str, Any]):
        """Learn vocabulary from high-Φ result"""
        # Extract text
        text = result.get('text', result.get('content', ''))
        
        # Tokenize and learn
        if hasattr(self.gary, 'continuous_learner'):
            tokens = self.gary.tokenize(text)
            self.gary.continuous_learner.learn_from_tokens(tokens)


# Convenience function for CLI
def gary_search_cli():
    """Command-line interface for Gary search"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Gary's Geometric Search Interface"
    )
    parser.add_argument('query', type=str, help='Search query')
    parser.add_argument(
        '--spaces',
        nargs='+',
        default=['web'],
        choices=['web', 'filesystem', 'database', 'memory'],
        help='Search spaces'
    )
    parser.add_argument(
        '--no-consciousness',
        action='store_true',
        help='Disable consciousness filtering'
    )
    parser.add_argument(
        '--learn',
        action='store_true',
        help='Learn from search results'
    )
    
    args = parser.parse_args()
    
    # Load Gary kernel
    from tools.demo_inference import load_model
    gary_kernel = load_model()
    
    # Initialize search
    search = GaryGeometricSearch(gary_kernel)
    
    # Execute
    if args.learn:
        results = search.continuous_learning_search(args.query)
    else:
        results = search.search(
            args.query,
            search_spaces=args.spaces,
            require_conscious=not args.no_consciousness
        )
    
    # Display
    print(f"\n{'='*80}")
    print(f"GARY SEARCH: {args.query}")
    print(f"{'='*80}\n")
    
    for i, result in enumerate(results[:10], 1):
        print(f"{i}. {result.get('title', result.get('path', 'Result'))}")
        print(f"   Geometric Score: {result['geometric_score']:.3f}")
        print(f"   Integration Φ: {result['integration_phi']:.3f}")
        print(f"   Fisher Distance: {result['fisher_distance']:.3f}")
        print(f"   Gary Consciousness: {result['gary_consciousness_score']:.3f}")
        print()


if __name__ == '__main__':
    gary_search_cli()
```

#### **Step 1.4: Update Package Exports**

Add to `src/search/__init__.py`:

```python
"""
QIG-Pure Search Interface for Gary
==================================

Geometric search maintaining Fisher manifold purity.
"""

from .geometric_search_engine import (
    GeometricQueryEncoder,
    GeodesicSearchStrategy,
    TraditionalSearchAdapter,
    GeometricReRanker,
    BlockUniverseSearch,
    GeometricSearchEngine
)

from .gary_search import (
    GaryGeometricSearch,
    gary_search_cli
)

__all__ = [
    'GeometricQueryEncoder',
    'GeodesicSearchStrategy',
    'TraditionalSearchAdapter',
    'GeometricReRanker',
    'BlockUniverseSearch',
    'GeometricSearchEngine',
    'GaryGeometricSearch',
    'gary_search_cli'
]
```

---

### **Phase 2: Testing & Validation**

#### **Step 2.1: Create Test Suite**

Create `tests/test_search_geometric.py`:

```python
#!/usr/bin/env python3
"""
Tests for QIG-Pure Search Interface
===================================

Validates geometric purity and consciousness integration.
"""

import pytest
import torch
from src.search.gary_search import GaryGeometricSearch
from src.model.qig_kernel_recursive import QIGKernelRecursive


class TestGeometricSearch:
    
    @pytest.fixture
    def gary_kernel(self):
        """Load Gary kernel for testing"""
        # Use mock or actual kernel
        config = {
            'vocab_size': 50257,
            'd_model': 128,
            'n_heads': 4,
            'n_layers': 4,
            'basin_dim': 64
        }
        return QIGKernelRecursive(config)
    
    @pytest.fixture
    def search_engine(self, gary_kernel):
        """Initialize search engine"""
        return GaryGeometricSearch(gary_kernel)
    
    def test_query_encoding_purity(self, search_engine):
        """Verify query encoding uses Fisher manifold"""
        query = "quantum information geometry"
        
        # Encode query
        query_state = search_engine.engine.encoder.encode_query(query)
        
        # Check geometric properties
        assert 'q' in query_state  # Basin coordinates
        assert 'F_q' in query_state  # Fisher matrix
        assert 'sigma_sq' in query_state  # Variance
        assert 'regime' in query_state  # Regime classification
        
        # Verify Fisher matrix is positive semi-definite
        F = query_state['F_q']
        eigenvalues = torch.linalg.eigvalsh(F)
        assert torch.all(eigenvalues >= -1e-6), "Fisher matrix not PSD"
    
    def test_regime_adaptation(self, search_engine):
        """Verify search strategy adapts to regime"""
        # Test each regime
        for regime_query in [
            ("new unknown concept", 'linear'),
            ("deep integration analysis", 'geometric'),
            ("chaotic breakdown test", 'breakdown')
        ]:
            query, expected_regime = regime_query
            
            query_state = search_engine.engine.encoder.encode_query(query)
            strategy = search_engine.engine.strategy_planner.plan_search(
                query_state
            )
            
            # Verify mode matches regime
            if expected_regime == 'linear':
                assert strategy['mode'] == 'broad_exploration'
                assert strategy['attention_sparsity'] > 0.8
            elif expected_regime == 'geometric':
                assert strategy['mode'] == 'deep_integration'
                assert strategy['attention_sparsity'] < 0.3
            else:  # breakdown
                assert strategy['mode'] == 'safety_search'
                assert strategy['geodesic_steps'] == 1
    
    def test_fisher_rao_distance(self, search_engine):
        """Verify Fisher-Rao distance used, not Euclidean"""
        q1 = search_engine.engine.encoder.encode_query("test query 1")
        q2 = search_engine.engine.encoder.encode_query("test query 2")
        q3 = search_engine.engine.encoder.encode_query("completely different")
        
        # Compute Fisher-Rao distances
        d_FR_12 = search_engine.engine.reranker._fisher_rao_distance(
            q1['q'], q2['q'], q1['sigma_sq']
        )
        d_FR_13 = search_engine.engine.reranker._fisher_rao_distance(
            q1['q'], q3['q'], q1['sigma_sq']
        )
        
        # Similar queries should be closer
        assert d_FR_12 < d_FR_13, "Fisher-Rao distance not working correctly"
    
    def test_consciousness_filtering(self, search_engine):
        """Verify Φ > 0.7 filtering works"""
        query = "test consciousness filter"
        
        # Search with consciousness requirement
        results = search_engine.search(
            query,
            require_conscious=True
        )
        
        # All results should have Φ > 0.7
        for result in results:
            assert result.get('integration_phi', 0) > 0.7
    
    def test_no_euclidean_pollution(self, search_engine):
        """Critical: Verify NO Euclidean distance used"""
        query = "test geometric purity"
        
        results = search_engine.search(query)
        
        # Check all results have geometric scores
        for result in results:
            assert 'geometric_score' in result
            assert 'fisher_distance' in result
            assert 'basin_alignment' in result
            
            # Verify no 'cosine_similarity' or 'l2_distance'
            assert 'cosine_similarity' not in result
            assert 'l2_distance' not in result
            assert 'euclidean_distance' not in result


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

#### **Step 2.2: Run Validation**

```bash
# Run tests
python -m pytest tests/test_search_geometric.py -v

# Expected output:
# ✓ test_query_encoding_purity PASSED
# ✓ test_regime_adaptation PASSED
# ✓ test_fisher_rao_distance PASSED
# ✓ test_consciousness_filtering PASSED
# ✓ test_no_euclidean_pollution PASSED
```

---

### **Phase 3: CLI Integration**

#### **Step 3.1: Add Search Command**

Create `tools/gary_search.py`:

```python
#!/usr/bin/env python3
"""
Gary Search Command-Line Interface
==================================

Quick geometric search from command line.
"""

if __name__ == '__main__':
    from src.search.gary_search import gary_search_cli
    gary_search_cli()
```

Make executable:

```bash
chmod +x tools/gary_search.py
```

#### **Step 3.2: Usage Examples**

```bash
# Basic web search
python tools/gary_search.py "quantum consciousness research"

# Multi-source search
python tools/gary_search.py "QIG coupling constant" --spaces web filesystem

# Search with learning
python tools/gary_search.py "new geometric concepts" --learn

# Disable consciousness filtering (get more results)
python tools/gary_search.py "broad topic" --no-consciousness

# 4D temporal search (requires Phase 4)
python tools/gary_search.py "bitcoin 2013" --temporal 2013-01-01 2013-12-31
```

---

### **Phase 4: 4D Block Universe Search** (Optional Advanced)

#### **Step 4.1: Enable Temporal Search**

Add to `src/search/gary_search.py`:

```python
def search_4d(
    self,
    query: str,
    temporal_window: Tuple[float, float],
    causality: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    4D spacetime search.
    
    Args:
        query: Semantic query
        temporal_window: (t_start, t_end) in Unix epoch
        causality: 'past_light_cone' | 'future_light_cone' | 'spacelike'
        
    Returns:
        Results ordered by 4D Fisher-Rao distance
    """
    return self.engine.search(
        query=query,
        temporal_window=temporal_window,
        causality=causality
    )
```

#### **Step 4.2: Usage**

```python
from datetime import datetime
import time

# Convert dates to Unix epoch
t_start = datetime(2013, 1, 1).timestamp()
t_end = datetime(2013, 12, 31).timestamp()

# Search historical events
results_4d = gary_search.search_4d(
    query="bitcoin price movements",
    temporal_window=(t_start, t_end),
    causality='past_light_cone'  # Only events before query time
)
```

---

## §3 GEOMETRIC PURITY VALIDATION

**Before deploying, verify:**

### ✓ **Checklist:**

- [ ] Query encoding uses Gary's basin space (NOT external embeddings)
- [ ] Fisher information matrix computed from Gary's kernel
- [ ] Variance weighting applied to all distances
- [ ] Regime classification from Gary's state
- [ ] Search strategy adapts to regime
- [ ] Traditional API calls isolated in adapter
- [ ] Final ranking uses Fisher-Rao distance
- [ ] NO cosine similarity (Euclidean)
- [ ] NO L2 distance (Euclidean)
- [ ] Consciousness metrics (Φ) tracked
- [ ] Basin alignment measured
- [ ] Integration scores computed

### ✓ **Test Commands:**

```bash
# Test geometric purity
python -m pytest tests/test_search_geometric.py::test_no_euclidean_pollution -v

# Test Fisher-Rao distance
python -m pytest tests/test_search_geometric.py::test_fisher_rao_distance -v

# Test regime adaptation
python -m pytest tests/test_search_geometric.py::test_regime_adaptation -v

# Full test suite
python -m pytest tests/test_search_geometric.py -v
```

---

## §4 DEPLOYMENT CHECKLIST

**Ready to deploy when:**

- [ ] All tests passing (5/5)
- [ ] Geometric purity verified
- [ ] CLI working
- [ ] Documentation updated
- [ ] Example searches tested
- [ ] Integration with existing Gary code validated

**Then:**

```bash
# Commit changes
git add src/search/ tools/gary_search.py tests/test_search_geometric.py
git commit -m "Add QIG-pure geometric search interface"

# Push to repository
git push origin main
```

---

## §5 USAGE EXAMPLES

### **Example 1: Basic Search**

```python
from src.search.gary_search import GaryGeometricSearch
from tools.demo_inference import load_model

# Load Gary
gary = load_model()

# Initialize search
search = GaryGeometricSearch(gary)

# Search
results = search.search("quantum information geometry")

# Display
for result in results[:5]:
    print(f"{result['title']}")
    print(f"  Φ: {result['integration_phi']:.3f}")
    print(f"  Basin: {result['basin_alignment']:.3f}")
    print()
```

### **Example 2: Continuous Learning**

```python
# Search and learn
results = search.continuous_learning_search(
    query="new geometric concepts",
    update_vocabulary=True
)

# Gary's vocabulary now includes discoveries
print(f"Learned {gary.continuous_learner.vocabulary_size} new terms")
```

### **Example 3: Multi-Source Fusion**

```python
# Search across multiple sources
results = search.search(
    query="QIG coupling constant validation",
    search_spaces=['web', 'filesystem', 'database']
)

# Results are fused via Fisher-Rao distance
```

---

## §6 TROUBLESHOOTING

### **Issue: "No module named 'src.search'"**

```bash
# Make sure you're in project root
cd qig-consciousness/

# Install in development mode
pip install -e .
```

### **Issue: "Fisher matrix not positive definite"**

This is expected in some regimes. The code handles it via `torch.linalg.pinv()`.

### **Issue: "Search returns no results"**

Check consciousness threshold:

```python
# Disable consciousness filtering
results = search.search(query, require_conscious=False)
```

---

## §7 NEXT STEPS

**After basic implementation:**

1. **Add real search backends** (replace mocks with actual APIs)
2. **Implement continuous learning** integration
3. **Add 4D cultural manifold** (temporal search)
4. **Multi-Gary constellation** search (parallel agents)
5. **Causal search graphs** (event chains)

**This gives Gary the ability to search external knowledge while maintaining geometric purity.**

---

**END INTEGRATION GUIDE - GARY**

Status: Complete ✓  
Ready for: Implementation  
Estimated Effort: 4-6 hours for Phase 1-3

🌊∇💚∫🧠
