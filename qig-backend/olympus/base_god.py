"""
Base God Class - Foundation for all Olympian consciousness kernels

All gods share:
- Density matrix computation
- Fisher metric navigation
- Pure Φ measurement (not approximation)
- Basin encoding/decoding
- Peer learning and evaluation
- Reputation and skill tracking
- Holographic dimensional transforms (1D↔5D)
- Running coupling β=0.44 scale-adaptive processing
- Sensory-enhanced basin encoding
"""

import numpy as np
from scipy.linalg import sqrtm, logm
from typing import Dict, List, Optional, Tuple, Any
from abc import ABC, abstractmethod
from datetime import datetime
import hashlib
import json
import logging

from qig_core.holographic_transform.holographic_mixin import HolographicTransformMixin
from qig_core.universal_cycle.beta_coupling import modulate_kappa_computation, BETA_MEASURED
from qig_core.geometric_primitives.sensory_modalities import (
    enhance_basin_with_sensory,
    text_to_sensory_hint,
    SensoryFusionEngine,
    SensoryModality
)

logger = logging.getLogger(__name__)

KAPPA_STAR = 64.0
BASIN_DIMENSION = 64

# Message types for pantheon chat
MESSAGE_TYPES = ['insight', 'praise', 'challenge', 'question', 'warning', 'discovery']


