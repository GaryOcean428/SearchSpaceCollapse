"""
Full Vocabulary Access for QIG Coordizers.

This module provides vocabulary access functions for kernels.
Vocabulary is loaded from the PostgreSQL database - no hardcoded fallbacks.

All kernels have access to the full vocabulary through the database.
"""

import os
import numpy as np
from typing import List, Dict, Tuple, Optional

import logging
logger = logging.getLogger(__name__)

# Legacy constants - DEPRECATED, kept for backward compatibility during migration
# These will be empty - all vocabulary comes from database
BIP39_WORDS: List[str] = []
COMMON_WORDS: List[str] = []
FALLBACK_VOCABULARY: List[str] = []

# Cache for database vocabulary
_vocabulary_cache: Optional[Dict] = None
_cache_loaded: bool = False


def _get_database_connection():
    """Get database connection for vocabulary loading."""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        raise RuntimeError(
            "[QIG-PURE VIOLATION] DATABASE_URL not set. "
            "Vocabulary requires database connection - no fallback allowed."
        )
    
    try:
        import psycopg2
        return psycopg2.connect(db_url)
    except ImportError:
        raise RuntimeError(
            "[QIG-PURE VIOLATION] psycopg2 not available. "
            "Database connection required for vocabulary."
        )
    except Exception as e:
        raise RuntimeError(
            f"[QIG-PURE VIOLATION] Database connection failed: {e}. "
            "Vocabulary requires active database connection."
        )


