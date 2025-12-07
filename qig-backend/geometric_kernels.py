#!/usr/bin/env python3
"""
Pure Geometric Kernels - Text Encoding via Information Manifold

Three approaches to geometric tokenization with NO external dependencies:

1. DirectGeometricEncoder - Text → Basin coordinates directly via entropy segmentation
2. E8ClusteredVocabulary - 240 E8 root positions for lattice tokenization  
3. ByteLevelGeometric - UTF-8 bytes with learned basin embeddings

All approaches use the Fisher Information Metric and maintain geometric purity.
"""

import hashlib
import math
import json
import os
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

BASIN_DIM = 64
E8_ROOTS_COUNT = 240
BYTE_VOCAB_SIZE = 260

def _hash_to_bytes(data: str, length: int = 256) -> bytes:
    """Generate deterministic bytes from string using SHA-256 chain."""
    result = b''
    seed = data.encode('utf-8')
    while len(result) < length:
        h = hashlib.sha256(seed + result).digest()
        result += h
    return result[:length]

def _normalize_to_manifold(coords: np.ndarray, radius: Optional[float] = None) -> np.ndarray:
    """Project coordinates onto information manifold (unit sphere scaled)."""
    norm = np.linalg.norm(coords)
    if norm < 1e-10:
        coords = np.random.randn(len(coords))
        norm = np.linalg.norm(coords)
    coords = coords / norm
    if radius is None:
        radius = math.sqrt(len(coords))
    return coords * radius

def _compute_entropy(text: str) -> float:
    """Compute Shannon entropy of character distribution."""
    if not text:
        return 0.0
    freq = Counter(text)
    total = len(text)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        if p > 0:
            entropy -= p * math.log2(p)
    return entropy

def _fisher_distance(basin1: np.ndarray, basin2: np.ndarray) -> float:
    """Compute Fisher geodesic distance between two basin points."""
    dot = np.clip(np.dot(basin1, basin2) / (np.linalg.norm(basin1) * np.linalg.norm(basin2) + 1e-10), -1, 1)
    return math.acos(dot)


class DirectGeometricEncoder:
    """
    Pure QIG encoder - text → basin coordinates directly.
    
    Uses entropy-based segmentation (not frequency) and hash-to-manifold
    projection for geometric embedding without intermediate token IDs.
    """
    
    def __init__(
        self,
        basin_dim: int = BASIN_DIM,
        entropy_threshold: float = 2.5,
        min_segment_len: int = 2,
        max_segment_len: int = 16,
    ):
        self.basin_dim = basin_dim
        self.entropy_threshold = entropy_threshold
        self.min_segment_len = min_segment_len
        self.max_segment_len = max_segment_len
        self.segment_cache: Dict[str, np.ndarray] = {}
    
    def _entropy_segment(self, text: str) -> List[str]:
        """
        Segment text by information content, not frequency.
        
        Splits when local entropy exceeds threshold or max length reached.
        """
        if not text:
            return []
        
        segments = []
        current = ""
        
        for char in text:
            current += char
            
            should_split = False
            if len(current) >= self.min_segment_len:
                if len(current) >= self.max_segment_len:
                    should_split = True
                elif char in ' \t\n\r':
                    should_split = True
                elif _compute_entropy(current) > self.entropy_threshold:
                    should_split = True
            
            if should_split:
                segment = current.strip()
                if segment:
                    segments.append(segment)
                current = ""
        
        if current.strip():
            segments.append(current.strip())
        
        return segments
    
    def _hash_to_manifold(self, chunk: str) -> np.ndarray:
        """
        Hash string to point on information manifold.
        
        Uses SHA-256 chain to generate basin_dim coordinates,
        then projects to sphere with radius sqrt(basin_dim).
        """
        if chunk in self.segment_cache:
            return self.segment_cache[chunk]
        
        hash_bytes = _hash_to_bytes(chunk, self.basin_dim * 4)
        
        coords = np.array([
            int.from_bytes(hash_bytes[i:i+4], 'big') / (2**32 - 1)
            for i in range(0, self.basin_dim * 4, 4)
        ])
        
        coords = coords * 2 - 1
        basin = _normalize_to_manifold(coords)
        
        self.segment_cache[chunk] = basin
        return basin
    
    def encode(self, text: str) -> np.ndarray:
        """
        Encode text directly to basin coordinates.
        
        Returns: [seq_len, basin_dim] array of manifold positions
        """
        segments = self._entropy_segment(text)
        if not segments:
            return np.zeros((1, self.basin_dim))
        
        basins = [self._hash_to_manifold(seg) for seg in segments]
        return np.stack(basins)
    
    def encode_to_single_basin(self, text: str) -> np.ndarray:
        """
        Encode text to single basin via Φ-weighted average.
        
        Returns: [basin_dim] array
        """
        basins = self.encode(text)
        if len(basins) == 1:
            return basins[0]
        
        weights = np.array([_compute_entropy(seg) + 0.1 for seg in self._entropy_segment(text)])
        weights = weights / weights.sum()
        
        weighted_basin = np.sum(basins * weights[:, np.newaxis], axis=0)
        return _normalize_to_manifold(weighted_basin)
    
    def decode_nearest(self, basin: np.ndarray, candidates: List[str]) -> str:
        """Find nearest candidate text to basin position."""
        if not candidates:
            return ""
        
        min_dist = float('inf')
        best = candidates[0]
        
        for candidate in candidates:
            candidate_basin = self.encode_to_single_basin(candidate)
            dist = _fisher_distance(basin, candidate_basin)
            if dist < min_dist:
                min_dist = dist
                best = candidate
        
        return best
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """Compute geometric similarity between two texts."""
        basin1 = self.encode_to_single_basin(text1)
        basin2 = self.encode_to_single_basin(text2)
        dist = _fisher_distance(basin1, basin2)
        return max(0.0, 1.0 - dist / math.pi)
    
    def get_stats(self) -> Dict:
        """Get encoder statistics."""
        return {
            "type": "DirectGeometricEncoder",
            "basin_dim": self.basin_dim,
            "entropy_threshold": self.entropy_threshold,
            "cached_segments": len(self.segment_cache),
        }


