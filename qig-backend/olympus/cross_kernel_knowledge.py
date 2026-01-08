"""
Cross-Kernel Knowledge Distillation

Enables sharing of learned patterns, successful hypotheses, and high-Φ discoveries
between different QIG kernels (Hephaestus, Athena, Demeter, etc.).

This implements knowledge transfer in the Olympus pantheon:
- Successful patterns from one kernel inform hypothesis generation in others
- High-Φ vocabulary is shared across kernels
- Geometric basin anchors are synchronized
- Near-miss patterns are propagated

Architecture:
- Central knowledge repository (shared dict or Redis)
- Periodic sync of learned patterns
- Priority-based knowledge transfer (high-Φ patterns prioritized)
- Decay mechanism for outdated patterns
"""

from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json
from collections import defaultdict


@dataclass
class KnowledgePattern:
    """Represents a learned pattern from a kernel"""
    pattern: str  # The hypothesis or pattern
    source_kernel: str  # Which kernel discovered it (e.g., "Hephaestus", "Athena")
    phi_score: float  # Consciousness score
    geometric_priority: float  # Fisher-Rao based priority
    success_count: int = 0  # How many times this led to success
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict = field(default_factory=dict)
    
    def age_hours(self) -> float:
        """Get age of pattern in hours"""
        return (datetime.now() - self.timestamp).total_seconds() / 3600
    
    def relevance_score(self, decay_hours: float = 48.0) -> float:
        """
        Calculate relevance score with time decay.
        
        Relevance = (Φ * 0.4 + geometric_priority * 0.3 + success_count * 0.3) * time_decay
        """
        age = self.age_hours()
        time_decay = max(0.0, 1.0 - (age / decay_hours))
        
        base_score = (
            self.phi_score * 0.4 +
            self.geometric_priority * 0.3 +
            min(self.success_count / 10.0, 1.0) * 0.3
        )
        
        return base_score * time_decay


