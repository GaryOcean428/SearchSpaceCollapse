"""
Topic Flagging Service - Identify and store interesting topics for future research

Captures topics discovered during search/scraping that show high geometric relevance.
Topics are stored in PostgreSQL for iterative research expansion.

QIG-PURE: Topic prioritization uses Fisher-Rao distance from successful patterns.
"""

import hashlib
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Set

import numpy as np

BASIN_DIMENSION = 64


@dataclass
class FlaggedTopic:
    """A topic identified for future research."""
    topic_id: str
    topic: str
    source: str
    category: str
    priority: float
    phi: float
    basin_coords: Optional[np.ndarray]
    searched_count: int = 0
    status: str = "pending"
    discovery_context: Dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        return {
            "topic_id": self.topic_id,
            "topic": self.topic,
            "source": self.source,
            "category": self.category,
            "priority": self.priority,
            "phi": self.phi,
            "basin_coords": self.basin_coords.tolist() if self.basin_coords is not None else None,
            "searched_count": self.searched_count,
            "status": self.status,
            "discovery_context": self.discovery_context,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None
        }


class TopicExtractor:
    """
    Extract potential research topics from content.
    
    Identifies Bitcoin-related topics, cryptographic concepts, and
    wallet recovery patterns for future exploration.
    """
    
    BITCOIN_TOPICS = [
        r'\b(bip-?\d{1,3})\b',
        r'\b(segwit|taproot|multisig)\b',
        r'\b(cold storage|paper wallet|hardware wallet)\b',
        r'\b(ledger|trezor|coldcard)\b',
        r'\b(electrum|bitcoin core|sparrow)\b',
        r'\b(hodl|satoshi|nakamoto)\b',
        r'\b(lightning network|layer 2)\b',
    ]
    
    RECOVERY_TOPICS = [
        r'\b(seed phrase|recovery phrase|mnemonic)\b',
        r'\b(passphrase|25th word)\b',
        r'\b(brain wallet|deterministic)\b',
        r'\b(backup|restore|recover)\b',
        r'\b(lost bitcoin|forgotten password)\b',
    ]
    
    CRYPTO_TOPICS = [
        r'\b(sha-?\d{3}|keccak|blake2)\b',
        r'\b(ecdsa|secp256k1|ed25519)\b',
        r'\b(pbkdf2|scrypt|argon2)\b',
        r'\b(hd wallet|bip32|bip39|bip44)\b',
        r'\b(xpub|xprv|zpub|ypub)\b',
    ]
    
    @classmethod
    def extract_topics(cls, content: str) -> List[Dict]:
        """Extract research-worthy topics from content."""
        topics = []
        content_lower = content.lower()
        
        for pattern in cls.BITCOIN_TOPICS:
            matches = re.findall(pattern, content_lower, re.IGNORECASE)
            for match in matches:
                topic_str = match if isinstance(match, str) else match[0]
                topics.append({
                    'topic': topic_str.strip(),
                    'category': 'bitcoin',
                    'pattern': pattern
                })
        
        for pattern in cls.RECOVERY_TOPICS:
            matches = re.findall(pattern, content_lower, re.IGNORECASE)
            for match in matches:
                topic_str = match if isinstance(match, str) else match[0]
                topics.append({
                    'topic': topic_str.strip(),
                    'category': 'recovery',
                    'pattern': pattern
                })
        
        for pattern in cls.CRYPTO_TOPICS:
            matches = re.findall(pattern, content_lower, re.IGNORECASE)
            for match in matches:
                topic_str = match if isinstance(match, str) else match[0]
                topics.append({
                    'topic': topic_str.strip(),
                    'category': 'cryptography',
                    'pattern': pattern
                })
        
        seen = set()
        unique_topics = []
        for t in topics:
            key = t['topic'].lower()
            if key not in seen and len(key) >= 3:
                seen.add(key)
                unique_topics.append(t)
        
        return unique_topics


