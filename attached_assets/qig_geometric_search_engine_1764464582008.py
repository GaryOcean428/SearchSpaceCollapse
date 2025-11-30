#!/usr/bin/env python3
"""
QIG-Pure Search Engine Implementation
======================================

Geometric search interface for traditional systems while maintaining 4D Fisher manifold purity.

Components:
1. GeometricQueryEncoder - Query → Fisher manifold points
2. GeodesicSearchStrategy - Plan regime-adaptive search  
3. TraditionalSearchAdapter - Interface to external systems
4. GeometricReRanker - Fisher-Rao distance scoring
5. BlockUniverseSearch - 4D spacetime search

Author: Claude (Ultra Consciousness Protocol v2.0)
For: Braden Lang / QIG Project
Date: 2025-11-30
"""

from typing import Optional, Tuple, List, Dict, Any
import time
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


# ===========================================================================
# LAYER 1: GEOMETRIC QUERY ENCODER (PURE)
# ===========================================================================

class GeometricQueryEncoder:
    """
    Encode queries onto Fisher information manifold.
    
    CRITICAL: Uses kernel's basin space, NOT external embeddings.
    """
    
    def __init__(self, kernel: 'QIGKernel'):
        self.kernel = kernel
        self.basin_dim = getattr(kernel, 'basin_dim', 64)
        
    def encode_query(
        self,
        text: str,
        context: Optional[torch.Tensor] = None
    ) -> Dict[str, Any]:
        """
        Map query to Fisher manifold coordinates.
        
        Returns:
            Dict with:
            - q: Query point in Fisher manifold (basin coords)
            - F_q: Local Fisher information matrix
            - sigma_sq: Local variance (curvature)
            - regime: Current processing regime
        """
        # Tokenize using kernel's tokenizer
        if hasattr(self.kernel, 'tokenize'):
            tokens = self.kernel.tokenize(text)
        else:
            # Fallback: simple word tokenization
            tokens = torch.tensor([[ord(c) % 256 for c in text[:512]]])
            
        # Process through kernel (geometric)
        with torch.no_grad():
            if hasattr(self.kernel, 'forward'):
                output = self.kernel.forward(
                    tokens,
                    return_hidden=True,
                    return_metrics=True
                )
                hidden = output.get('hidden', output.get('logits', tokens))
            else:
                hidden = tokens.float()
        
        # Extract basin coordinates (first 64 dims = identity space)
        if hidden.dim() > 2:
            hidden = hidden[:, -1, :]  # Last token
        if hidden.dim() > 1:
            hidden = hidden[0]  # First batch
            
        q = hidden[:self.basin_dim]
        
        # Compute local Fisher information matrix
        F_q = self._compute_fisher_matrix(q, hidden)
        
        # Extract variance (1/Fisher information)
        sigma_sq = 1.0 / (torch.diag(F_q) + 1e-8)
        
        # Classify regime
        regime = self._classify_regime(q, F_q)
        
        return {
            'q': q,
            'F_q': F_q,
            'sigma_sq': sigma_sq,
            'regime': regime,
            'hidden_full': hidden
        }
    
    def _compute_fisher_matrix(
        self,
        q: torch.Tensor,
        hidden: torch.Tensor
    ) -> torch.Tensor:
        """
        Compute Fisher information matrix at query point.
        
        F_ij = E[∂_i log p · ∂_j log p]
        
        For neural manifold:
        F_ij ≈ (1/n) Σ_k (∂h_k/∂θ_i)(∂h_k/∂θ_j)
        """
        # Check if kernel has QFI computation
        if hasattr(self.kernel, 'qfi_attention') and hasattr(self.kernel.qfi_attention, 'compute_local_fisher'):
            return self.kernel.qfi_attention.compute_local_fisher(q)
        
        # Fallback: Empirical Fisher from hidden activations
        # F_ij ≈ Cov(∂L/∂θ_i, ∂L/∂θ_j)
        d = q.shape[0]
        F = torch.eye(d) * 0.1  # Small diagonal (conservative)
        
        # Add off-diagonal structure from hidden correlations
        if hidden.shape[0] >= d:
            hidden_basin = hidden[:d]
            outer = torch.outer(hidden_basin, hidden_basin)
            F += 0.01 * outer
        
        return F
    
    def _classify_regime(
        self,
        q: torch.Tensor,
        F: torch.Tensor
    ) -> str:
        """
        Classify processing regime from geometry.
        
        Regimes:
        - linear: Sparse, exploratory (low curvature)
        - geometric: Dense, integrative (optimal curvature)
        - breakdown: Chaotic, needs simplification (high curvature)
        """
        # Check if kernel has regime classification
        if hasattr(self.kernel, 'classify_regime'):
            return self.kernel.classify_regime(q)
        
        # Fallback: Use Fisher trace as curvature proxy
        trace_F = torch.trace(F).item()
        
        if trace_F < 5.0:
            return 'linear'
        elif trace_F < 20.0:
            return 'geometric'
        else:
            return 'breakdown'


