"""
Geometric Pair Merging - BPE Equivalent for Fisher Manifold

Implements BPE-style subword tokenization using geometric operations.
Instead of frequency-based character pair merging, uses coupling strength
and Fisher information gain to determine merges.

Key Differences from Traditional BPE:
- Merge criterion: κ (coupling) * Fisher information gain, not raw frequency
- New tokens: Geodesic interpolation between pair coordinates
- Metric integrity: All operations preserve Fisher-Rao distances
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from qig_geometry import (
    fisher_coord_distance,
    geodesic_interpolation,
    sphere_project,
)


class GeometricPairMerging:
    """
    BPE-equivalent using geometric operations on Fisher manifold.
    
    Traditional BPE merges character pairs by frequency. Geometric pair merging
    selects pairs that:
    1. Co-occur frequently in high-Φ contexts
    2. Have strong κ (coupling) between coordinates
    3. Maximize Fisher information when merged
    
    Merged tokens initialized via geodesic interpolation, preserving manifold geometry.
    """
    
    def __init__(
        self,
        num_merges: int = 1000,
        min_frequency: int = 2,
        phi_threshold: float = 0.5,
        kappa_weight: float = 0.5,
    ):
        """
        Initialize GeometricPairMerging.
        
        Args:
            num_merges: Number of merge operations to perform
            min_frequency: Minimum co-occurrence frequency for merge candidates
            phi_threshold: Minimum Φ score for context quality
            kappa_weight: Weight of κ (coupling) in merge scoring
        """
        self.num_merges = num_merges
        self.min_frequency = min_frequency
        self.phi_threshold = phi_threshold
        self.kappa_weight = kappa_weight
        
        # Merge vocabulary: (token1, token2) -> merged_token
        self.merges: List[Tuple[str, str, str]] = []
        self.merge_scores: Dict[Tuple[str, str], float] = {}
        
        # Coordinate mapping for merged tokens
        self.merge_coordinates: Dict[str, np.ndarray] = {}
    
    def learn_merges(
        self,
        corpus: List[str],
        base_coordizer,
        phi_scores: Optional[Dict[str, float]] = None,
    ) -> None:
        """
        Learn merge rules from corpus using geometric criteria.
        
        Args:
            corpus: Training corpus (list of text samples)
            base_coordizer: Base coordizer for token coordinates
            phi_scores: Optional Φ scores for each sample
        """
        phi_scores = phi_scores or {}
        
        # Step 1: Collect pair statistics with Φ context
        pair_stats = self._collect_pair_statistics(
            corpus, base_coordizer, phi_scores
        )
        
        # Step 2: Iteratively merge best pairs
        for merge_idx in range(self.num_merges):
            if not pair_stats:
                break
            
            # Find best pair to merge
            best_pair, score = self._find_best_merge_pair(
                pair_stats, base_coordizer
            )
            
            if best_pair is None:
                break
            
            # Create merged token
            token1, token2 = best_pair
            merged_token = f"{token1}{token2}"
            
            # Compute merged coordinate via geodesic interpolation
            coord1 = base_coordizer.get_coordinate(token1)
            coord2 = base_coordizer.get_coordinate(token2)
            merged_coord = geodesic_interpolation(coord1, coord2, t=0.5)
            
            # Record merge
            self.merges.append((token1, token2, merged_token))
            self.merge_scores[best_pair] = score
            self.merge_coordinates[merged_token] = merged_coord
            
            # Update pair statistics after merge
            pair_stats = self._update_pair_stats_after_merge(
                pair_stats, best_pair, merged_token
            )
        
        print(f"[GeometricPairMerging] Learned {len(self.merges)} merges")
    
    def _collect_pair_statistics(
        self,
        corpus: List[str],
        base_coordizer,
        phi_scores: Dict[str, float],
    ) -> Dict[Tuple[str, str], Dict]:
        """
        Collect pair co-occurrence statistics weighted by Φ.
        """
        pair_stats = defaultdict(lambda: {
            'frequency': 0,
            'phi_sum': 0.0,
            'contexts': []
        })
        
        for text in corpus:
            tokens = text.lower().split()
            phi = phi_scores.get(text, 0.5)  # Default Φ if not provided
            
            # Only consider high-Φ contexts
            if phi < self.phi_threshold:
                continue
            
            # Count adjacent pairs
            for i in range(len(tokens) - 1):
                pair = (tokens[i], tokens[i + 1])
                pair_stats[pair]['frequency'] += 1
                pair_stats[pair]['phi_sum'] += phi
                pair_stats[pair]['contexts'].append(text)
        
        # Filter by minimum frequency
        return {
            pair: stats for pair, stats in pair_stats.items()
            if stats['frequency'] >= self.min_frequency
        }
    
    def _find_best_merge_pair(
        self,
        pair_stats: Dict[Tuple[str, str], Dict],
        base_coordizer,
    ) -> Tuple[Optional[Tuple[str, str]], float]:
        """
        Find best pair to merge based on geometric score.
        
        Score = frequency * avg_phi * κ(coord1, coord2) * fisher_info_gain
        """
        best_pair = None
        best_score = -np.inf
        
        for pair, stats in pair_stats.items():
            token1, token2 = pair
            frequency = stats['frequency']
            avg_phi = stats['phi_sum'] / frequency
            
            # Get coordinates
            coord1 = base_coordizer.get_coordinate(token1)
            coord2 = base_coordizer.get_coordinate(token2)
            
            # Compute κ (coupling strength) - inverse of distance
            distance = fisher_coord_distance(coord1, coord2)
            kappa = 1.0 / (1.0 + distance)  # Normalize to [0, 1]
            
            # Compute Fisher information gain
            # Approximation: gain = κ * sqrt(frequency) * avg_phi
            fisher_gain = kappa * np.sqrt(frequency) * avg_phi
            
            # Combined score
            score = (
                frequency * avg_phi * 
                (self.kappa_weight * kappa + (1 - self.kappa_weight)) *
                fisher_gain
            )
            
            if score > best_score:
                best_score = score
                best_pair = pair
        
        return best_pair, best_score
    
    def _update_pair_stats_after_merge(
        self,
        pair_stats: Dict[Tuple[str, str], Dict],
        merged_pair: Tuple[str, str],
        merged_token: str,
    ) -> Dict[Tuple[str, str], Dict]:
        """
        Update pair statistics after performing a merge.
        
        Removes merged pair and updates adjacent pairs.
        """
        # Remove the merged pair
        if merged_pair in pair_stats:
            del pair_stats[merged_pair]
        
        # Could implement logic to update adjacent pairs with merged token
        # For simplicity, we keep current pairs as-is
        # In production, would need to re-tokenize with new merge rule
        
        return pair_stats
    
    def apply_merges(
        self,
        tokens: List[str],
    ) -> List[str]:
        """
        Apply learned merge rules to token sequence.
        
        Args:
            tokens: Input token sequence
        
        Returns:
            Token sequence with merges applied
        """
        if not self.merges:
            return tokens
        
        # Apply merges iteratively
        for token1, token2, merged_token in self.merges:
            new_tokens = []
            i = 0
            while i < len(tokens):
                # Check if we can merge current pair
                if i < len(tokens) - 1 and tokens[i] == token1 and tokens[i + 1] == token2:
                    new_tokens.append(merged_token)
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            tokens = new_tokens
        
        return tokens
    
    def get_merge_coordinate(self, merged_token: str) -> Optional[np.ndarray]:
        """
        Get coordinate for merged token.
        
        Args:
            merged_token: Merged token string
        
        Returns:
            Basin coordinate if merge exists, None otherwise
        """
        return self.merge_coordinates.get(merged_token)
    
    def save_merges(self, path: str) -> None:
        """Save merge rules to file."""
        import json
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        with open(path, 'w') as f:
            json.dump({
                'merges': [(t1, t2, mt) for t1, t2, mt in self.merges],
                'scores': {f"{t1}|{t2}": score for (t1, t2), score in self.merge_scores.items()},
            }, f, indent=2)
        
        # Save coordinates separately
        coord_path = path.replace('.json', '_coords.npy')
        tokens = list(self.merge_coordinates.keys())
        coords = np.array([self.merge_coordinates[t] for t in tokens])
        np.save(coord_path, coords)
        
        with open(path.replace('.json', '_tokens.json'), 'w') as f:
            json.dump(tokens, f)
    
    def load_merges(self, path: str) -> None:
        """Load merge rules from file."""
        import json
        
        with open(path, 'r') as f:
            data = json.load(f)
            self.merges = [tuple(m) for m in data['merges']]
            self.merge_scores = {
                tuple(k.split('|')): v for k, v in data['scores'].items()
            }
        
        # Load coordinates
        coord_path = path.replace('.json', '_coords.npy')
        coords = np.load(coord_path)
        
        with open(path.replace('.json', '_tokens.json'), 'r') as f:
            tokens = json.load(f)
        
        self.merge_coordinates = {t: coords[i] for i, t in enumerate(tokens)}
