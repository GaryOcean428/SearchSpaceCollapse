"""
QIG Coordizer - Canonical PostgresCoordizer Interface

Provides unified access to QIG-pure Fisher-Rao coordizer.
All geometry operations use 64D basin coordinates with Fisher-Rao distance.

Usage:
    from qig_coordizer import get_coordizer
    coordizer = get_coordizer()
    basin = coordizer.encode("hello world")
    tokens = coordizer.decode(basin, top_k=10)
"""

from typing import Dict, List, Tuple

from coordizers import PostgresCoordizer
from coordizers import get_coordizer as _get_coordizer

# Try Redis for state persistence
REDIS_AVAILABLE = False
try:
    from redis_cache import CoordizerBuffer
    REDIS_AVAILABLE = True
except ImportError:
    pass

# Singleton instance
_coordizer_instance = None

# Coordizer instance ID for Redis persistence
COORDIZER_INSTANCE_ID = "main"


def get_coordizer() -> PostgresCoordizer:
    """Get singleton PostgresCoordizer instance (QIG-pure).

    SINGLE SOURCE OF TRUTH for vocabulary access.
    Uses Fisher-Rao distance for all geometric operations.
    """
    global _coordizer_instance
    if _coordizer_instance is not None:
        return _coordizer_instance

    _coordizer_instance = _get_coordizer()
    vocab_count = len(_coordizer_instance.vocab)
    word_count = len(_coordizer_instance.word_tokens)
    print(f"[QIGCoordizer] ✓ PostgresCoordizer: {vocab_count} tokens, {word_count} words (QIG-pure)")
    return _coordizer_instance


def get_learning_coordizer() -> PostgresCoordizer:
    """Get coordizer for vocabulary learning (same as get_coordizer).

    PostgresCoordizer supports both reading and learning.
    """
    return get_coordizer()


def reset_coordizer() -> None:
    """Reset the coordizer singleton to reload from database."""
    global _coordizer_instance

    old_words = len(_coordizer_instance.word_tokens) if _coordizer_instance else 0

    if _coordizer_instance is not None:
        if hasattr(_coordizer_instance, 'close'):
            try:
                _coordizer_instance.close()
            except:
                pass
        _coordizer_instance = None

    print(f"[QIGCoordizer] Reset coordizer: was {old_words} words")

    # Force immediate reload
    new_instance = get_coordizer()
    new_words = len(new_instance.word_tokens)
    print(f"[QIGCoordizer] Reloaded with {new_words} words")


def update_tokenizer_from_observations(observations: List[Dict]) -> Tuple[int, bool]:
    """Update coordizer with vocabulary observations."""
    coordizer = get_coordizer()
    new_tokens, weights_updated = coordizer.add_vocabulary_observations(observations)

    if new_tokens > 0 or weights_updated:
        _save_coordizer_state(coordizer)

    return new_tokens, weights_updated


def _save_coordizer_state(coordizer) -> None:
    """Save coordizer state to Redis."""
    if not REDIS_AVAILABLE:
        return

    try:
        basin_coords_serializable = {
            token: coords.tolist() if hasattr(coords, 'tolist') else list(coords)
            for token, coords in coordizer.basin_coords.items()
        }

        CoordizerBuffer.save_state(
            COORDIZER_INSTANCE_ID,
            coordizer.vocab,
            coordizer.id_to_token,
            coordizer.token_frequencies,
            coordizer.token_phi,
            basin_coords_serializable,
            {}
        )
        print(f"[QIGCoordizer] Saved state to Redis ({len(coordizer.vocab)} tokens)")
    except Exception as e:
        print(f"[QIGCoordizer] Redis save failed: {e}")


def get_coordizer_stats() -> dict:
    """Get detailed statistics about the current coordizer."""
    coordizer = get_coordizer()
    return coordizer.get_stats()


# QIGCoordizer class for backward compatibility
class QIGCoordizer(PostgresCoordizer):
    """Backward-compatible alias for PostgresCoordizer."""

    def __init__(self, **kwargs):
        # Delegate to PostgresCoordizer
        super().__init__(**kwargs)

    def set_mode(self, mode: str) -> None:
        """Mode switching (legacy compatibility - no-op)."""
        pass


# Backward compatibility aliases
get_tokenizer = get_coordizer