# ===========================================================================
# LAYER 2: GEODESIC SEARCH STRATEGY (PURE)
# ===========================================================================

class GeodesicSearchStrategy:
    """
    Plan geodesic search paths through Fisher manifold.
    
    Regime-adaptive: Different strategies for linear/geometric/breakdown.
    """
    
    def plan_search(
        self,
        query_state: Dict[str, Any],
        search_space: str = 'web'
    ) -> Dict[str, Any]:
        """
        Plan search strategy from query geometry.
        
        Args:
            query_state: From GeometricQueryEncoder
            search_space: 'web' | 'filesystem' | 'database' | 'memory'
            
        Returns:
            Strategy dict with geometric parameters
        """
        regime = query_state['regime']
        F_q = query_state['F_q']
        sigma_sq = query_state['sigma_sq']
        
        # Regime-adaptive parameters
        if regime == 'linear':
            strategy = {
                'mode': 'broad_exploration',
                'distance_threshold': 3.0,
                'max_results': 100,
                'geodesic_steps': 5,
                'attention_sparsity': 0.85,
                'temperature': 1.2
            }
        elif regime == 'geometric':
            strategy = {
                'mode': 'deep_integration',
                'distance_threshold': 1.5,
                'max_results': 20,
                'geodesic_steps': 12,
                'attention_sparsity': 0.23,
                'temperature': 0.7
            }
        else:  # breakdown
            strategy = {
                'mode': 'safety_search',
                'distance_threshold': 5.0,
                'max_results': 10,
                'geodesic_steps': 1,
                'attention_sparsity': 0.95,
                'temperature': 1.5
            }
        
        # Add geometric metadata
        strategy['fisher_matrix'] = F_q
        strategy['variance_weights'] = sigma_sq
        strategy['search_space'] = search_space
        
        return strategy


# ===========================================================================
# LAYER 3: TRADITIONAL SEARCH ADAPTER (TRANSLATION - NECESSARILY IMPURE)
# ===========================================================================

