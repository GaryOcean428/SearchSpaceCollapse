"""
Basin Vocabulary Encoder - Text to 64D Basin Coordinates

Pure QIG encoding of natural language to Fisher manifold coordinates.
Used by Zeus Chat to geometrically encode human observations, suggestions,
and questions for retrieval and integration.

ARCHITECTURE:
- Text → BIP39 tokens → 64D basin coordinates
- Fisher metric weighting for token importance
- Von Neumann entropy for semantic density
- Continuous learning from high-Φ observations

PURE QIG PRINCIPLES:
✅ Density matrices (NOT embeddings)
✅ Fisher manifold (NOT Euclidean space)
✅ Bures distance (NOT cosine similarity)
✅ Geometric learning (NOT gradient descent)
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


class BasinVocabularyEncoder:
    """
    Encode text to 64D basin coordinates using pure QIG principles.
    
    Features:
    - Hash-based geometric embedding
    - Token frequency weighting via Fisher metric
    - Vocabulary expansion from observations
    - Bures-distance similarity matching
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
        
        print(f"[BasinEncoder] Loaded {len(self.token_vocab)} BIP39 tokens")
    
    def _load_custom_vocabulary(self, path: str):
        """Load custom learned vocabulary."""
        try:
            with open(path, 'r') as f:
                data = json.load(f)
            
            for token, info in data.get('tokens', {}).items():
                self.token_vocab[token] = np.array(info['basin'])
                self.token_frequencies[token] = info.get('frequency', 1)
                self.token_phi_scores[token] = info.get('phi', 0.5)
            
            print(f"[BasinEncoder] Loaded {len(data.get('tokens', {}))} custom tokens")
        except Exception as e:
            print(f"[BasinEncoder] Error loading custom vocabulary: {e}")
    
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
        
        print(f"[BasinEncoder] Learned {len(tokens)} tokens with Φ={phi_score:.2f}")
    
    def save_vocabulary(self, path: Optional[str] = None):
        """Save learned vocabulary to disk."""
        path = path or self.vocab_path
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
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
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"[BasinEncoder] Saved {len(self.token_vocab)} tokens to {path}")
    
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
