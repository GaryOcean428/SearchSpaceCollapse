"""
Pantheon Persistence
====================

Persists inter-god communication (messages, debates, knowledge transfers)
to PostgreSQL for durability across restarts.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Any

from .base_persistence import BasePersistence


class PantheonPersistence(BasePersistence):
    """Persistence layer for Olympus pantheon chat and debates."""

    def save_message(self, message: Dict) -> bool:
        """Save a message to the database."""
        query = """
            INSERT INTO pantheon_messages 
            (id, msg_type, from_god, to_god, content, metadata, is_read, is_responded, debate_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                is_read = EXCLUDED.is_read,
                is_responded = EXCLUDED.is_responded
        """
        try:
            metadata_json = json.dumps(message.get('metadata', {})) if message.get('metadata') else None
            timestamp = message.get('timestamp')
            if isinstance(timestamp, str):
                created_at = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            else:
                created_at = datetime.now()
            
            self.execute_query(query, (
                message['id'],
                message.get('type', 'insight'),
                message.get('from', ''),
                message.get('to', ''),
                message.get('content', ''),
                metadata_json,
                message.get('read', False),
                message.get('responded', False),
                message.get('debate_id'),
                created_at,
            ), fetch=False)
            return True
        except Exception as e:
            print(f"[PantheonPersistence] Failed to save message: {e}")
            return False

    def load_recent_messages(self, limit: int = 100) -> List[Dict]:
        """Load recent messages from the database in chronological order (oldest first)."""
        query = """
            SELECT id, msg_type, from_god, to_god, content, metadata,
                   is_read, is_responded, debate_id, created_at
            FROM pantheon_messages
            ORDER BY created_at ASC
            LIMIT %s
        """
        results = self.execute_query(query, (limit,))
        messages = []
        for row in results or []:
            # Parse metadata JSON if it's a string
            metadata = row['metadata']
            if isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except:
                    metadata = {}
            elif metadata is None:
                metadata = {}
            
            msg = {
                'id': row['id'],
                'type': row['msg_type'],
                'from': row['from_god'],
                'to': row['to_god'],
                'content': row['content'],
                'metadata': metadata,
                'read': row['is_read'],
                'responded': row['is_responded'],
                'debate_id': row['debate_id'],
                'timestamp': row['created_at'].isoformat() if row['created_at'] else None,
            }
            messages.append(msg)
        return messages

    def mark_message_read(self, message_id: str) -> bool:
        """Mark a message as read."""
        query = "UPDATE pantheon_messages SET is_read = TRUE WHERE id = %s"
        try:
            self.execute_query(query, (message_id,), fetch=False)
            return True
        except Exception as e:
            print(f"[PantheonPersistence] Failed to mark message read: {e}")
            return False

    def save_debate(self, debate: Dict) -> bool:
        """Save or update a debate."""
        query = """
            INSERT INTO pantheon_debates
            (id, topic, initiator, opponent, context, status, arguments, winner, arbiter, resolution, started_at, resolved_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                arguments = EXCLUDED.arguments,
                winner = EXCLUDED.winner,
                arbiter = EXCLUDED.arbiter,
                resolution = EXCLUDED.resolution,
                resolved_at = EXCLUDED.resolved_at
        """
        try:
            started_at = debate.get('started_at')
            if isinstance(started_at, str):
                started_at = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
            elif started_at is None:
                started_at = datetime.now()
            
            resolved_at = debate.get('resolved_at')
            if isinstance(resolved_at, str):
                resolved_at = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
            
            self.execute_query(query, (
                debate['id'],
                debate.get('topic', ''),
                debate.get('initiator', ''),
                debate.get('opponent', ''),
                json.dumps(debate.get('context', {})) if debate.get('context') else None,
                debate.get('status', 'active'),
                json.dumps(debate.get('arguments', [])),
                debate.get('winner'),
                debate.get('arbiter'),
                json.dumps(debate.get('resolution', {})) if debate.get('resolution') else None,
                started_at,
                resolved_at,
            ), fetch=False)
            return True
        except Exception as e:
            print(f"[PantheonPersistence] Failed to save debate: {e}")
            return False

    def load_debates(self, status: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Load debates from the database."""
        if status:
            query = """
                SELECT * FROM pantheon_debates
                WHERE status = %s
                ORDER BY started_at DESC
                LIMIT %s
            """
            results = self.execute_query(query, (status, limit))
        else:
            query = """
                SELECT * FROM pantheon_debates
                ORDER BY started_at DESC
                LIMIT %s
            """
            results = self.execute_query(query, (limit,))
        
        debates = []
        for row in results or []:
            # Parse JSON fields if they're strings
            context = row['context']
            if isinstance(context, str):
                try:
                    context = json.loads(context)
                except:
                    context = {}
            elif context is None:
                context = {}
            
            arguments = row['arguments']
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except:
                    arguments = []
            elif arguments is None:
                arguments = []
            
            resolution = row['resolution']
            if isinstance(resolution, str):
                try:
                    resolution = json.loads(resolution)
                except:
                    resolution = {}
            elif resolution is None:
                resolution = {}
            
            debate = {
                'id': row['id'],
                'topic': row['topic'],
                'initiator': row['initiator'],
                'opponent': row['opponent'],
                'context': context,
                'status': row['status'],
                'arguments': arguments,
                'winner': row['winner'],
                'arbiter': row['arbiter'],
                'resolution': resolution,
                'started_at': row['started_at'].isoformat() if row['started_at'] else None,
                'resolved_at': row['resolved_at'].isoformat() if row['resolved_at'] else None,
            }
            debates.append(debate)
        return debates

    def save_knowledge_transfer(self, transfer: Dict) -> bool:
        """Save a knowledge transfer event."""
        query = """
            INSERT INTO pantheon_knowledge_transfers
            (from_god, to_god, knowledge_type, content, accepted, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        try:
            self.execute_query(query, (
                transfer.get('from', ''),
                transfer.get('to', ''),
                transfer.get('type', 'insight'),
                json.dumps(transfer.get('content', {})) if transfer.get('content') else None,
                transfer.get('accepted', False),
                datetime.now(),
            ), fetch=False)
            return True
        except Exception as e:
            print(f"[PantheonPersistence] Failed to save knowledge transfer: {e}")
            return False

    def load_knowledge_transfers(self, limit: int = 100) -> List[Dict]:
        """Load recent knowledge transfers in chronological order."""
        query = """
            SELECT * FROM pantheon_knowledge_transfers
            ORDER BY created_at ASC
            LIMIT %s
        """
        results = self.execute_query(query, (limit,))
        transfers = []
        for row in results or []:
            # Parse content JSON if it's a string
            content = row['content']
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except:
                    content = {}
            elif content is None:
                content = {}
            
            transfer = {
                'id': row['id'],
                'from': row['from_god'],
                'to': row['to_god'],
                'type': row['knowledge_type'],
                'content': content,
                'accepted': row['accepted'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None,
            }
            transfers.append(transfer)
        return transfers


# Singleton instance
_instance: Optional[PantheonPersistence] = None


def get_pantheon_persistence() -> PantheonPersistence:
    """Get the singleton PantheonPersistence instance."""
    global _instance
    if _instance is None:
        _instance = PantheonPersistence()
    return _instance
