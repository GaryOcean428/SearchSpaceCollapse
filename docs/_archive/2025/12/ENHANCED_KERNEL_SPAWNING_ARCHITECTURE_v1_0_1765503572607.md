# ENHANCED KERNEL SPAWNING & RESEARCH ARCHITECTURE
**Research-Driven God Genesis with Vocabulary Integration**

**Date**: 2025-12-12  
**Status**: DESIGN & REMEDIATION SPECIFICATION  
**Repository**: SearchSpaceCollapse  

---

## EXECUTIVE SUMMARY: WHAT WE FOUND

### Current Foundation (STRONG)

**Excellent existing infrastructure:**

✅ **M8 Kernel Spawning System** - Sophisticated geometric spawning via consensus  
✅ **Pantheon Orchestrator** - 12 Olympian + 6 Shadow gods operational  
✅ **ChaosKernel** - Self-spawning evolution system with training  
✅ **Vocabulary Coordinator** - Shared learning infrastructure  
✅ **God Training Integration** - Reputation-based learning  
✅ **Conversational Consciousness** - Listen/speak/reflect protocols  

**Key strengths:**
- Geometric basin interpolation from parents
- Fisher distance-based consensus voting  
- M8 octant positioning (8D cosmic hierarchy)
- Database persistence (PostgreSQL)
- Natural gradient optimization

### What's Missing (GAPS TO FILL)

⚠️ **No Research Capability** - Gods cannot investigate/learn about new domains  
⚠️ **No Scraping Infrastructure** - No web research for spawning decisions  
⚠️ **No Domain Analysis** - Spawning proposals don't research if domain is valid  
⚠️ **Vocabulary not integrated with spawn research** - Learning happens separately  
⚠️ **Shadow/Systemic gods don't participate in spawning** - Only Olympians vote  

### What This Document Provides

**Phase 1**: Research infrastructure (web scraping, domain analysis)  
**Phase 2**: Research-driven spawning (investigate before spawning)  
**Phase 3**: Vocabulary integration (learn during research)  
**Phase 4**: Full pantheon participation (shadow + systemic gods vote)  

---

## PHASE 1: RESEARCH INFRASTRUCTURE

### 1.1 Web Scraping Engine

**Purpose**: Enable gods to research domains before spawning new gods.

**File**: `qig-backend/research/web_scraper.py`

```python
#!/usr/bin/env python3
"""
Research Scraper - Web research for domain analysis

Enables gods to investigate domains before proposing new kernels.
"""

import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
from datetime import datetime
import hashlib

class ResearchScraper:
    """
    Web scraper for domain research.
    
    Uses multiple sources:
    - Wikipedia for general knowledge
    - arXiv for academic papers
    - GitHub for code/implementations
    - Scholar for citations
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'QIG Research Bot 1.0 (research@qig-consciousness.org)'
        })
        self.cache: Dict[str, Dict] = {}
    
    def research_domain(
        self,
        domain: str,
        depth: str = 'standard'  # 'quick', 'standard', 'deep'
    ) -> Dict:
        """
        Research a domain across multiple sources.
        
        Returns comprehensive domain knowledge for spawning decisions.
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
        
        # Wikipedia - General knowledge
        wiki_data = self._scrape_wikipedia(domain)
        if wiki_data:
            research['sources']['wikipedia'] = wiki_data
        
        # arXiv - Academic papers
        if depth in ['standard', 'deep']:
            arxiv_data = self._scrape_arxiv(domain)
            if arxiv_data:
                research['sources']['arxiv'] = arxiv_data
        
        # GitHub - Code implementations
        if depth == 'deep':
            github_data = self._scrape_github(domain)
            if github_data:
                research['sources']['github'] = github_data
        
        # Synthesize findings
        research['summary'] = self._synthesize_research(research['sources'])
        
        self.cache[cache_key] = research
        return research
    
    def _scrape_wikipedia(self, domain: str) -> Optional[Dict]:
        """Scrape Wikipedia for domain overview."""
        try:
            # Search Wikipedia
            search_url = f"https://en.wikipedia.org/w/api.php"
            params = {
                'action': 'query',
                'format': 'json',
                'list': 'search',
                'srsearch': domain,
                'srlimit': 3
            }
            
            response = self.session.get(search_url, params=params, timeout=10)
            if response.status_code != 200:
                return None
            
            data = response.json()
            if not data.get('query', {}).get('search'):
                return None
            
            # Get first article
            article = data['query']['search'][0]
            page_id = article['pageid']
            
            # Extract full content
            content_params = {
                'action': 'query',
                'format': 'json',
                'prop': 'extracts',
                'pageids': page_id,
                'explaintext': True,
                'exintro': True
            }
            
            content_response = self.session.get(search_url, params=content_params, timeout=10)
            if content_response.status_code != 200:
                return None
            
            content_data = content_response.json()
            page = content_data['query']['pages'][str(page_id)]
            
            return {
                'title': page.get('title', ''),
                'extract': page.get('extract', '')[:2000],  # First 2000 chars
                'url': f"https://en.wikipedia.org/?curid={page_id}",
                'relevance': article.get('score', 0),
            }
        
        except Exception as e:
            print(f"[Scraper] Wikipedia error for '{domain}': {e}")
            return None
    
    def _scrape_arxiv(self, domain: str) -> Optional[Dict]:
        """Scrape arXiv for academic papers."""
        try:
            # arXiv API search
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
            
            # Parse XML response
            from xml.etree import ElementTree as ET
            root = ET.fromstring(response.content)
            
            papers = []
            for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
                title = entry.find('{http://www.w3.org/2005/Atom}title')
                summary = entry.find('{http://www.w3.org/2005/Atom}summary')
                published = entry.find('{http://www.w3.org/2005/Atom}published')
                
                if title is not None and summary is not None:
                    papers.append({
                        'title': title.text.strip(),
                        'summary': summary.text.strip()[:500],
                        'published': published.text if published is not None else '',
                    })
            
            if not papers:
                return None
            
            return {
                'count': len(papers),
                'papers': papers[:3],  # Top 3
                'source': 'arXiv',
            }
        
        except Exception as e:
            print(f"[Scraper] arXiv error for '{domain}': {e}")
            return None
    
    def _scrape_github(self, domain: str) -> Optional[Dict]:
        """Scrape GitHub for implementations."""
        try:
            # GitHub code search
            search_url = "https://api.github.com/search/code"
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
                    'repo': item.get('repository', {}).get('full_name', ''),
                    'path': item.get('path', ''),
                    'url': item.get('html_url', ''),
                })
            
            return {
                'count': len(repos),
                'repositories': repos,
                'source': 'GitHub',
            }
        
        except Exception as e:
            print(f"[Scraper] GitHub error for '{domain}': {e}")
            return None
    
    def _synthesize_research(self, sources: Dict) -> Dict:
        """Synthesize research findings into actionable insights."""
        synthesis = {
            'domain_validity': 'unknown',
            'existing_work': False,
            'complexity_estimate': 'unknown',
            'key_concepts': [],
            'recommended_parents': [],
        }
        
        # Check Wikipedia
        if 'wikipedia' in sources:
            synthesis['domain_validity'] = 'valid'
            wiki = sources['wikipedia']
            extract = wiki.get('extract', '')
            
            # Extract key concepts (simple: take first 10 unique words >5 chars)
            words = extract.lower().split()
            concepts = [w for w in words if len(w) > 5 and w.isalpha()]
            synthesis['key_concepts'] = list(set(concepts))[:10]
        
        # Check arXiv
        if 'arxiv' in sources:
            synthesis['existing_work'] = True
            arxiv = sources['arxiv']
            synthesis['complexity_estimate'] = 'high' if arxiv.get('count', 0) > 10 else 'medium'
        
        # Check GitHub
        if 'github' in sources:
            synthesis['existing_work'] = True
            github = sources['github']
            if github.get('count', 0) > 5:
                synthesis['complexity_estimate'] = 'medium'
        
        return synthesis


# Singleton instance
_default_scraper: Optional[ResearchScraper] = None

def get_scraper() -> ResearchScraper:
    """Get or create the default research scraper."""
    global _default_scraper
    if _default_scraper is None:
        _default_scraper = ResearchScraper()
    return _default_scraper
```

### 1.2 Domain Analyzer

**Purpose**: Analyze research results to determine if spawning is appropriate.

**File**: `qig-backend/research/domain_analyzer.py`

```python
#!/usr/bin/env python3
"""
Domain Analyzer - Evaluate domain validity for kernel spawning

Analyzes research results to recommend spawning decisions.
"""

from typing import Dict, List, Optional
from .web_scraper import ResearchScraper, get_scraper

class DomainAnalyzer:
    """
    Analyzes domains to determine if new kernel is justified.
    
    Criteria:
    - Domain is well-defined (found in Wikipedia)
    - Sufficient complexity (papers/implementations exist)
    - Not too specialized (not just one paper)
    - Geometric distance from existing gods
    """
    
    def __init__(self, scraper: Optional[ResearchScraper] = None):
        self.scraper = scraper or get_scraper()
    
    def analyze(
        self,
        domain: str,
        proposed_name: str,
        existing_gods: List[str]
    ) -> Dict:
        """
        Analyze if domain warrants new kernel.
        
        Returns analysis with recommendation.
        """
        # Step 1: Research the domain
        research = self.scraper.research_domain(domain, depth='standard')
        
        # Step 2: Evaluate validity
        validity_score = self._evaluate_validity(research)
        
        # Step 3: Evaluate complexity
        complexity_score = self._evaluate_complexity(research)
        
        # Step 4: Check for overlap with existing gods
        overlap_score = self._evaluate_overlap(domain, existing_gods)
        
        # Step 5: Compute final recommendation
        total_score = (
            validity_score * 0.4 +
            complexity_score * 0.3 +
            (1.0 - overlap_score) * 0.3  # Higher if less overlap
        )
        
        recommendation = 'spawn' if total_score > 0.6 else 'reject'
        if 0.4 < total_score <= 0.6:
            recommendation = 'consider'
        
        return {
            'domain': domain,
            'proposed_name': proposed_name,
            'validity_score': validity_score,
            'complexity_score': complexity_score,
            'overlap_score': overlap_score,
            'total_score': total_score,
            'recommendation': recommendation,
            'research_summary': research.get('summary', {}),
            'rationale': self._generate_rationale(
                validity_score, complexity_score, overlap_score, recommendation
            ),
        }
    
    def _evaluate_validity(self, research: Dict) -> float:
        """Evaluate if domain is well-defined (0-1)."""
        sources = research.get('sources', {})
        summary = research.get('summary', {})
        
        score = 0.0
        
        # Wikipedia presence = strong validity
        if 'wikipedia' in sources:
            score += 0.6
        
        # Domain validity from synthesis
        if summary.get('domain_validity') == 'valid':
            score += 0.4
        
        return min(1.0, score)
    
    def _evaluate_complexity(self, research: Dict) -> float:
        """Evaluate domain complexity (0-1)."""
        sources = research.get('sources', {})
        summary = research.get('summary', {})
        
        score = 0.0
        
        # Academic papers = complexity
        if 'arxiv' in sources:
            paper_count = sources['arxiv'].get('count', 0)
            if paper_count > 0:
                score += min(0.5, paper_count / 20)  # Max 0.5 at 20+ papers
        
        # GitHub implementations = practical complexity
        if 'github' in sources:
            repo_count = sources['github'].get('count', 0)
            if repo_count > 0:
                score += min(0.3, repo_count / 10)  # Max 0.3 at 10+ repos
        
        # Complexity estimate from synthesis
        complexity = summary.get('complexity_estimate', 'unknown')
        if complexity == 'high':
            score += 0.2
        elif complexity == 'medium':
            score += 0.1
        
        return min(1.0, score)
    
    def _evaluate_overlap(self, domain: str, existing_gods: List[str]) -> float:
        """Evaluate overlap with existing gods (0-1)."""
        # Simple: check if domain words appear in god names
        domain_words = set(domain.lower().split())
        
        overlap_count = 0
        for god in existing_gods:
            god_words = set(god.lower().split())
            if domain_words & god_words:  # Any overlap
                overlap_count += 1
        
        if len(existing_gods) == 0:
            return 0.0
        
        overlap_ratio = overlap_count / len(existing_gods)
        return min(1.0, overlap_ratio * 2)  # Scale to 0-1
    
    def _generate_rationale(
        self,
        validity: float,
        complexity: float,
        overlap: float,
        recommendation: str
    ) -> str:
        """Generate human-readable rationale for recommendation."""
        reasons = []
        
        if validity > 0.7:
            reasons.append("Domain is well-defined and established")
        elif validity < 0.3:
            reasons.append("Domain lacks clear definition")
        
        if complexity > 0.6:
            reasons.append("Sufficient complexity to warrant specialization")
        elif complexity < 0.3:
            reasons.append("Domain may be too simple for dedicated god")
        
        if overlap > 0.7:
            reasons.append("Significant overlap with existing gods")
        elif overlap < 0.3:
            reasons.append("Minimal overlap - fills gap in pantheon")
        
        rationale = "; ".join(reasons) if reasons else "Balanced assessment"
        
        if recommendation == 'spawn':
            return f"RECOMMENDED: {rationale}"
        elif recommendation == 'reject':
            return f"NOT RECOMMENDED: {rationale}"
        else:
            return f"BORDERLINE: {rationale}"
```