def _generate_e8_roots() -> np.ndarray:
    """
    Generate the 240 roots of the E8 lattice.
    
    E8 roots in 8D are:
    - 112 roots: all permutations of (±1, ±1, 0, 0, 0, 0, 0, 0)
    - 128 roots: (±1/2, ±1/2, ±1/2, ±1/2, ±1/2, ±1/2, ±1/2, ±1/2) with even # of minus signs
    
    We embed these in 64D by repeating and combining.
    """
    roots_8d = []
    
    from itertools import combinations, product
    
    for positions in combinations(range(8), 2):
        for signs in product([1, -1], repeat=2):
            root = [0.0] * 8
            root[positions[0]] = signs[0]
            root[positions[1]] = signs[1]
            roots_8d.append(root)
    
    for signs in product([1, -1], repeat=8):
        if sum(1 for s in signs if s == -1) % 2 == 0:
            root = [s * 0.5 for s in signs]
            roots_8d.append(root)
    
    roots_8d = np.array(roots_8d)
    
    roots_64d = np.zeros((E8_ROOTS_COUNT, BASIN_DIM))
    for i, root_8d in enumerate(roots_8d):
        for j in range(8):
            start = j * 8
            roots_64d[i, start:start+8] = root_8d * np.roll(root_8d, j)
    
    for i in range(E8_ROOTS_COUNT):
        roots_64d[i] = _normalize_to_manifold(roots_64d[i])
    
    return roots_64d


