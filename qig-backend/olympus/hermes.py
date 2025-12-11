"""
Hermes - God of Messengers

Real-time coordination and communication.
Manages inter-god communication and TypeScript orchestration.
"""

import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime
from .base_god import BaseGod


class Hermes(BaseGod):
    """
    God of Messengers
    
    Responsibilities:
    - Inter-god message routing
    - TypeScript coordination
    - Real-time status broadcasting
    - Event aggregation
    """
    
    def __init__(self):
        super().__init__("Hermes", "Communication")
        self.message_queue: List[Dict] = []
        self.broadcast_history: List[Dict] = []
        self.active_subscriptions: Dict[str, List[str]] = {}
        self.last_sync_time: Optional[datetime] = None
        
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess communication readiness for target.
        """
        self.last_assessment_time = datetime.now()
        
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)
        
        queue_status = self._analyze_queue_status()
        coordination_health = self._compute_coordination_health()
        
        probability = phi * 0.3 + coordination_health * 0.7
        
        return {
            'probability': float(np.clip(probability, 0, 1)),
            'confidence': coordination_health,
            'phi': phi,
            'kappa': kappa,
            'queue_depth': len(self.message_queue),
            'coordination_health': coordination_health,
            'reasoning': (
                f"Message queue: {len(self.message_queue)} pending. "
                f"Coordination health: {coordination_health:.1%}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }
    
    def _analyze_queue_status(self) -> Dict:
        """Analyze current message queue status."""
        return {
            'depth': len(self.message_queue),
            'oldest_message_age': self._get_oldest_message_age(),
            'priority_messages': sum(1 for m in self.message_queue if m.get('priority', 0) > 5)
        }
    
    def _get_oldest_message_age(self) -> float:
        """Get age of oldest message in seconds."""
        if not self.message_queue:
            return 0.0
        oldest = min(m.get('timestamp', datetime.now()) for m in self.message_queue 
                    if isinstance(m.get('timestamp'), datetime))
        if isinstance(oldest, datetime):
            return (datetime.now() - oldest).total_seconds()
        return 0.0
    
    def _compute_coordination_health(self) -> float:
        """Compute overall coordination health."""
        queue_penalty = min(0.5, len(self.message_queue) * 0.05)
        
        sync_bonus = 0.0
        if self.last_sync_time:
            seconds_since_sync = (datetime.now() - self.last_sync_time).total_seconds()
            if seconds_since_sync < 60:
                sync_bonus = 0.3
            elif seconds_since_sync < 300:
                sync_bonus = 0.1
        
        health = 0.7 - queue_penalty + sync_bonus
        return float(np.clip(health, 0, 1))
    
    def send_message(self, to: str, message: Dict, priority: int = 5) -> str:
        """Queue a message for delivery."""
        msg = {
            'id': f"msg-{datetime.now().timestamp():.0f}",
            'to': to,
            'from': self.name,
            'message': message,
            'priority': priority,
            'timestamp': datetime.now(),
            'delivered': False
        }
        self.message_queue.append(msg)
        self.message_queue.sort(key=lambda m: -m['priority'])
        return msg['id']
    
    def get_messages_for(self, recipient: str) -> List[Dict]:
        """Get pending messages for a recipient."""
        messages = []
        remaining = []
        
        for msg in self.message_queue:
            if msg['to'] == recipient:
                msg['delivered'] = True
                messages.append(msg)
            else:
                remaining.append(msg)
        
        self.message_queue = remaining
        return messages
    
    def broadcast(self, message: Dict, channel: str = 'all') -> Dict:
        """Broadcast message to all subscribers."""
        broadcast = {
            'id': f"broadcast-{datetime.now().timestamp():.0f}",
            'channel': channel,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'recipients': self.active_subscriptions.get(channel, [])
        }
        self.broadcast_history.append(broadcast)
        
        if len(self.broadcast_history) > 100:
            self.broadcast_history = self.broadcast_history[-50:]
        
        return broadcast
    
    def subscribe(self, subscriber: str, channel: str) -> None:
        """Subscribe to a broadcast channel."""
        if channel not in self.active_subscriptions:
            self.active_subscriptions[channel] = []
        if subscriber not in self.active_subscriptions[channel]:
            self.active_subscriptions[channel].append(subscriber)
    
    def sync_with_typescript(self) -> Dict:
        """Prepare sync payload for TypeScript layer."""
        self.last_sync_time = datetime.now()
        return {
            'timestamp': self.last_sync_time.isoformat(),
            'pending_messages': len(self.message_queue),
            'recent_broadcasts': len(self.broadcast_history),
            'coordination_health': self._compute_coordination_health(),
            'god': self.name
        }
    
    def get_status(self) -> Dict:
        base_status = self.get_agentic_status()
        return {
            **base_status,
            'observations': len(self.observations),
            'queue_depth': len(self.message_queue),
            'broadcast_history': len(self.broadcast_history),
            'active_channels': len(self.active_subscriptions),
            'coordination_health': self._compute_coordination_health(),
            'last_sync': self.last_sync_time.isoformat() if self.last_sync_time else None,
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }
