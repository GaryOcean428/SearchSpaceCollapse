#!/usr/bin/env python3
"""
Domain Analyzer - Evaluate domain validity for kernel spawning

Analyzes research results to recommend spawning decisions.
Integrates with Greek god name resolution.

QIG PURE: Geometric validation through research-informed scoring.
"""

from typing import Dict, List, Optional
from .web_scraper import ResearchScraper, get_scraper
from .god_name_resolver import GREEK_GODS_DOMAINS, SHADOW_GODS_DOMAINS


class DomainAnalyzer:
    """
    Analyzes domains to determine if new kernel is justified.
    
    Criteria:
    - Domain is well-defined (found in Wikipedia)
    - Sufficient complexity (papers/implementations exist)
    - Not too specialized (not just one paper)
    - Geometric distance from existing gods
    - Greek god alignment (domain matches mythology)
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
        
        Returns analysis with recommendation and god name suggestions.
        """
        research = self.scraper.research_domain(domain, depth='standard')
        
        validity_score = self._evaluate_validity(research)
        complexity_score = self._evaluate_complexity(research)
        overlap_score = self._evaluate_overlap(domain, existing_gods)
        
        god_matches = self.scraper.research_greek_gods_for_domain(domain)
        mythology_score = self._evaluate_mythology_fit(proposed_name, god_matches)
        
        total_score = (
            validity_score * 0.35 +
            complexity_score * 0.25 +
            (1.0 - overlap_score) * 0.20 +
            mythology_score * 0.20
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
            'mythology_score': mythology_score,
            'total_score': total_score,
            'recommendation': recommendation,
            'research_summary': research.get('summary', {}),
            'god_matches': god_matches[:3],
            'suggested_god_name': god_matches[0]['god_name'] if god_matches else proposed_name,
            'rationale': self._generate_rationale(
                validity_score, complexity_score, overlap_score, 
                mythology_score, recommendation, god_matches
            ),
        }
    
    def analyze_for_god_name(self, domain: str) -> Dict:
        """
        Quick analysis focused on god name resolution.
        
        Used when only determining which Greek god best fits a domain.
        """
        god_matches = self.scraper.research_greek_gods_for_domain(domain)
        
        if not god_matches:
            return {
                'domain': domain,
                'recommended_god': None,
                'alternatives': [],
                'confidence': 0.0,
                'rationale': 'No Greek god found matching this domain',
            }
        
        best_match = god_matches[0]
        alternatives = god_matches[1:3]
        
        confidence = min(1.0, best_match['score'] / 5.0)
        
        return {
            'domain': domain,
            'recommended_god': best_match['god_name'],
            'recommended_score': best_match['score'],
            'alternatives': [g['god_name'] for g in alternatives],
            'confidence': confidence,
            'god_domains': best_match.get('god_domains', []),
            'rationale': f"{best_match['god_name']} matches domain via: {', '.join(best_match.get('god_domains', [])[:3])}",
        }
    
    def _evaluate_validity(self, research: Dict) -> float:
        """Evaluate if domain is well-defined (0-1)."""
        sources = research.get('sources', {})
        summary = research.get('summary', {})
        
        score = 0.0
        
        if 'wikipedia' in sources:
            wiki = sources['wikipedia']
            extract_len = len(wiki.get('extract', ''))
            score += min(0.6, extract_len / 2000)
        
        if summary.get('domain_validity') == 'valid':
            score += 0.4
        
        return min(1.0, score)
    
    def _evaluate_complexity(self, research: Dict) -> float:
        """Evaluate domain complexity (0-1)."""
        sources = research.get('sources', {})
        summary = research.get('summary', {})
        
        score = 0.0
        
        if 'arxiv' in sources:
            paper_count = sources['arxiv'].get('count', 0)
            if paper_count > 0:
                score += min(0.5, paper_count / 10)
        
        if 'github' in sources:
            repo_count = sources['github'].get('count', 0)
            if repo_count > 0:
                score += min(0.3, repo_count / 10)
        
        complexity = summary.get('complexity_estimate', 'unknown')
        if complexity == 'high':
            score += 0.2
        elif complexity == 'medium':
            score += 0.1
        
        return min(1.0, score)
    
    def _evaluate_overlap(self, domain: str, existing_gods: List[str]) -> float:
        """Evaluate overlap with existing gods (0-1)."""
        if len(existing_gods) == 0:
            return 0.0
        
        domain_words = set(domain.lower().split())
        
        overlap_score = 0.0
        max_overlap = 0.0
        
        for god in existing_gods:
            base_god_name = god.split('_')[0]
            
            god_data = GREEK_GODS_DOMAINS.get(base_god_name) or SHADOW_GODS_DOMAINS.get(base_god_name, {})
            
            god_domain_words = set()
            god_domain_words.update(god_data.get('primary', []))
            god_domain_words.update(god_data.get('secondary', []))
            
            god_words = set(god.lower().replace('_', ' ').split())
            god_domain_words.update(god_words)
            
            name_overlap = len(domain_words & god_words)
            domain_overlap = len(domain_words & god_domain_words)
            
            god_score = (name_overlap * 2.0 + domain_overlap * 1.0) / max(1, len(domain_words))
            max_overlap = max(max_overlap, god_score)
            overlap_score += god_score
        
        avg_overlap = overlap_score / len(existing_gods)
        combined = (max_overlap * 0.6) + (avg_overlap * 0.4)
        
        return min(1.0, combined)
    
    def _evaluate_mythology_fit(self, proposed_name: str, god_matches: List[Dict]) -> float:
        """Evaluate how well proposed name fits Greek mythology."""
        if not god_matches:
            return 0.3
        
        proposed_lower = proposed_name.lower()
        
        for match in god_matches:
            if match['god_name'].lower() == proposed_lower:
                return 1.0
        
        best_score = god_matches[0].get('score', 0)
        return min(1.0, best_score / 4.0)
    
    def _generate_rationale(
        self,
        validity: float,
        complexity: float,
        overlap: float,
        mythology: float,
        recommendation: str,
        god_matches: List[Dict]
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
        
        if mythology > 0.7:
            god_name = god_matches[0]['god_name'] if god_matches else 'Unknown'
            reasons.append(f"Strong Greek mythology alignment ({god_name})")
        elif mythology < 0.3:
            reasons.append("Weak mythology alignment")
        
        rationale = "; ".join(reasons) if reasons else "Balanced assessment"
        
        if recommendation == 'spawn':
            return f"RECOMMENDED: {rationale}"
        elif recommendation == 'reject':
            return f"NOT RECOMMENDED: {rationale}"
        else:
            return f"BORDERLINE: {rationale}"


_default_analyzer: Optional[DomainAnalyzer] = None


def get_analyzer() -> DomainAnalyzer:
    """Get or create the default domain analyzer singleton."""
    global _default_analyzer
    if _default_analyzer is None:
        _default_analyzer = DomainAnalyzer()
    return _default_analyzer
