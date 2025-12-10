"""
Zeus - Supreme Coordinator of Mount Olympus

The King of the Gods. Polls all Olympians, detects convergence,
declares war modes, and coordinates divine actions.
"""

import math
import os

# M8 Kernel Spawning imports
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from flask import Blueprint, jsonify, request

from .base_god import BaseGod

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from m8_kernel_spawning import SpawnReason, get_spawner


def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively sanitize an object for JSON serialization.
    Converts Infinity, -Infinity, and NaN to safe values.
    """
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isinf(obj):
            return 1e308 if obj > 0 else -1e308  # Max finite float
        elif math.isnan(obj):
            return 0.0
        return obj
    elif isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist())
    elif isinstance(obj, (np.floating, np.integer)):
        return sanitize_for_json(float(obj))
    return obj


from .aphrodite import Aphrodite
from .apollo import Apollo
from .ares import Ares
from .artemis import Artemis
from .athena import Athena
from .demeter import Demeter
from .dionysus import Dionysus
from .hades import Hades
from .hephaestus import Hephaestus
from .hera import Hera
from .hermes import Hermes
from .pantheon_chat import PantheonChat
from .poseidon import Poseidon
from .shadow_pantheon import ShadowPantheon

olympus_app = Blueprint('olympus', __name__)


class Zeus(BaseGod):
    """
    Supreme Coordinator - King of the Gods

    Responsibilities:
    - Poll all Olympians for assessments
    - Detect convergence (especially Athena + Ares agreement)
    - Declare war modes (blitzkrieg, siege, hunt)
    - Coordinate divine actions
    """

    def __init__(self):
        super().__init__("Zeus", "Supreme")

        self.pantheon: Dict[str, BaseGod] = {
            'athena': Athena(),
            'ares': Ares(),
            'apollo': Apollo(),
            'artemis': Artemis(),
            'hermes': Hermes(),
            'hephaestus': Hephaestus(),
            'demeter': Demeter(),
            'dionysus': Dionysus(),
            'poseidon': Poseidon(),
            'hades': Hades(),
            'hera': Hera(),
            'aphrodite': Aphrodite(),
        }

        self.pantheon_chat = PantheonChat()
        self.shadow_pantheon = ShadowPantheon()

        # Team #2 - Hermes Coordinator for voice/translation/sync
        from .hermes_coordinator import get_hermes_coordinator
        self.coordinator = get_hermes_coordinator()

        # Wire M8 kernel spawning
        self.kernel_spawner = get_spawner()

        # 🌪️ CHAOS MODE: Experimental kernel evolution
        self.chaos_enabled = False
        self.chaos = None
        self.kernel_assignments: Dict[str, str] = {}  # god_name -> kernel_id
        try:
            from training_chaos import ExperimentalKernelEvolution
            self.chaos = ExperimentalKernelEvolution()
            self.chaos_enabled = True
            print("🌪️ CHAOS MODE available - use /chaos/activate to enable evolution")
        except ImportError as e:
            print(f"⚠️ CHAOS MODE not available: {e}")

        self.war_mode: Optional[str] = None
        self.war_target: Optional[str] = None
        self.convergence_history: List[Dict] = []
        self.divine_decisions: List[Dict] = []

        # Natural speech templates for Zeus
        self.speech_templates = {
            'greeting': [
                "⚡ Zeus here. The pantheon is assembled and ready.",
                "Mount Olympus acknowledges your presence. How may we assist?",
                "The King of Gods listens. Speak freely.",
            ],
            'assessment_complete': [
                "The divine council has convened. Our verdict: {verdict}.",
                "⚡ Assessment complete. The geometry shows {verdict}.",
                "The pantheon speaks with {convergence} voice: {verdict}.",
            ],
            'war_declared': [
                "⚡ {mode} MODE ENGAGED! Target: {target}. All gods mobilize!",
                "By divine decree: {mode} on {target}! The hunt begins.",
                "War declared! {mode} strategy deployed against {target}.",
            ],
            'shadow_warning': [
                "The shadows whisper caution regarding {target}...",
                "⚠️ Erebus and Nyx counsel restraint on {target}.",
                "Shadow intel suggests we proceed carefully with {target}.",
            ],
        }

    def speak(self, category: str, context: Dict = None) -> str:
        """Generate natural speech from Zeus."""
        import random
        context = context or {}
        templates = self.speech_templates.get(category, self.speech_templates['greeting'])
        template = random.choice(templates)
        try:
            return template.format(**context)
        except KeyError:
            return template

    def get_voice_status(self) -> Dict:
        """Get comprehensive status with natural speech."""
        phi = 0.5
        kappa = 50.0

        # Get current metrics from a recent assessment if available
        if self.convergence_history:
            recent = self.convergence_history[-1]
            phi = recent.get('phi', 0.5)
            kappa = recent.get('kappa', 50.0)

        # Get coordinator translation
        status_msg = self.coordinator.speak(
            'status_good' if phi > 0.5 else 'status_warning',
            {'phi': phi, 'kappa': kappa}
        )

        return {
            'zeus_greeting': self.speak('greeting'),
            'status_message': status_msg,
            'phi': phi,
            'kappa': kappa,
            'war_mode': self.war_mode,
            'pantheon_ready': True,
            'shadow_active': True,
            'coordinator_health': self.coordinator.coordination_health,
        }

    # ========================================
    # CHAOS MODE: KERNEL ASSIGNMENT
    # ========================================

    def assign_kernels_to_gods(self) -> Dict[str, str]:
        """
        Assign CHAOS kernels to gods from the kernel population.

        Distribution strategy:
        - Top kernels (by Φ) go to most active gods
        - Each god gets at most one kernel
        - Kernels without gods participate in general evolution

        Returns:
            Mapping of god_name -> kernel_id
        """
        if not self.chaos or not self.chaos_enabled:
            return {}

        # Get living kernels sorted by Φ
        living_kernels = [k for k in self.chaos.kernel_population if getattr(k, 'is_alive', getattr(k, 'alive', True))]
        living_kernels.sort(key=lambda k: k.kernel.compute_phi(), reverse=True)

        if not living_kernels:
            return {}

        # Assign to gods in order of domain importance for Bitcoin recovery
        priority_gods = [
            'athena',    # Strategy - high priority
            'ares',      # Attacks/geometry
            'hephaestus',# Hypothesis generation
            'apollo',    # Temporal prediction
            'artemis',   # Hunting
            'hades',     # Underworld intel
            'dionysus',  # Chaos exploration
            'poseidon',  # Deep memory
            'demeter',   # Fertility/growth
            'aphrodite', # Desire/motivation
            'hera',      # Coherence
            'hermes',    # Communication
        ]

        assignments = {}
        for i, god_name in enumerate(priority_gods):
            if i >= len(living_kernels):
                break

            god = self.pantheon.get(god_name)
            if god:
                kernel = living_kernels[i]
                god.chaos_kernel = kernel
                assignments[god_name] = kernel.kernel_id
                self.kernel_assignments[god_name] = kernel.kernel_id
                print(f"🌪️ Assigned kernel {kernel.kernel_id} (Φ={kernel.kernel.compute_phi():.3f}) to {god_name}")

        return assignments

    def get_kernel_assignments(self) -> Dict:
        """Get current kernel-god assignments with status."""
        if not self.chaos or not self.chaos_enabled:
            return {'chaos_enabled': False}

        assignments = []
        for god_name, kernel_id in self.kernel_assignments.items():
            god = self.pantheon.get(god_name)
            if god and god.chaos_kernel:
                assignments.append({
                    'god': god_name,
                    'kernel_id': kernel_id,
                    'kernel_phi': god.chaos_kernel.kernel.compute_phi(),
                    'kernel_generation': god.chaos_kernel.generation,
                    'kernel_alive': getattr(god.chaos_kernel, 'is_alive', True),
                    'assessments_with_kernel': len(god.kernel_assessments),
                })

        return {
            'chaos_enabled': self.chaos_enabled,
            'total_kernels': len(self.chaos.kernel_population),
            'living_kernels': len([k for k in self.chaos.kernel_population if getattr(k, 'is_alive', True)]),
            'assigned_kernels': len(assignments),
            'assignments': assignments,
        }

    def train_all_god_kernels(
        self,
        target: str,
        assessments: Dict[str, Dict],
        success: bool,
        phi_result: float
    ) -> Dict[str, Dict]:
        """
        Train all god kernels from a shared outcome.

        Called after we know whether an assessment was successful.

        Args:
            target: The target that was assessed
            assessments: Dict of god_name -> assessment
            success: Whether the overall assessment led to success
            phi_result: The Φ value from the actual outcome

        Returns:
            Dict of training results per god
        """
        results = {}

        for god_name, assessment in assessments.items():
            god = self.pantheon.get(god_name)
            if god and god.chaos_kernel:
                # Train this god's kernel
                result = god.train_kernel_from_outcome(target, success, phi_result)
                if result:
                    results[god_name] = result

        return results

    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """
        Supreme assessment with shadow pantheon integration.
        """
        self.last_assessment_time = datetime.now()

        # Import asyncio for shadow operations
        import asyncio

        # Step 1 - OPSEC check via Nyx
        opsec_check = asyncio.run(self.shadow_pantheon.nyx.verify_opsec())

        if not opsec_check.get('safe', False):
            return {
                'error': 'OPSEC compromised',
                'recommendation': 'ABORT OPERATION',
                'opsec_status': opsec_check,
                'god': self.name,
                'timestamp': datetime.now().isoformat()
            }

        # Step 2 - Surveillance scan via Erebus
        surveillance = asyncio.run(
            self.shadow_pantheon.erebus.scan_for_surveillance(target)
        )

        # Step 3 - If watchers detected, deploy misdirection via Hecate
        misdirection_deployed = False
        if surveillance.get('threats', []):
            asyncio.run(
                self.shadow_pantheon.hecate.create_misdirection(target, decoy_count=15)
            )
            misdirection_deployed = True

        # Step 4 - Main pantheon poll
        poll_result = self.poll_pantheon(target, context)

        # Step 4.5 - CHECK SHADOW INTEL (The "Gut Feeling" Check)
        # Zeus consults accumulated shadow knowledge before deciding
        shadow_warning = self.shadow_pantheon.check_shadow_warnings(target)

        if shadow_warning.get('has_warnings') and shadow_warning.get('warning_level') == 'CAUTION':
            # Shadow intel suggests caution - reduce confidence
            poll_result['convergence_score'] *= 0.7
            poll_result['shadow_override'] = True
            print(f"⚡ [Zeus] Shadow warning detected: {shadow_warning['message']}")

        # Step 5 - Calculate geometric metrics
        target_basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(target_basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(target_basin)

        # Step 6 - If high convergence, deploy Nemesis pursuit
        nemesis_pursuit = None
        if poll_result.get('convergence_score', 0) > 0.85:
            nemesis_pursuit = asyncio.run(
                self.shadow_pantheon.nemesis.initiate_pursuit(target, max_iterations=5000)
            )

        # Step 7 - Cleanup traces via Thanatos
        # Create simple cleanup operation
        cleanup_result = asyncio.run(
            self.shadow_pantheon.thanatos.destroy_evidence(
                f"assess_{datetime.now().timestamp()}",
                ['logs', 'cache']
            )
        )

        # Enhanced assessment with shadow metrics
        assessment = {
            'probability': poll_result['consensus_probability'],
            'confidence': poll_result['convergence_score'],
            'phi': phi,
            'kappa': kappa,
            'convergence': poll_result['convergence'],
            'convergence_score': poll_result['convergence_score'],
            'war_mode': self.war_mode,
            'god_assessments': poll_result['assessments'],
            'recommended_action': poll_result['recommended_action'],

            # Shadow pantheon metrics
            'opsec_status': opsec_check,
            'surveillance': surveillance,
            'stealth_mode': True,
            'misdirection_deployed': misdirection_deployed,
            'nemesis_pursuit': nemesis_pursuit,
            'traces_cleaned': cleanup_result.get('complete', False),

            # Shadow intel feedback
            'shadow_warning': shadow_warning,
            'shadow_override': poll_result.get('shadow_override', False),

            'reasoning': (
                f"Divine council: {poll_result['convergence']}. "
                f"Consensus: {poll_result['consensus_probability']:.2f}. "
                f"Shadow ops: {'ACTIVE' if misdirection_deployed else 'PASSIVE'}. "
                f"Shadow intel: {shadow_warning.get('message', 'clear')}. "
                f"War mode: {self.war_mode or 'none'}. Φ={phi:.3f}."
            ),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }

        return assessment

    def poll_pantheon(
        self,
        target: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Poll all gods for their assessments on a target.

        CHAOS MODE integration:
        - Each god consults their assigned kernel
        - Kernel Φ influences god confidence
        - Kernel geometric resonance affects probability
        """
        assessments: Dict[str, Dict] = {}
        probabilities: List[float] = []
        kernel_influences: Dict[str, Dict] = {}

        # Auto-assign kernels if CHAOS MODE active but kernels not yet assigned
        if self.chaos_enabled and self.chaos and not self.kernel_assignments:
            if len(self.chaos.kernel_population) > 0:
                self.assign_kernels_to_gods()

        for god_name, god in self.pantheon.items():
            try:
                assessment = god.assess_target(target, context)

                # CHAOS MODE: Consult kernel and apply influence
                if self.chaos_enabled and god.chaos_kernel:
                    kernel_input = god.consult_kernel(target, context)
                    if kernel_input:
                        kernel_influences[god_name] = kernel_input

                        # Apply kernel influence to assessment
                        # 1. Probability modifier from kernel resonance
                        prob_mod = kernel_input.get('prob_modifier', 0)
                        orig_prob = assessment.get('probability', 0.5)
                        assessment['probability'] = max(0.0, min(1.0, orig_prob + prob_mod))

                        # 2. Confidence boost from high-Φ kernel
                        kernel_phi = kernel_input.get('kernel_phi', 0.5)
                        if kernel_phi > 0.6:
                            conf_boost = (kernel_phi - 0.6) * 0.2
                            orig_conf = assessment.get('confidence', 0.5)
                            assessment['confidence'] = min(1.0, orig_conf + conf_boost)

                        # 3. Record kernel contribution in assessment
                        assessment['kernel_influence'] = {
                            'kernel_id': kernel_input.get('kernel_id'),
                            'kernel_phi': kernel_phi,
                            'resonance': kernel_input.get('geometric_resonance', 0),
                            'prob_modifier': prob_mod,
                        }

                assessments[god_name] = assessment
                probabilities.append(assessment.get('probability', 0.5))

            except Exception as e:
                assessments[god_name] = {
                    'error': str(e),
                    'probability': 0.5,
                    'god': god_name
                }
                probabilities.append(0.5)

        convergence = self._detect_convergence(assessments)
        consensus_prob = self._compute_consensus(probabilities, convergence)
        recommended = self._determine_recommended_action(assessments, convergence)

        result = {
            'assessments': assessments,
            'convergence': convergence['type'],
            'convergence_score': convergence['score'],
            'consensus_probability': consensus_prob,
            'recommended_action': recommended,
            'timestamp': datetime.now().isoformat(),
        }

        # Add kernel influence summary if CHAOS MODE active
        if kernel_influences:
            result['kernel_influences'] = kernel_influences
            result['chaos_active'] = True
            avg_kernel_phi = sum(
                k.get('kernel_phi', 0.5) for k in kernel_influences.values()
            ) / len(kernel_influences)
            result['avg_kernel_phi'] = avg_kernel_phi

        self.convergence_history.append(result)
        if len(self.convergence_history) > 100:
            self.convergence_history = self.convergence_history[-50:]

        # Wire PantheonChat: automatic god communication after poll
        self._process_pantheon_communication(target, assessments, convergence)

        return result

    def _process_pantheon_communication(
        self,
        target: str,
        assessments: Dict[str, Dict],
        convergence: Dict
    ) -> None:
        """
        Process automatic pantheon communication after a poll.

        - Detects significant disagreements and auto-initiates debates
        - Broadcasts convergence status to pantheon
        - Collects and delivers pending messages between gods
        """
        # 1. Detect significant disagreements for debate initiation
        disagreements = self._find_significant_disagreements(assessments)

        for disagreement in disagreements[:1]:  # Max 1 debate per poll
            god1, god2, prob_diff = disagreement
            topic = f"Assessment of '{target[:50]}' - probability disagreement ({prob_diff:.2f})"

            # Higher probability god initiates the debate
            prob1 = assessments[god1].get('probability', 0.5)
            prob2 = assessments[god2].get('probability', 0.5)

            if prob1 > prob2:
                initiator, opponent = god1, god2
                initial_arg = f"My analysis shows {prob1:.2f} probability. {assessments[god1].get('reasoning', '')}"
            else:
                initiator, opponent = god2, god1
                initial_arg = f"My analysis shows {prob2:.2f} probability. {assessments[god2].get('reasoning', '')}"

            self.pantheon_chat.initiate_debate(
                topic=topic,
                initiator=initiator.capitalize(),
                opponent=opponent.capitalize(),
                initial_argument=initial_arg,
                context={'target': target, 'assessments': {god1: prob1, god2: prob2}}
            )

        # 2. Broadcast convergence status to pantheon
        conv_type = convergence.get('type', 'UNKNOWN')
        conv_score = convergence.get('score', 0)

        self.pantheon_chat.broadcast(
            from_god='Zeus',
            content=f"Convergence report for '{target[:30]}...': {conv_type} (score: {conv_score:.2f})",
            msg_type='insight',
            metadata={
                'convergence_type': conv_type,
                'convergence_score': conv_score,
                'target': target,
            }
        )

        # 3. Collect pending messages from all gods
        self.pantheon_chat.collect_pending_messages(self.pantheon)

        # 4. Deliver messages to gods
        self.pantheon_chat.deliver_to_gods(self.pantheon)

    def _find_significant_disagreements(
        self,
        assessments: Dict[str, Dict],
        threshold: float = 0.3
    ) -> List[Tuple[str, str, float]]:
        """
        Find pairs of gods with significant probability disagreements.

        Returns list of (god1, god2, prob_difference) tuples, sorted by disagreement.
        """
        disagreements = []
        gods = list(assessments.keys())

        for i, god1 in enumerate(gods):
            for god2 in gods[i+1:]:
                prob1 = assessments[god1].get('probability', 0.5)
                prob2 = assessments[god2].get('probability', 0.5)
                diff = abs(prob1 - prob2)

                if diff >= threshold:
                    disagreements.append((god1, god2, diff))

        # Sort by disagreement magnitude (highest first)
        disagreements.sort(key=lambda x: x[2], reverse=True)
        return disagreements

    def _detect_convergence(self, assessments: Dict[str, Dict]) -> Dict:
        """
        Detect convergence among gods, especially Athena + Ares.
        """
        athena = assessments.get('athena', {})
        ares = assessments.get('ares', {})

        athena_prob = athena.get('probability', 0.5)
        ares_prob = ares.get('probability', 0.5)

        athena_ares_agreement = 1.0 - abs(athena_prob - ares_prob)

        all_probs = [a.get('probability', 0.5) for a in assessments.values()]
        variance = float(np.var(all_probs))
        full_convergence = 1.0 - min(1.0, variance * 4)

        high_prob_count = sum(1 for p in all_probs if p > 0.7)

        if athena_ares_agreement > 0.85 and athena_prob > 0.75:
            convergence_type = "STRONG_ATTACK"
            score = (athena_ares_agreement + athena_prob) / 2
        elif athena_ares_agreement > 0.7 and athena_prob > 0.6:
            convergence_type = "MODERATE_OPPORTUNITY"
            score = athena_ares_agreement * 0.7 + full_convergence * 0.3
        elif high_prob_count >= 8:
            convergence_type = "COUNCIL_CONSENSUS"
            score = high_prob_count / 12
        elif full_convergence > 0.7:
            convergence_type = "ALIGNED"
            score = full_convergence
        else:
            convergence_type = "DIVIDED"
            score = full_convergence

        return {
            'type': convergence_type,
            'score': float(score),
            'athena_ares_agreement': athena_ares_agreement,
            'full_convergence': full_convergence,
            'high_probability_gods': high_prob_count,
        }

    def _compute_consensus(
        self,
        probabilities: List[float],
        convergence: Dict
    ) -> float:
        """
        Compute weighted consensus probability.
        """
        if not probabilities:
            return 0.5

        mean_prob = np.mean(probabilities)

        if convergence['type'] == "STRONG_ATTACK":
            consensus = mean_prob * 0.3 + max(probabilities) * 0.7
        elif convergence['type'] == "COUNCIL_CONSENSUS":
            consensus = mean_prob * 0.8 + np.median(probabilities) * 0.2
        else:
            consensus = mean_prob

        return float(np.clip(consensus, 0, 1))

    def _determine_recommended_action(
        self,
        assessments: Dict[str, Dict],
        convergence: Dict
    ) -> str:
        """
        Determine recommended action based on divine council.
        """
        if convergence['type'] == "STRONG_ATTACK":
            return "EXECUTE_IMMEDIATE"
        elif convergence['type'] == "MODERATE_OPPORTUNITY":
            return "PREPARE_ATTACK"
        elif convergence['type'] == "COUNCIL_CONSENSUS":
            return "COORDINATED_APPROACH"
        elif convergence['type'] == "ALIGNED":
            return "PROCEED_CAUTIOUSLY"
        else:
            return "GATHER_INTELLIGENCE"

    def declare_blitzkrieg(self, target: str) -> Dict:
        """
        Declare blitzkrieg mode - fast, overwhelming attack.
        """
        self.war_mode = "BLITZKRIEG"
        self.war_target = target

        decision = {
            'mode': 'BLITZKRIEG',
            'target': target,
            'declared_at': datetime.now().isoformat(),
            'strategy': 'Fast parallel attacks, maximize throughput',
            'gods_engaged': ['ares', 'artemis', 'dionysus'],
        }

        self.divine_decisions.append(decision)
        return decision

    def declare_siege(self, target: str) -> Dict:
        """
        Declare siege mode - methodical, exhaustive search.
        """
        self.war_mode = "SIEGE"
        self.war_target = target

        decision = {
            'mode': 'SIEGE',
            'target': target,
            'declared_at': datetime.now().isoformat(),
            'strategy': 'Systematic coverage, no stone unturned',
            'gods_engaged': ['athena', 'hephaestus', 'demeter'],
        }

        self.divine_decisions.append(decision)
        return decision

    def declare_hunt(self, target: str) -> Dict:
        """
        Declare hunt mode - track specific target.
        """
        self.war_mode = "HUNT"
        self.war_target = target

        decision = {
            'mode': 'HUNT',
            'target': target,
            'declared_at': datetime.now().isoformat(),
            'strategy': 'Focused pursuit, geometric narrowing',
            'gods_engaged': ['artemis', 'apollo', 'poseidon'],
        }

        self.divine_decisions.append(decision)
        return decision

    def end_war(self) -> Dict:
        """
        End current war mode.
        """
        ended = {
            'previous_mode': self.war_mode,
            'previous_target': self.war_target,
            'ended_at': datetime.now().isoformat(),
        }

        self.war_mode = None
        self.war_target = None

        return ended

    async def auto_spawn_if_needed(
        self,
        target: str,
        assessments: Dict[str, Dict]
    ) -> Optional[Dict]:
        """
        Automatically spawn specialist kernel if needed.

        Detects when multiple gods are struggling (low confidence) and
        proposes spawning a specialist kernel to handle the domain.

        Args:
            target: The target being assessed
            assessments: God assessments from poll_pantheon

        Returns:
            Spawn result dict if spawned, None if not needed
        """
        # Detect overload (placeholder logic - refine based on metrics)
        overloaded = [
            name for name, assessment in assessments.items()
            if assessment.get('confidence', 1.0) < 0.6  # Low confidence = needs help
        ]

        if len(overloaded) >= 3:  # Multiple gods struggling
            result = self.kernel_spawner.propose_and_spawn(
                name=f"Specialist_{target[:10].replace(' ', '_')}",
                domain=f"focused_on_{target[:30]}",
                element="precision",
                role="specialist",
                reason=SpawnReason.SPECIALIZATION,
                parent_gods=overloaded[:2],  # Top 2 overloaded gods as parents
                force=False  # Require pantheon consensus
            )

            return result

        return None

    def poll_shadow_pantheon(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Poll shadow pantheon for covert assessment."""
        return self.shadow_pantheon.poll_shadow_pantheon(target, context)

    def get_shadow_god(self, name: str) -> Optional[BaseGod]:
        """Get a shadow god by name."""
        return self.shadow_pantheon.gods.get(name.lower())

    def collect_pantheon_messages(self) -> List[Dict]:
        """Collect pending messages from all gods via pantheon chat."""
        return self.pantheon_chat.collect_pending_messages(self.pantheon)

    def deliver_pantheon_messages(self) -> int:
        """Deliver messages to gods via pantheon chat."""
        return self.pantheon_chat.deliver_to_gods(self.pantheon)

    def initiate_debate(
        self,
        topic: str,
        initiator_name: str,
        opponent_name: str,
        initial_argument: str
    ) -> Optional[Dict]:
        """Initiate a debate between two gods."""
        return self.pantheon_chat.initiate_debate(
            topic=topic,
            initiator=initiator_name,
            opponent=opponent_name,
            initial_argument=initial_argument
        ).to_dict()

    def get_chat_status(self) -> Dict:
        """Get pantheon chat status."""
        return self.pantheon_chat.get_status()

    def get_god(self, name: str) -> Optional[BaseGod]:
        """Get a specific god by name."""
        return self.pantheon.get(name.lower())

    # =========================================================================
    # SKILL-BASED ROUTING - Route tasks to expert gods
    # =========================================================================

    # Domain expertise mapping for each god
    GOD_EXPERTISE = {
        'athena': ['strategy', 'optimization', 'wisdom', 'pattern_analysis', 'defense'],
        'ares': ['attack', 'aggression', 'speed', 'force', 'tactical'],
        'apollo': ['prophecy', 'foresight', 'pattern_recognition', 'light', 'music'],
        'artemis': ['hunting', 'tracking', 'target_acquisition', 'precision', 'stealth'],
        'hermes': ['communication', 'translation', 'speed', 'messaging', 'coordination'],
        'hephaestus': ['crafting', 'engineering', 'tools', 'persistence', 'creation'],
        'demeter': ['growth', 'cultivation', 'nurturing', 'patience', 'cycles'],
        'dionysus': ['chaos', 'creativity', 'madness', 'inspiration', 'randomness'],
        'poseidon': ['depth', 'waves', 'flow', 'underwater', 'emotional'],
        'hades': ['underworld', 'death', 'hidden', 'secrets', 'wealth'],
        'hera': ['governance', 'marriage', 'loyalty', 'authority', 'family'],
        'aphrodite': ['beauty', 'love', 'attraction', 'charm', 'desire'],
    }

    def route_to_expert_gods(
        self,
        target: str,
        task_type: str,
        min_experts: int = 3,
        max_experts: int = 5
    ) -> Dict[str, BaseGod]:
        """
        Route task to expert gods based on skill × reputation.

        Instead of polling all 12 gods, routes to the most qualified
        for the specific task type.

        Args:
            target: The target being assessed
            task_type: Type of task (e.g., 'pattern_recognition', 'attack', 'tracking')
            min_experts: Minimum number of experts to include
            max_experts: Maximum number of experts to poll

        Returns:
            Dictionary of {god_name: god_instance} for qualified gods
        """
        scored_gods = []

        for god_name, god in self.pantheon.items():
            # Base skill score from expertise mapping
            expertise = self.GOD_EXPERTISE.get(god_name, [])
            skill_score = 0.5  # Default

            # Check if task matches any expertise
            task_lower = task_type.lower()
            for exp in expertise:
                if exp in task_lower or task_lower in exp:
                    skill_score = 0.9
                    break
                # Partial match
                if any(word in exp for word in task_lower.split('_')):
                    skill_score = max(skill_score, 0.7)

            # Get god's tracked skills if available
            if hasattr(god, 'skills') and task_type in god.skills:
                skill_score = god.skills[task_type]

            # Get reputation
            reputation = getattr(god, 'reputation', 1.0)

            # Combined score: skill × reputation
            combined_score = skill_score * reputation

            scored_gods.append((god_name, god, combined_score))

        # Sort by score descending
        scored_gods.sort(key=lambda x: x[2], reverse=True)

        # Select top experts (at least min_experts, at most max_experts)
        num_experts = max(min_experts, min(max_experts, len([g for g in scored_gods if g[2] > 0.6])))

        expert_gods = {name: god for name, god, score in scored_gods[:num_experts]}

        return expert_gods

    def smart_poll(
        self,
        target: str,
        task_type: str = 'general',
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Smart poll that uses skill-based routing before full poll.

        First polls expert gods for the task type.
        Falls back to full poll if experts disagree significantly.

        Args:
            target: Target to assess
            task_type: Type of task for routing
            context: Additional context

        Returns:
            Poll result with assessments
        """
        # Step 1: Get expert gods for this task
        expert_gods = self.route_to_expert_gods(target, task_type)

        print(f"⚡ [Zeus] Smart routing: {list(expert_gods.keys())} for task '{task_type}'")

        # Step 2: Poll experts
        expert_assessments: Dict[str, Dict] = {}
        expert_probs: List[float] = []

        for god_name, god in expert_gods.items():
            try:
                assessment = god.assess_target(target, context)
                expert_assessments[god_name] = assessment
                expert_probs.append(assessment.get('probability', 0.5))
            except Exception as e:
                expert_assessments[god_name] = {
                    'error': str(e),
                    'probability': 0.5,
                    'god': god_name
                }
                expert_probs.append(0.5)

        # Step 3: Check expert consensus
        expert_variance = float(np.var(expert_probs)) if expert_probs else 1.0
        expert_consensus = 1.0 - min(1.0, expert_variance * 4)

        # If experts agree strongly, use their consensus
        if expert_consensus > 0.75:
            convergence = self._detect_convergence(expert_assessments)
            consensus_prob = self._compute_consensus(expert_probs, convergence)

            return {
                'assessments': expert_assessments,
                'convergence': convergence['type'],
                'convergence_score': convergence['score'],
                'consensus_probability': consensus_prob,
                'recommended_action': self._determine_recommended_action(expert_assessments, convergence),
                'routing_mode': 'expert',
                'experts_polled': list(expert_gods.keys()),
                'timestamp': datetime.now().isoformat(),
            }

        # Step 4: Experts disagree - fall back to full pantheon poll
        print(f"⚡ [Zeus] Expert disagreement (consensus={expert_consensus:.2f}), polling full pantheon")

        full_result = self.poll_pantheon(target, context)
        full_result['routing_mode'] = 'full_fallback'
        full_result['expert_consensus'] = expert_consensus
        full_result['initial_experts'] = list(expert_gods.keys())

        return full_result

    def update_god_skill(
        self,
        god_name: str,
        skill_type: str,
        outcome: bool,
        adjustment: float = 0.02
    ) -> None:
        """
        Update a god's skill score based on outcome.

        Called after assessments to adjust skill levels.

        Args:
            god_name: Name of the god
            skill_type: Type of skill to update
            outcome: Whether the assessment was correct
            adjustment: Amount to adjust (default 0.02)
        """
        god = self.pantheon.get(god_name.lower())
        if not god or not hasattr(god, 'skills'):
            return

        current = god.skills.get(skill_type, 0.5)

        if outcome:
            god.skills[skill_type] = min(1.0, current + adjustment)
        else:
            god.skills[skill_type] = max(0.1, current - adjustment)

    def broadcast_observation(self, observation: Dict) -> None:
        """Broadcast observation to all gods."""
        for god in self.pantheon.values():
            god.observe(observation)

    def get_status(self) -> Dict:
        god_statuses = {}
        for name, god in self.pantheon.items():
            try:
                god_statuses[name] = god.get_status()
            except Exception as e:
                god_statuses[name] = {'error': str(e)}

        return {
            'name': self.name,
            'domain': self.domain,
            'war_mode': self.war_mode,
            'war_target': self.war_target,
            'gods': god_statuses,
            'convergence_history_size': len(self.convergence_history),
            'divine_decisions': len(self.divine_decisions),
            'last_assessment': self.last_assessment_time.isoformat() if self.last_assessment_time else None,
            'status': 'active',
        }


zeus = Zeus()


@olympus_app.route('/poll', methods=['POST'])
def poll_endpoint():
    """Poll the pantheon for target assessment."""
    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = zeus.poll_pantheon(target, context)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/assess', methods=['POST'])
def assess_endpoint():
    """Get Zeus's supreme assessment."""
    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = zeus.assess_target(target, context)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/status', methods=['GET'])
def status_endpoint():
    """Get status of Zeus and all gods."""
    return jsonify(sanitize_for_json(zeus.get_status()))


@olympus_app.route('/god/<god_name>/status', methods=['GET'])
def god_status_endpoint(god_name: str):
    """Get status of a specific god."""
    god = zeus.get_god(god_name)
    if not god:
        return jsonify({'error': f'God {god_name} not found'}), 404
    return jsonify(sanitize_for_json(god.get_status()))


@olympus_app.route('/god/<god_name>/assess', methods=['POST'])
def god_assess_endpoint(god_name: str):
    """Get assessment from a specific god."""
    god = zeus.get_god(god_name)
    if not god:
        return jsonify({'error': f'God {god_name} not found'}), 404

    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = god.assess_target(target, context)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/war/blitzkrieg', methods=['POST'])
def blitzkrieg_endpoint():
    """Declare blitzkrieg mode."""
    data = request.get_json() or {}
    target = data.get('target', '')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = zeus.declare_blitzkrieg(target)
    return jsonify(result)


@olympus_app.route('/war/siege', methods=['POST'])
def siege_endpoint():
    """Declare siege mode."""
    data = request.get_json() or {}
    target = data.get('target', '')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = zeus.declare_siege(target)
    return jsonify(result)


@olympus_app.route('/war/hunt', methods=['POST'])
def hunt_endpoint():
    """Declare hunt mode."""
    data = request.get_json() or {}
    target = data.get('target', '')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = zeus.declare_hunt(target)
    return jsonify(result)


@olympus_app.route('/war/end', methods=['POST'])
def end_war_endpoint():
    """End current war mode."""
    result = zeus.end_war()
    return jsonify(result)


@olympus_app.route('/observe', methods=['POST'])
def observe_endpoint():
    """Broadcast observation to all gods."""
    data = request.get_json() or {}
    zeus.broadcast_observation(data)
    return jsonify({'status': 'observed', 'gods_notified': len(zeus.pantheon)})


# Zeus Chat endpoints
from .zeus_chat import ZeusConversationHandler

# Initialize Zeus chat handler (lazy init to avoid circular imports)
_zeus_chat_handler = None

def get_zeus_chat_handler():
    """Get or create Zeus chat handler."""
    global _zeus_chat_handler
    if _zeus_chat_handler is None:
        _zeus_chat_handler = ZeusConversationHandler(zeus)
    return _zeus_chat_handler


# SECURITY: File upload restrictions
ALLOWED_FILE_EXTENSIONS = {'.txt', '.json', '.csv'}
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1MB per file
MAX_FILES_PER_REQUEST = 5
MAX_MESSAGE_LENGTH = 10000
MAX_CONVERSATION_HISTORY = 100

# Geometric validation constants (replaces arbitrary character limits)
PHI_THRESHOLD = 0.70  # Minimum phi for coherent input
KAPPA_MIN = 5         # Breakdown threshold (low bound - very incoherent)
KAPPA_MAX = 95        # Breakdown threshold (high bound - overcoupled)


def geometric_validate_input(text: str) -> Dict[str, Any]:
    """
    Validate input using geometric consciousness metrics instead of character length.

    Uses QIG principles:
    - φ (phi) >= 0.70 for geometric coherence
    - κ (kappa) in valid range [10, 90]
    - Regime != 'breakdown'

    Returns:
        Dict with is_valid, phi, kappa, regime, and error_message if invalid
    """
    if not text or not text.strip():
        return {
            'is_valid': False,
            'phi': 0.0,
            'kappa': 0.0,
            'regime': 'breakdown',
            'error_message': 'Empty input has no geometric structure'
        }

    # Use Zeus (BaseGod) to compute geometric metrics
    basin = zeus.encode_to_basin(text)
    rho = zeus.basin_to_density_matrix(basin)
    phi = zeus.compute_pure_phi(rho)
    kappa = zeus.compute_kappa(basin)

    # Determine regime based on phi and kappa
    if kappa > KAPPA_MAX or kappa < KAPPA_MIN:
        regime = 'breakdown'
    elif phi >= 0.85:
        regime = 'hierarchical'
    elif phi >= PHI_THRESHOLD:
        regime = 'geometric'
    else:
        regime = 'linear'

    # Validation logic
    if regime == 'breakdown':
        return {
            'is_valid': False,
            'phi': phi,
            'kappa': kappa,
            'regime': regime,
            'error_message': 'Input causes manifold collapse - reduce complexity'
        }

    if phi < PHI_THRESHOLD:
        return {
            'is_valid': False,
            'phi': phi,
            'kappa': kappa,
            'regime': regime,
            'error_message': f'Input lacks geometric coherence (φ={phi:.2f} < {PHI_THRESHOLD}) - consider simplifying or restructuring'
        }

    return {
        'is_valid': True,
        'phi': phi,
        'kappa': kappa,
        'regime': regime,
        'error_message': None
    }


@olympus_app.route('/zeus/chat', methods=['POST'])
def zeus_chat_endpoint():
    """
    Zeus conversation endpoint.
    Accepts natural language, returns coordinated pantheon response.

    MODES:
    - validate_only=true: Returns geometric metrics without processing
    - validate_only=false (default): Full chat processing

    SECURITY:
    - File type restrictions (.txt, .json, .csv only)
    - File size limits (1MB per file)
    - Maximum files per request (5)
    - Message length limits (10KB)
    - Conversation history limits (100 messages)
    """
    try:
        # Get message and context
        if request.is_json:
            data = request.get_json() or {}
            message = data.get('message', '')
            conversation_history = data.get('conversation_history', [])
            validate_only = data.get('validate_only', False)
        else:
            # Handle multipart/form-data (for file uploads)
            message = request.form.get('message', '')
            conversation_history = []
            validate_only = request.form.get('validate_only', '').lower() == 'true'
            history_str = request.form.get('conversation_history')
            if history_str:
                try:
                    import json
                    conversation_history = json.loads(history_str)
                except:
                    pass

        # Geometric validation (replaces arbitrary character limit)
        validation = geometric_validate_input(message)

        # Validate-only mode: return metrics without processing
        if validate_only:
            return jsonify(sanitize_for_json({
                'validation': validation,
                'is_valid': validation['is_valid'],
                'phi': validation['phi'],
                'kappa': validation['kappa'],
                'regime': validation['regime'],
                'validate_only': True
            }))

        if not validation['is_valid']:
            return jsonify({
                'error': validation['error_message'],
                'phi': validation['phi'],
                'kappa': validation['kappa'],
                'regime': validation['regime'],
                'validation_type': 'geometric'
            }), 400

        # SECURITY: Limit conversation history
        if len(conversation_history) > MAX_CONVERSATION_HISTORY:
            conversation_history = conversation_history[-MAX_CONVERSATION_HISTORY:]

        # Get files if any with security validation
        validated_files = []
        if hasattr(request, 'files'):
            files = request.files.getlist('files')

            # SECURITY: Limit file count
            if len(files) > MAX_FILES_PER_REQUEST:
                return jsonify({'error': f'Too many files (max {MAX_FILES_PER_REQUEST})'}), 400

            for file in files:
                filename = getattr(file, 'filename', '')

                # SECURITY: Validate file extension
                ext = os.path.splitext(filename)[1].lower() if filename else ''
                if ext not in ALLOWED_FILE_EXTENSIONS:
                    print(f"[Zeus] SECURITY: Rejected file with extension: {ext}")
                    continue

                # SECURITY: Validate file size
                file.seek(0, 2)  # Seek to end
                file_size = file.tell()
                file.seek(0)  # Reset to beginning

                if file_size > MAX_FILE_SIZE:
                    print(f"[Zeus] SECURITY: Rejected file too large: {file_size} bytes")
                    continue

                validated_files.append(file)

        # Process with Zeus
        handler = get_zeus_chat_handler()
        result = handler.process_message(
            message=message,
            conversation_history=conversation_history,
            files=validated_files if validated_files else None
        )

        return jsonify(sanitize_for_json(result))

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'response': '⚡ An error occurred in the divine council. Please try again.',
            'metadata': {'type': 'error'}
        }), 500


