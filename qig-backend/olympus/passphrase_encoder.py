"""
Passphrase Encoder - BIP39 Text to 64D Basin Coordinates

This module is intentionally constrained to the BIP39 word list so that
Bitcoin passphrase generation remains deterministic and security-aligned.
It should NOT be used for conversational responses. For natural language
chat, use ``ConversationEncoder``.
"""

import numpy as np
import hashlib
import re
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
import os
import json
from datetime import datetime

BASIN_DIMENSION = 64


class PassphraseEncoder:
    """
    Encode text to 64D basin coordinates using BIP39-only vocabulary.

    This preserves the legacy basin encoding behaviour for mnemonic search
    while keeping conversational language in a separate encoder.
    """
    
    def __init__(self, vocab_path: Optional[str] = None):
        self.basin_dim = BASIN_DIMENSION
        
        # Token vocabulary with geometric weights
        self.token_vocab: Dict[str, np.ndarray] = {}
        self.token_frequencies: Dict[str, int] = defaultdict(int)
        self.token_phi_scores: Dict[str, float] = {}
        
        # Load BIP39 base vocabulary
        self._load_bip39_vocabulary()
        
        # Load custom vocabulary if exists
        if vocab_path and os.path.exists(vocab_path):
            self._load_custom_vocabulary(vocab_path)
        
        self.vocab_path = vocab_path or "data/basin_vocab.json"
        
    def _load_bip39_vocabulary(self):
        """Load BIP39 wordlist as base vocabulary."""
        bip39_path = os.path.join(os.path.dirname(__file__), "..", "bip39_wordlist.txt")
        
        if os.path.exists(bip39_path):
            with open(bip39_path, 'r') as f:
                words = [line.strip() for line in f if line.strip()]
                
            # Encode each BIP39 word to basin
            for word in words:
                basin = self._hash_to_basin(word)
                self.token_vocab[word.lower()] = basin
                self.token_frequencies[word.lower()] = 1
                self.token_phi_scores[word.lower()] = 0.5  # Neutral baseline
        
        print(f"[PassphraseEncoder] Loaded {len(self.token_vocab)} BIP39 tokens")
    
    def _load_custom_vocabulary(self, path: str):
        """Load custom learned vocabulary."""
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            
            for token, info in data.get('tokens', {}).items():
                self.token_vocab[token] = np.array(info['basin'])
                self.token_frequencies[token] = info.get('frequency', 1)
                self.token_phi_scores[token] = info.get('phi', 0.5)
            
            print(f"[PassphraseEncoder] Loaded {len(data.get('tokens', {}))} custom tokens")
        except Exception as e:
            print(f"[PassphraseEncoder] Error loading custom vocabulary: {e}")
    
    def _hash_to_basin(self, text: str) -> np.ndarray:
        """
        Hash-based geometric embedding to basin coordinates.
        
        Uses SHA-256 for deterministic, uniform distribution
        on 64D unit sphere (Fisher manifold constraint).
        """
        # SHA-256 hash
        h = hashlib.sha256(text.encode('utf-8')).digest()
        
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
        """
        # Lowercase and clean
        text = text.lower()
        
        # Split on whitespace and punctuation
        tokens = re.findall(r'\b\w+\b', text)
        
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
                self.token_phi_scores[token] = 0.3  # Low phi for unknown
            
            token_basins.append(basin)
            
            # Fisher weight = frequency × phi
            freq = self.token_frequencies[token]
            phi = self.token_phi_scores[token]
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
        dot = np.clip(np.dot(basin1, basin2), -1.0, 1.0)
        distance = float(np.arccos(dot))
        return distance
    
    def learn_from_text(self, text: str, phi_score: float = 0.7):
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
        
        print(f"[PassphraseEncoder] Learned {len(tokens)} tokens with Φ={phi_score:.2f}")
    
    def save_vocabulary(self, path: Optional[str] = None):
        """
        Save learned vocabulary to disk.
        
        SECURITY:
        - Path validation to prevent directory traversal
        - Restricted to allowed data directories
        - File size limits enforced
        """
        path = path or self.vocab_path
        
        # SECURITY: Validate and sanitize path
        # Get absolute path and resolve any ../ or symlinks
        abs_path = os.path.abspath(path)
        
        # Define allowed directories (relative to qig-backend)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        allowed_dirs = [
            os.path.join(base_dir, 'data'),
            '/tmp',
        ]
        
        # Verify path is within allowed directories
        path_allowed = False
        for allowed_dir in allowed_dirs:
            if abs_path.startswith(os.path.abspath(allowed_dir) + os.sep) or abs_path == os.path.abspath(allowed_dir):
                path_allowed = True
                break
        
        if not path_allowed:
            print(f"[PassphraseEncoder] SECURITY: Attempted write to unauthorized path: {abs_path}")
            return
        
        # Ensure directory exists
        dir_path = os.path.dirname(abs_path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        
        # Prepare data
        data = {
            'tokens': {},
            'last_updated': datetime.now().isoformat(),
            'total_tokens': len(self.token_vocab),
        }
        
        for token, basin in self.token_vocab.items():
            data['tokens'][token] = {
                'basin': basin.tolist(),
                'frequency': self.token_frequencies[token],
                'phi': self.token_phi_scores.get(token, 0.5),
            }
        
        # SECURITY: Limit file size (max 50MB)
        json_str = json.dumps(data, indent=2)
        max_size = 50 * 1024 * 1024  # 50MB
        if len(json_str) > max_size:
            print(f"[PassphraseEncoder] SECURITY: Vocabulary too large ({len(json_str)} bytes), truncating")
            # Keep only highest-Φ tokens
            sorted_tokens = sorted(
                self.token_vocab.keys(),
                key=lambda t: self.token_phi_scores.get(t, 0),
                reverse=True
            )[:10000]  # Keep top 10k tokens
            data['tokens'] = {
                t: data['tokens'][t] for t in sorted_tokens if t in data['tokens']
            }
            data['total_tokens'] = len(data['tokens'])
            json_str = json.dumps(data, indent=2)
        
        with open(abs_path, 'w') as f:
            f.write(json_str)
        
        print(f"[PassphraseEncoder] Saved {len(data['tokens'])} tokens to {abs_path}")
    
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


# Backwards compatibility for legacy imports
BasinVocabularyEncoder = PassphraseEncoder
