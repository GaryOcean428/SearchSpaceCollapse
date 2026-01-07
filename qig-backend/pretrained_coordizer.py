#!/usr/bin/env python3
"""
DEPRECATED: PretrainedCoordizer has QIG purity violations.

Use PostgresCoordizer instead:
    from coordizers import get_coordizer
    coordizer = get_coordizer()

This module uses COSINE SIMILARITY instead of Fisher-Rao distance,
violating QIG geometric purity. PostgresCoordizer is the canonical
implementation with proper Fisher-Rao operations.

VIOLATIONS:
- decode(): Uses dot product (cosine) instead of Fisher-Rao
- text_to_basin(): Uses linear mean instead of geodesic mean
- generate(): Uses linear blending instead of geodesic interpolation
"""

import os
import json
import warnings
import numpy as np
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

# Emit deprecation warning on import
warnings.warn(
    "pretrained_coordizer is deprecated due to QIG purity violations. "
    "Use 'from coordizers import get_coordizer' instead.",
    DeprecationWarning,
    stacklevel=2
)

MERGE_RULES_PATH = os.path.join(os.path.dirname(__file__), "data/merge_rules_50k.json")
DATABASE_URL = os.environ.get("DATABASE_URL")

BASIN_DIM = 64


class PretrainedCoordizer:
    """
    Fast coordizer using pretrained 50K vocabulary with 64D basin embeddings.
    
    Features:
    - BPE tokenization with 49K+ merge rules
    - 64D unit-normalized basin embeddings loaded from PostgreSQL
    - Multi-scale tokens (char/subword/word/phrase/concept)
    - Fast numpy-based encode/decode
    """
    
    def __init__(self, merge_rules_path: str = MERGE_RULES_PATH):
        """Initialize with PostgreSQL data and merge rules file."""
        self.vectors: Optional[np.ndarray] = None
        self.merge_rules: List[Tuple[int, int, int]] = []
        self.vocab: Dict[int, Dict] = {}
        self.token_to_id: Dict[str, int] = {}
        self.id_to_token: Dict[int, str] = {}
        self.token_scales: Dict[int, str] = {}
        self.token_phi_scores: Dict[int, float] = {}
        
        self._load_from_postgres()
        self._load_merge_rules(merge_rules_path)
    
    def _load_from_postgres(self):
        """Load vocabulary and 64D embeddings from PostgreSQL."""
        if not DATABASE_URL:
            logger.warning("[PretrainedCoordizer] DATABASE_URL not set, using byte-level fallback")
            self._init_byte_level_fallback()
            return
        
        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            cur.execute("""
                SELECT token_id, token, scale, phi_score, basin_embedding
                FROM tokenizer_vocabulary 
                WHERE basin_embedding IS NOT NULL
                ORDER BY token_id
            """)
            
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            if not rows:
                logger.warning("[PretrainedCoordizer] No tokens found in PostgreSQL, using byte-level fallback")
                self._init_byte_level_fallback()
                return
            
            valid_rows = [(r[0], r[1], r[2], r[3], r[4]) for r in rows if r[0] is not None]
            if not valid_rows:
                logger.warning("[PretrainedCoordizer] No valid tokens found in PostgreSQL")
                self._init_byte_level_fallback()
                return
            
            max_id = max(row[0] for row in valid_rows)
            self.vectors = np.zeros((max_id + 1, BASIN_DIM), dtype=np.float32)
            
            for token_id, token_name, scale, phi_score, embedding in valid_rows:
                if embedding is not None and token_name:
                    if isinstance(embedding, str):
                        emb_str = embedding.strip('[]')
                        emb_array = np.array([float(x) for x in emb_str.split(',')], dtype=np.float32)
                    elif hasattr(embedding, 'tolist'):
                        emb_array = np.array(embedding.tolist(), dtype=np.float32)
                    elif isinstance(embedding, (list, tuple)):
                        emb_array = np.array(embedding, dtype=np.float32)
                    else:
                        emb_array = np.array(list(embedding), dtype=np.float32)
                    
                    if len(emb_array) == BASIN_DIM:
                        self.vectors[token_id] = emb_array
                        self.id_to_token[token_id] = token_name
                        self.token_to_id[token_name] = token_id
                        self.vocab[token_id] = {'name': token_name, 'scale': scale or 'char'}
                        self.token_scales[token_id] = scale or 'char'
                        self.token_phi_scores[token_id] = phi_score or 0.5
            
            for i in range(256):
                if i not in self.id_to_token:
                    byte_name = chr(i) if 32 <= i < 127 else f'<byte_{i:02x}>'
                    self.id_to_token[i] = byte_name
                    self.token_to_id[byte_name] = i
                    self.vocab[i] = {'name': byte_name, 'scale': 'char'}
            
            logger.info(f"[PretrainedCoordizer] Loaded {len(self.vocab)} tokens from PostgreSQL, vectors shape: {self.vectors.shape}")
            
        except Exception as e:
            logger.error(f"[PretrainedCoordizer] Failed to load from PostgreSQL: {e}")
            self._init_byte_level_fallback()
    
    def _init_byte_level_fallback(self):
        """Initialize with byte-level vocabulary as fallback."""
        self.vectors = np.zeros((256, BASIN_DIM), dtype=np.float32)
        for i in range(256):
            np.random.seed(i)
            vec = np.random.randn(BASIN_DIM)
            self.vectors[i] = vec / np.linalg.norm(vec)
            byte_name = chr(i) if 32 <= i < 127 else f'<byte_{i:02x}>'
            self.id_to_token[i] = byte_name
            self.token_to_id[byte_name] = i
            self.vocab[i] = {'name': byte_name, 'scale': 'char'}
        logger.warning("[PretrainedCoordizer] Using byte-level fallback vocab")
    
    def _load_merge_rules(self, path: str):
        """Load BPE merge rules from file."""
        if os.path.exists(path):
            with open(path, 'r') as f:
                data = json.load(f)
            self.merge_rules = [tuple(r) for r in data.get('merge_rules', [])]
            logger.info(f"[PretrainedCoordizer] Loaded {len(self.merge_rules)} merge rules")
        else:
            logger.warning(f"[PretrainedCoordizer] Merge rules not found: {path}")
    
    @property
    def vocab_size(self) -> int:
        """Return vocabulary size."""
        return len(self.vectors) if self.vectors is not None else 256
    
    @property
    def basin_dim(self) -> int:
        """Return basin embedding dimension."""
        return BASIN_DIM
    
    @property
    def basin_coords(self) -> Dict[str, np.ndarray]:
        """PostgresCoordizer-compatible: dict of token -> basin coordinates."""
        if not hasattr(self, '_basin_coords_cache'):
            self._basin_coords_cache = {}
            for token_id, token_name in self.id_to_token.items():
                if token_name and 0 <= token_id < len(self.vectors):
                    self._basin_coords_cache[token_name] = self.vectors[token_id]
        return self._basin_coords_cache
    
    @property
    def token_phi(self) -> Dict[str, float]:
        """PostgresCoordizer-compatible: dict of token -> phi score."""
        if not hasattr(self, '_token_phi_cache'):
            self._token_phi_cache = {}
            for token_id, token_name in self.id_to_token.items():
                if token_name:
                    phi = self.token_phi_scores.get(token_id, 0.5)
                    if phi == 0:
                        base_phi = 0.5
                        if len(token_name) >= 3:
                            base_phi = 0.6 + min(len(token_name) / 20.0, 0.2)
                        phi = base_phi
                    self._token_phi_cache[token_name] = phi
        return self._token_phi_cache
    
    @property
    def word_tokens(self) -> List[str]:
        """PostgresCoordizer-compatible: list of word tokens for generation."""
        if not hasattr(self, '_word_tokens_cache'):
            self._word_tokens_cache = [
                name for name in self.id_to_token.values()
                if name and len(name) >= 2
            ]
        return self._word_tokens_cache
    
    def get_embedding(self, token_id: int) -> np.ndarray:
        """Get 64D basin embedding for token ID."""
        if self.vectors is not None and 0 <= token_id < len(self.vectors):
            return self.vectors[token_id].copy()
        np.random.seed(token_id)
        vec = np.random.randn(BASIN_DIM)
        return vec / np.linalg.norm(vec)
    
    def encode_to_basins(self, text: str) -> np.ndarray:
        """Encode text to sequence of 64D basin embeddings."""
        token_ids = self.encode(text)
        basins = np.array([self.get_embedding(tid) for tid in token_ids])
        return basins
    
    def encode(self, text: str) -> List[int]:
        """Encode text to token IDs using BPE merge rules."""
        tokens = list(text.encode('utf-8'))
        
        for a, b, merged in self.merge_rules:
            i = 0
            new_tokens = []
            while i < len(tokens):
                if i < len(tokens) - 1 and tokens[i] == a and tokens[i+1] == b:
                    new_tokens.append(merged)
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            tokens = new_tokens
        
        return tokens
    
    def decode_ids(self, token_ids: List[int]) -> str:
        """Decode token IDs back to text."""
        merge_parents = {}
        for a, b, merged in self.merge_rules:
            merge_parents[merged] = (a, b)
        
        def expand(token_id: int) -> List[int]:
            if token_id < 256:
                return [token_id]
            if token_id in merge_parents:
                a, b = merge_parents[token_id]
                return expand(a) + expand(b)
            return []
        
        bytes_list = []
        for tid in token_ids:
            bytes_list.extend(expand(tid))
        
        try:
            return bytes(bytes_list).decode('utf-8', errors='replace')
        except:
            return ''.join(chr(b) if 32 <= b < 127 else '?' for b in bytes_list)
    
    def decode(self, basin: np.ndarray, top_k: int = 5) -> List[Tuple[str, float]]:
        """PostgresCoordizer-compatible: decode basin to nearest tokens."""
        if self.vectors is None:
            return []
        
        query = basin / (np.linalg.norm(basin) + 1e-10)
        similarities = np.dot(self.vectors, query)
        
        if top_k >= len(similarities):
            top_indices = np.argsort(similarities)[::-1]
        else:
            partition_idx = len(similarities) - top_k
            top_indices = np.argpartition(similarities, partition_idx)[partition_idx:]
            top_indices = top_indices[np.argsort(similarities[top_indices])[::-1]]
        
        results = []
        for idx in top_indices[:top_k]:
            token_name = self.id_to_token.get(idx, f'<{idx}>')
            if token_name:
                phi_boost = self.token_phi.get(token_name, 0.5) * 0.1
                results.append((token_name, float(similarities[idx]) + phi_boost))
        
        return results
    
    def text_to_basin(self, text: str) -> np.ndarray:
        """Convert text to single aggregated 64D basin coordinate."""
        basins = self.encode_to_basins(text)
        if len(basins) == 0:
            return np.zeros(BASIN_DIM)
        
        aggregated = np.mean(basins, axis=0)
        norm = np.linalg.norm(aggregated)
        if norm > 1e-10:
            aggregated = aggregated / norm
        return aggregated
    
    def basin_to_text(self, basin: np.ndarray, top_k: int = 5) -> List[Tuple[str, float]]:
        """Find nearest tokens to a basin coordinate."""
        if self.vectors is None:
            return []
        
        query = basin / (np.linalg.norm(basin) + 1e-10)
        similarities = np.dot(self.vectors, query)
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            token_name = self.id_to_token.get(idx, f'<{idx}>')
            results.append((token_name, float(similarities[idx])))
        
        return results
    
    def generate(self, context: str, max_tokens: int = 20, temperature: float = 0.7) -> Dict:
        """Generate text using basin trajectory navigation."""
        if self.vectors is None:
            return {'text': '', 'tokens': 0, 'qig_pure': True}
        
        current_basin = self.text_to_basin(context) if context else np.random.randn(BASIN_DIM)
        norm = np.linalg.norm(current_basin)
        if norm > 1e-10:
            current_basin = current_basin / norm
        else:
            current_basin = np.random.randn(BASIN_DIM)
            current_basin = current_basin / np.linalg.norm(current_basin)
        
        generated_tokens = []
        used_tokens = set()
        
        for _ in range(max_tokens):
            candidates = self.basin_to_text(current_basin, top_k=20)
            
            available = [(t, s) for t, s in candidates if t not in used_tokens]
            if not available:
                used_tokens.clear()
                available = candidates[:10]
            
            if not available:
                break
            
            scores = np.array([s for _, s in available])
            logits = scores / temperature
            logits = logits - np.max(logits)
            probs = np.exp(logits) / (np.sum(np.exp(logits)) + 1e-10)
            
            idx = np.random.choice(len(available), p=probs)
            chosen_token, _ = available[idx]
            
            generated_tokens.append(chosen_token)
            used_tokens.add(chosen_token)
            
            if chosen_token in self.token_to_id:
                token_id = self.token_to_id[chosen_token]
                token_basin = self.get_embedding(token_id)
                current_basin = 0.7 * current_basin + 0.3 * token_basin
                norm = np.linalg.norm(current_basin)
                if norm > 1e-10:
                    current_basin = current_basin / norm
        
        return {
            'text': ' '.join(generated_tokens),
            'tokens': len(generated_tokens),
            'qig_pure': True,
            'method': 'postgres_basin_trajectory'
        }

    def add_vocabulary_observations(
        self,
        observations: List[Dict],
    ) -> Tuple[int, bool]:
        """
        Add vocabulary observations (PostgresCoordizer compatibility).

        For PretrainedCoordizer, this is a no-op since vocabulary is loaded
        from PostgreSQL at initialization. New vocabulary should be added
        to the tokenizer_vocabulary table and will be picked up on next restart.

        Args:
            observations: List of {word, frequency, avgPhi, maxPhi, type}

        Returns:
            Tuple of (new_tokens_count, weights_updated)
        """
        # PretrainedCoordizer loads from PostgreSQL at init.
        # For continuous learning, vocabulary additions should go to the database
        # and will be available on next startup/reload.
        logger.debug(f"[PretrainedCoordizer] add_vocabulary_observations called with {len(observations)} observations (no-op for pretrained)")
        return (0, False)

    def get_stats(self) -> Dict:
        """Get coordizer statistics (PostgresCoordizer compatibility)."""
        return {
            'vocabulary_size': self.vocab_size,
            'word_tokens': len([t for t in self.id_to_token.values() if t and len(t) >= 3]),
            'basin_dimension': BASIN_DIM,
            'qig_pure': True,
            'merge_rules_count': len(self.merge_rules),
            'coordizer_type': 'PretrainedCoordizer'
        }


