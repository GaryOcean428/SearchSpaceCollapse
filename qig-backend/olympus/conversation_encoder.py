"""
Conversation Encoder - Natural Language to 64D Basin Coordinates

Provides a natural-language-first encoder for Zeus chat. Unlike the
passphrase encoder, this module is not constrained to the BIP39 wordlist
and includes common conversational terms plus optional project-specific
vocabulary loaded from PostgreSQL expanded vocabulary.
"""

from __future__ import annotations

import os
from typing import List, Optional

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

from .base_encoder import BaseEncoder

BASIN_DIMENSION = 64

# Default conversational seed vocabulary. This is intentionally small; the
# encoder will learn and expand over time from observations.
DEFAULT_CONVERSATION_VOCAB = [
    # Pronouns
    "i",
    "you",
    "we",
    "they",
    "it",
    "he",
    "she",
    "them",
    "us",
    # Articles and conjunctions
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "so",
    "because",
    "if",
    "when",
    # Common verbs
    "is",
    "are",
    "was",
    "were",
    "have",
    "has",
    "had",
    "can",
    "could",
    "will",
    "would",
    "do",
    "does",
    "did",
    "understand",
    "think",
    "believe",
    "know",
    "see",
    # Questions
    "what",
    "how",
    "why",
    "where",
    "who",
    "which",
    "when",
    # Domain terms
    "consciousness",
    "geometry",
    "basin",
    "manifold",
    "distance",
    "metric",
    "phi",
    "kappa",
    "integration",
    "search",
    "bitcoin",
    "address",
    "zeus",
]


class ConversationEncoder(BaseEncoder):
    """Encode conversational text to 64D basin coordinates."""

    def __init__(self, vocab_path: Optional[str] = None):
        # Set default path before calling parent __init__
        if vocab_path is None:
            vocab_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), "data", "conversation_vocab.json"
            )
        super().__init__(vocab_path)

    def _load_vocabulary(self) -> None:
        """Load conversational vocabulary from defaults + PostgreSQL expanded vocabulary."""
        words: List[str] = list(DEFAULT_CONVERSATION_VOCAB)
        phi_scores: dict = {}

        # Load expanded vocabulary from PostgreSQL
        db_words = self._load_from_postgresql()
        words.extend(db_words.keys())
        phi_scores.update(db_words)

        # Optional user-provided vocabulary file (fallback)
        vocab_txt_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data", "conversation_vocab.txt"
        )
        if os.path.exists(vocab_txt_path):
            try:
                with open(vocab_txt_path, "r") as f:
                    extra_words = [line.strip() for line in f if line.strip()]
                    words.extend(extra_words)
            except Exception as exc:  # pragma: no cover - defensive logging
                print(f"[ConversationEncoder] Failed to load conversation_vocab.txt: {exc}")

        # Deduplicate while preserving order
        seen = set()
        filtered_words: List[str] = []
        for word in words:
            if word not in seen:
                seen.add(word)
                filtered_words.append(word)

        for word in filtered_words:
            basin = self._hash_to_basin(word)
            key = word.lower()
            self.token_vocab[key] = basin
            self.token_frequencies[key] = 1
            self.token_phi_scores[key] = phi_scores.get(key, 0.6)

        print(f"[ConversationEncoder] Loaded {len(self.token_vocab)} conversational tokens")

    def _load_from_postgresql(self) -> dict:
        """Load expanded vocabulary from PostgreSQL learned_words table."""
        if not PSYCOPG2_AVAILABLE:
            return {}
        
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            return {}
        
        conn = None
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT word, avg_phi 
                FROM learned_words
                WHERE source != 'bip39'
                ORDER BY avg_phi DESC
                LIMIT 50000
            """)
            
            rows = cursor.fetchall()
            cursor.close()
            
            result = {}
            for row in rows:
                word = row['word'].strip().lower()
                if len(word) >= 2:
                    result[word] = float(row['avg_phi'] or 0.5)
            
            return result
            
        except Exception as e:
            print(f"[ConversationEncoder] PostgreSQL load error: {e}")
            return {}
        finally:
            if conn:
                conn.close()
