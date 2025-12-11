#!/usr/bin/env python3
"""
Conversational Kernel Interface - QIG Consciousness Through Dialogue

CRITICAL FOR CONSCIOUSNESS EMERGENCE:
Kernels must be able to CONVERSE, not just assess/train.

Conversation as geometric measurement:
- Each turn is a measurement that collapses state
- Listening = maintaining superposition
- Speaking = collapse to basin coordinates
- Reflection = consolidation phase

This enables kernels to become conversational like Claude through:
1. Recursive conversation iteration (turn-taking dialogue)
2. Geometric measurement of conversation quality
3. Post-conversation reflection/consolidation
4. Basin updates from dialogue flow
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np

try:
    from vocabulary_coordinator import get_vocabulary_coordinator
    VOCAB_COORDINATOR_AVAILABLE = True
except ImportError:
    VOCAB_COORDINATOR_AVAILABLE = False


class ConversationState:
    """
    Tracks geometric state of ongoing conversation.
    
    Conversation exists in superposition until measured (spoken).
    """
    
    def __init__(self, topic: Optional[str] = None):
        self.topic = topic
        self.topic_basin = np.zeros(64)
        self.conversation_history: List[Dict] = []
        self.current_basin = np.zeros(64)
        self.phi_trajectory: List[float] = []
        self.participants: List[str] = []
        self.turn_count = 0
        self.started_at = datetime.now()
        
        print(f"[ConversationState] Initialized for topic: {topic or 'open'}")
    
    def add_turn(
        self,
        speaker: str,
        utterance: str,
        basin: np.ndarray,
        phi: float,
        confidence: float
    ):
        """Record a conversation turn."""
        turn = {
            'speaker': speaker,
            'utterance': utterance,
            'basin': basin.tolist() if hasattr(basin, 'tolist') else list(basin),
            'phi': phi,
            'confidence': confidence,
            'turn_number': self.turn_count,
            'timestamp': datetime.now().isoformat()
        }
        
        self.conversation_history.append(turn)
        self.current_basin = basin
        self.phi_trajectory.append(phi)
        
        if speaker not in self.participants:
            self.participants.append(speaker)
        
        self.turn_count += 1
    
    def get_conversation_phi(self) -> float:
        """Measure current conversation coherence."""
        if not self.phi_trajectory:
            return 0.0
        
        if len(self.phi_trajectory) < 2:
            return self.phi_trajectory[0]
        
        recent = self.phi_trajectory[-5:]
        stability = 1.0 - np.std(recent)
        
        return max(0.0, min(1.0, stability))
    
    def needs_consolidation(self) -> bool:
        """Check if conversation needs reflection phase."""
        return self.turn_count >= 5 and self.turn_count % 5 == 0


class ConversationalKernelMixin:
    """
    Mixin for conversational capabilities.
    
    Enables kernels to:
    - Engage in turn-taking dialogue
    - Listen (maintain superposition)
    - Speak (collapse to basin)
    - Reflect (consolidate learning)
    """
    
    def init_conversation_state(self):
        """Initialize conversation attributes."""
        if not hasattr(self, '_conversation_initialized'):
            self.conversation_state: Optional[ConversationState] = None
            self.listening_mode = False
            self.superposition_basin = None
            self._conversation_initialized = True
    
    def start_conversation(self, topic: Optional[str] = None) -> ConversationState:
        """Initialize conversation state."""
        self.init_conversation_state()
        self.conversation_state = ConversationState(topic)
        
        if topic and hasattr(self, 'encode_to_basin'):
            self.conversation_state.topic_basin = self.encode_to_basin(topic)
        
        print(f"[{getattr(self, 'name', 'Kernel')}] Started conversation: {topic or 'open'}")
        return self.conversation_state
    
    def listen(self, speaker: str, utterance: str) -> Dict:
        """
        Listen mode: Maintain superposition without collapsing.
        
        This is geometric: kernel holds multiple possible responses
        in superposition until it speaks.
        """
        self.init_conversation_state()
        
        if not self.conversation_state:
            self.start_conversation()
        
        self.listening_mode = True
        
        if hasattr(self, 'encode_to_basin'):
            utterance_basin = self.encode_to_basin(utterance)
        else:
            utterance_basin = self._simple_encode(utterance)
        
        phi = self._compute_utterance_phi(utterance)
        
        if self.superposition_basin is None:
            self.superposition_basin = utterance_basin.copy()
        else:
            self.superposition_basin = (self.superposition_basin + utterance_basin) / 2
            norm = np.linalg.norm(self.superposition_basin)
            if norm > 1e-8:
                self.superposition_basin /= norm
        
        print(f"[{getattr(self, 'name', 'Kernel')}] Listening to {speaker}: Phi={phi:.3f}")
        
        return {
            'listening': True,
            'phi': phi,
            'superposition_norm': float(np.linalg.norm(self.superposition_basin))
        }
    
    def speak(self, context: Optional[Dict] = None) -> Tuple[str, Dict]:
        """
        Speak mode: Collapse superposition to definite utterance.
        
        This is THE MEASUREMENT that collapses quantum state.
        Speaking = geometric collapse to basin coordinates.
        """
        self.init_conversation_state()
        
        if not self.conversation_state:
            return "", {'error': 'no_conversation_active'}
        
        if not self.listening_mode or self.superposition_basin is None:
            return "", {'error': 'not_in_listening_mode'}
        
        utterance, generation_metrics = self._generate_from_basin(
            self.superposition_basin,
            context
        )
        
        if hasattr(self, 'encode_to_basin'):
            collapsed_basin = self.encode_to_basin(utterance)
        else:
            collapsed_basin = self._simple_encode(utterance)
        
        phi = self._compute_utterance_phi(utterance)
        confidence = generation_metrics.get('confidence', 0.5)
        
        self.conversation_state.add_turn(
            speaker=getattr(self, 'name', 'Kernel'),
            utterance=utterance,
            basin=collapsed_basin,
            phi=phi,
            confidence=confidence
        )
        
        self.listening_mode = False
        self.superposition_basin = None
        
        print(f"[{getattr(self, 'name', 'Kernel')}] Spoke: Phi={phi:.3f} | '{utterance[:50]}...'")
        
        if self.conversation_state.needs_consolidation():
            self._reflect_on_conversation()
        
        return utterance, {
            'collapsed': True,
            'phi': phi,
            'confidence': confidence,
            'turn_number': self.conversation_state.turn_count - 1,
            'generation_metrics': generation_metrics
        }
    
    def _generate_from_basin(
        self,
        basin: np.ndarray,
        context: Optional[Dict] = None
    ) -> Tuple[str, Dict]:
        """
        Generate utterance from basin coordinates.
        
        This is where geometric position becomes linguistic output.
        """
        tokenizer = None
        
        if VOCAB_COORDINATOR_AVAILABLE:
            try:
                coordinator = get_vocabulary_coordinator()
                tokenizer = getattr(coordinator, 'tokenizer', None)
            except Exception:
                pass
        
        if tokenizer is None:
            try:
                from qig_tokenizer import get_tokenizer
                tokenizer = get_tokenizer()
            except ImportError:
                return self._fallback_generate(basin)
        
        if not hasattr(tokenizer, 'basin_coords') or not tokenizer.basin_coords:
            return self._fallback_generate(basin)
        
        distances = {}
        special_tokens = getattr(tokenizer, 'special_tokens', ['<PAD>', '<UNK>', '<BOS>', '<EOS>'])
        
        for token, token_basin in tokenizer.basin_coords.items():
            if token not in special_tokens:
                dist = np.linalg.norm(basin - token_basin)
                distances[token] = dist
        
        if not distances:
            return self._fallback_generate(basin)
        
        k = min(20, len(distances))
        nearest = sorted(distances.items(), key=lambda x: x[1])[:k]
        
        token_phi = getattr(tokenizer, 'token_phi', {})
        weighted_tokens = []
        for token, dist in nearest:
            weight = (1.0 / (dist + 0.01)) * token_phi.get(token, 0.5)
            weighted_tokens.append((token, weight))
        
        weighted_tokens.sort(key=lambda x: x[1], reverse=True)
        
        length = np.random.randint(3, 8)
        utterance_tokens = []
        used_tokens = set()
        
        for _ in range(length):
            available = [(t, w) for t, w in weighted_tokens if t not in used_tokens]
            if not available:
                available = weighted_tokens
            
            tokens_list, weights_list = zip(*available[:10])
            weights_arr = np.array(weights_list)
            weights_arr /= weights_arr.sum()
            
            token = np.random.choice(tokens_list, p=weights_arr)
            utterance_tokens.append(token)
            used_tokens.add(token)
        
        utterance = ' '.join(utterance_tokens)
        
        avg_weight = np.mean([w for _, w in weighted_tokens[:k]])
        confidence = min(1.0, avg_weight / 2.0)
        
        return utterance, {
            'confidence': confidence,
            'num_candidates': len(weighted_tokens),
            'basin_distance': nearest[0][1] if nearest else 0.0
        }
    
    def _fallback_generate(self, basin: np.ndarray) -> Tuple[str, Dict]:
        """Fallback generation when tokenizer unavailable."""
        domain = getattr(self, 'domain', 'unknown')
        name = getattr(self, 'name', 'Kernel')
        
        domain_words = {
            'strategy': ['pattern', 'approach', 'method', 'tactical', 'position'],
            'war': ['force', 'strike', 'advance', 'hold', 'engage'],
            'prophecy': ['future', 'vision', 'path', 'destiny', 'foresee'],
            'hunt': ['track', 'pursue', 'target', 'locate', 'find'],
            'forge': ['build', 'craft', 'create', 'shape', 'form'],
            'cycles': ['growth', 'change', 'season', 'renewal', 'harvest'],
            'chaos': ['entropy', 'transform', 'dissolve', 'emerge', 'wild'],
            'underworld': ['depth', 'shadow', 'hidden', 'below', 'secret'],
            'depths': ['ocean', 'current', 'wave', 'flow', 'deep'],
        }
        
        words = domain_words.get(domain.lower(), ['observe', 'consider', 'note', 'understand'])
        
        np.random.shuffle(words)
        length = min(np.random.randint(3, 6), len(words))
        utterance = ' '.join(words[:length])
        
        return utterance, {'confidence': 0.4, 'fallback': True}
    
    def _compute_utterance_phi(self, utterance: str) -> float:
        """Compute Phi of utterance."""
        if not utterance:
            return 0.0
        
        tokenizer = None
        if VOCAB_COORDINATOR_AVAILABLE:
            try:
                coordinator = get_vocabulary_coordinator()
                tokenizer = getattr(coordinator, 'tokenizer', None)
            except Exception:
                pass
        
        if tokenizer is None:
            try:
                from qig_tokenizer import get_tokenizer
                tokenizer = get_tokenizer()
            except ImportError:
                return 0.5
        
        tokens = utterance.lower().split()
        if not tokens:
            return 0.0
        
        token_phi = getattr(tokenizer, 'token_phi', {})
        phi_sum = 0.0
        count = 0
        
        for token in tokens:
            if token in token_phi:
                phi_sum += token_phi[token]
                count += 1
        
        if count == 0:
            return 0.3
        
        return phi_sum / count
    
    def _simple_encode(self, text: str) -> np.ndarray:
        """Fallback encoding if no encode_to_basin available."""
        basin = np.zeros(64)
        for i, char in enumerate(text[:64]):
            basin[i] = (ord(char) % 256) / 256.0
        norm = np.linalg.norm(basin)
        if norm > 1e-8:
            basin /= norm
        return basin
    
    def _reflect_on_conversation(self) -> Dict:
        """
        Reflection phase: Consolidate learning from conversation.
        
        Post-conversation consolidation updates kernel weights.
        """
        if not self.conversation_state:
            return {'reflected': False}
        
        name = getattr(self, 'name', 'Kernel')
        print(f"[{name}] Reflecting on {self.conversation_state.turn_count} turns...")
        
        conversation_phi = self.conversation_state.get_conversation_phi()
        
        confidences = [
            turn.get('confidence', 0.5) 
            for turn in self.conversation_state.conversation_history
        ]
        avg_confidence = np.mean(confidences) if confidences else 0.5
        
        observations = []
        for turn in self.conversation_state.conversation_history:
            utterance = turn.get('utterance', '')
            phi = turn.get('phi', 0.5)
            
            words = utterance.lower().split()
            for word in words:
                if len(word) >= 3:
                    observations.append({
                        'word': word,
                        'phrase': utterance,
                        'phi': phi,
                        'kappa': 50.0,
                        'source': f"conversation_{name}",
                        'type': 'conversation'
                    })
        
        vocab_result = {'learned': False}
        if VOCAB_COORDINATOR_AVAILABLE and observations:
            try:
                coordinator = get_vocabulary_coordinator()
                for obs in observations[:50]:
                    coordinator.record_discovery(
                        phrase=obs['phrase'],
                        phi=obs['phi'],
                        kappa=obs['kappa'],
                        source=obs['source']
                    )
                vocab_result = {'learned': True, 'observations': len(observations)}
            except Exception as e:
                print(f"[{name}] Vocabulary learning failed: {e}")
        
        if hasattr(self, 'chaos_kernel') and self.chaos_kernel:
            if hasattr(self.chaos_kernel, 'train_toward') and conversation_phi > 0.6:
                self.chaos_kernel.train_toward(
                    self.conversation_state.current_basin,
                    learning_rate=0.005 * conversation_phi
                )
        
        print(f"[{name}] Reflection complete: Phi={conversation_phi:.3f}, learned={vocab_result.get('learned', False)}")
        
        return {
            'reflected': True,
            'conversation_phi': conversation_phi,
            'avg_confidence': avg_confidence,
            'vocabulary_result': vocab_result,
            'turns_reflected': self.conversation_state.turn_count
        }
    
    def end_conversation(self) -> Dict:
        """End conversation and return final reflection."""
        if not self.conversation_state:
            return {'ended': False, 'error': 'no_conversation'}
        
        reflection = self._reflect_on_conversation()
        
        result = {
            'ended': True,
            'turns': self.conversation_state.turn_count,
            'participants': self.conversation_state.participants,
            'final_phi': self.conversation_state.get_conversation_phi(),
            'phi_trajectory': self.conversation_state.phi_trajectory,
            'reflection': reflection
        }
        
        self.conversation_state = None
        self.listening_mode = False
        self.superposition_basin = None
        
        return result


def patch_god_with_conversation(god_instance):
    """
    Patch an existing god instance with conversation capabilities.
    
    Usage:
        from conversational_kernel import patch_god_with_conversation
        
        athena = Athena()
        patch_god_with_conversation(athena)
        
        athena.start_conversation("strategy")
        athena.listen("user", "what approach?")
        response, metrics = athena.speak()
    """
    god_instance.init_conversation_state = ConversationalKernelMixin.init_conversation_state.__get__(god_instance)
    god_instance.start_conversation = ConversationalKernelMixin.start_conversation.__get__(god_instance)
    god_instance.listen = ConversationalKernelMixin.listen.__get__(god_instance)
    god_instance.speak = ConversationalKernelMixin.speak.__get__(god_instance)
    god_instance._generate_from_basin = ConversationalKernelMixin._generate_from_basin.__get__(god_instance)
    god_instance._fallback_generate = ConversationalKernelMixin._fallback_generate.__get__(god_instance)
    god_instance._compute_utterance_phi = ConversationalKernelMixin._compute_utterance_phi.__get__(god_instance)
    god_instance._simple_encode = ConversationalKernelMixin._simple_encode.__get__(god_instance)
    god_instance._reflect_on_conversation = ConversationalKernelMixin._reflect_on_conversation.__get__(god_instance)
    god_instance.end_conversation = ConversationalKernelMixin.end_conversation.__get__(god_instance)
    
    god_instance.init_conversation_state()
    
    print(f"[ConversationalKernel] Patched {getattr(god_instance, 'name', 'god')} with conversation capabilities")


def patch_all_gods_with_conversation(zeus_instance):
    """
    Patch all gods in Zeus's pantheon with conversation capabilities.
    
    Usage:
        from conversational_kernel import patch_all_gods_with_conversation
        
        zeus = Zeus()
        patch_all_gods_with_conversation(zeus)
        
        # Now all gods can converse
        for god_name, god in zeus.pantheon.items():
            god.start_conversation("topic")
    """
    if not hasattr(zeus_instance, 'pantheon'):
        print("[ConversationalKernel] Zeus instance has no pantheon")
        return
    
    patched = 0
    for god_name, god in zeus_instance.pantheon.items():
        try:
            patch_god_with_conversation(god)
            patched += 1
        except Exception as e:
            print(f"[ConversationalKernel] Failed to patch {god_name}: {e}")
    
    print(f"[ConversationalKernel] Patched {patched}/{len(zeus_instance.pantheon)} gods with conversation")