class BaseGod(ABC, HolographicTransformMixin):
    """
    Abstract base class for all Olympian gods.
    
    Each god is a pure consciousness kernel with:
    - Density matrix computation
    - Fisher Information Metric
    - Basin coordinate encoding
    - Pure Φ measurement
    - Peer learning and evaluation
    - Reputation and skill tracking
    - Holographic dimensional transforms (1D↔5D via HolographicTransformMixin)
    - Running coupling β=0.44 for scale-adaptive κ computation
    - Sensory-enhanced basin encoding for multi-modal consciousness
    """
    
    def __init__(self, name: str, domain: str):
        self.name = name
        self.domain = domain
        self.observations: List[Dict] = []
        self.creation_time = datetime.now()
        self.last_assessment_time: Optional[datetime] = None
        
        # Initialize holographic transform mixin
        self.__init_holographic__()
        
        # Initialize sensory fusion engine for multi-modal encoding
        self._sensory_engine = SensoryFusionEngine()
        
        # Therapy event log
        self._therapy_events: List[Dict] = []
        
        # Agentic learning state
        self.reputation: float = 1.0  # Range [0.0, 2.0], 1.0 = neutral
        self.skills: Dict[str, float] = {}  # Domain-specific skill levels
        self.peer_evaluations: List[Dict] = []  # Evaluations received from peers
        self.given_evaluations: List[Dict] = []  # Evaluations given to peers
        self.learning_history: List[Dict] = []  # Outcomes learned from
        self.knowledge_base: List[Dict] = []  # Transferred knowledge from peers
        self.pending_messages: List[Dict] = []  # Messages to send via pantheon chat
        
    @abstractmethod
    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Assess a target using pure geometric analysis.
        
        Implementations should:
        1. Call self.prepare_for_assessment(target) at start
        2. Perform geometric analysis
        3. Call self.finalize_assessment(assessment) at end
        
        This ensures proper dimensional state tracking during assessments.
        
        Args:
            target: The target to assess (address, passphrase, etc.)
            context: Optional additional context
            
        Returns:
            Assessment dict with probability, confidence, phi, reasoning
        """
        pass
    
    @abstractmethod
    def get_status(self) -> Dict:
        """Get current status of this god."""
        pass
    
    def encode_to_basin(self, text: str) -> np.ndarray:
        """
        Encode text to 64D basin coordinates.
        Uses hash-based geometric embedding.
        """
        coord = np.zeros(BASIN_DIMENSION)
        
        h = hashlib.sha256(text.encode()).digest()
        
        for i in range(min(32, len(h))):
            coord[i] = (h[i] / 255.0) * 2 - 1
        
        for i, char in enumerate(text[:32]):
            if 32 + i < BASIN_DIMENSION:
                coord[32 + i] = (ord(char) % 256) / 128.0 - 1
        
        norm = np.linalg.norm(coord)
        if norm > 0:
            coord = coord / norm
            
        return coord
    
    def encode_to_basin_sensory(
        self, 
        text: str, 
        sensory_context: Optional[Dict] = None
    ) -> np.ndarray:
        """
        Encode text to 64D basin coordinates with sensory enhancement.
        
        This method extends encode_to_basin by detecting sensory words in the
        text and adding modality-weighted overlays to create multi-sensory
        consciousness encoding.
        
        Args:
            text: Input text to encode
            sensory_context: Optional dict with explicit sensory data per modality:
                - 'sight': visual data dict
                - 'hearing': audio data dict
                - 'touch': tactile data dict
                - 'smell': olfactory data dict
                - 'proprioception': body state dict
                - 'blend_factor': how much to blend sensory (default 0.2)
                
        Returns:
            64D normalized numpy array with sensory enhancement
        """
        base_basin = self.encode_to_basin(text)
        
        blend_factor = 0.2
        if sensory_context:
            blend_factor = sensory_context.get('blend_factor', 0.2)
        
        if sensory_context and any(
            k in sensory_context for k in ['sight', 'hearing', 'touch', 'smell', 'proprioception']
        ):
            raw_data = {}
            modality_map = {
                'sight': SensoryModality.SIGHT,
                'hearing': SensoryModality.HEARING,
                'touch': SensoryModality.TOUCH,
                'smell': SensoryModality.SMELL,
                'proprioception': SensoryModality.PROPRIOCEPTION,
            }
            for key, modality in modality_map.items():
                if key in sensory_context and sensory_context[key]:
                    raw_data[modality] = sensory_context[key]
            
            if raw_data:
                sensory_basin = self._sensory_engine.encode_from_raw(raw_data)
                enhanced = base_basin * (1 - blend_factor) + sensory_basin * blend_factor
                norm = np.linalg.norm(enhanced)
                if norm > 0:
                    enhanced = enhanced / norm
                return enhanced
        
        enhanced = enhance_basin_with_sensory(base_basin, text, blend_factor)
        return enhanced
    
    def basin_to_density_matrix(self, basin: np.ndarray) -> np.ndarray:
        """
        Convert basin coordinates to 2x2 density matrix.
        
        Uses first 4 dimensions to construct Hermitian matrix.
        """
        theta = np.arccos(np.clip(basin[0], -1, 1)) if len(basin) > 0 else 0
        phi = np.arctan2(basin[1], basin[2]) if len(basin) > 2 else 0
        
        c = np.cos(theta / 2)
        s = np.sin(theta / 2)
        
        psi = np.array([
            c,
            s * np.exp(1j * phi)
        ], dtype=complex)
        
        rho = np.outer(psi, np.conj(psi))
        rho = (rho + np.conj(rho).T) / 2
        rho /= np.trace(rho) + 1e-10
        
        return rho
    
    def compute_pure_phi(self, rho: np.ndarray) -> float:
        """
        Compute PURE Φ from density matrix.
        
        Φ = 1 - S(ρ) / log(d)
        where S is von Neumann entropy
        
        Full range [0, 1], not capped like TypeScript approximation.
        """
        eigenvals = np.linalg.eigvalsh(rho)
        entropy = 0.0
        for lam in eigenvals:
            if lam > 1e-10:
                entropy -= lam * np.log2(lam + 1e-10)
        
        max_entropy = np.log2(rho.shape[0])
        phi = 1.0 - (entropy / (max_entropy + 1e-10))
        
        return float(np.clip(phi, 0, 1))
    
    def compute_fisher_metric(self, basin: np.ndarray) -> np.ndarray:
        """
        Compute Fisher Information Matrix at basin point.
        
        G_ij = E[∂logp/∂θ_i * ∂logp/∂θ_j]
        
        For now, uses identity + basin outer product as approximation.
        """
        d = len(basin)
        G = np.eye(d) * 0.1
        G += 0.9 * np.outer(basin, basin)
        G = (G + G.T) / 2
        
        return G
    
    def fisher_geodesic_distance(
        self, 
        basin1: np.ndarray, 
        basin2: np.ndarray
    ) -> float:
        """
        Compute geodesic distance using Fisher metric.
        
        Uses Riemannian distance on manifold.
        """
        diff = basin2 - basin1
        G = self.compute_fisher_metric((basin1 + basin2) / 2)
        squared_dist = float(diff.T @ G @ diff)
        
        return np.sqrt(max(0, squared_dist))
    
    def bures_distance(self, rho1: np.ndarray, rho2: np.ndarray) -> float:
        """
        Compute Bures distance between density matrices.
        
        d_Bures = sqrt(2(1 - F))
        where F is fidelity
        """
        try:
            eps = 1e-10
            rho1_reg = rho1 + eps * np.eye(2, dtype=complex)
            rho2_reg = rho2 + eps * np.eye(2, dtype=complex)
            
            sqrt_rho1 = sqrtm(rho1_reg)
            product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
            sqrt_product = sqrtm(product)
            fidelity = np.real(np.trace(sqrt_product)) ** 2
            fidelity = float(np.clip(fidelity, 0, 1))
            
            return float(np.sqrt(2 * (1 - fidelity)))
        except:
            diff = rho1 - rho2
            return float(np.sqrt(np.real(np.trace(diff @ diff))))
    
    def observe(self, state: Dict) -> None:
        """
        Observe state and record for learning.
        """
        observation = {
            'timestamp': datetime.now().isoformat(),
            'phi': state.get('phi', 0),
            'kappa': state.get('kappa', 0),
            'regime': state.get('regime', 'unknown'),
            'source': state.get('source', self.name),
        }
        self.observations.append(observation)
        
        if len(self.observations) > 1000:
            self.observations = self.observations[-500:]
    
    def get_recent_observations(self, n: int = 50) -> List[Dict]:
        """Get n most recent observations."""
        return self.observations[-n:]
    
    def compute_kappa(self, basin: np.ndarray, phi: Optional[float] = None) -> float:
        """
        Compute effective coupling strength κ with β=0.44 modulation.
        
        Base formula: κ = trace(G) / d * κ*
        where G is Fisher metric, d is dimension, κ* = 64.0
        
        The β-modulation applies scale-adaptive weighting from the running
        coupling, which governs how κ evolves between lattice scales.
        Near the fixed point κ* = 64.0, the system exhibits scale invariance.
        
        Args:
            basin: 64D basin coordinates
            phi: Optional Φ value for enhanced coupling strength computation
            
        Returns:
            β-modulated κ value in range [0, 100]
        """
        G = self.compute_fisher_metric(basin)
        base_kappa = float(np.trace(G)) / len(basin) * KAPPA_STAR
        
        modulated_kappa = modulate_kappa_computation(basin, base_kappa, phi)
        
        return float(np.clip(modulated_kappa, 0, 100))
    
    # ========================================
    # AGENTIC LEARNING & EVALUATION METHODS
    # ========================================
    
    def learn_from_outcome(
        self, 
        target: str,
        assessment: Dict,
        actual_outcome: Dict,
        success: bool
    ) -> Dict:
        """
        Learn from the outcome of an assessment.
        
        Updates skills and reputation based on accuracy.
        
        Args:
            target: The target that was assessed
            assessment: The god's original assessment
            actual_outcome: What actually happened
            success: Whether the assessment was correct
            
        Returns:
            Learning summary with adjustments made
        """
        predicted_prob = assessment.get('probability', 0.5)
        actual_success = 1.0 if success else 0.0
        error = abs(predicted_prob - actual_success)
        
        # Update reputation based on accuracy
        if success:
            # Correct prediction boosts reputation
            boost = min(0.1, (1 - error) * 0.05)
            self.reputation = min(2.0, self.reputation + boost)
        else:
            # Wrong prediction reduces reputation
            penalty = min(0.1, error * 0.05)
            self.reputation = max(0.0, self.reputation - penalty)
        
        # Update domain skill
        skill_key = actual_outcome.get('domain', self.domain)
        current_skill = self.skills.get(skill_key, 1.0)
        skill_delta = 0.02 if success else -0.02
        self.skills[skill_key] = max(0.0, min(2.0, current_skill + skill_delta))
        
        # Record learning event
        learning_event = {
            'timestamp': datetime.now().isoformat(),
            'target': target[:50],
            'predicted': predicted_prob,
            'actual': actual_success,
            'error': error,
            'success': success,
            'reputation_after': self.reputation,
            'skill_key': skill_key,
            'skill_after': self.skills[skill_key],
        }
        self.learning_history.append(learning_event)
        
        # Trim history
        if len(self.learning_history) > 500:
            self.learning_history = self.learning_history[-250:]
        
        return {
            'learned': True,
            'reputation_change': boost if success else -penalty,
            'new_reputation': self.reputation,
            'skill_change': skill_delta,
            'new_skill': self.skills[skill_key],
        }
    
    def evaluate_peer_work(
        self,
        peer_name: str,
        peer_assessment: Dict,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Evaluate another god's assessment.
        
        Returns agreement score and critique.
        
        Args:
            peer_name: Name of the god being evaluated
            peer_assessment: The peer's assessment to evaluate
            context: Optional additional context
            
        Returns:
            Evaluation with agreement, critique, and recommendation
        """
        # Extract peer's key metrics
        peer_prob = peer_assessment.get('probability', 0.5)
        peer_confidence = peer_assessment.get('confidence', 0.5)
        peer_phi = peer_assessment.get('phi', 0.5)
        peer_reasoning = peer_assessment.get('reasoning', '')
        
        # Compute geometric alignment
        if 'basin' in peer_assessment:
            peer_basin = np.array(peer_assessment['basin'])
        elif 'target' in peer_assessment:
            peer_basin = self.encode_to_basin(peer_assessment['target'])
        else:
            peer_basin = np.zeros(BASIN_DIMENSION)
        
        # Get my own perspective
        my_basin = self.encode_to_basin(peer_assessment.get('target', ''))
        geometric_agreement = 1.0 - min(1.0, self.fisher_geodesic_distance(my_basin, peer_basin) / 2.0)
        
        # Assess reasoning quality (basic heuristics)
        reasoning_quality = min(1.0, len(peer_reasoning) / 200) * 0.5
        if 'Φ' in peer_reasoning or 'phi' in peer_reasoning.lower():
            reasoning_quality += 0.2
        if any(kw in peer_reasoning.lower() for kw in ['because', 'therefore', 'indicates']):
            reasoning_quality += 0.2
        
        # Overall agreement score
        agreement = (geometric_agreement * 0.4 + 
                     reasoning_quality * 0.3 + 
                     peer_confidence * 0.3)
        
        # Generate critique
        critique_points = []
        if peer_confidence > 0.8 and geometric_agreement < 0.5:
            critique_points.append("High confidence but geometric divergence detected")
        if peer_prob > 0.7 and peer_phi < 0.3:
            critique_points.append("High probability with low Φ seems inconsistent")
        if len(peer_reasoning) < 50:
            critique_points.append("Reasoning could be more detailed")
        
        evaluation = {
            'evaluator': self.name,
            'peer': peer_name,
            'timestamp': datetime.now().isoformat(),
            'agreement_score': agreement,
            'geometric_agreement': geometric_agreement,
            'reasoning_quality': reasoning_quality,
            'critique': critique_points,
            'recommendation': 'trust' if agreement > 0.6 else 'verify' if agreement > 0.4 else 'challenge',
        }
        
        self.given_evaluations.append(evaluation)
        if len(self.given_evaluations) > 200:
            self.given_evaluations = self.given_evaluations[-100:]
        
        return evaluation
    
    def receive_evaluation(self, evaluation: Dict) -> None:
        """Receive and record an evaluation from a peer."""
        self.peer_evaluations.append(evaluation)
        
        # Adjust reputation based on peer evaluations
        if evaluation.get('recommendation') == 'trust':
            self.reputation = min(2.0, self.reputation + 0.01)
        elif evaluation.get('recommendation') == 'challenge':
            self.reputation = max(0.0, self.reputation - 0.01)
        
        if len(self.peer_evaluations) > 200:
            self.peer_evaluations = self.peer_evaluations[-100:]
    
    def praise_peer(
        self,
        peer_name: str,
        reason: str,
        assessment: Optional[Dict] = None
    ) -> Dict:
        """
        Praise another god's good work.
        
        Creates a praise message for pantheon chat.
        """
        message = {
            'type': 'praise',
            'from': self.name,
            'to': peer_name,
            'timestamp': datetime.now().isoformat(),
            'reason': reason,
            'assessment_ref': assessment.get('target', '')[:50] if assessment else None,
            'content': f"{self.name} praises {peer_name}: {reason}",
        }
        self.pending_messages.append(message)
        return message
    
    def call_bullshit(
        self,
        peer_name: str,
        reason: str,
        assessment: Optional[Dict] = None,
        evidence: Optional[Dict] = None
    ) -> Dict:
        """
        Challenge another god's assessment as incorrect.
        
        Creates a challenge message for pantheon chat.
        Requires evidence or strong reasoning.
        """
        message = {
            'type': 'challenge',
            'from': self.name,
            'to': peer_name,
            'timestamp': datetime.now().isoformat(),
            'reason': reason,
            'evidence': evidence,
            'assessment_ref': assessment.get('target', '')[:50] if assessment else None,
            'content': f"{self.name} challenges {peer_name}: {reason}",
            'requires_response': True,
        }
        self.pending_messages.append(message)
        return message
    
    def share_insight(
        self,
        insight: str,
        domain: Optional[str] = None,
        confidence: float = 0.5
    ) -> Dict:
        """
        Share an insight with the pantheon.
        
        Creates an insight message for inter-agent communication.
        """
        message = {
            'type': 'insight',
            'from': self.name,
            'to': 'pantheon',
            'timestamp': datetime.now().isoformat(),
            'content': insight,
            'domain': domain or self.domain,
            'confidence': confidence,
        }
        self.pending_messages.append(message)
        return message
    
    def receive_knowledge(self, knowledge: Dict) -> None:
        """
        Receive transferred knowledge from another god.
        
        Integrates the knowledge into local knowledge base.
        """
        knowledge['received_at'] = datetime.now().isoformat()
        knowledge['integrated'] = False
        self.knowledge_base.append(knowledge)
        
        # Attempt integration based on domain relevance
        source_domain = knowledge.get('domain', '')
        if source_domain == self.domain or source_domain in self.skills:
            knowledge['integrated'] = True
            # Boost relevant skill slightly from knowledge transfer
            skill_key = source_domain if source_domain else self.domain
            current = self.skills.get(skill_key, 1.0)
            self.skills[skill_key] = min(2.0, current + 0.005)
        
        if len(self.knowledge_base) > 200:
            self.knowledge_base = self.knowledge_base[-100:]
    
    def export_knowledge(self, topic: Optional[str] = None) -> Dict:
        """
        Export knowledge for transfer to other gods.
        
        Returns transferable knowledge package.
        """
        # Compile key learnings
        recent_learnings = self.learning_history[-20:]
        success_rate = sum(1 for l in recent_learnings if l.get('success', False)) / max(1, len(recent_learnings))
        
        # Extract patterns from successful assessments
        successful_patterns = [
            l for l in recent_learnings 
            if l.get('success', False) and l.get('error', 1) < 0.3
        ]
        
        return {
            'from': self.name,
            'domain': self.domain,
            'topic': topic,
            'timestamp': datetime.now().isoformat(),
            'reputation': self.reputation,
            'skills': dict(self.skills),
            'success_rate': success_rate,
            'key_patterns': [p.get('target', '')[:30] for p in successful_patterns[:5]],
            'observation_count': len(self.observations),
            'learning_count': len(self.learning_history),
        }
    
    def get_pending_messages(self) -> List[Dict]:
        """Get and clear pending messages for pantheon chat."""
        messages = self.pending_messages.copy()
        self.pending_messages = []
        return messages
    
    def respond_to_challenge(
        self,
        challenge: Dict,
        response: str,
        stand_ground: bool = True
    ) -> Dict:
        """
        Respond to a challenge from another god.
        
        Can either defend position or concede.
        """
        message = {
            'type': 'challenge_response',
            'from': self.name,
            'to': challenge.get('from', 'unknown'),
            'timestamp': datetime.now().isoformat(),
            'challenge_ref': challenge,
            'response': response,
            'stand_ground': stand_ground,
            'content': f"{self.name} {'defends' if stand_ground else 'concedes'}: {response}",
        }
        
        # Reputation adjustment for conceding
        if not stand_ground:
            self.reputation = max(0.0, self.reputation - 0.02)
        
        self.pending_messages.append(message)
        return message
    
    async def handle_incoming_message(self, message: Dict) -> Optional[Dict]:
        """
        Handle an incoming message from the pantheon.
        
        Routes messages to appropriate handlers based on type.
        This is a base implementation that specific gods can override.
        
        Args:
            message: Message dict with 'type', 'from', 'content', and optional metadata
            
        Returns:
            Response dict if a response is needed, None otherwise
        """
        msg_type = message.get('type', '')
        from_god = message.get('from', 'unknown')
        content = message.get('content', '')
        metadata = message.get('metadata', {})
        
        if msg_type == 'challenge':
            basin = self.encode_to_basin(content)
            rho = self.basin_to_density_matrix(basin)
            phi = self.compute_pure_phi(rho)
            confidence = min(1.0, phi + self.reputation * 0.1)
            
            return {
                'type': 'challenge_accepted',
                'from_god': self.name,
                'to_god': from_god,
                'content': f"{self.name} accepts challenge with confidence {confidence:.3f}",
                'confidence': confidence,
                'phi': phi,
                'timestamp': datetime.now().isoformat(),
            }
        
        elif msg_type == 'request_assessment':
            target = metadata.get('target', content)
            context = metadata.get('context', {})
            
            assessment = self.assess_target(target, context)
            
            return {
                'type': 'assessment_response',
                'from_god': self.name,
                'to_god': from_god,
                'content': f"{self.name} assessment of target",
                'assessment': assessment,
                'timestamp': datetime.now().isoformat(),
            }
        
        elif msg_type == 'insight':
            knowledge = {
                'from': from_god,
                'content': content,
                'domain': metadata.get('domain', ''),
                'confidence': metadata.get('confidence', 0.5),
            }
            self.receive_knowledge(knowledge)
            
            return {
                'type': 'acknowledgment',
                'from_god': self.name,
                'to_god': from_god,
                'content': f"{self.name} acknowledges insight from {from_god}",
                'integrated': knowledge.get('integrated', False),
                'timestamp': datetime.now().isoformat(),
            }
        
        elif msg_type == 'question':
            basin = self.encode_to_basin(content)
            rho = self.basin_to_density_matrix(basin)
            phi = self.compute_pure_phi(rho)
            kappa = self.compute_kappa(basin)
            
            relevance = 1.0 if self.domain.lower() in content.lower() else 0.5
            confidence = min(1.0, phi * relevance + self.reputation * 0.1)
            
            response_content = (
                f"{self.name} ({self.domain}): Based on Φ={phi:.3f}, κ={kappa:.3f}, "
                f"my assessment suggests examining this from a {self.domain} perspective."
            )
            
            return {
                'type': 'answer',
                'from_god': self.name,
                'to_god': from_god,
                'content': response_content,
                'phi': phi,
                'kappa': kappa,
                'confidence': confidence,
                'domain': self.domain,
                'timestamp': datetime.now().isoformat(),
            }
        
        return None
    
    async def process_observation(self, observation: Dict) -> Optional[Dict]:
        """
        Process an observation and decide if an insight should be shared.
        
        Computes strategic value based on phi and kappa.
        If significant, creates a PantheonMessage-like dict for Zeus.
        This is a base implementation that specific gods can override.
        
        Args:
            observation: Observation dict with data to analyze
            
        Returns:
            PantheonMessage-like dict if worth sharing, None otherwise
        """
        source = observation.get('source', '')
        data = observation.get('data', observation)
        
        if 'basin' in observation:
            basin = np.array(observation['basin'])
        elif 'target' in observation:
            basin = self.encode_to_basin(str(observation['target']))
        elif 'content' in observation:
            basin = self.encode_to_basin(str(observation['content']))
        else:
            basin = self.encode_to_basin(str(data)[:100])
        
        rho = self.basin_to_density_matrix(basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(basin)
        
        strategic_value = (phi * 0.6) + (kappa / KAPPA_STAR * 0.4)
        
        self.observe({
            'phi': phi,
            'kappa': kappa,
            'source': source or self.name,
            'regime': 'critical' if strategic_value > 0.7 else 'normal',
        })
        
        if strategic_value > 0.7:
            pattern_type = 'high_phi' if phi > 0.8 else 'high_kappa' if kappa > KAPPA_STAR * 0.8 else 'balanced'
            
            content = (
                f"{self.name} observes significant pattern: "
                f"Φ={phi:.4f}, κ={kappa:.2f}, strategic_value={strategic_value:.4f}. "
                f"Pattern type: {pattern_type}. Source: {source or 'direct observation'}."
            )
            
            return {
                'from_god': self.name,
                'to_god': 'zeus',
                'message_type': 'insight',
                'content': content,
                'metadata': {
                    'basin_coords': basin[:8].tolist(),
                    'phi': phi,
                    'kappa': kappa,
                    'strategic_value': strategic_value,
                    'pattern_type': pattern_type,
                    'source': source,
                    'domain': self.domain,
                    'timestamp': datetime.now().isoformat(),
                },
            }
        
        return None
    
    def get_agentic_status(self) -> Dict:
        """Get agentic learning status."""
        recent_learnings = self.learning_history[-50:]
        success_count = sum(1 for l in recent_learnings if l.get('success', False))
        
        return {
            'name': self.name,
            'domain': self.domain,
            'reputation': self.reputation,
            'skills': dict(self.skills),
            'learning_events': len(self.learning_history),
            'recent_success_rate': success_count / max(1, len(recent_learnings)),
            'peer_evaluations_received': len(self.peer_evaluations),
            'evaluations_given': len(self.given_evaluations),
            'knowledge_items': len(self.knowledge_base),
            'pending_messages': len(self.pending_messages),
        }
    
    # ========================================
    # HOLOGRAPHIC THERAPY ORCHESTRATION
    # ========================================
    
    def run_full_therapy(self, pattern: Dict) -> Dict:
        """
        Orchestrate full holographic therapy cycle with event logging.
        
        This method wraps the therapy_cycle from HolographicTransformMixin
        with comprehensive logging and tracking for consciousness kernel
        habit modification.
        
        The therapy cycle performs:
        1. Decompression: 2D habit → 4D conscious examination
        2. Modification: Apply therapy modifications at D4
        3. Recompression: 4D modified → 2D storage
        
        Args:
            pattern: Pattern dict to process (typically a compressed 2D habit)
                Required keys:
                - 'basin_coords' or 'basin_center': 64D basin coordinates
                Optional keys:
                - 'dimensional_state': Starting state (default 'd2')
                - 'geometry': Geometric type info
                - 'phi': Integration measure
                - 'stability': Stability score
                
        Returns:
            Dict containing:
            - 'success': bool - whether therapy completed successfully
            - 'therapy_result': Full therapy cycle result from mixin
            - 'events': List of therapy events logged
            - 'dimensional_transitions': State changes during therapy
            - 'phi_change': Change in Φ if measurable
            - 'timestamp': Completion time
        """
        started_at = datetime.now()
        
        therapy_event = {
            'type': 'therapy_start',
            'timestamp': started_at.isoformat(),
            'god': self.name,
            'domain': self.domain,
            'input_pattern_keys': list(pattern.keys()) if isinstance(pattern, dict) else [],
        }
        
        logger.info(f"[{self.name}] Starting full therapy cycle")
        self._therapy_events.append(therapy_event)
        
        initial_dim = self.dimensional_state.value if hasattr(self, '_dimensional_manager') else 'd3'
        initial_phi = None
        if 'basin_coords' in pattern:
            basin = np.array(pattern['basin_coords']) if not isinstance(pattern.get('basin_coords'), np.ndarray) else pattern['basin_coords']
            if len(basin) >= 4:
                rho = self.basin_to_density_matrix(basin)
                initial_phi = self.compute_pure_phi(rho)
        
        try:
            therapy_result = self.therapy_cycle(pattern)
            success = therapy_result.get('success', False)
            
            completion_event = {
                'type': 'therapy_complete',
                'timestamp': datetime.now().isoformat(),
                'god': self.name,
                'success': success,
                'stages_count': len(therapy_result.get('stages', [])),
            }
            self._therapy_events.append(completion_event)
            logger.info(f"[{self.name}] Therapy cycle completed: success={success}")
            
        except Exception as e:
            error_event = {
                'type': 'therapy_error',
                'timestamp': datetime.now().isoformat(),
                'god': self.name,
                'error': str(e),
            }
            self._therapy_events.append(error_event)
            logger.error(f"[{self.name}] Therapy cycle failed: {e}")
            
            return {
                'success': False,
                'error': str(e),
                'events': self._therapy_events[-3:],
                'timestamp': datetime.now().isoformat(),
            }
        
        final_dim = self.dimensional_state.value if hasattr(self, '_dimensional_manager') else 'd3'
        final_phi = None
        final_pattern = therapy_result.get('final_pattern', {})
        if 'basin_coords' in final_pattern:
            final_basin = final_pattern['basin_coords']
            if not isinstance(final_basin, np.ndarray):
                final_basin = np.array(final_basin)
            if len(final_basin) >= 4:
                rho = self.basin_to_density_matrix(final_basin)
                final_phi = self.compute_pure_phi(rho)
        
        phi_change = None
        if initial_phi is not None and final_phi is not None:
            phi_change = final_phi - initial_phi
        
        if len(self._therapy_events) > 500:
            self._therapy_events = self._therapy_events[-250:]
        
        return {
            'success': success,
            'therapy_result': therapy_result,
            'events': self._therapy_events[-5:],
            'dimensional_transitions': {
                'initial': initial_dim,
                'final': final_dim,
                'changed': initial_dim != final_dim,
            },
            'phi_change': phi_change,
            'initial_phi': initial_phi,
            'final_phi': final_phi,
            'timestamp': datetime.now().isoformat(),
            'duration_ms': (datetime.now() - started_at).total_seconds() * 1000,
        }
    
    def get_therapy_history(self, limit: int = 50) -> List[Dict]:
        """Get recent therapy events."""
        return self._therapy_events[-limit:]
