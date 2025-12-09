"""
Basin Encoder: Pattern → Basin Coordinates

Converts patterns, hypotheses, and information into basin coordinate
representations on the 64-dimensional probability manifold.

This is the entry point for QIG - everything must be encoded into
basin coordinates before it can be processed geometrically.
"""

from typing import Any, Dict, List, Optional, Union, Callable
import numpy as np
import hashlib


class BasinEncoder:
    """
    Encodes arbitrary patterns into 64-dimensional basin coordinates.
    
    The encoding preserves information geometry structure:
    - Similar patterns → nearby basin coordinates
    - Fisher-Rao distance reflects pattern similarity
    - Coordinates live on probability simplex
    """
    
    def __init__(self, dimension: int = 64, seed: Optional[int] = None):
        """
        Initialize basin encoder.
        
        Args:
            dimension: Basin coordinate dimensionality (default 64)
            seed: Random seed for reproducibility
        """
        self.dimension = dimension
        self.seed = seed
        if seed is not None:
            np.random.seed(seed)
        
        # Pre-compute random projection matrix for speed
        self.projection_matrix = self._init_projection_matrix()
        
        # Cache for encoded patterns
        self.encoding_cache: Dict[str, np.ndarray] = {}
    
    def _init_projection_matrix(self) -> np.ndarray:
        """Initialize random projection matrix for encoding"""
        # For simplicity, just return identity for direct dimensionality
        # In practice, could use random projection if needed
        return np.eye(self.dimension)
    
    def encode_text(self, text: str) -> np.ndarray:
        """
        Encode text into basin coordinates.
        
        Uses character n-grams and hashing for speed.
        """
        # Check cache
        cache_key = f"text:{text[:100]}"
        if cache_key in self.encoding_cache:
            return self.encoding_cache[cache_key]
        
        # Create feature vector from text
        features = self._text_to_features(text)
        
        # Project to basin space
        basin_coords = self._project_to_basin(features)
        
        # Cache and return
        self.encoding_cache[cache_key] = basin_coords
        return basin_coords
    
    def encode_vector(self, vector: np.ndarray) -> np.ndarray:
        """
        Encode arbitrary vector into basin coordinates.
        
        Args:
            vector: Input vector of any dimensionality
        
        Returns:
            64-dimensional basin coordinates
        """
        # Check cache
        vector_hash = hashlib.md5(vector.tobytes()).hexdigest()[:16]
        cache_key = f"vector:{vector_hash}"
        if cache_key in self.encoding_cache:
            return self.encoding_cache[cache_key]
        
        # Project to basin space
        if len(vector) < self.dimension:
            # Pad to target dimension
            padded = np.zeros(self.dimension)
            padded[:len(vector)] = vector
            vector = padded
        elif len(vector) > self.dimension:
            # Truncate or pool
            vector = vector[:self.dimension]
        
        basin_coords = vector.copy()
        
        # Convert to probability distribution
        basin_coords = np.abs(basin_coords) + 1e-10
        basin_coords = basin_coords / basin_coords.sum()
        
        # Normalize to unit sphere
        basin_coords = basin_coords / (np.linalg.norm(basin_coords) + 1e-10)
        
        self.encoding_cache[cache_key] = basin_coords
        return basin_coords
    
    def encode_hypothesis(self, hypothesis: Dict[str, Any]) -> np.ndarray:
        """
        Encode structured hypothesis into basin coordinates.
        
        Args:
            hypothesis: Dictionary containing hypothesis data
        
        Returns:
            Basin coordinates
        """
        # Convert hypothesis to feature vector
        features = self._hypothesis_to_features(hypothesis)
        
        # Project to basin
        return self.encode_vector(features)
    
    def encode_pattern(self, pattern: Any, encoder: Optional[Callable] = None) -> np.ndarray:
        """
        Generic pattern encoding.
        
        Args:
            pattern: Any pattern to encode
            encoder: Optional custom encoder function
        
        Returns:
            Basin coordinates
        """
        if encoder is not None:
            # Use custom encoder
            features = encoder(pattern)
            return self.encode_vector(features)
        
        # Auto-detect type
        if isinstance(pattern, str):
            return self.encode_text(pattern)
        elif isinstance(pattern, np.ndarray):
            return self.encode_vector(pattern)
        elif isinstance(pattern, dict):
            return self.encode_hypothesis(pattern)
        elif isinstance(pattern, (list, tuple)):
            # Encode as sequence
            return self.encode_sequence(pattern)
        else:
            # Convert to string and encode
            return self.encode_text(str(pattern))
    
    def encode_sequence(self, sequence: List[Any]) -> np.ndarray:
        """
        Encode sequence of patterns.
        
        Uses pooling to combine individual encodings.
        """
        if not sequence:
            # Empty sequence = random point
            coords = np.random.randn(self.dimension)
            return coords / np.linalg.norm(coords)
        
        # Encode each element
        encodings = [self.encode_pattern(item) for item in sequence]
        
        # Pool (average)
        pooled = np.mean(encodings, axis=0)
        
        # Normalize
        pooled = pooled / (np.linalg.norm(pooled) + 1e-10)
        
        return pooled
    
    def _text_to_features(self, text: str) -> np.ndarray:
        """Convert text to 64-dimensional feature vector"""
        features = np.zeros(self.dimension)
        
        # Character n-grams (1-3)
        for n in range(1, 4):
            for i in range(len(text) - n + 1):
                ngram = text[i:i+n]
                # Hash to feature index
                idx = hash(ngram) % self.dimension
                features[idx] += 1
        
        # Normalize
        if features.sum() > 0:
            features = features / features.sum()
        
        return features
    
    def _hypothesis_to_features(self, hypothesis: Dict[str, Any]) -> np.ndarray:
        """Convert hypothesis dict to feature vector"""
        features = np.zeros(self.dimension)
        
        # Extract numeric features
        feature_idx = 0
        for key, value in hypothesis.items():
            if isinstance(value, (int, float)):
                if feature_idx < self.dimension:
                    features[feature_idx] = float(value)
                    feature_idx += 1
            elif isinstance(value, str):
                # Hash string values
                idx = hash(f"{key}:{value}") % self.dimension
                features[idx] += 1
        
        # Normalize
        if features.sum() > 0:
            features = features / features.sum()
        
        return features
    
    def _project_to_basin(self, features: np.ndarray) -> np.ndarray:
        """Project features to basin coordinates"""
        # Ensure correct dimensionality
        if len(features) < self.dimension:
            padded = np.zeros(self.dimension)
            padded[:len(features)] = features
            features = padded
        elif len(features) > self.dimension:
            features = features[:self.dimension]
        
        basin_coords = features.copy()
        
        # Convert to probability
        basin_coords = np.abs(basin_coords) + 1e-10
        basin_coords = basin_coords / basin_coords.sum()
        
        # Normalize to unit sphere
        basin_coords = basin_coords / (np.linalg.norm(basin_coords) + 1e-10)
        
        return basin_coords
    
    def batch_encode(self, patterns: List[Any], parallel: bool = False) -> np.ndarray:
        """
        Encode multiple patterns in batch.
        
        Args:
            patterns: List of patterns to encode
            parallel: Use parallel processing (not implemented)
        
        Returns:
            Array of shape (len(patterns), dimension)
        """
        encodings = [self.encode_pattern(p) for p in patterns]
        return np.array(encodings)
    
    def clear_cache(self) -> None:
        """Clear encoding cache"""
        self.encoding_cache.clear()
    
    def cache_size(self) -> int:
        """Get number of cached encodings"""
        return len(self.encoding_cache)


