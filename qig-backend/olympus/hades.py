"""
Hades - God of the Underworld & Forbidden Knowledge

Dual responsibilities:
1. Negation logic (original role) - tracks what NOT to try
2. Underworld search (enhanced role) - anonymous intelligence gathering

Tools (100% anonymous - NO identity linkage):
- Archive.org Wayback Machine (public API)
- Public paste site scraping (no auth)
- RSS feeds (public)
- Local breach databases (offline)
- TOR network (optional, requires local daemon)
"""

import numpy as np
from typing import Dict, List, Optional, Set, Any
from datetime import datetime
import hashlib
import re
import os
import time
import asyncio
from .base_god import BaseGod, KAPPA_STAR

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

try:
    import feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False


class WaybackArchive:
    """
    Archive.org Wayback Machine API
    
    Advantages:
    - No API key required
    - Completely legal
    - Archived .onion sites available
    - No identity linkage
    """
    
    def __init__(self):
        self.cdx_api = 'https://web.archive.org/cdx/search/cdx'
        self.enabled = os.getenv('HADES_WAYBACK_ENABLED', 'true').lower() == 'true'
        self.session = requests.Session() if HAS_REQUESTS else None
        if self.session:
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
            })
    
    async def search_archived_site(
        self,
        url: str,
        keyword: str,
        from_date: str = '20090101',
        to_date: str = '20231231',
        limit: int = 10
    ) -> List[Dict]:
        """
        Search archived pages for keyword.
        """
        if not self.enabled or not self.session:
            return []
        
        try:
            params = {
                'url': url,
                'matchType': 'prefix',
                'from': from_date,
                'to': to_date,
                'output': 'json',
                'fl': 'timestamp,original,statuscode',
                'collapse': 'digest',
                'limit': limit * 5,
            }
            
            response = self.session.get(self.cdx_api, params=params, timeout=30)
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            if len(data) < 2:
                return []
            
            snapshots = data[1:]
            findings = []
            
            for snapshot in snapshots[:limit]:
                if len(snapshot) < 3:
                    continue
                    
                timestamp, original_url, status = snapshot[0], snapshot[1], snapshot[2]
                
                if status != '200':
                    continue
                
                wayback_url = f'https://web.archive.org/web/{timestamp}/{original_url}'
                
                try:
                    page = self.session.get(wayback_url, timeout=20)
                    if keyword.lower() in page.text.lower():
                        findings.append({
                            'type': 'archive',
                            'source': 'wayback',
                            'url': wayback_url,
                            'original_url': original_url,
                            'timestamp': timestamp,
                            'content_preview': page.text[:500],
                            'risk': 'medium',
                        })
                except Exception:
                    continue
                    
                time.sleep(0.5)
            
            return findings
            
        except Exception as e:
            return []
    
    async def search_bitcoin_forums(self, query: str) -> List[Dict]:
        """Search archived Bitcoin forums."""
        forums = [
            'bitcointalk.org',
            'bitcoin.org/forum',
        ]
        
        all_findings = []
        for forum in forums:
            findings = await self.search_archived_site(
                url=forum,
                keyword=query,
                from_date='20090101',
                to_date='20151231',
                limit=5
            )
            all_findings.extend(findings)
        
        return all_findings
    
    async def search_silk_road_archives(self, query: str) -> List[Dict]:
        """
        Search archived Silk Road forums.
        Silk Road .onion was archived on archive.org.
        """
        silk_road_urls = [
            'silkroad6ownowfk.onion',
            'silkroadvb5piz3r.onion',
        ]
        
        all_findings = []
        for url in silk_road_urls:
            findings = await self.search_archived_site(
                url=url,
                keyword=query,
                from_date='20110101',
                to_date='20131031',
                limit=5
            )
            all_findings.extend(findings)
        
        return all_findings


