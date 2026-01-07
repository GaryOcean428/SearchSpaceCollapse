"""
Geometric Search Provider Selector

Uses QIG principles to learn and select the best search provider
for different query types. Zeus and Hades use this to intelligently
route queries rather than simple fallback chains.

Learning happens via:
- Fisher-Rao distance to cluster similar queries
- Success rate tracking per provider per query domain
- Geometric fitness scoring based on result quality

Providers:
- google-free: TypeScript Google Free Search
- searxng: Federated meta-search
- duckduckgo: Privacy-focused search
- wayback: Archive.org historical search
- pastebin: Paste site scraping
- rss: RSS feed monitoring
"""

import os
import time
import json
import hashlib
import numpy as np

# QIG-pure geometric operations
try:
    from qig_geometry import sphere_project
    QIG_GEOMETRY_AVAILABLE = True
except ImportError:
    QIG_GEOMETRY_AVAILABLE = False
    def sphere_project(v):
        """Fallback sphere projection."""
        norm = np.linalg.norm(v)
        if norm < 1e-10:
            result = np.ones_like(v)
            return result / np.linalg.norm(result)
        return v / norm
from typing import Dict, List, Optional, Any, Tuple, TYPE_CHECKING
from datetime import datetime

try:
    from search.duckduckgo_adapter import get_ddg_search, DuckDuckGoSearch
    HAS_DDG = True
except ImportError:
    HAS_DDG = False
    get_ddg_search = None


class ProviderStats:
    """Track performance statistics for a search provider."""
    
    def __init__(self, provider_name: str):
        self.name = provider_name
        self.total_queries = 0
        self.successful_queries = 0
        self.total_results = 0
        self.avg_response_time = 0.0
        self.last_success_time: Optional[float] = None
        self.last_failure_time: Optional[float] = None
        self.failure_streak = 0
        self.domain_scores: Dict[str, float] = {}
    
    @property
    def success_rate(self) -> float:
        if self.total_queries == 0:
            return 0.5
        return self.successful_queries / self.total_queries
    
    @property
    def availability(self) -> float:
        """Estimate current availability based on recent performance."""
        if self.failure_streak > 3:
            return 0.1
        if self.last_failure_time:
            time_since_failure = time.time() - self.last_failure_time
            if time_since_failure < 60:
                return 0.3
            elif time_since_failure < 300:
                return 0.6
        return 1.0
    
    def record_success(self, result_count: int, response_time: float, domain: str = 'general'):
        self.total_queries += 1
        self.successful_queries += 1
        self.total_results += result_count
        self.last_success_time = time.time()
        self.failure_streak = 0
        
        alpha = 0.2
        self.avg_response_time = alpha * response_time + (1 - alpha) * self.avg_response_time
        
        if domain not in self.domain_scores:
            self.domain_scores[domain] = 0.5
        self.domain_scores[domain] = min(1.0, self.domain_scores[domain] + 0.1)
    
    def record_failure(self, domain: str = 'general'):
        self.total_queries += 1
        self.last_failure_time = time.time()
        self.failure_streak += 1
        
        if domain in self.domain_scores:
            self.domain_scores[domain] = max(0.0, self.domain_scores[domain] - 0.15)
    
    def get_domain_score(self, domain: str) -> float:
        return self.domain_scores.get(domain, 0.5)
    
    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'total_queries': self.total_queries,
            'successful_queries': self.successful_queries,
            'success_rate': self.success_rate,
            'availability': self.availability,
            'avg_response_time': self.avg_response_time,
            'failure_streak': self.failure_streak,
            'domain_scores': self.domain_scores,
        }


