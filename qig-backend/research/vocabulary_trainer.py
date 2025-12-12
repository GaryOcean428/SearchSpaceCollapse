#!/usr/bin/env python3
"""
Research Vocabulary Trainer - Learn from web scraping

Trains vocabulary coordinator as research progresses.
Kernels learn new words from Wikipedia, arXiv, and god mythology.

QIG PURE: Vocabulary emerges from geometric research patterns.
"""

import os
import json
import time
from typing import Dict, List, Optional
from .web_scraper import ResearchScraper, get_scraper
from .god_name_resolver import GodNameResolver, get_god_name_resolver

FALLBACK_VOCABULARY_FILE = '/tmp/fallback_vocabulary.json'


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
        self._training_event_count = 0
        self._total_words_trained = 0
        self._reconciliation_attempts = 0
        self._reconciled_words = 0
        self._reconciliation_failures = 0
        self._last_reconciliation_time: float = 0
        self._reconciliation_interval_seconds: float = 60.0
        
        try:
            import sys
            parent = os.path.dirname(os.path.dirname(__file__))
            if parent not in sys.path:
                sys.path.insert(0, parent)
            from vocabulary_coordinator import get_vocabulary_coordinator
            self.vocab = get_vocabulary_coordinator()
            self.available = True
            print("[ResearchVocab] Vocabulary coordinator connected")
        except ImportError as e:
            print(f"[ResearchVocab] Vocabulary coordinator not available: {e}")
    
    def auto_reconcile(self) -> Optional[Dict]:
        """
        Automatically reconcile fallback vocabulary if conditions are met.
        
        Only reconciles if:
        - Vocab coordinator is available
        - /tmp/fallback_vocabulary.json exists and has entries
        - Last reconciliation was > 60 seconds ago
        
        Returns reconciliation result or None if skipped.
        """
        if not self.available:
            self._try_reconnect_vocab()
        
        if not self.available:
            return None
        
        if not os.path.exists(FALLBACK_VOCABULARY_FILE):
            return None
        
        now = time.time()
        time_since_last = now - self._last_reconciliation_time
        
        if time_since_last < self._reconciliation_interval_seconds:
            return None
        
        fallback_entries = self.get_fallback_words()
        if not fallback_entries:
            return None
        
        self._last_reconciliation_time = now
        
        try:
            result = self.reconcile_fallback_vocabulary()
            if result.get('imported', 0) > 0:
                print(f"[ResearchVocab] Auto-reconciled {result.get('imported', 0)} words")
            return result
        except Exception as e:
            print(f"[ResearchVocab] Auto-reconcile error: {e}")
            return {'success': False, 'error': str(e)}
    
    def train_from_research(self, research: Dict) -> Dict:
        """
        Train vocabulary from research results.
        
        Extracts text from all sources and trains vocabulary.
        """
        self.auto_reconcile()
        
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
        if not text or not text.strip():
            return {'success': False, 'reason': 'empty_text'}
        
        self._training_event_count += 1
        
        if not self.available or not self.vocab:
            return self._fallback_train(text, domain)
        
        try:
            if hasattr(self.vocab, 'train_from_text'):
                result = self.vocab.train_from_text(text, domain)
                new_words = 0
                if isinstance(result, dict):
                    new_words = result.get('new_words_learned', result.get('words_added', 0))
                    self._total_words_trained += new_words
                    return {
                        'success': True,
                        'text_length': len(text),
                        'domain': domain,
                        'result': result,
                        'new_words_learned': new_words,
                        'training_event': self._training_event_count,
                        'total_words_trained': self._total_words_trained,
                    }
                else:
                    return {
                        'success': True,
                        'text_length': len(text),
                        'domain': domain,
                        'trained': True,
                        'new_words_learned': 0,
                        'training_event': self._training_event_count,
                    }
            elif hasattr(self.vocab, 'learn_text'):
                self.vocab.learn_text(text, source=domain)
                return {
                    'success': True,
                    'text_length': len(text),
                    'domain': domain,
                    'method': 'learn_text',
                    'new_words_learned': 0,
                    'training_event': self._training_event_count,
                }
            elif hasattr(self.vocab, 'add_words'):
                import re
                words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
                unique_words = list(set(words))
                self.vocab.add_words(unique_words, domain=domain)
                self._total_words_trained += len(unique_words)
                return {
                    'success': True,
                    'text_length': len(text),
                    'domain': domain,
                    'method': 'add_words',
                    'new_words_learned': len(unique_words),
                    'training_event': self._training_event_count,
                    'total_words_trained': self._total_words_trained,
                }
            else:
                return self._fallback_train(text, domain)
        except Exception as e:
            fallback_result = self._fallback_train(text, domain)
            return {'success': False, 'error': str(e), 'fallback': fallback_result}
    
    def _fallback_train(self, text: str, domain: Optional[str] = None) -> Dict:
        """Fallback training when train_from_text not available."""
        import re
        
        words = re.findall(r'\b[a-z]{4,}\b', text.lower())
        unique_words = list(set(words))
        
        print(f"[ResearchVocab] Fallback extracted {len(unique_words)} words for domain '{domain}': {unique_words[:5]}...")
        
        persisted = self._persist_fallback_words(unique_words, domain)
        
        reconnected = self._try_reconnect_vocab()
        if reconnected and unique_words:
            try:
                if hasattr(self.vocab, 'add_words'):
                    self.vocab.add_words(unique_words, domain=domain)
                    print(f"[ResearchVocab] Reconnected and added {len(unique_words)} words")
            except Exception as e:
                print(f"[ResearchVocab] Reconnection add_words failed: {e}")
        
        return {
            'success': True,
            'fallback': True,
            'text_length': len(text),
            'words_extracted': len(unique_words),
            'sample_words': unique_words[:10],
            'all_words': unique_words,
            'domain': domain,
            'persisted': persisted,
            'reconnected': reconnected,
        }
    
    def _persist_fallback_words(self, words: List[str], domain: Optional[str]) -> bool:
        """Persist extracted words to file for recovery."""
        try:
            fallback_data = []
            if os.path.exists(FALLBACK_VOCABULARY_FILE):
                with open(FALLBACK_VOCABULARY_FILE, 'r') as f:
                    fallback_data = json.load(f)
            
            fallback_data.append({
                'domain': domain,
                'words': words,
                'extracted_at': time.time(),
                'word_count': len(words),
            })
            
            if len(fallback_data) > 100:
                fallback_data = fallback_data[-100:]
            
            with open(FALLBACK_VOCABULARY_FILE, 'w') as f:
                json.dump(fallback_data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"[ResearchVocab] Failed to persist fallback words: {e}")
            return False
    
    def _try_reconnect_vocab(self) -> bool:
        """Try to reconnect to vocabulary coordinator if not available."""
        if self.available and self.vocab:
            return True
        
        try:
            import sys
            parent = os.path.dirname(os.path.dirname(__file__))
            if parent not in sys.path:
                sys.path.insert(0, parent)
            from vocabulary_coordinator import get_vocabulary_coordinator
            self.vocab = get_vocabulary_coordinator()
            self.available = True
            print("[ResearchVocab] Reconnected to vocabulary coordinator")
            return True
        except Exception:
            return False
    
    def get_fallback_words(self) -> List[Dict]:
        """Retrieve all persisted fallback words."""
        try:
            if os.path.exists(FALLBACK_VOCABULARY_FILE):
                with open(FALLBACK_VOCABULARY_FILE, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"[ResearchVocab] Failed to read fallback words: {e}")
        return []
    
    def reconcile_fallback_vocabulary(self) -> Dict:
        """
        Reconcile fallback vocabulary when coordinator becomes available.
        
        Reads /tmp/fallback_vocabulary.json and imports all stored words
        into the vocabulary coordinator. Tracks analytics for reconciliation.
        """
        self._reconciliation_attempts += 1
        
        if not self._try_reconnect_vocab():
            return {
                'success': False,
                'reason': 'vocab_coordinator_unavailable',
                'reconciliation_attempt': self._reconciliation_attempts,
            }
        
        fallback_entries = self.get_fallback_words()
        if not fallback_entries:
            return {
                'success': True,
                'imported': 0,
                'message': 'No fallback vocabulary to reconcile',
                'reconciliation_attempt': self._reconciliation_attempts,
            }
        
        imported_count = 0
        failed_count = 0
        processed_indices = []
        domains_processed = []
        
        for idx, entry in enumerate(fallback_entries):
            words = entry.get('words', [])
            domain = entry.get('domain')
            
            if not words:
                processed_indices.append(idx)
                continue
            
            try:
                if hasattr(self.vocab, 'add_words'):
                    self.vocab.add_words(words, domain=domain)
                    imported_count += len(words)
                    processed_indices.append(idx)
                    domains_processed.append(domain)
                    self._reconciled_words += len(words)
                    print(f"[ResearchVocab] Reconciled {len(words)} words for domain '{domain}'")
                elif hasattr(self.vocab, 'train_from_text'):
                    combined_text = ' '.join(words)
                    result = self.vocab.train_from_text(combined_text, domain)
                    new_words = 0
                    if isinstance(result, dict):
                        new_words = result.get('new_words_learned', result.get('words_added', 0))
                    imported_count += new_words
                    processed_indices.append(idx)
                    domains_processed.append(domain)
                    self._reconciled_words += new_words
                    print(f"[ResearchVocab] Trained {new_words} words for domain '{domain}'")
                else:
                    failed_count += 1
                    self._reconciliation_failures += 1
                    print(f"[ResearchVocab] No suitable method to import words for '{domain}'")
            except Exception as e:
                failed_count += 1
                self._reconciliation_failures += 1
                print(f"[ResearchVocab] Failed to reconcile domain '{domain}': {e}")
        
        self._archive_reconciled_entries(processed_indices)
        
        return {
            'success': True,
            'imported': imported_count,
            'failed': failed_count,
            'entries_processed': len(processed_indices),
            'domains_processed': domains_processed,
            'reconciliation_attempt': self._reconciliation_attempts,
            'total_reconciled_words': self._reconciled_words,
            'total_failures': self._reconciliation_failures,
        }
    
    def _archive_reconciled_entries(self, processed_indices: List[int]) -> bool:
        """Archive or remove reconciled fallback entries."""
        try:
            if not os.path.exists(FALLBACK_VOCABULARY_FILE):
                return True
            
            with open(FALLBACK_VOCABULARY_FILE, 'r') as f:
                fallback_data = json.load(f)
            
            remaining = [
                entry for idx, entry in enumerate(fallback_data)
                if idx not in processed_indices
            ]
            
            if not remaining:
                archive_path = f"/tmp/fallback_vocabulary_archived_{int(time.time())}.json"
                os.rename(FALLBACK_VOCABULARY_FILE, archive_path)
                print(f"[ResearchVocab] All fallback vocabulary reconciled, archived to {archive_path}")
            else:
                with open(FALLBACK_VOCABULARY_FILE, 'w') as f:
                    json.dump(remaining, f, indent=2)
                print(f"[ResearchVocab] {len(remaining)} fallback entries remaining")
            
            return True
        except Exception as e:
            print(f"[ResearchVocab] Failed to archive reconciled entries: {e}")
            return False
    
    def get_reconciliation_analytics(self) -> Dict:
        """Get analytics about vocabulary reconciliation."""
        return {
            'reconciliation_attempts': self._reconciliation_attempts,
            'total_reconciled_words': self._reconciled_words,
            'total_failures': self._reconciliation_failures,
            'training_events': self._training_event_count,
            'total_words_trained': self._total_words_trained,
            'vocab_available': self.available,
            'pending_fallback_entries': len(self.get_fallback_words()),
        }
    
    def get_analytics(self) -> Dict:
        """
        Get analytics for monitoring vocabulary training.
        
        Returns dict with:
        - Training events count
        - Words trained
        - Reconciliation stats
        """
        return {
            'training_event_count': self._training_event_count,
            'total_words_trained': self._total_words_trained,
            'reconciliation_attempts': self._reconciliation_attempts,
            'reconciled_words': self._reconciled_words,
            'reconciliation_failures': self._reconciliation_failures,
            'vocab_available': self.available,
            'pending_fallback_entries': len(self.get_fallback_words()),
            'last_reconciliation_time': self._last_reconciliation_time,
            'reconciliation_interval_seconds': self._reconciliation_interval_seconds,
        }


_default_trainer: Optional[ResearchVocabularyTrainer] = None


def get_vocabulary_trainer() -> ResearchVocabularyTrainer:
    """Get or create the default vocabulary trainer singleton."""
    global _default_trainer
    if _default_trainer is None:
        _default_trainer = ResearchVocabularyTrainer()
    return _default_trainer
