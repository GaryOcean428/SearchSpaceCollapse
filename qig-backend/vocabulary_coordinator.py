#!/usr/bin/env python3
"""Vocabulary Learning Coordinator - Central hub for continuous vocabulary learning"""

from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

from word_validation import is_valid_english_word, validate_for_vocabulary, STOP_WORDS

try:
    from vocabulary_persistence import get_vocabulary_persistence
    VOCAB_PERSISTENCE_AVAILABLE = True
except ImportError:
    VOCAB_PERSISTENCE_AVAILABLE = False

try:
    from qig_tokenizer_postgresql import get_tokenizer
    TOKENIZER_AVAILABLE = True
except ImportError:
    try:
        from qig_tokenizer import get_tokenizer
        TOKENIZER_AVAILABLE = True
    except ImportError:
        TOKENIZER_AVAILABLE = False


class VocabularyCoordinator:
    def __init__(self):
        self.vocab_db = get_vocabulary_persistence() if VOCAB_PERSISTENCE_AVAILABLE else None
        self.tokenizer = get_tokenizer() if TOKENIZER_AVAILABLE else None
        self.observations_recorded = 0
        self.words_learned = 0
        self.merge_rules_learned = 0
        print("[VocabularyCoordinator] Initialized")
    
    def record_discovery(self, phrase: str, phi: float, kappa: float, source: str, details: Optional[Dict] = None) -> Dict:
        # NO threshold blocking - observe ALL discoveries, let emergence determine value
        if not phrase:
            return {'learned': False, 'reason': 'empty_phrase'}
        observations = self._extract_observations(phrase, phi, kappa, source)
        if not observations:
            return {'learned': False, 'reason': 'no_observations'}
        recorded = 0
        if self.vocab_db and self.vocab_db.enabled:
            recorded = self.vocab_db.record_vocabulary_batch(observations)
            self.observations_recorded += recorded
        new_tokens = 0
        weights_updated = False
        if self.tokenizer:
            new_tokens, weights_updated = self.tokenizer.add_vocabulary_observations(observations)
            self.words_learned += new_tokens
        # Merge rules based on observed phi - no hardcoded threshold
        merge_rules = 0
        if self.tokenizer:
            merge_rules = self._learn_merge_rules(phrase, phi, source)
            self.merge_rules_learned += merge_rules
        return {'learned': True, 'observations_recorded': recorded, 'new_tokens': new_tokens, 'weights_updated': weights_updated, 'merge_rules': merge_rules, 'phi': phi, 'source': source}
    
    def _extract_observations(self, phrase: str, phi: float, kappa: float, source: str) -> List[Dict]:
        """
        Extract vocabulary observations from a phrase.
        
        Uses fast local validation (no API calls) to avoid blocking the learning path.
        Dictionary verification happens asynchronously via background cleanup.
        
        CRITICAL: Observes ALL potential words, lets emergence determine value.
        Non-dictionary words are queued for proper noun consideration.
        """
        observations = []
        words = phrase.lower().strip().split()
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        for word, count in word_counts.items():
            if len(word) < 3:
                continue
            is_valid, reason = validate_for_vocabulary(word, require_dictionary=False)
            if not is_valid:
                continue
            observations.append({'word': word, 'phrase': phrase, 'phi': phi, 'kappa': kappa, 'source': source, 'type': 'word', 'frequency': count, 'needs_dict_check': True})
        for i in range(len(words) - 1):
            w1, w2 = words[i], words[i+1]
            if len(w1) >= 3 and len(w2) >= 3:
                is_valid1, _ = validate_for_vocabulary(w1, require_dictionary=False)
                is_valid2, _ = validate_for_vocabulary(w2, require_dictionary=False)
                if is_valid1 and is_valid2:
                    sequence = f"{w1} {w2}"
                    observations.append({'word': sequence, 'phrase': phrase, 'phi': phi * 1.2, 'kappa': kappa, 'source': source, 'type': 'sequence', 'frequency': 1})
        return observations
    
    def _learn_merge_rules(self, phrase: str, phi: float, source: str) -> int:
        if not self.tokenizer:
            return 0
        words = phrase.lower().strip().split()
        learned = 0
        for i in range(len(words) - 1):
            token_a = words[i]
            token_b = words[i + 1]
            if token_a in self.tokenizer.vocab and token_b in self.tokenizer.vocab:
                if self.tokenizer.learn_merge_rule(token_a, token_b, phi, source):
                    learned += 1
        return learned
    
    def record_god_assessment(self, god_name: str, target: str, assessment: Dict, outcome: Optional[Dict] = None) -> Dict:
        assessment_text = assessment.get('reasoning', '')
        if not assessment_text:
            return {'learned': False}
        confidence = assessment.get('confidence', 0.5)
        phi = confidence
        result = self.record_discovery(phrase=assessment_text, phi=phi, kappa=50.0, source=god_name, details={'target': target, 'assessment': assessment})
        if self.vocab_db and self.vocab_db.enabled and result['learned']:
            words = assessment_text.lower().strip().split()
            for word in words:
                if is_valid_english_word(word) and len(word) >= 3:
                    relevance = confidence
                    self.vocab_db.record_god_vocabulary(god_name, word, relevance)
        return result
    
    def get_god_specialized_vocabulary(self, god_name: str, min_relevance: float = 0.5, limit: int = 100) -> List[str]:
        if not self.vocab_db or not self.vocab_db.enabled:
            return []
        vocab = self.vocab_db.get_god_vocabulary(god_name, min_relevance, limit)
        return [word for word, _score in vocab]
    
    def sync_to_typescript(self) -> Dict:
        if not self.vocab_db or not self.vocab_db.enabled:
            return {'words': [], 'merge_rules': [], 'stats': {}}
        learned_words = self.vocab_db.get_learned_words(min_phi=0.6, limit=500)
        merge_rules = self.vocab_db.get_merge_rules(min_phi=0.6, limit=200)
        stats = self.vocab_db.get_vocabulary_stats()
        return {'words': learned_words, 'merge_rules': [{'token_a': a, 'token_b': b, 'merged': merged, 'phi_score': score} for a, b, merged, score in merge_rules], 'stats': stats, 'coordinator_metrics': {'observations_recorded': self.observations_recorded, 'words_learned': self.words_learned, 'merge_rules_learned': self.merge_rules_learned}}
    
    def sync_from_typescript(self, data: Dict) -> Dict:
        observations = data.get('observations', [])
        if not observations:
            return {'imported': 0}
        imported = 0
        if self.vocab_db and self.vocab_db.enabled:
            imported = self.vocab_db.record_vocabulary_batch(observations)
        new_tokens = 0
        if self.tokenizer:
            new_tokens, _updated = self.tokenizer.add_vocabulary_observations(observations)
        return {'imported': imported, 'new_tokens': new_tokens}
    
    def get_stats(self) -> Dict:
        stats = {'coordinator': {'observations_recorded': self.observations_recorded, 'words_learned': self.words_learned, 'merge_rules_learned': self.merge_rules_learned}}
        if self.tokenizer:
            stats['tokenizer'] = self.tokenizer.get_stats()
        if self.vocab_db and self.vocab_db.enabled:
            stats['database'] = self.vocab_db.get_vocabulary_stats()
        return stats
    
    def enhance_search_query(
        self, 
        query: str, 
        domain: Optional[str] = None,
        max_expansions: int = 5,
        min_phi: float = 0.6,
        recent_observations: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Enhance a search query with learned vocabulary.
        
        Uses vocabulary learned from prior research to expand search terms,
        creating a feedback loop where discoveries improve future searches.
        
        Relevance is computed using:
        - Co-occurrence: terms that appeared together in high-phi research
        - Domain matching: terms from same domain/source as query
        - Phi weighting: higher phi terms preferred
        - Semantic proximity: substring/prefix matching for related terms
        
        Args:
            query: Original search query/topic
            domain: Optional domain filter for vocabulary
            max_expansions: Maximum terms to add
            min_phi: Minimum phi threshold for vocabulary
            recent_observations: Optional recent vocabulary observations to prioritize
            
        Returns:
            Enhanced query info with original, expanded terms, and combined query
        """
        import re
        import logging
        
        logger = logging.getLogger(__name__)
        query_words = set(re.findall(r'\b[a-z]{3,}\b', query.lower()))
        
        expansion_candidates: List[Dict] = []
        
        if recent_observations:
            for obs in recent_observations:
                if isinstance(obs, dict):
                    word = obs.get('word', '')
                    phi = obs.get('phi', 0.5)
                    obs_topic = obs.get('topic', '')
                    
                    if not word or len(word) < 4 or word in query_words or phi < min_phi:
                        continue
                    
                    relevance = self._compute_term_relevance(
                        term=word,
                        query_words=query_words,
                        phi=phi,
                        source='recent_research',
                        target_domain=domain
                    )
                    
                    if relevance > 0.25:
                        expansion_candidates.append({
                            'word': word,
                            'phi': phi,
                            'source': 'recent_research',
                            'relevance': relevance
                        })
        
        if self.vocab_db and self.vocab_db.enabled:
            try:
                learned = self.vocab_db.get_learned_words(min_phi=min_phi, limit=300)
                
                for word_data in learned:
                    if isinstance(word_data, dict):
                        word = word_data.get('word', '')
                        phi = word_data.get('avg_phi', 0.5)
                        source = word_data.get('source', '')
                    elif isinstance(word_data, (list, tuple)) and len(word_data) >= 2:
                        word = word_data[0]
                        phi = word_data[1] if len(word_data) > 1 else 0.5
                        source = word_data[3] if len(word_data) > 3 else ''
                    else:
                        continue
                    
                    if not word or len(word) < 4 or word in query_words:
                        continue
                    
                    if any(c['word'] == word for c in expansion_candidates):
                        continue
                    
                    relevance = self._compute_term_relevance(word, query_words, phi, source, domain)
                    if relevance > 0.25:
                        expansion_candidates.append({
                            'word': word,
                            'phi': phi,
                            'source': source,
                            'relevance': relevance
                        })
            except Exception as e:
                logger.warning(f"Vocabulary DB query failed: {e}")
        
        if self.tokenizer and hasattr(self.tokenizer, 'vocab'):
            try:
                for vocab_word, weight_info in list(self.tokenizer.vocab.items())[:500]:
                    if vocab_word in query_words or len(vocab_word) < 4:
                        continue
                    
                    if any(c['word'] == vocab_word for c in expansion_candidates):
                        continue
                    
                    if isinstance(weight_info, dict):
                        phi = weight_info.get('phi', 0.5)
                        source = weight_info.get('source', 'tokenizer')
                    else:
                        phi = 0.5
                        source = 'tokenizer'
                    
                    if phi >= min_phi:
                        relevance = self._compute_term_relevance(vocab_word, query_words, phi, source, domain)
                        if relevance > 0.25:
                            expansion_candidates.append({
                                'word': vocab_word,
                                'phi': phi,
                                'source': source,
                                'relevance': relevance
                            })
            except Exception as e:
                logger.warning(f"Tokenizer vocab query failed: {e}")
        
        expansion_candidates.sort(key=lambda x: x['relevance'], reverse=True)
        top_terms = [c['word'] for c in expansion_candidates[:max_expansions]]
        
        if top_terms:
            enhanced_query = f"{query} {' '.join(top_terms)}"
        else:
            enhanced_query = query
        
        return {
            'original_query': query,
            'expansion_terms': top_terms,
            'enhanced_query': enhanced_query,
            'terms_added': len(top_terms),
            'vocabulary_utilized': len(expansion_candidates) > 0,
            'candidates_evaluated': len(expansion_candidates),
        }
    
    def _compute_term_relevance(
        self, 
        term: str, 
        query_words: set, 
        phi: float,
        source: str = '',
        target_domain: Optional[str] = None
    ) -> float:
        """
        Compute relevance of a vocabulary term to a query.
        
        REQUIRES semantic match (prefix/substring/overlap) for ALL terms.
        Recency boosts score but does NOT bypass semantic validation.
        
        This ensures only terms with lexical overlap to the current query
        are admitted, preventing noise from unrelated high-phi vocabulary.
        """
        semantic_score = 0.0
        term_lower = term.lower()
        for qw in query_words:
            if len(qw) >= 3:
                if term_lower.startswith(qw) or qw.startswith(term_lower):
                    semantic_score = max(semantic_score, 0.5)
                elif term_lower in qw or qw in term_lower:
                    semantic_score = max(semantic_score, 0.4)
                elif len(qw) >= 4 and len(set(term_lower) & set(qw)) >= 4:
                    semantic_score = max(semantic_score, 0.2)
        
        if semantic_score == 0:
            return 0.0
        
        base_score = phi * 0.2
        
        is_recent = source == 'recent_research'
        recency_boost = 0.3 if is_recent else 0.0
        
        source_boost = 0.0
        source_lower = source.lower() if source else ''
        if 'searxng' in source_lower or 'shadow' in source_lower:
            source_boost = 0.1
        
        total = base_score + semantic_score + recency_boost + source_boost
        return min(total, 1.0)
    
    def train_from_text(self, text: str, domain: Optional[str] = None) -> Dict:
        """
        Train vocabulary from arbitrary text.
        
        Used by research module to learn from Wikipedia, arXiv, etc.
        Extracts words, updates vocabulary, returns training metrics.
        
        Args:
            text: Text to train from
            domain: Optional domain tag for organizing vocabulary
        
        Returns:
            Training metrics
        """
        import re
        
        words = re.findall(r'\b[a-z]{3,}\b', text.lower())
        
        stopwords = {'the', 'and', 'for', 'that', 'this', 'with', 'was', 'are', 
                     'has', 'have', 'been', 'were', 'from', 'which', 'also', 
                     'but', 'not', 'can', 'may', 'will', 'would', 'could',
                     'their', 'there', 'these', 'those', 'than', 'then'}
        
        filtered_words = [w for w in words if w not in stopwords and len(w) >= 4]
        
        word_counts: Dict[str, int] = {}
        for word in filtered_words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        observations = []
        for word, count in word_counts.items():
            if count >= 2 or len(word) >= 6:
                phi = min(0.8, 0.5 + (count * 0.05))
                observations.append({
                    'word': word,
                    'phrase': text[:100] if len(text) > 100 else text,
                    'phi': phi,
                    'kappa': 50.0,
                    'source': domain or 'research',
                    'type': 'word',
                    'frequency': count
                })
        
        recorded = 0
        new_tokens = 0
        
        if observations:
            if self.vocab_db and self.vocab_db.enabled:
                recorded = self.vocab_db.record_vocabulary_batch(observations)
                self.observations_recorded += recorded
            
            if self.tokenizer:
                new_tokens, _updated = self.tokenizer.add_vocabulary_observations(observations)
                self.words_learned += new_tokens
        
        return {
            'words_processed': len(words),
            'unique_words': len(word_counts),
            'observations_created': len(observations),
            'new_words_learned': new_tokens,
            'recorded_to_db': recorded,
            'vocabulary_size': len(self.tokenizer.vocab) if self.tokenizer else 0,
            'domain': domain,
        }


_vocabulary_coordinator: Optional[VocabularyCoordinator] = None


def get_vocabulary_coordinator() -> VocabularyCoordinator:
    global _vocabulary_coordinator
    if _vocabulary_coordinator is None:
        _vocabulary_coordinator = VocabularyCoordinator()
    return _vocabulary_coordinator