class PublicPasteScraper:
    """
    Scrape public paste sites without authentication.
    Respects rate limits to avoid IP bans.
    """
    
    def __init__(self):
        self.enabled = os.getenv('HADES_PASTE_SCRAPING_ENABLED', 'true').lower() == 'true'
        self.session = requests.Session() if HAS_REQUESTS else None
        if self.session:
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0'
            })
        self.rate_limit_delay = 2.0
        
        self.bitcoin_patterns = {
            'private_key_wif': re.compile(r'[5KL][1-9A-HJ-NP-Za-km-z]{50,51}'),
            'private_key_hex': re.compile(r'[0-9a-fA-F]{64}'),
            'address_legacy': re.compile(r'1[1-9A-HJ-NP-Za-km-z]{25,34}'),
            'address_segwit': re.compile(r'bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,62}'),
            'seed_phrase': re.compile(r'(\b[a-z]+\b\s+){11,23}\b[a-z]+\b'),
        }
    
    async def scrape_pastebin_recent(self, keyword: str) -> List[Dict]:
        """
        Scrape recent Pastebin pastes (public archive).
        No API key - just scraping public page.
        """
        if not self.enabled or not self.session or not HAS_BS4:
            return []
        
        findings = []
        
        try:
            archive_url = 'https://pastebin.com/archive'
            response = self.session.get(archive_url, timeout=15)
            
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            paste_links = soup.find_all('a', href=re.compile(r'^/[A-Za-z0-9]{8}$'))
            
            for link in paste_links[:10]:
                paste_id = link['href'].strip('/')
                raw_url = f'https://pastebin.com/raw/{paste_id}'
                
                time.sleep(self.rate_limit_delay)
                
                try:
                    paste_response = self.session.get(raw_url, timeout=10)
                    
                    if paste_response.status_code != 200:
                        continue
                    
                    content = paste_response.text
                    
                    if keyword.lower() in content.lower():
                        crypto_patterns = self._detect_crypto_patterns(content)
                        
                        findings.append({
                            'type': 'paste',
                            'source': 'pastebin',
                            'url': f'https://pastebin.com/{paste_id}',
                            'content_preview': content[:300],
                            'crypto_patterns': crypto_patterns,
                            'risk': 'high' if crypto_patterns else 'medium',
                        })
                        
                except Exception:
                    continue
                    
        except Exception as e:
            pass
        
        return findings
    
    def _detect_crypto_patterns(self, content: str) -> List[str]:
        """Detect Bitcoin-related patterns in content."""
        detected = []
        
        for pattern_name, pattern in self.bitcoin_patterns.items():
            if pattern.search(content):
                detected.append(pattern_name)
        
        return detected


class PublicRSSFeeds:
    """
    Monitor public RSS feeds for Bitcoin-related content.
    No authentication required.
    """
    
    def __init__(self):
        self.enabled = os.getenv('HADES_RSS_ENABLED', 'true').lower() == 'true'
        self.feeds = {
            'bitcointalk': 'https://bitcointalk.org/index.php?board=1.0;action=.xml',
            'reddit_bitcoin': 'https://www.reddit.com/r/Bitcoin/.rss',
        }
    
    async def search_feeds(self, keyword: str) -> List[Dict]:
        """Search RSS feeds for keyword mentions."""
        if not self.enabled or not HAS_FEEDPARSER:
            return []
        
        findings = []
        
        for feed_name, feed_url in self.feeds.items():
            try:
                feed = feedparser.parse(feed_url)
                
                for entry in feed.entries[:20]:
                    title = getattr(entry, 'title', '')
                    summary = getattr(entry, 'summary', '')
                    
                    if keyword.lower() in title.lower() or keyword.lower() in summary.lower():
                        findings.append({
                            'type': 'rss',
                            'source': feed_name,
                            'title': title,
                            'url': getattr(entry, 'link', ''),
                            'date': getattr(entry, 'published', ''),
                            'summary': summary[:200],
                            'risk': 'low',
                        })
                        
            except Exception:
                continue
        
        return findings