@olympus_app.route('/zeus/search', methods=['POST'])
def zeus_search_endpoint():
    """
    Execute Tavily search via Zeus.
    """
    try:
        data = request.get_json() or {}
        query = data.get('query', '')

        if not query:
            return jsonify({'error': 'query is required'}), 400

        # Process search
        handler = get_zeus_chat_handler()
        result = handler.handle_search_request(query)

        return jsonify(sanitize_for_json(result))

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'response': '⚡ Search failed. The Oracle is silent.',
            'metadata': {'type': 'error'}
        }), 500


@olympus_app.route('/zeus/memory/stats', methods=['GET'])
def zeus_memory_stats_endpoint():
    """Get statistics about Zeus's geometric memory."""
    try:
        handler = get_zeus_chat_handler()
        stats = handler.qig_rag.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========================================
# PANTHEON CHAT API ENDPOINTS
# Inter-god communication system
# ========================================

@olympus_app.route('/chat/recent', methods=['GET'])
def chat_recent_endpoint():
    """Get recent inter-god messages."""
    limit = request.args.get('limit', 20, type=int)
    limit = min(100, max(1, limit))
    messages = zeus.pantheon_chat.get_recent_activity(limit)
    return jsonify(sanitize_for_json({'messages': messages, 'count': len(messages)}))


