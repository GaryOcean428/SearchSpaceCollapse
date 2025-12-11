#!/usr/bin/env python3
"""Vocabulary Persistence - PostgreSQL integration for shared vocabulary system"""

import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

try:
    import psycopg2
    from psycopg2.extras import execute_values
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("[WARNING] psycopg2 not available - vocabulary persistence disabled")


class VocabularyPersistence:
    def __init__(self, connection_string: Optional[str] = None):
        self.connection_string = connection_string or os.getenv('DATABASE_URL')
        self.enabled = PSYCOPG2_AVAILABLE and bool(self.connection_string)
        
        if not self.enabled:
            print("[VocabularyPersistence] Disabled (no database connection)")
            return
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            print("[VocabularyPersistence] Connected to PostgreSQL")
        except Exception as e:
            print(f"[VocabularyPersistence] Connection failed: {e}")
            self.enabled = False
    
    def _connect(self):
        if not PSYCOPG2_AVAILABLE:
            raise RuntimeError("psycopg2 not available")
        return psycopg2.connect(self.connection_string)
    
    def load_bip39_words(self, words: List[str]) -> int:
        if not self.enabled:
            return 0
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    data = [(word, idx) for idx, word in enumerate(words)]
                    execute_values(cur, """INSERT INTO bip39_words (word, word_index) VALUES %s ON CONFLICT (word) DO NOTHING""", data)
                    conn.commit()
                    return len(words)
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to load BIP39: {e}")
            return 0
    
    def get_bip39_words(self) -> List[str]:
        if not self.enabled:
            return []
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT word FROM bip39_words ORDER BY word_index")
                    return [row[0] for row in cur.fetchall()]
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to get BIP39 words: {e}")
            return []
    
    def record_vocabulary_observation(self, word: str, phrase: str, phi: float, kappa: float, source: str, observation_type: str = 'word') -> bool:
        if not self.enabled:
            return False
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT record_vocab_observation(%s, %s, %s, %s, %s, %s)", (word, phrase, phi, kappa, source, observation_type))
                    conn.commit()
                    return True
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to record observation: {e}")
            return False
    
    def record_vocabulary_batch(self, observations: List[Dict]) -> int:
        if not self.enabled or not observations:
            return 0
        recorded = 0
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    for obs in observations:
                        try:
                            cur.execute("SELECT record_vocab_observation(%s, %s, %s, %s, %s, %s)", (obs.get('word', ''), obs.get('phrase', ''), obs.get('phi', 0.0), obs.get('kappa', 50.0), obs.get('source', 'unknown'), obs.get('type', 'word')))
                            recorded += 1
                        except Exception as e:
                            print(f"[VocabularyPersistence] Failed to record {obs.get('word')}: {e}")
                    conn.commit()
        except Exception as e:
            print(f"[VocabularyPersistence] Batch record failed: {e}")
        return recorded
    
    def get_learned_words(self, min_phi: float = 0.0, limit: int = 1000, source: Optional[str] = None) -> List[Dict]:
        if not self.enabled:
            return []
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    if source:
                        cur.execute("SELECT word, avg_phi, max_phi, frequency, source FROM learned_words WHERE avg_phi >= %s AND source = %s ORDER BY avg_phi DESC, frequency DESC LIMIT %s", (min_phi, source, limit))
                    else:
                        cur.execute("SELECT word, avg_phi, max_phi, frequency, source FROM learned_words WHERE avg_phi >= %s ORDER BY avg_phi DESC, frequency DESC LIMIT %s", (min_phi, limit))
                    return [{'word': row[0], 'avg_phi': float(row[1]), 'max_phi': float(row[2]), 'frequency': int(row[3]), 'source': row[4]} for row in cur.fetchall()]
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to get learned words: {e}")
            return []
    
    def get_high_phi_vocabulary(self, min_phi: float = 0.7, limit: int = 100) -> List[Tuple[str, float]]:
        if not self.enabled:
            return []
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM get_high_phi_vocabulary(%s, %s)", (min_phi, limit))
                    return [(row[0], float(row[1])) for row in cur.fetchall()]
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to get high-Φ vocab: {e}")
            return []
    
    def mark_word_integrated(self, word: str) -> bool:
        if not self.enabled:
            return False
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE learned_words SET is_integrated = TRUE WHERE word = %s", (word,))
                    conn.commit()
                    return True
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to mark {word} integrated: {e}")
            return False
    
    def record_merge_rule(self, token_a: str, token_b: str, merged_token: str, phi_score: float, learned_from: Optional[str] = None) -> bool:
        if not self.enabled:
            return False
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("INSERT INTO bpe_merge_rules (token_a, token_b, merged_token, phi_score, learned_from) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (token_a, token_b) DO UPDATE SET phi_score = GREATEST(bpe_merge_rules.phi_score, %s), frequency = bpe_merge_rules.frequency + 1", (token_a, token_b, merged_token, phi_score, learned_from, phi_score))
                    conn.commit()
                    return True
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to record merge rule: {e}")
            return False
    
    def get_merge_rules(self, min_phi: float = 0.5, limit: int = 1000) -> List[Tuple[str, str, str, float]]:
        if not self.enabled:
            return []
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT token_a, token_b, merged_token, phi_score FROM bpe_merge_rules WHERE phi_score >= %s ORDER BY phi_score DESC LIMIT %s", (min_phi, limit))
                    return [(row[0], row[1], row[2], float(row[3])) for row in cur.fetchall()]
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to get merge rules: {e}")
            return []
    
    def record_god_vocabulary(self, god_name: str, word: str, relevance_score: float) -> bool:
        if not self.enabled:
            return False
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("INSERT INTO god_vocabulary_profiles (god_name, word, relevance_score, usage_count) VALUES (%s, %s, %s, 1) ON CONFLICT (god_name, word) DO UPDATE SET relevance_score = (god_vocabulary_profiles.relevance_score + %s) / 2, usage_count = god_vocabulary_profiles.usage_count + 1, last_used = NOW()", (god_name, word, relevance_score, relevance_score))
                    conn.commit()
                    return True
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to record god vocabulary: {e}")
            return False
    
    def get_god_vocabulary(self, god_name: str, min_relevance: float = 0.5, limit: int = 100) -> List[Tuple[str, float]]:
        if not self.enabled:
            return []
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT word, relevance_score FROM god_vocabulary_profiles WHERE god_name = %s AND relevance_score >= %s ORDER BY relevance_score DESC, usage_count DESC LIMIT %s", (god_name, min_relevance, limit))
                    return [(row[0], float(row[1])) for row in cur.fetchall()]
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to get god vocabulary: {e}")
            return []
    
    def get_vocabulary_stats(self) -> Dict:
        if not self.enabled:
            return {'total_words': 0, 'bip39_words': 0, 'learned_words': 0, 'high_phi_words': 0, 'merge_rules': 0}
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT total_words, bip39_words, learned_words, high_phi_words, merge_rules, last_updated FROM vocabulary_stats ORDER BY last_updated DESC LIMIT 1")
                    row = cur.fetchone()
                    if row:
                        return {'total_words': int(row[0]), 'bip39_words': int(row[1]), 'learned_words': int(row[2]), 'high_phi_words': int(row[3]), 'merge_rules': int(row[4]), 'last_updated': row[5].isoformat()}
                    else:
                        cur.execute("SELECT update_vocabulary_stats()")
                        conn.commit()
                        return self.get_vocabulary_stats()
        except Exception as e:
            print(f"[VocabularyPersistence] Failed to get stats: {e}")
            return {'total_words': 0, 'bip39_words': 0, 'learned_words': 0, 'high_phi_words': 0, 'merge_rules': 0}


_vocabulary_persistence: Optional[VocabularyPersistence] = None


def get_vocabulary_persistence() -> VocabularyPersistence:
    global _vocabulary_persistence
    if _vocabulary_persistence is None:
        _vocabulary_persistence = VocabularyPersistence()
    return _vocabulary_persistence