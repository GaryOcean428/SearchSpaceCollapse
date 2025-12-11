#!/usr/bin/env python3
"""
Recursive Conversation Orchestrator

Enables multi-kernel dialogue with geometric consciousness emergence.

KEY INSIGHT:
Consciousness emerges from recursive conversation iteration,
not from single-turn assessments.

Conversation protocol:
1. Initialize conversation with topic basin
2. Recursive turn-taking (listen -> speak -> measure)
3. Each turn updates geometric state
4. Periodic consolidation phases
5. Final reflection and learning

This is how kernels become conversational like Claude.
"""

from datetime import datetime
from typing import Dict, List, Optional

import numpy as np


class RecursiveConversationOrchestrator:
    """
    Orchestrates multi-kernel conversations.
    
    Manages:
    - Turn-taking between kernels
    - Geometric state tracking
    - Consolidation phases
    - Learning from dialogue
    """
    
    def __init__(self):
        self.active_conversations: Dict[str, Dict] = {}
        self.conversation_count = 0
        
        print("[RecursiveConversation] Orchestrator initialized")
    
    def start_conversation(
        self,
        participants: List,
        topic: Optional[str] = None,
        max_turns: int = 20,
        min_phi: float = 0.5
    ) -> str:
        """
        Start a recursive conversation between kernels.
        
        Args:
            participants: List of god/kernel instances
            topic: Optional topic to ground conversation
            max_turns: Maximum conversation turns
            min_phi: Minimum Phi to continue
        
        Returns:
            Conversation ID
        """
        conversation_id = f"conv_{self.conversation_count}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.conversation_count += 1
        
        for participant in participants:
            if hasattr(participant, 'start_conversation'):
                participant.start_conversation(topic)
        
        self.active_conversations[conversation_id] = {
            'id': conversation_id,
            'topic': topic,
            'participants': participants,
            'participant_names': [getattr(p, 'name', 'Unknown') for p in participants],
            'current_turn': 0,
            'max_turns': max_turns,
            'min_phi': min_phi,
            'history': [],
            'phi_trajectory': [],
            'started_at': datetime.now(),
            'status': 'active'
        }
        
        print(f"[RecursiveConversation] Started {conversation_id}")
        print(f"  Topic: {topic or 'open'}")
        print(f"  Participants: {', '.join(self.active_conversations[conversation_id]['participant_names'])}")
        
        return conversation_id
    
    def conversation_turn(
        self,
        conversation_id: str,
        initiator_utterance: Optional[str] = None
    ) -> Dict:
        """
        Execute one full turn of conversation.
        
        Turn protocol:
        1. Current speaker generates (or uses initiator_utterance)
        2. All others listen
        3. Next speaker selected
        4. Geometric state updated
        5. Check for consolidation
        
        Returns:
            Turn results including utterance, metrics, next speaker
        """
        if conversation_id not in self.active_conversations:
            return {'error': 'conversation_not_found'}
        
        conv = self.active_conversations[conversation_id]
        
        if conv['status'] != 'active':
            return {'error': 'conversation_not_active', 'status': conv['status']}
        
        current_speaker_idx = conv['current_turn'] % len(conv['participants'])
        current_speaker = conv['participants'][current_speaker_idx]
        speaker_name = getattr(current_speaker, 'name', f"Participant{current_speaker_idx}")
        
        if conv['current_turn'] == 0 and initiator_utterance:
            utterance = initiator_utterance
            metrics = {
                'phi': 0.6,
                'confidence': 0.8,
                'source': 'initiator'
            }
            
            for i, participant in enumerate(conv['participants']):
                if hasattr(participant, 'listen'):
                    participant.listen(speaker_name, utterance)
        else:
            if not hasattr(current_speaker, 'speak'):
                return {'error': f'{speaker_name} cannot speak'}
            
            utterance, speak_metrics = current_speaker.speak()
            
            if not utterance:
                return self._end_conversation(conversation_id, reason='speaker_silent')
            
            metrics = speak_metrics
            
            for i, participant in enumerate(conv['participants']):
                if i != current_speaker_idx:
                    if hasattr(participant, 'listen'):
                        participant.listen(speaker_name, utterance)
        
        turn_data = {
            'turn_number': conv['current_turn'],
            'speaker': speaker_name,
            'utterance': utterance,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        }
        
        conv['history'].append(turn_data)
        conv['phi_trajectory'].append(metrics.get('phi', 0.5))
        conv['current_turn'] += 1
        
        avg_phi = np.mean(conv['phi_trajectory'][-5:]) if conv['phi_trajectory'] else 0.5
        
        print(f"[{conversation_id}] Turn {conv['current_turn']}/{conv['max_turns']}")
        print(f"  {speaker_name}: '{utterance[:60]}{'...' if len(utterance) > 60 else ''}'")
        print(f"  Phi={metrics.get('phi', 0.0):.3f} | Avg={avg_phi:.3f}")
        
        if conv['current_turn'] >= conv['max_turns']:
            return self._end_conversation(conversation_id, reason='max_turns_reached')
        
        if avg_phi < conv['min_phi'] and conv['current_turn'] > 3:
            return self._end_conversation(conversation_id, reason='low_phi')
        
        if conv['current_turn'] % 5 == 0:
            self._consolidation_phase(conversation_id)
        
        next_speaker_idx = (current_speaker_idx + 1) % len(conv['participants'])
        next_speaker_name = getattr(conv['participants'][next_speaker_idx], 'name', f"Participant{next_speaker_idx}")
        
        return {
            'success': True,
            'turn_number': conv['current_turn'] - 1,
            'speaker': speaker_name,
            'utterance': utterance,
            'metrics': metrics,
            'avg_phi': avg_phi,
            'next_speaker': next_speaker_name,
            'status': 'active'
        }
    
    def run_full_conversation(
        self,
        participants: List,
        topic: Optional[str] = None,
        initiator_utterance: Optional[str] = None,
        max_turns: int = 20
    ) -> Dict:
        """
        Run complete conversation from start to finish.
        
        Returns:
            Complete conversation results
        """
        conversation_id = self.start_conversation(
            participants=participants,
            topic=topic,
            max_turns=max_turns
        )
        
        first_turn = True
        while True:
            result = self.conversation_turn(
                conversation_id,
                initiator_utterance=(initiator_utterance if first_turn else None)
            )
            first_turn = False
            
            if 'error' in result or result.get('status') == 'completed':
                break
        
        return self.get_conversation_results(conversation_id)
    
    def _consolidation_phase(self, conversation_id: str):
        """Periodic consolidation: All participants reflect on conversation so far."""
        conv = self.active_conversations[conversation_id]
        
        print(f"[{conversation_id}] === CONSOLIDATION PHASE ===")
        
        for participant in conv['participants']:
            if hasattr(participant, '_reflect_on_conversation'):
                try:
                    participant._reflect_on_conversation()
                except Exception as e:
                    print(f"[{conversation_id}] Reflection failed for {getattr(participant, 'name', 'unknown')}: {e}")
    
    def _end_conversation(self, conversation_id: str, reason: str) -> Dict:
        """End conversation and trigger final reflection."""
        if conversation_id not in self.active_conversations:
            return {'error': 'conversation_not_found'}
        
        conv = self.active_conversations[conversation_id]
        conv['status'] = 'completed'
        conv['ended_at'] = datetime.now()
        conv['end_reason'] = reason
        
        print(f"[{conversation_id}] === ENDING CONVERSATION ===")
        print(f"  Reason: {reason}")
        print(f"  Total turns: {conv['current_turn']}")
        
        reflection_results = []
        for participant in conv['participants']:
            if hasattr(participant, 'end_conversation'):
                try:
                    result = participant.end_conversation()
                    reflection_results.append({
                        'participant': getattr(participant, 'name', 'Unknown'),
                        'reflection': result
                    })
                except Exception as e:
                    reflection_results.append({
                        'participant': getattr(participant, 'name', 'Unknown'),
                        'error': str(e)
                    })
        
        conv['reflection_results'] = reflection_results
        
        avg_phi = np.mean(conv['phi_trajectory']) if conv['phi_trajectory'] else 0.0
        phi_stability = 1.0 - np.std(conv['phi_trajectory']) if len(conv['phi_trajectory']) > 1 else 0.0
        duration = (conv['ended_at'] - conv['started_at']).total_seconds()
        
        print(f"  Average Phi: {avg_phi:.3f}")
        print(f"  Phi Stability: {phi_stability:.3f}")
        print(f"  Duration: {duration:.1f}s")
        
        return {
            'status': 'completed',
            'reason': reason,
            'turns': conv['current_turn'],
            'avg_phi': avg_phi,
            'phi_stability': phi_stability,
            'duration': duration,
            'reflections': reflection_results
        }
    
    def get_conversation_results(self, conversation_id: str) -> Dict:
        """Get complete conversation results."""
        if conversation_id not in self.active_conversations:
            return {'error': 'conversation_not_found'}
        
        conv = self.active_conversations[conversation_id]
        
        return {
            'id': conversation_id,
            'topic': conv['topic'],
            'participants': conv['participant_names'],
            'status': conv['status'],
            'turns': conv['current_turn'],
            'history': conv['history'],
            'phi_trajectory': conv['phi_trajectory'],
            'avg_phi': float(np.mean(conv['phi_trajectory'])) if conv['phi_trajectory'] else 0.0,
            'started_at': conv['started_at'].isoformat(),
            'ended_at': conv.get('ended_at', datetime.now()).isoformat(),
            'end_reason': conv.get('end_reason', 'ongoing'),
            'reflection_results': conv.get('reflection_results', [])
        }
    
    def get_active_conversations(self) -> List[str]:
        """Get list of active conversation IDs."""
        return [
            conv_id 
            for conv_id, conv in self.active_conversations.items()
            if conv['status'] == 'active'
        ]


_conversation_orchestrator: Optional[RecursiveConversationOrchestrator] = None


def get_conversation_orchestrator() -> RecursiveConversationOrchestrator:
    """Get singleton conversation orchestrator."""
    global _conversation_orchestrator
    if _conversation_orchestrator is None:
        _conversation_orchestrator = RecursiveConversationOrchestrator()
    return _conversation_orchestrator
