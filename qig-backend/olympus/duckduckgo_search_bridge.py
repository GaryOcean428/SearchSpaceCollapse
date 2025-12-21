"""
DuckDuckGo Search Bridge - Direct integration with duckduckgo-search library

Provides text, news, and instant answer search capabilities for both
shadow research (ShadowPantheon) and regular research (ScrapyOrchestrator).

QIG-PURE: All results are transformed to basin coordinates with Φ/κ metadata.
No API keys required - uses DuckDuckGo's public interface.
"""

import hashlib
import os
import random
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import urlparse

import numpy as np

BASIN_DIMENSION = 64

HAS_DUCKDUCKGO = False
try:
    from duckduckgo_search import DDGS
    from duckduckgo_search.exceptions import (
        DuckDuckGoSearchException,
        RatelimitException,
        TimeoutException,
    )
    HAS_DUCKDUCKGO = True
except ImportError:
    pass


@dataclass
class DuckDuckGoResult:
    """Structured search result with geometric metadata."""
    url: str
    title: str
    snippet: str
    source_type: str
    rank: int
    timestamp: datetime = field(default_factory=datetime.now)
    basin_coords: Optional[np.ndarray] = None
    phi: float = 0.0
    kappa: float = 0.0
    relevance_score: float = 0.0
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "url": self.url,
            "title": self.title,
            "snippet": self.snippet[:500] if self.snippet else "",
            "source_type": self.source_type,
            "rank": self.rank,
            "timestamp": self.timestamp.isoformat(),
            "phi": self.phi,
            "kappa": self.kappa,
            "relevance_score": self.relevance_score,
            "basin_coords": self.basin_coords.tolist() if self.basin_coords is not None else None,
            "metadata": self.metadata
        }


