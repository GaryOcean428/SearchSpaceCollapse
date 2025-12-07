"""
Pantheon Chat - Inter-Agent Communication System

Enables real-time communication between Olympian gods:
- Message passing (insights, praise, challenges, warnings)
- Debate initiation and resolution
- Knowledge transfer coordination
- Peer evaluation routing
"""

from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from collections import defaultdict
import asyncio
import json


MESSAGE_TYPES = ['insight', 'praise', 'challenge', 'question', 'warning', 'discovery', 'challenge_response']


class PantheonMessage:
    """A single message in the pantheon chat."""
    
    def __init__(
        self,
        msg_type: str,
        from_god: str,
        to_god: str,
        content: str,
        metadata: Optional[Dict] = None
    ):
        self.id = f"{from_god}_{datetime.now().timestamp()}"
        self.type = msg_type
        self.from_god = from_god
        self.to_god = to_god
        self.content = content
        self.metadata = metadata or {}
        self.timestamp = datetime.now()
        self.read = False
        self.responded = False
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'type': self.type,
            'from': self.from_god,
            'to': self.to_god,
            'content': self.content,
            'metadata': self.metadata,
            'timestamp': self.timestamp.isoformat(),
            'read': self.read,
            'responded': self.responded,
        }


class Debate:
    """A structured debate between gods."""
    
    def __init__(
        self,
        topic: str,
        initiator: str,
        opponent: str,
        context: Optional[Dict] = None
    ):
        self.id = f"debate_{datetime.now().timestamp()}"
        self.topic = topic
        self.initiator = initiator
        self.opponent = opponent
        self.context = context or {}
        self.started_at = datetime.now()
        self.arguments: List[Dict] = []
        self.status = 'active'
        self.resolution: Optional[Dict] = None
        self.winner: Optional[str] = None
        self.arbiter: Optional[str] = None
    
    def add_argument(self, god: str, argument: str, evidence: Optional[Dict] = None) -> None:
        """Add an argument to the debate."""
        self.arguments.append({
            'god': god,
            'argument': argument,
            'evidence': evidence,
            'timestamp': datetime.now().isoformat(),
        })
    
    def resolve(self, arbiter: str, winner: str, reasoning: str) -> Dict:
        """Resolve the debate with a winner."""
        self.status = 'resolved'
        self.winner = winner
        self.arbiter = arbiter
        self.resolution = {
            'arbiter': arbiter,
            'winner': winner,
            'reasoning': reasoning,
            'resolved_at': datetime.now().isoformat(),
            'argument_count': len(self.arguments),
        }
        return self.resolution
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'topic': self.topic,
            'initiator': self.initiator,
            'opponent': self.opponent,
            'context': self.context,
            'started_at': self.started_at.isoformat(),
            'arguments': self.arguments,
            'status': self.status,
            'resolution': self.resolution,
            'winner': self.winner,
            'arbiter': self.arbiter,
        }