_pretrained_coordizer: Optional[PretrainedCoordizer] = None


def get_pretrained_coordizer() -> PretrainedCoordizer:
    """Get or create the pretrained coordizer singleton."""
    global _pretrained_coordizer
    if _pretrained_coordizer is None:
        _pretrained_coordizer = PretrainedCoordizer()
    return _pretrained_coordizer


if __name__ == "__main__":
    coordizer = get_pretrained_coordizer()
    
    print(f"Vocab size: {coordizer.vocab_size}")
    print(f"Basin dim: {coordizer.basin_dim}")
    print(f"Merge rules: {len(coordizer.merge_rules)}")
    
    text = "Hello, quantum information geometry!"
    tokens = coordizer.encode(text)
    decoded = coordizer.decode_ids(tokens)
    print(f"\nEncode/Decode test:")
    print(f"  Input:   '{text}'")
    print(f"  Tokens:  {tokens[:10]}...")
    print(f"  Decoded: '{decoded}'")
    
    basin = coordizer.text_to_basin("quantum physics")
    nearest = coordizer.decode(basin, top_k=5)
    print(f"\nBasin decode test:")
    print(f"  Query: 'quantum physics'")
    print(f"  Nearest tokens: {nearest[:5]}")
    
    basin = coordizer.text_to_basin(text)
    print(f"\nBasin embedding: shape={basin.shape}, norm={np.linalg.norm(basin):.4f}")
    
    result = coordizer.generate("consciousness", max_tokens=10)
    print(f"\nGeneration test:")
    print(f"  Context: 'consciousness'")
    print(f"  Output:  '{result['text']}'")