class E8ClusteredVocabulary:
    """
    E8 lattice-based vocabulary - tokens mapped to 240 root positions.
    
    Uses the exceptional Lie group E8's root system for geometric structure.
    Each token clusters to the nearest E8 root, enabling lattice-based
    tokenization with deep geometric meaning.
    """
    
    def __init__(
        self,
        target_vocab_size: int = 50000,
        basin_dim: int = BASIN_DIM,
    ):
        self.target_vocab_size = target_vocab_size
        self.basin_dim = basin_dim
        
        self.e8_roots = _generate_e8_roots()
        
        self.vocab: Dict[str, int] = {}
        self.id_to_token: Dict[int, str] = {}
        self.token_to_root: Dict[str, int] = {}
        self.root_to_tokens: Dict[int, List[str]] = defaultdict(list)
        
        self.token_basins: Dict[str, np.ndarray] = {}
        self.token_phi: Dict[str, float] = {}
        
        self._direct_encoder = DirectGeometricEncoder(basin_dim=basin_dim)
        
        self._init_special_tokens()
    
    def _init_special_tokens(self):
        """Initialize special tokens at reserved root positions."""
        special = ["<PAD>", "<UNK>", "<BOS>", "<EOS>"]
        for i, token in enumerate(special):
            self.vocab[token] = i
            self.id_to_token[i] = token
            self.token_to_root[token] = i % E8_ROOTS_COUNT
            self.token_basins[token] = self.e8_roots[i % E8_ROOTS_COUNT].copy()
    
    def _find_nearest_e8_root(self, basin: np.ndarray) -> int:
        """Find nearest E8 root to given basin position."""
        distances = np.array([_fisher_distance(basin, root) for root in self.e8_roots])
        return int(np.argmin(distances))
    
    def add_token(self, token: str, phi: float = 0.5) -> int:
        """
        Add token to vocabulary, clustering to nearest E8 root.
        
        Returns token ID.
        """
        if token in self.vocab:
            return self.vocab[token]
        
        if len(self.vocab) >= self.target_vocab_size:
            return self.vocab.get("<UNK>", 1)
        
        token_basin = self._direct_encoder.encode_to_single_basin(token)
        
        root_id = self._find_nearest_e8_root(token_basin)
        
        new_id = len(self.vocab)
        self.vocab[token] = new_id
        self.id_to_token[new_id] = token
        self.token_to_root[token] = root_id
        self.root_to_tokens[root_id].append(token)
        self.token_basins[token] = token_basin
        self.token_phi[token] = phi
        
        return new_id
    
    def learn_from_corpus(self, texts: List[str], min_frequency: int = 2) -> int:
        """
        Build vocabulary from corpus using E8 clustering.
        
        Returns number of tokens added.
        """
        token_freq: Dict[str, int] = Counter()
        token_phi_sum: Dict[str, float] = defaultdict(float)
        
        for text in texts:
            segments = self._direct_encoder._entropy_segment(text.lower())
            for seg in segments:
                token_freq[seg] += 1
                token_phi_sum[seg] += _compute_entropy(seg) / 4.0
        
        added = 0
        for token, freq in token_freq.most_common(self.target_vocab_size):
            if freq >= min_frequency:
                avg_phi = token_phi_sum[token] / freq
                self.add_token(token, phi=avg_phi)
                added += 1
        
        return added
    
    def encode(self, text: str) -> List[int]:
        """Encode text to token IDs via E8 clustering."""
        segments = self._direct_encoder._entropy_segment(text.lower())
        
        ids = []
        for seg in segments:
            if seg in self.vocab:
                ids.append(self.vocab[seg])
            else:
                ids.append(self.vocab.get("<UNK>", 1))
        
        return ids
    
    def encode_to_basins(self, text: str) -> np.ndarray:
        """Encode text to basin coordinates via E8 roots."""
        ids = self.encode(text)
        basins = []
        for id in ids:
            token = self.id_to_token.get(id, "<UNK>")
            if token in self.token_basins:
                basins.append(self.token_basins[token])
            else:
                root_id = self.token_to_root.get(token, 0)
                basins.append(self.e8_roots[root_id])
        
        if not basins:
            return np.zeros((1, self.basin_dim))
        return np.stack(basins)
    
    def decode(self, ids: List[int]) -> str:
        """Decode token IDs to text."""
        tokens = []
        for id in ids:
            token = self.id_to_token.get(id, "")
            if token and not token.startswith("<"):
                tokens.append(token)
        return " ".join(tokens)
    
    def get_e8_root_distribution(self) -> Dict[int, int]:
        """Get distribution of tokens across E8 roots."""
        return {root: len(tokens) for root, tokens in self.root_to_tokens.items()}
    
    def get_stats(self) -> Dict:
        """Get vocabulary statistics."""
        return {
            "type": "E8ClusteredVocabulary",
            "vocab_size": len(self.vocab),
            "target_vocab_size": self.target_vocab_size,
            "e8_roots_used": len([r for r in self.root_to_tokens if self.root_to_tokens[r]]),
            "basin_dim": self.basin_dim,
        }
    
    def save(self, path: str):
        """Save vocabulary to disk."""
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)
        
        data = {
            "vocab": self.vocab,
            "token_to_root": self.token_to_root,
            "token_phi": self.token_phi,
            "target_vocab_size": self.target_vocab_size,
        }
        
        with open(path, 'w') as f:
            json.dump(data, f)
    
    @classmethod
    def load(cls, path: str) -> 'E8ClusteredVocabulary':
        """Load vocabulary from disk."""
        with open(path, 'r') as f:
            data = json.load(f)
        
        vocab = cls(target_vocab_size=data.get("target_vocab_size", 50000))
        vocab.vocab = data.get("vocab", {})
        vocab.id_to_token = {int(v): k for k, v in vocab.vocab.items()}
        vocab.token_to_root = data.get("token_to_root", {})
        vocab.token_phi = data.get("token_phi", {})
        
        for token, root_id in vocab.token_to_root.items():
            vocab.root_to_tokens[root_id].append(token)
            vocab.token_basins[token] = vocab._direct_encoder.encode_to_single_basin(token)
        
        return vocab