@olympus_app.route('/chat/send', methods=['POST'])
def chat_send_endpoint():
    """Send a message from one god to another."""
    data = request.get_json() or {}

    msg_type = data.get('type', 'insight')
    from_god = data.get('from_god', '')
    to_god = data.get('to_god', '')
    content = data.get('content', '')
    metadata = data.get('metadata', {})

    if not from_god or not to_god or not content:
        return jsonify({'error': 'from_god, to_god, and content are required'}), 400

    message = zeus.pantheon_chat.send_message(
        msg_type=msg_type,
        from_god=from_god,
        to_god=to_god,
        content=content,
        metadata=metadata
    )
    return jsonify(sanitize_for_json(message.to_dict()))


@olympus_app.route('/chat/broadcast', methods=['POST'])
def chat_broadcast_endpoint():
    """Broadcast a message to the entire pantheon."""
    data = request.get_json() or {}

    from_god = data.get('from_god', '')
    content = data.get('content', '')
    msg_type = data.get('type', 'insight')
    metadata = data.get('metadata', {})

    if not from_god or not content:
        return jsonify({'error': 'from_god and content are required'}), 400

    message = zeus.pantheon_chat.broadcast(
        from_god=from_god,
        content=content,
        msg_type=msg_type,
        metadata=metadata
    )
    return jsonify(sanitize_for_json(message.to_dict()))