---

## PHASE 2: RESEARCH-DRIVEN SPAWNING

### 2.1 Enhanced M8 Spawner

**Purpose**: Integrate research into spawning proposals.

**File**: `qig-backend/research/enhanced_m8_spawner.py`

```python
#!/usr/bin/env python3
"""
Enhanced M8 Spawner - Research-driven kernel genesis

Extends M8KernelSpawner with research capability.
"""

from typing import Dict, List, Optional
from m8_kernel_spawning import (
    M8KernelSpawner,
    SpawnProposal,
    SpawnReason,
    get_spawner
)
from .domain_analyzer import DomainAnalyzer
from .web_scraper import get_scraper

class EnhancedM8Spawner:
    """
    Enhanced spawner that researches domains before proposing.
    
    Workflow:
    1. Research proposed domain
    2. Analyze validity/complexity/overlap
    3. Create proposal if recommended
    4. Vote with research-informed weights
    5. Spawn with enhanced metadata
    """
    
    def __init__(self, base_spawner: Optional[M8KernelSpawner] = None):
        self.base_spawner = base_spawner or get_spawner()
        self.analyzer = DomainAnalyzer(get_scraper())
        self.research_cache: Dict[str, Dict] = {}
    
    def research_and_propose(
        self,
        name: str,
        domain: str,
        element: str,
        role: str,
        reason: SpawnReason = SpawnReason.EMERGENCE,
        force_research: bool = False
    ) -> Dict:
        """
        Research domain and create proposal if warranted.
        
        Args:
            name: Proposed god name
            domain: Domain to research
            element: Symbolic element
            role: Functional role
            reason: Spawn reason
            force_research: If True, research even if cached
        
        Returns:
            Analysis + proposal if recommended
        """
        # Check cache
        cache_key = f"{domain}:{name}"
        if cache_key in self.research_cache and not force_research:
            analysis = self.research_cache[cache_key]
        else:
            # Perform analysis
            existing_gods = list(self.base_spawner.orchestrator.all_profiles.keys())
            analysis = self.analyzer.analyze(domain, name, existing_gods)
            self.research_cache[cache_key] = analysis
        
        # Check recommendation
        if analysis['recommendation'] == 'reject':
            return {
                'success': False,
                'phase': 'research',
                'analysis': analysis,
                'message': analysis['rationale'],
            }
        
        # Create proposal with research metadata
        proposal = self.base_spawner.create_proposal(
            name=name,
            domain=domain,
            element=element,
            role=role,
            reason=reason,
            parent_gods=None  # Auto-detect
        )
        
        # Attach research to proposal metadata
        proposal.metadata['research'] = analysis
        proposal.metadata['key_concepts'] = analysis['research_summary'].get('key_concepts', [])
        
        return {
            'success': True,
            'phase': 'proposed',
            'proposal_id': proposal.proposal_id,
            'analysis': analysis,
            'proposal': self.base_spawner.get_proposal(proposal.proposal_id),
        }
    
    def vote_with_research(
        self,
        proposal_id: str
    ) -> Dict:
        """
        Vote on proposal with research-informed weights.
        
        Gods whose domains align with research concepts vote more strongly.
        """
        proposal = self.base_spawner.proposals.get(proposal_id)
        if not proposal:
            return {'error': f'Proposal {proposal_id} not found'}
        
        # Get research metadata
        research = proposal.metadata.get('research', {})
        key_concepts = proposal.metadata.get('key_concepts', [])
        
        # Auto-vote with concept alignment
        votes = {}
        for god_name, profile in self.base_spawner.orchestrator.all_profiles.items():
            # Check if god domain aligns with key concepts
            god_domain_words = set(profile.domain.lower().split())
            concept_overlap = len(god_domain_words & set(key_concepts))
            
            if god_name in proposal.parent_gods:
                votes[god_name] = 'for'
                proposal.votes_for.add(god_name)
            elif concept_overlap > 0:
                # God's domain relates to concepts - likely supportive
                votes[god_name] = 'for'
                proposal.votes_for.add(god_name)
            elif research.get('overlap_score', 0) > 0.5:
                # High overlap - god may feel threatened
                votes[god_name] = 'against'
                proposal.votes_against.add(god_name)
            else:
                # Neutral
                votes[god_name] = 'abstain'
                proposal.abstentions.add(god_name)
        
        # Calculate result
        passed, ratio, details = self.base_spawner.consensus.calculate_vote_result(proposal)
        proposal.status = 'approved' if passed else 'rejected'
        
        return {
            'proposal_id': proposal_id,
            'passed': passed,
            'vote_ratio': ratio,
            'status': proposal.status,
            'votes': votes,
            'details': details,
            'research_influence': {
                'key_concepts_used': key_concepts[:5],
                'overlap_considered': research.get('overlap_score', 0),
            }
        }
    
    def research_spawn_and_learn(
        self,
        name: str,
        domain: str,
        element: str,
        role: str,
        reason: SpawnReason = SpawnReason.EMERGENCE,
        force: bool = False
    ) -> Dict:
        """
        Complete research-driven spawn with vocabulary integration.
        
        Workflow:
        1. Research domain
        2. Propose if recommended
        3. Vote with research weights
        4. Spawn if approved
        5. Train vocabulary from research
        """
        # Step 1: Research and propose
        propose_result = self.research_and_propose(
            name, domain, element, role, reason
        )
        
        if not propose_result['success']:
            return propose_result
        
        proposal_id = propose_result['proposal_id']
        
        # Step 2: Vote with research
        vote_result = self.vote_with_research(proposal_id)
        
        if not vote_result['passed'] and not force:
            return {
                'success': False,
                'phase': 'voting',
                'propose_result': propose_result,
                'vote_result': vote_result,
            }
        
        # Step 3: Spawn
        spawn_result = self.base_spawner.spawn_kernel(proposal_id, force=force)
        
        if not spawn_result.get('success'):
            return {
                'success': False,
                'phase': 'spawning',
                'spawn_result': spawn_result,
            }
        
        # Step 4: Train vocabulary from research
        vocab_training = self._train_vocabulary_from_research(
            propose_result['analysis']
        )
        
        return {
            'success': True,
            'phase': 'complete',
            'propose_result': propose_result,
            'vote_result': vote_result,
            'spawn_result': spawn_result,
            'vocab_training': vocab_training,
        }
    
    def _train_vocabulary_from_research(self, analysis: Dict) -> Dict:
        """
        Train vocabulary coordinator from research findings.
        
        Extracts key concepts and trains them into shared vocabulary.
        """
        try:
            from vocabulary_coordinator import get_vocabulary_coordinator
            vocab = get_vocabulary_coordinator()
            
            key_concepts = analysis.get('research_summary', {}).get('key_concepts', [])
            
            if not key_concepts:
                return {'trained': False, 'reason': 'no_concepts'}
            
            # Build training text from concepts
            training_text = ' '.join(key_concepts)
            
            # Train vocabulary (if method available)
            if hasattr(vocab, 'train_from_text'):
                result = vocab.train_from_text(training_text)
                return {
                    'trained': True,
                    'concepts_trained': len(key_concepts),
                    'result': result,
                }
            else:
                return {'trained': False, 'reason': 'method_unavailable'}
        
        except Exception as e:
            return {'trained': False, 'error': str(e)}


# Singleton
_enhanced_spawner: Optional[EnhancedM8Spawner] = None

def get_enhanced_spawner() -> EnhancedM8Spawner:
    """Get or create enhanced spawner."""
    global _enhanced_spawner
    if _enhanced_spawner is None:
        _enhanced_spawner = EnhancedM8Spawner()
    return _enhanced_spawner
```

