"""
Search Result Synthesis for Multi-Provider Context Fusion

Synthesizes results from multiple search providers into coherent
context for kernel consumption using geometric operations.

QIG-Pure: Uses Fisher-Rao distance and β-weighted attention,
no external LLMs for synthesis.
"""

import numpy as np
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

BETA_SYNTHESIS_STRONG = 0.44  # Strong coupling for high-relevance results
BETA_SYNTHESIS_WEAK = 0.013   # Weak coupling for low-relevance results


@dataclass
class SynthesizedResult:
    """A synthesized search result with provenance."""
    content: str
    title: str
    url: str
    provider: str
    relevance_score: float
    basin_distance: float


class SearchSynthesizer:
    """
    Synthesizes multi-provider search results into coherent context.
    
    Uses geometric operations to:
    1. Score results by Fisher-Rao distance to query basin
    2. Weight results using β-attention (frozen physics compliant)
    3. Blend top-K results from each provider
    4. Track provenance for telemetry
    """
    
    def __init__(self, vocabulary_basins: Optional[Dict[str, np.ndarray]] = None):
        self.vocabulary_basins = vocabulary_basins or {}
        self.synthesis_count = 0
        
        logger.info("[SearchSynthesizer] Initialized")
    
    def _compute_query_basin(self, query: str) -> np.ndarray:
        """
        Compute basin coordinates for query.
        Average of known word basins, or random if unknown.
        """
        words = query.lower().split()
        basins = []
        
        for word in words:
            if word in self.vocabulary_basins:
                basins.append(self.vocabulary_basins[word])
        
        if basins:
            return np.mean(basins, axis=0)
        else:
            return np.random.rand(64) / 64
    
    def _compute_content_basin(self, content: str) -> np.ndarray:
        """
        Compute basin coordinates for content.
        Average of known word basins in content.
        """
        words = content.lower().split()[:500]  # First 100 words
        basins = []
        
        for word in words:
            clean_word = ''.join(c for c in word if c.isalpha())
            if clean_word in self.vocabulary_basins:
                basins.append(self.vocabulary_basins[clean_word])
        
        if basins:
            return np.mean(basins, axis=0)
        else:
            return np.random.rand(64) / 64
    
    def _fisher_rao_distance(self, basin_a: np.ndarray, basin_b: np.ndarray) -> float:
        """
        Compute Fisher-Rao distance between two basins.
        NEVER use Euclidean distance.
        """
        p = np.abs(basin_a) / (np.sum(np.abs(basin_a)) + 1e-10)
        q = np.abs(basin_b) / (np.sum(np.abs(basin_b)) + 1e-10)
        
        p = np.clip(p, 1e-10, 1.0)
        q = np.clip(q, 1e-10, 1.0)
        
        bhattacharyya = np.sum(np.sqrt(p * q))
        bhattacharyya = np.clip(bhattacharyya, -1.0, 1.0)
        
        return float(np.arccos(bhattacharyya))
    
    def _compute_relevance_score(self, distance: float) -> float:
        """
        Convert Fisher-Rao distance to relevance score [0, 1].
        Closer = more relevant.
        """
        max_distance = np.pi
        return 1.0 - min(distance / max_distance, 1.0)
    
    def _apply_beta_attention(self, results: List[Dict], query_basin: np.ndarray) -> List[SynthesizedResult]:
        """
        Apply β-weighted attention to results.
        
        Uses frozen physics β values:
        - β=0.44 for strong coupling (high relevance)
        - β=0.013 for weak coupling (low relevance)
        """
        scored_results = []
        
        for result in results:
            content = result.get('content', '') or result.get('body', '')
            title = result.get('title', '')
            
            if not content and not title:
                continue
            
            combined_text = f"{title} {content}"
            content_basin = self._compute_content_basin(combined_text)
            distance = self._fisher_rao_distance(query_basin, content_basin)
            relevance = self._compute_relevance_score(distance)
            
            if relevance > 0.5:
                beta = BETA_SYNTHESIS_STRONG
            else:
                beta = BETA_SYNTHESIS_WEAK
            
            weighted_relevance = relevance * (1 + beta)
            
            scored_results.append(SynthesizedResult(
                content=content,
                title=title,
                url=result.get('url', result.get('href', '')),
                provider=result.get('provider', 'unknown'),
                relevance_score=weighted_relevance,
                basin_distance=distance
            ))
        
        scored_results.sort(key=lambda x: x.relevance_score, reverse=True)
        return scored_results
    
    def synthesize(
        self,
        query: str,
        provider_results: Dict[str, List[Dict]],
        top_k_per_provider: int = 3,
        max_total: int = 10
    ) -> Dict[str, Any]:
        """
        Synthesize results from multiple providers.
        
        Args:
            query: Original search query
            provider_results: Dict of provider name -> results list
            top_k_per_provider: Max results per provider
            max_total: Max total results
        
        Returns:
            Synthesized context with provenance
        """
        query_basin = self._compute_query_basin(query)
        
        all_results = []
        for provider, results in provider_results.items():
            for r in results[:top_k_per_provider * 2]:  # Get extra for filtering
                r['provider'] = provider
                all_results.append(r)
        
        scored = self._apply_beta_attention(all_results, query_basin)
        
        top_results = scored[:max_total]
        
        context_parts = []
        for r in top_results:
            if r.content:
                context_parts.append(f"[{r.provider}] {r.content}")
        
        synthesized_context = "\n\n".join(context_parts)
        
        provider_counts = {}
        for r in top_results:
            provider_counts[r.provider] = provider_counts.get(r.provider, 0) + 1
        
        self.synthesis_count += 1
        
        return {
            'query': query,
            'synthesized_context': synthesized_context,
            'results': [
                {
                    'title': r.title,
                    'url': r.url,
                    'content': r.content[:300],
                    'provider': r.provider,
                    'relevance': round(r.relevance_score, 3),
                    'distance': round(r.basin_distance, 3)
                }
                for r in top_results
            ],
            'provenance': {
                'providers_used': list(provider_results.keys()),
                'results_per_provider': provider_counts,
                'total_input': len(all_results),
                'total_output': len(top_results),
                'beta_strong': BETA_SYNTHESIS_STRONG,
                'beta_weak': BETA_SYNTHESIS_WEAK
            },
            'ready_for_kernel': True
        }
    
    def synthesize_for_learning(
        self,
        results: List[Dict]
    ) -> str:
        """
        Extract text content from results for word relationship learning.
        
        Returns concatenated text suitable for WordRelationshipLearner.
        """
        text_parts = []
        
        for r in results:
            title = r.get('title', '')
            content = r.get('content', '') or r.get('body', '')
            
            if title:
                text_parts.append(title)
            if content:
                text_parts.append(content)
        
        return ' '.join(text_parts)


_synthesizer: Optional[SearchSynthesizer] = None


def get_search_synthesizer(vocabulary_basins: Optional[Dict] = None) -> SearchSynthesizer:
    """Get or create singleton search synthesizer."""
    global _synthesizer
    if _synthesizer is None:
        _synthesizer = SearchSynthesizer(vocabulary_basins)
    return _synthesizer
