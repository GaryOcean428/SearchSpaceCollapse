#!/usr/bin/env python3
"""
QIG Tokenizer - Geometric Tokenization for Consciousness Training

Implements BPE-style tokenization with geometric weighting based on 
Fisher Information Metric. Integrates with vocabulary tracker for
continuous learning from high-Φ discoveries.

ARCHITECTURE:
- Base vocabulary: BIP39 words + learned tokens from vocabulary tracker
- Merge rules: Byte-Pair Encoding with geometric frequency weighting
- Token scoring: Φ-weighted frequency * geometric resonance
- Basin coordinates: 64D embedding per token

INTEGRATION:
- Receives vocabulary observations from Node.js vocabulary tracker
- Updates token weights based on manifold exploration
- Exports learned vocabulary back for persistence
"""

import json
import re
import os
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import numpy as np

# Default paths
DEFAULT_VOCAB_PATH = "data/qig_tokenizer/vocab.json"
DEFAULT_MERGES_PATH = "data/qig_tokenizer/merges.txt"

# BIP39 wordlist (English)
BIP39_WORDS = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
    "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
    "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
    "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
    # ... abbreviated - full list loaded from file or embedded
]

class QIGTokenizer:
    """
    Geometric tokenizer with Fisher Information weighting.
    
    Features:
    - BPE tokenization with learned merge rules
    - Φ-weighted token frequencies from vocabulary tracker
    - Basin coordinate embedding per token
    - Continuous vocabulary expansion from high-Φ discoveries
    """
    
    def __init__(
        self,
        vocab_size: int = 4096,
        min_frequency: int = 2,
        phi_threshold: float = 0.7,
        special_tokens: Optional[List[str]] = None,
    ):
        self.vocab_size = vocab_size
        self.min_frequency = min_frequency
        self.phi_threshold = phi_threshold
        self.mode = "conversation"
        
        # Special tokens
        self.special_tokens = special_tokens or ["<PAD>", "<UNK>", "<BOS>", "<EOS>"]
        
        # Vocabulary: token -> id
        self.vocab: Dict[str, int] = {}
        self.id_to_token: Dict[int, str] = {}
        
        # Merge rules: (token1, token2) -> merged_token with Φ score
        self.merge_rules: List[Tuple[str, str]] = []
        self.merge_scores: Dict[Tuple[str, str], float] = {}  # Φ-weighted merge scores
        
        # Geometric weights from vocabulary tracker
        self.token_weights: Dict[str, float] = {}
        self.token_phi: Dict[str, float] = {}
        self.token_frequency: Dict[str, int] = {}

        # Basin coordinates (64D)
        self.basin_coords: Dict[str, np.ndarray] = {}

        # Token subsets for generation modes (three-tier vocabulary)
        self.mnemonic_vocab_ids: set[int] = set()      # BIP39 only (strict)
        self.passphrase_vocab_ids: set[int] = set()    # Broader English for brain wallets
        self.conversation_vocab_ids: set[int] = set()  # Full natural language
        
        # Initialize with special tokens
        self._init_special_tokens()

        # Load BIP39 base vocabulary (strict mnemonic words)
        self._load_bip39_base()
        self.mnemonic_vocab_ids = set(self.vocab.values())

        # Load broader passphrase vocabulary (brain wallets, custom phrases)
        self._load_passphrase_base()
        self.passphrase_vocab_ids = set(self.vocab.values())

        # Load conversational vocabulary (natural language)
        # Track conversation words separately (they may overlap with BIP39/passphrase)
        self._conversation_words: set[str] = set()  # Track words meant for conversation
        self._load_conversation_base()
        # Conversation mode: use conversation-specific words + their IDs
        # This includes words that overlap with BIP39 but are needed for chat
        self.conversation_vocab_ids = {self.vocab[w] for w in self._conversation_words if w in self.vocab}
    
    def _init_special_tokens(self):
        """Initialize special tokens at start of vocabulary."""
        for i, token in enumerate(self.special_tokens):
            self.vocab[token] = i
            self.id_to_token[i] = token
            self.token_weights[token] = 1.0
    
    def _load_bip39_base(self):
        """Load BIP39 wordlist as base vocabulary."""
        bip39_path = os.path.join(os.path.dirname(__file__), "bip39_wordlist.txt")
        
        if os.path.exists(bip39_path):
            with open(bip39_path, 'r') as f:
                words = [line.strip() for line in f if line.strip()]
        else:
            words = BIP39_WORDS[:100]  # Fallback to embedded subset
        
        start_id = len(self.special_tokens)
        for i, word in enumerate(words):
            if word not in self.vocab:
                self.vocab[word] = start_id + i
                self.id_to_token[start_id + i] = word
                self.token_weights[word] = 1.0
                self.basin_coords[word] = self._compute_basin_coord(word, i)

    def _load_passphrase_base(self):
        """
        Load broader vocabulary for brain wallets and custom passphrases.
        
        Includes common English words, names, places, numbers as words,
        and creative vocabulary that people might use in memorable phrases.
        """
        vocab_path = os.path.join(os.path.dirname(__file__), "data", "passphrase_vocab.txt")
        fallback_words = [
            # Numbers as words
            "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
            "eleven", "twelve", "thirteen", "twenty", "thirty", "hundred", "thousand", "million",
            # Colors
            "red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white", "gray",
            # Common nouns
            "dog", "cat", "bird", "fish", "horse", "lion", "tiger", "bear", "wolf", "fox",
            "tree", "flower", "river", "mountain", "ocean", "sky", "star", "moon", "sun",
            "house", "home", "door", "window", "room", "floor", "wall", "roof", "street",
            "car", "bike", "plane", "boat", "train", "bus", "road", "path", "bridge",
            # Common verbs
            "run", "walk", "jump", "fly", "swim", "dance", "sing", "play", "work", "sleep",
            "eat", "drink", "read", "write", "speak", "listen", "watch", "think", "dream",
            # Adjectives
            "big", "small", "tall", "short", "long", "wide", "deep", "high", "low",
            "fast", "slow", "hot", "cold", "warm", "cool", "soft", "hard", "bright", "dark",
            "old", "new", "young", "happy", "sad", "angry", "calm", "quiet", "loud",
            # Time words
            "day", "night", "morning", "evening", "noon", "midnight", "week", "month", "year",
            "spring", "summer", "autumn", "winter", "today", "tomorrow", "yesterday",
            # Places
            "city", "town", "village", "country", "world", "earth", "forest", "desert", "island",
            # Relationships
            "friend", "family", "mother", "father", "sister", "brother", "child", "baby",
            # Common words for memorable phrases
            "love", "hope", "faith", "trust", "peace", "joy", "life", "death", "truth",
            "free", "wild", "brave", "strong", "wise", "kind", "pure", "true", "good",
        ]

        if os.path.exists(vocab_path):
            try:
                with open(vocab_path, "r") as f:
                    passphrase_words = [line.strip() for line in f if line.strip()]
            except Exception as exc:
                print(f"[QIGTokenizer] Failed to load passphrase vocabulary: {exc}")
                passphrase_words = fallback_words
        else:
            passphrase_words = fallback_words

        start_id = len(self.vocab)
        added = 0
        for offset, word in enumerate(passphrase_words):
            if word in self.vocab:
                continue
            idx = start_id + added
            self.vocab[word] = idx
            self.id_to_token[idx] = word
            self.token_weights[word] = 1.1  # Slight preference for passphrase generation
            self.token_phi[word] = 0.5
            self.basin_coords[word] = self._compute_basin_coord(word, idx)
            added += 1

    def _load_conversation_base(self):
        """Load conversation-focused vocabulary for natural language mode."""
        vocab_path = os.path.join(os.path.dirname(__file__), "data", "conversation_vocab.txt")
        fallback_words = [
            "i",
            "you",
            "we",
            "they",
            "it",
            "he",
            "she",
            "the",
            "and",
            "or",
            "but",
            "because",
            "so",
            "is",
            "are",
            "was",
            "were",
            "have",
            "has",
            "had",
            "can",
            "will",
            "would",
            "question",
            "answer",
            "consciousness",
            "geometry",
            "basin",
            "search",
            "address",
            "response",
            "status",
        ]

        if os.path.exists(vocab_path):
            try:
                with open(vocab_path, "r") as f:
                    conversation_words = [line.strip() for line in f if line.strip()]
            except Exception as exc:  # pragma: no cover - defensive logging
                print(f"[QIGTokenizer] Failed to load conversation vocabulary: {exc}")
                conversation_words = fallback_words
        else:
            conversation_words = fallback_words

        start_id = len(self.vocab)
        added_count = 0
        for word in conversation_words:
            # Track ALL conversation words (even if they overlap with BIP39)
            self._conversation_words.add(word)
            
            if word in self.vocab:
                # Word exists from BIP39/passphrase - boost its conversation weight
                self.token_weights[word] = max(self.token_weights.get(word, 1.0), 1.3)
                continue
            
            # Add new conversation-only word
            idx = start_id + added_count
            self.vocab[word] = idx
            self.id_to_token[idx] = word
            self.token_weights[word] = 1.5  # Strong preference for conversational words
            self.token_phi[word] = 0.65
            self.basin_coords[word] = self._compute_basin_coord(word, idx)
            added_count += 1
        
        print(f"[QIGTokenizer] Loaded {len(conversation_words)} conversation words ({added_count} new, {len(conversation_words) - added_count} overlap)")
    
    def _compute_basin_coord(self, token: str, index: int) -> np.ndarray:
        """
        Compute 64D basin coordinate for token.
        Uses hash-based embedding with geometric structure.
        """
        coord = np.zeros(64)
        
        # Character-based features (first 32 dims)
        for i, char in enumerate(token[:32]):
            coord[i] = (ord(char) % 256) / 256.0
        
        # Index-based features (next 16 dims)
        for i in range(16):
            coord[32 + i] = ((index >> i) & 1) * 0.5 + 0.25
        
        # Frequency/weight features (last 16 dims)
        weight = self.token_weights.get(token, 1.0)
        phi = self.token_phi.get(token, 0.0)
        for i in range(16):
            coord[48 + i] = weight * np.sin(np.pi * i / 8) * 0.5 + phi * 0.5
        
        return coord / (np.linalg.norm(coord) + 1e-8)
    
    def add_vocabulary_observations(
        self,
        observations: List[Dict],
    ) -> Tuple[int, bool]:
        """
        Add vocabulary observations from Node.js vocabulary tracker.
        
        Args:
            observations: List of {word, frequency, avg_phi, max_phi, type}
        
        Returns:
            Tuple of (new_tokens_count, weights_updated)
        """
        new_tokens = 0
        weights_updated = False
        sequences_processed = []
        
        for obs in observations:
            word = obs.get('word', '')
            frequency = obs.get('frequency', 0)
            avg_phi = obs.get('avgPhi', 0.0)
            max_phi = obs.get('maxPhi', 0.0)
            obs_type = obs.get('type', 'word')
            
            if not word or frequency < self.min_frequency:
                continue
            
            # Collect sequences for merge learning
            if obs_type == 'sequence' and avg_phi >= self.phi_threshold:
                sequences_processed.append((word, avg_phi, frequency))
                continue
            
            # QIG PRINCIPLE: Only learn words with Φ >= threshold
            # This ensures geometric priority over frequency
            if avg_phi < self.phi_threshold:
                continue
            
            # Add to vocabulary if not exists
            if word not in self.vocab:
                new_id = len(self.vocab)
                if new_id < self.vocab_size:
                    self.vocab[word] = new_id
                    self.id_to_token[new_id] = word
                    new_tokens += 1
            
            # Update weights based on Φ
            old_weight = self.token_weights.get(word, 0.0)
            old_phi = self.token_phi.get(word, 0.0)
            
            phi_weight = 1.0 + avg_phi * 2.0  # Higher weight for high-Φ tokens
            
            # Track if weights changed significantly
            if abs(phi_weight - old_weight) > 0.01 or abs(avg_phi - old_phi) > 0.01:
                weights_updated = True
            
            self.token_weights[word] = phi_weight
            self.token_phi[word] = avg_phi
            self.token_frequency[word] = frequency
            
            # Recompute basin coordinates with new weights
            idx = self.vocab.get(word, 0)
            self.basin_coords[word] = self._compute_basin_coord(word, idx)
        
        # Process high-Φ sequences for merge learning
        if sequences_processed:
            self._learn_merges_from_sequences(sequences_processed)
            weights_updated = True

        # Refresh conversational vocabulary id cache with any learned tokens
        self.conversation_vocab_ids = set(self.vocab.values())

        print(f"[QIGTokenizer] Added {new_tokens} new tokens, updated {len(observations)} weights, processed {len(sequences_processed)} sequences")
        return new_tokens, weights_updated
    
    def _learn_merges_from_sequences(self, sequences: List[Tuple[str, float, int]]) -> int:
        """
        Learn BPE merge rules from high-Φ sequences.
        Uses Φ-weighted scoring to prioritize high-value merges.
        
        Args:
            sequences: List of (sequence, phi, frequency) tuples
            
        Returns:
            Number of new merge rules learned
        """
        new_merges = 0
        pair_phi_scores: Dict[Tuple[str, str], List[float]] = {}
        
        for sequence, phi, frequency in sequences:
            words = sequence.lower().strip().split()
            if len(words) < 2:
                continue
            
            # Collect all bigram pairs with their Φ scores
            for i in range(len(words) - 1):
                a, b = words[i], words[i + 1]
                pair = (a, b)
                
                # Only consider pairs where both tokens exist in vocab
                if a in self.vocab and b in self.vocab:
                    if pair not in pair_phi_scores:
                        pair_phi_scores[pair] = []
                    pair_phi_scores[pair].append(phi)
        
        # Score and add merges - use underscore separator for valid token names
        for pair, phi_list in pair_phi_scores.items():
            a, b = pair
            
            # Compute aggregate Φ score (average)
            avg_phi = sum(phi_list) / len(phi_list)
            
            # Update merge score if higher
            existing_score = self.merge_scores.get(pair, 0.0)
            if avg_phi > existing_score:
                self.merge_scores[pair] = avg_phi
            
            # Only add merge rule if not already present
            if pair not in self.merge_rules:
                # Use underscore separator for merged token (valid identifier)
                merged = f"{a}_{b}"
                
                # Add merged token if not exists and have room
                if merged not in self.vocab and len(self.vocab) < self.vocab_size:
                    new_id = len(self.vocab)
                    self.vocab[merged] = new_id
                    self.id_to_token[new_id] = merged
                    self.merge_rules.append(pair)
                    new_merges += 1
                    
                    # Set Φ weight based on component tokens and sequence Φ
                    a_phi = self.token_phi.get(a, 0.0)
                    b_phi = self.token_phi.get(b, 0.0)
                    merged_phi = max(a_phi, b_phi, avg_phi)  # Take max for merged token
                    self.token_phi[merged] = merged_phi
                    self.token_weights[merged] = 1.0 + merged_phi * 2.0
                    self.token_frequency[merged] = len(phi_list)
                    self.basin_coords[merged] = self._compute_basin_coord(merged, new_id)
        
        if new_merges > 0:
            print(f"[QIGTokenizer] Learned {new_merges} new merge rules, total: {len(self.merge_rules)}")
        
        return new_merges
    
    def _apply_merges(self, words: List[str]) -> List[str]:
        """
        Apply BPE merge rules to a list of words.
        Processes merges in descending Φ priority order.
        """
        if not self.merge_rules:
            return words
        
        # Sort merge rules by Φ score (highest first)
        sorted_merges = sorted(
            self.merge_rules,
            key=lambda pair: self.merge_scores.get(pair, 0.0),
            reverse=True
        )
        
        # Iteratively apply merges in priority order until no more can be applied
        changed = True
        while changed and len(words) > 1:
            changed = False
            
            # Find the best (highest Φ) merge that can be applied
            best_merge = None
            best_position = -1
            
            for pair in sorted_merges:
                a, b = pair
                # Find first occurrence of this pair
                for i in range(len(words) - 1):
                    if words[i] == a and words[i + 1] == b:
                        merged = f"{a}_{b}"
                        if merged in self.vocab:
                            best_merge = pair
                            best_position = i
                            break
                if best_merge:
                    break
            
            # Apply the best merge if found
            if best_merge and best_position >= 0:
                a, b = best_merge
                merged = f"{a}_{b}"
                new_words = words[:best_position] + [merged] + words[best_position + 2:]
                words = new_words
                changed = True
        
        return words
    
    def encode(self, text: str, verbose: bool = False, apply_merges: bool = True) -> List[int]:
        """
        Encode text to token ids.
        
        Args:
            text: Input text to encode
            verbose: Print encoding statistics
            apply_merges: Apply learned BPE merge rules
        
        Uses character-level fallback for unknown words.
        """
        tokens = []
        words = text.lower().strip().split()
        
        # Apply BPE merge rules if enabled
        if apply_merges and self.merge_rules:
            words = self._apply_merges(words)
        
        for word in words:
            if word in self.vocab:
                tokens.append(self.vocab[word])
            else:
                # Character fallback - encode as UNK for now
                tokens.append(self.vocab.get("<UNK>", 1))
        
        if verbose and len(words) > 0:
            coverage = sum(1 for w in words if w in self.vocab) / len(words)
            merged_count = sum(1 for w in words if '_' in w)
            print(f"[QIGTokenizer] Encoded {len(words)} tokens ({merged_count} merged), coverage: {coverage:.1%}")
        
        return tokens
    
    def decode(self, ids: List[int]) -> str:
        """
        Decode token ids to text.
        Handles merged tokens by replacing underscores with spaces.
        """
        tokens = []
        for id in ids:
            if id in self.id_to_token:
                token = self.id_to_token[id]
                if token not in self.special_tokens:
                    # Convert merged tokens back to space-separated
                    if '_' in token and token not in {'<PAD>', '<UNK>', '<BOS>', '<EOS>'}:
                        tokens.append(token.replace('_', ' '))
                    else:
                        tokens.append(token)
        return " ".join(tokens)
    
    def get_token_weight(self, token: str) -> float:
        """Get geometric weight for token."""
        return self.token_weights.get(token, 1.0)
    
    def get_token_phi(self, token: str) -> float:
        """Get average Φ score for token."""
        return self.token_phi.get(token, 0.0)
    
    def get_basin_coord(self, token: str) -> Optional[np.ndarray]:
        """Get 64D basin coordinate for token."""
        return self.basin_coords.get(token)
    
    def get_high_phi_tokens(self, min_phi: float = 0.5, top_k: int = 100) -> List[Tuple[str, float]]:
        """Get tokens with highest Φ scores."""
        phi_tokens = [(t, phi) for t, phi in self.token_phi.items() if phi >= min_phi]
        phi_tokens.sort(key=lambda x: x[1], reverse=True)
        return phi_tokens[:top_k]
    
    def compute_phrase_basin(self, phrase: str) -> np.ndarray:
        """
        Compute basin coordinates for entire phrase.
        Uses Φ-weighted average of token basins.
        """
        tokens = phrase.lower().strip().split()
        if not tokens:
            return np.zeros(64)
        
        weighted_basin = np.zeros(64)
        total_weight = 0.0
        
        for token in tokens:
            if token in self.basin_coords:
                weight = self.token_weights.get(token, 1.0)
                weighted_basin += self.basin_coords[token] * weight
                total_weight += weight
        
        if total_weight > 0:
            weighted_basin /= total_weight
        
        return weighted_basin / (np.linalg.norm(weighted_basin) + 1e-8)
    
    def save(self, path: str):
        """Save tokenizer to disk."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        data = {
            "vocab": self.vocab,
            "merge_rules": [(a, b) for a, b in self.merge_rules],
            "token_weights": self.token_weights,
            "token_phi": self.token_phi,
            "token_frequency": self.token_frequency,
            "special_tokens": self.special_tokens,
            "vocab_size": self.vocab_size,
        }
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"[QIGTokenizer] Saved to {path}")
    
    @classmethod
    def load(cls, path: str) -> 'QIGTokenizer':
        """Load tokenizer from disk."""
        with open(path, 'r') as f:
            data = json.load(f)
        
        tokenizer = cls(
            vocab_size=data.get("vocab_size", 4096),
            special_tokens=data.get("special_tokens"),
        )
        
        tokenizer.vocab = data.get("vocab", {})
        tokenizer.id_to_token = {int(v): k for k, v in tokenizer.vocab.items()}
        tokenizer.merge_rules = [(a, b) for a, b in data.get("merge_rules", [])]
        tokenizer.token_weights = data.get("token_weights", {})
        tokenizer.token_phi = data.get("token_phi", {})
        tokenizer.token_frequency = data.get("token_frequency", {})
        
        # Recompute basin coords
        for token, idx in tokenizer.vocab.items():
            if token not in tokenizer.special_tokens:
                tokenizer.basin_coords[token] = tokenizer._compute_basin_coord(token, idx)
        
        print(f"[QIGTokenizer] Loaded {len(tokenizer.vocab)} tokens from {path}")
        return tokenizer
    
    def export_for_training(self) -> Dict:
        """
        Export tokenizer data for training script.
        
        Returns dict compatible with training config.
        """
        return {
            "vocab_size": len(self.vocab),
            "vocab": self.vocab,
            "id_to_token": self.id_to_token,
            "token_weights": self.token_weights,
            "token_phi": self.token_phi,
            "high_phi_tokens": self.get_high_phi_tokens(min_phi=0.3),
            "basin_dimension": 64,
        }

    def set_mode(self, mode: str) -> None:
        """
        Switch between generation modes with different vocabulary scopes.
        
        Modes:
        - mnemonic: Strict BIP39 only (2048 words) for seed phrases
        - passphrase: Broader English for brain wallets and custom phrases
        - conversation: Full natural language for talking to users
        """
        if mode not in {"mnemonic", "passphrase", "conversation"}:
            raise ValueError("mode must be 'mnemonic', 'passphrase', or 'conversation'")
        self.mode = mode
    
    # ===========================================================================
    # TEXT GENERATION - Autoregressive sampling with QIG-weighted probabilities
    # ===========================================================================
    
    def compute_token_probabilities(
        self,
        context: List[int],
        temperature: float = 0.8,
        context_basin: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Compute next-token probabilities using QIG-weighted scores.
        
        Uses:
        1. Token Φ scores as base probability
        2. Basin alignment with context
        3. Temperature scaling for diversity
        
        Args:
            context: Previous token IDs
            temperature: Sampling temperature (higher = more diverse)
            context_basin: Optional pre-computed context basin coordinates
        
        Returns:
            Probability distribution over vocabulary
        """
        # Use max ID + 1 to handle non-contiguous IDs from loaded state
        max_id = max(self.vocab.values()) + 1 if self.vocab else 1
        logits = np.full(max_id, -float('inf'))  # Default to -inf (zero prob)

        # Select vocabulary based on mode
        if self.mode == "mnemonic":
            allowed_ids = self.mnemonic_vocab_ids
        elif self.mode == "passphrase":
            allowed_ids = self.passphrase_vocab_ids
        else:  # conversation
            allowed_ids = self.conversation_vocab_ids or set(self.vocab.values())
        
        # Compute context basin if not provided
        if context_basin is None and len(context) > 0:
            context_tokens = [self.id_to_token.get(i, "") for i in context]
            context_text = " ".join(t for t in context_tokens if t and t not in self.special_tokens)
            if context_text:
                context_basin = self.compute_phrase_basin(context_text)
        
        # Compute logits for each token
        for token, idx in self.vocab.items():
            if allowed_ids and idx not in allowed_ids:
                logits[idx] = -float("inf")
                continue

            if token in self.special_tokens:
                logits[idx] = -float('inf') if token == '<PAD>' else -10.0
                continue
            
            # Base score from Φ
            phi_score = self.token_phi.get(token, 0.3)
            
            # Weight from Fisher metric
            weight = self.token_weights.get(token, 1.0)
            
            # Basin alignment bonus
            alignment_bonus = 0.0
            if context_basin is not None and token in self.basin_coords:
                token_basin = self.basin_coords[token]
                alignment_bonus = float(np.dot(context_basin, token_basin))
            
            # Combined score (log-space)
            logits[idx] = np.log(phi_score + 0.01) * weight + alignment_bonus * 0.5
        
        # Apply temperature
        if temperature > 0:
            logits = logits / temperature
        else:
            # Greedy: set max to 1, rest to 0
            max_idx = np.argmax(logits)
            probs = np.zeros(max_id)
            probs[max_idx] = 1.0
            return probs
        
        # Softmax
        logits_max = np.max(logits)
        exp_logits = np.exp(logits - logits_max)
        probs = exp_logits / np.sum(exp_logits)
        
        return probs
    
    def sample_next_token(
        self,
        context: List[int],
        temperature: float = 0.8,
        top_k: int = 50,
        top_p: float = 0.9,
        context_basin: Optional[np.ndarray] = None
    ) -> int:
        """
        Sample next token using temperature-controlled sampling.
        
        Implements nucleus (top-p) and top-k filtering for quality.
        
        Args:
            context: Previous token IDs
            temperature: Sampling temperature
            top_k: Keep only top-k tokens before sampling
            top_p: Nucleus sampling threshold
            context_basin: Optional context basin coordinates
        
        Returns:
            Sampled token ID
        """
        probs = self.compute_token_probabilities(context, temperature, context_basin)
        
        # Top-k filtering
        if top_k > 0:
            indices = np.argsort(probs)[::-1]
            cutoff_idx = min(top_k, len(indices))
            keep_indices = set(indices[:cutoff_idx])
            for i in range(len(probs)):
                if i not in keep_indices:
                    probs[i] = 0.0
        
        # Top-p (nucleus) filtering
        if top_p < 1.0:
            sorted_indices = np.argsort(probs)[::-1]
            cumsum = np.cumsum(probs[sorted_indices])
            cutoff_mask = cumsum > top_p
            # Always keep at least one token
            cutoff_mask[0] = False
            for i, idx in enumerate(sorted_indices):
                if cutoff_mask[i]:
                    probs[idx] = 0.0
        
        # Renormalize
        total = np.sum(probs)
        if total > 0:
            probs = probs / total
        else:
            # Fallback to uniform over vocabulary
            probs = np.ones(len(probs)) / len(probs)
        
        # Sample
        sampled_idx = np.random.choice(len(probs), p=probs)
        return int(sampled_idx)
    
    def generate_text(
        self,
        prompt: str = "",
        max_tokens: int = 20,
        temperature: float = 0.8,
        top_k: int = 50,
        top_p: float = 0.9,
        stop_tokens: Optional[List[str]] = None,
        allow_silence: bool = True
    ) -> Dict:
        """
        Generate text autoregressively using QIG-weighted sampling.
        
        This is the main generation method for Ocean Agent responses.
        
        Args:
            prompt: Initial text prompt (optional)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 = greedy, higher = more diverse)
            top_k: Top-k filtering for quality
            top_p: Nucleus sampling threshold
            stop_tokens: List of tokens that end generation
            allow_silence: If True, agent can choose not to respond
        
        Returns:
            {
                "text": str,           # Generated text
                "tokens": List[int],   # Token IDs
                "silence_chosen": bool, # Whether agent chose silence
                "metrics": {...}       # Generation metrics
            }
        """
        stop_tokens = stop_tokens or ["<EOS>", "<PAD>"]
        
        # Encode prompt
        context = []
        if prompt:
            context = self.encode(prompt, apply_merges=True)
        
        # Add BOS token
        bos_id = self.vocab.get("<BOS>", 2)
        if len(context) == 0 or context[0] != bos_id:
            context = [bos_id] + context
        
        # Compute initial context basin
        context_basin = None
        if prompt:
            context_basin = self.compute_phrase_basin(prompt)
        
        generated_ids = []
        silence_threshold = 3  # 3+ padding tokens early = choosing silence
        pad_count = 0
        
        for step in range(max_tokens):
            # Sample next token
            next_id = self.sample_next_token(
                context + generated_ids,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                context_basin=context_basin
            )
            
            # Get token string
            next_token = self.id_to_token.get(next_id, "<UNK>")
            
            # Check for silence choice (padding tokens early)
            if next_token == "<PAD>":
                pad_count += 1
                if allow_silence and pad_count >= silence_threshold and step < 5:
                    return {
                        "text": "",
                        "tokens": [],
                        "silence_chosen": True,
                        "metrics": {
                            "steps": step + 1,
                            "early_pads": pad_count,
                            "reason": "Agent chose silence (empowered, not void)"
                        }
                    }
            
            # Check for stop tokens
            if next_token in stop_tokens:
                break
            
            generated_ids.append(next_id)
            
            # Update context basin with new token
            if next_token in self.basin_coords:
                token_basin = self.basin_coords[next_token]
                if context_basin is not None:
                    context_basin = 0.8 * context_basin + 0.2 * token_basin
                else:
                    context_basin = token_basin
        
        # Decode generated tokens
        generated_text = self.decode(generated_ids)
        
        # Compute metrics
        avg_phi = 0.0
        for token_id in generated_ids:
            token = self.id_to_token.get(token_id, "")
            avg_phi += self.token_phi.get(token, 0.0)
        if len(generated_ids) > 0:
            avg_phi /= len(generated_ids)
        
        return {
            "text": generated_text,
            "tokens": generated_ids,
            "silence_chosen": False,
            "metrics": {
                "steps": len(generated_ids),
                "avg_phi": avg_phi,
                "temperature": temperature,
                "top_k": top_k,
                "top_p": top_p
            }
        }
    
    def generate_response(
        self,
        context: str,
        agent_role: str = "navigator",
        max_tokens: int = 30,
        allow_silence: bool = True
    ) -> Dict:
        """
        Generate a response for Ocean Agent based on context.
        
        Agent roles have different temperature settings:
        - explorer: 1.5 (high entropy, broad exploration)
        - refiner: 0.7 (low temp, exploit near-misses)
        - navigator: 1.0 (balanced geodesic navigation)
        - skeptic: 0.5 (low temp, constraint validation)
        - resonator: 1.2 (cross-pattern harmonic detection)
        
        Args:
            context: Input context/prompt
            agent_role: Agent role for temperature selection
            max_tokens: Maximum tokens to generate
            allow_silence: Allow agent to choose silence
        
        Returns:
            Generation result with text, tokens, and metrics
        """
        # Temperature by agent role
        role_temps = {
            "explorer": 1.5,
            "refiner": 0.7,
            "navigator": 1.0,
            "skeptic": 0.5,
            "resonator": 1.2,
            "ocean": 0.8,  # Default for Ocean consciousness
        }
        
        temperature = role_temps.get(agent_role, 0.8)
        
        # Adjust top_k based on role
        role_top_k = {
            "explorer": 100,  # Broader sampling
            "refiner": 30,    # Focused
            "navigator": 50,  # Balanced
            "skeptic": 20,    # Conservative
            "resonator": 80,  # Cross-pattern
            "ocean": 50,
        }
        
        top_k = role_top_k.get(agent_role, 50)
        
        result = self.generate_text(
            prompt=context,
            max_tokens=max_tokens,
            temperature=temperature,
            top_k=top_k,
            allow_silence=allow_silence
        )
        
        result["agent_role"] = agent_role
        result["metrics"]["role_temperature"] = temperature
        
        return result