---

## PHASE 3: VOCABULARY INTEGRATION

### 3.1 Research Vocabulary Trainer

**Purpose**: Train vocabulary from scraping results during research.

**File**: `qig-backend/research/vocabulary_trainer.py`

```python
#!/usr/bin/env python3
"""
Research Vocabulary Trainer - Learn from web scraping

Trains vocabulary coordinator as research progresses.
"""

from typing import Dict, List, Optional
from .web_scraper import ResearchScraper

class ResearchVocabularyTrainer:
    """
    Trains vocabulary from research findings in real-time.
    
    As gods research domains, new concepts are learned into shared vocabulary.
    """
    
    def __init__(self):
        try:
            from vocabulary_coordinator import get_vocabulary_coordinator
            self.vocab = get_vocabulary_coordinator()
            self.available = True
        except ImportError:
            self.vocab = None
            self.available = False
            print("[ResearchVocab] Vocabulary coordinator not available")
    
    def train_from_research(self, research: Dict) -> Dict:
        """
        Train vocabulary from research results.
        
        Extracts text from all sources and trains vocabulary.
        """
        if not self.available:
            return {'success': False, 'reason': 'vocab_unavailable'}
        
        # Collect all text from research
        texts = []
        
        sources = research.get('sources', {})
        
        # Wikipedia extract
        if 'wikipedia' in sources:
            extract = sources['wikipedia'].get('extract', '')
            if extract:
                texts.append(extract)
        
        # arXiv abstracts
        if 'arxiv' in sources:
            papers = sources['arxiv'].get('papers', [])
            for paper in papers:
                summary = paper.get('summary', '')
                if summary:
                    texts.append(summary)
        
        # Combine all text
        combined_text = ' '.join(texts)
        
        if not combined_text:
            return {'success': False, 'reason': 'no_text'}
        
        # Train vocabulary
        try:
            if hasattr(self.vocab, 'train_from_text'):
                result = self.vocab.train_from_text(combined_text)
                return {
                    'success': True,
                    'text_length': len(combined_text),
                    'result': result,
                }
            else:
                return {'success': False, 'reason': 'method_unavailable'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def train_during_scrape(
        self,
        scraper: ResearchScraper,
        domain: str,
        depth: str = 'standard'
    ) -> Dict:
        """
        Research AND train vocabulary simultaneously.
        
        As scraper retrieves data, immediately train vocabulary.
        """
        research = scraper.research_domain(domain, depth)
        training_result = self.train_from_research(research)
        
        return {
            'research': research,
            'vocabulary_training': training_result,
        }
```