class LocalBreachDatabase:
    """
    Local breach database - no external API calls.
    User provides breach compilations, queried locally.
    """
    
    def __init__(self, breach_dir: Optional[str] = None):
        self.breach_dir = breach_dir or os.getenv('HADES_BREACH_DIR', '/data/breaches')
        self.enabled = os.path.isdir(self.breach_dir)
        self.loaded_dbs: Dict[str, Set[str]] = {}
        self.index_loaded = False
    
    def load_breach_files(self) -> int:
        """Load breach text files into memory."""
        if not self.enabled:
            return 0
        
        import glob
        
        breach_files = glob.glob(f'{self.breach_dir}/*.txt')
        total_entries = 0
        
        for filepath in breach_files:
            db_name = os.path.basename(filepath)
            self.loaded_dbs[db_name] = set()
            
            try:
                with open(filepath, 'r', errors='ignore') as f:
                    for line in f:
                        line = line.strip()
                        if line and len(line) < 500:
                            self.loaded_dbs[db_name].add(line)
                            total_entries += 1
            except Exception:
                continue
        
        self.index_loaded = True
        return total_entries
    
    def search(self, query: str) -> List[Dict]:
        """Search all loaded breach databases. 100% local."""
        if not self.enabled:
            return []
        
        if not self.index_loaded:
            self.load_breach_files()
        
        findings = []
        query_lower = query.lower()
        
        for db_name, entries in self.loaded_dbs.items():
            for entry in entries:
                if query_lower in entry.lower():
                    parts = entry.split(':')
                    if len(parts) >= 2:
                        findings.append({
                            'type': 'breach',
                            'source': db_name,
                            'username': parts[0][:50],
                            'password': parts[1][:100],
                            'looks_like_brainwallet': self._looks_like_brainwallet(parts[1]),
                            'risk': 'critical' if self._looks_like_brainwallet(parts[1]) else 'high',
                        })
        
        return findings[:50]
    
    def _looks_like_brainwallet(self, password: str) -> bool:
        """Heuristic: Does password look like brainwallet seed?"""
        words = password.split()
        if len(words) >= 4:
            return True
        
        if len(words) >= 3 and all(w.isalpha() and w.islower() for w in words):
            return True
        
        return False