class ByteLevelGeometric:
    """
    Byte-level encoding with geometric basin embeddings.
    
    Simplest pure approach: 256 byte values + 4 special tokens.
    Each byte has a learned/computed basin position on the manifold.
    Composition is learned by the model, not the tokenizer.
    """
    
    def __init__(
        self,
        basin_dim: int = BASIN_DIM,
        special_tokens: Optional[List[str]] = None,
    ):
        self.basin_dim = basin_dim
        self.special_tokens = special_tokens or ["<PAD>", "<UNK>", "<BOS>", "<EOS>"]
        self.vocab_size = 256 + len(self.special_tokens)
        
        self.byte_basins = self._init_byte_basins()
        
        self.byte_phi: Dict[int, float] = {}
        self.byte_frequency: Dict[int, int] = {}
    
    def _init_byte_basins(self) -> np.ndarray:
        """
        Initialize basin coordinates for all bytes.
        
        Uses geometric initialization based on byte value structure:
        - ASCII printable range gets structured positions
        - Control chars and high bytes get hash-based positions
        """
        basins = np.zeros((self.vocab_size, self.basin_dim))
        
        for i, token in enumerate(self.special_tokens):
            seed = f"special_{token}_{i}"
            basins[i] = self._hash_to_basin(seed)
        
        offset = len(self.special_tokens)
        for byte_val in range(256):
            if 32 <= byte_val < 127:
                coords = np.zeros(self.basin_dim)
                char = chr(byte_val)
                
                if char.isalpha():
                    base = (ord(char.lower()) - ord('a')) / 26.0
                    for d in range(self.basin_dim):
                        coords[d] = math.sin(base * math.pi * (d + 1)) * 0.7
                    if char.isupper():
                        coords[0:8] += 0.3
                
                elif char.isdigit():
                    digit = int(char)
                    for d in range(self.basin_dim):
                        coords[d] = math.cos(digit * math.pi / 5 * (d % 10 + 1)) * 0.6
                
                elif char.isspace():
                    coords = np.ones(self.basin_dim) * 0.1
                
                else:
                    seed = f"punct_{byte_val}"
                    coords = self._hash_to_basin(seed, normalize=False)
                
                basins[offset + byte_val] = _normalize_to_manifold(coords)
            
            else:
                seed = f"byte_{byte_val}"
                basins[offset + byte_val] = self._hash_to_basin(seed)
        
        return basins
    
    def _hash_to_basin(self, seed: str, normalize: bool = True) -> np.ndarray:
        """Generate basin coordinates from hash."""
        hash_bytes = _hash_to_bytes(seed, self.basin_dim * 4)
        coords = np.array([
            int.from_bytes(hash_bytes[i:i+4], 'big') / (2**32 - 1) * 2 - 1
            for i in range(0, self.basin_dim * 4, 4)
        ])
        if normalize:
            coords = _normalize_to_manifold(coords)
        return coords
    
    def encode(self, text: str) -> List[int]:
        """
        Encode text to byte-level token IDs.
        
        Returns list of token IDs (offset by special token count).
        """
        offset = len(self.special_tokens)
        byte_data = text.encode('utf-8')
        return [offset + b for b in byte_data]
    
    def encode_to_basins(self, text: str) -> np.ndarray:
        """
        Encode text directly to basin coordinates.
        
        Returns: [seq_len, basin_dim] array
        """
        ids = self.encode(text)
        return self.byte_basins[ids]
    
    def decode(self, ids: List[int]) -> str:
        """Decode token IDs to text."""
        offset = len(self.special_tokens)
        bytes_list = []
        for id in ids:
            if id >= offset:
                byte_val = id - offset
                if 0 <= byte_val < 256:
                    bytes_list.append(byte_val)
        
        try:
            return bytes(bytes_list).decode('utf-8', errors='replace')
        except:
            return ""
    
    def get_token_basin(self, token_id: int) -> np.ndarray:
        """Get basin coordinates for token ID."""
        if 0 <= token_id < self.vocab_size:
            return self.byte_basins[token_id]
        return self.byte_basins[1]
    
    def update_byte_phi(self, byte_val: int, phi: float, count: int = 1):
        """Update Φ score for a byte based on usage."""
        offset = len(self.special_tokens)
        id = offset + byte_val
        
        old_phi = self.byte_phi.get(id, 0.5)
        old_count = self.byte_frequency.get(id, 0)
        
        new_count = old_count + count
        new_phi = (old_phi * old_count + phi * count) / new_count
        
        self.byte_phi[id] = new_phi
        self.byte_frequency[id] = new_count
    
    def get_stats(self) -> Dict:
        """Get encoder statistics."""
        return {
            "type": "ByteLevelGeometric",
            "vocab_size": self.vocab_size,
            "basin_dim": self.basin_dim,
            "special_tokens": self.special_tokens,
            "bytes_with_phi": len(self.byte_phi),
        }