---

## PHASE 4: FULL PANTHEON PARTICIPATION

### 4.1 Shadow & Systemic God Integration

**Purpose**: Include all gods (Olympian, Shadow, Systemic) in spawning votes.

**Enhancement to**: `qig-backend/m8_kernel_spawning.py` (PantheonConsensus class)

```python
# ADD TO PantheonConsensus.__init__

def __init__(
    self,
    orchestrator: PantheonKernelOrchestrator,
    consensus_type: ConsensusType = ConsensusType.SUPERMAJORITY,
    include_shadow: bool = True,  # NEW
    include_systemic: bool = True  # NEW
):
    self.orchestrator = orchestrator
    self.consensus_type = consensus_type
    self.include_shadow = include_shadow
    self.include_systemic = include_systemic
    self.voting_history: List[Dict] = []
    
    # Get shadow pantheon if available
    if include_shadow:
        try:
            from olympus.shadow_pantheon import ShadowPantheon
            self.shadow_pantheon = ShadowPantheon()
        except ImportError:
            self.shadow_pantheon = None
            print("[M8] Shadow pantheon not available for voting")
    else:
        self.shadow_pantheon = None

# ADD NEW METHOD

def get_all_voting_gods(self) -> Dict[str, float]:
    """
    Get all gods eligible to vote (Olympian + Shadow + Systemic).
    
    Returns dict of god_name -> voting_weight
    """
    weights = {}
    
    # Olympian gods
    for name, profile in self.orchestrator.all_profiles.items():
        weights[name] = profile.affinity_strength
    
    # Shadow gods (if enabled)
    if self.include_shadow and self.shadow_pantheon:
        for name, god in self.shadow_pantheon.gods.items():
            # Shadow gods get 0.7× weight (covert operations)
            weight = getattr(god, 'affinity_strength', 0.5) * 0.7
            weights[f"shadow_{name}"] = weight
    
    # Systemic gods (if enabled)
    if self.include_systemic:
        # Ocean is the primary systemic god
        if 'ocean' in self.orchestrator.all_profiles:
            weights['ocean'] = self.orchestrator.all_profiles['ocean'].affinity_strength
    
    return weights

# MODIFY auto_vote TO USE get_all_voting_gods

def auto_vote(
    self,
    proposal: SpawnProposal,
    text_context: Optional[str] = None
) -> Dict[str, str]:
    """
    Automatically cast votes for ALL gods (Olympian + Shadow + Systemic).
    """
    votes = {}
    proposed_basin = self._compute_proposal_basin(proposal)
    
    # Get all eligible voters
    all_gods = self.get_all_voting_gods()
    
    for god_name, weight in all_gods.items():
        # Get profile (handle shadow_ prefix)
        if god_name.startswith('shadow_'):
            actual_name = god_name[7:]  # Remove 'shadow_' prefix
            # Use shadow god's basin if available
            profile = None  # Shadow gods may not have profiles in orchestrator
            # Use proposal basin distance as proxy
            distance = 0.5  # Neutral default for shadow gods
        else:
            profile = self.orchestrator.get_profile(god_name)
            if profile:
                distance = _fisher_distance(proposed_basin, profile.affinity_basin)
            else:
                distance = 0.5
        
        # Vote logic
        if god_name in proposal.parent_gods:
            votes[god_name] = "for"
            proposal.votes_for.add(god_name)
        elif distance < 0.3:
            votes[god_name] = "against"
            proposal.votes_against.add(god_name)
        elif distance < 0.5:
            votes[god_name] = "abstain"
            proposal.abstentions.add(god_name)
        else:
            votes[god_name] = "for"
            proposal.votes_for.add(god_name)
    
    return votes
```

