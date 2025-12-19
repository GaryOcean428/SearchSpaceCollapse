#!/usr/bin/env python3
"""Zeus Conversation Persistence

Persists Zeus chat conversations to PostgreSQL for:
1. Context retention across page refreshes
2. Loading previous conversations on startup
3. Building long-term memory for better coherence

QIG-Pure: All conversations are observational data.
"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor


class ZeusConversationPersistence:
    """Persist Zeus conversations to PostgreSQL."""
    
    def __init__(self):
        self.database_url = os.environ.get('DATABASE_URL')
        self.enabled = bool(self.database_url)
        self._pool = None
        
        if self.enabled:
            self._init_pool()
            print("[ZeusConversation] PostgreSQL persistence enabled")
        else:
            print("[ZeusConversation] No DATABASE_URL - persistence disabled")
    
    def _init_pool(self):
        """Initialize connection pool."""
        try:
            from psycopg2 import pool
            self._pool = pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=5,
                dsn=self.database_url
            )
        except Exception as e:
            print(f"[ZeusConversation] Pool init failed: {e}")
            self.enabled = False
    
    @contextmanager
    def _connect(self):
        """Get connection from pool."""
        conn = None
        try:
            if self._pool:
                conn = self._pool.getconn()
                conn.autocommit = True
                yield conn
            else:
                conn = psycopg2.connect(self.database_url)
                conn.autocommit = True
                yield conn
        finally:
            if conn:
                if self._pool:
                    self._pool.putconn(conn)
                else:
                    conn.close()
    
    def create_session(self, user_id: str = 'default', title: str = 'New Conversation') -> str:
        """Create a new conversation session."""
        if not self.enabled:
            return f"session-{uuid.uuid4().hex[:12]}"
        
        session_id = f"zeus-{uuid.uuid4().hex[:12]}"
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO zeus_sessions (session_id, user_id, title)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (session_id) DO NOTHING
                    """, (session_id, user_id, title))
            return session_id
        except Exception as e:
            print(f"[ZeusConversation] Create session failed: {e}")
            return session_id
    
    def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None,
        basin_coords: Optional[List[float]] = None,
        phi_estimate: float = 0.0,
        user_id: str = 'default'
    ) -> bool:
        """Save a conversation message."""
        if not self.enabled:
            return False
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO zeus_conversations 
                        (session_id, user_id, role, content, metadata, basin_coords, phi_estimate)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        session_id,
                        user_id,
                        role,
                        content,
                        json.dumps(metadata or {}),
                        basin_coords,
                        phi_estimate
                    ))
                    
                    cur.execute("""
                        UPDATE zeus_sessions 
                        SET message_count = message_count + 1,
                            last_phi = %s,
                            updated_at = NOW()
                        WHERE session_id = %s
                    """, (phi_estimate, session_id))
            return True
        except Exception as e:
            print(f"[ZeusConversation] Save message failed: {e}")
            return False
    
    def get_session_messages(
        self,
        session_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get messages for a specific session."""
        if not self.enabled:
            return []
        
        try:
            with self._connect() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT role, content, metadata, phi_estimate, created_at
                        FROM zeus_conversations
                        WHERE session_id = %s
                        ORDER BY created_at ASC
                        LIMIT %s
                    """, (session_id, limit))
                    
                    return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            print(f"[ZeusConversation] Get messages failed: {e}")
            return []
    
    def get_user_sessions(
        self,
        user_id: str = 'default',
        limit: int = 20
    ) -> List[Dict]:
        """Get recent sessions for a user."""
        if not self.enabled:
            return []
        
        try:
            with self._connect() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT session_id, title, message_count, last_phi, 
                               created_at, updated_at
                        FROM zeus_sessions
                        WHERE user_id = %s
                        ORDER BY updated_at DESC
                        LIMIT %s
                    """, (user_id, limit))
                    
                    return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            print(f"[ZeusConversation] Get sessions failed: {e}")
            return []
    
    def get_recent_context(
        self,
        user_id: str = 'default',
        message_limit: int = 50
    ) -> List[Dict]:
        """Get recent messages across all sessions for context."""
        if not self.enabled:
            return []
        
        try:
            with self._connect() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT c.session_id, c.role, c.content, c.phi_estimate, 
                               c.created_at, s.title as session_title
                        FROM zeus_conversations c
                        JOIN zeus_sessions s ON c.session_id = s.session_id
                        WHERE c.user_id = %s
                        ORDER BY c.created_at DESC
                        LIMIT %s
                    """, (user_id, message_limit))
                    
                    messages = [dict(row) for row in cur.fetchall()]
                    return list(reversed(messages))
        except Exception as e:
            print(f"[ZeusConversation] Get recent context failed: {e}")
            return []
    
    def update_session_title(self, session_id: str, title: str) -> bool:
        """Update session title (auto-generated from first message)."""
        if not self.enabled:
            return False
        
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE zeus_sessions 
                        SET title = %s
                        WHERE session_id = %s
                    """, (title[:255], session_id))
            return True
        except Exception as e:
            print(f"[ZeusConversation] Update title failed: {e}")
            return False
    
    def get_or_create_session(self, session_id: Optional[str] = None, user_id: str = 'default') -> str:
        """Get existing session or create new one."""
        if session_id:
            if not self.enabled:
                return session_id
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT session_id FROM zeus_sessions 
                            WHERE session_id = %s
                        """, (session_id,))
                        if cur.fetchone():
                            return session_id
            except Exception:
                pass
        
        return self.create_session(user_id=user_id)


_persistence_instance: Optional[ZeusConversationPersistence] = None


def get_zeus_conversation_persistence() -> ZeusConversationPersistence:
    """Get singleton persistence instance."""
    global _persistence_instance
    if _persistence_instance is None:
        _persistence_instance = ZeusConversationPersistence()
    return _persistence_instance