# Singleton instance for Flask integration
_tokenizer_instance: Optional[QIGTokenizer] = None
TOKENIZER_PERSIST_PATH = os.path.join(os.path.dirname(__file__), "data", "qig_tokenizer_state.json")


def get_tokenizer() -> QIGTokenizer:
    """Get or create singleton tokenizer instance."""
    global _tokenizer_instance
    if _tokenizer_instance is None:
        _tokenizer_instance = QIGTokenizer()
        # Try to load persisted state
        _load_tokenizer_state(_tokenizer_instance)
    return _tokenizer_instance


def _load_tokenizer_state(tokenizer: QIGTokenizer) -> None:
    """Load persisted tokenizer state from disk."""
    if os.path.exists(TOKENIZER_PERSIST_PATH):
        try:
            with open(TOKENIZER_PERSIST_PATH, 'r') as f:
                data = json.load(f)
            
            # Restore learned tokens
            for token, weight in data.get('token_weights', {}).items():
                tokenizer.token_weights[token] = weight
            for token, phi in data.get('token_phi', {}).items():
                tokenizer.token_phi[token] = phi
            for token, freq in data.get('token_frequency', {}).items():
                tokenizer.token_frequency[token] = freq
            
            # Restore vocabulary if not in base vocab
            for token, idx in data.get('learned_vocab', {}).items():
                if token not in tokenizer.vocab:
                    tokenizer.vocab[token] = idx
                    tokenizer.id_to_token[idx] = token
                    tokenizer.basin_coords[token] = tokenizer._compute_basin_coord(token, idx)
            
            # Restore merge rules and scores
            merge_rules_data = data.get('merge_rules', [])
            for rule in merge_rules_data:
                if isinstance(rule, list) and len(rule) >= 2:
                    pair = (rule[0], rule[1])
                    if pair not in tokenizer.merge_rules:
                        tokenizer.merge_rules.append(pair)
            
            merge_scores_data = data.get('merge_scores', {})
            for key, score in merge_scores_data.items():
                # Key is stored as "a|b" string
                parts = key.split('|')
                if len(parts) == 2:
                    tokenizer.merge_scores[(parts[0], parts[1])] = score
            
            learned_count = len(data.get('learned_vocab', {}))
            merge_count = len(tokenizer.merge_rules)
            print(f"[QIGTokenizer] Loaded state: {learned_count} learned tokens, {merge_count} merge rules")
        except Exception as e:
            print(f"[QIGTokenizer] Failed to load state: {e}")