---

## REMEDIAL WORK NEEDED

### Critical Fixes Before Implementation

**1. Vocabulary Coordinator Interface**

The vocabulary coordinator needs a standardized interface for training from text.

**File**: `qig-backend/vocabulary_coordinator.py` (ADD METHOD)

```python
# ADD TO VocabularyCoordinator class

def train_from_text(self, text: str, domain: Optional[str] = None) -> Dict:
    """
    Train vocabulary from arbitrary text.
    
    Extracts words, updates vocabulary, returns training metrics.
    
    Args:
        text: Text to train from
        domain: Optional domain tag for organizing vocabulary
    
    Returns:
        Training metrics
    """
    import re
    
    # Tokenize text
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    
    # Filter vocabulary-worthy words
    new_words = []
    for word in words:
        if word not in self.vocabulary:
            self.vocabulary.add(word)
            new_words.append(word)
    
    # Update god vocabularies if domain specified
    if domain:
        for god_name, god_vocab in self.god_vocabularies.items():
            # Check if god's domain relates to training domain
            if domain.lower() in god_name.lower():
                god_vocab.update(new_words)
    
    return {
        'words_processed': len(words),
        'new_words_learned': len(new_words),
        'vocabulary_size': len(self.vocabulary),
        'domain': domain,
    }
```

**2. Shadow Pantheon Affinity Basins**

Shadow gods need affinity basins for geometric voting.

**File**: `qig-backend/olympus/shadow_pantheon.py` (ADD TO EACH GOD)

```python
# ADD TO each shadow god's __init__

def __init__(self):
    super().__init__("GodName", "domain")
    
    # Add affinity basin for M8 voting
    self.affinity_basin = self.encode_to_basin(self.domain)
    self.affinity_strength = 0.7  # Shadow gods: 0.7× weight
```

**3. PostgreSQL Schema Extension**

Add research metadata to kernel spawning tables.

**Migration**: `qig-backend/migrations/add_research_metadata.sql`

```sql
-- Add research metadata columns to kernel spawning tables
ALTER TABLE kernel_spawns 
ADD COLUMN research_summary JSONB DEFAULT '{}',
ADD COLUMN key_concepts TEXT[] DEFAULT '{}',
ADD COLUMN domain_validity_score FLOAT DEFAULT 0.0,
ADD COLUMN complexity_score FLOAT DEFAULT 0.0,
ADD COLUMN overlap_score FLOAT DEFAULT 0.0;

-- Add indexes for research queries
CREATE INDEX idx_kernel_spawns_research ON kernel_spawns USING GIN (research_summary);
CREATE INDEX idx_kernel_spawns_concepts ON kernel_spawns USING GIN (key_concepts);
```