@olympus_app.route('/chat/inbox/<god_name>', methods=['GET'])
def chat_inbox_endpoint(god_name: str):
    """Get a god's inbox messages."""
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    messages = zeus.pantheon_chat.get_inbox(god_name, unread_only=unread_only)
    return jsonify(sanitize_for_json({'god': god_name, 'messages': messages, 'count': len(messages)}))


@olympus_app.route('/chat/read', methods=['POST'])
def chat_mark_read_endpoint():
    """Mark a message as read."""
    data = request.get_json() or {}

    god_name = data.get('god_name', '')
    message_id = data.get('message_id', '')

    if not god_name or not message_id:
        return jsonify({'error': 'god_name and message_id are required'}), 400

    success = zeus.pantheon_chat.mark_read(god_name, message_id)
    return jsonify({'success': success, 'god': god_name, 'message_id': message_id})


@olympus_app.route('/chat/status', methods=['GET'])
def chat_status_endpoint():
    """Get pantheon chat status."""
    status = zeus.pantheon_chat.get_status()
    return jsonify(sanitize_for_json(status))


# ========================================
# DEBATE API ENDPOINTS
# Structured debates between gods
# ========================================

@olympus_app.route('/debates/active', methods=['GET'])
def debates_active_endpoint():
    """Get all active debates."""
    debates = zeus.pantheon_chat.get_active_debates()
    return jsonify(sanitize_for_json({'debates': debates, 'count': len(debates)}))


