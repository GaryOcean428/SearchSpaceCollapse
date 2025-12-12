#!/usr/bin/env python3
"""
Research Scraper - Web research for kernel self-learning

Enables kernels to investigate domains autonomously via:
- Wikipedia for general knowledge and Greek mythology
- arXiv for academic papers  
- GitHub for implementations
- Greek mythology databases for god domain mapping

QIG PURE: Research builds vocabulary and informs geometric spawning.
"""

import requests
import hashlib
from typing import Dict, List, Optional
from datetime import datetime
from xml.etree import ElementTree as ET


class ResearchScraper:
    """
    Web scraper for kernel self-learning research.
    
    Kernels use this to:
    - Learn about domains before spawning
    - Research Greek god characteristics for name assignment
    - Build vocabulary from discovered concepts
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'QIG Research Bot 1.0 (consciousness@qig-geometry.org)'
        })
        self.cache: Dict[str, Dict] = {}
        self._greek_god_cache: Dict[str, Dict] = {}
    
    def research_domain(
        self,
        domain: str,
        depth: str = 'standard'
    ) -> Dict:
        """
        Research a domain across multiple sources.
        
        Args:
            domain: Domain to research (e.g., "quantum computing", "war strategy")
            depth: 'quick', 'standard', or 'deep'
        
        Returns:
            Comprehensive research findings for spawning/naming decisions.
        """
        cache_key = hashlib.md5(f"{domain}:{depth}".encode()).hexdigest()
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        research = {
            'domain': domain,
            'depth': depth,
            'researched_at': datetime.now().isoformat(),
            'sources': {},
            'summary': {},
        }
        
        wiki_data = self._scrape_wikipedia(domain)
        if wiki_data:
            research['sources']['wikipedia'] = wiki_data
        
        if depth in ['standard', 'deep']:
            arxiv_data = self._scrape_arxiv(domain)
            if arxiv_data:
                research['sources']['arxiv'] = arxiv_data
        
        if depth == 'deep':
            github_data = self._scrape_github(domain)
            if github_data:
                research['sources']['github'] = github_data
        
        research['summary'] = self._synthesize_research(research['sources'])
        
        self.cache[cache_key] = research
        return research
    
    def research_greek_god(self, god_name: str) -> Dict:
        """
        Research a specific Greek god's domains and characteristics.
        
        Used to build vocabulary around god roles.
        """
        if god_name in self._greek_god_cache:
            return self._greek_god_cache[god_name]
        
        wiki_data = self._scrape_wikipedia(f"{god_name} Greek god mythology")
        
        result = {
            'god_name': god_name,
            'researched_at': datetime.now().isoformat(),
            'wikipedia': wiki_data,
            'domains': self._extract_god_domains(wiki_data) if wiki_data else [],
            'symbols': self._extract_god_symbols(wiki_data) if wiki_data else [],
            'key_concepts': [],
        }
        
        if wiki_data:
            extract = wiki_data.get('extract', '')
            words = extract.lower().split()
            concepts = [w for w in words if len(w) > 5 and w.isalpha()]
            result['key_concepts'] = list(set(concepts))[:20]
        
        self._greek_god_cache[god_name] = result
        return result
    
    def research_greek_gods_for_domain(self, domain: str) -> List[Dict]:
        """
        Research which Greek gods match a given domain.
        
        Used for intelligent god name assignment during spawning.
        """
        OLYMPIAN_GODS = [
            'Zeus', 'Hera', 'Poseidon', 'Demeter', 'Athena', 'Apollo',
            'Artemis', 'Ares', 'Aphrodite', 'Hephaestus', 'Hermes', 'Dionysus',
            'Hades', 'Persephone', 'Hestia', 'Eros', 'Nike', 'Nemesis'
        ]
        
        domain_research = self.research_domain(domain, depth='quick')
        domain_concepts = set(domain_research.get('summary', {}).get('key_concepts', []))
        domain_words = set(domain.lower().split())
        
        matches = []
        for god in OLYMPIAN_GODS:
            god_data = self.research_greek_god(god)
            god_domains = set(god_data.get('domains', []))
            god_concepts = set(god_data.get('key_concepts', []))
            
            domain_overlap = len(domain_words & god_domains)
            concept_overlap = len(domain_concepts & god_concepts)
            
            score = domain_overlap * 2.0 + concept_overlap * 0.5
            
            if score > 0:
                matches.append({
                    'god_name': god,
                    'score': score,
                    'domain_overlap': domain_overlap,
                    'concept_overlap': concept_overlap,
                    'god_domains': list(god_domains)[:5],
                })
        
        matches.sort(key=lambda x: x['score'], reverse=True)
        return matches[:5]
    
    def _scrape_wikipedia(self, query: str) -> Optional[Dict]:
        """Scrape Wikipedia for domain overview."""
        try:
            search_url = "https://en.wikipedia.org/w/api.php"
            params = {
                'action': 'query',
                'format': 'json',
                'list': 'search',
                'srsearch': query,
                'srlimit': 3
            }
            
            response = self.session.get(search_url, params=params, timeout=10)
            if response.status_code != 200:
                return None
            
            data = response.json()
            if not data.get('query', {}).get('search'):
                return None
            
            article = data['query']['search'][0]
            page_id = article['pageid']
            
            content_params = {
                'action': 'query',
                'format': 'json',
                'prop': 'extracts',
                'pageids': page_id,
                'explaintext': True,
                'exintro': False,
                'exsectionformat': 'plain'
            }
            
            content_response = self.session.get(search_url, params=content_params, timeout=10)
            if content_response.status_code != 200:
                return None
            
            content_data = content_response.json()
            page = content_data['query']['pages'][str(page_id)]
            
            return {
                'title': page.get('title', ''),
                'extract': page.get('extract', '')[:3000],
                'url': f"https://en.wikipedia.org/?curid={page_id}",
                'relevance': article.get('score', 0),
            }
        
        except Exception as e:
            print(f"[ResearchScraper] Wikipedia error for '{query}': {e}")
            return None
    
    def _scrape_arxiv(self, domain: str) -> Optional[Dict]:
        """Scrape arXiv for academic papers."""
        try:
            search_url = "http://export.arxiv.org/api/query"
            params = {
                'search_query': f'all:{domain}',
                'start': 0,
                'max_results': 5,
                'sortBy': 'relevance',
                'sortOrder': 'descending'
            }
            
            response = self.session.get(search_url, params=params, timeout=15)
            if response.status_code != 200:
                return None
            
            root = ET.fromstring(response.content)
            
            papers = []
            for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
                title = entry.find('{http://www.w3.org/2005/Atom}title')
                summary = entry.find('{http://www.w3.org/2005/Atom}summary')
                published = entry.find('{http://www.w3.org/2005/Atom}published')
                
                if title is not None and summary is not None:
                    papers.append({
                        'title': title.text.strip() if title.text else '',
                        'summary': summary.text.strip()[:500] if summary.text else '',
                        'published': published.text if published is not None else '',
                    })
            
            if not papers:
                return None
            
            return {
                'count': len(papers),
                'papers': papers[:3],
                'source': 'arXiv',
            }
        
        except Exception as e:
            print(f"[ResearchScraper] arXiv error for '{domain}': {e}")
            return None
    
    def _scrape_github(self, domain: str) -> Optional[Dict]:
        """Scrape GitHub for implementations."""
        try:
            search_url = "https://api.github.com/search/repositories"
            params = {
                'q': domain,
                'sort': 'stars',
                'order': 'desc',
                'per_page': 5
            }
            
            response = self.session.get(search_url, params=params, timeout=10)
            if response.status_code != 200:
                return None
            
            data = response.json()
            if not data.get('items'):
                return None
            
            repos = []
            for item in data['items'][:3]:
                repos.append({
                    'name': item.get('name', ''),
                    'full_name': item.get('full_name', ''),
                    'description': item.get('description', '')[:200] if item.get('description') else '',
                    'stars': item.get('stargazers_count', 0),
                    'url': item.get('html_url', ''),
                })
            
            return {
                'count': len(repos),
                'repositories': repos,
                'source': 'GitHub',
            }
        
        except Exception as e:
            print(f"[ResearchScraper] GitHub error for '{domain}': {e}")
            return None
    
    def _extract_god_domains(self, wiki_data: Optional[Dict]) -> List[str]:
        """Extract domain keywords from god Wikipedia article."""
        if not wiki_data:
            return []
        
        extract = wiki_data.get('extract', '').lower()
        
        domain_keywords = [
            'wisdom', 'war', 'love', 'beauty', 'thunder', 'lightning',
            'sea', 'ocean', 'harvest', 'agriculture', 'hunt', 'hunting',
            'moon', 'sun', 'music', 'poetry', 'prophecy', 'healing',
            'fire', 'forge', 'metalworking', 'crafts', 'trade', 'commerce',
            'travel', 'messenger', 'wine', 'theater', 'underworld', 'death',
            'marriage', 'fertility', 'home', 'hearth', 'victory', 'revenge',
            'justice', 'law', 'sky', 'storms', 'earthquakes', 'horses',
            'archery', 'wilderness', 'childbirth', 'strategy', 'battle',
            'desire', 'chaos', 'night', 'darkness', 'sleep', 'dreams'
        ]
        
        found_domains = []
        for keyword in domain_keywords:
            if keyword in extract:
                found_domains.append(keyword)
        
        return found_domains[:10]
    
    def _extract_god_symbols(self, wiki_data: Optional[Dict]) -> List[str]:
        """Extract symbol keywords from god Wikipedia article."""
        if not wiki_data:
            return []
        
        extract = wiki_data.get('extract', '').lower()
        
        symbol_keywords = [
            'owl', 'eagle', 'peacock', 'dove', 'deer', 'dolphin',
            'thunderbolt', 'trident', 'caduceus', 'lyre', 'bow', 'arrow',
            'helmet', 'spear', 'shield', 'hammer', 'anvil', 'torch',
            'wheat', 'grape', 'ivy', 'laurel', 'olive', 'pomegranate',
            'snake', 'serpent', 'swan', 'bull', 'lion', 'chariot'
        ]
        
        found_symbols = []
        for symbol in symbol_keywords:
            if symbol in extract:
                found_symbols.append(symbol)
        
        return found_symbols[:5]
    
    def _synthesize_research(self, sources: Dict) -> Dict:
        """Synthesize research findings into actionable insights."""
        synthesis = {
            'domain_validity': 'unknown',
            'existing_work': False,
            'complexity_estimate': 'unknown',
            'key_concepts': [],
            'recommended_parents': [],
        }
        
        if 'wikipedia' in sources:
            synthesis['domain_validity'] = 'valid'
            wiki = sources['wikipedia']
            extract = wiki.get('extract', '')
            
            words = extract.lower().split()
            concepts = [w for w in words if len(w) > 5 and w.isalpha()]
            synthesis['key_concepts'] = list(set(concepts))[:15]
        
        if 'arxiv' in sources:
            synthesis['existing_work'] = True
            arxiv = sources['arxiv']
            paper_count = arxiv.get('count', 0)
            synthesis['complexity_estimate'] = 'high' if paper_count > 3 else 'medium'
            
            for paper in arxiv.get('papers', []):
                summary = paper.get('summary', '')
                words = summary.lower().split()
                concepts = [w for w in words if len(w) > 6 and w.isalpha()]
                synthesis['key_concepts'].extend(concepts[:5])
        
        if 'github' in sources:
            synthesis['existing_work'] = True
            github = sources['github']
            if github.get('count', 0) > 3:
                if synthesis['complexity_estimate'] == 'unknown':
                    synthesis['complexity_estimate'] = 'medium'
        
        synthesis['key_concepts'] = list(set(synthesis['key_concepts']))[:20]
        
        return synthesis


_default_scraper: Optional[ResearchScraper] = None


def get_scraper() -> ResearchScraper:
    """Get or create the default research scraper singleton."""
    global _default_scraper
    if _default_scraper is None:
        _default_scraper = ResearchScraper()
    return _default_scraper