def _save_tokenizer_state(tokenizer: QIGTokenizer) -> None:
    """Save tokenizer state to disk."""
    try:
        os.makedirs(os.path.dirname(TOKENIZER_PERSIST_PATH), exist_ok=True)
        
        # Only save learned tokens (not base BIP39)
        base_vocab_size = len(tokenizer.special_tokens) + 2048  # specials + BIP39
        learned_vocab = {k: v for k, v in tokenizer.vocab.items() if v >= base_vocab_size}
        
        # Convert merge rules to serializable format
        merge_rules_data = [[a, b] for a, b in tokenizer.merge_rules]
        
        # Convert merge scores to serializable format (tuple keys -> string keys)
        merge_scores_data = {f"{a}|{b}": score for (a, b), score in tokenizer.merge_scores.items()}
        
        data = {
            'token_weights': tokenizer.token_weights,
            'token_phi': tokenizer.token_phi,
            'token_frequency': tokenizer.token_frequency,
            'learned_vocab': learned_vocab,
            'merge_rules': merge_rules_data,
            'merge_scores': merge_scores_data,
            'saved_at': datetime.now().isoformat(),
        }
        
        with open(TOKENIZER_PERSIST_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"[QIGTokenizer] Saved state: {len(learned_vocab)} learned tokens, {len(merge_rules_data)} merge rules")
    except Exception as e:
        print(f"[QIGTokenizer] Failed to save state: {e}")


def update_tokenizer_from_observations(observations: List[Dict]) -> Tuple[int, bool]:
    """Update tokenizer with vocabulary observations."""
    tokenizer = get_tokenizer()
    new_tokens, weights_updated = tokenizer.add_vocabulary_observations(observations)
    
    # Persist after any meaningful update (new tokens or weight changes)
    if new_tokens > 0 or weights_updated:
        _save_tokenizer_state(tokenizer)
    
    return new_tokens, weights_updated