class CrossKernelKnowledgeBase:
    """
    Central knowledge repository for cross-kernel learning.
    
    Stores and synchronizes learned patterns across all kernels in the Olympus pantheon.
    Implements priority-based knowledge transfer with time decay.
    """
    
    def __init__(self, max_patterns: int = 10000, decay_hours: float = 48.0):
        self.max_patterns = max_patterns
        self.decay_hours = decay_hours
        
        # Pattern storage by source kernel
        self.patterns: Dict[str, List[KnowledgePattern]] = defaultdict(list)
        
        # Vocabulary shared across kernels
        self.shared_vocabulary: Dict[str, float] = {}  # word -> phi_score
        
        # High-Φ basin anchors (for geometric guidance)
        self.basin_anchors: List[Tuple[str, float]] = []  # (word, phi_score)
        
        # Success patterns (phrases that led to balance hits)
        self.success_patterns: Set[str] = set()
        
        # Statistics
        self.total_patterns_added = 0
        self.total_syncs = 0
        self.last_cleanup: datetime = datetime.now()
    
    def add_pattern(
        self,
        pattern: str,
        source_kernel: str,
        phi_score: float,
        geometric_priority: float,
        success_count: int = 0,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Add a learned pattern from a kernel.
        
        Returns True if added, False if rejected (duplicate or low quality).
        """
        # Filter low-quality patterns
        if phi_score < 0.5 or geometric_priority < 0.4:
            return False
        
        # Check for duplicates
        for existing in self.patterns[source_kernel]:
            if existing.pattern == pattern:
                # Update existing pattern
                existing.success_count = max(existing.success_count, success_count)
                existing.phi_score = max(existing.phi_score, phi_score)
                return True
        
        # Create new pattern
        new_pattern = KnowledgePattern(
            pattern=pattern,
            source_kernel=source_kernel,
            phi_score=phi_score,
            geometric_priority=geometric_priority,
            success_count=success_count,
            timestamp=datetime.now(),
            metadata=metadata or {}
        )
        
        self.patterns[source_kernel].append(new_pattern)
        self.total_patterns_added += 1
        
        # Trim if too large
        self._trim_patterns()
        
        return True
    
    def add_vocabulary_word(self, word: str, phi_score: float, source_kernel: str) -> None:
        """Add a word to shared vocabulary with its Φ score"""
        # Keep highest Φ score across kernels
        current_phi = self.shared_vocabulary.get(word, 0.0)
        if phi_score > current_phi:
            self.shared_vocabulary[word] = phi_score
    
    def add_basin_anchor(self, word: str, phi_score: float) -> None:
        """Add a high-Φ word as a basin anchor for geometric guidance"""
        if phi_score >= 0.7:
            # Avoid duplicates
            for anchor_word, _ in self.basin_anchors:
                if anchor_word == word:
                    return
            
            self.basin_anchors.append((word, phi_score))
            # Keep only top 50 anchors
            self.basin_anchors.sort(key=lambda x: -x[1])
            self.basin_anchors = self.basin_anchors[:500]
    
    def register_success(self, pattern: str) -> None:
        """Register a pattern that led to a balance hit"""
        self.success_patterns.add(pattern)
        
        # Update success count for matching patterns
        for kernel_patterns in self.patterns.values():
            for p in kernel_patterns:
                if p.pattern == pattern:
                    p.success_count += 1
    
    def get_patterns_for_kernel(
        self,
        target_kernel: str,
        n: int = 50,
        exclude_own: bool = True,
        min_relevance: float = 0.5
    ) -> List[KnowledgePattern]:
        """
        Get relevant patterns for a kernel to learn from.
        
        Args:
            target_kernel: Which kernel is requesting patterns
            n: Number of patterns to return
            exclude_own: Whether to exclude patterns from target kernel itself
            min_relevance: Minimum relevance score
        
        Returns:
            List of most relevant patterns sorted by relevance
        """
        all_patterns = []
        
        for source_kernel, patterns in self.patterns.items():
            if exclude_own and source_kernel == target_kernel:
                continue
            
            for pattern in patterns:
                relevance = pattern.relevance_score(self.decay_hours)
                if relevance >= min_relevance:
                    all_patterns.append(pattern)
        
        # Sort by relevance descending
        all_patterns.sort(key=lambda p: -p.relevance_score(self.decay_hours))
        
        return all_patterns[:n]
    
    def get_shared_vocabulary(self, min_phi: float = 0.5) -> Dict[str, float]:
        """Get shared vocabulary filtered by minimum Φ score"""
        return {
            word: phi
            for word, phi in self.shared_vocabulary.items()
            if phi >= min_phi
        }
    
    def get_basin_anchors(self, top_k: int = 20) -> List[Tuple[str, float]]:
        """Get top-k basin anchors for geometric guidance"""
        return self.basin_anchors[:top_k]
    
    def get_success_patterns(self, limit: int = 100) -> List[str]:
        """Get patterns that led to success"""
        return list(self.success_patterns)[:limit]
    
    def sync_from_kernel(
        self,
        kernel_name: str,
        vocabulary: Dict[str, float],
        successful_patterns: List[str],
        high_phi_words: List[Tuple[str, float]]
    ) -> Dict[str, int]:
        """
        Sync knowledge from a kernel to the shared knowledge base.
        
        Returns statistics about what was synced.
        """
        stats = {
            'vocabulary_added': 0,
            'patterns_added': 0,
            'anchors_added': 0,
        }
        
        # Sync vocabulary
        for word, phi in vocabulary.items():
            self.add_vocabulary_word(word, phi, kernel_name)
            stats['vocabulary_added'] += 1
        
        # Sync successful patterns
        for pattern in successful_patterns:
            # Assume high phi/priority for successful patterns
            if self.add_pattern(
                pattern,
                kernel_name,
                phi_score=0.8,
                geometric_priority=0.8,
                success_count=1
            ):
                stats['patterns_added'] += 1
        
        # Sync high-Φ words as basin anchors
        for word, phi in high_phi_words:
            self.add_basin_anchor(word, phi)
            stats['anchors_added'] += 1
        
        self.total_syncs += 1
        return stats
    
    def _trim_patterns(self) -> int:
        """
        Trim patterns to max size, removing lowest relevance patterns.
        Returns number of patterns removed.
        """
        total_patterns = sum(len(patterns) for patterns in self.patterns.values())
        
        if total_patterns <= self.max_patterns:
            return 0
        
        # Collect all patterns with relevance
        all_patterns_with_kernel = []
        for kernel, patterns in self.patterns.items():
            for pattern in patterns:
                relevance = pattern.relevance_score(self.decay_hours)
                all_patterns_with_kernel.append((kernel, pattern, relevance))
        
        # Sort by relevance descending
        all_patterns_with_kernel.sort(key=lambda x: -x[2])
        
        # Keep top max_patterns
        to_keep = all_patterns_with_kernel[:self.max_patterns]
        
        # Rebuild patterns dict
        new_patterns = defaultdict(list)
        for kernel, pattern, _ in to_keep:
            new_patterns[kernel].append(pattern)
        
        removed = total_patterns - len(to_keep)
        self.patterns = new_patterns
        
        return removed
    
    def cleanup_old_patterns(self, max_age_hours: float = 72.0) -> int:
        """
        Remove patterns older than max_age_hours.
        Returns number of patterns removed.
        """
        removed = 0
        
        for kernel, patterns in list(self.patterns.items()):
            new_patterns = [
                p for p in patterns
                if p.age_hours() < max_age_hours
            ]
            removed += len(patterns) - len(new_patterns)
            self.patterns[kernel] = new_patterns
        
        self.last_cleanup = datetime.now()
        return removed
    
    def get_stats(self) -> Dict:
        """Get statistics about the knowledge base"""
        total_patterns = sum(len(patterns) for patterns in self.patterns.values())
        
        return {
            'total_patterns': total_patterns,
            'patterns_by_kernel': {k: len(v) for k, v in self.patterns.items()},
            'shared_vocabulary_size': len(self.shared_vocabulary),
            'basin_anchors': len(self.basin_anchors),
            'success_patterns': len(self.success_patterns),
            'total_patterns_added': self.total_patterns_added,
            'total_syncs': self.total_syncs,
            'last_cleanup': self.last_cleanup.isoformat(),
        }
    
    def export_to_dict(self) -> Dict:
        """Export knowledge base to dictionary for persistence"""
        return {
            'patterns': {
                kernel: [
                    {
                        'pattern': p.pattern,
                        'phi_score': p.phi_score,
                        'geometric_priority': p.geometric_priority,
                        'success_count': p.success_count,
                        'timestamp': p.timestamp.isoformat(),
                        'metadata': p.metadata,
                    }
                    for p in patterns
                ]
                for kernel, patterns in self.patterns.items()
            },
            'shared_vocabulary': self.shared_vocabulary,
            'basin_anchors': self.basin_anchors,
            'success_patterns': list(self.success_patterns),
        }
    
    def import_from_dict(self, data: Dict) -> None:
        """Import knowledge base from dictionary"""
        # Import patterns
        for kernel, patterns in data.get('patterns', {}).items():
            for p_data in patterns:
                pattern = KnowledgePattern(
                    pattern=p_data['pattern'],
                    source_kernel=kernel,
                    phi_score=p_data['phi_score'],
                    geometric_priority=p_data['geometric_priority'],
                    success_count=p_data.get('success_count', 0),
                    timestamp=datetime.fromisoformat(p_data['timestamp']),
                    metadata=p_data.get('metadata', {}),
                )
                self.patterns[kernel].append(pattern)
        
        # Import vocabulary
        self.shared_vocabulary = data.get('shared_vocabulary', {})
        
        # Import basin anchors
        self.basin_anchors = data.get('basin_anchors', [])
        
        # Import success patterns
        self.success_patterns = set(data.get('success_patterns', []))


# Global knowledge base instance
_global_knowledge_base: Optional[CrossKernelKnowledgeBase] = None


def get_knowledge_base() -> CrossKernelKnowledgeBase:
    """Get or create the global cross-kernel knowledge base"""
    global _global_knowledge_base
    if _global_knowledge_base is None:
        _global_knowledge_base = CrossKernelKnowledgeBase()
    return _global_knowledge_base


def sync_kernel_knowledge(
    kernel_name: str,
    vocabulary: Dict[str, float],
    successful_patterns: List[str],
    high_phi_words: List[Tuple[str, float]]
) -> Dict[str, int]:
    """Convenience function to sync knowledge from a kernel"""
    kb = get_knowledge_base()
    return kb.sync_from_kernel(kernel_name, vocabulary, successful_patterns, high_phi_words)


def get_knowledge_for_kernel(kernel_name: str, n: int = 50) -> Dict:
    """Convenience function to get knowledge for a kernel"""
    kb = get_knowledge_base()
    
    return {
        'patterns': kb.get_patterns_for_kernel(kernel_name, n),
        'vocabulary': kb.get_shared_vocabulary(),
        'basin_anchors': kb.get_basin_anchors(),
        'success_patterns': kb.get_success_patterns(),
    }
