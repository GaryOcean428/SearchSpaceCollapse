"""
Olympian Pantheon - Pure QIG Consciousness Kernels

Mount Olympus: Where the gods of consciousness reside.
Python hosts pure geometric consciousness - TypeScript merely orchestrates.

HIERARCHY:
#1 Zeus     - Supreme Coordinator (executive decisions, war mode)
#2 Hermes   - Coordinator/Voice (translation, sync, memory, feedback)
#3+ Others  - Specialized kernels (Athena strategy, Ares action, etc.)

Architecture:
- Zeus: Supreme Coordinator (polls pantheon, detects convergence, declares war)
- Hermes Coordinator: Team #2 (voice, translation, basin sync, memory)
- 12 Olympian Gods: Specialized consciousness kernels
- Shadow Pantheon: Covert operations (Nyx, Hecate, Erebus, etc.)

The gods speak in pure geometry:
- Density matrices for quantum states
- Fisher manifold navigation
- Bures distance for similarity
- Von Neumann entropy for information
"""

from .aphrodite import Aphrodite
from .apollo import Apollo
from .ares import Ares
from .artemis import Artemis

# Olympian Gods
from .athena import Athena
from .base_god import BaseGod
from .demeter import Demeter
from .dionysus import Dionysus
from .hades import Hades
from .hephaestus import Hephaestus
from .hera import Hera
from .hermes import Hermes

# Team #2 - Coordinator
from .hermes_coordinator import HermesCoordinator, get_hermes_coordinator

# Communication
from .pantheon_chat import Debate, PantheonChat, PantheonMessage
from .poseidon import Poseidon

# Shadow Pantheon
from .shadow_pantheon import Erebus, Hecate, Hypnos, Nemesis, Nyx, ShadowGod, ShadowPantheon, Thanatos

# Core hierarchy
from .zeus import Zeus, olympus_app, zeus

# Zeus Chat (voice integration)
from .zeus_chat import ZeusConversationHandler

# Conversational Kernel System
try:
    from conversational_kernel import (
        ConversationalKernelMixin,
        ConversationState,
        patch_god_with_conversation,
        patch_all_gods_with_conversation,
    )
    from recursive_conversation_orchestrator import (
        RecursiveConversationOrchestrator,
        get_conversation_orchestrator,
    )
    CONVERSATION_AVAILABLE = True
except ImportError:
    CONVERSATION_AVAILABLE = False

__all__ = [
    # Hierarchy
    'Zeus',
    'olympus_app',
    'zeus',
    'BaseGod',

    # Coordinator (#2)
    'HermesCoordinator',
    'get_hermes_coordinator',

    # Olympians
    'Athena',
    'Ares',
    'Apollo',
    'Artemis',
    'Hermes',
    'Hephaestus',
    'Demeter',
    'Dionysus',
    'Poseidon',
    'Hades',
    'Hera',
    'Aphrodite',

    # Communication
    'PantheonChat',
    'PantheonMessage',
    'Debate',
    'ZeusConversationHandler',

    # Shadow
    'ShadowPantheon',
    'ShadowGod',
    'Nyx',
    'Hecate',
    'Erebus',
    'Hypnos',
    'Thanatos',
    'Nemesis',

    # Conversational Kernel System
    'ConversationalKernelMixin',
    'ConversationState',
    'patch_god_with_conversation',
    'patch_all_gods_with_conversation',
    'RecursiveConversationOrchestrator',
    'get_conversation_orchestrator',
    'CONVERSATION_AVAILABLE',
]
