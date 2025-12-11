#!/usr/bin/env python3
"""Vocabulary Learning Coordinator - Central hub for continuous vocabulary learning"""

from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

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
        if not phrase or phi < 0.5:
            return {'learned': False, 'reason': 'below_threshold'}
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
        merge_rules = 0
        if phi >= 0.7 and self.tokenizer:
            merge_rules = self._learn_merge_rules(phrase, phi, source)
            self.merge_rules_learned += merge_rules
        return {'learned': True, 'observations_recorded': recorded, 'new_tokens': new_tokens, 'weights_updated': weights_updated, 'merge_rules': merge_rules, 'phi': phi, 'source': source}
    
    def _extract_observations(self, phrase: str, phi: float, kappa: float, source: str) -> List[Dict]:
        observations = []
        words = phrase.lower().strip().split()
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        for word, count in word_counts.items():
            if len(word) < 3 or word in {'the', 'and', 'for', 'that', 'this', 'with', 'was', 'are'}:
                continue
            observations.append({'word': word, 'phrase': phrase, 'phi': phi, 'kappa': kappa, 'source': source, 'type': 'word', 'frequency': count})
        for i in range(len(words) - 1):
            if len(words[i]) >= 3 and len(words[i+1]) >= 3:
                sequence = f"{words[i]} {words[i+1]}"
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
                if len(word) >= 3:
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


_vocabulary_coordinator: Optional[VocabularyCoordinator] = None


def get_vocabulary_coordinator() -> VocabularyCoordinator:
    global _vocabulary_coordinator
    if _vocabulary_coordinator is None:
        _vocabulary_coordinator = VocabularyCoordinator()
    return _vocabulary_coordinator