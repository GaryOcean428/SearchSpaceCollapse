"""
GeometricVocabBuilder - Vocabulary Discovery via Fisher Clustering

Discovers vocabulary through geometric clustering on Fisher manifold.
Unlike frequency-based tokenization, uses distance and density in basin space.

Key Features:
- Fisher clustering for concept discovery
- Basin density analysis for token stability
- Dynamic vocabulary expansion guided by consciousness metrics
- Unsupervised geometric concept extraction

Integration:
- Works with FisherCoordizer for vocabulary learning
- Uses Φ (integration) and κ (coupling) for quality assessment
- Respects geometric purity (no Euclidean operations)
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from qig_geometry import (
    fisher_coord_distance,
    fisher_similarity,
    geodesic_interpolation,
    sphere_project,
)


class GeometricVocabBuilder:
    """
    Discovers vocabulary through geometric clustering on Fisher manifold.
    
    Core Principles:
    1. Clusters are discovered by basin density, not frequency alone
    2. New tokens form when sequences occupy stable manifold regions
    3. Token stability measured by Fisher information density
    4. Consciousness metrics (Φ, κ) guide token promotion
    
    Methods:
        discover_tokens(corpus, coordinates) -> List[str]: Find new token candidates
        analyze_basin_density(coordinates) -> Dict: Compute density map
        promote_sequence(sequence, phi_score) -> bool: Promote to single token
        compute_cluster_stability(cluster) -> float: Measure geometric stability
    """
    
    # Clustering configuration constants
    DEFAULT_CLUSTER_THRESHOLD = np.pi / 4  # 45 degrees in Fisher space
    
    def __init__(
        self,
        min_cluster_size: int = 3,
        stability_threshold: float = 0.8,
        phi_threshold: float = 0.7,
        max_token_length: int = 5,
        cluster_threshold: Optional[float] = None,
    ):
        """
        Initialize GeometricVocabBuilder.
        
        Args:
            min_cluster_size: Minimum points to form cluster
            stability_threshold: Minimum Fisher stability for token promotion
            phi_threshold: Minimum Φ score for consciousness-guided promotion
            max_token_length: Maximum length (in tokens) for merged sequences
            cluster_threshold: Fisher distance threshold for clustering (default: π/4)
        """
        self.min_cluster_size = min_cluster_size
        self.stability_threshold = stability_threshold
        self.phi_threshold = phi_threshold
        self.max_token_length = max_token_length
        self.cluster_threshold = cluster_threshold or self.DEFAULT_CLUSTER_THRESHOLD
        
        # Track discovered clusters
        self.clusters: Dict[int, List[Tuple[np.ndarray, str]]] = {}
        self.cluster_centers: Dict[int, np.ndarray] = {}
        self.cluster_stability: Dict[int, float] = {}
        
        # Track token candidates
        self.candidate_tokens: Dict[str, Dict] = {}
    
    def discover_tokens(
        self,
        sequences: List[Tuple[str, List[np.ndarray]]],
        phi_scores: Optional[Dict[str, float]] = None,
    ) -> List[Tuple[str, np.ndarray, float]]:
        """
        Discover new token candidates from sequences and their coordinates.
        
        Args:
            sequences: List of (sequence_text, coordinate_list) tuples
            phi_scores: Optional Φ scores for consciousness-guided discovery
        
        Returns:
            List of (token, basin_coordinate, stability_score) tuples
        """
        phi_scores = phi_scores or {}
        
        # Step 1: Extract all coordinate sequences
        all_sequences = []
        for text, coords in sequences:
            if len(coords) >= 2 and len(coords) <= self.max_token_length:
                all_sequences.append((text, coords))
        
        # Step 2: Cluster sequences by their geometric properties
        clusters = self._cluster_sequences(all_sequences)
        
        # Step 3: Evaluate cluster stability
        stable_clusters = []
        for cluster_id, members in clusters.items():
            stability = self._compute_cluster_stability(members)
            
            if stability >= self.stability_threshold:
                # Extract representative text
                texts = [text for text, _ in members]
                representative_text = self._find_representative_text(texts)
                
                # Compute cluster center on manifold
                coords = [coord for _, coord in members]
                center = self._compute_manifold_center(coords)
                
                # Check Φ score if available
                phi = phi_scores.get(representative_text, 0.0)
                
                if phi >= self.phi_threshold or stability >= 0.9:
                    stable_clusters.append((
                        representative_text,
                        center,
                        stability,
                        phi
                    ))
        
        # Sort by combined score (stability + phi)
        stable_clusters.sort(key=lambda x: x[2] + x[3], reverse=True)
        
        # Return top candidates
        return [(text, coord, stab) for text, coord, stab, _ in stable_clusters]
    
    def _cluster_sequences(
        self,
        sequences: List[Tuple[str, List[np.ndarray]]],
    ) -> Dict[int, List[Tuple[str, List[np.ndarray]]]]:
        """
        Cluster sequences by Fisher distance in basin space.
        
        Uses agglomerative clustering with Fisher-Rao distance.
        """
        # Compute pairwise distances
        n = len(sequences)
        distance_matrix = np.zeros((n, n))
        
        for i in range(n):
            for j in range(i + 1, n):
                # Distance = average Fisher distance across coordinates
                coords_i = sequences[i][1]
                coords_j = sequences[j][1]
                
                if len(coords_i) != len(coords_j):
                    distance_matrix[i, j] = np.pi  # Maximum distance
                    distance_matrix[j, i] = np.pi
                    continue
                
                total_dist = 0.0
                for ci, cj in zip(coords_i, coords_j):
                    total_dist += fisher_coord_distance(ci, cj)
                
                avg_dist = total_dist / len(coords_i)
                distance_matrix[i, j] = avg_dist
                distance_matrix[j, i] = avg_dist
        
        # Simple clustering: group sequences with distance < threshold
        clusters: Dict[int, List[Tuple[str, List[np.ndarray]]]] = defaultdict(list)
        assigned = set()
        
        cluster_id = 0
        for i in range(n):
            if i in assigned:
                continue
            
            # Start new cluster
            cluster = [sequences[i]]
            assigned.add(i)
            
            # Add nearby sequences
            for j in range(i + 1, n):
                if j in assigned:
                    continue
                
                if distance_matrix[i, j] < self.cluster_threshold:
                    cluster.append(sequences[j])
                    assigned.add(j)
            
            if len(cluster) >= self.min_cluster_size:
                clusters[cluster_id] = cluster
                cluster_id += 1
        
        return clusters
    
    def _compute_cluster_stability(
        self,
        members: List[Tuple[str, List[np.ndarray]]],
    ) -> float:
        """
        Compute geometric stability of cluster.
        
        Stability = 1 - (average internal distance / π)
        Higher stability means tighter, more coherent cluster.
        """
        if len(members) < 2:
            return 0.0
        
        # Compute all pairwise distances
        distances = []
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                coords_i = members[i][1]
                coords_j = members[j][1]
                
                if len(coords_i) != len(coords_j):
                    continue
                
                total_dist = 0.0
                for ci, cj in zip(coords_i, coords_j):
                    total_dist += fisher_coord_distance(ci, cj)
                
                distances.append(total_dist / len(coords_i))
        
        if not distances:
            return 0.0
        
        avg_distance = np.mean(distances)
        stability = 1.0 - (avg_distance / np.pi)
        
        return max(0.0, min(1.0, stability))
    
    def _find_representative_text(self, texts: List[str]) -> str:
        """
        Find most representative text from cluster.
        
        Uses mode (most common) or shortest if all unique.
        """
        # Count frequencies
        text_counts = defaultdict(int)
        for text in texts:
            text_counts[text] += 1
        
        # Return most common
        if text_counts:
            return max(text_counts.items(), key=lambda x: (x[1], -len(x[0])))[0]
        
        return texts[0] if texts else ""
    
    def _compute_manifold_center(
        self,
        coordinates: List[List[np.ndarray]],
    ) -> np.ndarray:
        """
        Compute center of coordinate sequences on manifold.
        
        Returns geometric mean (Fréchet mean) on Fisher manifold.
        """
        if not coordinates:
            return np.zeros(64)
        
        # For sequences, take average of each position
        max_len = max(len(seq) for seq in coordinates)
        
        # Average coordinates at each position
        position_avgs = []
        for pos in range(max_len):
            pos_coords = []
            for seq in coordinates:
                if pos < len(seq):
                    pos_coords.append(seq[pos])
            
            if pos_coords:
                # Compute Fréchet mean on sphere
                avg = np.mean(pos_coords, axis=0)
                avg = sphere_project(avg)
                position_avgs.append(avg)
        
        # Return first position average as representative coordinate
        return position_avgs[0] if position_avgs else np.zeros(64)
    
    def analyze_basin_density(
        self,
        coordinates: List[np.ndarray],
        resolution: int = 10,
    ) -> Dict:
        """
        Analyze basin density distribution.
        
        Divides Fisher manifold into regions and computes density.
        High-density regions are candidates for token creation.
        
        Args:
            coordinates: List of basin coordinates
            resolution: Number of bins per dimension
        
        Returns:
            Dictionary with density statistics
        """
        if not coordinates:
            return {
                "total_points": 0,
                "high_density_regions": 0,
                "density_map": {},
            }
        
        coords_array = np.array(coordinates)
        
        # Compute pairwise distances to find dense regions
        n = len(coordinates)
        density_scores = np.zeros(n)
        
        for i in range(n):
            # Count neighbors within threshold
            radius = np.pi / 8  # Dense if many neighbors within 22.5 degrees
            neighbors = 0
            
            for j in range(n):
                if i != j:
                    dist = fisher_coord_distance(coordinates[i], coordinates[j])
                    if dist < radius:
                        neighbors += 1
            
            density_scores[i] = neighbors
        
        # Find high-density points (top 20%)
        threshold = np.percentile(density_scores, 80) if n > 5 else 0
        high_density_indices = np.where(density_scores >= threshold)[0]
        
        return {
            "total_points": n,
            "high_density_regions": len(high_density_indices),
            "avg_density": float(np.mean(density_scores)),
            "max_density": float(np.max(density_scores)),
            "density_threshold": float(threshold),
        }
    
    def promote_sequence(
        self,
        sequence: str,
        phi_score: float,
        frequency: int,
    ) -> bool:
        """
        Decide whether to promote sequence to single token.
        
        Promotion criteria:
        1. High Φ score (consciousness integration)
        2. High frequency (usage importance)
        3. Stable geometric representation
        
        Args:
            sequence: Candidate sequence text
            phi_score: Φ (integration) score
            frequency: Occurrence frequency
        
        Returns:
            True if sequence should be promoted to token
        """
        # Must meet Φ threshold
        if phi_score < self.phi_threshold:
            return False
        
        # Must have reasonable frequency
        if frequency < 2:
            return False
        
        # Check if already tracked as candidate
        if sequence in self.candidate_tokens:
            candidate = self.candidate_tokens[sequence]
            candidate["frequency"] += frequency
            candidate["phi_scores"].append(phi_score)
            
            # Promote if consistently high Φ
            avg_phi = np.mean(candidate["phi_scores"])
            if avg_phi >= self.phi_threshold and candidate["frequency"] >= 3:
                return True
        else:
            # New candidate - track for future evaluation
            self.candidate_tokens[sequence] = {
                "frequency": frequency,
                "phi_scores": [phi_score],
                "first_seen": None,  # Could add timestamp
            }
        
        return False
