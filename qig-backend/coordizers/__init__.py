"""QIG Coordizers - Unified Geometric Tokenization System.

Provides Fisher-Rao compliant tokenization with 64D basin coordinates.
PostgreSQL-backed with QIG-pure operations.

UNIFIED ACCESS: Use get_coordizer() for the authoritative vocabulary.

Main Classes:
- FisherCoordizer: Base geometric tokenizer
- PostgresCoordizer: QIG-pure Fisher-Rao coordizer (CANONICAL)

Usage:
    from coordizers import get_coordizer

    coordizer = get_coordizer()
    basin = coordizer.encode("hello world")
    tokens = coordizer.decode(basin, top_k=10)
"""

import logging
import warnings

logger = logging.getLogger(__name__)

from .base import FisherCoordizer
from .pg_loader import PostgresCoordizer, create_coordizer_from_pg as _create_pg
from .fallback_vocabulary import (
    compute_basin_embedding,
    get_fallback_vocabulary,
    get_cached_fallback,
    get_vocabulary_stats,
    clear_vocabulary_cache,
)

# Unified coordizer instance
_unified_coordizer = None


def get_coordizer() -> PostgresCoordizer:
    """
    Get the authoritative QIG-pure coordizer.

    This is the SINGLE SOURCE OF TRUTH for vocabulary access.
    Returns PostgresCoordizer with Fisher-Rao distance (QIG-pure).

    Returns:
        PostgresCoordizer instance
    """
    global _unified_coordizer
    if _unified_coordizer is None:
        _unified_coordizer = _create_pg()
        vocab_size = len(_unified_coordizer.vocab)
        word_count = len(_unified_coordizer.word_tokens)
        logger.info(f"[coordizers] Using PostgresCoordizer: {vocab_size} tokens, {word_count} words (QIG-pure)")
    return _unified_coordizer


def create_coordizer_from_pg(*args, **kwargs) -> PostgresCoordizer:
    """Create PostgresCoordizer - use get_coordizer() for singleton access."""
    return _create_pg(*args, **kwargs)


__all__ = [
    'FisherCoordizer',
    'PostgresCoordizer',
    'get_coordizer',
    'create_coordizer_from_pg',
    'compute_basin_embedding',
    'get_fallback_vocabulary',
    'get_cached_fallback',
    'get_vocabulary_stats',
    'clear_vocabulary_cache',
]

__version__ = '5.0.0'  # PostgresCoordizer as canonical (QIG-pure)