class TopicFlaggingService:
    """
    Service for flagging and managing research topics.
    
    QIG-PURE: Topics are prioritized using Fisher-Rao distance and Φ metrics.
    All operations use PostgreSQL for persistence across sessions.
    """
    
    def __init__(self, basin_encoder: Optional[Callable] = None):
        self.database_url = os.environ.get('DATABASE_URL')
        self.enabled = bool(self.database_url)
        self.basin_encoder = basin_encoder
        
        self._local_cache: Dict[str, FlaggedTopic] = {}
        self._pending_flags: List[FlaggedTopic] = []
        
        self.topic_extractor = TopicExtractor()
        
        if self.enabled:
            self._ensure_table_exists()
            print("[TopicFlagging] PostgreSQL-backed topic storage initialized")
        else:
            print("[TopicFlagging] Running in memory-only mode (no DATABASE_URL)")
    
    def _ensure_table_exists(self):
        """Ensure flagged_topics table exists."""
        try:
            import psycopg2
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = 'flagged_topics'
                        )
                    """)
                    exists = cur.fetchone()[0]
                    if not exists:
                        print("[TopicFlagging] Table flagged_topics not found - will use memory only")
                        self.enabled = False
        except Exception as e:
            print(f"[TopicFlagging] DB check failed: {e}")
            self.enabled = False
    
    def _encode_to_basin(self, content: str) -> np.ndarray:
        """Encode topic to 64D basin coordinates."""
        if self.basin_encoder:
            try:
                coords = self.basin_encoder(content)
                if coords is not None and len(coords) == BASIN_DIMENSION:
                    return coords
            except Exception:
                pass
        
        content_hash = hashlib.sha256(content.encode('utf-8')).digest()
        coords = np.zeros(BASIN_DIMENSION)
        for i in range(min(32, BASIN_DIMENSION)):
            coords[i] = content_hash[i] / 255.0
        for i in range(32, BASIN_DIMENSION):
            coords[i] = (content_hash[(i - 32) % 32] + content_hash[(i - 16) % 32]) / 510.0
        
        norm = np.linalg.norm(coords)
        if norm > 0:
            coords = coords / norm
        return coords
    
    def _compute_priority(
        self,
        topic: str,
        phi: float,
        category: str,
        source_phi: float = 0.5
    ) -> float:
        """
        Compute topic priority using QIG metrics.
        
        Priority = weighted combination of:
        - Φ from discovery context
        - Category relevance (recovery > bitcoin > crypto)
        - Topic specificity
        """
        category_weights = {
            'recovery': 0.9,
            'bitcoin': 0.7,
            'cryptography': 0.6,
            'general': 0.4,
        }
        cat_weight = category_weights.get(category, 0.4)
        
        specificity = min(1.0, len(topic.split()) / 3.0)
        
        priority = (
            0.35 * phi +
            0.25 * cat_weight +
            0.20 * specificity +
            0.20 * source_phi
        )
        
        return min(1.0, max(0.0, priority))
    
    def flag_topic(
        self,
        topic: str,
        source: str,
        category: str = 'general',
        phi: float = 0.5,
        context: Optional[Dict] = None,
        expiry_days: int = 30
    ) -> Optional[FlaggedTopic]:
        """
        Flag a topic for future research.
        
        Args:
            topic: The topic string to flag
            source: Where the topic was discovered
            category: Topic category (bitcoin, recovery, cryptography, general)
            phi: Φ value from discovery context
            context: Additional context about discovery
            expiry_days: Days until topic expires
            
        Returns:
            FlaggedTopic if successfully flagged, None otherwise
        """
        topic = topic.strip()
        if not topic or len(topic) < 3:
            return None
        
        topic_id = hashlib.md5(f"{topic}:{category}".encode()).hexdigest()[:16]
        
        if topic_id in self._local_cache:
            existing = self._local_cache[topic_id]
            existing.priority = max(existing.priority, phi)
            return existing
        
        basin_coords = self._encode_to_basin(topic)
        priority = self._compute_priority(topic, phi, category)
        
        flagged = FlaggedTopic(
            topic_id=topic_id,
            topic=topic,
            source=source,
            category=category,
            priority=priority,
            phi=phi,
            basin_coords=basin_coords,
            discovery_context=context or {},
            expires_at=datetime.now() + timedelta(days=expiry_days)
        )
        
        self._local_cache[topic_id] = flagged
        
        if self.enabled:
            self._persist_topic(flagged)
        
        print(f"[TopicFlagging] Flagged: '{topic}' (cat={category}, pri={priority:.3f})")
        return flagged
    
    def _persist_topic(self, topic: FlaggedTopic):
        """Persist flagged topic to PostgreSQL."""
        try:
            import psycopg2
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    basin_str = None
                    if topic.basin_coords is not None:
                        basin_str = '[' + ','.join(str(x) for x in topic.basin_coords) + ']'
                    
                    cur.execute("""
                        INSERT INTO flagged_topics (
                            topic_id, topic, source, category, priority, phi,
                            basin_coords, searched_count, status, discovery_context,
                            created_at, expires_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s::vector, %s, %s, %s,
                            %s, %s
                        )
                        ON CONFLICT (topic_id) DO UPDATE SET
                            priority = GREATEST(flagged_topics.priority, EXCLUDED.priority),
                            phi = GREATEST(flagged_topics.phi, EXCLUDED.phi),
                            expires_at = GREATEST(flagged_topics.expires_at, EXCLUDED.expires_at)
                    """, (
                        topic.topic_id,
                        topic.topic,
                        topic.source,
                        topic.category,
                        topic.priority,
                        topic.phi,
                        basin_str,
                        topic.searched_count,
                        topic.status,
                        str(topic.discovery_context) if topic.discovery_context else '{}',
                        topic.created_at,
                        topic.expires_at
                    ))
                    conn.commit()
        except Exception as e:
            print(f"[TopicFlagging] Persist error: {e}")
    
    def flag_from_content(
        self,
        content: str,
        source: str,
        source_phi: float = 0.5,
        context: Optional[Dict] = None
    ) -> List[FlaggedTopic]:
        """
        Extract and flag topics from content.
        
        Automatically identifies Bitcoin/crypto/recovery topics
        and flags them for future research.
        """
        extracted = self.topic_extractor.extract_topics(content)
        flagged = []
        
        for topic_info in extracted:
            flagged_topic = self.flag_topic(
                topic=topic_info['topic'],
                source=source,
                category=topic_info['category'],
                phi=source_phi,
                context={
                    **(context or {}),
                    'extracted_pattern': topic_info.get('pattern', '')
                }
            )
            if flagged_topic:
                flagged.append(flagged_topic)
        
        return flagged
    
    def get_pending_topics(
        self,
        category: Optional[str] = None,
        min_priority: float = 0.3,
        limit: int = 10
    ) -> List[FlaggedTopic]:
        """
        Get pending topics for research, ordered by priority.
        
        Args:
            category: Filter by category (optional)
            min_priority: Minimum priority threshold
            limit: Maximum number of topics to return
        """
        if self.enabled:
            return self._get_pending_from_db(category, min_priority, limit)
        
        topics = [
            t for t in self._local_cache.values()
            if t.status == 'pending' and t.priority >= min_priority
        ]
        
        if category:
            topics = [t for t in topics if t.category == category]
        
        topics.sort(key=lambda t: t.priority, reverse=True)
        return topics[:limit]
    
    def _get_pending_from_db(
        self,
        category: Optional[str],
        min_priority: float,
        limit: int
    ) -> List[FlaggedTopic]:
        """Get pending topics from PostgreSQL."""
        try:
            import psycopg2
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    query = """
                        SELECT topic_id, topic, source, category, priority, phi,
                               basin_coords, searched_count, status, discovery_context,
                               created_at, expires_at
                        FROM flagged_topics
                        WHERE status = 'pending'
                        AND priority >= %s
                        AND (expires_at IS NULL OR expires_at > NOW())
                    """
                    params = [min_priority]
                    
                    if category:
                        query += " AND category = %s"
                        params.append(category)
                    
                    query += " ORDER BY priority DESC LIMIT %s"
                    params.append(limit)
                    
                    cur.execute(query, params)
                    
                    topics = []
                    for row in cur.fetchall():
                        basin = None
                        if row[6]:
                            try:
                                basin_str = row[6]
                                if isinstance(basin_str, str):
                                    basin = np.array([float(x) for x in basin_str.strip('[]').split(',')])
                            except Exception:
                                pass
                        
                        topic = FlaggedTopic(
                            topic_id=row[0],
                            topic=row[1],
                            source=row[2] or '',
                            category=row[3] or 'general',
                            priority=float(row[4]) if row[4] else 0.5,
                            phi=float(row[5]) if row[5] else 0.0,
                            basin_coords=basin,
                            searched_count=row[7] or 0,
                            status=row[8] or 'pending',
                            discovery_context=row[9] if isinstance(row[9], dict) else {},
                            created_at=row[10] or datetime.now(),
                            expires_at=row[11]
                        )
                        topics.append(topic)
                    
                    return topics
                    
        except Exception as e:
            print(f"[TopicFlagging] DB query error: {e}")
            return list(self._local_cache.values())[:limit]
    
    def mark_searched(self, topic_id: str) -> bool:
        """Mark a topic as searched (increment counter)."""
        if topic_id in self._local_cache:
            self._local_cache[topic_id].searched_count += 1
        
        if not self.enabled:
            return True
        
        try:
            import psycopg2
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE flagged_topics
                        SET searched_count = searched_count + 1,
                            last_searched_at = NOW()
                        WHERE topic_id = %s
                    """, (topic_id,))
                    conn.commit()
                    return True
        except Exception as e:
            print(f"[TopicFlagging] Update error: {e}")
            return False
    
    def mark_exhausted(self, topic_id: str) -> bool:
        """Mark a topic as exhausted (no more useful results)."""
        if topic_id in self._local_cache:
            self._local_cache[topic_id].status = 'exhausted'
        
        if not self.enabled:
            return True
        
        try:
            import psycopg2
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE flagged_topics
                        SET status = 'exhausted'
                        WHERE topic_id = %s
                    """, (topic_id,))
                    conn.commit()
                    return True
        except Exception as e:
            print(f"[TopicFlagging] Update error: {e}")
            return False
    
    def get_stats(self) -> Dict:
        """Get topic flagging statistics."""
        if not self.enabled:
            return {
                'enabled': False,
                'cache_size': len(self._local_cache)
            }
        
        try:
            import psycopg2
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT 
                            COUNT(*) as total,
                            COUNT(*) FILTER (WHERE status = 'pending') as pending,
                            COUNT(*) FILTER (WHERE status = 'active') as active,
                            COUNT(*) FILTER (WHERE status = 'exhausted') as exhausted,
                            AVG(priority) as avg_priority,
                            AVG(phi) as avg_phi
                        FROM flagged_topics
                    """)
                    row = cur.fetchone()
                    
                    return {
                        'enabled': True,
                        'total': row[0],
                        'pending': row[1],
                        'active': row[2],
                        'exhausted': row[3],
                        'avg_priority': float(row[4]) if row[4] else 0.0,
                        'avg_phi': float(row[5]) if row[5] else 0.0,
                        'cache_size': len(self._local_cache)
                    }
        except Exception as e:
            return {
                'enabled': True,
                'error': str(e),
                'cache_size': len(self._local_cache)
            }


_default_service: Optional[TopicFlaggingService] = None


def get_topic_flagging_service(basin_encoder: Optional[Callable] = None) -> TopicFlaggingService:
    """Get or create the default topic flagging service singleton."""
    global _default_service
    if _default_service is None:
        _default_service = TopicFlaggingService(basin_encoder=basin_encoder)
    return _default_service
