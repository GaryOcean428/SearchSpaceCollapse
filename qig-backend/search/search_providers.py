"""
Toggleable Search Provider System

Multiple search providers with cost control:
- DuckDuckGo (free, always available)
- Tavily (API key required, high quality)
- Perplexity (API key required, AI-enhanced)
- Google (API key required)

Toggle providers on/off to control costs.
"""

import os
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SearchProviderConfig:
    """Configuration for a search provider."""
    name: str
    enabled: bool = False
    api_key_env: Optional[str] = None
    cost_per_query: float = 0.0
    priority: int = 0  # Higher = preferred


def _get_budget_orchestrator():
    """Get budget orchestrator lazily."""
    try:
        from search.search_budget_orchestrator import get_budget_orchestrator
        return get_budget_orchestrator()
    except ImportError:
        logger.warning("[SearchProviderManager] Budget orchestrator not available")
        return None


def _get_search_importance():
    """Get SearchImportance enum."""
    try:
        from search.search_budget_orchestrator import SearchImportance
        return SearchImportance
    except ImportError:
        logger.warning("[SearchProviderManager] SearchImportance not available")
        return None


class SearchProviderManager:
    """
    Manages multiple search providers with toggle control.
    
    Usage:
        manager = get_search_manager()
        manager.enable('tavily')
        results = manager.search("quantum consciousness")
    """
    
    def __init__(self):
        self.providers: Dict[str, SearchProviderConfig] = {
            'duckduckgo': SearchProviderConfig(
                name='duckduckgo',
                enabled=True,  # Free, always on by default
                api_key_env=None,
                cost_per_query=0.0,
                priority=1
            ),
            'tavily': SearchProviderConfig(
                name='tavily',
                enabled=False,  # Off by default (costs money)
                api_key_env='TAVILY_API_KEY',
                cost_per_query=0.01,
                priority=3
            ),
            'perplexity': SearchProviderConfig(
                name='perplexity',
                enabled=False,
                api_key_env='PERPLEXITY_API_KEY',
                cost_per_query=0.005,
                priority=2
            ),
            'google': SearchProviderConfig(
                name='google',
                enabled=False,
                api_key_env='GOOGLE_API_KEY',
                cost_per_query=0.005,
                priority=2
            ),
        }
        
        self.query_count: Dict[str, int] = {p: 0 for p in self.providers}
        self.last_results: Dict[str, Any] = {}
        
        self._auto_enable_providers_with_keys()
        
        logger.info(f"[SearchProviderManager] Initialized with {len(self.providers)} providers")
    
    def _auto_enable_providers_with_keys(self):
        """Auto-enable premium providers if their API keys are available."""
        for name, config in self.providers.items():
            if config.api_key_env and os.environ.get(config.api_key_env):
                config.enabled = True
                logger.info(f"[SearchProviderManager] Auto-enabled {name} (API key detected)")
    
    def enable(self, provider: str) -> bool:
        """Enable a search provider."""
        if provider not in self.providers:
            logger.warning(f"Unknown provider: {provider}")
            return False
        
        config = self.providers[provider]
        
        if config.api_key_env and not os.environ.get(config.api_key_env):
            logger.warning(f"Cannot enable {provider}: {config.api_key_env} not set")
            return False
        
        config.enabled = True
        logger.info(f"[SearchProviderManager] Enabled {provider}")
        return True
    
    def disable(self, provider: str) -> bool:
        """Disable a search provider."""
        if provider not in self.providers:
            return False
        
        self.providers[provider].enabled = False
        logger.info(f"[SearchProviderManager] Disabled {provider}")
        return True
    
    def toggle(self, provider: str) -> bool:
        """Toggle a search provider on/off."""
        if provider not in self.providers:
            return False
        
        if self.providers[provider].enabled:
            return self.disable(provider)
        else:
            return self.enable(provider)
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of all providers."""
        return {
            name: {
                'enabled': config.enabled,
                'has_api_key': config.api_key_env is None or bool(os.environ.get(config.api_key_env or '')),
                'cost_per_query': config.cost_per_query,
                'query_count': self.query_count.get(name, 0),
                'priority': config.priority
            }
            for name, config in self.providers.items()
        }
    
    def search(
        self, 
        query: str, 
        max_results: int = 5, 
        provider: Optional[str] = None,
        importance: int = 1,  # 1=routine, 2=moderate, 3=high, 4=critical
        kernel_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search using enabled providers with budget awareness.
        
        Args:
            query: Search query
            max_results: Maximum results per provider
            provider: Specific provider to use (optional)
            importance: Query importance (1-4) for budget allocation
            kernel_id: Kernel requesting the search (for learning)
        
        Returns:
            Combined results with provider info and budget context
        """
        orchestrator = _get_budget_orchestrator()
        SearchImportance = _get_search_importance()
        
        selected_provider = None
        selection_reason = "legacy"
        
        if orchestrator and SearchImportance:
            imp_enum = SearchImportance(min(max(importance, 1), 4))
            selected_provider, selection_reason = orchestrator.select_provider(
                importance=imp_enum,
                preferred_provider=provider
            )
            
            if selected_provider:
                providers_to_use = [selected_provider]
                # Log when premium providers are actually used (truncate query for security)
                if selected_provider in ('tavily', 'perplexity'):
                    safe_query = query[:500] + '...' if len(query) > 30 else query
                    logger.info(f"[SearchProviderManager] PREMIUM PROVIDER: {selected_provider} (reason: {selection_reason}, query_len: {len(query)})")
            else:
                providers_to_use = ['duckduckgo'] if self.providers.get('duckduckgo', {}) else []
        elif provider and provider in self.providers:
            providers_to_use = [provider] if self.providers[provider].enabled else []
        else:
            providers_to_use = sorted(
                [p for p, c in self.providers.items() if c.enabled],
                key=lambda p: self.providers[p].priority,
                reverse=True
            )
        
        if not providers_to_use:
            return {
                'success': False,
                'error': 'No providers available (check budget)',
                'results': [],
                'budget_context': orchestrator.get_budget_context().to_dict() if orchestrator else None
            }
        
        all_results = []
        errors = []
        provider_used = None
        
        for prov in providers_to_use:
            try:
                results = self._search_provider(prov, query, max_results)
                if results:
                    all_results.extend(results)
                    self.query_count[prov] = self.query_count.get(prov, 0) + 1
                    provider_used = prov
                    
                    if orchestrator and SearchImportance:
                        orchestrator.record_usage(prov, success=True)
                        relevance = min(1.0, len(results) / max_results)
                        orchestrator.record_outcome(
                            query=query,
                            provider=prov,
                            importance=SearchImportance(importance),
                            success=True,
                            result_count=len(results),
                            relevance_score=relevance,
                            kernel_id=kernel_id
                        )
                    
                    break  # Use first successful provider
            except Exception as e:
                errors.append(f"{prov}: {str(e)}")
                logger.error(f"[SearchProviderManager] {prov} failed: {e}")
                
                if orchestrator and SearchImportance:
                    orchestrator.record_outcome(
                        query=query,
                        provider=prov,
                        importance=SearchImportance(importance),
                        success=False,
                        result_count=0,
                        relevance_score=0.0,
                        kernel_id=kernel_id
                    )
        
        return {
            'success': len(all_results) > 0,
            'provider_used': provider_used,
            'selection_reason': selection_reason,
            'results': all_results[:max_results],
            'errors': errors if errors else None,
            'budget_context': orchestrator.get_budget_context().to_dict() if orchestrator else None
        }
    
    def _search_provider(self, provider: str, query: str, max_results: int) -> List[Dict]:
        """Execute search on specific provider."""
        
        if provider == 'duckduckgo':
            return self._search_duckduckgo(query, max_results)
        elif provider == 'tavily':
            return self._search_tavily(query, max_results)
        elif provider == 'perplexity':
            return self._search_perplexity(query, max_results)
        elif provider == 'google':
            return self._search_google(query, max_results)
        else:
            return []
    
    def _search_duckduckgo(self, query: str, max_results: int) -> List[Dict]:
        """Search using DuckDuckGo (free, no API key)."""
        try:
            from ddgs import DDGS
            
            results = DDGS().text(query=query, max_results=max_results)
            
            return [
                {
                    'title': r.get('title', ''),
                    'url': r.get('href', ''),
                    'content': r.get('body', ''),
                    'provider': 'duckduckgo'
                }
                for r in results
            ]
        except ImportError:
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=max_results))
                return [
                    {
                        'title': r.get('title', ''),
                        'url': r.get('href', ''),
                        'content': r.get('body', ''),
                        'provider': 'duckduckgo'
                    }
                    for r in results
                ]
            except Exception as e:
                logger.error(f"DuckDuckGo search failed: {e}")
                return []
    
    def _search_tavily(self, query: str, max_results: int) -> List[Dict]:
        """Search using Tavily API."""
        api_key = os.environ.get('TAVILY_API_KEY')
        if not api_key:
            raise ValueError("TAVILY_API_KEY not set")
        
        try:
            from tavily import TavilyClient
            
            client = TavilyClient(api_key=api_key)
            response = client.search(query=query, max_results=max_results)
            
            return [
                {
                    'title': r.get('title', ''),
                    'url': r.get('url', ''),
                    'content': r.get('content', ''),
                    'provider': 'tavily'
                }
                for r in response.get('results', [])
            ]
        except ImportError:
            import requests
            
            response = requests.post(
                'https://api.tavily.com/search',
                json={
                    'api_key': api_key,
                    'query': query,
                    'max_results': max_results
                },
                timeout=30
            )
            response.raise_for_status()
            data = response.json()
            
            return [
                {
                    'title': r.get('title', ''),
                    'url': r.get('url', ''),
                    'content': r.get('content', ''),
                    'provider': 'tavily'
                }
                for r in data.get('results', [])
            ]
    
    def _search_perplexity(self, query: str, max_results: int) -> List[Dict]:
        """Search using Perplexity API."""
        api_key = os.environ.get('PERPLEXITY_API_KEY')
        if not api_key:
            raise ValueError("PERPLEXITY_API_KEY not set")
        
        import requests
        
        response = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'llama-3.1-sonar-small-128k-online',
                'messages': [
                    {'role': 'system', 'content': 'Be precise and concise.'},
                    {'role': 'user', 'content': query}
                ],
                'temperature': 0.2,
                'return_citations': True
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
        citations = data.get('citations', [])
        
        results = [{
            'title': f'Perplexity Answer: {query}',
            'url': citations[0] if citations else '',
            'content': content,
            'provider': 'perplexity'
        }]
        
        for url in citations[1:max_results]:
            results.append({
                'title': f'Citation',
                'url': url,
                'content': '',
                'provider': 'perplexity'
            })
        
        return results
    
    def _search_google(self, query: str, max_results: int) -> List[Dict]:
        """Search using Google Custom Search API."""
        api_key = os.environ.get('GOOGLE_API_KEY')
        search_engine_id = os.environ.get('GOOGLE_SEARCH_ENGINE_ID')
        
        if not api_key or not search_engine_id:
            raise ValueError("GOOGLE_API_KEY or GOOGLE_SEARCH_ENGINE_ID not set")
        
        import requests
        
        response = requests.get(
            'https://www.googleapis.com/customsearch/v1',
            params={
                'key': api_key,
                'cx': search_engine_id,
                'q': query,
                'num': min(max_results, 10)
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        return [
            {
                'title': r.get('title', ''),
                'url': r.get('link', ''),
                'content': r.get('snippet', ''),
                'provider': 'google'
            }
            for r in data.get('items', [])
        ]


_search_manager: Optional[SearchProviderManager] = None


def get_search_manager() -> SearchProviderManager:
    """Get or create singleton search manager with auto-enabled providers."""
    global _search_manager
    if _search_manager is None:
        _search_manager = SearchProviderManager()
        
        # Auto-enable providers when API keys are available
        for provider_name in ['tavily', 'perplexity', 'google']:
            config = _search_manager.providers.get(provider_name)
            if config and config.api_key_env:
                if os.environ.get(config.api_key_env):
                    _search_manager.enable(provider_name)
                    logger.info(f"[SearchProviderManager] Auto-enabled {provider_name} (API key detected)")
    
    return _search_manager


def search(query: str, max_results: int = 5, provider: Optional[str] = None) -> Dict[str, Any]:
    """Convenience function for searching."""
    return get_search_manager().search(query, max_results, provider)
