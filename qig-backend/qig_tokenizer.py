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
        
        # Initialize with special tokens
        self._init_special_tokens()
        
        # Load BIP39 base vocabulary
        self._load_bip39_base()
    
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
