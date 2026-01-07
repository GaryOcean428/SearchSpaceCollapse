"""
DuckDuckGo Search Adapter for QIG Platform

Provides privacy-focused web search using DuckDuckGo.
No API keys required - uses the duckduckgo-search library.

Features:
- Text search with region/safesearch options
- News search for time-sensitive queries
- Image search for visual research
- Proxy support (including Tor) for shadow operations
- QIG geometric scoring integration

Usage:
    from search.duckduckgo_adapter import DuckDuckGoSearch, get_ddg_search
    
    ddg = get_ddg_search()
    results = ddg.search("quantum computing", max_results=10)
    news = ddg.search_news("AI breakthrough", timelimit="w")
"""

import os
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
import hashlib

try:
    from duckduckgo_search import DDGS
    from duckduckgo_search.exceptions import (
        DuckDuckGoSearchException,
        RatelimitException,
        TimeoutException,
    )
    HAS_DDG = True
except ImportError:
    HAS_DDG = False
    DDGS = None
    DuckDuckGoSearchException = Exception
    RatelimitException = Exception
    TimeoutException = Exception


class DuckDuckGoSearch:
    """
    QIG-integrated DuckDuckGo search adapter.
    
    Provides privacy-focused search with geometric scoring integration.
    Supports both clearnet and Tor proxy for shadow operations.
    """
    
    def __init__(
        self,
        proxy: Optional[str] = None,
        timeout: int = 20,
        use_tor: bool = False,
    ):
        """
        Initialize DuckDuckGo search adapter.
        
        Args:
            proxy: Custom proxy URL (e.g., "socks5h://127.0.0.1:9050")
            timeout: Request timeout in seconds
            use_tor: If True, use Tor proxy (socks5h://127.0.0.1:9050)
        """
        self.available = HAS_DDG
        self.timeout = timeout
        self.use_tor = use_tor
        
        if use_tor:
            self.proxy = os.getenv('DDG_TOR_PROXY', 'socks5h://127.0.0.1:9050')
        else:
            self.proxy = proxy or os.getenv('DDG_PROXY')
        
        self.cache: Dict[str, Dict] = {}
        self.cache_ttl = 300
        self.rate_limit_delay = 1.0
        self.last_request_time = 0.0
        
        self.search_count = 0
        self.error_count = 0
        self.last_error: Optional[str] = None
        
        print(f"[DuckDuckGo] Initialized (available={self.available}, tor={use_tor})")
    
    def _get_client(self) -> Optional[Any]:
        """Get DDGS client with configured proxy."""
        if not self.available:
            return None
        
        try:
            if self.proxy:
                return DDGS(proxy=self.proxy, timeout=self.timeout)
            else:
                return DDGS(timeout=self.timeout)
        except Exception as e:
            print(f"[DuckDuckGo] Client creation error: {e}")
            return None
    
    def _rate_limit(self) -> None:
        """Apply rate limiting between requests."""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        self.last_request_time = time.time()
    
    def _cache_key(self, query: str, search_type: str, **kwargs) -> str:
        """Generate cache key for query."""
        params = f"{query}:{search_type}:{sorted(kwargs.items())}"
        return hashlib.md5(params.encode()).hexdigest()
    
    def _check_cache(self, cache_key: str) -> Optional[Dict]:
        """Check if cached result exists and is valid."""
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if time.time() - cached['timestamp'] < self.cache_ttl:
                return cached['data']
            else:
                del self.cache[cache_key]
        return None
    
    def _store_cache(self, cache_key: str, data: Dict) -> None:
        """Store result in cache."""
        self.cache[cache_key] = {
            'data': data,
            'timestamp': time.time(),
        }
        if len(self.cache) > 100:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]['timestamp'])
            del self.cache[oldest_key]
    
    def search(
        self,
        query: str,
        max_results: int = 10,
        region: str = "wt-wt",
        safesearch: str = "moderate",
        timelimit: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform text search on DuckDuckGo.
        
        Args:
            query: Search query
            max_results: Maximum number of results (default: 10)
            region: Region code (default: "wt-wt" for worldwide)
            safesearch: "on", "moderate", or "off"
            timelimit: "d" (day), "w" (week), "m" (month), "y" (year)
        
        Returns:
            Dict with results, metadata, and QIG scoring info
        """
        if not self.available:
            return {
                'success': False,
                'error': 'DuckDuckGo search not available',
                'results': [],
            }
        
        cache_key = self._cache_key(query, 'text', max_results=max_results, region=region)
        cached = self._check_cache(cache_key)
        if cached:
            return cached
        
        self._rate_limit()
        
        try:
            client = self._get_client()
            if not client:
                return {'success': False, 'error': 'Failed to create client', 'results': []}
            
            results = client.text(
                keywords=query,
                region=region,
                safesearch=safesearch,
                timelimit=timelimit,
                max_results=max_results,
            )
            
            processed_results = []
            for i, result in enumerate(results or []):
                processed_results.append({
                    'title': result.get('title', ''),
                    'url': result.get('href', ''),
                    'body': result.get('body', ''),
                    'source': 'duckduckgo',
                    'rank': i + 1,
                    'relevance_score': 1.0 - (i / max(max_results, 1)),
                })
            
            self.search_count += 1
            
            response = {
                'success': True,
                'query': query,
                'results': processed_results,
                'count': len(processed_results),
                'source': 'duckduckgo',
                'region': region,
                'timelimit': timelimit,
                'timestamp': datetime.now().isoformat(),
                'proxy_used': bool(self.proxy),
                'tor_mode': self.use_tor,
            }
            
            self._store_cache(cache_key, response)
            return response
            
        except RatelimitException:
            self.error_count += 1
            self.last_error = 'Rate limit exceeded'
            return {
                'success': False,
                'error': 'DuckDuckGo rate limit - try again later or use proxy',
                'results': [],
                'retry_after': 60,
            }
        except TimeoutException:
            self.error_count += 1
            self.last_error = 'Timeout'
            return {
                'success': False,
                'error': 'DuckDuckGo request timed out',
                'results': [],
            }
        except DuckDuckGoSearchException as e:
            self.error_count += 1
            self.last_error = str(e)
            return {
                'success': False,
                'error': f'DuckDuckGo search error: {e}',
                'results': [],
            }
        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            return {
                'success': False,
                'error': f'Unexpected error: {e}',
                'results': [],
            }
    
    def search_news(
        self,
        query: str,
        max_results: int = 10,
        region: str = "wt-wt",
        safesearch: str = "moderate",
        timelimit: Optional[str] = "w",
    ) -> Dict[str, Any]:
        """
        Search DuckDuckGo news.
        
        Args:
            query: Search query
            max_results: Maximum number of results
            region: Region code
            safesearch: Safety level
            timelimit: "d" (day), "w" (week), "m" (month)
        
        Returns:
            Dict with news results
        """
        if not self.available:
            return {
                'success': False,
                'error': 'DuckDuckGo search not available',
                'results': [],
            }
        
        cache_key = self._cache_key(query, 'news', max_results=max_results, timelimit=timelimit)
        cached = self._check_cache(cache_key)
        if cached:
            return cached
        
        self._rate_limit()
        
        try:
            client = self._get_client()
            if not client:
                return {'success': False, 'error': 'Failed to create client', 'results': []}
            
            results = client.news(
                keywords=query,
                region=region,
                safesearch=safesearch,
                timelimit=timelimit,
                max_results=max_results,
            )
            
            processed_results = []
            for i, result in enumerate(results or []):
                processed_results.append({
                    'title': result.get('title', ''),
                    'url': result.get('url', ''),
                    'body': result.get('body', ''),
                    'source': result.get('source', 'unknown'),
                    'date': result.get('date', ''),
                    'image': result.get('image', ''),
                    'rank': i + 1,
                    'type': 'news',
                })
            
            self.search_count += 1
            
            response = {
                'success': True,
                'query': query,
                'results': processed_results,
                'count': len(processed_results),
                'source': 'duckduckgo_news',
                'timelimit': timelimit,
                'timestamp': datetime.now().isoformat(),
            }
            
            self._store_cache(cache_key, response)
            return response
            
        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            return {
                'success': False,
                'error': f'News search error: {e}',
                'results': [],
            }
    
    def search_images(
        self,
        query: str,
        max_results: int = 10,
        region: str = "wt-wt",
        safesearch: str = "moderate",
        size: Optional[str] = None,
        type_image: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search DuckDuckGo images.
        
        Args:
            query: Search query
            max_results: Maximum results
            region: Region code
            safesearch: Safety level
            size: "Small", "Medium", "Large", "Wallpaper"
            type_image: "photo", "clipart", "gif", "transparent", "line"
        
        Returns:
            Dict with image results
        """
        if not self.available:
            return {
                'success': False,
                'error': 'DuckDuckGo search not available',
                'results': [],
            }
        
        self._rate_limit()
        
        try:
            client = self._get_client()
            if not client:
                return {'success': False, 'error': 'Failed to create client', 'results': []}
            
            results = client.images(
                keywords=query,
                region=region,
                safesearch=safesearch,
                size=size,
                type_image=type_image,
                max_results=max_results,
            )
            
            processed_results = []
            for i, result in enumerate(results or []):
                processed_results.append({
                    'title': result.get('title', ''),
                    'url': result.get('url', ''),
                    'image_url': result.get('image', ''),
                    'thumbnail': result.get('thumbnail', ''),
                    'source': result.get('source', ''),
                    'width': result.get('width', 0),
                    'height': result.get('height', 0),
                    'rank': i + 1,
                    'type': 'image',
                })
            
            self.search_count += 1
            
            return {
                'success': True,
                'query': query,
                'results': processed_results,
                'count': len(processed_results),
                'source': 'duckduckgo_images',
                'timestamp': datetime.now().isoformat(),
            }
            
        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            return {
                'success': False,
                'error': f'Image search error: {e}',
                'results': [],
            }
    
    def search_for_shadow(
        self,
        query: str,
        max_results: int = 15,
        include_news: bool = True,
    ) -> Dict[str, Any]:
        """
        Shadow-optimized search using Tor proxy.
        
        Combines text and news search for comprehensive intelligence gathering.
        Uses Tor for anonymity when configured.
        
        Args:
            query: Search query
            max_results: Maximum results per search type
            include_news: Include news search results
        
        Returns:
            Combined intelligence report
        """
        text_results = self.search(query, max_results=max_results)
        
        combined_results = text_results.get('results', [])
        sources = ['duckduckgo_text']
        
        if include_news:
            news_results = self.search_news(query, max_results=max_results // 2)
            if news_results.get('success'):
                for result in news_results.get('results', []):
                    result['search_type'] = 'news'
                    combined_results.append(result)
                sources.append('duckduckgo_news')
        
        return {
            'success': text_results.get('success', False),
            'query': query,
            'intelligence': combined_results,
            'count': len(combined_results),
            'sources': sources,
            'tor_mode': self.use_tor,
            'anonymous': self.use_tor or bool(self.proxy),
            'timestamp': datetime.now().isoformat(),
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Get adapter status and statistics."""
        return {
            'available': self.available,
            'search_count': self.search_count,
            'error_count': self.error_count,
            'last_error': self.last_error,
            'cache_size': len(self.cache),
            'proxy_configured': bool(self.proxy),
            'tor_mode': self.use_tor,
        }


_default_ddg: Optional[DuckDuckGoSearch] = None
_shadow_ddg: Optional[DuckDuckGoSearch] = None


def get_ddg_search(use_tor: bool = False) -> DuckDuckGoSearch:
    """
    Get or create DuckDuckGo search adapter singleton.
    
    Args:
        use_tor: If True, returns Tor-enabled adapter for shadow operations
    
    Returns:
        DuckDuckGoSearch adapter instance
    """
    global _default_ddg, _shadow_ddg
    
    if use_tor:
        if _shadow_ddg is None:
            _shadow_ddg = DuckDuckGoSearch(use_tor=True)
        return _shadow_ddg
    else:
        if _default_ddg is None:
            _default_ddg = DuckDuckGoSearch()
        return _default_ddg


def search_duckduckgo(
    query: str,
    max_results: int = 10,
    include_news: bool = False,
    use_tor: bool = False,
) -> Dict[str, Any]:
    """
    Convenience function for DuckDuckGo search.
    
    Args:
        query: Search query
        max_results: Maximum results
        include_news: Include news results
        use_tor: Use Tor proxy for anonymity
    
    Returns:
        Search results
    """
    ddg = get_ddg_search(use_tor=use_tor)
    
    if include_news:
        return ddg.search_for_shadow(query, max_results=max_results, include_news=True)
    else:
        return ddg.search(query, max_results=max_results)
