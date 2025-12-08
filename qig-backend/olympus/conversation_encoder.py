"""
Conversation Encoder - Natural Language to 64D Basin Coordinates

Provides a natural-language-first encoder for Zeus chat. Unlike the
passphrase encoder, this module is not constrained to the BIP39 wordlist
and includes common conversational terms plus optional project-specific
vocabulary loaded from ``data/conversation_vocab.txt``.
"""

from __future__ import annotations

import os
from typing import List, Optional

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
        """Load conversational vocabulary from defaults + optional text file."""
        words: List[str] = list(DEFAULT_CONVERSATION_VOCAB)

        # Optional user-provided vocabulary file
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
            self.token_phi_scores[key] = 0.6  # Slightly above neutral

        print(f"[ConversationEncoder] Loaded {len(self.token_vocab)} conversational tokens")