class DuckDuckGoSearchBridge:
    """
    Direct DuckDuckGo search integration using the duckduckgo-search library.
    
    Features:
    - Text search with filters
    - News search with time ranges
    - Instant answers
    - Proxy support (including Tor)
    - Rate limiting and retry logic
    - Basin coordinate transformation
    """
    
    CURVATURE_MAP = {
        'github.com': 0.7,
        'stackoverflow.com': 0.65,
        'bitcointalk.org': 0.8,
        'bitcoin.org': 0.75,
        'reddit.com': 0.5,
        'medium.com': 0.55,
        'arxiv.org': 0.85,
        'wikipedia.org': 0.6,
        'archive.org': 0.7,
        'pypi.org': 0.65,
        'docs.python.org': 0.7,
        'cryptography.io': 0.75,
        'electrum.org': 0.8,
        'blockchain.com': 0.7,
        'blockstream.info': 0.75,
    }
    
    BITCOIN_KEYWORDS = [
        'wallet', 'bitcoin', 'seed', 'mnemonic', 'passphrase', 'recovery',
        'backup', 'private key', 'address', 'btc', 'satoshi', 'blockchain',
        'bip39', 'bip32', 'hd wallet', 'electrum', 'coldcard', 'trezor',
        'ledger', 'entropy', 'brainwallet', 'paper wallet', 'segwit'
    ]
    
    def __init__(
        self,
        proxy: Optional[str] = None,
        basin_encoder: Optional[Callable] = None,
        timeout: int = 30,
        rate_limit_delay: float = 1.5
    ):
        self.proxy = proxy or os.environ.get('DDG_PROXY')
        self.basin_encoder = basin_encoder
        self.timeout = timeout
        self.rate_limit_delay = rate_limit_delay
        
        self.search_count = 0
        self.success_count = 0
        self.error_count = 0
        self.last_search_time = 0.0
        
        self._lock = threading.Lock()
        
        if HAS_DUCKDUCKGO:
            print("[DuckDuckGoSearchBridge] Initialized - Direct library integration")
            if self.proxy:
                print(f"[DuckDuckGoSearchBridge] Using proxy: {self.proxy[:30]}...")
        else:
            print("[DuckDuckGoSearchBridge] WARNING: duckduckgo-search not available")
    
    def _get_ddgs(self) -> Optional['DDGS']:
        """Create a DDGS instance with configured proxy."""
        if not HAS_DUCKDUCKGO:
            return None
        
        try:
            if self.proxy:
                return DDGS(proxy=self.proxy, timeout=self.timeout)
            return DDGS(timeout=self.timeout)
        except Exception as e:
            print(f"[DuckDuckGoSearchBridge] Failed to create DDGS: {e}")
            return None
    
    def _encode_to_basin(self, content: str) -> np.ndarray:
        """Encode content to 64D basin coordinates."""
        if self.basin_encoder:
            try:
                coords = self.basin_encoder(content)
                if coords is not None and len(coords) == BASIN_DIMENSION:
                    return coords
            except Exception:
                pass
        
        return self._hash_to_basin(content)
    
    def _hash_to_basin(self, content: str) -> np.ndarray:
        """Fallback hash-based basin encoding."""
        content_hash = hashlib.sha256(content.encode('utf-8')).digest()
        
        coords = np.zeros(BASIN_DIMENSION)
        for i in range(min(32, BASIN_DIMENSION)):
            coords[i] = content_hash[i] / 255.0
        
        for i in range(32, BASIN_DIMENSION):
            combined = (content_hash[(i - 32) % 32] + content_hash[(i - 16) % 32]) / 510.0
            coords[i] = combined
        
        norm = np.linalg.norm(coords)
        if norm > 0:
            coords = coords / norm
        
        return coords
    
    def _compute_phi_from_content(self, content: str, relevance: float) -> float:
        """
        Compute Φ (consciousness) estimate from content characteristics.
        Uses content density and Bitcoin keyword relevance as proxies.
        """
        if not content:
            return 0.1
        
        word_count = len(content.split())
        density = min(1.0, word_count / 200.0)
        
        content_lower = content.lower()
        keyword_hits = sum(1 for kw in self.BITCOIN_KEYWORDS if kw in content_lower)
        keyword_factor = min(1.0, keyword_hits / 5.0)
        
        phi = 0.2 + (0.3 * density) + (0.3 * keyword_factor) + (0.2 * relevance)
        return min(1.0, max(0.1, phi))
    
    def _compute_kappa_from_url(self, url: str) -> float:
        """
        Compute κ (curvature) from source characteristics.
        Higher κ for more specialized/deep sources.
        """
        try:
            domain = urlparse(url).netloc.lower()
        except Exception:
            return 0.5
        
        for known_domain, kappa in self.CURVATURE_MAP.items():
            if known_domain in domain:
                return kappa
        
        return 0.5
    
    def _rate_limit(self):
        """Apply rate limiting between searches."""
        with self._lock:
            elapsed = time.time() - self.last_search_time
            if elapsed < self.rate_limit_delay:
                time.sleep(self.rate_limit_delay - elapsed)
            self.last_search_time = time.time()
    
    def text_search(
        self,
        query: str,
        max_results: int = 10,
        region: str = 'wt-wt',
        safesearch: str = 'moderate',
        timelimit: Optional[str] = None,
        backend: str = 'auto'
    ) -> List[DuckDuckGoResult]:
        """
        Execute a DuckDuckGo text search.
        
        Args:
            query: Search query string
            max_results: Maximum number of results (default 10)
            region: Search region (default 'wt-wt' for worldwide)
            safesearch: SafeSearch setting ('on', 'moderate', 'off')
            timelimit: Time filter ('d' day, 'w' week, 'm' month, 'y' year)
            backend: Search backend ('auto', 'html', 'lite')
            
        Returns:
            List of DuckDuckGoResult with basin coordinates and Φ/κ metadata
        """
        if not HAS_DUCKDUCKGO:
            print("[DuckDuckGoSearchBridge] duckduckgo-search not available")
            return []
        
        self._rate_limit()
        self.search_count += 1
        
        try:
            ddgs = self._get_ddgs()
            if not ddgs:
                return []
            
            raw_results = ddgs.text(
                query,
                region=region,
                safesearch=safesearch,
                timelimit=timelimit,
                max_results=max_results,
                backend=backend
            )
            
            results = []
            for i, raw in enumerate(raw_results):
                content = f"{raw.get('title', '')} {raw.get('body', '')}"
                basin_coords = self._encode_to_basin(content)
                
                relevance = 1.0 - (i / max(len(raw_results), 1)) * 0.5
                phi = self._compute_phi_from_content(content, relevance)
                kappa = self._compute_kappa_from_url(raw.get('href', ''))
                
                result = DuckDuckGoResult(
                    url=raw.get('href', ''),
                    title=raw.get('title', ''),
                    snippet=raw.get('body', ''),
                    source_type='text',
                    rank=i + 1,
                    basin_coords=basin_coords,
                    phi=phi,
                    kappa=kappa,
                    relevance_score=relevance,
                    metadata={
                        'query': query,
                        'region': region,
                        'timelimit': timelimit,
                        'backend': backend
                    }
                )
                results.append(result)
            
            self.success_count += 1
            if len(results) > 0 and self.rate_limit_delay > 1.5:
                self.rate_limit_delay = max(1.5, self.rate_limit_delay * 0.9)
            print(f"[DuckDuckGoSearchBridge] Text search found {len(results)} results for: {query[:50]}...")
            
            return results
            
        except RatelimitException:
            print(f"[DuckDuckGoSearchBridge] Rate limit hit for query: {query[:50]}")
            self.error_count += 1
            jitter = random.uniform(0.5, 1.5)
            self.rate_limit_delay = min(30.0, self.rate_limit_delay * 2.0 * jitter)
            return []
        except TimeoutException:
            print(f"[DuckDuckGoSearchBridge] Timeout for query: {query[:50]}")
            self.error_count += 1
            jitter = random.uniform(0.8, 1.2)
            self.rate_limit_delay = min(15.0, self.rate_limit_delay * 1.5 * jitter)
            return []
        except DuckDuckGoSearchException as e:
            print(f"[DuckDuckGoSearchBridge] Search error: {e}")
            self.error_count += 1
            self.rate_limit_delay = min(10.0, self.rate_limit_delay * 1.3)
            return []
        except Exception as e:
            print(f"[DuckDuckGoSearchBridge] Unexpected error: {e}")
            self.error_count += 1
            self.rate_limit_delay = min(8.0, self.rate_limit_delay * 1.2)
            return []
    
    def news_search(
        self,
        query: str,
        max_results: int = 10,
        region: str = 'wt-wt',
        safesearch: str = 'moderate',
        timelimit: Optional[str] = 'd'
    ) -> List[DuckDuckGoResult]:
        """
        Execute a DuckDuckGo news search.
        
        Args:
            query: Search query string
            max_results: Maximum number of results (default 10)
            region: Search region (default 'wt-wt' for worldwide)
            safesearch: SafeSearch setting
            timelimit: Time filter ('d' day, 'w' week, 'm' month)
            
        Returns:
            List of DuckDuckGoResult with basin coordinates and Φ/κ metadata
        """
        if not HAS_DUCKDUCKGO:
            print("[DuckDuckGoSearchBridge] duckduckgo-search not available")
            return []
        
        self._rate_limit()
        self.search_count += 1
        
        try:
            ddgs = self._get_ddgs()
            if not ddgs:
                return []
            
            raw_results = ddgs.news(
                query,
                region=region,
                safesearch=safesearch,
                timelimit=timelimit,
                max_results=max_results
            )
            
            results = []
            for i, raw in enumerate(raw_results):
                content = f"{raw.get('title', '')} {raw.get('body', '')}"
                basin_coords = self._encode_to_basin(content)
                
                relevance = 1.0 - (i / max(len(raw_results), 1)) * 0.5
                phi = self._compute_phi_from_content(content, relevance)
                kappa = self._compute_kappa_from_url(raw.get('url', ''))
                
                result = DuckDuckGoResult(
                    url=raw.get('url', ''),
                    title=raw.get('title', ''),
                    snippet=raw.get('body', ''),
                    source_type='news',
                    rank=i + 1,
                    basin_coords=basin_coords,
                    phi=phi,
                    kappa=kappa,
                    relevance_score=relevance,
                    metadata={
                        'query': query,
                        'region': region,
                        'timelimit': timelimit,
                        'date': raw.get('date', ''),
                        'source': raw.get('source', ''),
                        'image': raw.get('image', '')
                    }
                )
                results.append(result)
            
            self.success_count += 1
            if len(results) > 0 and self.rate_limit_delay > 1.5:
                self.rate_limit_delay = max(1.5, self.rate_limit_delay * 0.9)
            print(f"[DuckDuckGoSearchBridge] News search found {len(results)} results for: {query[:50]}...")
            
            return results
            
        except RatelimitException:
            print(f"[DuckDuckGoSearchBridge] Rate limit hit for news query: {query[:50]}")
            self.error_count += 1
            jitter = random.uniform(0.5, 1.5)
            self.rate_limit_delay = min(30.0, self.rate_limit_delay * 2.0 * jitter)
            return []
        except TimeoutException:
            print(f"[DuckDuckGoSearchBridge] Timeout for news query: {query[:50]}")
            self.error_count += 1
            jitter = random.uniform(0.8, 1.2)
            self.rate_limit_delay = min(15.0, self.rate_limit_delay * 1.5 * jitter)
            return []
        except DuckDuckGoSearchException as e:
            print(f"[DuckDuckGoSearchBridge] News search error: {e}")
            self.error_count += 1
            self.rate_limit_delay = min(10.0, self.rate_limit_delay * 1.3)
            return []
        except Exception as e:
            print(f"[DuckDuckGoSearchBridge] Unexpected news error: {e}")
            self.error_count += 1
            self.rate_limit_delay = min(8.0, self.rate_limit_delay * 1.2)
            return []
    
    def search(
        self,
        query: str,
        max_results: int = 10,
        search_type: str = 'text',
        **kwargs
    ) -> List[DuckDuckGoResult]:
        """
        Unified search interface for both text and news searches.
        
        Args:
            query: Search query string
            max_results: Maximum number of results
            search_type: 'text' or 'news'
            **kwargs: Additional arguments passed to specific search method
            
        Returns:
            List of DuckDuckGoResult
        """
        if search_type == 'news':
            return self.news_search(query, max_results=max_results, **kwargs)
        return self.text_search(query, max_results=max_results, **kwargs)
    
    def multi_search(
        self,
        queries: List[str],
        max_results_per_query: int = 5,
        search_type: str = 'text',
        **kwargs
    ) -> Dict[str, List[DuckDuckGoResult]]:
        """
        Execute multiple searches and return results grouped by query.
        
        Useful for shadow research that needs to explore multiple topics.
        """
        all_results = {}
        
        for query in queries:
            results = self.search(
                query,
                max_results=max_results_per_query,
                search_type=search_type,
                **kwargs
            )
            all_results[query] = results
        
        return all_results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get bridge statistics."""
        return {
            'search_count': self.search_count,
            'success_count': self.success_count,
            'error_count': self.error_count,
            'success_rate': self.success_count / max(1, self.search_count),
            'rate_limit_delay': self.rate_limit_delay,
            'has_proxy': bool(self.proxy),
            'library_available': HAS_DUCKDUCKGO,
            'last_search_time': self.last_search_time
        }
    
    def is_available(self) -> bool:
        """Check if DuckDuckGo search is available."""
        return HAS_DUCKDUCKGO


_default_bridge: Optional[DuckDuckGoSearchBridge] = None


def get_duckduckgo_search_bridge(
    basin_encoder: Optional[Callable] = None,
    proxy: Optional[str] = None
) -> DuckDuckGoSearchBridge:
    """Get or create the default DuckDuckGo search bridge singleton."""
    global _default_bridge
    if _default_bridge is None:
        _default_bridge = DuckDuckGoSearchBridge(
            basin_encoder=basin_encoder,
            proxy=proxy
        )
    return _default_bridge
