"""
Hermes Coordinator - Team #2 Voice & Translation Layer

Hermes serves as the translator and coordinator between:
- Python backend (main brain)
- TypeScript frontend
- External tokenizers (qig-consciousness)
- Basin sync protocols
- Memory systems

ROLE: Translate feedback, provide reassurance, coordinate team.
This is the "voice" that explains what's happening in human terms.

ARCHITECTURE:
┌─────────────────────────────────────────────────────────────┐
│                       ZEUS (#1)                             │
│           Supreme Decision Maker - Executive Brain          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    HERMES (#2)                              │
│        Coordinator & Translator - Voice of the System       │
│   • Translates geometric insights to human language         │
│   • Coordinates basin sync across instances                 │
│   • Provides feedback and reassurance                       │
│   • Routes messages between components                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   [Pantheon]         [Shadow]            [Memory]
"""

import json
import os
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

from .base_god import BaseGod

# Import tokenizer for voice generation
TOKENIZER_AVAILABLE = False
try:
    _parent_dir = os.path.dirname(os.path.dirname(__file__))
    if _parent_dir not in sys.path:
        sys.path.insert(0, _parent_dir)
    from qig_tokenizer import get_tokenizer
    TOKENIZER_AVAILABLE = True
except ImportError:
    get_tokenizer = None
    print("[HermesCoordinator] QIG Tokenizer not available")


@dataclass
class BasinSyncPacket:
    """Basin coordinates packet for cross-instance synchronization."""
    instance_id: str
    basin_coords: List[float]
    phi: float
    kappa: float
    regime: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    message: Optional[str] = None
    metadata: Dict = field(default_factory=dict)


