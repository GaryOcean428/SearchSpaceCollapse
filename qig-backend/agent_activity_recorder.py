"""
Agent Activity Recorder - Tracks autonomous agent discovery and learning events

Provides visibility into what agents are discovering, searching, and learning.
Records activities to PostgreSQL for frontend display.
"""

import os
import json
import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum

class ActivityType(Enum):
    SEARCH_STARTED = "search_started"
    SEARCH_COMPLETED = "search_completed"
    SOURCE_DISCOVERED = "source_discovered"
    SOURCE_SCRAPED = "source_scraped"
    CONTENT_LEARNED = "content_learned"
    CURRICULUM_LOADED = "curriculum_loaded"
    KERNEL_SPAWNED = "kernel_spawned"
    KERNEL_ACTIVATED = "kernel_activated"
    RESEARCH_INITIATED = "research_initiated"
    PATTERN_RECOGNIZED = "pattern_recognized"


class AgentActivityRecorder:
    """Records agent activity events to PostgreSQL for frontend visibility."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._connection = None
        self._listeners: List[callable] = []
        self._recent_activities: List[Dict[str, Any]] = []
        self._max_recent = 100
        
    def _get_connection(self):
        """Get or create database connection."""
        if self._connection is None:
            try:
                import psycopg2
                database_url = os.environ.get('DATABASE_URL')
                if database_url:
                    self._connection = psycopg2.connect(database_url)
                    self._connection.autocommit = True
            except Exception as e:
                print(f"[AgentActivity] DB connection failed: {e}")
        return self._connection
    
    def record(
        self,
        activity_type: ActivityType,
        title: str,
        description: Optional[str] = None,
        agent_id: Optional[str] = None,
        agent_name: Optional[str] = None,
        source_url: Optional[str] = None,
        search_query: Optional[str] = None,
        provider: Optional[str] = None,
        result_count: Optional[int] = None,
        phi: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[int]:
        """Record an agent activity event."""
        activity = {
            "activity_type": activity_type.value if isinstance(activity_type, ActivityType) else activity_type,
            "title": title,
            "description": description,
            "agent_id": agent_id,
            "agent_name": agent_name,
            "source_url": source_url,
            "search_query": search_query,
            "provider": provider,
            "result_count": result_count,
            "phi": phi,
            "metadata": metadata,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        
        self._recent_activities.insert(0, activity)
        if len(self._recent_activities) > self._max_recent:
            self._recent_activities = self._recent_activities[:self._max_recent]
        
        for listener in self._listeners:
            try:
                listener(activity)
            except Exception as e:
                print(f"[AgentActivity] Listener error: {e}")
        
        conn = self._get_connection()
        if not conn:
            return None
            
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_activity 
                (activity_type, title, description, agent_id, agent_name, 
                 source_url, search_query, provider, result_count, phi, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                activity["activity_type"],
                title,
                description,
                agent_id,
                agent_name,
                source_url,
                search_query,
                provider,
                result_count,
                phi,
                json.dumps(metadata) if metadata else None
            ))
            result = cursor.fetchone()
            activity["id"] = result[0] if result else None
            return activity["id"]
        except Exception as e:
            print(f"[AgentActivity] Record failed: {e}")
            return None
    
    def subscribe(self, listener: callable):
        """Subscribe to activity events for real-time streaming."""
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)
    
    def get_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent activities from memory cache."""
        return self._recent_activities[:limit]
    
    def get_from_db(
        self, 
        limit: int = 50, 
        offset: int = 0,
        activity_type: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch activities from database."""
        conn = self._get_connection()
        if not conn:
            return self.get_recent(limit)
        
        try:
            cursor = conn.cursor()
            query = "SELECT * FROM agent_activity WHERE 1=1"
            params = []
            
            if activity_type:
                query += " AND activity_type = %s"
                params.append(activity_type)
            if agent_id:
                query += " AND agent_id = %s"
                params.append(agent_id)
                
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            print(f"[AgentActivity] Query failed: {e}")
            return self.get_recent(limit)


activity_recorder = AgentActivityRecorder()


def _generate_agent_id(agent_name: Optional[str], prefix: str = "agent") -> str:
    """Generate a consistent agent_id from agent_name or use prefix with timestamp."""
    if agent_name:
        # Normalize: lowercase, replace spaces with dashes
        normalized = agent_name.lower().replace(' ', '-').replace('_', '-')
        return f"{normalized}-{int(time.time()) % 100000}"
    return f"{prefix}-{int(time.time()) % 100000}"


def record_search_started(
    query: str,
    provider: str,
    agent_name: Optional[str] = None,
    agent_id: Optional[str] = None
):
    """Convenience function to record a search start."""
    return activity_recorder.record(
        ActivityType.SEARCH_STARTED,
        f"Searching: {query}...",
        description=f"Initiated search via {provider}",
        search_query=query,
        provider=provider,
        agent_name=agent_name,
        agent_id=agent_id or _generate_agent_id(agent_name, "search")
    )


def record_search_completed(
    query: str,
    provider: str,
    result_count: int,
    agent_name: Optional[str] = None,
    agent_id: Optional[str] = None,
    phi: Optional[float] = None
):
    """Convenience function to record a search completion."""
    return activity_recorder.record(
        ActivityType.SEARCH_COMPLETED,
        f"Found {result_count} results for: {query}...",
        description=f"Search completed via {provider}",
        search_query=query,
        provider=provider,
        result_count=result_count,
        agent_name=agent_name,
        agent_id=agent_id or _generate_agent_id(agent_name, "search"),
        phi=phi
    )


def record_source_discovered(
    url: str,
    category: str,
    agent_name: Optional[str] = None,
    phi: Optional[float] = None,
    agent_id: Optional[str] = None
):
    """Convenience function to record a source discovery."""
    domain = url.split('/')[2] if '/' in url else url
    return activity_recorder.record(
        ActivityType.SOURCE_DISCOVERED,
        f"Discovered: {domain}",
        description=f"New {category} source added to registry",
        source_url=url,
        agent_name=agent_name,
        agent_id=agent_id or _generate_agent_id(agent_name, "discovery"),
        phi=phi,
        metadata={"category": category, "domain": domain}
    )


def record_content_learned(
    title: str,
    source: str,
    word_count: int = 0,
    agent_name: Optional[str] = None,
    agent_id: Optional[str] = None,
    phi: Optional[float] = None
):
    """Convenience function to record content learning."""
    return activity_recorder.record(
        ActivityType.CONTENT_LEARNED,
        f"Learned: {title}...",
        description=f"Processed {word_count} words from content",
        source_url=source,
        agent_name=agent_name,
        agent_id=agent_id or _generate_agent_id(agent_name, "learner"),
        result_count=word_count,
        phi=phi
    )


def record_curriculum_loaded(kernel_name: str, example_count: int):
    """Convenience function to record curriculum loading."""
    return activity_recorder.record(
        ActivityType.CURRICULUM_LOADED,
        f"{kernel_name} loaded curriculum",
        description=f"Loaded {example_count} training examples",
        agent_name=kernel_name,
        agent_id=f"curriculum-{kernel_name.lower()}-{int(time.time()) % 100000}",
        result_count=example_count
    )