class GeometricProviderSelector:
    """
    QIG-based search provider selection.
    
    Uses geometric reasoning to select the best provider based on:
    - Query domain (encoded to 64D basin)
    - Provider historical performance
    - Current availability
    - Domain-specific effectiveness
    
    Premium providers (Tavily, Perplexity) are included when enabled via budget orchestrator.
    """
    
    # Base providers always available
    BASE_PROVIDERS = ['google-free', 'searxng', 'duckduckgo']
    # Premium providers (require API keys and explicit enablement)
    PREMIUM_PROVIDERS = ['tavily', 'perplexity']
    # All regular providers (includes premium when enabled)
    REGULAR_PROVIDERS = ['google-free', 'searxng', 'duckduckgo', 'tavily', 'perplexity']
    SHADOW_PROVIDERS = ['duckduckgo-tor', 'wayback', 'pastebin', 'rss', 'breach']
    
    def __init__(self, mode: str = 'regular'):
        """
        Initialize provider selector.
        
        Args:
            mode: 'regular' for Zeus, 'shadow' for Hades
        """
        self.mode = mode
        self.providers = self.REGULAR_PROVIDERS if mode == 'regular' else self.SHADOW_PROVIDERS
        
        self.stats: Dict[str, ProviderStats] = {
            p: ProviderStats(p) for p in self.providers
        }
        
        self.provider_basins: Dict[str, List[Tuple[np.ndarray, bool]]] = {
            p: [] for p in self.providers
        }
        self.max_basin_history = 100
        
        self.query_history: List[Dict] = []
        self.max_history = 500
        
        self.domain_keywords = {
            'news': ['breaking', 'latest', 'today', 'update', 'announcement', 'report'],
            'academic': ['research', 'paper', 'study', 'theory', 'analysis', 'journal'],
            'technical': ['code', 'programming', 'api', 'library', 'framework', 'debug'],
            'security': ['vulnerability', 'exploit', 'breach', 'hack', 'cve', 'malware'],
            'crypto': ['bitcoin', 'blockchain', 'wallet', 'transaction', 'mining', 'address'],
            'general': [],
        }
        
        self.provider_domain_affinity = {
            'google-free': {'news': 0.9, 'general': 0.8, 'technical': 0.7},
            'searxng': {'academic': 0.8, 'technical': 0.8, 'general': 0.7},
            'duckduckgo': {'general': 0.8, 'technical': 0.7, 'news': 0.7},
            # Premium providers - highest quality for all domains
            'tavily': {'academic': 0.95, 'technical': 0.95, 'news': 0.9, 'general': 0.9, 'crypto': 0.85, 'security': 0.8},
            'perplexity': {'academic': 0.95, 'general': 0.95, 'technical': 0.9, 'news': 0.85, 'crypto': 0.8, 'security': 0.75},
            # Shadow providers
            'duckduckgo-tor': {'security': 0.9, 'crypto': 0.8, 'general': 0.6},
            'wayback': {'academic': 0.7, 'technical': 0.6, 'general': 0.5},
            'pastebin': {'security': 0.8, 'crypto': 0.7, 'technical': 0.6},
            'rss': {'news': 0.9, 'technical': 0.7, 'general': 0.5},
            'breach': {'security': 0.9, 'crypto': 0.8, 'general': 0.3},
        }
        
        # Track which premium providers are currently enabled
        self._enabled_premium: Dict[str, bool] = {p: False for p in self.PREMIUM_PROVIDERS}
    
    def _detect_query_domain(self, query: str) -> str:
        """Detect the domain of a query based on keywords."""
        query_lower = query.lower()
        
        domain_scores = {}
        for domain, keywords in self.domain_keywords.items():
            if not keywords:
                domain_scores[domain] = 0.1
                continue
            score = sum(1 for kw in keywords if kw in query_lower)
            domain_scores[domain] = score
        
        if max(domain_scores.values()) == 0:
            return 'general'
        
        return max(domain_scores, key=domain_scores.get)
    
    def _encode_query_basin(self, query: str) -> np.ndarray:
        """Encode query to 64D basin coordinates for geometric comparison."""
        query_hash = hashlib.sha256(query.encode()).digest()
        basin = np.frombuffer(query_hash[:32], dtype=np.float32)
        basin = np.concatenate([basin, np.frombuffer(query_hash[32:], dtype=np.float32)[:32]])
        
        if len(basin) < 64:
            basin = np.pad(basin, (0, 64 - len(basin)))
        basin = basin[:64]
        
        basin = sphere_project(basin)
        return basin
    
    def _fisher_rao_distance(self, p1: np.ndarray, p2: np.ndarray) -> float:
        """
        Compute Fisher-Rao distance between two probability distributions.

        For distributions represented as unit vectors (on the probability simplex),
        the Fisher-Rao distance is related to the geodesic distance on the
        statistical manifold.

        d_FR = arccos(sqrt(sum(sqrt(p1_i * p2_i))))

        NOTE: No factor of 2 - this is the geodesic distance.

        For unit vectors in embedding space, we use Bures-style metric:
        d_B = arccos(|<p1, p2>|)
        """
        p1_norm = p1 / (np.linalg.norm(p1) + 1e-10)
        p2_norm = p2 / (np.linalg.norm(p2) + 1e-10)
        
        inner_product = np.abs(np.dot(p1_norm, p2_norm))
        inner_product = np.clip(inner_product, 0.0, 1.0)
        
        distance = np.arccos(inner_product)
        return float(distance)
    
    def _compute_geometric_similarity(self, query_basin: np.ndarray, provider: str) -> float:
        """
        Compute geometric similarity between query and provider's historical basins.
        
        Uses Fisher-Rao distance to find how well this provider has performed
        on geometrically similar queries in the past.
        """
        if provider not in self.provider_basins or not self.provider_basins[provider]:
            return 0.5
        
        provider_history = self.provider_basins[provider]
        
        similarities = []
        for hist_basin, success in provider_history[-20:]:
            distance = self._fisher_rao_distance(query_basin, hist_basin)
            similarity = 1.0 / (1.0 + distance)
            weight = 1.0 if success else -0.5
            similarities.append(similarity * weight)
        
        if not similarities:
            return 0.5
        
        avg_similarity = np.mean(similarities)
        return float(0.5 + 0.5 * np.tanh(avg_similarity))
    
    def _compute_provider_fitness(
        self,
        provider: str,
        domain: str,
        query_basin: np.ndarray
    ) -> float:
        """
        Compute geometric fitness score for a provider using Fisher-Rao distance.
        
        Fitness combines:
        - Geometric similarity: Fisher-Rao distance to successful query basins (40%)
        - Base affinity: Prior knowledge about provider-domain fit (20%)
        - Learned domain score: Success rate in this domain (20%)
        - Availability: Current provider health (15%)
        - Speed factor: Response time performance (5%)
        """
        stats = self.stats.get(provider)
        if not stats:
            return 0.0
        
        geometric_similarity = self._compute_geometric_similarity(query_basin, provider)
        
        base_affinity = self.provider_domain_affinity.get(provider, {}).get(domain, 0.5)
        
        learned_score = stats.get_domain_score(domain)
        availability = stats.availability
        
        speed_factor = 1.0
        if stats.avg_response_time > 5.0:
            speed_factor = 0.7
        elif stats.avg_response_time > 2.0:
            speed_factor = 0.85
        
        fitness = (
            geometric_similarity * 0.40 +
            base_affinity * 0.20 +
            learned_score * 0.20 +
            availability * 0.15 +
            speed_factor * 0.05
        )
        
        return min(1.0, max(0.0, fitness))
    
    def record_result(
        self,
        provider: str,
        query: str,
        success: bool,
        result_count: int = 0,
        response_time: float = 0.0
    ):
        """
        Record search result for geometric learning.
        
        Stores the query basin coordinates along with success/failure
        to enable Fisher-Rao distance-based similarity matching for
        future queries.
        """
        domain = self._detect_query_domain(query)
        query_basin = self._encode_query_basin(query)
        
        if provider in self.stats:
            if success:
                self.stats[provider].record_success(result_count, response_time, domain)
            else:
                self.stats[provider].record_failure(domain)
        
        if provider in self.provider_basins:
            self.provider_basins[provider].append((query_basin, success))
            
            if len(self.provider_basins[provider]) > self.max_basin_history:
                self.provider_basins[provider] = self.provider_basins[provider][-self.max_basin_history // 2:]
        
        self.query_history.append({
            'query': query[:100],
            'domain': domain,
            'provider': provider,
            'success': success,
            'result_count': result_count,
            'timestamp': time.time(),
        })
        
        if len(self.query_history) > self.max_history:
            self.query_history = self.query_history[-self.max_history // 2:]
    
    def get_stats(self) -> Dict:
        """Get overall selector statistics."""
        return {
            'mode': self.mode,
            'providers': {p: s.to_dict() for p, s in self.stats.items()},
            'query_count': len(self.query_history),
            'last_queries': self.query_history[-10:] if self.query_history else [],
            'enabled_premium': self._enabled_premium,
            'active_providers': self.get_active_providers(),
        }
    
    def enable_premium_provider(self, provider: str, enabled: bool = True) -> bool:
        """
        Enable or disable a premium provider (tavily, perplexity).
        
        This allows the budget orchestrator UI toggles to control whether
        premium providers are included in search selection.
        
        Args:
            provider: Provider name ('tavily' or 'perplexity')
            enabled: Whether to enable (True) or disable (False)
            
        Returns:
            True if state changed, False if invalid provider
        """
        if provider not in self.PREMIUM_PROVIDERS:
            return False
        
        was_enabled = self._enabled_premium.get(provider, False)
        self._enabled_premium[provider] = enabled
        
        # Initialize stats for newly enabled provider if needed
        if enabled and provider not in self.stats:
            self.stats[provider] = ProviderStats(provider)
            self.provider_basins[provider] = []
        
        if was_enabled != enabled:
            action = "enabled" if enabled else "disabled"
            print(f"[GeometricProviderSelector] Premium provider '{provider}' {action}")
        
        return True
    
    def is_premium_enabled(self, provider: str) -> bool:
        """Check if a premium provider is currently enabled."""
        return self._enabled_premium.get(provider, False)
    
    def get_active_providers(self) -> List[str]:
        """
        Get list of currently active providers (base + enabled premium).
        
        This filters REGULAR_PROVIDERS to only include base providers
        plus any premium providers that have been explicitly enabled.
        """
        if self.mode == 'shadow':
            return list(self.SHADOW_PROVIDERS)
        
        active = list(self.BASE_PROVIDERS)
        for p in self.PREMIUM_PROVIDERS:
            if self._enabled_premium.get(p, False):
                active.append(p)
        return active
    
    def select_provider(self, query: str) -> Tuple[str, Dict]:
        """
        Select the best provider for a query using geometric reasoning.
        
        Only considers base providers + enabled premium providers.
        
        Returns:
            Tuple of (provider_name, selection_metadata)
        """
        domain = self._detect_query_domain(query)
        query_basin = self._encode_query_basin(query)
        
        # Get active providers only (filters out disabled premium)
        active_providers = self.get_active_providers()
        
        fitness_scores = {}
        for provider in active_providers:
            # Ensure stats exist for this provider
            if provider not in self.stats:
                self.stats[provider] = ProviderStats(provider)
                self.provider_basins[provider] = []
            
            fitness = self._compute_provider_fitness(provider, domain, query_basin)
            fitness_scores[provider] = fitness
        
        if not fitness_scores:
            fallback = self.BASE_PROVIDERS[0]
            return fallback, {'reason': 'no_providers', 'domain': domain}
        
        best_provider = max(fitness_scores, key=fitness_scores.get)
        best_score = fitness_scores[best_provider]
        
        # Log when premium provider is selected
        if best_provider in self.PREMIUM_PROVIDERS:
            print(f"[GeometricProviderSelector] Selected PREMIUM provider '{best_provider}' for {domain} query (fitness={best_score:.3f})")
        
        metadata = {
            'domain': domain,
            'selected_provider': best_provider,
            'fitness_score': best_score,
            'all_scores': fitness_scores,
            'active_providers': active_providers,
            'premium_enabled': {p: self._enabled_premium.get(p, False) for p in self.PREMIUM_PROVIDERS},
            'reasoning': f"Selected {best_provider} for {domain} domain (fitness={best_score:.3f})",
            'timestamp': datetime.now().isoformat(),
        }
        
        return best_provider, metadata
    
    def select_providers_ranked(self, query: str, max_providers: int = 3) -> List[Tuple[str, float]]:
        """
        Get ranked list of active providers for fallback chain.
        
        Returns:
            List of (provider_name, fitness_score) tuples, sorted by fitness
        """
        domain = self._detect_query_domain(query)
        query_basin = self._encode_query_basin(query)
        
        active_providers = self.get_active_providers()
        
        fitness_scores = []
        for provider in active_providers:
            if provider not in self.stats:
                self.stats[provider] = ProviderStats(provider)
                self.provider_basins[provider] = []
            
            fitness = self._compute_provider_fitness(provider, domain, query_basin)
            fitness_scores.append((provider, fitness))
        
        fitness_scores.sort(key=lambda x: x[1], reverse=True)
        
        return fitness_scores[:max_providers]


_regular_selector: Optional[GeometricProviderSelector] = None
_shadow_selector: Optional[GeometricProviderSelector] = None


def get_provider_selector(mode: str = 'regular') -> GeometricProviderSelector:
    """Get or create provider selector singleton."""
    global _regular_selector, _shadow_selector
    
    if mode == 'shadow':
        if _shadow_selector is None:
            _shadow_selector = GeometricProviderSelector(mode='shadow')
        return _shadow_selector
    else:
        if _regular_selector is None:
            _regular_selector = GeometricProviderSelector(mode='regular')
        return _regular_selector
