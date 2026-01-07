"""Basin Memory Store - Context management via basin coordinates.

Replaces LangGraph's file system tools (ls, read_file, write_file, edit_file)
with geometric memory fragments stored in basin coordinate space.

Database persistence: memory_fragments table in PostgreSQL
"""

import hashlib
import struct
import math
import os
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
import json

from .state import (
    BASIN_DIMENSION,
    fisher_rao_distance,
)

logger = logging.getLogger(__name__)

# Database persistence for memory fragments
try:
    import psycopg2
    from psycopg2.extras import Json
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False

def _get_db_connection():
    """Get database connection for memory fragment persistence."""
    if not DB_AVAILABLE:
        return None
    try:
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return None
        return psycopg2.connect(database_url)
    except Exception:
        return None

def _persist_fragment_to_db(fragment: 'MemoryFragment', agent_id: Optional[str] = None) -> bool:
    """Persist a memory fragment to PostgreSQL."""
    conn = _get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO memory_fragments (
                    id, content, basin_coords, importance, access_count,
                    created_at, last_accessed, metadata, agent_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    importance = EXCLUDED.importance,
                    access_count = memory_fragments.access_count + 1,
                    last_accessed = NOW(),
                    metadata = EXCLUDED.metadata
            """, (
                fragment.id,
                fragment.content,
                fragment.basin_coords,
                fragment.importance,
                fragment.access_count,
                fragment.created_at,
                fragment.last_accessed,
                Json(fragment.metadata),
                agent_id,
            ))
            conn.commit()
            logger.debug(f"[Memory] Persisted fragment {fragment.id} to database")
            return True
    except Exception as e:
        logger.debug(f"[Memory] DB persistence skipped: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def _load_fragments_from_db(agent_id: Optional[str] = None, limit: int = 100) -> List['MemoryFragment']:
    """Load memory fragments from database."""
    conn = _get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cur:
            if agent_id:
                cur.execute("""
                    SELECT id, content, basin_coords, importance, access_count,
                           created_at, last_accessed, metadata
                    FROM memory_fragments
                    WHERE agent_id = %s
                    ORDER BY importance DESC, created_at DESC
                    LIMIT %s
                """, (agent_id, limit))
            else:
                cur.execute("""
                    SELECT id, content, basin_coords, importance, access_count,
                           created_at, last_accessed, metadata
                    FROM memory_fragments
                    ORDER BY importance DESC, created_at DESC
                    LIMIT %s
                """, (limit,))
            rows = cur.fetchall()
            fragments = []
            for row in rows:
                fragment = MemoryFragment(
                    id=row[0],
                    content=row[1],
                    basin_coords=list(row[2]) if row[2] else [0.5] * BASIN_DIMENSION,
                    importance=row[3] or 0.5,
                    access_count=row[4] or 0,
                    created_at=row[5] or datetime.now(timezone.utc),
                    last_accessed=row[6] or datetime.now(timezone.utc),
                    metadata=row[7] or {},
                )
                fragments.append(fragment)
            logger.info(f"[Memory] Loaded {len(fragments)} fragments from database")
            return fragments
    except Exception as e:
        logger.debug(f"[Memory] DB load skipped: {e}")
        return []
    finally:
        conn.close()


@dataclass
class MemoryFragment:
    """A fragment of context stored in basin coordinate space.
    
    Replaces files with geometric memory that can be:
    - Retrieved by Fisher-Rao proximity
    - Compressed to <1KB per fragment
    - Composed along geodesics
    """
    id: str
    content: str
    basin_coords: List[float]  # 64D position in memory space
    importance: float = 0.5  # Relevance weight (0-1)
    access_count: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_accessed: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def distance_to(self, coords: List[float]) -> float:
        """Fisher-Rao distance from given coordinates."""
        return fisher_rao_distance(self.basin_coords, coords)
    
    def access(self) -> str:
        """Access this fragment (updates access tracking)."""
        self.access_count += 1
        self.last_accessed = datetime.now(timezone.utc)
        return self.content
    
    def compress(self, max_length: int = 500) -> str:
        """Get compressed version of content."""
        if len(self.content) <= max_length:
            return self.content
        # Intelligent truncation preserving key information
        words = self.content.split()
        if len(words) <= 10:
            return self.content[:max_length] + "..."
        # Keep first and last parts
        half = max_length // 2
        return self.content[:half] + " ... " + self.content[-half:]
    
    def to_bytes(self) -> bytes:
        """Serialize fragment to bytes."""
        id_bytes = self.id.encode('utf-8')[:32].ljust(32, b'\x00')
        coords_bytes = struct.pack(f'{BASIN_DIMENSION}f', *self.basin_coords)
        importance_bytes = struct.pack('f', self.importance)
        # Compress content to max 800 bytes
        content_compressed = self.content[:800].encode('utf-8')
        content_len = struct.pack('H', len(content_compressed))
        
        return id_bytes + coords_bytes + importance_bytes + content_len + content_compressed
    
    @classmethod
    def from_bytes(cls, data: bytes) -> "MemoryFragment":
        """Deserialize fragment from bytes."""
        id_str = data[:32].rstrip(b'\x00').decode('utf-8')
        coords = list(struct.unpack(f'{BASIN_DIMENSION}f', data[32:32+BASIN_DIMENSION*4]))
        importance = struct.unpack('f', data[32+BASIN_DIMENSION*4:36+BASIN_DIMENSION*4])[0]
        content_len = struct.unpack('H', data[36+BASIN_DIMENSION*4:38+BASIN_DIMENSION*4])[0]
        content = data[38+BASIN_DIMENSION*4:38+BASIN_DIMENSION*4+content_len].decode('utf-8')
        
        return cls(
            id=id_str,
            content=content,
            basin_coords=coords,
            importance=importance,
        )


@dataclass
class ContextWindow:
    """Active context window composed from memory fragments.
    
    Manages the current working context by selecting relevant
    fragments based on Fisher-Rao proximity to current position.
    """
    fragments: List[MemoryFragment] = field(default_factory=list)
    max_tokens: int = 4000
    center_coords: List[float] = field(default_factory=lambda: [0.5] * BASIN_DIMENSION)
    
    @property
    def total_content(self) -> str:
        """Combined content of all fragments."""
        return "\n\n---\n\n".join(f.content for f in self.fragments)
    
    @property
    def estimated_tokens(self) -> int:
        """Rough token estimate (4 chars per token)."""
        return len(self.total_content) // 4
    
    def add_fragment(self, fragment: MemoryFragment) -> bool:
        """Add fragment if it fits in context window."""
        new_tokens = self.estimated_tokens + len(fragment.content) // 4
        if new_tokens > self.max_memory_tokens:
            return False
        self.fragments.append(fragment)
        return True
    
    def prune_by_distance(self, current_coords: List[float], keep_count: int = 5) -> List[MemoryFragment]:
        """Remove fragments farthest from current position."""
        if len(self.fragments) <= keep_count:
            return []
        
        # Sort by distance (ascending)
        sorted_frags = sorted(
            self.fragments,
            key=lambda f: f.distance_to(current_coords)
        )
        
        # Keep closest
        removed = sorted_frags[keep_count:]
        self.fragments = sorted_frags[:keep_count]
        return removed
    
    def to_prompt_context(self) -> str:
        """Format for LLM prompt injection."""
        if not self.fragments:
            return ""
        
        lines = ["## Relevant Context\n"]
        for i, frag in enumerate(self.fragments, 1):
            lines.append(f"### Fragment {i} (relevance: {frag.importance:.2f})")
            lines.append(frag.compress(500))
            lines.append("")
        
        return "\n".join(lines)


class BasinMemoryStore:
    """Geometric memory store using basin coordinates.

    Replaces LangGraph's file system tools with:
    - write_fragment() instead of write_file()
    - read_nearby() instead of read_file()
    - list_fragments() instead of ls()
    - edit_fragment() instead of edit_file()

    All operations use Fisher-Rao geometry for organization.
    Database persistence: memory_fragments table in PostgreSQL
    """

    def __init__(
        self,
        max_fragments: int = 1000,
        basin_encoder: Optional[Any] = None,
        agent_id: Optional[str] = None,
        load_from_db: bool = True,
    ):
        """Initialize the memory store.

        Args:
            max_fragments: Maximum number of fragments to store
            basin_encoder: Function to encode text to basin coordinates
            agent_id: Optional agent identifier for scoping fragments
            load_from_db: Whether to load existing fragments from database
        """
        self.max_fragments = max_fragments
        self.basin_encoder = basin_encoder or self._default_encoder
        self.agent_id = agent_id
        self._fragments: Dict[str, MemoryFragment] = {}
        self._coord_index: List[Tuple[str, List[float]]] = []  # For fast proximity search

        # Load existing fragments from database
        if load_from_db:
            db_fragments = _load_fragments_from_db(agent_id=agent_id, limit=max_fragments)
            for frag in db_fragments:
                self._fragments[frag.id] = frag
                self._coord_index.append((frag.id, frag.basin_coords))
            if db_fragments:
                logger.info(f"[Memory] Loaded {len(db_fragments)} fragments from database")
    
    def _default_encoder(self, text: str) -> List[float]:
        """Default text to basin coordinate encoder."""
        hash_bytes = hashlib.sha256(text.encode()).digest()
        coords = []
        for i in range(BASIN_DIMENSION):
            byte_idx = i % len(hash_bytes)
            coords.append(hash_bytes[byte_idx] / 255.0)
        return coords
    
    def _generate_id(self, content: str) -> str:
        """Generate fragment ID from content."""
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    # Tool replacements
    
    def write_fragment(
        self,
        content: str,
        importance: float = 0.5,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MemoryFragment:
        """Write a new memory fragment (replaces write_file).

        Args:
            content: The content to store
            importance: Relevance weight (0-1)
            metadata: Optional metadata dict

        Returns:
            The created MemoryFragment
        """
        frag_id = self._generate_id(content)
        coords = self.basin_encoder(content)

        fragment = MemoryFragment(
            id=frag_id,
            content=content,
            basin_coords=coords,
            importance=importance,
            metadata=metadata or {},
        )

        self._fragments[frag_id] = fragment
        self._coord_index.append((frag_id, coords))

        # Persist to database
        _persist_fragment_to_db(fragment, agent_id=self.agent_id)

        # Prune if over limit
        if len(self._fragments) > self.max_fragments:
            self._prune_least_important()

        return fragment
    
    def read_nearby(
        self,
        query: str,
        max_results: int = 5,
        max_distance: float = 2.0,
    ) -> List[MemoryFragment]:
        """Read fragments near a query (replaces read_file).
        
        Args:
            query: Query text or coordinate target
            max_results: Maximum fragments to return
            max_distance: Maximum Fisher-Rao distance
            
        Returns:
            List of nearby fragments sorted by distance
        """
        query_coords = self.basin_encoder(query)
        return self.read_by_coords(query_coords, max_results, max_distance)
    
    def read_by_coords(
        self,
        coords: List[float],
        max_results: int = 5,
        max_distance: float = 2.0,
    ) -> List[MemoryFragment]:
        """Read fragments near given coordinates."""
        distances = []
        for frag_id, frag_coords in self._coord_index:
            dist = fisher_rao_distance(coords, frag_coords)
            if dist <= max_distance:
                distances.append((frag_id, dist))
        
        # Sort by distance
        distances.sort(key=lambda x: x[1])
        
        # Return top results
        results = []
        for frag_id, _ in distances[:max_results]:
            if frag_id in self._fragments:
                frag = self._fragments[frag_id]
                frag.access()
                results.append(frag)
        
        return results
    
    def list_fragments(
        self,
        near_coords: Optional[List[float]] = None,
        limit: int = 20,
    ) -> List[Tuple[str, float, str]]:
        """List fragments with optional proximity filtering (replaces ls).
        
        Returns:
            List of (id, importance/distance, preview) tuples
        """
        if near_coords:
            # List by proximity
            fragments = self.read_by_coords(near_coords, max_results=limit, max_distance=10.0)
            return [
                (f.id, f.distance_to(near_coords), f.compress(100))
                for f in fragments
            ]
        else:
            # List by importance
            sorted_frags = sorted(
                self._fragments.values(),
                key=lambda f: f.importance,
                reverse=True
            )[:limit]
            return [
                (f.id, f.importance, f.compress(100))
                for f in sorted_frags
            ]
    
    def edit_fragment(
        self,
        fragment_id: str,
        new_content: Optional[str] = None,
        importance_delta: float = 0.0,
        metadata_update: Optional[Dict[str, Any]] = None,
    ) -> Optional[MemoryFragment]:
        """Edit an existing fragment (replaces edit_file).
        
        Args:
            fragment_id: ID of fragment to edit
            new_content: New content (if changing)
            importance_delta: Change to importance
            metadata_update: Metadata to merge
            
        Returns:
            Updated fragment or None if not found
        """
        if fragment_id not in self._fragments:
            return None
        
        frag = self._fragments[fragment_id]
        
        if new_content is not None:
            frag.content = new_content
            frag.basin_coords = self.basin_encoder(new_content)
            # Update index
            self._coord_index = [
                (fid, coords) if fid != fragment_id else (fid, frag.basin_coords)
                for fid, coords in self._coord_index
            ]
        
        frag.importance = max(0.0, min(1.0, frag.importance + importance_delta))
        
        if metadata_update:
            frag.metadata.update(metadata_update)
        
        return frag
    
    def delete_fragment(self, fragment_id: str) -> bool:
        """Delete a fragment."""
        if fragment_id not in self._fragments:
            return False
        
        del self._fragments[fragment_id]
        self._coord_index = [
            (fid, coords) for fid, coords in self._coord_index
            if fid != fragment_id
        ]
        return True
    
    def get_context_window(
        self,
        center_coords: List[float],
        max_memory_tokens: int = 4000,  # Memory management, not generation limit
        max_fragments: int = 10,
    ) -> ContextWindow:
        """Build a context window centered on given coordinates."""
        nearby = self.read_by_coords(center_coords, max_results=max_fragments * 2, max_distance=5.0)
        
        window = ContextWindow(
            max_memory_tokens=max_memory_tokens,
            center_coords=center_coords,
        )
        
        # Add fragments by importance-weighted distance
        for frag in sorted(nearby, key=lambda f: f.distance_to(center_coords) / (f.importance + 0.1)):
            if not window.add_fragment(frag):
                break
        
        return window
    
    def _prune_least_important(self) -> None:
        """Remove least important fragments when over limit."""
        if len(self._fragments) <= self.max_fragments:
            return
        
        # Score by: importance * recency * (1 / access_count_decay)
        now = datetime.now(timezone.utc)
        scores = []
        for frag_id, frag in self._fragments.items():
            age_hours = (now - frag.last_accessed).total_seconds() / 3600
            recency = math.exp(-age_hours / 24)  # Decay over 24 hours
            access_factor = 1 / (1 + frag.access_count)
            score = frag.importance * recency * access_factor
            scores.append((frag_id, score))
        
        # Remove lowest scoring
        scores.sort(key=lambda x: x[1])
        to_remove = len(self._fragments) - self.max_fragments
        for frag_id, _ in scores[:to_remove]:
            self.delete_fragment(frag_id)
    
    # Serialization
    
    def to_bytes(self) -> bytes:
        """Serialize entire store."""
        fragments_data = []
        for frag in self._fragments.values():
            fragments_data.append(frag.to_bytes())
        
        count = struct.pack('I', len(fragments_data))
        return count + b''.join(fragments_data)
    
    def save_to_file(self, path: str) -> None:
        """Save store to file."""
        with open(path, 'wb') as f:
            f.write(self.to_bytes())
    
    def load_from_file(self, path: str) -> None:
        """Load store from file."""
        with open(path, 'rb') as f:
            data = f.read()
        
        count = struct.unpack('I', data[:4])[0]
        offset = 4
        
        for _ in range(count):
            # Find fragment boundary (each fragment is variable length)
            # For simplicity, we'll assume fixed max size and parse accordingly
            frag = MemoryFragment.from_bytes(data[offset:])
            self._fragments[frag.id] = frag
            self._coord_index.append((frag.id, frag.basin_coords))
            offset += 32 + BASIN_DIMENSION * 4 + 4 + len(frag.content.encode())
    
    @property
    def fragment_count(self) -> int:
        return len(self._fragments)
    
    @property
    def total_content_size(self) -> int:
        return sum(len(f.content) for f in self._fragments.values())