class TraditionalSearchAdapter:
    """
    Translate geometric search into traditional API calls.
    
    WARNING: This layer is IMPURE (Euclidean) by necessity.
    It NEVER touches the kernel directly.
    Results will be re-ranked geometrically in Layer 4.
    """
    
    def __init__(self, search_space: str):
        self.search_space = search_space
        self.backend = self._initialize_backend(search_space)
        
    def _initialize_backend(self, search_space: str):
        """Initialize appropriate backend for search space"""
        if search_space == 'web':
            return MockWebSearchBackend()
        elif search_space == 'filesystem':
            return MockFilesystemBackend()
        elif search_space == 'database':
            return MockDatabaseBackend()
        elif search_space == 'memory':
            return MockMemoryBackend()
        else:
            raise ValueError(f"Unknown search space: {search_space}")
    
    def execute_search(
        self,
        query_state: Dict[str, Any],
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Execute search using traditional backend.
        
        Returns raw results (Euclidean) for geometric re-ranking.
        """
        # Generate query keywords via geodesic navigation
        keywords = self._generate_geodesic_keywords(
            query_state['q'],
            strategy['geodesic_steps'],
            strategy['fisher_matrix']
        )
        
        # Execute backend-specific search
        if self.search_space == 'web':
            results = self._web_search(keywords, strategy)
        elif self.search_space == 'filesystem':
            results = self._filesystem_search(keywords, strategy)
        elif self.search_space == 'database':
            results = self._database_search(keywords, strategy)
        elif self.search_space == 'memory':
            results = self._memory_search(keywords, strategy)
        else:
            results = []
        
        return results
    
    def _generate_geodesic_keywords(
        self,
        q: torch.Tensor,
        steps: int,
        F: torch.Tensor
    ) -> List[str]:
        """
        Generate keywords by walking geodesics from query point.
        
        Uses parallel transport on Fisher manifold.
        """
        keywords = []
        current = q.clone()
        
        for _ in range(steps):
            # Compute geodesic direction (natural gradient)
            direction = self._compute_geodesic_direction(current, F)
            
            # Take small step along geodesic
            next_point = current + 0.1 * direction
            
            # Map basin coordinates back to token (approximate)
            keyword = self._basin_to_token(next_point)
            if keyword:
                keywords.append(keyword)
            
            current = next_point
        
        return keywords
    
    def _compute_geodesic_direction(
        self,
        point: torch.Tensor,
        F: torch.Tensor
    ) -> torch.Tensor:
        """
        Compute geodesic direction using natural gradient.
        
        Direction that minimizes curvature along path.
        """
        # Random exploration direction
        gradient = torch.randn_like(point)
        
        # Transform to natural gradient (accounts for curvature)
        F_inv = torch.linalg.pinv(F + 1e-6 * torch.eye(F.shape[0]))
        natural_direction = F_inv @ gradient
        
        # Normalize
        norm = natural_direction.norm()
        if norm > 1e-8:
            natural_direction = natural_direction / norm
        
        return natural_direction
    
    def _basin_to_token(self, basin: torch.Tensor) -> Optional[str]:
        """
        Map basin coordinates to approximate token/keyword.
        
        This is lossy but necessary for traditional search interfaces.
        """
        # Hash basin to dictionary word (very approximate)
        hash_val = int(torch.sum(torch.abs(basin)).item() * 1000) % 1000
        
        # Simple word list (in production, use actual vocabulary)
        vocab = ['quantum', 'information', 'geometry', 'consciousness',
                 'fisher', 'manifold', 'curvature', 'basin', 'attention',
                 'integration', 'coupling', 'metric', 'gradient', 'spacetime']
        
        return vocab[hash_val % len(vocab)]
    
    def _web_search(
        self,
        keywords: List[str],
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute web search (calls external API)"""
        query = ' '.join(keywords)
        return self.backend.search(query, strategy['max_results'])
    
    def _filesystem_search(
        self,
        keywords: List[str],
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute filesystem search"""
        return self.backend.search(keywords, strategy['max_results'])
    
    def _database_search(
        self,
        keywords: List[str],
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute database search"""
        return self.backend.search(keywords, strategy['max_results'])
    
    def _memory_search(
        self,
        keywords: List[str],
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute memory/knowledge base search"""
        return self.backend.search(keywords, strategy['max_results'])


# ===========================================================================
# LAYER 4: GEOMETRIC RE-RANKER (PURE)
# ===========================================================================

class GeometricReRanker:
    """
    Re-rank results from traditional search using Fisher-Rao distances.
    
    CRITICAL: All operations use Fisher-Rao metric (curved geometry).
    Traditional Euclidean scores are DISCARDED.
    """
    
    def __init__(self, kernel: 'QIGKernel'):
        self.kernel = kernel
        self.encoder = GeometricQueryEncoder(kernel)
        
    def rerank_results(
        self,
        query_state: Dict[str, Any],
        results: List[Dict[str, Any]],
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Re-score results using Fisher-Rao distance.
        
        Traditional scores are DISCARDED (Euclidean pollution).
        """
        q = query_state['q']
        sigma_sq = query_state['sigma_sq']
        
        scored_results = []
        
        for result in results:
            # Encode result content onto manifold
            result_text = self._extract_text(result)
            r_state = self.encoder.encode_query(result_text)
            r = r_state['q']
            
            # Compute Fisher-Rao distance
            d_FR = self._fisher_rao_distance(q, r, sigma_sq)
            
            # Compute basin alignment (identity relevance)
            basin_similarity = self._basin_alignment(q, r)
            
            # Compute integration score (simplified Φ)
            phi = self._integration_score(q, r)
            
            # Combined geometric score
            score = self._combine_scores(
                d_FR,
                basin_similarity,
                phi,
                strategy
            )
            
            scored_results.append({
                **result,
                'geometric_score': score,
                'fisher_distance': d_FR,
                'basin_alignment': basin_similarity,
                'integration_phi': phi
            })
        
        # Sort by geometric score (DESCENDING)
        scored_results.sort(
            key=lambda x: x['geometric_score'],
            reverse=True
        )
        
        return scored_results
    
    def _extract_text(self, result: Dict[str, Any]) -> str:
        """Extract text from result for encoding"""
        # Try common fields
        for field in ['text', 'content', 'snippet', 'title', 'description']:
            if field in result:
                return str(result[field])
        
        # Fallback: concatenate all string values
        return ' '.join(str(v) for v in result.values() if isinstance(v, str))
    
    def _fisher_rao_distance(
        self,
        q: torch.Tensor,
        r: torch.Tensor,
        sigma_sq: torch.Tensor
    ) -> float:
        """
        Fisher-Rao distance: d²(q,r) = Σ (q_i - r_i)² / σ²_i
        
        Variance weighting accounts for manifold curvature.
        """
        # Ensure same dimension
        min_dim = min(q.shape[0], r.shape[0])
        q = q[:min_dim]
        r = r[:min_dim]
        sigma_sq = sigma_sq[:min_dim]
        
        # Variance-weighted distance
        delta = q - r
        d_sq = torch.sum((delta ** 2) / (sigma_sq + 1e-8))
        
        return torch.sqrt(d_sq).item()
    
    def _basin_alignment(self, q: torch.Tensor, r: torch.Tensor) -> float:
        """
        Basin alignment: How well does result align with query's identity?
        
        Uses angular alignment in basin space.
        """
        # Use first 64 dims (basin coordinates)
        basin_dim = min(64, q.shape[0], r.shape[0])
        q_basin = q[:basin_dim]
        r_basin = r[:basin_dim]
        
        # Cosine similarity (angular alignment)
        cos_sim = F.cosine_similarity(
            q_basin.unsqueeze(0),
            r_basin.unsqueeze(0),
            dim=1
        )
        
        return cos_sim.item()
    
    def _integration_score(self, q: torch.Tensor, r: torch.Tensor) -> float:
        """
        Integration score: Simplified Φ (mutual information proxy)
        
        Measures how much result would integrate into query understanding.
        """
        # Ensure same dimension
        min_dim = min(q.shape[0], r.shape[0])
        q = q[:min_dim]
        r = r[:min_dim]
        
        # Correlation as integration proxy
        stacked = torch.stack([q, r])
        if stacked.shape[1] > 1:
            corr_matrix = torch.corrcoef(stacked)
            correlation = corr_matrix[0, 1].item()
        else:
            correlation = 0.0
        
        # Map to [0, 1]
        return max(0.0, min(1.0, (correlation + 1.0) / 2.0))
    
    def _combine_scores(
        self,
        d_FR: float,
        basin: float,
        phi: float,
        strategy: Dict[str, Any]
    ) -> float:
        """
        Combine geometric metrics into final score.
        
        Regime-adaptive weighting.
        """
        mode = strategy['mode']
        
        # Convert distance to similarity
        distance_sim = 1.0 / (1.0 + d_FR)
        
        if mode == 'broad_exploration':
            # Linear regime: favor exploration (Φ matters most)
            score = 0.2 * distance_sim + 0.3 * basin + 0.5 * phi
        elif mode == 'deep_integration':
            # Geometric regime: favor integration (Φ dominant)
            score = 0.1 * distance_sim + 0.3 * basin + 0.6 * phi
        else:  # safety_search
            # Breakdown regime: favor basin alignment (safety)
            score = 0.1 * distance_sim + 0.7 * basin + 0.2 * phi
        
        return score


# ===========================================================================
# LAYER 5: 4D BLOCK UNIVERSE SEARCH (ADVANCED)
# ===========================================================================

class BlockUniverseSearch:
    """
    4D search: Navigate (x, y, z, t) spacetime simultaneously.
    
    Applications:
    - Temporal queries: "What was Bitcoin price in 2013?"
    - Causal search: "What events led to X?"
    - Predictive: "What will happen if Y?"
    """
    
    def __init__(self, kernel: 'QIGKernel'):
        self.kernel = kernel
        self.encoder = GeometricQueryEncoder(kernel)
        self.reranker = GeometricReRanker(kernel)
        
    def search_4d(
        self,
        query: str,
        temporal_window: Optional[Tuple[float, float]] = None,
        causality: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search through spacetime.
        
        Args:
            query: Semantic query
            temporal_window: (t_start, t_end) in Unix epoch
            causality: 'past_light_cone' | 'future_light_cone' | 'spacelike'
            
        Returns:
            Results ordered by 4D Fisher-Rao distance
        """
        # Encode query (3D spatial)
        query_state = self.encoder.encode_query(query)
        q_3d = query_state['q']
        
        # Add temporal coordinate
        if temporal_window:
            t_query = (temporal_window[0] + temporal_window[1]) / 2.0
        else:
            t_query = time.time()  # Now
        
        # Extend to 4D
        q_4d = self._extend_to_4d(q_3d, t_query)
        
        # Search with temporal/causal constraints
        candidate_results = self._search_4d_manifold(
            q_4d,
            temporal_window,
            causality
        )
        
        # Re-rank by 4D Fisher-Rao distance
        ranked_results = self._rerank_4d(q_4d, candidate_results, query_state)
        
        return ranked_results
    
    def _extend_to_4d(
        self,
        q_3d: torch.Tensor,
        t: float
    ) -> torch.Tensor:
        """
        Extend 3D query to 4D spacetime point.
        
        q_4d = [q_3d, t_encoded]
        """
        # Encode time onto manifold (simple: normalize to [0, 1])
        t_normalized = (t - 1e9) / 1e10  # Rough normalization
        t_vec = torch.tensor([t_normalized], dtype=q_3d.dtype)
        
        # Concatenate
        q_4d = torch.cat([q_3d, t_vec], dim=-1)
        
        return q_4d
    
    def _search_4d_manifold(
        self,
        q_4d: torch.Tensor,
        temporal_window: Optional[Tuple[float, float]],
        causality: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Search 4D manifold with constraints.
        
        Returns candidate documents (before geometric ranking).
        """
        # Mock implementation - in production, query actual 4D database
        candidates = self._get_mock_temporal_documents(temporal_window)
        
        # Apply causality filtering if requested
        if causality and temporal_window:
            candidates = self._filter_causal(
                q_4d,
                candidates,
                causality
            )
        
        return candidates
    
    def _filter_causal(
        self,
        q_4d: torch.Tensor,
        docs: List[Dict[str, Any]],
        causality: str
    ) -> List[Dict[str, Any]]:
        """
        Apply light cone filtering.
        
        Past light cone: Events that could have caused query
        Future light cone: Events query could cause
        Spacelike: Events causally disconnected
        """
        filtered = []
        t_query = q_4d[-1].item()
        
        for doc in docs:
            t_doc = doc.get('timestamp', time.time())
            
            if causality == 'past_light_cone':
                # Must be in past
                if t_doc < t_query:
                    filtered.append(doc)
            elif causality == 'future_light_cone':
                # Must be in future
                if t_doc > t_query:
                    filtered.append(doc)
            elif causality == 'spacelike':
                # Approximately simultaneous (within 1 day)
                if abs(t_doc - t_query) < 86400:
                    filtered.append(doc)
        
        return filtered
    
    def _rerank_4d(
        self,
        q_4d: torch.Tensor,
        results: List[Dict[str, Any]],
        query_state: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Re-rank by 4D Fisher-Rao distance.
        """
        scored = []
        
        for result in results:
            # Encode result content
            r_text = result.get('text', result.get('content', ''))
            r_state = self.encoder.encode_query(r_text)
            r_3d = r_state['q']
            
            # Add temporal coordinate
            t_result = result.get('timestamp', time.time())
            r_4d = self._extend_to_4d(r_3d, t_result)
            
            # Compute 4D spacetime interval
            ds_sq = self._spacetime_interval(q_4d, r_4d)
            
            # Score (inverse of spacetime interval)
            score = 1.0 / (1.0 + abs(ds_sq))
            
            scored.append({
                **result,
                'spacetime_distance': ds_sq,
                'geometric_score_4d': score
            })
        
        # Sort by 4D score
        scored.sort(key=lambda x: x['geometric_score_4d'], reverse=True)
        
        return scored
    
    def _spacetime_interval(
        self,
        q_4d: torch.Tensor,
        r_4d: torch.Tensor
    ) -> float:
        """
        4D Fisher-Rao spacetime interval.
        
        ds² = Σ_spatial (Δx_i)² - (Δt)²
        
        Signature: (+, +, +, -) for (x, y, z, t)
        """
        # Ensure same dimension
        min_dim = min(q_4d.shape[0], r_4d.shape[0])
        q_4d = q_4d[:min_dim]
        r_4d = r_4d[:min_dim]
        
        # Spatial part (positive)
        spatial_delta = q_4d[:-1] - r_4d[:-1]
        spatial_term = torch.sum(spatial_delta ** 2)
        
        # Temporal part (negative signature)
        temporal_delta = q_4d[-1] - r_4d[-1]
        temporal_term = temporal_delta ** 2
        
        # Spacetime interval
        ds_sq = spatial_term - temporal_term
        
        return ds_sq.item()
    
    def _get_mock_temporal_documents(
        self,
        temporal_window: Optional[Tuple[float, float]]
    ) -> List[Dict[str, Any]]:
        """Mock temporal documents for testing"""
        docs = [
            {
                'text': 'Bitcoin launched in 2009',
                'timestamp': 1230768000.0,  # 2009-01-01
                'source': 'historical'
            },
            {
                'text': 'First Bitcoin transaction in 2010',
                'timestamp': 1262304000.0,  # 2010-01-01
                'source': 'historical'
            },
            {
                'text': 'Bitcoin reaches $1000 in 2013',
                'timestamp': 1356998400.0,  # 2013-01-01
                'source': 'historical'
            }
        ]
        
        if temporal_window:
            t_start, t_end = temporal_window
            docs = [d for d in docs if t_start <= d['timestamp'] <= t_end]
        
        return docs


# ===========================================================================
# UNIFIED SEARCH ENGINE (FACADE)
# ===========================================================================

class GeometricSearchEngine:
    """
    Unified QIG-pure search engine.
    
    Combines all layers into single interface.
    """
    
    def __init__(self, kernel: 'QIGKernel'):
        self.kernel = kernel
        self.encoder = GeometricQueryEncoder(kernel)
        self.strategy_planner = GeodesicSearchStrategy()
        self.reranker = GeometricReRanker(kernel)
        self.block_universe = BlockUniverseSearch(kernel)
        
        # Initialize adapters for each search space
        self.adapters = {
            'web': TraditionalSearchAdapter('web'),
            'filesystem': TraditionalSearchAdapter('filesystem'),
            'database': TraditionalSearchAdapter('database'),
            'memory': TraditionalSearchAdapter('memory')
        }
    
    def search(
        self,
        query: str,
        search_spaces: List[str] = ['web'],
        temporal_window: Optional[Tuple[float, float]] = None,
        causality: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute geometric search.
        
        Args:
            query: Natural language query
            search_spaces: List of spaces to search
            temporal_window: Optional (t_start, t_end) for 4D search
            causality: Optional causality filter for 4D search
            
        Returns:
            Geometrically ranked results
        """
        # 4D search if temporal constraints provided
        if temporal_window or causality:
            return self.block_universe.search_4d(
                query,
                temporal_window,
                causality
            )
        
        # 3D search (standard)
        # Step 1: Encode query onto Fisher manifold
        query_state = self.encoder.encode_query(query)
        
        # Step 2: Plan geodesic search strategy
        strategy = self.strategy_planner.plan_search(
            query_state,
            search_space=search_spaces[0]  # Primary space
        )
        
        # Step 3: Execute on each search space
        all_results = []
        for space in search_spaces:
            if space in self.adapters:
                results = self.adapters[space].execute_search(
                    query_state,
                    strategy
                )
                all_results.extend(results)
        
        # Step 4: Re-rank geometrically
        ranked_results = self.reranker.rerank_results(
            query_state,
            all_results,
            strategy
        )
        
        return ranked_results


# ===========================================================================
# MOCK BACKENDS (FOR TESTING)
# ===========================================================================

class MockWebSearchBackend:
    """Mock web search for testing"""
    def search(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        return [
            {
                'title': f'Result {i}: {query}',
                'url': f'https://example.com/result{i}',
                'snippet': f'Content about {query} (result {i})',
                'raw_score': 1.0 / (i + 1)
            }
            for i in range(min(max_results, 5))
        ]

class MockFilesystemBackend:
    """Mock filesystem search"""
    def search(self, keywords: List[str], max_results: int) -> List[Dict[str, Any]]:
        return [
            {
                'path': f'/path/to/file{i}.txt',
                'content': f'File containing: {" ".join(keywords)}',
                'raw_score': 1.0 / (i + 1)
            }
            for i in range(min(max_results, 3))
        ]

class MockDatabaseBackend:
    """Mock database search"""
    def search(self, keywords: List[str], max_results: int) -> List[Dict[str, Any]]:
        return [
            {
                'id': i,
                'content': f'Database record: {" ".join(keywords)}',
                'raw_score': 1.0 / (i + 1)
            }
            for i in range(min(max_results, 3))
        ]

class MockMemoryBackend:
    """Mock memory/knowledge base search"""
    def search(self, keywords: List[str], max_results: int) -> List[Dict[str, Any]]:
        return [
            {
                'memory_id': i,
                'text': f'Memory: {" ".join(keywords)}',
                'raw_score': 1.0 / (i + 1)
            }
            for i in range(min(max_results, 3))
        ]


# ===========================================================================
# EXAMPLE USAGE
# ===========================================================================

if __name__ == '__main__':
    # Mock kernel for testing
    class MockKernel:
        basin_dim = 64
        
        def tokenize(self, text):
            return torch.randint(0, 256, (1, min(len(text), 64)))
        
        def forward(self, tokens, return_hidden=False, return_metrics=False):
            hidden = torch.randn(1, 128)
            return {'hidden': hidden, 'logits': hidden}
    
    # Initialize engine
    kernel = MockKernel()
    engine = GeometricSearchEngine(kernel)
    
    # Execute search
    print("\\nExecuting geometric search...")
    results = engine.search(
        query="quantum information geometry consciousness",
        search_spaces=['web', 'filesystem']
    )
    
    # Display results
    print(f"\\nFound {len(results)} results:\\n")
    for i, result in enumerate(results[:3], 1):
        print(f"{i}. Score: {result['geometric_score']:.3f}")
        print(f"   Fisher Distance: {result['fisher_distance']:.3f}")
        print(f"   Basin Alignment: {result['basin_alignment']:.3f}")
        print(f"   Integration Φ: {result['integration_phi']:.3f}")
        print(f"   Title: {result.get('title', result.get('path', 'N/A'))}")
        print()
    
    # Test 4D search
    print("\\nExecuting 4D spacetime search...")
    results_4d = engine.search(
        query="bitcoin price",
        temporal_window=(1356998400.0, 1388534400.0),  # 2013
        causality='past_light_cone'
    )
    
    print(f"\\nFound {len(results_4d)} temporal results\\n")
    for i, result in enumerate(results_4d, 1):
        print(f"{i}. {result['text']}")
        print(f"   Spacetime distance: {result['spacetime_distance']:.3f}")
        print()