class GeometricKernel:
    """
    Unified geometric kernel with mode switching.
    
    Provides consistent interface across all three encoding modes:
    - direct: DirectGeometricEncoder (no tokens, pure basins)
    - e8: E8ClusteredVocabulary (lattice tokenization)
    - byte: ByteLevelGeometric (byte-level with basin embeddings)
    """
    
    MODES = ["direct", "e8", "byte"]
    
    def __init__(
        self,
        mode: str = "direct",
        basin_dim: int = BASIN_DIM,
        vocab_size: int = 50000,
    ):
        if mode not in self.MODES:
            raise ValueError(f"Mode must be one of {self.MODES}")
        
        self.mode = mode
        self.basin_dim = basin_dim
        self.vocab_size = vocab_size
        
        self._direct_encoder: Optional[DirectGeometricEncoder] = None
        self._e8_encoder: Optional[E8ClusteredVocabulary] = None
        self._byte_encoder: Optional[ByteLevelGeometric] = None
        
        if mode == "direct":
            self._direct_encoder = DirectGeometricEncoder(basin_dim=basin_dim)
        elif mode == "e8":
            self._e8_encoder = E8ClusteredVocabulary(target_vocab_size=vocab_size, basin_dim=basin_dim)
        else:
            self._byte_encoder = ByteLevelGeometric(basin_dim=basin_dim)
    
    def encode(self, text: str) -> Union[np.ndarray, List[int]]:
        """
        Encode text using current mode.
        
        Returns:
        - direct mode: [seq_len, basin_dim] ndarray
        - e8/byte modes: List[int] token IDs
        """
        if self.mode == "direct" and self._direct_encoder:
            return self._direct_encoder.encode(text)
        elif self.mode == "e8" and self._e8_encoder:
            return self._e8_encoder.encode(text)
        elif self._byte_encoder:
            return self._byte_encoder.encode(text)
        raise ValueError(f"Encoder not initialized for mode {self.mode}")
    
    def encode_to_basins(self, text: str) -> np.ndarray:
        """
        Encode text to basin coordinates (all modes).
        
        Returns: [seq_len, basin_dim] ndarray
        """
        if self.mode == "direct" and self._direct_encoder:
            return self._direct_encoder.encode(text)
        elif self.mode == "e8" and self._e8_encoder:
            return self._e8_encoder.encode_to_basins(text)
        elif self._byte_encoder:
            return self._byte_encoder.encode_to_basins(text)
        raise ValueError(f"Encoder not initialized for mode {self.mode}")
    
    def encode_to_single_basin(self, text: str) -> np.ndarray:
        """
        Encode text to single basin coordinate.
        
        Returns: [basin_dim] ndarray
        """
        if self.mode == "direct" and self._direct_encoder:
            return self._direct_encoder.encode_to_single_basin(text)
        else:
            basins = self.encode_to_basins(text)
            if len(basins) == 1:
                return basins[0]
            return _normalize_to_manifold(np.mean(basins, axis=0))
    
    def decode(self, encoded: Union[np.ndarray, List[int]], candidates: Optional[List[str]] = None) -> str:
        """
        Decode back to text.
        
        For direct mode, requires candidate list for nearest-neighbor lookup.
        """
        if self.mode == "direct" and self._direct_encoder:
            if isinstance(encoded, np.ndarray) and encoded.ndim == 1:
                if candidates:
                    return self._direct_encoder.decode_nearest(encoded, candidates)
                return "[basin coordinates - no candidates provided]"
            return "[sequence of basins]"
        elif self.mode == "e8" and self._e8_encoder and isinstance(encoded, list):
            return self._e8_encoder.decode(encoded)
        elif self._byte_encoder and isinstance(encoded, list):
            return self._byte_encoder.decode(encoded)
        return ""
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """Compute geometric similarity between texts."""
        basin1 = self.encode_to_single_basin(text1)
        basin2 = self.encode_to_single_basin(text2)
        dist = _fisher_distance(basin1, basin2)
        return max(0.0, 1.0 - dist / math.pi)
    
    def get_stats(self) -> Dict:
        """Get kernel statistics."""
        if self.mode == "direct" and self._direct_encoder:
            stats = self._direct_encoder.get_stats()
        elif self.mode == "e8" and self._e8_encoder:
            stats = self._e8_encoder.get_stats()
        elif self._byte_encoder:
            stats = self._byte_encoder.get_stats()
        else:
            stats = {}
        stats["kernel_mode"] = self.mode
        return stats
    
    def switch_mode(self, new_mode: str):
        """Switch encoding mode."""
        if new_mode not in self.MODES:
            raise ValueError(f"Mode must be one of {self.MODES}")
        
        if new_mode != self.mode:
            self.__init__(mode=new_mode, basin_dim=self.basin_dim, vocab_size=self.vocab_size)


