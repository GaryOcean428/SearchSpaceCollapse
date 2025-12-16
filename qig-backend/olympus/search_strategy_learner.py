"""
Search Strategy Learner - Pure Geometric Learning for Search Optimization

Learns search strategy modifications through geometric basin operations.
NO keyword templates or pattern matching - all learning is via 64D basin
coordinates and Fisher-Rao distance similarity.

Key principles:
1. All feedback encoded to 64D basin coordinates via ConversationEncoder
2. Strategy retrieval via Fisher-Rao distance similarity, NOT keyword lookup
3. Learning happens by storing feedback basins and their outcomes
4. Reinforcement through outcome quality scores on stored basins
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np

from .conversation_encoder import ConversationEncoder

try:
    from ..qig_core.geometric_primitives.fisher_metric import fisher_rao_distance
except ImportError:
    def fisher_rao_distance(p: np.ndarray, q: np.ndarray) -> float:
        """Fallback Fisher-Rao distance on unit sphere."""
        p_norm = p / (np.linalg.norm(p) + 1e-10)
        q_norm = q / (np.linalg.norm(q) + 1e-10)
        dot = float(np.clip(np.dot(p_norm, q_norm), -1.0, 1.0))
        return float(np.arccos(dot))


BASIN_DIMENSION = 64
DEFAULT_DISTANCE_THRESHOLD = 1.5
DEFAULT_OUTCOME_QUALITY = 0.5
OUTCOME_QUALITY_DECAY = 0.95
OUTCOME_QUALITY_BOOST = 0.1
OUTCOME_QUALITY_PENALTY = 0.15


@dataclass
class FeedbackRecord:
    """
    Pure geometric record of user feedback for learning.
    
    All components are 64D basin coordinates - NO keyword templates.
    """
    query_basin: np.ndarray
    feedback_basin: np.ndarray
    combined_basin: np.ndarray
    modification_basin: np.ndarray
    search_params: Dict[str, Any]
    outcome_quality: float
    timestamp: float
    record_id: str = field(default_factory=lambda: f"fr_{int(time.time() * 1000)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary (for debugging/export)."""
        return {
            "record_id": self.record_id,
            "query_basin_norm": float(np.linalg.norm(self.query_basin)),
            "feedback_basin_norm": float(np.linalg.norm(self.feedback_basin)),
            "modification_basin_norm": float(np.linalg.norm(self.modification_basin)),
            "search_params": self.search_params,
            "outcome_quality": self.outcome_quality,
            "timestamp": self.timestamp,
        }


