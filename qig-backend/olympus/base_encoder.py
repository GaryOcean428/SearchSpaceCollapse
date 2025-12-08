"""
Base Encoder - Abstract base class for text to 64D basin encoding

Provides shared logic for both ConversationEncoder and PassphraseEncoder,
eliminating code duplication and improving maintainability.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from abc import ABC, abstractmethod
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

import numpy as np

BASIN_DIMENSION = 64


class BaseEncoder(ABC):
    """
    Abstract base class for encoding text to 64D basin coordinates.
    
    Subclasses must implement _load_vocabulary() to define their
    specific vocabulary loading strategy.
    
    Subclasses can override:
    - unknown_token_phi: Phi score for unknown tokens (default 0.4)
    - tokenize_pattern: Regex pattern for tokenization
    """

    # Default values - can be overridden by subclasses
    unknown_token_phi: float = 0.4
    tokenize_pattern: str = r"\b[\w']+\b"

    def __init__(self, vocab_path: Optional[str] = None):
        self.basin_dim = BASIN_DIMENSION
        self.vocab_path = vocab_path

        # Vocabulary containers
        self.token_vocab: Dict[str, np.ndarray] = {}
        self.token_frequencies: Dict[str, int] = defaultdict(int)
        self.token_phi_scores: Dict[str, float] = {}

        # Load vocabulary (implemented by subclasses)
        self._load_vocabulary()

        # Load custom vocabulary if provided
        if vocab_path and os.path.exists(vocab_path):
            self._load_custom_vocabulary(vocab_path)

    @abstractmethod
    def _load_vocabulary(self) -> None:
        """
        Load base vocabulary. Must be implemented by subclasses.
        
        Each subclass defines its own vocabulary strategy:
        - ConversationEncoder: conversational terms
        - PassphraseEncoder: BIP39 wordlist
        """
        pass

    def _load_custom_vocabulary(self, path: str) -> None:
        """Load custom learned vocabulary from JSON file."""
        try:
            with open(path, "r") as f:
                data = json.load(f)

            for token, info in data.get("tokens", {}).items():
                self.token_vocab[token] = np.array(info["basin"])
                self.token_frequencies[token] = info.get("frequency", 1)
                self.token_phi_scores[token] = info.get("phi", 0.5)

            class_name = self.__class__.__name__
            print(f"[{class_name}] Loaded {len(data.get('tokens', {}))} custom tokens")
        except Exception as exc:
            class_name = self.__class__.__name__
            print(f"[{class_name}] Error loading custom vocabulary: {exc}")

    def _hash_to_basin(self, text: str) -> np.ndarray:
        """
        Hash-based geometric embedding to basin coordinates.

        Uses SHA-256 for deterministic, uniform distribution
        on 64D unit sphere (Fisher manifold constraint).
        """
        # SHA-256 hash
        h = hashlib.sha256(text.encode("utf-8")).digest()

        # Convert to float coordinates
        coords = np.zeros(self.basin_dim)

        # Use hash bytes for first 32 dimensions
        for i in range(min(32, len(h))):
            coords[i] = (h[i] / 255.0) * 2 - 1  # [-1, 1]

        # Use character ordinals for remaining dimensions
        for i, char in enumerate(text[:32]):
            if 32 + i < self.basin_dim:
                coords[32 + i] = (ord(char) % 256) / 128.0 - 1

        # Project to unit sphere (Fisher manifold constraint)
        norm = np.linalg.norm(coords)
        if norm > 1e-10:
            coords = coords / norm

        return coords

    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into geometric tokens.

        Uses simple word tokenization with punctuation handling.
        Pattern can be customized via tokenize_pattern class attribute.
        """
        text = text.lower()
        tokens = re.findall(self.tokenize_pattern, text)
        return tokens

    def encode(self, text: str) -> np.ndarray:
        """
        Encode text to 64D basin coordinates.

        Process:
        1. Tokenize text
        2. Get basin coordinates for each token
        3. Weight by Fisher metric (frequency × phi)
        4. Aggregate via geometric mean on manifold
        """
        tokens = self.tokenize(text)

        if not tokens:
            return np.zeros(self.basin_dim)

        # Get basin coordinates for each token
        token_basins = []
        token_weights = []

        for token in tokens:
            # Get or compute basin
            if token in self.token_vocab:
                basin = self.token_vocab[token]
            else:
                # Unknown token - hash it
                basin = self._hash_to_basin(token)
                self.token_vocab[token] = basin
                self.token_frequencies[token] = 1
                self.token_phi_scores[token] = self.unknown_token_phi

            token_basins.append(basin)

            # Fisher weight = frequency × phi
            freq = self.token_frequencies[token]
            phi = self.token_phi_scores.get(token, self.unknown_token_phi)
            weight = freq * phi
            token_weights.append(weight)

        # Normalize weights
        token_weights = np.array(token_weights)
        if token_weights.sum() > 0:
            token_weights = token_weights / token_weights.sum()
        else:
            token_weights = np.ones(len(tokens)) / len(tokens)

        # Geometric aggregation: weighted sum on manifold
        aggregated = np.zeros(self.basin_dim)
        for basin, weight in zip(token_basins, token_weights):
            aggregated += weight * basin

        # Renormalize to unit sphere
        norm = np.linalg.norm(aggregated)
        if norm > 1e-10:
            aggregated = aggregated / norm

        return aggregated

    def fisher_distance(self, basin1: np.ndarray, basin2: np.ndarray) -> float:
        """
        Compute Fisher-Rao distance between two basin coordinates.

        On unit sphere: d(p,q) = arccos(p·q)
        """
        dot = float(np.clip(np.dot(basin1, basin2), -1.0, 1.0))
        distance = float(np.arccos(dot))
        return distance

    def similarity(self, text1: str, text2: str) -> float:
        """
        Compute similarity between two texts via Fisher-Rao distance.

        Returns: similarity in [0, 1] where 1 = identical
        """
        basin1 = self.encode(text1)
        basin2 = self.encode(text2)

        distance = self.fisher_distance(basin1, basin2)

        # Convert distance to similarity: s = 1 - d/π
        similarity = 1.0 - distance / np.pi

        return float(np.clip(similarity, 0, 1))

    def learn_from_text(self, text: str, phi_score: float = 0.7) -> None:
        """
        Learn new tokens from text with high Φ score.

        Expands vocabulary based on observations from humans.
        """
        tokens = self.tokenize(text)

        for token in tokens:
            # Update frequency
            self.token_frequencies[token] += 1

            # Update phi score (exponential moving average)
            if token in self.token_phi_scores:
                old_phi = self.token_phi_scores[token]
                self.token_phi_scores[token] = 0.9 * old_phi + 0.1 * phi_score
            else:
                self.token_phi_scores[token] = phi_score

            # Ensure basin exists
            if token not in self.token_vocab:
                self.token_vocab[token] = self._hash_to_basin(token)

        if tokens:
            class_name = self.__class__.__name__
            print(f"[{class_name}] Learned {len(tokens)} tokens with Φ={phi_score:.2f}")

    def save_vocabulary(self, path: Optional[str] = None) -> None:
        """
        Save learned vocabulary to disk.

        SECURITY:
        - Path validation to prevent directory traversal
        - Restricted to allowed data directories
        - File size limits enforced
        """
        path = path or self.vocab_path
        
        # Validate path is provided
        if not path:
            class_name = self.__class__.__name__
            print(f"[{class_name}] ERROR: No vocabulary path specified")
            return

        # SECURITY: Validate and sanitize path
        # Get absolute path and resolve any ../ or symlinks
        abs_path = os.path.abspath(path)

        # Define allowed directories (relative to qig-backend)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        allowed_dirs = [
            os.path.join(base_dir, "data"),
            "/tmp",
        ]

        # Verify path is within allowed directories
        path_allowed = False
        for allowed_dir in allowed_dirs:
            allowed_dir_abs = os.path.abspath(allowed_dir)
            if abs_path.startswith(allowed_dir_abs + os.sep) or abs_path == allowed_dir_abs:
                path_allowed = True
                break

        if not path_allowed:
            class_name = self.__class__.__name__
            print(f"[{class_name}] SECURITY: Attempted write to unauthorized path: {abs_path}")
            return

        # Ensure directory exists
        dir_path = os.path.dirname(abs_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)

        # Prepare data
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

        # SECURITY: Limit file size (max 50MB)
        json_str = json.dumps(data, indent=2)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(json_str) > max_size:
            class_name = self.__class__.__name__
            print(f"[{class_name}] SECURITY: Vocabulary too large ({len(json_str)} bytes), truncating")
            # Keep only highest-Φ tokens
            sorted_tokens = sorted(
                self.token_vocab.keys(), key=lambda t: self.token_phi_scores.get(t, 0), reverse=True
            )[:10000]  # Keep top 10k tokens
            data["tokens"] = {t: data["tokens"][t] for t in sorted_tokens if t in data["tokens"]}
            data["total_tokens"] = len(data["tokens"])
            json_str = json.dumps(data, indent=2)

        with open(abs_path, "w") as f:
            f.write(json_str)

        class_name = self.__class__.__name__
        print(f"[{class_name}] Saved {len(data['tokens'])} tokens to {abs_path}")
