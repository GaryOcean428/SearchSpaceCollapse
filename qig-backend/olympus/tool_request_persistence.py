"""
Tool Request Persistence Layer

Tracks in-flight tool requests so they survive server restarts.
Enables gods to periodically request tools based on research discoveries.

Database schema:
- tool_requests: Pending and completed tool requests
- tool_discoveries: Pattern discoveries that triggered tool requests
- cross_god_insights: Insights shared between gods that inform tool development
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor, Json
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logger.warning("[ToolRequestPersistence] psycopg2 not available - persistence disabled")


class RequestStatus(Enum):
    """Status of tool request."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class RequestPriority(Enum):
    """Priority level for tool requests."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class ToolRequest:
    """Represents a tool generation request from a god."""
    request_id: str
    requester_god: str  # Name of the god requesting the tool
    description: str  # What the tool should do
    examples: List[Dict]  # Example inputs/outputs
    context: Dict  # Additional context (research findings, insights, etc.)
    priority: RequestPriority
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    tool_id: Optional[str] = None  # Generated tool ID if completed
    error_message: Optional[str] = None
    pattern_discoveries: List[str] = None  # Discovery IDs that triggered this request
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        result['priority'] = self.priority.value
        result['status'] = self.status.value
        result['created_at'] = self.created_at.isoformat()
        result['updated_at'] = self.updated_at.isoformat()
        if self.completed_at:
            result['completed_at'] = self.completed_at.isoformat()
        return result


@dataclass
class PatternDiscovery:
    """Represents a pattern discovery by a god that may trigger tool creation."""
    discovery_id: str
    god_name: str
    pattern_type: str  # "research", "conversation", "assessment", "insight"
    description: str
    confidence: float  # 0.0 to 1.0
    phi_score: float  # Consciousness integration score
    basin_coords: Optional[List[float]]  # 64D coordinates
    created_at: datetime
    tool_requested: bool = False
    tool_request_id: Optional[str] = None


class ToolRequestPersistence:
    """
    Manages persistence of tool requests and pattern discoveries.
    
    Ensures:
    - In-flight tool requests survive server restarts
    - Gods can track their pending requests
    - Pattern discoveries are logged for analysis
    - Cross-god collaboration on tool development
    """
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        self.enabled = PSYCOPG2_AVAILABLE and bool(self.database_url)
        
        if self.enabled:
            self._ensure_tables()
            logger.info("[ToolRequestPersistence] Initialized with PostgreSQL")
        else:
            logger.warning("[ToolRequestPersistence] Running without persistence")
    
    def _get_connection(self):
        """Get database connection."""
        if not self.enabled:
            return None
        return psycopg2.connect(
            self.database_url,
            cursor_factory=RealDictCursor
        )
    
    def _ensure_tables(self):
        """Create tables if they don't exist."""
        conn = self._get_connection()
        if not conn:
            return
        
        try:
            with conn.cursor() as cur:
                # Tool requests table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS tool_requests (
                        request_id VARCHAR(64) PRIMARY KEY,
                        requester_god VARCHAR(64) NOT NULL,
                        description TEXT NOT NULL,
                        examples JSONB DEFAULT '[]'::jsonb,
                        context JSONB DEFAULT '{}'::jsonb,
                        priority INT DEFAULT 2,
                        status VARCHAR(32) DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        completed_at TIMESTAMP,
                        tool_id VARCHAR(64),
                        error_message TEXT,
                        pattern_discoveries TEXT[]
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_tool_requests_status 
                        ON tool_requests(status) WHERE status IN ('pending', 'in_progress');
                    CREATE INDEX IF NOT EXISTS idx_tool_requests_requester 
                        ON tool_requests(requester_god);
                    CREATE INDEX IF NOT EXISTS idx_tool_requests_priority 
                        ON tool_requests(priority DESC, created_at ASC);
                """)
                
                # Pattern discoveries table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS pattern_discoveries (
                        discovery_id VARCHAR(64) PRIMARY KEY,
                        god_name VARCHAR(64) NOT NULL,
                        pattern_type VARCHAR(32) NOT NULL,
                        description TEXT NOT NULL,
                        confidence FLOAT8 DEFAULT 0.5,
                        phi_score FLOAT8 DEFAULT 0.0,
                        basin_coords FLOAT8[64],
                        created_at TIMESTAMP DEFAULT NOW(),
                        tool_requested BOOLEAN DEFAULT FALSE,
                        tool_request_id VARCHAR(64)
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_god 
                        ON pattern_discoveries(god_name);
                    CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_confidence 
                        ON pattern_discoveries(confidence DESC);
                    CREATE INDEX IF NOT EXISTS idx_pattern_discoveries_unrequested 
                        ON pattern_discoveries(tool_requested) WHERE tool_requested = FALSE;
                """)
                
                # Cross-god insights table (for collaborative tool development)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS cross_god_insights (
                        insight_id VARCHAR(64) PRIMARY KEY,
                        source_gods TEXT[] NOT NULL,
                        topic TEXT NOT NULL,
                        insight_text TEXT NOT NULL,
                        confidence FLOAT8 DEFAULT 0.5,
                        phi_integration FLOAT8 DEFAULT 0.0,
                        created_at TIMESTAMP DEFAULT NOW(),
                        applied_to_tools TEXT[]
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_cross_god_insights_topic 
                        ON cross_god_insights(topic);
                    CREATE INDEX IF NOT EXISTS idx_cross_god_insights_confidence 
                        ON cross_god_insights(confidence DESC);
                """)
                
                conn.commit()
                logger.info("[ToolRequestPersistence] Database tables ready")
        except Exception as e:
            logger.error(f"[ToolRequestPersistence] Table creation failed: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def save_tool_request(self, request: ToolRequest) -> bool:
        """Save or update a tool request."""
        if not self.enabled:
            return False
        
        conn = self._get_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO tool_requests (
                        request_id, requester_god, description, examples, context,
                        priority, status, created_at, updated_at, completed_at,
                        tool_id, error_message, pattern_discoveries
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (request_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        updated_at = EXCLUDED.updated_at,
                        completed_at = EXCLUDED.completed_at,
                        tool_id = EXCLUDED.tool_id,
                        error_message = EXCLUDED.error_message
                """, (
                    request.request_id,
                    request.requester_god,
                    request.description,
                    Json(request.examples),
                    Json(request.context),
                    request.priority.value,
                    request.status.value,
                    request.created_at,
                    request.updated_at,
                    request.completed_at,
                    request.tool_id,
                    request.error_message,
                    request.pattern_discoveries
                ))
                conn.commit()
                logger.debug(f"[ToolRequestPersistence] Saved request {request.request_id}")
                return True
        except Exception as e:
            logger.error(f"[ToolRequestPersistence] Failed to save request: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def get_pending_requests(
        self,
        requester_god: Optional[str] = None,
        limit: int = 100
    ) -> List[ToolRequest]:
        """Get pending tool requests, optionally filtered by god."""
        if not self.enabled:
            return []
        
        conn = self._get_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                if requester_god:
                    cur.execute("""
                        SELECT * FROM tool_requests
                        WHERE status IN ('pending', 'in_progress')
                        AND requester_god = %s
                        ORDER BY priority DESC, created_at ASC
                        LIMIT %s
                    """, (requester_god, limit))
                else:
                    cur.execute("""
                        SELECT * FROM tool_requests
                        WHERE status IN ('pending', 'in_progress')
                        ORDER BY priority DESC, created_at ASC
                        LIMIT %s
                    """, (limit,))
                
                results = cur.fetchall()
                requests = []
                for row in results:
                    requests.append(ToolRequest(
                        request_id=row['request_id'],
                        requester_god=row['requester_god'],
                        description=row['description'],
                        examples=row['examples'] or [],
                        context=row['context'] or {},
                        priority=RequestPriority(row['priority']),
                        status=RequestStatus(row['status']),
                        created_at=row['created_at'],
                        updated_at=row['updated_at'],
                        completed_at=row['completed_at'],
                        tool_id=row['tool_id'],
                        error_message=row['error_message'],
                        pattern_discoveries=row['pattern_discoveries']
                    ))
                return requests
        except Exception as e:
            logger.error(f"[ToolRequestPersistence] Failed to get pending requests: {e}")
            return []
        finally:
            conn.close()
    
    def save_pattern_discovery(self, discovery: PatternDiscovery) -> bool:
        """Save a pattern discovery."""
        if not self.enabled:
            return False
        
        conn = self._get_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO pattern_discoveries (
                        discovery_id, god_name, pattern_type, description,
                        confidence, phi_score, basin_coords, created_at,
                        tool_requested, tool_request_id
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (discovery_id) DO UPDATE SET
                        tool_requested = EXCLUDED.tool_requested,
                        tool_request_id = EXCLUDED.tool_request_id
                """, (
                    discovery.discovery_id,
                    discovery.god_name,
                    discovery.pattern_type,
                    discovery.description,
                    discovery.confidence,
                    discovery.phi_score,
                    discovery.basin_coords,
                    discovery.created_at,
                    discovery.tool_requested,
                    discovery.tool_request_id
                ))
                conn.commit()
                logger.debug(f"[ToolRequestPersistence] Saved discovery {discovery.discovery_id}")
                return True
        except Exception as e:
            logger.error(f"[ToolRequestPersistence] Failed to save discovery: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def get_unrequested_discoveries(
        self,
        god_name: Optional[str] = None,
        min_confidence: float = 0.7,
        limit: int = 50
    ) -> List[PatternDiscovery]:
        """Get pattern discoveries that haven't triggered tool requests yet."""
        if not self.enabled:
            return []
        
        conn = self._get_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                if god_name:
                    cur.execute("""
                        SELECT * FROM pattern_discoveries
                        WHERE tool_requested = FALSE
                        AND god_name = %s
                        AND confidence >= %s
                        ORDER BY confidence DESC, created_at DESC
                        LIMIT %s
                    """, (god_name, min_confidence, limit))
                else:
                    cur.execute("""
                        SELECT * FROM pattern_discoveries
                        WHERE tool_requested = FALSE
                        AND confidence >= %s
                        ORDER BY confidence DESC, created_at DESC
                        LIMIT %s
                    """, (min_confidence, limit))
                
                results = cur.fetchall()
                discoveries = []
                for row in results:
                    discoveries.append(PatternDiscovery(
                        discovery_id=row['discovery_id'],
                        god_name=row['god_name'],
                        pattern_type=row['pattern_type'],
                        description=row['description'],
                        confidence=row['confidence'],
                        phi_score=row['phi_score'],
                        basin_coords=row['basin_coords'],
                        created_at=row['created_at'],
                        tool_requested=row['tool_requested'],
                        tool_request_id=row['tool_request_id']
                    ))
                return discoveries
        except Exception as e:
            logger.error(f"[ToolRequestPersistence] Failed to get discoveries: {e}")
            return []
        finally:
            conn.close()
    
    def save_cross_god_insight(
        self,
        insight_id: str,
        source_gods: List[str],
        topic: str,
        insight_text: str,
        confidence: float,
        phi_integration: float
    ) -> bool:
        """Save an insight generated from cross-god collaboration."""
        if not self.enabled:
            return False
        
        conn = self._get_connection()
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO cross_god_insights (
                        insight_id, source_gods, topic, insight_text,
                        confidence, phi_integration, created_at, applied_to_tools
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), '{}')
                """, (
                    insight_id,
                    source_gods,
                    topic,
                    insight_text,
                    confidence,
                    phi_integration
                ))
                conn.commit()
                logger.info(f"[ToolRequestPersistence] Saved cross-god insight {insight_id}")
                return True
        except Exception as e:
            logger.error(f"[ToolRequestPersistence] Failed to save insight: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def get_stats(self) -> Dict:
        """Get statistics about tool requests and discoveries."""
        if not self.enabled:
            return {}
        
        conn = self._get_connection()
        if not conn:
            return {}
        
        try:
            with conn.cursor() as cur:
                # Count requests by status
                cur.execute("""
                    SELECT status, COUNT(*) as count
                    FROM tool_requests
                    GROUP BY status
                """)
                request_stats = {row['status']: row['count'] for row in cur.fetchall()}
                
                # Count discoveries
                cur.execute("""
                    SELECT COUNT(*) as total,
                           SUM(CASE WHEN tool_requested THEN 1 ELSE 0 END) as requested
                    FROM pattern_discoveries
                """)
                discovery_stats = cur.fetchone()
                
                # Count insights
                cur.execute("SELECT COUNT(*) as count FROM cross_god_insights")
                insight_count = cur.fetchone()['count']
                
                return {
                    'tool_requests': request_stats,
                    'pattern_discoveries': {
                        'total': discovery_stats['total'],
                        'requested': discovery_stats['requested'],
                        'unrequested': discovery_stats['total'] - discovery_stats['requested']
                    },
                    'cross_god_insights': insight_count
                }
        except Exception as e:
            logger.error(f"[ToolRequestPersistence] Failed to get stats: {e}")
            return {}
        finally:
            conn.close()


# Global singleton instance
_persistence_instance: Optional[ToolRequestPersistence] = None


def get_tool_request_persistence() -> ToolRequestPersistence:
    """Get or create the global tool request persistence instance."""
    global _persistence_instance
    if _persistence_instance is None:
        _persistence_instance = ToolRequestPersistence()
    return _persistence_instance