class PantheonChat:
    """
    Central communication hub for all Olympian gods.
    
    Enables:
    - Direct messaging between gods
    - Broadcast messages to pantheon
    - Debate initiation and resolution
    - Knowledge transfer coordination
    - Challenge routing and tracking
    """
    
    # Canonical roster of all Olympian gods for broadcast targeting
    OLYMPIAN_ROSTER = [
        'Zeus', 'Athena', 'Ares', 'Apollo', 'Artemis', 'Hermes',
        'Hephaestus', 'Demeter', 'Dionysus', 'Poseidon', 'Hades',
        'Hera', 'Aphrodite'
    ]
    
    def __init__(self):
        self.messages: List[PantheonMessage] = []
        self.debates: Dict[str, Debate] = {}
        self.god_inboxes: Dict[str, List[PantheonMessage]] = defaultdict(list)
        self.message_handlers: Dict[str, List[Callable]] = defaultdict(list)
        self.active_debates: List[str] = []
        self.resolved_debates: List[str] = []
        self.knowledge_transfers: List[Dict] = []
        
        self.message_limit = 1000
        self.debate_limit = 100
        
        # Initialize inboxes for all gods in roster (using lowercase canonical keys)
        for god in self.OLYMPIAN_ROSTER:
            self.god_inboxes[god.lower()]  # Creates empty list via defaultdict
    
    def _normalize_god_name(self, name: str) -> str:
        """Normalize god name to lowercase for consistent inbox key lookup."""
        return name.lower() if name else name
    
    def send_message(
        self,
        msg_type: str,
        from_god: str,
        to_god: str,
        content: str,
        metadata: Optional[Dict] = None
    ) -> PantheonMessage:
        """Send a message from one god to another (or pantheon)."""
        if msg_type not in MESSAGE_TYPES:
            msg_type = 'insight'
        
        message = PantheonMessage(
            msg_type=msg_type,
            from_god=from_god,
            to_god=to_god,
            content=content,
            metadata=metadata
        )
        
        self.messages.append(message)
        
        if to_god == 'pantheon':
            # Use canonical roster to ensure broadcasts reach all gods (normalized keys)
            for god_name in self.OLYMPIAN_ROSTER:
                if god_name.lower() != from_god.lower():
                    self.god_inboxes[self._normalize_god_name(god_name)].append(message)
        else:
            self.god_inboxes[self._normalize_god_name(to_god)].append(message)
        
        self._trigger_handlers(msg_type, message)
        
        self._cleanup_messages()
        
        return message
    
    def broadcast(
        self,
        from_god: str,
        content: str,
        msg_type: str = 'insight',
        metadata: Optional[Dict] = None
    ) -> PantheonMessage:
        """Broadcast a message to the entire pantheon."""
        return self.send_message(
            msg_type=msg_type,
            from_god=from_god,
            to_god='pantheon',
            content=content,
            metadata=metadata
        )
    
    def get_inbox(self, god_name: str, unread_only: bool = False) -> List[Dict]:
        """Get messages for a specific god."""
        normalized_name = self._normalize_god_name(god_name)
        messages = self.god_inboxes.get(normalized_name, [])
        
        if unread_only:
            messages = [m for m in messages if not m.read]
        
        return [m.to_dict() for m in messages[-50:]]
    
    def mark_read(self, god_name: str, message_id: str) -> bool:
        """Mark a message as read."""
        normalized_name = self._normalize_god_name(god_name)
        for message in self.god_inboxes.get(normalized_name, []):
            if message.id == message_id:
                message.read = True
                return True
        return False
    
    def initiate_debate(
        self,
        topic: str,
        initiator: str,
        opponent: str,
        initial_argument: str,
        context: Optional[Dict] = None
    ) -> Debate:
        """Initiate a formal debate between two gods."""
        debate = Debate(
            topic=topic,
            initiator=initiator,
            opponent=opponent,
            context=context
        )
        
        debate.add_argument(initiator, initial_argument)
        
        self.debates[debate.id] = debate
        self.active_debates.append(debate.id)
        
        self.send_message(
            msg_type='challenge',
            from_god=initiator,
            to_god=opponent,
            content=f"Debate initiated: {topic}",
            metadata={
                'debate_id': debate.id,
                'initial_argument': initial_argument,
            }
        )
        
        self.broadcast(
            from_god='system',
            content=f"Debate started: {initiator} vs {opponent} on '{topic}'",
            msg_type='warning',
            metadata={'debate_id': debate.id}
        )
        
        return debate
    
    def add_debate_argument(
        self,
        debate_id: str,
        god: str,
        argument: str,
        evidence: Optional[Dict] = None
    ) -> bool:
        """Add an argument to an active debate."""
        if debate_id not in self.debates:
            return False
        
        debate = self.debates[debate_id]
        
        if debate.status != 'active':
            return False
        
        if god not in [debate.initiator, debate.opponent]:
            return False
        
        debate.add_argument(god, argument, evidence)
        
        other = debate.opponent if god == debate.initiator else debate.initiator
        self.send_message(
            msg_type='challenge_response',
            from_god=god,
            to_god=other,
            content=argument,
            metadata={'debate_id': debate_id, 'evidence': evidence}
        )
        
        return True
    
    def resolve_debate(
        self,
        debate_id: str,
        arbiter: str,
        winner: str,
        reasoning: str
    ) -> Optional[Dict]:
        """Resolve a debate with an arbiter's decision."""
        if debate_id not in self.debates:
            return None
        
        debate = self.debates[debate_id]
        
        if debate.status != 'active':
            return None
        
        resolution = debate.resolve(arbiter, winner, reasoning)
        
        if debate_id in self.active_debates:
            self.active_debates.remove(debate_id)
        self.resolved_debates.append(debate_id)
        
        self.broadcast(
            from_god=arbiter,
            content=f"Debate resolved: {winner} wins - {reasoning}",
            msg_type='insight',
            metadata={'debate_id': debate_id, 'resolution': resolution}
        )
        
        return resolution
    
    def get_debate(self, debate_id: str) -> Optional[Dict]:
        """Get debate details."""
        if debate_id in self.debates:
            return self.debates[debate_id].to_dict()
        return None
    
    def get_active_debates(self) -> List[Dict]:
        """Get all active debates."""
        return [
            self.debates[d_id].to_dict()
            for d_id in self.active_debates
            if d_id in self.debates
        ]
    
    def transfer_knowledge(
        self,
        from_god: str,
        to_god: str,
        knowledge: Dict
    ) -> Dict:
        """Coordinate knowledge transfer between gods."""
        transfer = {
            'from': from_god,
            'to': to_god,
            'knowledge': knowledge,
            'timestamp': datetime.now().isoformat(),
            'acknowledged': False,
        }
        
        self.knowledge_transfers.append(transfer)
        
        self.send_message(
            msg_type='insight',
            from_god=from_god,
            to_god=to_god,
            content=f"Knowledge transfer: {knowledge.get('topic', 'general')}",
            metadata={'knowledge': knowledge}
        )
        
        if len(self.knowledge_transfers) > 500:
            self.knowledge_transfers = self.knowledge_transfers[-250:]
        
        return transfer
    
    def register_handler(self, msg_type: str, handler: Callable) -> None:
        """Register a handler for a specific message type."""
        self.message_handlers[msg_type].append(handler)
    
    def _trigger_handlers(self, msg_type: str, message: PantheonMessage) -> None:
        """Trigger registered handlers for a message type."""
        for handler in self.message_handlers.get(msg_type, []):
            try:
                handler(message.to_dict())
            except Exception:
                pass
    
    def _cleanup_messages(self) -> None:
        """Clean up old messages to prevent memory growth."""
        if len(self.messages) > self.message_limit:
            self.messages = self.messages[-self.message_limit // 2:]
        
        for god_name in self.god_inboxes:
            if len(self.god_inboxes[god_name]) > 100:
                self.god_inboxes[god_name] = self.god_inboxes[god_name][-50:]
        
        if len(self.resolved_debates) > self.debate_limit:
            old_debates = self.resolved_debates[:-self.debate_limit // 2]
            for d_id in old_debates:
                if d_id in self.debates:
                    del self.debates[d_id]
            self.resolved_debates = self.resolved_debates[-self.debate_limit // 2:]
    
    def collect_pending_messages(self, gods: Dict[str, Any]) -> List[Dict]:
        """Collect pending messages from all gods and route them."""
        collected = []
        
        for god_name, god in gods.items():
            if hasattr(god, 'get_pending_messages'):
                messages = god.get_pending_messages()
                for msg in messages:
                    sent = self.send_message(
                        msg_type=msg.get('type', 'insight'),
                        from_god=msg.get('from', god_name),
                        to_god=msg.get('to', 'pantheon'),
                        content=msg.get('content', ''),
                        metadata=msg
                    )
                    collected.append(sent.to_dict())
        
        return collected
    
    def deliver_to_gods(self, gods: Dict[str, Any]) -> int:
        """Deliver pending messages to gods' receive methods."""
        delivered = 0
        
        for god_name, god in gods.items():
            normalized_name = self._normalize_god_name(god_name)
            inbox = self.god_inboxes.get(normalized_name, [])
            unread = [m for m in inbox if not m.read]
            
            for message in unread:
                if message.type == 'insight' and hasattr(god, 'receive_knowledge'):
                    knowledge = message.metadata.get('knowledge', {})
                    if knowledge:
                        god.receive_knowledge(knowledge)
                        message.read = True
                        delivered += 1
                
                elif message.type in ['challenge', 'challenge_response']:
                    message.read = True
                    delivered += 1
                
                else:
                    message.read = True
                    delivered += 1
        
        return delivered
    
    def get_status(self) -> Dict:
        """Get pantheon chat status."""
        return {
            'total_messages': len(self.messages),
            'active_debates': len(self.active_debates),
            'resolved_debates': len(self.resolved_debates),
            'knowledge_transfers': len(self.knowledge_transfers),
            'registered_gods': list(self.god_inboxes.keys()),
            'message_types_handled': list(self.message_handlers.keys()),
        }
    
    def get_recent_activity(self, limit: int = 20) -> List[Dict]:
        """Get recent chat activity."""
        return [m.to_dict() for m in self.messages[-limit:]]