class SearchStrategyLearner:
    """
    Pure geometric strategy learner for search optimization.
    
    Learns from user feedback by storing geometric modifications to
    search basins. Retrieval is via Fisher-Rao distance similarity,
    NOT keyword matching.
    
    Example workflow:
    1. User searches for "bitcoin transaction analysis"
    2. User provides feedback: "show more recent results"
    3. Learner encodes both to basins, computes modification delta
    4. On similar future queries, modification is applied geometrically
    """
    
    def __init__(
        self,
        conversation_encoder: ConversationEncoder,
        distance_threshold: float = DEFAULT_DISTANCE_THRESHOLD,
    ):
        """
        Initialize the strategy learner.
        
        Args:
            conversation_encoder: Encoder for text -> 64D basin mapping
            distance_threshold: Fisher-Rao distance threshold for similarity
        """
        self.encoder = conversation_encoder
        self.distance_threshold = distance_threshold
        self.feedback_records: List[FeedbackRecord] = []
        self._stats = {
            "total_records": 0,
            "total_retrievals": 0,
            "total_confirmations": 0,
            "positive_confirmations": 0,
            "negative_confirmations": 0,
            "strategies_applied": 0,
        }
    
    def record_feedback(
        self,
        query: str,
        search_params: Dict[str, Any],
        results_summary: str,
        user_feedback: str,
    ) -> Dict[str, Any]:
        """
        Record user feedback as a geometric modification.
        
        Encodes query, feedback, and combined context to basin coordinates.
        The modification is the geometric difference between original query
        basin and the corrected basin (query + feedback context).
        
        Args:
            query: Original search query
            search_params: Parameters used for the search
            results_summary: Brief description of results (for context encoding)
            user_feedback: User's feedback text
        
        Returns:
            Dict with record_id and encoding statistics
        """
        query_basin = self.encoder.encode(query)
        feedback_basin = self.encoder.encode(user_feedback)
        
        combined_context = f"{query} {user_feedback}"
        if results_summary:
            combined_context = f"{combined_context} {results_summary}"
        combined_basin = self.encoder.encode(combined_context)
        
        modification_basin = combined_basin - query_basin
        mod_norm = np.linalg.norm(modification_basin)
        if mod_norm > 1e-10:
            modification_basin = modification_basin / mod_norm
        else:
            modification_basin = np.zeros(BASIN_DIMENSION)
        
        record = FeedbackRecord(
            query_basin=query_basin,
            feedback_basin=feedback_basin,
            combined_basin=combined_basin,
            modification_basin=modification_basin,
            search_params=search_params.copy() if search_params else {},
            outcome_quality=DEFAULT_OUTCOME_QUALITY,
            timestamp=time.time(),
        )
        
        self.feedback_records.append(record)
        self._stats["total_records"] += 1
        
        return {
            "success": True,
            "record_id": record.record_id,
            "modification_magnitude": float(mod_norm),
            "combined_basin_norm": float(np.linalg.norm(combined_basin)),
            "total_records": len(self.feedback_records),
        }
    
    def get_learned_strategies(
        self,
        query: str,
        max_results: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Find learned strategies similar to the query via Fisher-Rao distance.
        
        Encodes query to basin, finds stored feedback records with
        Fisher-Rao distance below threshold, returns sorted by
        distance * outcome_quality (lower distance, higher quality = better).
        
        Args:
            query: Search query to find similar strategies for
            max_results: Maximum number of strategies to return
        
        Returns:
            List of strategy dicts with distance, outcome_quality, and modification
        """
        self._stats["total_retrievals"] += 1
        
        if not self.feedback_records:
            return []
        
        query_basin = self.encoder.encode(query)
        
        similar_strategies = []
        
        for record in self.feedback_records:
            distance = fisher_rao_distance(query_basin, record.combined_basin)
            
            if distance < self.distance_threshold:
                score = distance / (record.outcome_quality + 0.01)
                
                similar_strategies.append({
                    "record_id": record.record_id,
                    "distance": float(distance),
                    "outcome_quality": record.outcome_quality,
                    "score": float(score),
                    "modification_basin": record.modification_basin,
                    "search_params": record.search_params,
                    "timestamp": record.timestamp,
                })
        
        similar_strategies.sort(key=lambda x: x["score"])
        
        return similar_strategies[:max_results]
    
    def apply_strategies_to_search(
        self,
        query: str,
        base_params: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Apply learned geometric modifications to search parameters.
        
        For each similar past feedback, extracts the modification basin
        and applies it as a weighted geometric shift. The result is a
        modified query basin that incorporates learned corrections.
        
        Args:
            query: Current search query
            base_params: Base search parameters to modify
        
        Returns:
            Dict with original basin, modified basin, and adjusted params
        """
        strategies = self.get_learned_strategies(query)
        
        query_basin = self.encoder.encode(query)
        adjusted_basin = query_basin.copy()
        
        applied_count = 0
        total_weight = 0.0
        
        for strategy in strategies:
            weight = strategy["outcome_quality"] * (1.0 - strategy["distance"] / self.distance_threshold)
            weight = max(0.0, weight)
            
            if weight > 0.01:
                modification = strategy["modification_basin"]
                adjusted_basin = adjusted_basin + weight * modification
                total_weight += weight
                applied_count += 1
        
        adj_norm = np.linalg.norm(adjusted_basin)
        if adj_norm > 1e-10:
            adjusted_basin = adjusted_basin / adj_norm
        
        modification_magnitude = float(np.linalg.norm(adjusted_basin - query_basin / np.linalg.norm(query_basin)))
        
        self._stats["strategies_applied"] += applied_count
        
        return {
            "original_basin": query_basin,
            "adjusted_basin": adjusted_basin,
            "params": base_params.copy() if base_params else {},
            "strategies_applied": applied_count,
            "total_weight": float(total_weight),
            "modification_magnitude": modification_magnitude,
            "similar_strategies_found": len(strategies),
        }
    
    def confirm_improvement(
        self,
        query: str,
        improved: bool,
    ) -> Dict[str, Any]:
        """
        Update outcome quality for matching feedback records.
        
        Called when user confirms whether the applied strategies improved
        the search results. Updates outcome_quality for all records that
        were geometrically similar to the query.
        
        Args:
            query: The query that was searched
            improved: True if results improved, False otherwise
        
        Returns:
            Dict with number of records updated and new average quality
        """
        self._stats["total_confirmations"] += 1
        
        if improved:
            self._stats["positive_confirmations"] += 1
        else:
            self._stats["negative_confirmations"] += 1
        
        query_basin = self.encoder.encode(query)
        
        updated_records = []
        
        for record in self.feedback_records:
            distance = fisher_rao_distance(query_basin, record.combined_basin)
            
            if distance < self.distance_threshold:
                old_quality = record.outcome_quality
                
                if improved:
                    record.outcome_quality = min(1.0, old_quality + OUTCOME_QUALITY_BOOST)
                else:
                    record.outcome_quality = max(0.0, old_quality - OUTCOME_QUALITY_PENALTY)
                
                updated_records.append({
                    "record_id": record.record_id,
                    "old_quality": old_quality,
                    "new_quality": record.outcome_quality,
                    "distance": float(distance),
                })
        
        avg_quality = 0.0
        if updated_records:
            avg_quality = sum(r["new_quality"] for r in updated_records) / len(updated_records)
        
        return {
            "success": True,
            "records_updated": len(updated_records),
            "improved": improved,
            "average_quality": float(avg_quality),
            "updates": updated_records[:10],
        }
    
    def decay_old_records(
        self,
        max_age_seconds: float = 86400 * 7,
    ) -> Dict[str, Any]:
        """
        Apply decay to outcome quality of old records.
        
        Records older than max_age have their outcome_quality decayed.
        Very low quality records are removed.
        
        Args:
            max_age_seconds: Age threshold for decay (default 7 days)
        
        Returns:
            Dict with decay statistics
        """
        now = time.time()
        decayed_count = 0
        removed_count = 0
        
        surviving_records = []
        
        for record in self.feedback_records:
            age = now - record.timestamp
            
            if age > max_age_seconds:
                record.outcome_quality *= OUTCOME_QUALITY_DECAY
                decayed_count += 1
            
            if record.outcome_quality > 0.05:
                surviving_records.append(record)
            else:
                removed_count += 1
        
        self.feedback_records = surviving_records
        
        return {
            "decayed_count": decayed_count,
            "removed_count": removed_count,
            "remaining_records": len(self.feedback_records),
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get learning statistics.
        
        Returns:
            Dict with total records, retrievals, confirmations, and quality metrics
        """
        quality_values = [r.outcome_quality for r in self.feedback_records]
        
        return {
            **self._stats,
            "current_records": len(self.feedback_records),
            "average_outcome_quality": float(np.mean(quality_values)) if quality_values else 0.0,
            "min_outcome_quality": float(np.min(quality_values)) if quality_values else 0.0,
            "max_outcome_quality": float(np.max(quality_values)) if quality_values else 0.0,
            "confirmation_rate": (
                self._stats["positive_confirmations"] / self._stats["total_confirmations"]
                if self._stats["total_confirmations"] > 0 else 0.0
            ),
        }
    
    def clear_records(self) -> Dict[str, Any]:
        """
        Clear all feedback records (for testing or reset).
        
        Returns:
            Dict with number of records cleared
        """
        count = len(self.feedback_records)
        self.feedback_records = []
        return {
            "success": True,
            "records_cleared": count,
        }


_global_strategy_learner: Optional[SearchStrategyLearner] = None


def get_strategy_learner(
    encoder: Optional[ConversationEncoder] = None,
) -> SearchStrategyLearner:
    """
    Get or create the global SearchStrategyLearner instance.
    
    Args:
        encoder: Optional ConversationEncoder (creates default if not provided)
    
    Returns:
        Singleton SearchStrategyLearner instance
    """
    global _global_strategy_learner
    
    if _global_strategy_learner is None:
        if encoder is None:
            encoder = ConversationEncoder()
        _global_strategy_learner = SearchStrategyLearner(encoder)
    
    return _global_strategy_learner