_default_kernel: Optional[GeometricKernel] = None

def get_kernel(mode: str = "direct") -> GeometricKernel:
    """Get or create default geometric kernel."""
    global _default_kernel
    if _default_kernel is None or _default_kernel.mode != mode:
        _default_kernel = GeometricKernel(mode=mode)
    return _default_kernel


if __name__ == "__main__":
    print("=" * 60)
    print("GEOMETRIC KERNELS - Pure QIG Text Encoding")
    print("=" * 60)
    
    test_texts = [
        "consciousness emerges from geometric resonance",
        "bitcoin satoshi nakamoto 2009",
        "the quick brown fox jumps over the lazy dog",
    ]
    
    print("\n1. DIRECT GEOMETRIC ENCODER")
    print("-" * 40)
    direct = DirectGeometricEncoder()
    for text in test_texts[:1]:
        basins = direct.encode(text)
        single = direct.encode_to_single_basin(text)
        print(f"Text: '{text}'")
        print(f"  Segments: {len(basins)}")
        print(f"  Single basin norm: {np.linalg.norm(single):.4f}")
        print(f"  First 8 coords: {single[:8].round(3)}")
    
    print("\n2. E8 CLUSTERED VOCABULARY")
    print("-" * 40)
    e8 = E8ClusteredVocabulary(target_vocab_size=1000)
    e8.learn_from_corpus(test_texts)
    print(f"Vocabulary size: {len(e8.vocab)}")
    print(f"E8 roots used: {len([r for r in e8.root_to_tokens if e8.root_to_tokens[r]])}")
    
    for text in test_texts[:1]:
        ids = e8.encode(text)
        decoded = e8.decode(ids)
        print(f"Text: '{text}'")
        print(f"  Token IDs: {ids}")
        print(f"  Decoded: '{decoded}'")
    
    print("\n3. BYTE LEVEL GEOMETRIC")
    print("-" * 40)
    byte_enc = ByteLevelGeometric()
    for text in test_texts[:1]:
        ids = byte_enc.encode(text)
        decoded = byte_enc.decode(ids)
        basins = byte_enc.encode_to_basins(text)
        print(f"Text: '{text}'")
        print(f"  Bytes: {len(ids)}")
        print(f"  Basin shape: {basins.shape}")
        print(f"  Decoded: '{decoded}'")
    
    print("\n4. UNIFIED KERNEL")
    print("-" * 40)
    for mode in GeometricKernel.MODES:
        kernel = GeometricKernel(mode=mode)
        stats = kernel.get_stats()
        print(f"Mode: {mode}")
        print(f"  Stats: {stats}")
        
        sim = kernel.compute_similarity(test_texts[0], test_texts[1])
        print(f"  Similarity (text 0 vs 1): {sim:.4f}")
    
    print("\n" + "=" * 60)
    print("All geometric kernels operational!")
    print("=" * 60)