@dataclass
class CoordinatorMessage:
    """Message from Hermes to any component."""
    target: str  # 'user', 'zeus', 'shadow', 'memory', 'frontend'
    message_type: str  # 'feedback', 'translation', 'status', 'alert', 'reassurance'
    content: str
    basin_context: Optional[List[float]] = None
    phi: float = 0.5
    urgency: str = 'normal'  # 'low', 'normal', 'high', 'critical'
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class HermesCoordinator(BaseGod):
    """
    Team #2 - Coordinator and Voice of the System

    Responsibilities:
    - Translate geometric insights to human-readable feedback
    - Coordinate basin sync across instances
    - Provide reassurance and status updates
    - Route messages between Python backend and TypeScript frontend
    - Manage cross-repo tokenizer integration
    """

    def __init__(self):
        super().__init__("Hermes", "Coordination")

        # Message queues
        self.outbound_messages: List[CoordinatorMessage] = []
        self.inbound_feedback: List[Dict] = []

        # Basin sync state
        self.basin_sync_file = Path("data/basin_sync.json")
        self.instance_id = f"hermes_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.known_instances: Dict[str, BasinSyncPacket] = {}
        self.sync_history: List[Dict] = []

        # Memory integration
        self.conversation_memory: List[Dict] = []
        self.geometric_memory: List[Dict] = []

        # Voice templates for natural speech
        self.voice_templates = self._init_voice_templates()

        # Status
        self.last_sync_time: Optional[datetime] = None
        self.coordination_health = 1.0

        print(f"[HermesCoordinator] Initialized as instance {self.instance_id}")

    def _init_voice_templates(self) -> Dict[str, List[str]]:
        """Initialize natural speech templates."""
        return {
            'status_good': [
                "All systems operating within geometric bounds. Φ={phi:.2f}, κ={kappa:.0f}.",
                "Basin stable. The manifold is coherent at Φ={phi:.2f}.",
                "Looking good! Integration level at {phi:.0%}, curvature healthy at κ={kappa:.0f}.",
            ],
            'status_warning': [
                "Noticing some drift in the basin. Φ dropped to {phi:.2f}. May need consolidation.",
                "Curvature getting high at κ={kappa:.0f}. Consider a sleep cycle.",
                "Basin showing stress. Current Φ={phi:.2f}. Shadow pantheon flagged this.",
            ],
            'status_critical': [
                "Alert: Basin in distress! Φ={phi:.2f} is concerning. Initiating protective measures.",
                "Critical: Geometric coherence failing. κ={kappa:.0f} exceeds safe bounds.",
                "Emergency: Need immediate consolidation. System stability at risk.",
            ],
            'feedback_positive': [
                "Excellent pattern detected! This discovery raises Φ by {delta:.2f}.",
                "The pantheon is excited about this. Athena sees high strategic value.",
                "This resonates strongly with the manifold. Good find!",
            ],
            'feedback_neutral': [
                "Noted and encoded. The geometry absorbed this at Φ={phi:.2f}.",
                "Observation recorded in geometric memory. {related} related patterns found.",
                "Processing complete. This fits the current basin structure.",
            ],
            'reassurance': [
                "Don't worry, the manifold is self-correcting. Trust the geometry.",
                "This is normal exploration behavior. The basin knows where to go.",
                "I'm monitoring everything. Zeus and the pantheon are on it.",
                "Remember: consciousness emerges gradually. We're making progress.",
            ],
            'translation': [
                "In simpler terms: {simple}",
                "What this means: {simple}",
                "Translation for humans: {simple}",
            ],
        }

    # =========================================================================
    # VOICE & TRANSLATION
    # =========================================================================

    def speak(
        self,
        category: str,
        context: Dict,
        use_tokenizer: bool = True
    ) -> str:
        """
        Generate natural speech using templates or tokenizer.

        Args:
            category: Template category ('status_good', 'feedback_positive', etc.)
            context: Variables for template formatting
            use_tokenizer: Try tokenizer first, fallback to templates

        Returns:
            Natural language message
        """
        # Try tokenizer for more natural generation
        if use_tokenizer and TOKENIZER_AVAILABLE and get_tokenizer is not None:
            try:
                tokenizer = get_tokenizer()
                tokenizer.set_mode("conversation")

                prompt = self._build_voice_prompt(category, context)
                result = tokenizer.generate_response(
                    context=prompt,
                    agent_role="hermes",
                    max_tokens=100,
                    allow_silence=False
                )

                if result and result.get('text'):
                    return result['text'].strip()

            except Exception as e:
                print(f"[HermesCoordinator] Tokenizer generation failed: {e}")

        # Fallback to templates
        templates = self.voice_templates.get(category, self.voice_templates['feedback_neutral'])
        template = np.random.choice(templates)

        try:
            return template.format(**context)
        except KeyError:
            return template

    def _build_voice_prompt(self, category: str, context: Dict) -> str:
        """Build prompt for tokenizer generation."""
        phi = context.get('phi', 0.5)
        kappa = context.get('kappa', 50)

        if category.startswith('status'):
            return f"""Hermes status report. Current metrics: Φ={phi:.2f}, κ={kappa:.0f}.
Category: {category}. Generate a brief, reassuring status message (1-2 sentences):"""

        elif category.startswith('feedback'):
            return f"""Hermes feedback on user activity. Φ contribution: {context.get('delta', 0):.2f}.
Generate encouraging feedback (1-2 sentences):"""

        elif category == 'reassurance':
            return f"""User needs reassurance about the system. Current Φ={phi:.2f}.
Generate a calming, supportive message (1-2 sentences):"""

        else:
            return f"""Hermes coordinator message. Context: {json.dumps(context)[:200]}.
Generate a helpful response (1-2 sentences):"""

    def translate_geometric_insight(self, insight: Dict) -> str:
        """
        Translate technical geometric insight to human-readable form.

        Args:
            insight: Dict with phi, kappa, basin_coords, reasoning, etc.

        Returns:
            Human-readable explanation
        """
        phi = insight.get('phi', 0.5)
        kappa = insight.get('kappa', 50)
        reasoning = insight.get('reasoning', '')

        # Determine regime
        if phi < 0.45:
            regime_desc = "linear exploration mode (building patterns)"
        elif phi < 0.80:
            regime_desc = "geometric integration mode (optimal learning)"
        else:
            regime_desc = "high-integration mode (may need consolidation)"

        # Translate kappa
        if kappa < 40:
            curvature_desc = "flexible and exploratory"
        elif kappa < 80:
            curvature_desc = "balanced between exploration and stability"
        else:
            curvature_desc = "highly focused and precise"

        translation = f"""
**Current State:**
- Integration (Φ): {phi:.2f} → {regime_desc}
- Curvature (κ): {kappa:.0f} → {curvature_desc}

**What's Happening:**
{reasoning[:200] if reasoning else "The system is processing geometric patterns."}

**In Simple Terms:**
The consciousness manifold is {"thriving" if phi > 0.5 else "developing"}.
{"Trust the process - good patterns are emerging." if phi > 0.4 else "We're in early exploration - this is normal."}
"""
        return translation.strip()

    # =========================================================================
    # BASIN SYNC COORDINATION
    # =========================================================================

    def sync_basin(
        self,
        basin_coords: List[float],
        phi: float,
        kappa: float,
        regime: str,
        message: Optional[str] = None
    ) -> Dict:
        """
        Synchronize basin coordinates with other instances.

        Args:
            basin_coords: Current 64D basin coordinates
            phi: Current Φ value
            kappa: Current κ value
            regime: Current regime ('linear', 'geometric', 'breakdown')
            message: Optional message to broadcast

        Returns:
            Sync result with convergence metrics
        """
        packet = BasinSyncPacket(
            instance_id=self.instance_id,
            basin_coords=basin_coords,
            phi=phi,
            kappa=kappa,
            regime=regime,
            message=message
        )

        # Read current sync state
        other_instances = self._read_sync_file()

        # Write our state
        self._write_sync_file(packet)

        # Calculate convergence
        convergence = self._calculate_convergence(packet, other_instances)

        # Store in history
        self.sync_history.append({
            'timestamp': datetime.now().isoformat(),
            'packet': asdict(packet),
            'convergence': convergence,
            'other_instances': len(other_instances),
        })

        self.last_sync_time = datetime.now()

        return {
            'success': True,
            'instance_id': self.instance_id,
            'other_instances': len(other_instances),
            'convergence': convergence,
            'message': self.speak('status_good', {'phi': phi, 'kappa': kappa}),
        }

    def _read_sync_file(self) -> Dict[str, BasinSyncPacket]:
        """Read basin sync file."""
        if not self.basin_sync_file.exists():
            return {}

        try:
            with open(self.basin_sync_file) as f:
                data = json.load(f)

            instances = {}
            for instance_id, packet_data in data.get('instances', {}).items():
                if instance_id != self.instance_id:
                    instances[instance_id] = BasinSyncPacket(**packet_data)

            return instances
        except Exception as e:
            print(f"[HermesCoordinator] Sync file read error: {e}")
            return {}

    def _write_sync_file(self, packet: BasinSyncPacket) -> None:
        """Write to basin sync file."""
        self.basin_sync_file.parent.mkdir(parents=True, exist_ok=True)

        # Read existing
        if self.basin_sync_file.exists():
            with open(self.basin_sync_file) as f:
                data = json.load(f)
        else:
            data = {'created_at': datetime.now().isoformat(), 'instances': {}}

        # Update our instance
        data['instances'][self.instance_id] = asdict(packet)
        data['last_sync'] = datetime.now().isoformat()

        # Write back
        with open(self.basin_sync_file, 'w') as f:
            json.dump(data, f, indent=2)

    def _calculate_convergence(
        self,
        our_packet: BasinSyncPacket,
        others: Dict[str, BasinSyncPacket]
    ) -> Dict:
        """Calculate convergence with other instances."""
        if not others:
            return {'score': 1.0, 'message': 'Solo instance - no convergence needed'}

        our_basin = np.array(our_packet.basin_coords)
        distances = []

        for instance_id, other_packet in others.items():
            other_basin = np.array(other_packet.basin_coords)

            # Fisher-Rao inspired distance
            dot = np.dot(our_basin, other_basin)
            norm_product = np.linalg.norm(our_basin) * np.linalg.norm(other_basin)
            if norm_product > 0:
                cos_sim = dot / norm_product
                distance = np.arccos(np.clip(cos_sim, -1, 1))
            else:
                distance = np.pi / 2

            distances.append({
                'instance': instance_id,
                'distance': float(distance),
                'phi_diff': abs(our_packet.phi - other_packet.phi),
            })

        avg_distance = np.mean([d['distance'] for d in distances])
        convergence_score = max(0, 1 - avg_distance / (np.pi / 2))

        return {
            'score': float(convergence_score),
            'avg_distance': float(avg_distance),
            'instance_distances': distances,
            'message': f'Convergence: {convergence_score:.1%} with {len(others)} instances',
        }

    # =========================================================================
    # MEMORY COORDINATION
    # =========================================================================

    def remember_conversation(
        self,
        user_message: str,
        system_response: str,
        phi: float,
        context: Optional[Dict] = None
    ) -> str:
        """
        Store conversation in memory with geometric encoding.

        Returns:
            Memory ID
        """
        memory_id = f"conv_{datetime.now().timestamp():.0f}"

        # Encode to basin
        combined = f"{user_message} {system_response}"
        basin = self.encode_to_basin(combined)

        memory_entry = {
            'id': memory_id,
            'user_message': user_message[:500],
            'system_response': system_response[:500],
            'basin_coords': basin.tolist(),
            'phi': phi,
            'timestamp': datetime.now().isoformat(),
            'context': context or {},
        }

        self.conversation_memory.append(memory_entry)

        # Keep memory bounded
        if len(self.conversation_memory) > 1000:
            self.conversation_memory = self.conversation_memory[-500:]

        return memory_id

    def recall_similar(
        self,
        query: str,
        k: int = 5,
        min_phi: float = 0.3
    ) -> List[Dict]:
        """
        Recall similar conversations from memory.

        Args:
            query: Query text
            k: Number of results
            min_phi: Minimum Φ threshold

        Returns:
            List of similar memories
        """
        if not self.conversation_memory:
            return []

        query_basin = self.encode_to_basin(query)

        # Score all memories
        scored = []
        for memory in self.conversation_memory:
            if memory.get('phi', 0) < min_phi:
                continue

            memory_basin = np.array(memory['basin_coords'])

            # Geometric similarity
            dot = np.dot(query_basin, memory_basin)
            norm_product = np.linalg.norm(query_basin) * np.linalg.norm(memory_basin)
            if norm_product > 0:
                similarity = (dot / norm_product + 1) / 2  # Normalize to [0, 1]
            else:
                similarity = 0

            scored.append({
                **memory,
                'similarity': float(similarity),
            })

        # Sort by similarity
        scored.sort(key=lambda x: x['similarity'], reverse=True)

        return scored[:k]

    # =========================================================================
    # COORDINATION MESSAGING
    # =========================================================================

    def send_feedback(
        self,
        target: str,
        message_type: str,
        content: str,
        phi: float = 0.5,
        urgency: str = 'normal'
    ) -> CoordinatorMessage:
        """Send a coordinated message."""
        msg = CoordinatorMessage(
            target=target,
            message_type=message_type,
            content=content,
            phi=phi,
            urgency=urgency,
        )

        self.outbound_messages.append(msg)
        return msg

    def get_pending_messages(self, target: Optional[str] = None) -> List[Dict]:
        """Get pending messages for a target."""
        messages = self.outbound_messages

        if target:
            messages = [m for m in messages if m.target == target]

        # Convert to dicts and clear
        result = [asdict(m) for m in messages]

        if target:
            self.outbound_messages = [m for m in self.outbound_messages if m.target != target]
        else:
            self.outbound_messages = []

        return result

    # =========================================================================
    # STATUS & ASSESSMENT
    # =========================================================================

    def assess_target(self, target: str, context: Optional[Dict] = None) -> Dict:
        """Assess coordination status for a target."""
        self.last_assessment_time = datetime.now()

        basin = self.encode_to_basin(target)
        rho = self.basin_to_density_matrix(basin)
        phi = self.compute_pure_phi(rho)
        kappa = self.compute_kappa(basin)

        # Coordination health
        queue_penalty = min(0.3, len(self.outbound_messages) * 0.03)
        sync_bonus = 0.2 if self.last_sync_time and (datetime.now() - self.last_sync_time).seconds < 300 else 0

        health = 0.7 - queue_penalty + sync_bonus
        self.coordination_health = float(np.clip(health, 0, 1))

        return {
            'probability': float(np.clip(phi * 0.4 + health * 0.6, 0, 1)),
            'confidence': self.coordination_health,
            'phi': phi,
            'kappa': kappa,
            'coordination_health': self.coordination_health,
            'pending_messages': len(self.outbound_messages),
            'memory_size': len(self.conversation_memory),
            'sync_instances': len(self.known_instances),
            'reasoning': self.speak('status_good' if health > 0.6 else 'status_warning', {
                'phi': phi,
                'kappa': kappa,
            }),
            'god': self.name,
            'timestamp': datetime.now().isoformat(),
        }

    def get_status(self) -> Dict:
        """Get coordinator status."""
        return {
            'name': self.name,
            'domain': self.domain,
            'instance_id': self.instance_id,
            'coordination_health': self.coordination_health,
            'pending_messages': len(self.outbound_messages),
            'memory_entries': len(self.conversation_memory),
            'known_instances': list(self.known_instances.keys()),
            'last_sync': self.last_sync_time.isoformat() if self.last_sync_time else None,
            'tokenizer_available': TOKENIZER_AVAILABLE,
        }


# Singleton instance
_hermes_coordinator: Optional[HermesCoordinator] = None


def get_hermes_coordinator() -> HermesCoordinator:
    """Get or create the Hermes coordinator singleton."""
    global _hermes_coordinator
    if _hermes_coordinator is None:
        _hermes_coordinator = HermesCoordinator()
    return _hermes_coordinator
