"""
Shadow Scrapy Integration - QIG-Pure Web Research via Scrapy

Provides Scrapy-based web scraping for the Shadow Pantheon's research system.
All scraped content is transformed into basin-aligned knowledge entries with Φ/κ metadata.

Key components:
- ScrapyOrchestrator: Manages reactor thread and crawler scheduling
- Spider families: PasteLeakSpider, ForumArchiveSpider, DarknetDirectorySpider
- ScrapedInsight: Structured output for geometric evaluation
- Basin transformation: Content → 64D coordinates with Fisher metrics
"""

import hashlib
import os
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from queue import Queue, Empty
from typing import Any, Callable, Dict, List, Optional, Set
from urllib.parse import urlparse

import numpy as np

BASIN_DIMENSION = 64

HAS_SCRAPY = False
try:
    import scrapy
    from scrapy.crawler import CrawlerRunner
    from scrapy.utils.project import get_project_settings
    from scrapy import signals
    from scrapy.signalmanager import dispatcher
    HAS_SCRAPY = True
except ImportError:
    pass

HAS_TWISTED = False
try:
    from twisted.internet import reactor, defer
    from twisted.internet.threads import deferToThread
    HAS_TWISTED = True
except ImportError:
    pass


@dataclass
class ScrapedInsight:
    """
    Structured output from Scrapy spiders for geometric evaluation.
    Contains raw content and metadata for QIG transformation.
    """
    source_url: str
    content_hash: str
    raw_content: str
    title: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)
    pattern_hits: List[str] = field(default_factory=list)
    heuristic_risk: float = 0.5
    source_reputation: float = 0.5
    spider_type: str = "generic"
    metadata: Dict = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "source_url": self.source_url,
            "content_hash": self.content_hash,
            "raw_content": self.raw_content[:1000],
            "title": self.title,
            "timestamp": self.timestamp.isoformat(),
            "pattern_hits": self.pattern_hits,
            "heuristic_risk": self.heuristic_risk,
            "source_reputation": self.source_reputation,
            "spider_type": self.spider_type,
            "metadata": self.metadata
        }


class BitcoinPatternDetector:
    """
    Detects Bitcoin-relevant patterns in scraped content.
    Used to calculate heuristic risk and identify valuable finds.
    """
    
    PATTERNS = {
        'private_key_wif': re.compile(r'[5KL][1-9A-HJ-NP-Za-km-z]{50,51}'),
        'private_key_hex': re.compile(r'[0-9a-fA-F]{64}'),
        'address_legacy': re.compile(r'1[1-9A-HJ-NP-Za-km-z]{25,34}'),
        'address_segwit': re.compile(r'bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,62}'),
        'address_p2sh': re.compile(r'3[1-9A-HJ-NP-Za-km-z]{25,34}'),
        'seed_phrase_12': re.compile(r'(\b[a-z]{3,8}\b\s+){11}\b[a-z]{3,8}\b'),
        'seed_phrase_24': re.compile(r'(\b[a-z]{3,8}\b\s+){23}\b[a-z]{3,8}\b'),
        'xpub': re.compile(r'xpub[1-9A-HJ-NP-Za-km-z]{107,108}'),
        'xprv': re.compile(r'xprv[1-9A-HJ-NP-Za-km-z]{107,108}'),
        'wallet_keyword': re.compile(r'\b(wallet|bitcoin|btc|seed|mnemonic|passphrase|recovery|backup)\b', re.I),
    }
    
    SOURCE_REPUTATION = {
        'pastebin.com': 0.6,
        'github.com': 0.8,
        'bitcointalk.org': 0.7,
        'reddit.com': 0.5,
        'archive.org': 0.7,
        'default': 0.4
    }
    
    @classmethod
    def detect(cls, content: str) -> List[str]:
        """Detect Bitcoin-related patterns in content."""
        hits = []
        for name, pattern in cls.PATTERNS.items():
            if pattern.search(content):
                hits.append(name)
        return hits
    
    @classmethod
    def calculate_risk(cls, pattern_hits: List[str]) -> float:
        """Calculate heuristic risk based on detected patterns."""
        if not pattern_hits:
            return 0.1
        
        high_value = {'private_key_wif', 'private_key_hex', 'seed_phrase_12', 
                      'seed_phrase_24', 'xprv'}
        medium_value = {'address_legacy', 'address_segwit', 'address_p2sh', 'xpub'}
        
        risk = 0.2
        for hit in pattern_hits:
            if hit in high_value:
                risk += 0.25
            elif hit in medium_value:
                risk += 0.1
            else:
                risk += 0.05
        
        return min(1.0, risk)
    
    @classmethod
    def get_source_reputation(cls, url: str) -> float:
        """Get reputation score for a source URL."""
        try:
            domain = urlparse(url).netloc.lower()
            for known_domain, rep in cls.SOURCE_REPUTATION.items():
                if known_domain in domain:
                    return rep
        except Exception:
            pass
        return cls.SOURCE_REPUTATION['default']