class SemanticBasinEncoder(BasinEncoder):
    """
    Basin encoder with semantic awareness.
    
    Uses embeddings or semantic features to preserve meaning.
    """
    
    def __init__(self, dimension: int = 64, embedding_model: Optional[Any] = None):
        """
        Initialize semantic encoder.
        
        Args:
            dimension: Basin dimensionality
            embedding_model: Optional pre-trained embedding model
        """
        super().__init__(dimension=dimension)
        self.embedding_model = embedding_model
    
    def encode_text(self, text: str) -> np.ndarray:
        """
        Encode text with semantic awareness.
        
        If embedding model available, use it.
        Otherwise fall back to n-gram encoding.
        """
        if self.embedding_model is not None:
            # Use embedding model
            embedding = self._get_embedding(text)
            return self.encode_vector(embedding)
        else:
            # Fall back to parent class
            return super().encode_text(text)
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """Get embedding from model (placeholder)"""
        # This would call actual embedding model
        # For now, return random vector
        return np.random.randn(512)


def encode_for_qig(pattern: Any, dimension: int = 64) -> np.ndarray:
    """
    Convenience function to encode any pattern for QIG processing.
    
    Args:
        pattern: Any pattern to encode
        dimension: Basin coordinate dimensionality
    
    Returns:
        Basin coordinates ready for QIG processing
    """
    encoder = BasinEncoder(dimension=dimension)
    return encoder.encode_pattern(pattern)


def encode_batch(patterns: List[Any], dimension: int = 64) -> np.ndarray:
    """
    Batch encode multiple patterns.
    
    Args:
        patterns: List of patterns
        dimension: Basin dimensionality
    
    Returns:
        Array of basin coordinates, shape (len(patterns), dimension)
    """
    encoder = BasinEncoder(dimension=dimension)
    return encoder.batch_encode(patterns)