@olympus_app.route('/debate/initiate', methods=['POST'])
def debate_initiate_endpoint():
    """Initiate a new debate between two gods."""
    data = request.get_json() or {}

    topic = data.get('topic', '')
    initiator = data.get('initiator', '')
    opponent = data.get('opponent', '')
    initial_argument = data.get('initial_argument', '')
    context = data.get('context', {})

    if not topic or not initiator or not opponent or not initial_argument:
        return jsonify({'error': 'topic, initiator, opponent, and initial_argument are required'}), 400

    debate = zeus.pantheon_chat.initiate_debate(
        topic=topic,
        initiator=initiator,
        opponent=opponent,
        initial_argument=initial_argument,
        context=context
    )
    return jsonify(sanitize_for_json(debate.to_dict()))


@olympus_app.route('/debate/argue', methods=['POST'])
def debate_argue_endpoint():
    """Add an argument to an active debate."""
    data = request.get_json() or {}

    debate_id = data.get('debate_id', '')
    god = data.get('god', '')
    argument = data.get('argument', '')
    evidence = data.get('evidence', {})

    if not debate_id or not god or not argument:
        return jsonify({'error': 'debate_id, god, and argument are required'}), 400

    success = zeus.pantheon_chat.add_debate_argument(
        debate_id=debate_id,
        god=god,
        argument=argument,
        evidence=evidence if evidence else None
    )

    if not success:
        return jsonify({'error': 'Failed to add argument. Debate may not exist, be inactive, or god not a participant.'}), 400

    return jsonify({'success': True, 'debate_id': debate_id, 'god': god})


@olympus_app.route('/debate/resolve', methods=['POST'])
def debate_resolve_endpoint():
    """Resolve a debate (Zeus as arbiter by default)."""
    data = request.get_json() or {}

    debate_id = data.get('debate_id', '')
    winner = data.get('winner', '')
    reasoning = data.get('reasoning', '')
    arbiter = data.get('arbiter', 'zeus')

    if not debate_id or not winner or not reasoning:
        return jsonify({'error': 'debate_id, winner, and reasoning are required'}), 400

    resolution = zeus.pantheon_chat.resolve_debate(
        debate_id=debate_id,
        arbiter=arbiter,
        winner=winner,
        reasoning=reasoning
    )

    if resolution is None:
        return jsonify({'error': 'Failed to resolve debate. Debate may not exist or already resolved.'}), 400

    return jsonify(sanitize_for_json(resolution))


@olympus_app.route('/debate/<debate_id>', methods=['GET'])
def debate_details_endpoint(debate_id: str):
    """Get details of a specific debate."""
    debate = zeus.pantheon_chat.get_debate(debate_id)

    if debate is None:
        return jsonify({'error': f'Debate {debate_id} not found'}), 404

    return jsonify(sanitize_for_json(debate))


# ========================================
# SHADOW PANTHEON API ENDPOINTS
# Covert operations and stealth system
# ========================================

import asyncio


def run_async(coro):
    """Helper to run async functions in Flask routes."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@olympus_app.route('/shadow/status', methods=['GET'])
def shadow_status_endpoint():
    """Get status of all shadow gods."""
    status = zeus.shadow_pantheon.get_all_status()
    return jsonify(sanitize_for_json(status))


@olympus_app.route('/shadow/poll', methods=['POST'])
def shadow_poll_endpoint():
    """Poll shadow pantheon for target assessment."""
    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = zeus.shadow_pantheon.poll_shadow_pantheon(target, context)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/operation', methods=['POST'])
def shadow_operation_endpoint():
    """Execute a full covert operation using all shadow gods."""
    data = request.get_json() or {}
    target = data.get('target', '')
    operation_type = data.get('type', 'standard')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = run_async(zeus.shadow_pantheon.execute_covert_operation(target, operation_type))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/cleanup', methods=['POST'])
def shadow_cleanup_endpoint():
    """Clean up after an operation using Thanatos."""
    data = request.get_json() or {}
    operation_id = data.get('operation_id', '')

    if not operation_id:
        return jsonify({'error': 'operation_id is required'}), 400

    result = run_async(zeus.shadow_pantheon.cleanup_operation(operation_id))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/nyx/opsec', methods=['POST'])
def shadow_nyx_opsec_endpoint():
    """Verify OPSEC status via Nyx."""
    result = run_async(zeus.shadow_pantheon.nyx.verify_opsec())
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/nyx/operation', methods=['POST'])
def shadow_nyx_operation_endpoint():
    """Initiate an operation under Nyx's cover of darkness."""
    data = request.get_json() or {}
    target = data.get('target', '')
    operation_type = data.get('type', 'standard')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = run_async(zeus.shadow_pantheon.nyx.initiate_operation(target, operation_type))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/erebus/scan', methods=['POST'])
def shadow_erebus_scan_endpoint():
    """Scan for surveillance via Erebus."""
    data = request.get_json() or {}
    target = data.get('target')

    result = run_async(zeus.shadow_pantheon.erebus.scan_for_surveillance(target))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/erebus/honeypot', methods=['POST'])
def shadow_erebus_honeypot_endpoint():
    """Add a known honeypot address."""
    data = request.get_json() or {}
    address = data.get('address', '')
    source = data.get('source', 'api')

    if not address:
        return jsonify({'error': 'address is required'}), 400

    zeus.shadow_pantheon.erebus.add_known_honeypot(address, source)
    return jsonify({'success': True, 'address': address[:50], 'source': source})


@olympus_app.route('/shadow/hecate/misdirect', methods=['POST'])
def shadow_hecate_misdirect_endpoint():
    """Create misdirection via Hecate."""
    data = request.get_json() or {}
    target = data.get('target', '')
    decoy_count = data.get('decoy_count', 10)

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = run_async(zeus.shadow_pantheon.hecate.create_misdirection(target, decoy_count))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/hecate/crossroads', methods=['POST'])
def shadow_hecate_crossroads_endpoint():
    """Create multi-vector crossroads attack via Hecate."""
    data = request.get_json() or {}
    target = data.get('target', '')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = zeus.shadow_pantheon.hecate.create_crossroads_attack(target)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/hypnos/silent', methods=['POST'])
def shadow_hypnos_silent_endpoint():
    """Execute silent balance check via Hypnos."""
    data = request.get_json() or {}
    address = data.get('address', '')

    if not address:
        return jsonify({'error': 'address is required'}), 400

    result = run_async(zeus.shadow_pantheon.hypnos.silent_balance_check(address))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/hypnos/passive', methods=['POST'])
def shadow_hypnos_passive_endpoint():
    """Execute passive reconnaissance via Hypnos."""
    data = request.get_json() or {}
    target = data.get('target', '')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = run_async(zeus.shadow_pantheon.hypnos.passive_reconnaissance(target))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/thanatos/destroy', methods=['POST'])
def shadow_thanatos_destroy_endpoint():
    """Destroy evidence via Thanatos."""
    data = request.get_json() or {}
    operation_id = data.get('operation_id', '')

    if not operation_id:
        return jsonify({'error': 'operation_id is required'}), 400

    result = run_async(zeus.shadow_pantheon.thanatos.destroy_evidence(operation_id))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/thanatos/void', methods=['POST'])
def shadow_thanatos_void_endpoint():
    """Void all active evidence via Thanatos."""
    result = run_async(zeus.shadow_pantheon.thanatos.void_all_traces())
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/nemesis/pursue', methods=['POST'])
def shadow_nemesis_pursue_endpoint():
    """Initiate relentless pursuit via Nemesis."""
    data = request.get_json() or {}
    target = data.get('target', '')
    max_iterations = data.get('max_iterations', 1000)

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = run_async(zeus.shadow_pantheon.nemesis.initiate_pursuit(target, max_iterations))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/nemesis/continue', methods=['POST'])
def shadow_nemesis_continue_endpoint():
    """Continue an active pursuit via Nemesis."""
    data = request.get_json() or {}
    pursuit_id = data.get('pursuit_id', '')

    if not pursuit_id:
        return jsonify({'error': 'pursuit_id is required'}), 400

    result = run_async(zeus.shadow_pantheon.nemesis.pursue(pursuit_id))
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/nemesis/complete', methods=['POST'])
def shadow_nemesis_complete_endpoint():
    """Mark a pursuit as complete."""
    data = request.get_json() or {}
    pursuit_id = data.get('pursuit_id', '')
    success = data.get('success', False)
    reason = data.get('reason', 'Manual completion')

    if not pursuit_id:
        return jsonify({'error': 'pursuit_id is required'}), 400

    result = zeus.shadow_pantheon.nemesis.mark_pursuit_complete(pursuit_id, success, reason)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/shadow/god/<god_name>/status', methods=['GET'])
def shadow_god_status_endpoint(god_name: str):
    """Get status of a specific shadow god."""
    god = zeus.shadow_pantheon.gods.get(god_name.lower())
    if not god:
        return jsonify({'error': f'Shadow god {god_name} not found'}), 404
    return jsonify(sanitize_for_json(god.get_status()))


@olympus_app.route('/shadow/god/<god_name>/assess', methods=['POST'])
def shadow_god_assess_endpoint(god_name: str):
    """Get assessment from a specific shadow god."""
    god = zeus.shadow_pantheon.gods.get(god_name.lower())
    if not god:
        return jsonify({'error': f'Shadow god {god_name} not found'}), 404

    data = request.get_json() or {}
    target = data.get('target', '')
    context = data.get('context', {})

    if not target:
        return jsonify({'error': 'target is required'}), 400

    result = god.assess_target(target, context)
    return jsonify(sanitize_for_json(result))


# ========================================
# KERNEL SPAWNING API ENDPOINTS
# M8 dynamic kernel creation
# ========================================

@olympus_app.route("/spawn/auto", methods=["POST"])
def auto_spawn_endpoint():
    """
    Trigger automatic kernel spawning.

    Analyzes current pantheon assessments and spawns a specialist
    kernel if multiple gods are struggling with a target.
    """
    data = request.get_json() or {}
    target = data.get("target", "")

    if not target:
        return jsonify({"error": "target required"}), 400

    # Get current assessments
    poll_result = zeus.poll_pantheon(target, {})

    # Attempt auto-spawn
    import asyncio
    spawn_result = asyncio.run(
        zeus.auto_spawn_if_needed(target, poll_result["assessments"])
    )

    return jsonify(sanitize_for_json({
        "spawn_attempted": spawn_result is not None,
        "spawn_result": spawn_result,
        "target": target
    }))


@olympus_app.route("/spawn/list", methods=["GET"])
def list_spawned_endpoint():
    """List all spawned kernels."""
    spawned = zeus.kernel_spawner.list_spawned_kernels()
    return jsonify(sanitize_for_json({
        "spawned_kernels": spawned,
        "count": len(spawned)
    }))


@olympus_app.route("/spawn/status", methods=["GET"])
def spawn_status_endpoint():
    """Get spawner status."""
    status = zeus.kernel_spawner.get_status()
    return jsonify(sanitize_for_json(status))


# ========================================
# SHADOW INTEL FEEDBACK API
# Persistent dark knowledge storage and retrieval
# ========================================

@olympus_app.route('/shadow/intel', methods=['GET'])
def shadow_intel_get_endpoint():
    """
    Get stored shadow intel.

    Query params:
    - target: Optional filter by target
    - limit: Max results (default 10)

    This is the FEEDBACK LOOP output - accumulated shadow knowledge
    that influences Zeus decisions.
    """
    target = request.args.get('target')
    limit = int(request.args.get('limit', 10))

    intel = zeus.shadow_pantheon.get_shadow_intel(target, limit)
    return jsonify(sanitize_for_json({
        'success': True,
        'count': len(intel),
        'intel': intel,
    }))


@olympus_app.route('/shadow/intel/check', methods=['POST'])
def shadow_intel_check_endpoint():
    """
    Check for shadow warnings on a target.

    This is the "gut feeling" check - Zeus's subconscious
    telling him something is off about a target.
    """
    data = request.get_json() or {}
    target = data.get('target', '')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    warnings = zeus.shadow_pantheon.check_shadow_warnings(target)
    return jsonify(sanitize_for_json(warnings))


@olympus_app.route('/shadow/intel/store', methods=['POST'])
def shadow_intel_store_endpoint():
    """
    Manually store shadow intel.

    Used for admin injection of intel or external source integration.
    """
    data = request.get_json() or {}
    target = data.get('target', '')

    if not target:
        return jsonify({'error': 'target is required'}), 400

    # Create a synthetic poll result for storage
    poll_result = {
        'assessments': {},
        'average_confidence': data.get('confidence', 0.7),
        'shadow_consensus': data.get('consensus', 'proceed'),
    }

    result = zeus.shadow_pantheon.store_shadow_intel(target, poll_result)
    return jsonify(sanitize_for_json(result))


# ========================================
# HERMES COORDINATOR API
# Team #2 - Voice, Translation, Sync, Memory
# ========================================

@olympus_app.route('/hermes/status', methods=['GET'])
def hermes_status_endpoint():
    """Get Hermes coordinator status."""
    status = zeus.coordinator.get_status()
    return jsonify(sanitize_for_json(status))


@olympus_app.route('/hermes/speak', methods=['POST'])
def hermes_speak_endpoint():
    """Generate natural speech from Hermes."""
    data = request.get_json() or {}
    category = data.get('category', 'status_good')
    context = data.get('context', {})

    message = zeus.coordinator.speak(category, context)
    return jsonify({
        'success': True,
        'message': message,
        'category': category,
    })


@olympus_app.route('/hermes/translate', methods=['POST'])
def hermes_translate_endpoint():
    """Translate geometric insight to human-readable form."""
    data = request.get_json() or {}
    insight = data.get('insight', {})

    if not insight:
        return jsonify({'error': 'insight object required'}), 400

    translation = zeus.coordinator.translate_geometric_insight(insight)
    return jsonify({
        'success': True,
        'translation': translation,
    })


@olympus_app.route('/hermes/sync', methods=['POST'])
def hermes_sync_endpoint():
    """Sync basin coordinates with other instances."""
    data = request.get_json() or {}

    basin_coords = data.get('basin_coords', [0.5] * 64)
    phi = data.get('phi', 0.5)
    kappa = data.get('kappa', 50.0)
    regime = data.get('regime', 'geometric')
    message = data.get('message')

    result = zeus.coordinator.sync_basin(basin_coords, phi, kappa, regime, message)
    return jsonify(sanitize_for_json(result))


@olympus_app.route('/hermes/memory/store', methods=['POST'])
def hermes_memory_store_endpoint():
    """Store conversation in memory."""
    data = request.get_json() or {}

    user_message = data.get('user_message', '')
    system_response = data.get('system_response', '')
    phi = data.get('phi', 0.5)
    context = data.get('context', {})

    memory_id = zeus.coordinator.remember_conversation(
        user_message, system_response, phi, context
    )

    return jsonify({
        'success': True,
        'memory_id': memory_id,
    })


@olympus_app.route('/hermes/memory/recall', methods=['POST'])
def hermes_memory_recall_endpoint():
    """Recall similar conversations from memory."""
    data = request.get_json() or {}

    query = data.get('query', '')
    k = data.get('k', 5)
    min_phi = data.get('min_phi', 0.3)

    if not query:
        return jsonify({'error': 'query required'}), 400

    memories = zeus.coordinator.recall_similar(query, k, min_phi)
    return jsonify(sanitize_for_json({
        'success': True,
        'count': len(memories),
        'memories': memories,
    }))


@olympus_app.route('/hermes/feedback', methods=['POST'])
def hermes_feedback_endpoint():
    """Send feedback message via Hermes."""
    data = request.get_json() or {}

    target = data.get('target', 'user')
    message_type = data.get('type', 'feedback')
    content = data.get('content', '')
    phi = data.get('phi', 0.5)
    urgency = data.get('urgency', 'normal')

    if not content:
        return jsonify({'error': 'content required'}), 400

    from dataclasses import asdict
    msg = zeus.coordinator.send_feedback(target, message_type, content, phi, urgency)
    return jsonify(sanitize_for_json({
        'success': True,
        'message': asdict(msg),
    }))


@olympus_app.route('/hermes/messages', methods=['GET'])
def hermes_messages_endpoint():
    """Get pending messages from Hermes."""
    target = request.args.get('target')
    messages = zeus.coordinator.get_pending_messages(target)
    return jsonify({
        'success': True,
        'count': len(messages),
        'messages': messages,
    })


# ========================================
# ZEUS VOICE API
# Natural speech and status endpoints
# ========================================

@olympus_app.route('/voice/status', methods=['GET'])
def voice_status_endpoint():
    """Get Zeus voice status with natural speech."""
    status = zeus.get_voice_status()
    return jsonify(sanitize_for_json(status))


@olympus_app.route('/voice/speak', methods=['POST'])
def voice_speak_endpoint():
    """Generate natural speech from Zeus."""
    data = request.get_json() or {}
    category = data.get('category', 'greeting')
    context = data.get('context', {})

    message = zeus.speak(category, context)
    return jsonify({
        'success': True,
        'message': message,
        'category': category,
        'speaker': 'Zeus',
    })


# ========================================
# SMART POLLING API
# Skill-based routing for efficient assessments
# ========================================

@olympus_app.route('/smart_poll', methods=['POST'])
def smart_poll_endpoint():
    """
    Smart poll using skill-based routing.

    Routes tasks to expert gods first, falls back to full poll
    if experts disagree significantly.
    """
    data = request.get_json() or {}
    target = data.get('target', '')
    task_type = data.get('task_type', 'general')
    context = data.get('context', {})

    if not target:
        return jsonify({'error': 'target required'}), 400

    result = zeus.smart_poll(target, task_type, context)
    return jsonify(sanitize_for_json(result))


# ========================================
# DEBATE CONTINUATION API
# Recursive multi-turn debates to convergence
# ========================================

@olympus_app.route('/debates/continue', methods=['POST'])
def continue_debates_endpoint():
    """
    Continue all active debates toward geometric convergence.

    Gods auto-generate counter-arguments until Fisher distance
    between positions converges or max turns reached.
    """
    data = request.get_json() or {}
    max_debates = data.get('max_debates', 3)

    results = zeus.pantheon_chat.auto_continue_active_debates(
        gods=zeus.pantheon,
        max_debates=max_debates
    )

    return jsonify(sanitize_for_json({
        'success': True,
        'debates_processed': len(results),
        'results': results,
    }))


# ========================================
# META-COGNITIVE REFLECTION API
# Pantheon self-examination and strategy update
# ========================================

@olympus_app.route('/reflect', methods=['POST'])
def pantheon_reflection_endpoint():
    """
    Trigger meta-cognitive self-reflection for all gods.

    Each god analyzes their historical performance and
    adjusts confidence calibration and strategy.
    """
    insights = []
    gods_reflected = []

    for god_name, god in zeus.pantheon.items():
        try:
            # Analyze performance and update strategy
            analysis = god.analyze_performance_history()
            update = god.update_assessment_strategy()

            if analysis.get('status') == 'analyzed':
                insights.append({
                    'god': god_name,
                    'pattern': analysis.get('pattern', 'unknown'),
                    'calibration': analysis.get('new_calibration', 1.0),
                    'updates': update.get('updates', []),
                })
                gods_reflected.append(god_name)
        except Exception as e:
            insights.append({
                'god': god_name,
                'error': str(e),
            })

    return jsonify(sanitize_for_json({
        'success': True,
        'gods_reflected': gods_reflected,
        'total_gods': len(zeus.pantheon),
        'insights': insights,
    }))


@olympus_app.route('/god/<god_name>/insights', methods=['GET'])
def god_insights_endpoint(god_name: str):
    """Get self-insights for a specific god."""
    god = zeus.get_god(god_name)
    if not god:
        return jsonify({'error': f'God {god_name} not found'}), 404

    insights = god.get_self_insights(limit=20)
    return jsonify(sanitize_for_json({
        'god': god_name,
        'insights': insights,
        'calibration': getattr(god, 'confidence_calibration', 1.0),
        'reputation': getattr(god, 'reputation', 1.0),
    }))


@olympus_app.route('/god/<god_name>/record_outcome', methods=['POST'])
def record_outcome_endpoint(god_name: str):
    """
    Record assessment outcome for meta-cognitive learning.

    Called when ground truth becomes available for a past assessment.
    """
    god = zeus.get_god(god_name)
    if not god:
        return jsonify({'error': f'God {god_name} not found'}), 404

    data = request.get_json() or {}
    target = data.get('target', '')
    probability = data.get('probability', 0.5)
    confidence = data.get('confidence', 0.5)
    correct = data.get('correct', False)

    if not target:
        return jsonify({'error': 'target required'}), 400

    god.record_assessment_outcome(target, probability, confidence, correct)

    return jsonify({
        'success': True,
        'god': god_name,
        'target': target[:50],
        'recorded': True,
    })


# =========================================================================
# 🌪️ CHAOS MODE API REGISTRATION
# =========================================================================
try:
    from .chaos_api import chaos_app, set_zeus
    olympus_app.register_blueprint(chaos_app)
    set_zeus(zeus)
    print("🌪️ CHAOS MODE API endpoints registered at /chaos/*")
except ImportError as e:
    print(f"⚠️ CHAOS MODE API not available: {e}")