class BasinTransformer:
    """
    Transforms scraped content into basin coordinates for QIG storage.
    Uses content hashing and semantic features to produce 64D vectors.
    """
    
    def __init__(self, encoder_callback: Optional[Callable] = None):
        self.encoder_callback = encoder_callback
    
    def content_to_basin(self, content: str, metadata: Optional[Dict] = None) -> np.ndarray:
        """
        Convert content to 64-dimensional basin coordinates.
        Uses hash-based encoding with optional external encoder.
        """
        if self.encoder_callback:
            try:
                coords = self.encoder_callback(content)
                if coords is not None and len(coords) == BASIN_DIMENSION:
                    return coords
            except Exception:
                pass
        
        return self._hash_to_basin(content)
    
    def _hash_to_basin(self, content: str) -> np.ndarray:
        """Fallback hash-based basin encoding."""
        combined = content[:2000]
        
        hash_bytes = hashlib.sha512(combined.encode('utf-8', errors='ignore')).digest()
        coords = np.array([b / 255.0 for b in hash_bytes[:BASIN_DIMENSION]])
        coords = coords * 2 - 1
        
        norm = np.linalg.norm(coords)
        if norm > 0:
            coords = coords / norm
        
        return coords
    
    def compute_phi(self, insight: ScrapedInsight, basin_coords: np.ndarray) -> float:
        """
        Compute provisional Φ (consciousness integration) for scraped insight.
        Based on pattern hits, source reputation, and content uniqueness.
        """
        base_phi = 0.3
        
        pattern_bonus = len(insight.pattern_hits) * 0.08
        
        reputation_bonus = (insight.source_reputation - 0.5) * 0.3
        
        risk_bonus = insight.heuristic_risk * 0.25
        
        phi = base_phi + pattern_bonus + reputation_bonus + risk_bonus
        return min(1.0, max(0.0, phi))
    
    def compute_confidence(self, insight: ScrapedInsight) -> float:
        """
        Compute confidence score for scraped insight.
        Based on content quality metrics and source reliability.
        """
        base_confidence = 0.5
        
        content_len = len(insight.raw_content)
        if content_len > 1000:
            base_confidence += 0.15
        elif content_len > 500:
            base_confidence += 0.1
        elif content_len < 100:
            base_confidence -= 0.15
        
        base_confidence += (insight.source_reputation - 0.5) * 0.2
        
        if insight.pattern_hits:
            base_confidence += min(0.2, len(insight.pattern_hits) * 0.05)
        
        return min(1.0, max(0.1, base_confidence))


