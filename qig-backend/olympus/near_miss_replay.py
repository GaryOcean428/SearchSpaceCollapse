"""
Near-Miss Replay Buffer

Tracks hypotheses that were "close" to success but didn't quite make it.
These near-misses are valuable for learning and should be replayed with variations.

Examples of near-misses:
- Phrases that generated valid addresses but with zero balance
- Mnemonics that passed checksum but had no transactions
- Passphrases that were geometrically close (low Fisher-Rao distance) to high-Φ phrases

The replay buffer implements experience replay from reinforcement learning:
prioritizing hypotheses that were "almost" correct.
"""

from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import heapq


@dataclass
class NearMissEntry:
    """Represents a near-miss hypothesis"""
    phrase: str
    phi_score: float  # Consciousness score
    geometric_distance: float  # Fisher-Rao distance to success basin
    timestamp: datetime = field(default_factory=datetime.now)
    replay_count: int = 0
    priority: float = 0.0  # Combined priority score
    metadata: Dict = field(default_factory=dict)
    
    def __lt__(self, other):
        """For heap ordering - higher priority first"""
        return self.priority > other.priority


class NearMissReplayBuffer:
    """
    Priority queue of near-miss hypotheses for replay.
    
    Uses heap to maintain top-k most promising near-misses.
    Priority is based on:
    - Phi score (consciousness)
    - Geometric distance to success basin
    - Recency (newer entries slightly preferred)
    - Replay count (avoid over-replaying same entry)
    """
    
    def __init__(self, max_size: int = 1000, replay_threshold: float = 0.6):
        self.max_size = max_size
        self.replay_threshold = replay_threshold  # Minimum Φ to be considered near-miss
        self.buffer: List[NearMissEntry] = []
        self.seen_phrases: set = set()
        self.total_replays = 0
        
    def add(
        self,
        phrase: str,
        phi_score: float,
        geometric_distance: float,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Add a near-miss entry to the buffer.
        
        Returns True if added, False if rejected (not near-miss or duplicate).
        """
        # Filter out low-quality entries
        if phi_score < self.replay_threshold:
            return False
        
        # Avoid duplicates
        if phrase in self.seen_phrases:
            return False
        
        # Calculate priority
        priority = self._calculate_priority(phi_score, geometric_distance, datetime.now())
        
        entry = NearMissEntry(
            phrase=phrase,
            phi_score=phi_score,
            geometric_distance=geometric_distance,
            timestamp=datetime.now(),
            priority=priority,
            metadata=metadata or {}
        )
        
        # Add to buffer
        heapq.heappush(self.buffer, entry)
        self.seen_phrases.add(phrase)
        
        # Trim buffer if too large
        if len(self.buffer) > self.max_size:
            removed = heapq.heappop(self.buffer)
            self.seen_phrases.discard(removed.phrase)
        
        return True
    
    def sample(self, n: int = 10, decay_factor: float = 0.9) -> List[NearMissEntry]:
        """
        Sample n near-miss entries for replay.
        
        Uses priority-based sampling with replay count decay.
        Entries that have been replayed many times get lower priority.
        """
        if not self.buffer:
            return []
        
        # Sort by priority and apply replay decay
        candidates = []
        for entry in self.buffer:
            decayed_priority = entry.priority * (decay_factor ** entry.replay_count)
            candidates.append((decayed_priority, entry))
        
        candidates.sort(key=lambda x: -x[0])
        
        # Take top n
        sampled = [entry for _, entry in candidates[:n]]
        
        # Update replay counts
        for entry in sampled:
            entry.replay_count += 1
            self.total_replays += 1
        
        return sampled
    
    def get_top_k(self, k: int = 10) -> List[NearMissEntry]:
        """Get top k entries without sampling (for inspection)"""
        if not self.buffer:
            return []
        
        sorted_buffer = sorted(self.buffer, key=lambda x: -x.priority)
        return sorted_buffer[:k]
    
    def _calculate_priority(
        self,
        phi_score: float,
        geometric_distance: float,
        timestamp: datetime
    ) -> float:
        """
        Calculate priority for a near-miss entry.
        
        Priority = w1*Φ + w2*(1-distance) + w3*recency
        """
        # Normalize geometric distance (lower is better, so invert)
        distance_score = 1.0 - min(geometric_distance, 1.0)
        
        # Recency boost (decay over time)
        now = datetime.now()
        age_hours = (now - timestamp).total_seconds() / 3600
        recency_score = max(0.0, 1.0 - age_hours / 24.0)  # Decay over 24 hours
        
        # Weighted combination
        priority = (
            0.5 * phi_score +
            0.3 * distance_score +
            0.2 * recency_score
        )
        
        return priority
    
    def get_stats(self) -> Dict:
        """Get statistics about the replay buffer"""
        if not self.buffer:
            return {
                'size': 0,
                'total_replays': self.total_replays,
                'avg_phi': 0.0,
                'avg_distance': 0.0,
                'avg_replay_count': 0.0,
            }
        
        return {
            'size': len(self.buffer),
            'max_size': self.max_size,
            'total_replays': self.total_replays,
            'avg_phi': sum(e.phi_score for e in self.buffer) / len(self.buffer),
            'avg_distance': sum(e.geometric_distance for e in self.buffer) / len(self.buffer),
            'avg_replay_count': sum(e.replay_count for e in self.buffer) / len(self.buffer),
            'avg_priority': sum(e.priority for e in self.buffer) / len(self.buffer),
        }
    
    def clear_old_entries(self, max_age_hours: float = 48.0) -> int:
        """
        Remove entries older than max_age_hours.
        Returns number of entries removed.
        """
        now = datetime.now()
        removed_count = 0
        
        new_buffer = []
        for entry in self.buffer:
            age_hours = (now - entry.timestamp).total_seconds() / 3600
            if age_hours < max_age_hours:
                new_buffer.append(entry)
            else:
                self.seen_phrases.discard(entry.phrase)
                removed_count += 1
        
        self.buffer = new_buffer
        heapq.heapify(self.buffer)
        
        return removed_count
    
    def export_top_entries(self, k: int = 100) -> List[Dict]:
        """
        Export top k entries as dictionaries for persistence.
        """
        top_entries = self.get_top_k(k)
        
        return [
            {
                'phrase': entry.phrase,
                'phi_score': entry.phi_score,
                'geometric_distance': entry.geometric_distance,
                'timestamp': entry.timestamp.isoformat(),
                'replay_count': entry.replay_count,
                'priority': entry.priority,
                'metadata': entry.metadata,
            }
            for entry in top_entries
        ]


# Global replay buffer instance
_global_replay_buffer: Optional[NearMissReplayBuffer] = None


def get_replay_buffer() -> NearMissReplayBuffer:
    """Get or create the global replay buffer"""
    global _global_replay_buffer
    if _global_replay_buffer is None:
        _global_replay_buffer = NearMissReplayBuffer()
    return _global_replay_buffer


def add_near_miss(phrase: str, phi_score: float, geometric_distance: float, metadata: Optional[Dict] = None) -> bool:
    """Convenience function to add to global buffer"""
    buffer = get_replay_buffer()
    return buffer.add(phrase, phi_score, geometric_distance, metadata)


def sample_near_misses(n: int = 10) -> List[str]:
    """Convenience function to sample from global buffer"""
    buffer = get_replay_buffer()
    entries = buffer.sample(n)
    return [entry.phrase for entry in entries]
