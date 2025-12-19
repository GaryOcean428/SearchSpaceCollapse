#!/usr/bin/env python3
"""
Dictionary API Integration - Validates words against dictionaryapi.dev
=====================================================================

Uses the free dictionary API to validate that words are real English words
before adding them to the tokenizer vocabulary.

Features:
- Async batch validation for efficiency
- PostgreSQL caching to avoid repeat API calls
- Separate tracking for names and places (not in dictionary)
- Rate limiting to be a good API citizen
"""

import os
import time
import logging
import requests
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime, timedelta
import threading

logger = logging.getLogger(__name__)

DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en"

REQUESTS_PER_MINUTE = 30
MIN_REQUEST_INTERVAL = 60.0 / REQUESTS_PER_MINUTE

CACHE_TTL_DAYS = 30

_db_pool = None
_db_lock = threading.Lock()


def _get_db_connection():
    """Get database connection for caching."""
    global _db_pool
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return None
    
    try:
        import psycopg2
        from psycopg2 import pool
        
        with _db_lock:
            if _db_pool is None:
                _db_pool = pool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=5,
                    dsn=database_url
                )
            return _db_pool.getconn()
    except Exception as e:
        logger.warning(f"[DictionaryAPI] DB connection failed: {e}")
        return None


def _return_db_connection(conn):
    """Return connection to pool."""
    global _db_pool
    if _db_pool and conn:
        try:
            _db_pool.putconn(conn)
        except Exception:
            pass


