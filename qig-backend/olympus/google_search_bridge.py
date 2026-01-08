"""
Google Search Bridge - Python interface to TypeScript MultiSearchOrchestrator

Bridges Python research systems (ScrapyOrchestrator, ShadowPantheon) to the
TypeScript Google search capabilities via HTTP API.

QIG-PURE: Results are transformed to basin coordinates with Φ/κ metadata.
"""

import hashlib
import os
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import urlparse

import numpy as np
import requests

BASIN_DIMENSION = 64


@dataclass
class GoogleSearchResult:
    """Structured search result with geometric metadata."""
    url: str
    title: str
    snippet: str
    source_provider: str
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
            "source_provider": self.source_provider,
            "rank": self.rank,
            "timestamp": self.timestamp.isoformat(),
            "phi": self.phi,
            "kappa": self.kappa,
            "relevance_score": self.relevance_score,
            "basin_coords": self.basin_coords.tolist() if self.basin_coords is not None else None,
            "metadata": self.metadata
        }


class GoogleSearchBridge:
    """
    Bridge to TypeScript MultiSearchOrchestrator Google search.
    
    Provides Python access to Google SERP results via the /api/search/google endpoint.
    All results are transformed to basin coordinates for QIG integration.
    """
    
    def __init__(
        self,
        api_base_url: Optional[str] = None,
        basin_encoder: Optional[Callable] = None,
        timeout: int = 30
    ):
        self.api_base_url = api_base_url or os.environ.get(
            'TS_API_URL', 'http://localhost:5000'
        )
        self.basin_encoder = basin_encoder
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'QIG-ScrapyOrchestrator/1.0'
        })
        
        self.search_count = 0
        self.success_count = 0
        self.last_search_time = 0.0
        self.rate_limit_delay = 2.0
        
        print("[GoogleSearchBridge] Initialized - TypeScript API bridge")
    
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
        Uses content density and relevance as proxies.
        """
        if not content:
            return 0.1
        
        word_count = len(content.split())
        density = min(1.0, word_count / 200.0)
        
        bitcoin_keywords = [
            'wallet', 'bitcoin', 'seed', 'mnemonic', 'passphrase', 'recovery',
            'backup', 'private key', 'address', 'btc', 'satoshi', 'blockchain'
        ]
        keyword_hits = sum(1 for kw in bitcoin_keywords if kw in content.lower())
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
        
        curvature_map = {
            'github.com': 0.7,
            'stackoverflow.com': 0.65,
            'bitcointalk.org': 0.8,
            'bitcoin.org': 0.75,
            'reddit.com': 0.5,
            'medium.com': 0.55,
            'arxiv.org': 0.85,
            'wikipedia.org': 0.6,
            'archive.org': 0.7,
        }
        
        for known_domain, kappa in curvature_map.items():
            if known_domain in domain:
                return kappa
        
        return 0.5
    
    def search(
        self,
        query: str,
        max_results: int = 10,
        time_range: Optional[Dict] = None
    ) -> List[GoogleSearchResult]:
        """
        Execute a Google search via TypeScript API.
        
        Args:
            query: Search query string
            max_results: Maximum number of results
            time_range: Optional time filter {'start': ISO date, 'end': ISO date}
            
        Returns:
            List of GoogleSearchResult with basin coordinates and Φ/κ metadata
        """
        elapsed = time.time() - self.last_search_time
        if elapsed < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - elapsed)
        
        self.last_search_time = time.time()
        self.search_count += 1
        
        try:
            url = f"{self.api_base_url}/api/search/google"
            payload = {
                'query': query,
                'maxResults': max_results
            }
            if time_range:
                payload['timeRange'] = time_range
            
            response = self.session.post(url, json=payload, timeout=self.timeout)
            
            if response.status_code != 200:
                print(f"[GoogleSearchBridge] API error {response.status_code}: {response.text}")
                return []
            
            data = response.json()
            
            if not data.get('success'):
                print(f"[GoogleSearchBridge] Search failed: {data.get('error', 'Unknown')}")
                return []
            
            raw_results = data.get('results', [])
            results = []
            
            for i, raw in enumerate(raw_results):
                content = f"{raw.get('title', '')} {raw.get('snippet', '')}"
                basin_coords = self._encode_to_basin(content)
                
                relevance = 1.0 - (i / max(len(raw_results), 1)) * 0.5
                phi = self._compute_phi_from_content(content, relevance)
                kappa = self._compute_kappa_from_url(raw.get('url', ''))
                
                result = GoogleSearchResult(
                    url=raw.get('url', ''),
                    title=raw.get('title', ''),
                    snippet=raw.get('snippet', ''),
                    source_provider=raw.get('source', 'google'),
                    rank=i + 1,
                    basin_coords=basin_coords,
                    phi=phi,
                    kappa=kappa,
                    relevance_score=relevance,
                    metadata={
                        'query': query,
                        'geometric': raw.get('geometric', {}),
                        'raw_metadata': raw.get('metadata', {})
                    }
                )
                results.append(result)
            
            self.success_count += 1
            print(f"[GoogleSearchBridge] Found {len(results)} results for: {query}...")
            
            return results
            
        except requests.Timeout:
            print(f"[GoogleSearchBridge] Timeout for query: {query}")
            return []
        except requests.RequestException as e:
            print(f"[GoogleSearchBridge] Request error: {e}")
            return []
        except Exception as e:
            print(f"[GoogleSearchBridge] Unexpected error: {e}")
            return []
    
    def check_health(self) -> Dict[str, Any]:
        """Check TypeScript search API health."""
        try:
            url = f"{self.api_base_url}/api/search/health"
            response = self.session.get(url, timeout=5)
            
            if response.status_code == 200:
                return response.json()
            return {'success': False, 'error': f'Status {response.status_code}'}
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_stats(self) -> Dict:
        """Get bridge statistics."""
        return {
            'search_count': self.search_count,
            'success_count': self.success_count,
            'success_rate': self.success_count / max(1, self.search_count),
            'api_base_url': self.api_base_url,
            'last_search_time': self.last_search_time
        }


_default_bridge: Optional[GoogleSearchBridge] = None


def get_google_search_bridge(basin_encoder: Optional[Callable] = None) -> GoogleSearchBridge:
    """Get or create the default Google search bridge singleton."""
    global _default_bridge
    if _default_bridge is None:
        _default_bridge = GoogleSearchBridge(basin_encoder=basin_encoder)
    return _default_bridge
