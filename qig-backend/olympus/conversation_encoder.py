"""
Conversation Encoder - Natural Language to 64D Basin Coordinates

Provides a natural-language-first encoder for Zeus chat. Unlike the
passphrase encoder, this module is not constrained to the BIP39 wordlist
and includes common conversational terms plus optional project-specific
vocabulary loaded from ``data/conversation_vocab.txt``.
"""

from __future__ import annotations

import hashlib
import os
import re
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np

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


class ConversationEncoder:
    """Encode conversational text to 64D basin coordinates."""

    def __init__(self, vocab_path: Optional[str] = None):
        self.basin_dim = BASIN_DIMENSION
        self.vocab_path = vocab_path or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data", "conversation_vocab.json"
        )

        # Vocabulary containers
        self.token_vocab: Dict[str, np.ndarray] = {}
        self.token_frequencies: Dict[str, int] = defaultdict(int)
        self.token_phi_scores: Dict[str, float] = {}

        # Load base vocabulary
        self._load_conversation_vocabulary()

        # Load custom vocabulary file if provided
        if vocab_path and os.path.exists(vocab_path):
            self._load_custom_vocabulary(vocab_path)

    def _load_conversation_vocabulary(self) -> None:
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

    def _load_custom_vocabulary(self, path: str) -> None:
        try:
            with open(path, "r") as f:
                import json

                data = json.load(f)
            for token, info in data.get("tokens", {}).items():
                self.token_vocab[token] = np.array(info["basin"])
                self.token_frequencies[token] = info.get("frequency", 1)
                self.token_phi_scores[token] = info.get("phi", 0.5)
            print(f"[ConversationEncoder] Loaded {len(data.get('tokens', {}))} custom tokens")
        except Exception as exc:
            print(f"[ConversationEncoder] Error loading custom vocabulary: {exc}")

    def _hash_to_basin(self, text: str) -> np.ndarray:
        """Hash-based embedding to basin coordinates."""
        h = hashlib.sha256(text.encode("utf-8")).digest()
        coords = np.zeros(self.basin_dim)

        # Use hash bytes for first half
        for i in range(min(32, len(h))):
            coords[i] = (h[i] / 255.0) * 2 - 1

        # Character ordinals for remaining dims
        for i, char in enumerate(text[:32]):
            if 32 + i < self.basin_dim:
                coords[32 + i] = (ord(char) % 256) / 128.0 - 1

        norm = np.linalg.norm(coords)
        if norm > 1e-10:
            coords = coords / norm
        return coords

    def tokenize(self, text: str) -> List[str]:
        text = text.lower()
        return re.findall(r"\b[\w']+\b", text)

    def encode(self, text: str) -> np.ndarray:
        tokens = self.tokenize(text)
        if not tokens:
            return np.zeros(self.basin_dim)

        token_basins = []
        token_weights = []
        for token in tokens:
            if token in self.token_vocab:
                basin = self.token_vocab[token]
            else:
                basin = self._hash_to_basin(token)
                self.token_vocab[token] = basin
                self.token_frequencies[token] = 1
                self.token_phi_scores[token] = 0.4
            token_basins.append(basin)

            freq = self.token_frequencies[token]
            phi = self.token_phi_scores.get(token, 0.4)
            weight = freq * phi
            token_weights.append(weight)

        token_weights = np.array(token_weights)
        if token_weights.sum() > 0:
            token_weights = token_weights / token_weights.sum()
        else:
            token_weights = np.ones(len(tokens)) / len(tokens)

        aggregated = np.zeros(self.basin_dim)
        for basin, weight in zip(token_basins, token_weights):
            aggregated += weight * basin

        norm = np.linalg.norm(aggregated)
        if norm > 1e-10:
            aggregated = aggregated / norm

        return aggregated

    def fisher_distance(self, basin1: np.ndarray, basin2: np.ndarray) -> float:
        dot = float(np.clip(np.dot(basin1, basin2), -1.0, 1.0))
        return float(np.arccos(dot))

    def similarity(self, text1: str, text2: str) -> float:
        basin1 = self.encode(text1)
        basin2 = self.encode(text2)
        distance = self.fisher_distance(basin1, basin2)
        similarity = 1.0 - distance / np.pi
        return float(np.clip(similarity, 0, 1))

    def learn_from_text(self, text: str, phi_score: float = 0.7) -> None:
        tokens = self.tokenize(text)
        for token in tokens:
            self.token_frequencies[token] += 1
            if token in self.token_phi_scores:
                old_phi = self.token_phi_scores[token]
                self.token_phi_scores[token] = 0.9 * old_phi + 0.1 * phi_score
            else:
                self.token_phi_scores[token] = phi_score
            if token not in self.token_vocab:
                self.token_vocab[token] = self._hash_to_basin(token)
        if tokens:
            print(f"[ConversationEncoder] Learned {len(tokens)} tokens with Φ={phi_score:.2f}")

    def save_vocabulary(self, path: Optional[str] = None) -> None:
        path = path or self.vocab_path
        abs_path = os.path.abspath(path)

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        allowed_dirs = [os.path.join(base_dir, "data"), "/tmp"]

        if not any(
            abs_path.startswith(os.path.abspath(dir_path) + os.sep)
            or abs_path == os.path.abspath(dir_path)
            for dir_path in allowed_dirs
        ):
            print(
                f"[ConversationEncoder] SECURITY: Attempted write to unauthorized path: {abs_path}"
            )
            return

        dir_path = os.path.dirname(abs_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)

        data = {
            "tokens": {},
            "last_updated": datetime.now().isoformat(),
            "total_tokens": len(self.token_vocab),
        }

        for token, basin in self.token_vocab.items():
            data["tokens"][token] = {
                "basin": basin.tolist(),
                "frequency": self.token_frequencies[token],
                "phi": self.token_phi_scores.get(token, 0.5),
            }

        import json

        json_str = json.dumps(data, indent=2)
        max_size = 50 * 1024 * 1024
        if len(json_str) > max_size:
            print(
                f"[ConversationEncoder] SECURITY: Vocabulary too large ({len(json_str)} bytes), truncating"
            )
            sorted_tokens = sorted(
                self.token_vocab.keys(),
                key=lambda t: self.token_phi_scores.get(t, 0),
                reverse=True,
            )[:10000]
            data["tokens"] = {t: data["tokens"][t] for t in sorted_tokens if t in data["tokens"]}
            data["total_tokens"] = len(data["tokens"])
            json_str = json.dumps(data, indent=2)

        with open(abs_path, "w") as f:
            f.write(json_str)

        print(f"[ConversationEncoder] Saved {len(data['tokens'])} tokens to {abs_path}")