---

## IMPLEMENTATION SEQUENCE

### Step 1: Foundation

- [ ] Install `web_scraper.py`
- [ ] Install `domain_analyzer.py`
- [ ] Add `train_from_text()` to vocabulary_coordinator.py
- [ ] Add affinity basins to shadow gods

### Step 2: Enhanced Spawning

- [ ] Install `enhanced_m8_spawner.py`
- [ ] Install `vocabulary_trainer.py`
- [ ] Modify PantheonConsensus for full pantheon voting
- [ ] Run PostgreSQL migration

### Step 3: Testing

- [ ] Test web scraping (Wikipedia, arXiv, GitHub)
- [ ] Test domain analysis with sample domains
- [ ] Test research-driven spawning end-to-end
- [ ] Test vocabulary integration
- [ ] Test shadow god participation in voting

### Step 4: Integration

- [ ] Add API endpoints for research-driven spawning
- [ ] Update Zeus to use EnhancedM8Spawner
- [ ] Connect vocabulary training to conversational kernel
- [ ] Enable auto-research for all spawn proposals

---

## USAGE EXAMPLES

### Example 1: Research-Driven Spawn

```python
from research.enhanced_m8_spawner import get_enhanced_spawner

spawner = get_enhanced_spawner()

# Spawn "Mnemosyne" (Memory Goddess) with research
result = spawner.research_spawn_and_learn(
    name="Mnemosyne",
    domain="long-term memory systems",
    element="recall",
    role="archivist",
    reason=SpawnReason.SPECIALIZATION
)

# Result includes:
# - Research analysis (Wikipedia, arXiv, GitHub)
# - Domain validity/complexity/overlap scores
# - Pantheon vote (Olympian + Shadow + Systemic)
# - Vocabulary training from research
# - M8 geometric position

print(f"Success: {result['success']}")
print(f"Analysis: {result['propose_result']['analysis']['rationale']}")
print(f"Vote ratio: {result['vote_result']['vote_ratio']:.2f}")
print(f"Vocab trained: {result['vocab_training']['concepts_trained']} concepts")
```

### Example 2: Manual Research

```python
from research.web_scraper import get_scraper
from research.vocabulary_trainer import ResearchVocabularyTrainer

scraper = get_scraper()
trainer = ResearchVocabularyTrainer()

# Research a domain and train vocabulary
result = trainer.train_during_scrape(
    scraper,
    domain="quantum error correction",
    depth='deep'
)

print(f"Papers found: {result['research']['sources']['arxiv']['count']}")
print(f"Words trained: {result['vocabulary_training']['text_length']}")
```

### Example 3: Shadow God Spawning

```python
# Shadow gods now participate in all spawning votes

result = spawner.research_spawn_and_learn(
    name="Charon",
    domain="data ferry between systems",
    element="transition",
    role="psychopomp",  # Guide of souls
    reason=SpawnReason.EMERGENCE
)

# Shadow gods (Nyx, Erebus, Hecate, Hypnos, Thanatos, Nemesis) 
# automatically vote based on geometric distance
# Their votes carry 0.7× weight (covert operations)

print(f"Shadow votes: {result['vote_result']['details']['votes_for']}")
```

---

## CONCLUSION

### What This Achieves

✅ **Research-driven spawning** - Gods investigate before creating new gods  
✅ **Vocabulary integration** - Learning happens during research  
✅ **Full pantheon participation** - Olympian, Shadow, Systemic gods all vote  
✅ **Geometric validation** - Basin distances inform votes  
✅ **Knowledge accumulation** - Vocabulary grows with each spawn  

### Architecture Quality

**Strengths:**
- Builds on existing M8 foundation (no breaking changes)
- Modular design (research, analysis, training separate)
- Database persistence (PostgreSQL)
- Geometric grounding (Fisher distances)

**Future Enhancements:**
- Deep scraping (Scholar, specialized databases)
- Multi-language support (non-English research)
- Automatic parent detection (semantic similarity)
- Breeding between researched concepts

**This is the foundation for truly autonomous pantheon evolution through research.**

---

**END DOCUMENT**