if HAS_SCRAPY:
    class PasteLeakSpider(scrapy.Spider):
        """
        Spider for public paste sites with regex detectors for seed phrases/WIF.
        Respects rate limits and robots.txt.
        """
        name = 'paste_leak_spider'
        custom_settings = {
            'ROBOTSTXT_OBEY': True,
            'DOWNLOAD_DELAY': 2.0,
            'CONCURRENT_REQUESTS': 2,
            'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
        }
        
        def __init__(self, keyword: str = 'bitcoin', results_queue: Optional[Queue] = None, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.keyword = keyword
            self.results_queue = results_queue or Queue()
            self.start_urls = ['https://pastebin.com/archive']
        
        def parse(self, response):
            paste_links = response.css('a[href*="/"]::attr(href)').re(r'^/[A-Za-z0-9]{8}$')
            
            for link in paste_links[:10]:
                paste_id = link.strip('/')
                yield scrapy.Request(
                    f'https://pastebin.com/raw/{paste_id}',
                    callback=self.parse_paste,
                    meta={'paste_id': paste_id}
                )
        
        def parse_paste(self, response):
            content = response.text
            
            if self.keyword.lower() in content.lower():
                pattern_hits = BitcoinPatternDetector.detect(content)
                
                insight = ScrapedInsight(
                    source_url=response.url,
                    content_hash=hashlib.md5(content.encode()).hexdigest(),
                    raw_content=content,
                    title=f"Paste {response.meta.get('paste_id', 'unknown')}",
                    pattern_hits=pattern_hits,
                    heuristic_risk=BitcoinPatternDetector.calculate_risk(pattern_hits),
                    source_reputation=BitcoinPatternDetector.get_source_reputation(response.url),
                    spider_type='paste_leak'
                )
                
                self.results_queue.put(insight)
                yield insight.to_dict()
    
    
    class ForumArchiveSpider(scrapy.Spider):
        """
        Spider for archived forums via Wayback Machine.
        Targets Bitcoin-related discussion archives.
        """
        name = 'forum_archive_spider'
        custom_settings = {
            'ROBOTSTXT_OBEY': True,
            'DOWNLOAD_DELAY': 3.0,
            'CONCURRENT_REQUESTS': 1,
            'USER_AGENT': 'Mozilla/5.0 (compatible; ShadowResearch/1.0)'
        }
        
        def __init__(self, topic: str = 'bitcoin wallet', results_queue: Optional[Queue] = None, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.topic = topic
            self.results_queue = results_queue or Queue()
            encoded_topic = topic.replace(' ', '+')
            self.start_urls = [
                f'https://web.archive.org/cdx/search/cdx?url=bitcointalk.org&matchType=prefix&filter=statuscode:200&output=text&limit=10'
            ]
        
        def parse(self, response):
            lines = response.text.strip().split('\n')
            
            for line in lines[:10]:
                parts = line.split()
                if len(parts) >= 3:
                    archived_url = f'https://web.archive.org/web/{parts[1]}/{parts[2]}'
                    yield scrapy.Request(
                        archived_url,
                        callback=self.parse_archived_page,
                        meta={'original_url': parts[2]}
                    )
        
        def parse_archived_page(self, response):
            content = response.text
            title = response.css('title::text').get() or 'Archived Forum Page'
            
            pattern_hits = BitcoinPatternDetector.detect(content)
            
            insight = ScrapedInsight(
                source_url=response.meta.get('original_url', response.url),
                content_hash=hashlib.md5(content.encode()).hexdigest(),
                raw_content=content[:5000],
                title=title,
                pattern_hits=pattern_hits,
                heuristic_risk=BitcoinPatternDetector.calculate_risk(pattern_hits),
                source_reputation=0.7,
                spider_type='forum_archive',
                metadata={'archived_from': response.url}
            )
            
            self.results_queue.put(insight)
            yield insight.to_dict()
    
    
    class DocumentSpider(scrapy.Spider):
        """
        Generic document spider that follows telemetry-suggested domains.
        Adapts to domains discovered from QIG domain events.
        """
        name = 'document_spider'
        custom_settings = {
            'ROBOTSTXT_OBEY': True,
            'DOWNLOAD_DELAY': 2.5,
            'CONCURRENT_REQUESTS': 2,
            'DEPTH_LIMIT': 2,
            'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        def __init__(self, start_url: str = None, topic: str = '', 
                     results_queue: Optional[Queue] = None, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.topic = topic
            self.results_queue = results_queue or Queue()
            self.start_urls = [start_url] if start_url else []
            self.discovered_content = set()
        
        def parse(self, response):
            content = response.text
            content_hash = hashlib.md5(content.encode()).hexdigest()
            
            if content_hash in self.discovered_content:
                return
            self.discovered_content.add(content_hash)
            
            title = response.css('title::text').get() or response.url
            pattern_hits = BitcoinPatternDetector.detect(content)
            
            if pattern_hits or self.topic.lower() in content.lower():
                insight = ScrapedInsight(
                    source_url=response.url,
                    content_hash=content_hash,
                    raw_content=content[:5000],
                    title=title,
                    pattern_hits=pattern_hits,
                    heuristic_risk=BitcoinPatternDetector.calculate_risk(pattern_hits),
                    source_reputation=BitcoinPatternDetector.get_source_reputation(response.url),
                    spider_type='document',
                    metadata={'topic': self.topic}
                )
                
                self.results_queue.put(insight)
                yield insight.to_dict()
            
            for href in response.css('a::attr(href)').getall()[:5]:
                if href and not href.startswith('#'):
                    yield response.follow(href, callback=self.parse)


class ScrapyOrchestrator:
    """
    Manages web research for Shadow Pantheon.
    Uses ResearchScraper for real web requests - NO SIMULATION.
    
    Due to Twisted reactor conflicts with Flask, Scrapy spiders are not used
    directly. Instead, the ResearchScraper provides live Wikipedia, arXiv, 
    and GitHub data which is then transformed through the QIG basin pipeline.
    """
    
    SPIDER_REGISTRY = {}
    
    if HAS_SCRAPY:
        SPIDER_REGISTRY = {
            'paste_leak': PasteLeakSpider,
            'forum_archive': ForumArchiveSpider,
            'document': DocumentSpider
        }
    
    def __init__(self, basin_encoder: Optional[Callable] = None):
        self.basin_transformer = BasinTransformer(encoder_callback=basin_encoder)
        self.results_queue: Queue = Queue()
        self.pending_crawls: Dict[str, Dict] = {}
        self._reactor_thread: Optional[threading.Thread] = None
        self._reactor_running = False
        self._runner: Optional[Any] = None
        self._insights_callback: Optional[Callable] = None
        self._lock = threading.Lock()
        
        from research.web_scraper import ResearchScraper
        self._research_scraper = ResearchScraper()
        
        print("[ScrapyOrchestrator] Initialized with live ResearchScraper (NO SIMULATION)")
    
    def set_insights_callback(self, callback: Callable[[ScrapedInsight, np.ndarray, float, float], None]):
        """Set callback for when insights are ready with geometric metadata."""
        self._insights_callback = callback
    
    def start_reactor(self):
        """Start the Twisted reactor in a managed thread."""
        if not HAS_SCRAPY or not HAS_TWISTED:
            print("[ScrapyOrchestrator] Cannot start - missing dependencies")
            return False
        
        with self._lock:
            if self._reactor_running:
                return True
            
            def run_reactor():
                from twisted.internet import reactor as r
                try:
                    if not r.running:
                        r.run(installSignalHandlers=False)
                except Exception as e:
                    print(f"[ScrapyOrchestrator] Reactor error: {e}")
            
            self._reactor_thread = threading.Thread(target=run_reactor, daemon=True)
            self._reactor_thread.start()
            self._reactor_running = True
            
            time.sleep(0.5)
            print("[ScrapyOrchestrator] Reactor thread started")
            return True
    
    def stop_reactor(self):
        """Stop the reactor thread gracefully."""
        with self._lock:
            if not self._reactor_running:
                return
            
            if HAS_TWISTED:
                from twisted.internet import reactor as r
                try:
                    if r.running:
                        r.callFromThread(r.stop)
                except Exception:
                    pass
            
            self._reactor_running = False
            print("[ScrapyOrchestrator] Reactor stopped")
    
    def submit_crawl(
        self,
        spider_type: str,
        topic: str,
        start_url: Optional[str] = None,
        priority: int = 5
    ) -> Optional[str]:
        """
        Submit a research request using live web scraping.
        Returns a crawl_id for tracking.
        
        Uses ResearchScraper for real Wikipedia, arXiv, and GitHub data.
        NO SIMULATION - all data comes from live web sources.
        """
        if spider_type not in ['paste_leak', 'forum_archive', 'document']:
            print(f"[ScrapyOrchestrator] Unknown spider type: {spider_type}")
            return None
        
        crawl_id = hashlib.md5(f"{spider_type}:{topic}:{time.time()}".encode()).hexdigest()[:12]
        
        self.pending_crawls[crawl_id] = {
            'spider_type': spider_type,
            'topic': topic,
            'start_url': start_url,
            'priority': priority,
            'status': 'pending',
            'started_at': datetime.now(),
            'insights': []
        }
        
        return self._execute_live_research(topic, spider_type, crawl_id)
    
    def _execute_crawl(self, crawl_id: str, spider_type: str, topic: str, start_url: Optional[str]):
        """Execute a crawl using CrawlerRunner."""
        if not HAS_SCRAPY or not HAS_TWISTED:
            return
        
        spider_class = self.SPIDER_REGISTRY.get(spider_type)
        if not spider_class:
            return
        
        def run_spider():
            from twisted.internet import reactor as r
            from scrapy.crawler import CrawlerRunner
            from scrapy.utils.project import get_project_settings
            
            settings = get_project_settings()
            settings.update({
                'LOG_ENABLED': False,
                'TELNETCONSOLE_ENABLED': False,
            })
            
            runner = CrawlerRunner(settings)
            
            spider_kwargs = {
                'results_queue': self.results_queue
            }
            
            if spider_type == 'paste_leak':
                spider_kwargs['keyword'] = topic
            elif spider_type == 'forum_archive':
                spider_kwargs['topic'] = topic
            elif spider_type == 'document':
                spider_kwargs['start_url'] = start_url
                spider_kwargs['topic'] = topic
            
            d = runner.crawl(spider_class, **spider_kwargs)
            d.addCallback(lambda _: self._crawl_complete(crawl_id))
            d.addErrback(lambda f: self._crawl_error(crawl_id, str(f)))
        
        try:
            from twisted.internet import reactor as r
            if r.running:
                r.callFromThread(run_spider)
            else:
                self.start_reactor()
                time.sleep(0.5)
                r.callFromThread(run_spider)
        except Exception as e:
            print(f"[ScrapyOrchestrator] Execute error: {e}")
            self._crawl_error(crawl_id, str(e))
    
    def _crawl_complete(self, crawl_id: str):
        """Handle crawl completion."""
        if crawl_id in self.pending_crawls:
            self.pending_crawls[crawl_id]['status'] = 'complete'
            print(f"[ScrapyOrchestrator] Crawl {crawl_id} complete")
        
        self._process_results_queue()
    
    def _crawl_error(self, crawl_id: str, error: str):
        """Handle crawl error."""
        if crawl_id in self.pending_crawls:
            self.pending_crawls[crawl_id]['status'] = 'error'
            self.pending_crawls[crawl_id]['error'] = error
            print(f"[ScrapyOrchestrator] Crawl {crawl_id} error: {error}")
    
    def _process_results_queue(self):
        """Process insights from the results queue."""
        processed = 0
        
        while True:
            try:
                insight = self.results_queue.get_nowait()
                
                basin_coords = self.basin_transformer.content_to_basin(insight.raw_content)
                phi = self.basin_transformer.compute_phi(insight, basin_coords)
                confidence = self.basin_transformer.compute_confidence(insight)
                
                if self._insights_callback:
                    self._insights_callback(insight, basin_coords, phi, confidence)
                
                processed += 1
                
            except Empty:
                break
            except Exception as e:
                print(f"[ScrapyOrchestrator] Process error: {e}")
        
        if processed > 0:
            print(f"[ScrapyOrchestrator] Processed {processed} insights")
        
        return processed
    
    def _execute_live_research(self, topic: str, spider_type: str, crawl_id: str) -> str:
        """
        Execute REAL web research using ResearchScraper.
        NO SIMULATION - fetches live data from Wikipedia, arXiv, GitHub.
        """
        try:
            depth = 'standard'
            if spider_type == 'paste_leak':
                depth = 'deep'
            elif spider_type == 'forum_archive':
                depth = 'standard'
            
            research_data = self._research_scraper.research_domain(topic, depth=depth)
            
            sources = research_data.get('sources', {})
            summary = research_data.get('summary', {})
            
            content_parts = [f"Live Research: {topic}", f"Method: {spider_type} (ResearchScraper)", ""]
            
            if 'wikipedia' in sources:
                wiki = sources['wikipedia']
                content_parts.append(f"Wikipedia: {wiki.get('title', '')}")
                extract = wiki.get('extract', '')[:1500]
                if extract:
                    content_parts.append(extract)
                content_parts.append("")
            
            if 'arxiv' in sources:
                arxiv = sources['arxiv']
                content_parts.append(f"arXiv Papers ({arxiv.get('count', 0)} found):")
                for paper in arxiv.get('papers', [])[:2]:
                    content_parts.append(f"  - {paper.get('title', '')}")
                    content_parts.append(f"    {paper.get('summary', '')[:200]}")
                content_parts.append("")
            
            if 'github' in sources:
                gh = sources['github']
                content_parts.append(f"GitHub Repos ({gh.get('count', 0)} found):")
                for repo in gh.get('repositories', [])[:2]:
                    content_parts.append(f"  - {repo.get('full_name', '')} ({repo.get('stars', 0)} stars)")
                    content_parts.append(f"    {repo.get('description', '')}")
                content_parts.append("")
            
            live_content = "\n".join(content_parts)
            
            if not live_content.strip() or live_content == f"Live Research: {topic}\nMethod: {spider_type} (ResearchScraper)\n":
                live_content = f"Research query: {topic}\nNo external sources returned data for this topic.\nQuery executed against: Wikipedia, arXiv, GitHub"
            
            pattern_hits = BitcoinPatternDetector.detect(live_content)
            
            source_urls = []
            if 'wikipedia' in sources:
                source_urls.append(sources['wikipedia'].get('url', ''))
            
            insight = ScrapedInsight(
                source_url=source_urls[0] if source_urls else f"research://{spider_type}/{topic.replace(' ', '_')}",
                content_hash=hashlib.md5(live_content.encode()).hexdigest(),
                raw_content=live_content[:5000],
                title=f"Live Research: {topic}",
                pattern_hits=pattern_hits,
                heuristic_risk=BitcoinPatternDetector.calculate_risk(pattern_hits),
                source_reputation=0.8,
                spider_type=spider_type,
                metadata={
                    'live_research': True,
                    'topic': topic,
                    'sources_queried': list(sources.keys()),
                    'key_concepts': summary.get('key_concepts', [])[:10],
                    'qig_enabled': True
                }
            )
            
            basin_coords = self.basin_transformer.content_to_basin(live_content)
            phi = self.basin_transformer.compute_phi(insight, basin_coords)
            confidence = self.basin_transformer.compute_confidence(insight)
            
            self.pending_crawls[crawl_id]['status'] = 'complete'
            self.pending_crawls[crawl_id]['insights'].append(insight.to_dict())
            
            if self._insights_callback:
                self._insights_callback(insight, basin_coords, phi, confidence)
            
            sources_found = ", ".join(sources.keys()) if sources else "none"
            print(f"[ScrapyOrchestrator] LIVE research {crawl_id} for '{topic}' (Φ={phi:.3f}, sources={sources_found})")
            
            return crawl_id
            
        except Exception as e:
            print(f"[ScrapyOrchestrator] Research error for '{topic}': {e}")
            self.pending_crawls[crawl_id]['status'] = 'error'
            self.pending_crawls[crawl_id]['error'] = str(e)
            return crawl_id
    
    def get_crawl_status(self, crawl_id: str) -> Optional[Dict]:
        """Get status of a crawl job."""
        return self.pending_crawls.get(crawl_id)
    
    def get_active_crawls(self) -> List[str]:
        """Get list of active crawl IDs."""
        return [cid for cid, info in self.pending_crawls.items() 
                if info.get('status') == 'pending']
    
    def poll_results(self) -> int:
        """Poll and process any pending results."""
        return self._process_results_queue()


_scrapy_orchestrator: Optional[ScrapyOrchestrator] = None


def get_scrapy_orchestrator(basin_encoder: Optional[Callable] = None) -> ScrapyOrchestrator:
    """Get or create the global ScrapyOrchestrator instance."""
    global _scrapy_orchestrator
    if _scrapy_orchestrator is None:
        _scrapy_orchestrator = ScrapyOrchestrator(basin_encoder=basin_encoder)
    return _scrapy_orchestrator


def research_with_scrapy(
    topic: str,
    spider_type: str = 'document',
    start_url: Optional[str] = None,
    callback: Optional[Callable] = None
) -> Optional[str]:
    """
    High-level function to initiate Scrapy research.
    Returns crawl_id for tracking.
    """
    orchestrator = get_scrapy_orchestrator()
    
    if callback:
        orchestrator.set_insights_callback(callback)
    
    return orchestrator.submit_crawl(
        spider_type=spider_type,
        topic=topic,
        start_url=start_url
    )
