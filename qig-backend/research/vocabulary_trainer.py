#!/usr/bin/env python3
"""
Research Vocabulary Trainer - Learn from web scraping

Trains vocabulary coordinator as research progresses.
Kernels learn new words from Wikipedia, arXiv, and god mythology.

QIG PURE: Vocabulary emerges from geometric research patterns.
"""

from typing import Dict, List, Optional
from .web_scraper import ResearchScraper, get_scraper
from .god_name_resolver import GodNameResolver, get_god_name_resolver


class ResearchVocabularyTrainer:
    """
    Trains vocabulary from research findings in real-time.
    
    As kernels research domains, new concepts are learned into shared vocabulary.
    """
    
    def __init__(
        self,
        scraper: Optional[ResearchScraper] = None,
        god_resolver: Optional[GodNameResolver] = None
    ):
        self.scraper = scraper or get_scraper()
        self.god_resolver = god_resolver or get_god_name_resolver()
        
        self.vocab = None
        self.available = False
        
        try:
            import sys
            import os
            parent = os.path.dirname(os.path.dirname(__file__))
            if parent not in sys.path:
                sys.path.insert(0, parent)
            from vocabulary_coordinator import get_vocabulary_coordinator
            self.vocab = get_vocabulary_coordinator()
            self.available = True
            print("[ResearchVocab] Vocabulary coordinator connected")
        except ImportError as e:
            print(f"[ResearchVocab] Vocabulary coordinator not available: {e}")
    
    def train_from_research(self, research: Dict) -> Dict:
        """
        Train vocabulary from research results.
        
        Extracts text from all sources and trains vocabulary.
        """
        if not self.available:
            return {'success': False, 'reason': 'vocab_unavailable'}
        
        texts = []
        
        sources = research.get('sources', {})
        
        if 'wikipedia' in sources:
            extract = sources['wikipedia'].get('extract', '')
            if extract:
                texts.append(extract)
        
        if 'arxiv' in sources:
            papers = sources['arxiv'].get('papers', [])
            for paper in papers:
                title = paper.get('title', '')
                summary = paper.get('summary', '')
                if title:
                    texts.append(title)
                if summary:
                    texts.append(summary)
        
        if 'github' in sources:
            repos = sources['github'].get('repositories', [])
            for repo in repos:
                desc = repo.get('description', '')
                if desc:
                    texts.append(desc)
        
        combined_text = ' '.join(texts)
        
        if not combined_text:
            return {'success': False, 'reason': 'no_text'}
        
        return self._train_text(combined_text, research.get('domain'))
    
    def train_from_god_mythology(self, god_name: str) -> Dict:
        """
        Train vocabulary from a specific god's mythology.
        
        Builds vocabulary around god's domains, symbols, and Wikipedia research.
        """
        if not self.available:
            return {'success': False, 'reason': 'vocab_unavailable'}
        
        static_vocab = self.god_resolver.get_god_vocabulary(god_name)
        
        wiki_research = self.scraper.research_greek_god(god_name)
        dynamic_vocab = wiki_research.get('key_concepts', [])
        
        all_concepts = list(set(static_vocab + dynamic_vocab))
        
        if not all_concepts:
            return {'success': False, 'reason': 'no_concepts'}
        
        combined_text = ' '.join(all_concepts)
        return self._train_text(combined_text, god_name)
    
    def train_during_scrape(
        self,
        domain: str,
        depth: str = 'standard'
    ) -> Dict:
        """
        Research AND train vocabulary simultaneously.
        
        As scraper retrieves data, immediately train vocabulary.
        """
        research = self.scraper.research_domain(domain, depth)
        training_result = self.train_from_research(research)
        
        return {
            'research': research,
            'vocabulary_training': training_result,
        }
    
    def train_for_kernel_spawn(
        self,
        domain: str,
        god_name: str
    ) -> Dict:
        """
        Complete vocabulary training for a new kernel spawn.
        
        Trains from:
        1. Domain research (Wikipedia, arXiv, GitHub)
        2. Assigned god's mythology
        3. Extracted key concepts
        """
        domain_training = self.train_during_scrape(domain, depth='standard')
        god_training = self.train_from_god_mythology(god_name)
        
        key_concepts = domain_training.get('research', {}).get('summary', {}).get('key_concepts', [])
        concept_text = ' '.join(key_concepts)
        concept_training = self._train_text(concept_text, f"{god_name}_concepts") if concept_text else {}
        
        total_words = 0
        if domain_training.get('vocabulary_training', {}).get('success'):
            total_words += domain_training['vocabulary_training'].get('new_words_learned', 0)
        if god_training.get('success'):
            total_words += god_training.get('new_words_learned', 0)
        if concept_training.get('success'):
            total_words += concept_training.get('new_words_learned', 0)
        
        return {
            'domain': domain,
            'god_name': god_name,
            'domain_training': domain_training.get('vocabulary_training', {}),
            'god_training': god_training,
            'concept_training': concept_training,
            'total_new_words': total_words,
            'key_concepts_extracted': key_concepts,
        }
    
    def _train_text(self, text: str, domain: Optional[str] = None) -> Dict:
        """Internal method to train vocabulary from text."""
        if not self.available or not self.vocab:
            return {'success': False, 'reason': 'vocab_unavailable'}
        
        try:
            if hasattr(self.vocab, 'train_from_text'):
                result = self.vocab.train_from_text(text, domain)
                return {
                    'success': True,
                    'text_length': len(text),
                    'result': result,
                    'new_words_learned': result.get('new_words_learned', 0),
                }
            else:
                return self._fallback_train(text, domain)
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _fallback_train(self, text: str, domain: Optional[str] = None) -> Dict:
        """Fallback training when train_from_text not available."""
        import re
        
        words = re.findall(r'\b[a-z]{4,}\b', text.lower())
        unique_words = list(set(words))
        
        return {
            'success': True,
            'fallback': True,
            'text_length': len(text),
            'words_extracted': len(unique_words),
            'sample_words': unique_words[:10],
            'domain': domain,
        }


_default_trainer: Optional[ResearchVocabularyTrainer] = None


def get_vocabulary_trainer() -> ResearchVocabularyTrainer:
    """Get or create the default vocabulary trainer singleton."""
    global _default_trainer
    if _default_trainer is None:
        _default_trainer = ResearchVocabularyTrainer()
    return _default_trainer