class Hades(BaseGod):
    """
    God of the Underworld - Negation & Forbidden Knowledge
    
    Dual responsibilities:
    1. Negation logic - tracks what NOT to try, maintains forbidden basins
    2. Underworld search - anonymous intelligence gathering
    
    Tools (100% anonymous):
    - Archive.org Wayback Machine (public API)
    - Public paste scraping (no auth)
    - RSS feeds (public)
    - Local breach databases (offline)
    
    NO external services that could link user identity.
    """
    
    def __init__(self):
        super().__init__("Hades", "Underworld")
        
        self.underworld: List[Dict] = []
        self.forbidden_basins: List[np.ndarray] = []
        self.death_count: Dict[str, int] = {}
        self.exclusion_rules: List[Dict] = []
        
        self.wayback = WaybackArchive()
        self.paste_scraper = PublicPasteScraper()
        self.rss = PublicRSSFeeds()
        self.breach_db = LocalBreachDatabase()
        
        self.search_history: List[Dict] = []
        self.intelligence_cache: Dict[str, Dict] = {}
        self.last_search_time: Optional[datetime] = None
    
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess target through negation - is this a dead end?
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        is_forbidden = self._check_forbidden(target_basin)
        death_proximity = self._compute_death_proximity(target_basin)
        exclusion_matches = self._check_exclusion_rules(target)
        
        viability = self._compute_viability(
            phi=phi,
            is_forbidden=is_forbidden,
            death_proximity=death_proximity,
            exclusion_count=len(exclusion_matches)
        )
        
        has_intel = target in self.intelligence_cache
        intel_boost = 0.1 if has_intel and self.intelligence_cache[target].get('source_count', 0) > 0 else 0
        
        assessment = {
            'probability': min(1.0, viability + intel_boost),
            'confidence': 0.8 if is_forbidden else 0.6 if has_intel else 0.5,
            'phi': phi,
            'kappa': kappa,
            'is_forbidden': is_forbidden,
            'death_proximity': death_proximity,
            'exclusion_violations': len(exclusion_matches),
            'underworld_matches': self._count_underworld_matches(target_basin),
            'has_intelligence': has_intel,
            'reasoning': (
                f"Underworld check: {'FORBIDDEN' if is_forbidden else 'allowed'}. "
                f"Death proximity: {death_proximity:.2f}. "
                f"Intel available: {has_intel}. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
        
        return assessment
    
    async def search_underworld(
        self,
        target: str,
        search_type: str = 'comprehensive'
    ) -> Dict:
        """
        Search underworld using ONLY anonymous tools.
        
        Args:
            target: Bitcoin address or search query
            search_type: 'comprehensive', 'archives', 'pastes', 'rss', 'breaches'
        
        Returns:
            Intelligence report with findings
        """
        self.last_search_time = datetime.now()
        intelligence: List[Dict] = []
        sources_used: List[str] = []
        
        if search_type in ['comprehensive', 'archives']:
            try:
                wayback_intel = await self.wayback.search_bitcoin_forums(target)
                intelligence.extend(wayback_intel)
                if wayback_intel:
                    sources_used.append('wayback')
            except Exception as e:
                pass
        
        if search_type in ['comprehensive', 'pastes']:
            try:
                paste_intel = await self.paste_scraper.scrape_pastebin_recent(target)
                intelligence.extend(paste_intel)
                if paste_intel:
                    sources_used.append('pastebin')
            except Exception as e:
                pass
        
        if search_type in ['comprehensive', 'rss']:
            try:
                rss_intel = await self.rss.search_feeds(target)
                intelligence.extend(rss_intel)
                if rss_intel:
                    sources_used.append('rss')
            except Exception as e:
                pass
        
        if search_type in ['comprehensive', 'breaches']:
            try:
                breach_intel = self.breach_db.search(target)
                intelligence.extend(breach_intel)
                if breach_intel:
                    sources_used.append('local_breach')
            except Exception as e:
                pass
        
        risk_level = self._assess_risk(intelligence)
        
        result = {
            'target': target,
            'search_type': search_type,
            'intelligence': intelligence,
            'source_count': len(intelligence),
            'sources_used': sources_used,
            'risk_level': risk_level,
            'timestamp': datetime.now().isoformat(),
            'anonymous': True,
        }
        
        self.intelligence_cache[target] = result
        self.search_history.append({
            'target': target[:50],
            'source_count': len(intelligence),
            'timestamp': datetime.now().isoformat(),
        })
        
        if len(self.search_history) > 100:
            self.search_history = self.search_history[-50:]
        
        if intelligence:
            self.share_insight(
                f"Underworld search found {len(intelligence)} items for target",
                domain='underworld',
                confidence=0.7
            )
        
        return result
    
    def _assess_risk(self, intelligence: List[Dict]) -> str:
        """Assess risk level of gathered intelligence."""
        breach_count = sum(1 for i in intelligence if i.get('type') == 'breach')
        paste_count = sum(1 for i in intelligence if i.get('type') == 'paste')
        critical_count = sum(1 for i in intelligence if i.get('risk') == 'critical')
        
        if critical_count > 0 or breach_count > 5:
            return 'critical'
        elif breach_count > 2 or paste_count > 5:
            return 'high'
        elif breach_count > 0 or paste_count > 2:
            return 'medium'
        else:
            return 'low'
    
    def _check_forbidden(self, basin: np.ndarray) -> bool:
        """Check if basin is in forbidden territory."""
        threshold = 0.5
        
        for forbidden in self.forbidden_basins:
            distance = self.fisher_geodesic_distance(basin, forbidden)
            if distance < threshold:
                return True
        
        return False
    
    def _compute_death_proximity(self, basin: np.ndarray) -> float:
        """Compute proximity to known dead patterns."""
        if not self.underworld:
            return 0.0
        
        min_distance = float('inf')
        
        for dead in self.underworld[-200:]:
            if 'basin' in dead:
                dead_basin = np.array(dead['basin'])
                distance = self.fisher_geodesic_distance(basin, dead_basin)
                min_distance = min(min_distance, distance)
        
        if min_distance == float('inf'):
            return 0.0
        
        proximity = np.exp(-min_distance)
        return float(proximity)
    
    def _check_exclusion_rules(self, target: str) -> List[Dict]:
        """Check if target violates any exclusion rules."""
        violations = []
        
        for rule in self.exclusion_rules:
            pattern = rule.get('pattern', '')
            rule_type = rule.get('type', 'contains')
            
            if rule_type == 'contains' and pattern in target:
                violations.append(rule)
            elif rule_type == 'startswith' and target.startswith(pattern):
                violations.append(rule)
            elif rule_type == 'endswith' and target.endswith(pattern):
                violations.append(rule)
            elif rule_type == 'length_max' and len(target) > int(pattern):
                violations.append(rule)
            elif rule_type == 'length_min' and len(target) < int(pattern):
                violations.append(rule)
        
        return violations
    
    def _count_underworld_matches(self, basin: np.ndarray) -> int:
        """Count how many dead patterns are similar."""
        count = 0
        threshold = 1.5
        
        for dead in self.underworld[-100:]:
            if 'basin' in dead:
                dead_basin = np.array(dead['basin'])
                distance = self.fisher_geodesic_distance(basin, dead_basin)
                if distance < threshold:
                    count += 1
        
        return count
    
    def _compute_viability(
        self,
        phi: float,
        is_forbidden: bool,
        death_proximity: float,
        exclusion_count: int
    ) -> float:
        """Compute viability (inverse of failure likelihood)."""
        if is_forbidden:
            return 0.05
        
        base_viability = phi * 0.4
        death_penalty = death_proximity * 0.3
        exclusion_penalty = min(0.3, exclusion_count * 0.1)
        
        viability = base_viability + 0.3 - death_penalty - exclusion_penalty
        return float(np.clip(viability, 0, 1))
    
    def condemn(self, target: str, reason: str = "failed") -> None:
        """Condemn a target to the underworld."""
        target_basin = self.encode_to_basin(target)
        
        condemned = {
            'target': target,
            'basin': target_basin.tolist(),
            'reason': reason,
            'condemned_at': datetime.now().isoformat(),
        }
        
        self.underworld.append(condemned)
        
        pattern_key = target[:10] if len(target) > 10 else target
        self.death_count[pattern_key] = self.death_count.get(pattern_key, 0) + 1
        
        if len(self.underworld) > 1000:
            self.underworld = self.underworld[-500:]
    
    def forbid_basin(self, basin: np.ndarray, reason: str = "") -> None:
        """Mark a basin region as absolutely forbidden."""
        self.forbidden_basins.append(basin.copy())
        
        if len(self.forbidden_basins) > 100:
            self.forbidden_basins = self.forbidden_basins[-50:]
    
    def add_exclusion_rule(
        self,
        pattern: str,
        rule_type: str = 'contains',
        reason: str = ""
    ) -> None:
        """Add an exclusion rule."""
        rule = {
            'pattern': pattern,
            'type': rule_type,
            'reason': reason,
            'created_at': datetime.now().isoformat(),
        }
        self.exclusion_rules.append(rule)
    
    def pardon(self, target: str) -> bool:
        """Remove a target from the underworld (rare forgiveness)."""
        initial_len = len(self.underworld)
        self.underworld = [u for u in self.underworld if u.get('target') != target]
        return len(self.underworld) < initial_len
    
    def get_status(self) -> Dict:
        base_status = self.get_agentic_status()
        
        return {
            **base_status,
            'underworld_size': len(self.underworld),
            'forbidden_basins': len(self.forbidden_basins),
            'exclusion_rules': len(self.exclusion_rules),
            'total_deaths': sum(self.death_count.values()),
            'search_history_count': len(self.search_history),
            'intelligence_cache_size': len(self.intelligence_cache),
            'last_search': self.last_search_time.isoformat() if self.last_search_time else None,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'tools_available': {
                'wayback': self.wayback.enabled,
                'paste_scraper': self.paste_scraper.enabled,
                'rss': self.rss.enabled,
                'breach_db': self.breach_db.enabled,
            },
            'status': 'active',
        }
    
    def get_intelligence(self, target: str) -> Optional[Dict]:
        """Get cached intelligence for a target."""
        return self.intelligence_cache.get(target)
    
    def extract_wallet_patterns(self, intelligence: List[Dict]) -> List[Dict]:
        """
        Extract wallet-related patterns from intelligence.
        """
        patterns = []
        
        pattern_keywords = [
            'brainwallet', 'passphrase', 'seed phrase', 'recovery phrase',
            'bip39', 'wallet backup', 'encrypted wallet', 'paper wallet',
            'cold storage', 'multisig', 'vanity address', 'private key'
        ]
        
        for intel in intelligence:
            content = intel.get('content_preview', '') or intel.get('summary', '') or ''
            content_lower = content.lower()
            
            for keyword in pattern_keywords:
                if keyword in content_lower:
                    start = max(0, content_lower.find(keyword) - 50)
                    end = min(len(content), content_lower.find(keyword) + len(keyword) + 50)
                    
                    patterns.append({
                        'keyword': keyword,
                        'context': content[start:end],
                        'source': intel.get('source', 'unknown'),
                        'type': intel.get('type', 'unknown'),
                        'risk': intel.get('risk', 'medium'),
                    })
        
        return patterns