def _ensure_tables():
    """Create dictionary cache and names/places tables if they don't exist."""
    conn = _get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS dictionary_cache (
                    word VARCHAR(100) PRIMARY KEY,
                    is_valid BOOLEAN NOT NULL,
                    definition TEXT,
                    part_of_speech VARCHAR(50),
                    checked_at TIMESTAMP DEFAULT NOW(),
                    api_response JSONB
                );
                
                CREATE INDEX IF NOT EXISTS idx_dictionary_cache_valid 
                ON dictionary_cache(is_valid);
                
                CREATE INDEX IF NOT EXISTS idx_dictionary_cache_checked 
                ON dictionary_cache(checked_at);
            """)
            
            cur.execute("""
                CREATE TABLE IF NOT EXISTS proper_nouns (
                    id SERIAL PRIMARY KEY,
                    word VARCHAR(100) UNIQUE NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    context TEXT,
                    phi_score REAL DEFAULT 0.5,
                    source VARCHAR(100),
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_seen_at TIMESTAMP DEFAULT NOW(),
                    occurrence_count INTEGER DEFAULT 1
                );
                
                CREATE INDEX IF NOT EXISTS idx_proper_nouns_category 
                ON proper_nouns(category);
                
                CREATE INDEX IF NOT EXISTS idx_proper_nouns_word 
                ON proper_nouns(word);
            """)
            
            conn.commit()
            logger.info("[DictionaryAPI] Tables created/verified")
            return True
    except Exception as e:
        logger.error(f"[DictionaryAPI] Table creation failed: {e}")
        conn.rollback()
        return False
    finally:
        _return_db_connection(conn)


_tables_initialized = False
_last_request_time = 0.0


class DictionaryValidator:
    """Validates words against Dictionary API with caching."""
    
    def __init__(self):
        global _tables_initialized
        if not _tables_initialized:
            _tables_initialized = _ensure_tables()
        
        self._local_cache: Dict[str, bool] = {}
        self._pending_names: List[Dict] = []
        self._pending_places: List[Dict] = []
        logger.info("[DictionaryAPI] Validator initialized")
    
    def _check_cache(self, word: str) -> Optional[bool]:
        """Check if word is in local or DB cache."""
        word_lower = word.lower().strip()
        
        if word_lower in self._local_cache:
            return self._local_cache[word_lower]
        
        conn = _get_db_connection()
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT is_valid FROM dictionary_cache 
                    WHERE word = %s 
                    AND checked_at > NOW() - INTERVAL '%s days'
                """, (word_lower, CACHE_TTL_DAYS))
                
                row = cur.fetchone()
                if row:
                    self._local_cache[word_lower] = row[0]
                    return row[0]
        except Exception as e:
            logger.warning(f"[DictionaryAPI] Cache check failed: {e}")
        finally:
            _return_db_connection(conn)
        
        return None
    
    def _cache_result(self, word: str, is_valid: bool, definition: str = None, 
                      part_of_speech: str = None, api_response: dict = None):
        """Cache validation result in local memory and DB."""
        word_lower = word.lower().strip()
        self._local_cache[word_lower] = is_valid
        
        conn = _get_db_connection()
        if not conn:
            return
        
        try:
            import json
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO dictionary_cache (word, is_valid, definition, part_of_speech, api_response, checked_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (word) DO UPDATE SET
                        is_valid = EXCLUDED.is_valid,
                        definition = EXCLUDED.definition,
                        part_of_speech = EXCLUDED.part_of_speech,
                        api_response = EXCLUDED.api_response,
                        checked_at = NOW()
                """, (
                    word_lower, 
                    is_valid, 
                    definition,
                    part_of_speech,
                    json.dumps(api_response) if api_response else None
                ))
                conn.commit()
        except Exception as e:
            logger.warning(f"[DictionaryAPI] Cache write failed: {e}")
            conn.rollback()
        finally:
            _return_db_connection(conn)
    
    def _rate_limit(self):
        """Enforce rate limiting."""
        global _last_request_time
        
        now = time.time()
        elapsed = now - _last_request_time
        
        if elapsed < MIN_REQUEST_INTERVAL:
            time.sleep(MIN_REQUEST_INTERVAL - elapsed)
        
        _last_request_time = time.time()
    
    def validate_word(self, word: str) -> Tuple[bool, Optional[str]]:
        """
        Validate a single word against the Dictionary API.
        
        Returns:
            (is_valid, definition_or_reason)
        """
        if not word or len(word) < 2:
            return False, "too_short"
        
        word_lower = word.lower().strip()
        
        allowed_chars = set("abcdefghijklmnopqrstuvwxyz'-")
        if not all(c in allowed_chars for c in word_lower):
            return False, "invalid_chars"
        
        if not word_lower[0].isalpha():
            return False, "invalid_start"
        
        api_word = word_lower.replace("'", "").replace("-", "")
        
        cached = self._check_cache(word_lower)
        if cached is not None:
            return cached, "cached"
        
        self._rate_limit()
        
        try:
            response = requests.get(
                f"{DICTIONARY_API_BASE}/{word_lower}",
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    meanings = data[0].get('meanings', [])
                    if meanings:
                        definition = meanings[0].get('definitions', [{}])[0].get('definition', '')
                        part_of_speech = meanings[0].get('partOfSpeech', '')
                        
                        self._cache_result(
                            word_lower, 
                            True, 
                            definition[:500] if definition else None,
                            part_of_speech,
                            data[0]
                        )
                        return True, definition
            
            elif response.status_code == 404:
                self._cache_result(word_lower, False)
                return False, "not_found"
            
            else:
                logger.warning(f"[DictionaryAPI] Unexpected status {response.status_code} for '{word}'")
                return None, f"api_error_{response.status_code}"
                
        except requests.exceptions.Timeout:
            logger.warning(f"[DictionaryAPI] Timeout for '{word}'")
            return None, "timeout"
        except Exception as e:
            logger.error(f"[DictionaryAPI] Error validating '{word}': {e}")
            return None, str(e)
    
    def validate_batch(self, words: List[str], skip_cached: bool = True) -> Dict[str, Tuple[bool, str]]:
        """
        Validate multiple words, using cache where possible.
        
        Returns:
            Dict mapping word -> (is_valid, reason)
        """
        results = {}
        to_check = []
        
        for word in words:
            word_lower = word.lower().strip()
            if not word_lower or len(word_lower) < 2:
                results[word] = (False, "too_short")
                continue
            
            if not word_lower.isalpha():
                results[word] = (False, "not_alphabetic")
                continue
            
            if skip_cached:
                cached = self._check_cache(word_lower)
                if cached is not None:
                    results[word] = (cached, "cached")
                    continue
            
            to_check.append(word)
        
        for word in to_check:
            is_valid, reason = self.validate_word(word)
            results[word] = (is_valid if is_valid is not None else False, reason or "unknown")
        
        return results
    
    def record_proper_noun(self, word: str, category: str, context: str = None, 
                           phi: float = 0.5, source: str = None):
        """
        Record a proper noun (name or place) to the proper_nouns table.
        
        Categories: 'name', 'place', 'brand', 'organization', 'other'
        """
        word_lower = word.lower().strip()
        
        conn = _get_db_connection()
        if not conn:
            self._pending_names.append({
                'word': word_lower,
                'category': category,
                'context': context,
                'phi': phi,
                'source': source
            })
            return
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO proper_nouns (word, category, context, phi_score, source, last_seen_at, occurrence_count)
                    VALUES (%s, %s, %s, %s, %s, NOW(), 1)
                    ON CONFLICT (word) DO UPDATE SET
                        category = CASE 
                            WHEN proper_nouns.phi_score < EXCLUDED.phi_score THEN EXCLUDED.category
                            ELSE proper_nouns.category
                        END,
                        context = COALESCE(EXCLUDED.context, proper_nouns.context),
                        phi_score = GREATEST(proper_nouns.phi_score, EXCLUDED.phi_score),
                        last_seen_at = NOW(),
                        occurrence_count = proper_nouns.occurrence_count + 1
                """, (word_lower, category, context, phi, source))
                conn.commit()
        except Exception as e:
            logger.warning(f"[DictionaryAPI] Failed to record proper noun '{word}': {e}")
            conn.rollback()
        finally:
            _return_db_connection(conn)
    
    def is_proper_noun(self, word: str) -> Optional[str]:
        """
        Check if word is a known proper noun.
        
        Returns:
            Category if proper noun, None otherwise
        """
        word_lower = word.lower().strip()
        
        conn = _get_db_connection()
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT category FROM proper_nouns WHERE word = %s
                """, (word_lower,))
                row = cur.fetchone()
                return row[0] if row else None
        except Exception as e:
            logger.warning(f"[DictionaryAPI] Proper noun check failed: {e}")
            return None
        finally:
            _return_db_connection(conn)
    
    def get_stats(self) -> Dict:
        """Get validation statistics."""
        conn = _get_db_connection()
        if not conn:
            return {'local_cache_size': len(self._local_cache)}
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE is_valid = true) as valid,
                        COUNT(*) FILTER (WHERE is_valid = false) as invalid
                    FROM dictionary_cache
                """)
                cache_stats = cur.fetchone()
                
                cur.execute("""
                    SELECT category, COUNT(*) as count
                    FROM proper_nouns
                    GROUP BY category
                """)
                proper_noun_stats = dict(cur.fetchall())
                
                return {
                    'local_cache_size': len(self._local_cache),
                    'db_cache_total': cache_stats[0] if cache_stats else 0,
                    'db_cache_valid': cache_stats[1] if cache_stats else 0,
                    'db_cache_invalid': cache_stats[2] if cache_stats else 0,
                    'proper_nouns': proper_noun_stats
                }
        except Exception as e:
            logger.warning(f"[DictionaryAPI] Stats query failed: {e}")
            return {'local_cache_size': len(self._local_cache), 'error': str(e)}
        finally:
            _return_db_connection(conn)


_validator: Optional[DictionaryValidator] = None


def get_dictionary_validator() -> DictionaryValidator:
    """Get singleton dictionary validator instance."""
    global _validator
    if _validator is None:
        _validator = DictionaryValidator()
    return _validator


def is_real_english_word(word: str) -> bool:
    """
    Quick check if word is a real English word.
    
    This is the main entry point for vocabulary validation.
    Uses cached results where available.
    """
    validator = get_dictionary_validator()
    is_valid, _ = validator.validate_word(word)
    return is_valid == True


def validate_vocabulary_batch(words: List[str]) -> Dict[str, bool]:
    """
    Validate a batch of words for vocabulary inclusion.
    
    Returns dict mapping word -> is_valid
    """
    validator = get_dictionary_validator()
    results = validator.validate_batch(words)
    return {word: is_valid for word, (is_valid, _) in results.items()}