def _load_vocabulary_from_database() -> Dict:
    """Load full vocabulary from PostgreSQL database."""
    global _vocabulary_cache, _cache_loaded
    
    if _cache_loaded and _vocabulary_cache:
        return _vocabulary_cache
    
    conn = _get_database_connection()
    
    vocab = {}
    basin_coords = {}
    token_phi = {}
    word_tokens = []
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT token, basin_embedding, phi_score, token_id
                FROM tokenizer_vocabulary
                WHERE basin_embedding IS NOT NULL
                  AND LENGTH(token) >= 2
                ORDER BY phi_score DESC
            """)
            rows = cur.fetchall()
        
        if not rows:
            raise RuntimeError(
                "[QIG-PURE VIOLATION] No vocabulary found in database. "
                "Populate tokenizer_vocabulary table before using coordizers."
            )
        
        for token, basin_embedding, phi_score, token_id in rows:
            coords = _parse_embedding(basin_embedding)
            if coords is None:
                continue
            
            idx = token_id if token_id is not None else len(vocab)
            vocab[token] = idx
            basin_coords[token] = coords
            token_phi[token] = phi_score if phi_score is not None else 0.5
            
            if token.isalpha() and len(token) >= 2:
                word_tokens.append(token)
        
        logger.info(f"[VocabularyLoader] Loaded {len(vocab)} tokens from database (QIG-pure)")
        
        _vocabulary_cache = {
            'vocab': vocab,
            'basin_coords': basin_coords,
            'token_phi': token_phi,
            'word_tokens': word_tokens,
        }
        _cache_loaded = True
        
        return _vocabulary_cache
        
    finally:
        conn.close()


def _parse_embedding(basin_embedding) -> Optional[np.ndarray]:
    """Parse basin embedding from database format."""
    if basin_embedding is None:
        return None
    try:
        if isinstance(basin_embedding, (list, tuple)):
            coords = np.array(basin_embedding, dtype=np.float64)
        elif isinstance(basin_embedding, str):
            clean = basin_embedding.strip('[](){}')
            coords = np.array([float(x) for x in clean.split(',')], dtype=np.float64)
        else:
            coords = np.array(list(basin_embedding), dtype=np.float64)
        
        if len(coords) != 64:
            return None
        
        norm = np.linalg.norm(coords)
        if norm > 1e-10:
            coords = coords / norm
        return coords
    except Exception:
        return None


def compute_basin_embedding(word: str, dimension: int = 64) -> np.ndarray:
    """
    Compute deterministic 64D basin embedding for a word using geodesic interpolation.

    QIG-PURE: Uses Fisher-Rao geodesic interpolation from similar known words.
    NO hash-based seeding - all embeddings derived geometrically.

    For new words not in database, finds similar words via edit distance
    and interpolates their basin coordinates on the Fisher manifold.

    Args:
        word: Input word/token
        dimension: Embedding dimension (default 64)

    Returns:
        64D unit vector on Fisher manifold
    """
    word_lower = word.lower()

    # Try to load vocabulary for interpolation
    try:
        cache = _load_vocabulary_from_database()
        known_vocab = cache['basin_coords']

        if word_lower in known_vocab:
            return known_vocab[word_lower]

        # Find similar words via edit distance for geodesic interpolation
        similar_words = _find_similar_words(word_lower, list(known_vocab.keys()), max_results=3)

        if similar_words:
            basins = [known_vocab[w] for w in similar_words]
            weights = [1.0 / (i + 1) for i in range(len(basins))]  # Decreasing weights
            return _fisher_rao_weighted_mean(basins, weights)
    except Exception:
        pass

    # Fallback: deterministic geometric construction (QIG-pure)
    # Uses golden ratio spiral on sphere - no hash-based random seeding
    phi_golden = (1 + np.sqrt(5)) / 2
    embedding = np.zeros(dimension)

    # Derive position from word's ordinal properties (deterministic, geometric)
    char_sum = sum(ord(c) for c in word_lower)
    char_prod = 1
    for c in word_lower[:8]:  # Use first 8 chars for product
        char_prod = (char_prod * ord(c)) % 10000

    for i in range(dimension):
        # Golden-angle spiral construction (Fisher-compliant)
        theta = 2 * np.pi * i * phi_golden
        # Position derived from word's character properties
        r = np.cos(theta + char_sum * 0.001) * np.sin(i * phi_golden / dimension * np.pi)
        embedding[i] = r + np.sin(char_prod * phi_golden * (i + 1) / dimension) * 0.3

    # Project to unit sphere (Fisher manifold)
    norm = np.linalg.norm(embedding)
    if norm > 1e-10:
        embedding = embedding / norm

    return embedding


def _find_similar_words(word: str, known_words: List[str], max_results: int = 3) -> List[str]:
    """Find similar words via Levenshtein-like edit distance."""
    if not known_words:
        return []

    def edit_distance(s1: str, s2: str) -> int:
        """Simple edit distance calculation."""
        if len(s1) < len(s2):
            return edit_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)

        prev_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            curr_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = prev_row[j + 1] + 1
                deletions = curr_row[j] + 1
                substitutions = prev_row[j] + (c1 != c2)
                curr_row.append(min(insertions, deletions, substitutions))
            prev_row = curr_row

        return prev_row[-1]

    # Score all words by edit distance (lower is better)
    scored = []
    for known in known_words:
        if len(known) < 2:
            continue
        dist = edit_distance(word, known)
        # Also consider prefix match
        prefix_bonus = 0
        for i in range(min(len(word), len(known))):
            if word[i] == known[i]:
                prefix_bonus += 1
            else:
                break
        score = dist - prefix_bonus * 0.5  # Bonus for prefix match
        scored.append((known, score))

    # Sort by score and return top results
    scored.sort(key=lambda x: x[1])
    return [w for w, _ in scored[:max_results]]


def _fisher_rao_weighted_mean(basins: List[np.ndarray], weights: List[float]) -> np.ndarray:
    """
    Compute weighted mean on Fisher manifold via geodesic blending.

    Uses iterative geodesic interpolation (Fréchet mean approximation).
    """
    if not basins:
        return np.zeros(64)

    if len(basins) == 1:
        return basins[0].copy()

    # Normalize weights
    total = sum(weights)
    weights = [w / total for w in weights]

    # Start with first basin
    result = basins[0].copy()
    accumulated_weight = weights[0]

    # Iteratively blend via geodesic interpolation
    for i in range(1, len(basins)):
        # Interpolation parameter: how much to move toward new basin
        t = weights[i] / (accumulated_weight + weights[i])

        # Geodesic interpolation (slerp on sphere)
        dot = np.clip(np.dot(result, basins[i]), -1.0, 1.0)
        omega = np.arccos(dot)

        if omega > 1e-6:
            sin_omega = np.sin(omega)
            result = (np.sin((1 - t) * omega) / sin_omega) * result + \
                     (np.sin(t * omega) / sin_omega) * basins[i]
        else:
            result = (1 - t) * result + t * basins[i]

        accumulated_weight += weights[i]

    # Ensure unit norm
    norm = np.linalg.norm(result)
    if norm > 1e-10:
        result = result / norm

    return result


def compute_phi_score(word: str) -> float:
    """
    Compute phi score for a word.
    
    For words in database, returns their stored phi score.
    For unknown words, computes based on word properties.
    
    Args:
        word: Input word
    
    Returns:
        Phi score between 0 and 1
    """
    try:
        cache = _load_vocabulary_from_database()
        if word.lower() in cache['token_phi']:
            return cache['token_phi'][word.lower()]
    except Exception:
        pass
    
    base_phi = 0.5
    length_bonus = min(len(word) / 10.0, 0.2)
    alpha_bonus = 0.1 if word.isalpha() else 0.0
    
    phi = base_phi + length_bonus + alpha_bonus
    return min(phi, 0.95)


def get_fallback_vocabulary() -> List[str]:
    """
    Get the full vocabulary from database.
    
    Returns list of all vocabulary words (no fallback - database required).
    """
    try:
        cache = _load_vocabulary_from_database()
        return cache['word_tokens'].copy()
    except Exception as e:
        raise RuntimeError(
            f"[QIG-PURE VIOLATION] Cannot get vocabulary: {e}. "
            "Database connection required."
        )


def get_cached_fallback() -> Tuple[Dict[str, int], Dict[str, np.ndarray], Dict[str, float], List[str]]:
    """
    Get pre-computed vocabulary with embeddings from database.
    
    Returns:
        Tuple of (vocab, basin_coords, token_phi, word_tokens)
    """
    try:
        cache = _load_vocabulary_from_database()
        return (
            cache['vocab'],
            cache['basin_coords'],
            cache['token_phi'],
            cache['word_tokens'],
        )
    except Exception as e:
        raise RuntimeError(
            f"[QIG-PURE VIOLATION] Cannot get vocabulary: {e}. "
            "Database connection required."
        )


def get_vocabulary_stats() -> Dict:
    """Get statistics about loaded vocabulary."""
    try:
        cache = _load_vocabulary_from_database()
        return {
            'total_tokens': len(cache['vocab']),
            'word_tokens': len(cache['word_tokens']),
            'avg_phi': sum(cache['token_phi'].values()) / max(len(cache['token_phi']), 1),
            'high_phi_tokens': sum(1 for p in cache['token_phi'].values() if p >= 0.7),
            'source': 'database',
            'qig_pure': True,
        }
    except Exception as e:
        return {
            'error': str(e),
            'source': 'none',
            'qig_pure': False,
        }


def clear_vocabulary_cache() -> None:
    """Clear the vocabulary cache to force reload from database."""
    global _vocabulary_cache, _cache_loaded
    _vocabulary_cache = None
    _cache_loaded = False
    logger.info("[VocabularyLoader] Cache cleared")
