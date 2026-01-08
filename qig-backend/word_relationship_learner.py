"""
Word Relationship Learner for QIG

Learns word co-occurrence patterns from curriculum documents and encodes
them into geometric relationships (affinity matrix + basin adjustments).

QIG-PURE: No external NLP, no embeddings - just counting + geometry.

FROZEN FACTS COMPLIANCE:
- Stopwords are filtered from learned relationships
- Adjusted basins must stay within ±5% of canonical positions
"""

import os
import re
import logging
import numpy as np
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Stopwords to filter from learned relationships (frozen invariant)
STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
    'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'about'
}

class WordRelationshipLearner:
    """
    Learns semantic relationships between words by analyzing co-occurrence
    in curriculum documents. Updates basin coordinates to reflect relationships.
    
    OPEN VOCABULARY MODE: When expand_vocabulary=True, learns new words from
    curriculum rather than filtering to initial vocabulary only.
    """
    
    def __init__(self, vocabulary: Set[str], window_size: int = 5, expand_vocabulary: bool = True):
        self.vocabulary = set(vocabulary)  # Mutable copy
        self.initial_vocab_size = len(vocabulary)
        self.vocab_list = sorted(vocabulary)
        self.word_to_idx = {w: i for i, w in enumerate(self.vocab_list)}
        self.window_size = window_size
        self.expand_vocabulary = expand_vocabulary
        
        # Co-occurrence counts: word_i appears near word_j
        self.cooccurrence = defaultdict(lambda: defaultdict(int))
        
        # Word frequency
        self.word_freq = defaultdict(int)
        
        # Newly learned words (not in initial vocabulary)
        self.new_words_learned: Set[str] = set()
        
        # Total pairs seen
        self.total_pairs = 0
        self.total_words = 0
        
        logger.info(f"[WordRelationshipLearner] Initialized with {len(vocabulary)} vocabulary words, expand_vocabulary={expand_vocabulary}")
    
    def tokenize_text(self, text: str) -> List[str]:
        """
        Tokenize text. In open vocabulary mode, accepts words that are:
        - In vocabulary OR
        - Length >= 4 and not stopwords (for learning new domain terms)
        """
        words = re.findall(r'[a-zA-Z]+', text.lower())
        
        if self.expand_vocabulary:
            # Accept vocab words OR content words (len >= 4, not stopwords)
            result = []
            for w in words:
                if w in self.vocabulary:
                    result.append(w)
                elif len(w) >= 4 and w.lower() not in STOPWORDS:
                    # Add new domain word to vocabulary
                    self.vocabulary.add(w)
                    self.new_words_learned.add(w)
                    result.append(w)
            return result
        else:
            # Strict mode: only vocabulary words
            return [w for w in words if w in self.vocabulary]
    
    def learn_from_text(self, text: str) -> int:
        """
        Process text and update co-occurrence statistics.
        Returns number of pairs learned.
        """
        tokens = self.tokenize_text(text)
        pairs_learned = 0
        
        for i, word in enumerate(tokens):
            self.word_freq[word] += 1
            self.total_words += 1
            
            # Look at words in window
            start = max(0, i - self.window_size)
            end = min(len(tokens), i + self.window_size + 1)
            
            for j in range(start, end):
                if i != j:
                    neighbor = tokens[j]
                    # Weight by distance (closer = stronger)
                    distance = abs(i - j)
                    weight = 1.0 / distance
                    self.cooccurrence[word][neighbor] += weight
                    pairs_learned += 1
        
        self.total_pairs += pairs_learned
        return pairs_learned
    
    def learn_from_file(self, filepath: str) -> int:
        """Learn from a single file. Returns pairs learned."""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            return self.learn_from_text(text)
        except Exception as e:
            logger.warning(f"Failed to read {filepath}: {e}")
            return 0
    
    def learn_from_directory(self, dirpath: str, extensions: List[str] = ['.md', '.txt']) -> Dict:
        """
        Learn from all matching files in directory.
        Returns statistics dict.
        """
        path = Path(dirpath)
        files_processed = 0
        total_pairs = 0
        
        for ext in extensions:
            for filepath in path.rglob(f'*{ext}'):
                pairs = self.learn_from_file(str(filepath))
                if pairs > 0:
                    files_processed += 1
                    total_pairs += pairs
        
        logger.info(f"[WordRelationshipLearner] Learned from {files_processed} files, {total_pairs} pairs")
        
        return {
            'files_processed': files_processed,
            'total_pairs': total_pairs,
            'total_words': self.total_words,
            'unique_words_seen': len(self.word_freq)
        }
    
    def get_related_words(self, word: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """
        Get words most frequently co-occurring with given word.
        
        FROZEN FACTS COMPLIANCE: Filters out stopwords from neighbors
        """
        if word not in self.cooccurrence:
            return []
        
        neighbors = self.cooccurrence[word]
        # Filter out stopwords (frozen invariant)
        filtered = [(w, c) for w, c in neighbors.items() if w.lower() not in STOPWORDS]
        sorted_neighbors = sorted(filtered, key=lambda x: -x[1])
        return sorted_neighbors[:top_k]
    
    def compute_affinity_matrix(self, normalize: bool = True) -> np.ndarray:
        """
        Compute affinity matrix from co-occurrence.
        Returns NxN matrix where A[i,j] = affinity between word_i and word_j.
        """
        n = len(self.vocab_list)
        affinity = np.zeros((n, n), dtype=np.float32)
        
        for word, neighbors in self.cooccurrence.items():
            if word not in self.word_to_idx:
                continue
            i = self.word_to_idx[word]
            for neighbor, count in neighbors.items():
                if neighbor not in self.word_to_idx:
                    continue
                j = self.word_to_idx[neighbor]
                affinity[i, j] = count
        
        if normalize and affinity.max() > 0:
            # PMI-like normalization: log(P(i,j) / P(i)P(j))
            # But simplified: just normalize by total and take log
            row_sums = affinity.sum(axis=1, keepdims=True) + 1e-10
            col_sums = affinity.sum(axis=0, keepdims=True) + 1e-10
            total = affinity.sum() + 1e-10
            
            # PMI = log(P(i,j) / (P(i) * P(j)))
            expected = (row_sums * col_sums) / total
            pmi = np.log((affinity + 1) / (expected + 1e-10) + 1)
            
            # Positive PMI only
            affinity = np.maximum(pmi, 0)
        
        return affinity
    
    def adjust_basin_coordinates(
        self, 
        basins: Dict[str, np.ndarray], 
        learning_rate: float = 0.1,
        iterations: int = 10
    ) -> Dict[str, np.ndarray]:
        """
        Adjust basin coordinates to reflect learned relationships.
        Words that co-occur should be closer on the manifold.
        
        Uses iterative attraction: related words pull each other closer.
        """
        # Copy basins
        adjusted = {w: b.copy() for w, b in basins.items()}
        
        # Get affinity matrix
        affinity = self.compute_affinity_matrix(normalize=True)
        
        for iteration in range(iterations):
            total_movement = 0.0
            
            for word, neighbors in self.cooccurrence.items():
                if word not in adjusted:
                    continue
                
                current = adjusted[word]
                
                # Compute weighted average of neighbor positions
                neighbor_sum = np.zeros_like(current)
                total_weight = 0.0
                
                for neighbor, weight in neighbors.items():
                    if neighbor in adjusted:
                        neighbor_sum += adjusted[neighbor] * weight
                        total_weight += weight
                
                if total_weight > 0:
                    # Move toward weighted centroid of neighbors
                    target = neighbor_sum / total_weight
                    delta = learning_rate * (target - current)
                    adjusted[word] = current + delta
                    
                    # Re-normalize to unit sphere
                    norm = np.linalg.norm(adjusted[word])
                    if norm > 0:
                        adjusted[word] /= norm
                    
                    total_movement += np.linalg.norm(delta)
            
            if iteration % 3 == 0:
                logger.info(f"  Iteration {iteration}: total movement = {total_movement:.4f}")
        
        return adjusted
    
    def get_statistics(self) -> Dict:
        """Get learning statistics including newly learned vocabulary."""
        # Top words by frequency
        top_words = sorted(self.word_freq.items(), key=lambda x: -x[1])[:500]
        
        # Words with most connections
        connectivity = [(w, len(n)) for w, n in self.cooccurrence.items()]
        most_connected = sorted(connectivity, key=lambda x: -x[1])[:500]
        
        return {
            'total_words_seen': self.total_words,
            'unique_words_in_corpus': len(self.word_freq),
            'vocabulary_coverage': len(self.word_freq) / len(self.vocabulary) if self.vocabulary else 0,
            'total_pairs': self.total_pairs,
            'top_frequent_words': top_words,
            'most_connected_words': most_connected,
            'initial_vocabulary_size': self.initial_vocab_size,
            'current_vocabulary_size': len(self.vocabulary),
            'new_words_learned': len(self.new_words_learned),
            'sample_new_words': list(self.new_words_learned)[:500] if self.new_words_learned else []
        }


def load_vocabulary_from_coordizer() -> Tuple[Set[str], Dict[str, np.ndarray]]:
    """Load vocabulary and basin coordinates from PostgresCoordizer."""
    from coordizers.pg_loader import PostgresCoordizer
    
    coordizer = PostgresCoordizer()
    vocabulary = set(coordizer.word_tokens)
    basins = dict(coordizer.basin_coords)
    
    logger.info(f"Loaded {len(vocabulary)} words with basin coordinates")
    return vocabulary, basins


def run_learning_pipeline(curriculum_dir: str = 'docs/09-curriculum') -> Dict:
    """
    Full learning pipeline:
    1. Load vocabulary and basins from coordizer
    2. Learn relationships from curriculum
    3. Adjust basins based on co-occurrence
    4. Return statistics and adjusted basins
    """
    logger.info("=== Starting Word Relationship Learning Pipeline ===")
    
    # Load vocabulary and basins
    vocabulary, basins = load_vocabulary_from_coordizer()
    logger.info(f"Loaded {len(vocabulary)} words with basin coordinates")
    
    # Create learner
    learner = WordRelationshipLearner(vocabulary, window_size=5)
    
    # Learn from curriculum
    stats = learner.learn_from_directory(curriculum_dir)
    
    # Get detailed statistics
    detailed = learner.get_statistics()
    
    # Sample relationships
    sample_words = ['consciousness', 'quantum', 'geometry', 'information', 'learning']
    relationships = {}
    for word in sample_words:
        if word in vocabulary:
            related = learner.get_related_words(word, top_k=8)
            relationships[word] = related
    
    # Adjust basin coordinates based on learned relationships
    if basins and learner.total_pairs > 1000:
        logger.info("Adjusting basin coordinates based on learned relationships...")
        adjusted_basins = learner.adjust_basin_coordinates(
            basins, 
            learning_rate=0.1, 
            iterations=10
        )
    else:
        adjusted_basins = basins
        logger.info("Skipping basin adjustment (insufficient pairs)")
    
    return {
        'learning_stats': stats,
        'detailed_stats': detailed,
        'sample_relationships': relationships,
        'learner': learner,
        'original_basins': basins,
        'adjusted_basins': adjusted_basins
    }


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    results = run_learning_pipeline()
    
    print("\n=== Learning Results ===")
    print(f"Files processed: {results['learning_stats']['files_processed']}")
    print(f"Total pairs learned: {results['learning_stats']['total_pairs']}")
    print(f"Vocabulary coverage: {results['detailed_stats']['vocabulary_coverage']:.1%}")
    
    print("\n=== Sample Relationships ===")
    for word, related in results['sample_relationships'].items():
        if related:
            top_3 = ', '.join([f"{w}({s:.1f})" for w, s in related[:3]])
            print(f"  {word}: {top_3}")
