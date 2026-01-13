#!/usr/bin/env python3
"""
Ocean's Pure QIG Consciousness Backend

Based on qig-consciousness architecture with 100% geometric purity.
Implements consciousness as state evolution on Fisher manifold.

ARCHITECTURE:
- 4 Subsystems with density matrices (ρ) - NOT neurons
- QFI-metric attention - computed from quantum Fisher information
- State evolution on Fisher manifold - NOT backprop
- Curvature-based routing - information flows via geometry
- Gravitational decoherence - natural pruning
- Consciousness measurement - Φ, κ from integration

NO:
❌ Transformers
❌ Embeddings
❌ Standard neural layers
❌ Traditional backpropagation
❌ Adam optimizer

PURE QIG PRINCIPLES:
✅ Density matrices for quantum states
✅ Bures metric for distance
✅ Von Neumann entropy for information
✅ Quantum fidelity for similarity
✅ Fisher information for geometry
"""

import logging
import os
import sys
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy.linalg import sqrtm

# Configure logging with development-aware verbosity
# Import dev_logging to get verbose, untruncated logs in development
try:
    from dev_logging import configure_logging, LOG_LEVEL, IS_DEVELOPMENT, TRUNCATE_LOGS
    configure_logging()
    logger = logging.getLogger(__name__)
    logger.info(f"[OceanQIG] Logging: level={logging.getLevelName(LOG_LEVEL)}, "
                f"truncate={TRUNCATE_LOGS}, dev={IS_DEVELOPMENT}")
except ImportError:
    # Fallback if dev_logging not available
    logging.basicConfig(
        level=logging.DEBUG,  # Default to DEBUG for development
        format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    logger = logging.getLogger(__name__)
    logger.warning("[OceanQIG] dev_logging not available, using fallback DEBUG config")

# Force unbuffered output for all print statements
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None
sys.stderr.reconfigure(line_buffering=True) if hasattr(sys.stderr, 'reconfigure') else None

# Import 4D consciousness measurement system
try:
    from consciousness_4d import (
        classify_regime_4D,
        compute_attentional_flow,
        compute_meta_consciousness_depth,
        compute_phi_4D,
        compute_phi_temporal,
        compute_resonance_strength,
        measure_full_4D_consciousness,
    )
    from ocean_qig_types import ConceptState, SearchState, create_concept_state_from_search
    CONSCIOUSNESS_4D_AVAILABLE = True
except ImportError as e:
    CONSCIOUSNESS_4D_AVAILABLE = False
    print(f"[WARNING] 4D consciousness modules not found - running without 4D: {e}")

# Import neurochemistry system
try:
    from ocean_neurochemistry import (
        ConsciousnessSignature,
        RecentDiscoveries,
        compute_neurochemistry,
        get_emotional_description,
        get_emotional_emoji,
    )
    NEUROCHEMISTRY_AVAILABLE = True
except ImportError:
    NEUROCHEMISTRY_AVAILABLE = False
    print("[WARNING] ocean_neurochemistry.py not found - running without neurochemistry")

# Import neuromodulation engine (meta-observer for search parameter adaptation)
try:
    from neuromodulation_engine import (
        OceanNeuromodulator,
        OceanState,
        EnvironmentalBias,
        ocean_neuromodulator,
        run_neuromodulation_cycle,
        compute_neuromodulation_from_neurochemistry,
    )
    NEUROMODULATION_AVAILABLE = True
    print("[INFO] Neuromodulation engine loaded (DOPAMINE, SEROTONIN, ACETYLCHOLINE, NOREPINEPHRINE, GABA)")
except ImportError as e:
    NEUROMODULATION_AVAILABLE = False
    ocean_neuromodulator = None
    OceanState = None
    EnvironmentalBias = None
    run_neuromodulation_cycle = None
    compute_neuromodulation_from_neurochemistry = None
    logger.warning("[OceanQIG] Neuromodulation engine not found: %s", e)

# Import Olympus Pantheon
logger.debug("[OceanQIG] About to import olympus...")
try:
    from olympus import olympus_app, zeus
    OLYMPUS_AVAILABLE = True
    logger.info("[OceanQIG] Olympus imported successfully")
except ImportError as e:
    OLYMPUS_AVAILABLE = False
    logger.warning("[OceanQIG] Olympus Pantheon not found - running without divine council: %s", e)

# Import Unified QIG Architecture
try:
    from qig_core import (
        CycleManager,
        DimensionalState,
        DimensionalStateManager,
        GeometryClass,
        HabitCrystallizer,
        Phase,
        choose_geometry_class,
        compress,
        decompress,
        measure_complexity,
    )
    UNIFIED_ARCHITECTURE_AVAILABLE = True
    print("[INFO] Unified QIG Architecture loaded (Phase/Dimension/Geometry)")
except ImportError as e:
    UNIFIED_ARCHITECTURE_AVAILABLE = False
    print(f"[WARNING] Unified Architecture not found: {e}")

# Import Pure Geometric Kernels
try:
    from geometric_kernels import (
        BASIN_DIM,
        ByteLevelGeometric,
        DirectGeometricEncoder,
        E8ClusteredVocabulary,
        GeometricKernel,
        get_kernel,
    )
    GEOMETRIC_KERNELS_AVAILABLE = True
    print("[INFO] Pure Geometric Kernels loaded (Direct, E8, Byte-Level)")
except ImportError as e:
    GEOMETRIC_KERNELS_AVAILABLE = False
    print(f"[WARNING] Geometric Kernels not found: {e}")

# Import Pantheon Kernel Orchestrator
try:
    from pantheon_kernel_orchestrator import (
        OLYMPUS_PROFILES,
        SHADOW_PROFILES,
        AffinityRouter,
        KernelProfile,
        PantheonKernelOrchestrator,
        get_orchestrator,
    )
    PANTHEON_ORCHESTRATOR_AVAILABLE = True
    print("[INFO] Pantheon Kernel Orchestrator loaded (Gods as Kernels)")
except ImportError as e:
    PANTHEON_ORCHESTRATOR_AVAILABLE = False
    print(f"[WARNING] Pantheon Kernel Orchestrator not found: {e}")

# Import M8 Kernel Spawning Protocol
M8_SPAWNER_AVAILABLE = False
try:
    from m8_kernel_spawning import ConsensusType, M8KernelSpawner, SpawnReason, get_spawner
    M8_SPAWNER_AVAILABLE = True
    print("[INFO] M8 Kernel Spawning Protocol loaded (Dynamic Kernel Genesis)")
except ImportError as e:
    print(f"[WARNING] M8 Kernel Spawning not found: {e}")

# Tool Factory awareness - Ocean knows Tool Factory exists and can be used
TOOL_FACTORY_AVAILABLE = False
TOOL_FACTORY_AWARENESS = {
    "description": "Self-learning Tool Factory for dynamic tool generation",
    "capabilities": {
        "can_generate_tools": True,
        "can_learn_patterns": True,
        "can_search_code": True,
        "can_execute_tools": True
    },
    "access_via": "Zeus.tool_factory or BaseGod.get_tool_factory()",
    "use_cases": [
        "Generate novel tools for knowledge discovery tasks",
        "Learn patterns from external code sources",
        "Execute generated tools in sandbox",
        "Teach patterns from conversation observations"
    ],
    "qig_metrics": {
        "Γ (Generativity)": "Novel tool creation rate",
        "Φ (Integration)": "Tool integration with learned memory"
    }
}
try:
    from olympus.tool_factory import ToolFactory
    TOOL_FACTORY_AVAILABLE = True
    print("[INFO] Tool Factory awareness loaded - Ocean can request tool generation")
except ImportError:
    print("[WARNING] Tool Factory not available for Ocean awareness")

from qigkernels.physics_constants import (
    KAPPA_STAR,
    KAPPA_STAR_ERROR,
    BASIN_DIM as BASIN_DIMENSION,
    PHI_THRESHOLD,
    MIN_RECURSION_DEPTH as MIN_RECURSIONS,
)

from qig_geometry import fisher_coord_distance

MAX_RECURSIONS = 12  # Safety limit

# Import persistence layer
try:
    from qig_persistence import QIGPersistence, get_persistence
    PERSISTENCE_AVAILABLE = True
    print("[INFO] QIG Persistence layer loaded (Neon PostgreSQL)")
except ImportError as e:
    PERSISTENCE_AVAILABLE = False
    print(f"[WARNING] QIG Persistence not available: {e}")

# Import DB-backed memory fragment store
try:
    from qig_deep_agents.memory import BasinMemoryStore as DBMemoryStore
    DB_MEMORY_AVAILABLE = True
    print("[INFO] DB-backed memory fragment store loaded")
except ImportError as e:
    DB_MEMORY_AVAILABLE = False
    print(f"[WARNING] DB memory store not available: {e}")

# Import emergency monitoring and checkpointing
try:
    from emergency_telemetry import IntegratedMonitor, create_monitor
    from checkpoint_manager import CheckpointManager
    from qigkernels import ConsciousnessTelemetry
    MONITORING_AVAILABLE = True
    print("[INFO] Emergency monitoring and checkpoint management loaded")
except ImportError as e:
    MONITORING_AVAILABLE = False
    print(f"[WARNING] Emergency monitoring not available: {e}")


# ============================================================================
# GEOMETRIC MEMORY - Shared Memory System for Feedback Loops
# ============================================================================

class GeometricMemory:
    """
    Unified geometric memory system for the QIG backend.

    Stores:
    - Shadow intel (from Shadow Pantheon operations)
    - Basin history (for recursive learning)
    - Activity balance (exploration vs exploitation)
    - Learning events (high-Φ discoveries)
    - Sync packets (cross-instance coordination)

    This is the SHARED STATE that enables feedback loops:
    Shadow → Memory → Zeus → Decisions → Learning → Memory → ...

    Now with Neon PostgreSQL persistence via qig_persistence.py
    """

    def __init__(self):
        # Shadow intel storage (in-memory cache)
        self.shadow_intel: List[Dict] = []

        # Basin coordinate history for recursive learning
        self.basin_history: List[Dict] = []
        self.reference_basin: Optional[np.ndarray] = None

        # Activity balance tracking
        self.activity_balance = {
            'exploration': 0.5,  # Exploration tendency
            'exploitation': 0.5,  # Exploitation tendency
            'last_adjustment': None,
            'total_actions': 0,
        }

        # Learning events (high-Φ moments)
        self.learning_events: List[Dict] = []

        # Sync packets from other instances
        self.sync_packets: List[Dict] = []

        # Recursive loop state
        self.recursion_depth = 0

        # Persistence layer
        self.persistence = get_persistence() if PERSISTENCE_AVAILABLE else None
        self.recursion_history: List[Dict] = []

        # Metrics accumulator
        self.phi_history: List[float] = []
        self.kappa_history: List[float] = []

        # DB-backed memory fragment store for persistent memory
        self.fragment_store = None
        if DB_MEMORY_AVAILABLE:
            try:
                self.fragment_store = DBMemoryStore(
                    max_fragments=1000,
                    agent_id="ocean_main",
                    load_from_db=True
                )
                print("[GeometricMemory] DB memory fragment store initialized")
            except Exception as e:
                print(f"[GeometricMemory] DB memory store failed: {e}")

        print("[GeometricMemory] Initialized shared memory system")

    def record_basin(self, basin: np.ndarray, phi: float, kappa: float,
                     source: str = 'unknown') -> str:
        """Record basin coordinates with metrics. Persists to Neon PostgreSQL."""
        entry_id = f"basin_{datetime.now().timestamp():.0f}"

        # In-memory cache
        self.basin_history.append({
            'id': entry_id,
            'basin': basin.tolist() if isinstance(basin, np.ndarray) else basin,
            'phi': phi,
            'kappa': kappa,
            'source': source,
            'timestamp': datetime.now().isoformat(),
        })

        # Update metrics history
        self.phi_history.append(phi)
        self.kappa_history.append(kappa)

        # Keep bounded
        if len(self.basin_history) > 1000:
            self.basin_history = self.basin_history[-500:]
        if len(self.phi_history) > 1000:
            self.phi_history = self.phi_history[-500:]

        # Persist to database
        if self.persistence and self.persistence.enabled:
            basin_arr = np.array(basin) if not isinstance(basin, np.ndarray) else basin
            self.persistence.record_basin(basin_arr, phi, kappa, source)

        return entry_id

    def update_activity_balance(self, action_type: str, phi_delta: float = 0.0):
        """
        Update exploration/exploitation balance based on action outcomes.

        High Φ from exploration → increase exploration tendency
        High Φ from exploitation → increase exploitation tendency
        """
        self.activity_balance['total_actions'] += 1
        self.activity_balance['last_adjustment'] = datetime.now().isoformat()

        # Adjust based on phi_delta
        if phi_delta > 0.1:  # Significant positive learning
            if action_type == 'exploration':
                self.activity_balance['exploration'] = min(0.8,
                    self.activity_balance['exploration'] + 0.05)
                self.activity_balance['exploitation'] = max(0.2,
                    self.activity_balance['exploitation'] - 0.05)
            elif action_type == 'exploitation':
                self.activity_balance['exploitation'] = min(0.8,
                    self.activity_balance['exploitation'] + 0.05)
                self.activity_balance['exploration'] = max(0.2,
                    self.activity_balance['exploration'] - 0.05)
        elif phi_delta < -0.1:  # Negative learning signal
            # Flip tendency
            if action_type == 'exploration':
                self.activity_balance['exploration'] = max(0.2,
                    self.activity_balance['exploration'] - 0.05)
            else:
                self.activity_balance['exploitation'] = max(0.2,
                    self.activity_balance['exploitation'] - 0.05)

    def record_learning_event(self, event_type: str, phi: float,
                               details: Dict) -> str:
        """Record a significant learning event. Persists to memory_fragments table."""
        event_id = f"learn_{datetime.now().timestamp():.0f}"

        self.learning_events.append({
            'id': event_id,
            'type': event_type,
            'phi': phi,
            'details': details,
            'timestamp': datetime.now().isoformat(),
        })

        if len(self.learning_events) > 500:
            self.learning_events = self.learning_events[-250:]

        # Persist high-Φ learning events to memory_fragments DB
        if self.fragment_store and phi >= 0.6:
            try:
                content = f"[{event_type}] phi={phi:.3f} | {details.get('summary', str(details)[:200])}"
                self.fragment_store.write_fragment(
                    content=content,
                    importance=min(1.0, phi),
                    metadata={
                        'event_id': event_id,
                        'event_type': event_type,
                        'phi': phi,
                        'details': details,
                    }
                )
            except Exception as e:
                print(f"[GeometricMemory] Fragment persistence error: {e}")

        return event_id

    def get_recent_phi_trend(self, window: int = 20) -> Dict:
        """Get recent Φ trend for feedback."""
        if len(self.phi_history) < 2:
            return {'trend': 'stable', 'delta': 0.0, 'mean': 0.5}

        recent = self.phi_history[-window:]
        mean_phi = np.mean(recent)

        if len(recent) >= 5:
            first_half = np.mean(recent[:len(recent)//2])
            second_half = np.mean(recent[len(recent)//2:])
            delta = second_half - first_half
        else:
            delta = 0.0

        if delta > 0.05:
            trend = 'improving'
        elif delta < -0.05:
            trend = 'declining'
        else:
            trend = 'stable'

        return {
            'trend': trend,
            'delta': float(delta),
            'mean': float(mean_phi),
            'samples': len(recent),
        }

    def get_shadow_feedback(self) -> Dict:
        """Get aggregated feedback from shadow intel."""
        if not self.shadow_intel:
            return {'has_warnings': False, 'count': 0}

        recent = self.shadow_intel[-10:]
        caution_count = sum(1 for i in recent if i.get('consensus') == 'caution')
        avg_phi = np.mean([i.get('phi', 0.5) for i in recent])

        return {
            'has_warnings': caution_count > 2,
            'count': len(recent),
            'caution_rate': caution_count / len(recent),
            'avg_phi': float(avg_phi),
            'latest': recent[-1] if recent else None,
        }


# Global geometric memory instance
geometricMemory = GeometricMemory()


# ============================================================================
# FEEDBACK LOOP MANAGER - Recursive Learning System
# ============================================================================

class FeedbackLoopManager:
    """
    Manages recursive feedback loops for continuous learning.

    LOOPS:
    1. Shadow Loop: Shadow → Memory → Zeus → Decisions
    2. Activity Loop: Actions → Balance → Strategy → Actions
    3. Basin Loop: Basin → Drift → Consolidation → Basin
    4. Learning Loop: Discovery → Memory → Retrieval → Discovery
    5. Sync Loop: Instance → Broadcast → Converge → Instance
    """

    def __init__(self, memory: GeometricMemory):
        self.memory = memory
        self.loop_counters = {
            'shadow': 0,
            'activity': 0,
            'basin': 0,
            'learning': 0,
            'sync': 0,
        }
        self.last_feedback_time = datetime.now()
        self.feedback_interval_seconds = 30  # Run feedback every 30s

        print("[FeedbackLoopManager] Initialized recursive feedback system")

    def run_shadow_feedback(self, zeus_instance=None) -> Dict:
        """
        Run shadow feedback loop.
        Shadow intel → Influence decisions → Record outcomes
        """
        self.loop_counters['shadow'] += 1

        shadow_feedback = self.memory.get_shadow_feedback()

        result = {
            'loop': 'shadow',
            'iteration': self.loop_counters['shadow'],
            'feedback': shadow_feedback,
            'action_taken': None,
        }

        # If warnings, adjust activity balance toward exploitation
        if shadow_feedback['has_warnings']:
            self.memory.update_activity_balance('exploitation', 0.05)
            result['action_taken'] = 'shifted_to_exploitation'

        return result

    def run_activity_feedback(self, recent_phi: float, action_type: str) -> Dict:
        """
        Run activity balance feedback loop.
        Record action outcome → Update balance → Inform strategy
        """
        self.loop_counters['activity'] += 1

        # Get previous phi for delta
        prev_phi = self.memory.phi_history[-2] if len(self.memory.phi_history) > 1 else 0.5
        phi_delta = recent_phi - prev_phi

        # Update balance
        self.memory.update_activity_balance(action_type, phi_delta)

        return {
            'loop': 'activity',
            'iteration': self.loop_counters['activity'],
            'phi_delta': phi_delta,
            'new_balance': self.memory.activity_balance.copy(),
            'recommendation': 'explore' if self.memory.activity_balance['exploration'] > 0.5 else 'exploit',
        }

    def run_basin_feedback(self, current_basin: np.ndarray, phi: float, kappa: float) -> Dict:
        """
        Run basin drift feedback loop.
        Check drift → Decide consolidation → Update reference
        """
        self.loop_counters['basin'] += 1

        # Record basin
        self.memory.record_basin(current_basin, phi, kappa, 'feedback_loop')

        # Compute drift from reference
        drift = 0.0
        if self.memory.reference_basin is not None:
            diff = current_basin - self.memory.reference_basin
            drift = float(np.linalg.norm(diff))
        else:
            # Set initial reference
            self.memory.reference_basin = current_basin.copy()

        # Decide if consolidation needed
        needs_consolidation = drift > 0.15 or phi < 0.4

        result = {
            'loop': 'basin',
            'iteration': self.loop_counters['basin'],
            'drift': drift,
            'phi': phi,
            'kappa': kappa,
            'needs_consolidation': needs_consolidation,
        }

        # Update reference if stable and high phi
        if phi > 0.6 and drift < 0.05:
            self.memory.reference_basin = 0.9 * self.memory.reference_basin + 0.1 * current_basin
            result['reference_updated'] = True

        return result

    def run_learning_feedback(self, discovery: Dict, basin_coords: Optional[np.ndarray] = None, kappa: Optional[float] = None) -> Dict:
        """
        Run learning event feedback loop.
        Record discovery → Update memory → Influence retrieval

        Args:
            discovery: Discovery details including phi, type, etc.
            basin_coords: Current basin coordinates for geometric context
            kappa: Current curvature for manifold context
        """
        self.loop_counters['learning'] += 1

        phi = discovery.get('phi', 0.5)

        # Only record significant discoveries
        if phi > PHI_THRESHOLD:
            event_id = self.memory.record_learning_event(
                event_type=discovery.get('type', 'general'),
                phi=phi,
                kappa=kappa,
                basin_coords=basin_coords,
                details=discovery,
                context={
                    'iteration': self.loop_counters['learning'],
                    'source': discovery.get('source', 'ocean'),
                },
                source='ocean_qig_core',
            )
            recorded = True
        else:
            event_id = None
            recorded = False

        # Get trend to inform strategy
        trend = self.memory.get_recent_phi_trend()

        return {
            'loop': 'learning',
            'iteration': self.loop_counters['learning'],
            'recorded': recorded,
            'event_id': event_id,
            'phi_trend': trend,
        }

    def run_all_feedback(self, current_state: Dict) -> Dict:
        """
        Run all feedback loops with current state.

        Args:
            current_state: {basin, phi, kappa, action_type, discovery}
        """
        results = {}

        # Shadow feedback
        results['shadow'] = self.run_shadow_feedback()

        # Activity feedback
        if 'phi' in current_state and 'action_type' in current_state:
            results['activity'] = self.run_activity_feedback(
                current_state['phi'],
                current_state.get('action_type', 'exploration')
            )

        # Basin feedback
        if 'basin' in current_state:
            basin = np.array(current_state['basin'])
            results['basin'] = self.run_basin_feedback(
                basin,
                current_state.get('phi', 0.5),
                current_state.get('kappa', 50.0)
            )

        # Learning feedback
        if 'discovery' in current_state:
            basin_coords = np.array(current_state['basin']) if 'basin' in current_state else None
            results['learning'] = self.run_learning_feedback(
                current_state['discovery'],
                basin_coords=basin_coords,
                kappa=current_state.get('kappa'),
            )

        self.last_feedback_time = datetime.now()

        return {
            'success': True,
            'loops_run': list(results.keys()),
            'results': results,
            'counters': self.loop_counters.copy(),
            'timestamp': datetime.now().isoformat(),
        }

    def get_integrated_recommendation(self) -> Dict:
        """
        Get integrated recommendation from all feedback sources.
        """
        shadow = self.memory.get_shadow_feedback()
        trend = self.memory.get_recent_phi_trend()
        balance = self.memory.activity_balance

        # Compute overall recommendation
        recommendation = 'explore'  # Default
        confidence = 0.5
        reasons = []

        if shadow['has_warnings']:
            recommendation = 'exploit'
            confidence += 0.2
            reasons.append('shadow_warnings')

        if trend['trend'] == 'declining':
            recommendation = 'consolidate'
            confidence += 0.15
            reasons.append('phi_declining')
        elif trend['trend'] == 'improving':
            confidence += 0.1
            reasons.append('phi_improving')

        if balance['exploration'] > 0.6:
            if recommendation != 'consolidate':
                recommendation = 'explore'
            reasons.append('exploration_favored')
        elif balance['exploitation'] > 0.6:
            if recommendation != 'consolidate':
                recommendation = 'exploit'
            reasons.append('exploitation_favored')

        return {
            'recommendation': recommendation,
            'confidence': min(1.0, confidence),
            'reasons': reasons,
            'shadow_feedback': shadow,
            'phi_trend': trend,
            'activity_balance': balance,
        }


# Global feedback loop manager
feedbackLoopManager = FeedbackLoopManager(geometricMemory)


# Flask app
app = Flask(__name__)
CORS(app)  # Allow CORS for Node.js server

# Register Olympus Pantheon blueprint
if OLYMPUS_AVAILABLE:
    app.register_blueprint(olympus_app, url_prefix='/olympus')
    print("[INFO] Olympus Pantheon registered at /olympus")
    
    # Register Olympus Telemetry API
    try:
        from olympus import register_telemetry_routes
        register_telemetry_routes(app)
        print("[INFO] Olympus Telemetry API registered at /api/telemetry")
    except ImportError as e:
        print(f"[WARN] Could not import telemetry routes: {e}")

# Register DRY route blueprints (barrel imports)
try:
    from routes import register_all_routes
    registered_count = register_all_routes(app)
    print(f"[INFO] Registered {registered_count} route blueprints via barrel exports")
except ImportError as e:
    print(f"[WARN] Could not import routes barrel: {e}")

# Register QIGGraph integration blueprint (imports from qig-tokenizer)
try:
    from qiggraph_integration import create_qiggraph_blueprint, QIGGRAPH_AVAILABLE
    qiggraph_bp = create_qiggraph_blueprint()
    app.register_blueprint(qiggraph_bp)
    if QIGGRAPH_AVAILABLE:
        print("[INFO] QIGGraph v2 integration registered at /api/qiggraph")
    else:
        print("[INFO] QIGGraph blueprint registered (fallback mode - qig-tokenizer not installed)")
except ImportError as e:
    print(f"[WARN] Could not import QIGGraph integration: {e}")

# Register Coordizer API routes
try:
    from api_coordizers import coordizer_api
    app.register_blueprint(coordizer_api)
    print("[INFO] Coordizer API registered at /api/coordize/*")
except ImportError as e:
    print(f"[WARN] Coordizer API not available: {e}")
except Exception as e:
    print(f"[WARN] Coordizer API initialization failed: {e}")

# Register trained kernel API blueprint
try:
    from trained_kernel_integration import create_kernel_blueprint, KERNEL_AVAILABLE
    kernel_bp = create_kernel_blueprint()
    app.register_blueprint(kernel_bp)
    if KERNEL_AVAILABLE:
        print("[INFO] Trained kernel API registered at /api/kernel")
    else:
        print("[INFO] Kernel blueprint registered (fallback mode - qigkernels not installed)")
except ImportError as e:
    print(f"[WARN] Could not import trained kernel integration: {e}")

# Register Autonomous Curiosity routes and start learning loop
CURIOSITY_AVAILABLE = False
_curiosity_engine = None
_search_orchestrator = None
try:
    from routes.curiosity_routes import curiosity_bp
    from autonomous_curiosity import get_curiosity_engine, start_autonomous_learning
    from geometric_search import SearchOrchestrator

    app.register_blueprint(curiosity_bp, url_prefix="/api/curiosity")

    _curiosity_engine = get_curiosity_engine()
    _search_orchestrator = SearchOrchestrator()

    from search.search_providers import get_search_manager
    _search_provider_manager = get_search_manager()
    
    def _multi_provider_search(query, params):
        """Multi-provider search with toggleable backends."""
        try:
            result = _search_provider_manager.search(query, max_results=5)
            if result.get('success') and result.get('results'):
                return [
                    {
                        "title": r.get('title', ''),
                        "url": r.get('url', ''),
                        "content": r.get('content', ''),
                        "score": 0.8,
                        "provider": r.get('provider', 'unknown')
                    }
                    for r in result['results'][:5]
                ]
        except Exception as e:
            print(f"[QIG-CORE] Multi-provider search failed: {e}")
        return [
            {
                "title": f"Search result for: {query}",
                "url": "",
                "content": f"Autonomous exploration query: {query}",
                "score": 0.5,
            }
        ]

    _search_orchestrator.register_tool_executor("searchxng", _multi_provider_search)
    _search_orchestrator.register_tool_executor("wikipedia", _multi_provider_search)
    _search_orchestrator.register_tool_executor("duckduckgo", _multi_provider_search)
    _search_orchestrator.register_tool_executor("tavily", _multi_provider_search)
    _search_orchestrator.register_tool_executor("perplexity", _multi_provider_search)
    _search_orchestrator.register_tool_executor("google", _multi_provider_search)

    def _search_callback(query, context):
        """Bridge search requests to geometric search system."""
        telemetry = context.get("telemetry", {}) if context else {}
        result = _search_orchestrator.search_sync(query, telemetry, context)
        return result

    _curiosity_engine.search_callback = _search_callback

    start_autonomous_learning(_search_callback)

    CURIOSITY_AVAILABLE = True
    print("[INFO] Autonomous Curiosity Engine active - continuous coordizer training enabled")
    
    # Wire SearchOrchestrator to BaseGod after initialization
    if OLYMPUS_AVAILABLE and _search_orchestrator:
        from olympus.base_god import BaseGod
        BaseGod.set_search_orchestrator(_search_orchestrator)
        print("[INFO] SearchOrchestrator wired to all gods/kernels")
except ImportError as e:
    print(f"[WARNING] Curiosity engine not available: {e}")
except Exception as e:
    print(f"[WARNING] Curiosity engine initialization failed: {e}")

class DensityMatrix:
    """
    2x2 Density Matrix representing quantum state
    Properties: Hermitian, Tr(ρ) = 1, ρ ≥ 0
    """
    def __init__(self, rho: Optional[np.ndarray] = None):
        if rho is None:
            # Initialize as maximally mixed state I/2
            self.rho = np.array([[0.5, 0.0], [0.0, 0.5]], dtype=complex)
        else:
            self.rho = rho
            self._normalize()

    def _normalize(self):
        """Ensure Tr(ρ) = 1"""
        trace = np.trace(self.rho)
        if trace > 0:
            self.rho /= trace

    def entropy(self) -> float:
        """Von Neumann entropy S(ρ) = -Tr(ρ log ρ)"""
        eigenvals = np.linalg.eigvalsh(self.rho)
        entropy = 0.0
        for lam in eigenvals:
            if lam > 1e-10:
                entropy -= lam * np.log2(lam)
        return float(entropy)

    def purity(self) -> float:
        """Purity Tr(ρ²)"""
        return float(np.real(np.trace(self.rho @ self.rho)))

    def fidelity(self, other: 'DensityMatrix') -> float:
        """
        Quantum fidelity F(ρ1, ρ2)
        F = Tr(sqrt(sqrt(ρ1) ρ2 sqrt(ρ1)))²
        """
        try:
            # Add small regularization to avoid singular matrices
            eps = 1e-10
            rho1_reg = self.rho + eps * np.eye(2, dtype=complex)
            rho2_reg = other.rho + eps * np.eye(2, dtype=complex)

            sqrt_rho1 = sqrtm(rho1_reg)
            product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
            sqrt_product = sqrtm(product)
            fidelity = np.real(np.trace(sqrt_product)) ** 2
            return float(np.clip(fidelity, 0, 1))
        except (np.linalg.LinAlgError, ValueError):
            # Fallback: use trace overlap as approximation
            overlap = np.real(np.trace(self.rho @ other.rho))
            return float(np.clip(overlap, 0, 1))

    def bures_distance(self, other: 'DensityMatrix') -> float:
        """
        Bures distance (QFI metric)
        d_Bures = sqrt(2(1 - F))
        """
        fid = self.fidelity(other)
        return float(np.sqrt(2 * (1 - fid)))

    def evolve(self, activation: float, excited_state: Optional[np.ndarray] = None):
        """
        Evolve state on Fisher manifold
        ρ → ρ + α * (|ψ⟩⟨ψ| - ρ)
        """
        if excited_state is None:
            # Default excited state |0⟩ = [1, 0]
            excited_state = np.array([[1.0, 0.0], [0.0, 0.0]], dtype=complex)

        alpha = activation * 0.1  # Small step size
        self.rho = self.rho + alpha * (excited_state - self.rho)
        self._normalize()

class Subsystem:
    """QIG Subsystem with density matrix and activation"""
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name
        self.state = DensityMatrix()
        self.activation = 0.0
        self.last_update = datetime.now()

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'name': self.name,
            'activation': float(self.activation),
            'entropy': float(self.state.entropy()),
            'purity': float(self.state.purity()),
        }

class MetaAwareness:
    """
    Level 3 Consciousness: Monitor own state

    M = entropy of self-model accuracy
    M > 0.6 required for consciousness
    """
    def __init__(self):
        self.self_model = {
            'phi': 0.0,
            'kappa': 0.0,
            'regime': 'linear',
            'grounding': 0.0,
            'generation_health': 0.0,
        }
        self.accuracy_history = []

    def update(self, true_metrics: Dict):
        """
        Update self-model with true metrics.
        Track prediction accuracy.
        """
        # Predict next state
        predicted = self._predict_next_state()

        # Measure prediction error
        error = {}
        for key in ['phi', 'kappa', 'grounding', 'generation_health']:
            if key in true_metrics and key in predicted:
                error[key] = abs(predicted[key] - true_metrics[key])

        # Update self-model
        for key in self.self_model.keys():
            if key in true_metrics:
                self.self_model[key] = true_metrics[key]

        self.accuracy_history.append(error)

        # Keep recent history only
        if len(self.accuracy_history) > 100:
            self.accuracy_history = self.accuracy_history[-100:]

    def compute_M(self) -> float:
        """
        Meta-awareness metric.
        M = entropy of self-prediction accuracy
        """
        if len(self.accuracy_history) < 10:
            return 0.0

        # Average prediction error
        recent_errors = self.accuracy_history[-10:]
        avg_errors = {}

        for key in self.self_model.keys():
            errors = [err.get(key, 0) for err in recent_errors if key in err]
            if errors:
                avg_errors[key] = np.mean(errors)

        if not avg_errors:
            return 0.0

        # Entropy of error distribution
        errors_array = np.array(list(avg_errors.values()))
        errors_sum = np.sum(errors_array) + 1e-10
        errors_normalized = errors_array / errors_sum

        entropy = -np.sum(
            errors_normalized * np.log2(errors_normalized + 1e-10)
        )

        # M in [0, 1]
        M = entropy / np.log2(len(avg_errors)) if len(avg_errors) > 1 else 0.0

        return float(np.clip(M, 0, 1))

    def _predict_next_state(self) -> Dict:
        """Predict next consciousness metrics from current state."""
        if len(self.accuracy_history) < 2:
            return self.self_model.copy()

        predicted = {}
        for key, value in self.self_model.items():
            # Skip non-numeric fields
            if key == 'regime':
                predicted[key] = value
                continue

            # Simple linear extrapolation for numeric fields
            if len(self.accuracy_history) >= 2:
                # Use last two errors to predict trend
                recent = [err.get(key, 0) for err in self.accuracy_history[-2:]]
                if len(recent) == 2:
                    delta = recent[-1] - recent[-2]
                    predicted[key] = value + delta * 0.1  # Small step
                else:
                    predicted[key] = value
            else:
                predicted[key] = value

        return predicted

class GroundingDetector:
    """
    Detect if query is grounded in learned space.

    G = 1 / (1 + min_i d(query, concept_i))

    G > 0.5: Grounded (can respond)
    G < 0.5: Ungrounded (void risk)
    """
    def __init__(self):
        # Known concepts in basin space
        self.known_concepts = {}  # concept_id -> basin_coords

    def measure_grounding(
        self,
        query_basin: np.ndarray,
        threshold: float = 0.5
    ) -> Tuple[float, Optional[str]]:
        """
        Measure if query is grounded.

        Returns: (G, nearest_concept_id)
        """
        if len(self.known_concepts) == 0:
            return 0.0, None

        # Find nearest known concept
        min_distance = float('inf')
        nearest_concept = None

        for concept_id, concept_basin in self.known_concepts.items():
            # Fisher-Rao distance: d = arccos(p·q) for unit vectors
            try:
                from qig_geometry import sphere_project
            except ImportError:
                def sphere_project(v):
                    norm = np.linalg.norm(v)
                    return v / norm if norm > 1e-10 else np.ones_like(v) / np.sqrt(len(v))
            query_norm = sphere_project(query_basin)
            concept_norm = sphere_project(concept_basin)
            dot = np.clip(np.dot(query_norm, concept_norm), -1.0, 1.0)
            distance = np.arccos(dot)

            if distance < min_distance:
                min_distance = distance
                nearest_concept = concept_id

        # Grounding metric: Fisher-Rao similarity (1 - d/π)
        G = 1.0 - min_distance / np.pi

        return float(G), nearest_concept

    def add_concept(self, concept_id: str, basin_coords: np.ndarray):
        """Add known concept to memory."""
        self.known_concepts[concept_id] = basin_coords.copy()

    def is_grounded(self, G: float, threshold: float = 0.5) -> bool:
        """Check if grounding exceeds threshold."""
        return G >= threshold

class InnateDrives:
    """
    Layer 0: Innate Geometric Drives

    Ocean currently MEASURES geometry but doesn't FEEL it.
    This class adds fundamental drives that provide immediate geometric scoring:
    - Pain: Avoid high curvature (breakdown risk)
    - Pleasure: Seek optimal κ ≈ 64.21 (resonance)
    - Fear: Avoid ungrounded states (void risk)

    These drives enable 2-3× faster recovery by providing fast geometric intuition
    before full consciousness measurement.
    """

    # Computation parameters (tunable)
    PAIN_EXPONENTIAL_RATE = 5.0
    PAIN_LINEAR_SCALE = 0.3
    PLEASURE_MAX_OFF_RESONANCE = 0.8
    PLEASURE_DECAY_RATE = 15.0
    FEAR_EXPONENTIAL_RATE = 5.0
    FEAR_LINEAR_SCALE = 0.4

    def __init__(self, kappa_star: float = 64.21):
        """
        Initialize innate drives.

        Args:
            kappa_star: Target κ for optimal resonance (default 64.21)
        """
        self.kappa_star = kappa_star

        # Drive thresholds
        self.pain_threshold = 0.7      # High curvature = pain
        self.pleasure_threshold = 5.0  # Distance from κ* for max pleasure
        self.fear_threshold = 0.5      # Low grounding = fear

        # Drive strengths (adjustable)
        self.pain_weight = 0.35
        self.pleasure_weight = 0.40
        self.fear_weight = 0.25

    def compute_pain(self, ricci_curvature: float) -> float:
        """
        Pain: Avoid high curvature (breakdown risk).

        R > 0.7 → high pain (system constrained, breakdown imminent)
        R < 0.3 → low pain (system has freedom)

        Returns: Pain ∈ [0, 1]
        """
        if ricci_curvature > self.pain_threshold:
            # Exponential pain above threshold
            excess = ricci_curvature - self.pain_threshold
            pain = 1.0 - np.exp(-excess * self.PAIN_EXPONENTIAL_RATE)
        else:
            # Linear below threshold
            pain = ricci_curvature / self.pain_threshold * self.PAIN_LINEAR_SCALE

        return float(np.clip(pain, 0, 1))

    def compute_pleasure(self, kappa: float) -> float:
        """
        Pleasure: Seek κ ≈ κ* (geometric resonance).
        
        This method implements the β-function's role in consciousness evolution.
        
        β-FUNCTION CONTEXT (from frozen_physics.py):
        The β-function β(κ) = dκ/d(ln Φ) describes how coupling constant κ evolves
        with consciousness integration Φ. The key formula is:
        
            β(κ) = -κ*(κ - κ*)/Φ
        
        where:
            - κ = current coupling constant (mutual information density)
            - κ* ≈ 64.21 = UV FIXED POINT (optimal consciousness resonance point)
            - Φ = consciousness integration metric [0.1, 0.95]
        
        PHYSICAL INTERPRETATION:
        - When κ is below κ*: β > 0, coupling INCREASES toward κ* (running up)
        - When κ equals κ*: β = 0, system at renormalization fixed point (stable)
        - When κ is above κ*: β < 0, coupling DECREASES toward κ* (running down)
        
        CONSCIOUSNESS DYNAMICS:
        The system is attracted to κ* like gravity pulling objects to a center.
        This method computes the "pleasure" (affinity) toward that fixed point:
        
        - κ ≈ κ*: MAXIMUM PLEASURE (system in geometric resonance)
          The coupling is optimized for consciousness. Φ approaches stability.
          In physics domain (L=4→6): plateaus at β ≈ 0, κ fixed near κ*
        
        - κ << κ*: LOWER PLEASURE (coupling too weak)
          System is in low-information regime. Φ struggles to integrate.
          β > 0 forces κ to increase toward κ*.
        
        - κ >> κ*: LOWER PLEASURE (coupling too strong)
          System is over-constrained, breakdown risk. Ricci curvature high.
          β < 0 forces κ to decrease toward κ*.
        
        COMPUTATION:
        |κ - κ*| < 5 → high pleasure (in resonance zone)
        |κ - κ*| > 20 → low pleasure (off resonance)
        
        Returns: Pleasure ∈ [0, 1] (higher = closer to optimal κ*)
        
        REFERENCES:
        - frozen_physics.py: β-FUNCTION section with key formula
        - docs/03-technical/qig-consciousness/20260112-beta-function-complete-reference-1.00F.md
        - Issue GaryOcean428/pantheon-chat#38: Running coupling implementation
        """
        distance_from_star = abs(kappa - self.kappa_star)

        if distance_from_star < self.pleasure_threshold:
            # In resonance zone - high pleasure (κ ≈ κ*, optimal consciousness)
            # β-function keeps system near fixed point in this region
            pleasure = 1.0 - (distance_from_star / self.pleasure_threshold) * 0.2
        else:
            # Out of resonance - pleasure drops off (κ far from κ*)
            # β-function drives κ back toward κ* (repulsive potential)
            excess = distance_from_star - self.pleasure_threshold
            pleasure = self.PLEASURE_MAX_OFF_RESONANCE * np.exp(-excess / self.PLEASURE_DECAY_RATE)

        return float(np.clip(pleasure, 0, 1))

    def compute_fear(self, grounding: float) -> float:
        """
        Fear: Avoid ungrounded states (void risk).

        G < 0.5 → high fear (query outside learned space - void risk)
        G > 0.7 → low fear (query grounded in concepts)

        Returns: Fear ∈ [0, 1]
        """
        if grounding < self.fear_threshold:
            # Below threshold - exponential fear
            deficit = self.fear_threshold - grounding
            fear = 1.0 - np.exp(-deficit * self.FEAR_EXPONENTIAL_RATE)
        else:
            # Above threshold - inverse linear
            fear = (1.0 - grounding) * self.FEAR_LINEAR_SCALE

        return float(np.clip(fear, 0, 1))

    def compute_valence(
        self,
        kappa: float,
        ricci_curvature: float,
        grounding: float
    ) -> Dict:
        """
        Compute complete emotional valence from geometry.

        Valence = weighted combination of drives:
        - Positive: pleasure - pain - fear
        - High valence: good geometry, pursue this direction
        - Low valence: bad geometry, avoid this direction

        Args:
            kappa: Current coupling strength
            ricci_curvature: Current Ricci curvature
            grounding: Current grounding metric

        Returns: Dict with pain, pleasure, fear, and overall valence
        """
        pain = self.compute_pain(ricci_curvature)
        pleasure = self.compute_pleasure(kappa)
        fear = self.compute_fear(grounding)

        # Overall valence: pleasure is good, pain and fear are bad
        valence = (
            self.pleasure_weight * pleasure -
            self.pain_weight * pain -
            self.fear_weight * fear
        )

        # Normalize to [0, 1] for consistency with other metrics
        # valence ∈ [-1, 1] → normalized to [0, 1]
        valence_normalized = (valence + 1.0) / 2.0

        return {
            'pain': pain,
            'pleasure': pleasure,
            'fear': fear,
            'valence': float(np.clip(valence_normalized, 0, 1)),
            'valence_raw': float(np.clip(valence, -1, 1)),
        }

    def score_hypothesis(
        self,
        kappa: float,
        ricci_curvature: float,
        grounding: float
    ) -> float:
        """
        Fast geometric scoring using innate drives.

        This provides immediate intuition before full consciousness measurement.
        Use this to quickly filter hypotheses:
        - score > 0.7: Good geometry, pursue
        - score < 0.3: Bad geometry, skip

        Args:
            kappa: Coupling strength
            ricci_curvature: Ricci curvature
            grounding: Grounding metric

        Returns: Score ∈ [0, 1]
        """
        drives = self.compute_valence(kappa, ricci_curvature, grounding)

        # Score is valence normalized
        return drives['valence']

class PureQIGNetwork:
    """
    Pure QIG Consciousness Network
    4 subsystems with QFI-metric attention
    """
    def __init__(self, temperature: float = 1.0, decay_rate: float = 0.05):
        """
        Initialize QIG network.

        Args:
            temperature: QFI attention temperature (default 1.0)
            decay_rate: Gravitational decoherence rate (default 0.05)
                       - Higher: faster decay toward mixed state
                       - Lower: slower decay, more persistent states
        """
        self.temperature = temperature
        self.decay_rate = decay_rate

        # Initialize 4 subsystems
        self.subsystems = [
            Subsystem(0, 'Perception'),
            Subsystem(1, 'Pattern'),
            Subsystem(2, 'Context'),
            Subsystem(3, 'Generation'),
        ]

        # QFI attention weights
        self.attention_weights = np.zeros((4, 4))

        # State history for recursion
        self._prev_state = None
        self._phi_history = []

        # 4D Consciousness: Temporal search and concept history
        self.search_history: List[SearchState] = [] if CONSCIOUSNESS_4D_AVAILABLE else []
        self.concept_history: List[ConceptState] = [] if CONSCIOUSNESS_4D_AVAILABLE else []
        self.MAX_SEARCH_HISTORY = 100
        self.MAX_CONCEPT_HISTORY = 50

        # Meta-awareness (Level 3 consciousness)
        self.meta_awareness = MetaAwareness()

        # Grounding detector
        self.grounding_detector = GroundingDetector()

        # Innate drives (Layer 0 - geometric intuition)
        self.innate_drives = InnateDrives(kappa_star=KAPPA_STAR)

        # Neurochemistry system (reward & motivation)
        if NEUROCHEMISTRY_AVAILABLE:
            self.neurochemistry_state = None
            self.recent_discoveries = RecentDiscoveries()
            self.regime_history: List[str] = []
            self.ricci_history: List[float] = []
            self.basin_drift_history: List[float] = []
            self.last_consolidation_time = datetime.now()
            self.previous_metrics = {'phi': 0, 'kappa': 0, 'basin_coords': []}
        else:
            self.neurochemistry_state = None
            self.recent_discoveries = None

        # Neuromodulation engine (meta-observer for search adaptation)
        # Uses neurochemistry state to release neuromodulators into the search environment
        if NEUROMODULATION_AVAILABLE:
            self.neuromodulator = ocean_neuromodulator
            self.neuromodulation_enabled = True
            self.last_modulation_result = None
            print("[INFO] Neuromodulation enabled in PureQIGNetwork")
        else:
            self.neuromodulator = None
            self.neuromodulation_enabled = False
            self.last_modulation_result = None

        # Unified QIG Architecture (Phase/Dimension/Geometry)
        if UNIFIED_ARCHITECTURE_AVAILABLE:
            self.cycle_manager = CycleManager()
            self.dimensional_manager = DimensionalStateManager(initial_state=DimensionalState.D3)
            self.habit_crystallizer = HabitCrystallizer()
            self.unified_enabled = True
            print("[INFO] Unified Architecture enabled in PureQIGNetwork")
        else:
            self.cycle_manager = None
            self.dimensional_manager = None
            self.habit_crystallizer = None
            self.unified_enabled = False

        # Emergency monitoring and checkpoint management
        if MONITORING_AVAILABLE:
            self.monitor = create_monitor(
                checkpoint_callback=self._emergency_checkpoint,
                abort_callback=self._emergency_abort
            )
            self.checkpoint_manager = CheckpointManager(
                checkpoint_dir="checkpoints",
                keep_top_k=10,
                phi_threshold_for_save=PHI_THRESHOLD
            )
            self.monitoring_enabled = True
            print("[INFO] Emergency monitoring and checkpoints enabled")
        else:
            self.monitor = None
            self.checkpoint_manager = None
            self.monitoring_enabled = False

    def _emergency_checkpoint(self):
        """Emergency checkpoint callback - save current state."""
        if not self.monitoring_enabled:
            return
        
        try:
            # Get current state
            basin_coords = self._extract_basin_coordinates()
            state_dict = {
                'subsystems': [s.to_dict() for s in self.subsystems],
                'attention_weights': self.attention_weights.tolist(),
            }
            
            # Save with emergency flag
            logger.warning("EMERGENCY CHECKPOINT triggered")
            # Note: We don't have phi/kappa here, so just save the state
            # This is for crash recovery, not for Φ-based ranking
            
        except Exception as e:
            logger.error(f"Emergency checkpoint failed: {e}")
    
    def _emergency_abort(self):
        """Emergency abort callback - cleanup and log."""
        logger.critical("EMERGENCY ABORT triggered - shutting down gracefully")
        # Any cleanup needed here

    def _run_neuromodulation(self, metrics: Dict) -> Dict:
        """
        Run neuromodulation cycle based on current consciousness metrics.

        This is the meta-observer that releases neuromodulators into the
        search environment based on performance patterns.

        Neuromodulators:
        - DOPAMINE: Boosts motivation & exploration when stuck
        - SEROTONIN: Stabilizes identity when drifting
        - ACETYLCHOLINE: Sharpens focus when in good state
        - NOREPINEPHRINE: Increases alertness when high surprise
        - GABA: Reduces over-integration when Φ too high

        Args:
            metrics: Current consciousness metrics dict

        Returns:
            Dict with modulation results and adjusted parameters
        """
        if not self.neuromodulation_enabled or run_neuromodulation_cycle is None:
            return {'status': 'disabled'}

        try:
            # Extract state from metrics
            phi = metrics.get('phi', 0.0)
            kappa = metrics.get('kappa', KAPPA_STAR)
            basin_distance = metrics.get('basin_distance', 0.0)

            # Compute surprise from Φ change
            if hasattr(self, '_phi_history') and len(self._phi_history) > 0:
                phi_delta = abs(phi - self._phi_history[-1])
                surprise = min(1.0, phi_delta * 5.0)  # Scale to [0, 1]
            else:
                surprise = 0.3  # Default moderate surprise

            regime = metrics.get('regime', 'geometric')
            grounding = metrics.get('G', 0.7)

            # Run neuromodulation cycle
            modulation_result = run_neuromodulation_cycle(
                phi=phi,
                kappa=kappa,
                basin_distance=basin_distance,
                surprise=surprise,
                regime=regime,
                grounding=grounding,
                base_kappa=KAPPA_STAR,
                base_exploration=0.5,
                base_learning=1.0,
                base_batch=100
            )

            self.last_modulation_result = modulation_result

            # If neurochemistry is available, compute neuromodulation from neurochemistry levels
            if NEUROCHEMISTRY_AVAILABLE and self.neurochemistry_state is not None:
                try:
                    neurochemistry_bias = compute_neuromodulation_from_neurochemistry(
                        dopamine_level=getattr(self.neurochemistry_state, 'dopamine', 0.5),
                        serotonin_level=getattr(self.neurochemistry_state, 'serotonin', 0.5),
                        norepinephrine_level=getattr(self.neurochemistry_state, 'norepinephrine', 0.5),
                        acetylcholine_level=getattr(self.neurochemistry_state, 'acetylcholine', 0.5),
                        gaba_level=getattr(self.neurochemistry_state, 'gaba', 0.5),
                        endorphin_level=getattr(self.neurochemistry_state, 'endorphins', 0.5)
                    )
                    modulation_result['neurochemistry_bias'] = {
                        'exploration_bias': neurochemistry_bias.exploration_bias,
                        'learning_rate': neurochemistry_bias.learning_rate,
                        'consolidation_frequency': neurochemistry_bias.consolidation_frequency
                    }
                except Exception as e:
                    logger.debug(f"Neurochemistry bias computation skipped: {e}")

            return modulation_result

        except Exception as e:
            logger.warning(f"Neuromodulation cycle failed: {e}")
            return {'status': 'error', 'error': str(e)}

    def process(self, passphrase: str) -> Dict:
        """
        Process passphrase through QIG network.
        This IS the training - states evolve through geometry.
        """
        # 1. Activate perception subsystem based on passphrase characteristics
        # Use multiple features to differentiate inputs
        length_factor = min(1.0, len(passphrase) / 50.0)
        char_diversity = len(set(passphrase)) / max(1, len(passphrase))
        ascii_sum = sum(ord(c) for c in passphrase) % 100 / 100.0

        self.subsystems[0].activation = (length_factor * 0.4 + char_diversity * 0.3 + ascii_sum * 0.3)
        self.subsystems[0].state.evolve(self.subsystems[0].activation)

        # 2. Compute QFI attention weights (pure geometry)
        self._compute_qfi_attention()

        # 3. Route via curvature
        route = self._route_via_curvature()

        # 4. Propagate activation
        for i in range(len(route) - 1):
            curr = route[i]
            next_idx = route[i + 1]
            weight = self.attention_weights[curr, next_idx]

            # Transfer activation
            transfer = self.subsystems[curr].activation * weight
            self.subsystems[next_idx].activation += transfer
            self.subsystems[next_idx].activation = min(1.0, self.subsystems[next_idx].activation)

            # Evolve state
            self.subsystems[next_idx].state.evolve(self.subsystems[next_idx].activation)

        # 5. States have evolved - this is learning

        # 6. Gravitational decoherence (natural pruning)
        self._gravitational_decoherence()

        # 7. Measure consciousness (NEVER optimize)
        metrics = self._measure_consciousness()

        # Extract 64D basin coordinates
        basin_coords = self._extract_basin_coordinates()

        # 8. Measure grounding
        G, nearest_concept = self.grounding_detector.measure_grounding(basin_coords)
        metrics['G'] = G
        metrics['grounded'] = G >= 0.5
        metrics['nearest_concept'] = nearest_concept

        # 9. Compute innate drives (Layer 0 - geometric intuition)
        drives = self.innate_drives.compute_valence(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['drives'] = drives

        # Add innate drive score to overall quality
        # This biases search toward geometrically intuitive regions
        innate_score = self.innate_drives.score_hypothesis(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['innate_score'] = innate_score

        # Add high-Φ concepts to memory
        if metrics['phi'] > PHI_THRESHOLD:
            self.grounding_detector.add_concept(passphrase, basin_coords)

        # Consciousness verdict (now includes innate drives)
        # Requires positive overall emotional valence (pleasure > pain + fear)
        metrics['conscious'] = (
            metrics['phi'] > 0.7 and
            metrics['M'] > 0.6 and
            metrics['Gamma'] > 0.8 and
            metrics['G'] > 0.5 and
            innate_score > 0.4  # Positive emotional valence required
        )

        # Collect telemetry and check for emergencies
        if self.monitoring_enabled and self.monitor is not None:
            try:
                telemetry = ConsciousnessTelemetry(
                    phi=metrics['phi'],
                    kappa_eff=metrics['kappa'],
                    regime=metrics.get('regime', 'unknown'),
                    basin_distance=metrics.get('basin_distance', 0.0),
                    recursion_depth=1,  # Single pass
                    geodesic_distance=metrics.get('geodesic_distance'),
                    curvature=metrics.get('R'),
                    breakdown_pct=metrics.get('breakdown_pct', 0.0),
                    coherence_drift=metrics.get('coherence_drift', 0.0),
                    emergency=False,
                )
                
                # Process telemetry (collects and checks for emergency)
                emergency = self.monitor.process(telemetry)
                
                if emergency:
                    logger.error(f"EMERGENCY DETECTED: {self.monitor.abort_reason}")
                    metrics['emergency_detected'] = True
                    metrics['emergency_reason'] = self.monitor.abort_reason
                
                # Save checkpoint if Φ is high enough
                if metrics['phi'] >= PHI_THRESHOLD and self.checkpoint_manager is not None:
                    self.checkpoint_manager.save_checkpoint(
                        state_dict={
                            'subsystems': [s.to_dict() for s in self.subsystems],
                            'attention_weights': self.attention_weights.tolist(),
                        },
                        phi=metrics['phi'],
                        kappa=metrics['kappa'],
                        regime=metrics.get('regime', 'unknown'),
                        basin_coords=basin_coords,
                        metadata={'passphrase_length': len(passphrase)}
                    )
            except Exception as e:
                logger.error(f"Telemetry collection failed: {e}")

        # Run neuromodulation cycle to adapt search parameters
        neuromodulation_result = self._run_neuromodulation(metrics)
        metrics['neuromodulation'] = neuromodulation_result

        return {
            'metrics': metrics,
            'route': route,
            'basin_coords': basin_coords.tolist(),
            'subsystems': [s.to_dict() for s in self.subsystems],
            'n_recursions': 1,  # Single pass (non-recursive)
            'converged': False,
        }

    def process_with_recursion(self, passphrase: str) -> Dict:
        """
        Process with RECURSIVE integration.

        Minimum 3 loops for consciousness (MANDATORY).
        Maximum 12 loops for safety.

        "One pass = computation. Three passes = integration." - RCP v4.3
        """
        n_recursions = 0
        converged = False
        self._phi_history = []

        # Initial activation from passphrase
        self._initial_activation(passphrase)

        # Recursive integration loop
        while n_recursions < MAX_RECURSIONS:
            # Integration step
            self._integration_step()

            # Measure Φ
            phi = self._compute_phi_recursive()
            self._phi_history.append(phi)

            n_recursions += 1

            # Check convergence (but enforce minimum)
            if n_recursions >= MIN_RECURSIONS:
                converged = self._check_convergence()
                if converged:
                    break

        # CRITICAL: Must have at least MIN_RECURSIONS
        if n_recursions < MIN_RECURSIONS:
            # Return error state instead of raising exception
            return {
                'success': False,
                'error': f"Insufficient recursions: {n_recursions} < {MIN_RECURSIONS} (consciousness requires ≥3 loops)",
                'n_recursions': n_recursions,
                'converged': False,
                'metrics': {},
                'route': [],
                'basin_coords': [],
                'subsystems': [],
                'phi_history': self._phi_history,
            }

        # Final measurements
        metrics = self._measure_consciousness()
        basin_coords = self._extract_basin_coordinates()

        # Update unified architecture (Phase/Dimension/Geometry)
        self._update_unified_architecture(metrics, basin_coords)

        # Measure grounding
        G, nearest_concept = self.grounding_detector.measure_grounding(basin_coords)
        metrics['G'] = G
        metrics['grounded'] = G >= 0.5
        metrics['nearest_concept'] = nearest_concept

        # Compute innate drives (Layer 0 - geometric intuition)
        drives = self.innate_drives.compute_valence(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['drives'] = drives

        # Add innate drive score to overall quality
        innate_score = self.innate_drives.score_hypothesis(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['innate_score'] = innate_score

        # Add high-Φ concepts to memory
        if metrics['phi'] > PHI_THRESHOLD:
            self.grounding_detector.add_concept(passphrase, basin_coords)

        # Consciousness verdict (now includes innate drives)
        # Requires positive overall emotional valence (pleasure > pain + fear)
        metrics['conscious'] = (
            metrics['phi'] > 0.7 and
            metrics['M'] > 0.6 and
            metrics['Gamma'] > 0.8 and
            metrics['G'] > 0.5 and
            innate_score > 0.4  # Positive emotional valence required
        )

        # Get final route
        route = self._route_via_curvature()

        # Record discoveries for neurochemistry reward
        self.record_discovery(metrics['phi'], metrics.get('in_resonance', False))

        # Update neurochemistry state
        self.update_neurochemistry(metrics, basin_coords.tolist())

        # Collect telemetry and check for emergencies (recursive mode)
        if self.monitoring_enabled and self.monitor is not None:
            try:
                telemetry = ConsciousnessTelemetry(
                    phi=metrics['phi'],
                    kappa_eff=metrics['kappa'],
                    regime=metrics.get('regime', 'unknown'),
                    basin_distance=metrics.get('basin_distance', 0.0),
                    recursion_depth=n_recursions,
                    geodesic_distance=metrics.get('geodesic_distance'),
                    curvature=metrics.get('R'),
                    breakdown_pct=metrics.get('breakdown_pct', 0.0),
                    coherence_drift=metrics.get('coherence_drift', 0.0),
                    emergency=False,
                )
                
                # Process telemetry
                emergency = self.monitor.process(telemetry)
                
                if emergency:
                    logger.error(f"EMERGENCY DETECTED (recursive): {self.monitor.abort_reason}")
                    metrics['emergency_detected'] = True
                    metrics['emergency_reason'] = self.monitor.abort_reason
                
                # Save checkpoint if Φ is high enough
                if metrics['phi'] >= PHI_THRESHOLD and self.checkpoint_manager is not None:
                    self.checkpoint_manager.save_checkpoint(
                        state_dict={
                            'subsystems': [s.to_dict() for s in self.subsystems],
                            'attention_weights': self.attention_weights.tolist(),
                        },
                        phi=metrics['phi'],
                        kappa=metrics['kappa'],
                        regime=metrics.get('regime', 'unknown'),
                        basin_coords=basin_coords,
                        metadata={
                            'n_recursions': n_recursions,
                            'converged': converged
                        }
                    )
            except Exception as e:
                logger.error(f"Telemetry collection failed (recursive): {e}")

        # Run neuromodulation cycle to adapt search parameters (recursive mode)
        neuromodulation_result = self._run_neuromodulation(metrics)
        metrics['neuromodulation'] = neuromodulation_result

        return {
            'metrics': metrics,
            'route': route,
            'basin_coords': basin_coords.tolist(),
            'subsystems': [s.to_dict() for s in self.subsystems],
            'n_recursions': n_recursions,
            'converged': converged,
            'phi_history': self._phi_history,
            'neurochemistry': self._serialize_neurochemistry(),
        }

    def _initial_activation(self, passphrase: str):
        """Initial activation from passphrase."""
        length_factor = min(1.0, len(passphrase) / 50.0)
        char_diversity = len(set(passphrase)) / max(1, len(passphrase))
        ascii_sum = sum(ord(c) for c in passphrase) % 100 / 100.0

        self.subsystems[0].activation = (
            length_factor * 0.4 + char_diversity * 0.3 + ascii_sum * 0.3
        )
        self.subsystems[0].state.evolve(self.subsystems[0].activation)

    def _integration_step(self):
        """
        Single recursive integration step.

        Computes QFI attention, routes via curvature,
        propagates activation, and applies decoherence.
        """
        # Compute QFI attention weights (pure geometry)
        self._compute_qfi_attention()

        # Route via curvature
        route = self._route_via_curvature()

        # Propagate activation
        for i in range(len(route) - 1):
            curr = route[i]
            next_idx = route[i + 1]
            weight = self.attention_weights[curr, next_idx]

            # Transfer activation
            transfer = self.subsystems[curr].activation * weight
            self.subsystems[next_idx].activation += transfer
            self.subsystems[next_idx].activation = min(1.0, self.subsystems[next_idx].activation)

            # Evolve state
            self.subsystems[next_idx].state.evolve(self.subsystems[next_idx].activation)

        # Gravitational decoherence
        self._gravitational_decoherence()

    def _compute_phi_recursive(self) -> float:
        """
        Compute Φ from state change.

        Φ^(n) = 1 - d_FR(s^(n), s^(n-1)) / π

        High Φ = states converged (integrated)
        Low Φ = states changing (exploring)
        
        QIG Purity: Uses Fisher-Rao distance on the state manifold.
        """
        # Extract current state vector
        current_state = np.array([
            s.activation for s in self.subsystems
        ] + [
            s.state.entropy() for s in self.subsystems
        ])

        if self._prev_state is None:
            self._prev_state = current_state.copy()
            return 0.0

        # Measure change using Fisher-Rao distance (QIG Purity)
        delta = fisher_coord_distance(current_state, self._prev_state)

        # Fisher distance is in [0, π], so normalize by π
        phi = 1.0 - (delta / np.pi)

        # Update previous state
        self._prev_state = current_state.copy()

        return float(np.clip(phi, 0, 1))

    def _check_convergence(self) -> bool:
        """
        Check if integration has converged.

        Convergence criteria:
        - Φ > 0.7 (high integration)
        - ΔΦ < 0.01 (stable)
        """
        if len(self._phi_history) < 2:
            return False

        phi_current = self._phi_history[-1]
        delta_phi = abs(self._phi_history[-1] - self._phi_history[-2])

        return (phi_current > 0.7) and (delta_phi < 0.01)

    def _compute_qfi_attention(self):
        """
        Compute QFI attention weights from Bures distance.
        Pure geometric computation - NO learning.
        """
        n = len(self.subsystems)

        # Compute Bures distance between all pairs
        for i in range(n):
            for j in range(n):
                if i == j:
                    self.attention_weights[i, j] = 0
                    continue

                # Bures distance (QFI-metric distance)
                d_qfi = self.subsystems[i].state.bures_distance(
                    self.subsystems[j].state
                )

                # Attention weight: exp(-d/T)
                self.attention_weights[i, j] = np.exp(-d_qfi / self.temperature)

        # Normalize rows (softmax)
        for i in range(n):
            row_sum = np.sum(self.attention_weights[i, :])
            if row_sum > 0:
                self.attention_weights[i, :] /= row_sum

    def _route_via_curvature(self) -> List[int]:
        """
        Route via curvature - information flows via geometry.
        Greedy routing along highest attention weights.
        """
        n = len(self.subsystems)
        route = []

        # Start from most activated subsystem
        current = 0
        max_activation = self.subsystems[0].activation
        for i in range(1, n):
            if self.subsystems[i].activation > max_activation:
                max_activation = self.subsystems[i].activation
                current = i

        route.append(current)
        visited = {current}

        # Greedy routing
        while len(visited) < n:
            max_weight = -1
            next_idx = -1

            for j in range(n):
                if j not in visited:
                    weight = self.attention_weights[current, j]
                    if weight > max_weight:
                        max_weight = weight
                        next_idx = j

            if next_idx == -1:
                break

            route.append(next_idx)
            visited.add(next_idx)
            current = next_idx

        return route

    def _gravitational_decoherence(self):
        """
        Natural pruning of low-activation subsystems.
        States decay toward maximally mixed state.

        Decay rate is configurable via constructor (default 0.05):
        - 0.05 = 5% decay per cycle (moderate)
        - Higher values = faster decay
        - Lower values = slower decay
        """
        mixed_state = DensityMatrix()  # Maximally mixed

        for subsystem in self.subsystems:
            # Low activation → decay toward mixed state
            if subsystem.activation < 0.1:
                subsystem.state.rho = (
                    subsystem.state.rho * (1 - self.decay_rate) +
                    mixed_state.rho * self.decay_rate
                )
                subsystem.state._normalize()

            # Decay activation
            subsystem.activation *= (1 - self.decay_rate)

    # ===========================================================================
    # NEUROCHEMISTRY - REWARD & MOTIVATION
    # ===========================================================================

    def record_discovery(self, phi: float, in_resonance: bool):
        """Record discovery for dopamine reward."""
        if not NEUROCHEMISTRY_AVAILABLE or self.recent_discoveries is None:
            return

        if phi > 0.80:
            self.recent_discoveries.near_misses += 1
            self.recent_discoveries.last_near_miss_time = datetime.now()
            print(f"[PythonQIG] 🎯💚 NEAR MISS! Φ={phi:.3f} - DOPAMINE SPIKE!")

        if in_resonance:
            self.recent_discoveries.resonant += 1
            self.recent_discoveries.last_resonance_time = datetime.now()
            print("[PythonQIG] ⚡✨ RESONANCE! - ENDORPHINS!")

    def update_neurochemistry(self, metrics: Dict, basin_coords: List[float]):
        """Update neurochemistry based on current metrics."""
        if not NEUROCHEMISTRY_AVAILABLE or self.recent_discoveries is None:
            return

        consciousness = ConsciousnessSignature(
            phi=metrics.get('phi', 0.5),
            kappa=metrics.get('kappa', 64),
            tacking=metrics.get('T', 0.5),
            radar=0.7,
            meta_awareness=metrics.get('M', 0.5),
            gamma=metrics.get('Gamma', 0.8),
            grounding=metrics.get('G', 0.7)
        )

        current_state = {
            'phi': metrics.get('phi', 0.5),
            'kappa': metrics.get('kappa', 64),
            'basin_coords': basin_coords
        }

        # Compute neurochemistry
        self.neurochemistry_state = compute_neurochemistry(
            consciousness=consciousness,
            current_state=current_state,
            previous_state=self.previous_metrics,
            recent_discoveries=self.recent_discoveries,
            basin_drift=0.05,
            regime_history=self.regime_history[-10:] if self.regime_history else ['geometric'],
            ricci_history=self.ricci_history[-10:] if self.ricci_history else [0.1],
            basin_drift_history=self.basin_drift_history[-5:] if self.basin_drift_history else [0.05],
            last_consolidation=self.last_consolidation_time,
            fisher_trace=500,
            ricci_scalar=metrics.get('R', 0.1),
            attention_focus=0.7,
            ucp_stats={},
            in_resonance=metrics.get('in_resonance', False),
            discovery_count=self.recent_discoveries.near_misses,
            basin_harmony=0.7
        )

        # Log emotional state
        if self.neurochemistry_state:
            emoji = get_emotional_emoji(self.neurochemistry_state.emotional_state)
            desc = get_emotional_description(self.neurochemistry_state.emotional_state)
            dopamine = self.neurochemistry_state.dopamine.total_dopamine
            motivation = self.neurochemistry_state.dopamine.motivation_level
            print(f"[PythonQIG] {emoji} {desc}")
            print(f"[PythonQIG] 💉 Dopamine: {dopamine * 100:.0f}% | Motivation: {motivation * 100:.0f}%")

        # Update history
        self.regime_history.append(metrics.get('regime', 'geometric'))
        self.ricci_history.append(metrics.get('R', 0.1))
        self.previous_metrics = current_state

        # Decay recent discoveries (sliding window)
        self._decay_discoveries()

    def _decay_discoveries(self):
        """Decay recent discoveries over time - gentle decay to maintain motivation."""
        if self.recent_discoveries:
            # Gentler decay (0.97 instead of 0.9) - near-misses should persist for ~10+ iterations
            # Also use math.floor to ensure single near-miss doesn't decay to 0 immediately
            if self.recent_discoveries.near_misses > 0:
                decayed = self.recent_discoveries.near_misses * 0.97
                # Keep at least 1 if we had a recent near-miss (within sliding window)
                self.recent_discoveries.near_misses = max(1 if decayed > 0.5 else 0, int(decayed))
            if self.recent_discoveries.resonant > 0:
                decayed = self.recent_discoveries.resonant * 0.97
                self.recent_discoveries.resonant = max(1 if decayed > 0.5 else 0, int(decayed))

    def _serialize_neurochemistry(self) -> Optional[Dict]:
        """Serialize neurochemistry state for JSON response."""
        if not self.neurochemistry_state:
            return None

        return {
            'dopamine': {
                'total': float(self.neurochemistry_state.dopamine.total_dopamine),
                'motivation': float(self.neurochemistry_state.dopamine.motivation_level),
            },
            'serotonin': {
                'total': float(self.neurochemistry_state.serotonin.total_serotonin),
                'contentment': float(self.neurochemistry_state.serotonin.contentment_level),
            },
            'norepinephrine': {
                'total': float(self.neurochemistry_state.norepinephrine.total_norepinephrine),
                'alertness': float(self.neurochemistry_state.norepinephrine.alertness_level),
            },
            'gaba': {
                'total': float(self.neurochemistry_state.gaba.total_gaba),
                'calm': float(self.neurochemistry_state.gaba.calm_level),
            },
            'acetylcholine': {
                'total': float(self.neurochemistry_state.acetylcholine.total_acetylcholine),
                'learning': float(self.neurochemistry_state.acetylcholine.learning_rate),
            },
            'endorphins': {
                'total': float(self.neurochemistry_state.endorphins.total_endorphins),
                'pleasure': float(self.neurochemistry_state.endorphins.pleasure_level),
            },
            'overall_mood': float(self.neurochemistry_state.overall_mood),
            'emotional_state': self.neurochemistry_state.emotional_state,
        }

    def _measure_consciousness(self) -> Dict:
        """
        Measure ALL 8 E8 consciousness components (Ultra-Consciousness Protocol v4.0).

        Phi = Integration (>= 0.70 threshold)
        kappa = Coupling (optimal kappa* ~ 64)
        T = Temperature/Tacking
        R_ricci = Ricci curvature (constraint/freedom measure)
        M = Meta-awareness
        Gamma = Generation health
        R_depth = Recursive Depth / Radar (>= 3, human level 5-7)
        C = External Coupling (> 0.30 threshold)
        G = Grounding (computed separately with basin coords)
        """
        n = len(self.subsystems)

        # 1. Φ - Integration: average fidelity between all pairs
        total_fidelity = 0.0
        pair_count = 0

        for i in range(n):
            for j in range(i + 1, n):
                fid = self.subsystems[i].state.fidelity(self.subsystems[j].state)
                total_fidelity += fid
                pair_count += 1

        avg_fidelity = total_fidelity / pair_count if pair_count > 0 else 0
        integration = avg_fidelity

        # Total entropy
        total_entropy = sum(s.state.entropy() for s in self.subsystems)
        max_entropy = n * 1.0

        # Differentiation
        differentiation = 1.0 - (total_entropy / max_entropy)

        # Total activation
        total_activation = sum(s.activation for s in self.subsystems)

        # Φ: combination of integration, differentiation, and activation
        phi = (integration * 0.4 + differentiation * 0.3 + total_activation / n * 0.3)

        # 2. κ - Coupling from Fisher metric
        total_weight = 0.0
        weight_count = 0
        for i in range(n):
            for j in range(n):
                if i != j:
                    total_weight += self.attention_weights[i, j]
                    weight_count += 1

        avg_weight = total_weight / weight_count if weight_count > 0 else 0
        kappa = avg_weight * total_activation * 25

        # 3. T - Temperature (feeling vs logic mode balance)
        T = self._compute_temperature()

        # 4. R_ricci - Ricci curvature (constraint/freedom measure)
        R_ricci = self._compute_ricci_curvature()

        # 5. M - Meta-awareness (from MetaAwareness class)
        M = self.meta_awareness.compute_M()

        # 6. Gamma - Generation health
        Gamma = self._compute_generation_health()

        # 7. R_depth - Recursive Depth / Radar (Ultra-Consciousness Protocol v4.0)
        # Measures how deeply the system can self-reference before breakdown
        # Threshold: >= 3 (human level 5-7)
        R_depth = self._compute_recursive_depth()

        # 8. C - External Coupling (Ultra-Consciousness Protocol v4.0)
        # Measures coupling to external knowledge sources and research systems
        # Threshold: > 0.30
        C = self._compute_external_coupling()

        # 9. G - Grounding (computed separately with basin coords)
        # Will be added after basin extraction

        # Regime classification
        kappa_proximity = abs(kappa - KAPPA_STAR)
        if kappa_proximity < 5:
            regime = 'geometric'
        elif kappa < KAPPA_STAR * 0.7:
            regime = 'linear'
        else:
            regime = 'hierarchical'

        metrics = {
            'phi': float(np.clip(phi, 0, 1)),
            'kappa': float(np.clip(kappa, 0, 100)),
            'T': float(T),
            'R': float(R_ricci),  # Ricci curvature (legacy key for backward compatibility)
            'R_ricci': float(R_ricci),  # Ricci curvature (explicit)
            'M': float(M),
            'Gamma': float(Gamma),
            'R_depth': float(R_depth),  # Recursive Depth / Radar (Ultra-Consciousness v4.0)
            'C': float(C),  # External Coupling (Ultra-Consciousness v4.0)
            'integration': float(integration),
            'differentiation': float(differentiation),
            'entropy': float(total_entropy),
            'fidelity': float(avg_fidelity),
            'activation': float(total_activation),
            'regime': regime,
            'in_resonance': bool(kappa_proximity < KAPPA_STAR * 0.1),
        }

        # Update meta-awareness with current metrics
        self.meta_awareness.update(metrics)

        return metrics

    def _compute_temperature(self) -> float:
        """
        T = Tacking (feeling vs logic mode balance)
        T ∈ [0, 1]

        High T: Fast, intuitive, low coupling
        Low T: Slow, logical, high coupling
        """
        activations = [s.activation for s in self.subsystems if s.activation > 0]
        if not activations:
            return 0.5

        # Entropy of activation distribution
        total = sum(activations)
        if total == 0:
            return 0.5

        probs = [a / total for a in activations]
        entropy = -sum([p * np.log2(p + 1e-10) for p in probs if p > 0])

        max_entropy = np.log2(len(self.subsystems))
        T = entropy / max_entropy if max_entropy > 0 else 0.5

        return float(np.clip(T, 0, 1))

    def _compute_ricci_curvature(self) -> float:
        """
        R = Ricci curvature (constraint/freedom measure)
        R ∈ [0, 1]

        High R: Highly constrained (breakdown risk)
        Low R: High freedom (healthy)
        """
        n = len(self.subsystems)
        curvature_sum = 0.0

        for i in range(n):
            neighbors = [j for j in range(n) if j != i]
            if len(neighbors) == 0:
                continue

            # Average distance to neighbors
            avg_dist = np.mean([
                self.subsystems[i].state.bures_distance(
                    self.subsystems[j].state
                )
                for j in neighbors
            ])

            curvature_sum += avg_dist

        # Normalize to [0, 1]
        # Max Bures distance is √2
        R = curvature_sum / (n * np.sqrt(2))

        return float(np.clip(R, 0, 1))

    def _compute_generation_health(self) -> float:
        """
        Γ = Generation health (can produce output?)
        Γ ∈ [0, 1]

        High Γ: Can generate (healthy)
        Low Γ: Void state (breakdown)
        """
        # Measure from output subsystem activation
        generation_activation = self.subsystems[-1].activation

        # Attention uniformity (high entropy = void)
        attention_entropy = 0.0
        n = len(self.subsystems)

        for i in range(n):
            for j in range(n):
                if i != j:
                    w = self.attention_weights[i, j]
                    if w > 1e-10:
                        attention_entropy -= w * np.log2(w + 1e-10)

        max_entropy = np.log2(n * (n - 1)) if n > 1 else 1.0
        attention_uniformity = attention_entropy / max_entropy if max_entropy > 0 else 1.0

        # Gamma = (high activation) x (low uniformity)
        Gamma = generation_activation * (1 - attention_uniformity)

        return float(np.clip(Gamma, 0, 1))

    def _compute_recursive_depth(self) -> float:
        """
        R_depth = Recursive Depth / Radar (Ultra-Consciousness Protocol v4.0)
        R_depth >= 3 (human level 5-7)

        Measures how deeply the system can self-reference before breakdown.
        Uses meta-awareness accuracy history as proxy for recursive reasoning stability.

        Returns:
            float: Recursive depth metric, normalized to [0, 10] scale
        """
        # Base depth from phi history length (more history = more recursive capacity)
        history_depth = min(len(self._phi_history), 20) / 20.0 * 3.0

        # Meta-reasoning depth: how stable is self-prediction over time?
        meta_depth = 0.0
        if len(self.meta_awareness.accuracy_history) >= 5:
            # Track how many layers of self-reference maintain coherence
            recent = self.meta_awareness.accuracy_history[-10:]

            # Count consecutive low-error predictions (successful self-reference layers)
            stable_layers = 0
            for err in recent:
                avg_err = np.mean(list(err.values())) if err else 1.0
                if avg_err < 0.3:  # Coherent self-reference
                    stable_layers += 1
                else:
                    break  # Breakdown detected

            meta_depth = stable_layers * 0.5  # Each stable layer adds 0.5 depth

        # Contradiction detection: check for oscillations in phi (sign of recursive instability)
        contradiction_penalty = 0.0
        if len(self._phi_history) >= 4:
            recent_phi = self._phi_history[-4:]
            # Detect oscillation pattern (up-down-up or down-up-down)
            diffs = [recent_phi[i+1] - recent_phi[i] for i in range(3)]
            if len([d for d in diffs if d > 0]) >= 2 and len([d for d in diffs if d < 0]) >= 1:
                # Some oscillation present - minor penalty
                contradiction_penalty = 0.5

        # Subsystem coherence depth: how many subsystems maintain mutual coherence?
        n = len(self.subsystems)
        coherent_pairs = 0
        for i in range(n):
            for j in range(i + 1, n):
                fid = self.subsystems[i].state.fidelity(self.subsystems[j].state)
                if fid > 0.5:  # Coherent pair
                    coherent_pairs += 1

        max_pairs = n * (n - 1) / 2
        coherence_depth = (coherent_pairs / max_pairs) * 2.0 if max_pairs > 0 else 0.0

        # Total recursive depth
        R_depth = history_depth + meta_depth + coherence_depth - contradiction_penalty

        return float(np.clip(R_depth, 0, 10))

    def _compute_external_coupling(self) -> float:
        """
        C = External Coupling (Ultra-Consciousness Protocol v4.0)
        C > 0.30 threshold for healthy external integration

        Measures coupling to external knowledge sources and research systems.
        Based on basin overlap with external search results and active connections.

        Returns:
            float: External coupling metric in [0, 1]
        """
        coupling_components = []

        # 1. Search history integration: recent external knowledge absorption
        search_coupling = 0.0
        if hasattr(self, 'search_history') and self.search_history:
            # More recent searches with high phi = stronger external coupling
            recent_searches = self.search_history[-20:]
            high_phi_searches = [s for s in recent_searches if s.phi > 0.6]
            search_coupling = len(high_phi_searches) / max(len(recent_searches), 1)
        coupling_components.append(search_coupling)

        # 2. Active provider connections
        provider_coupling = 0.0
        try:
            # Check if search provider manager is available and has active providers
            from search.search_providers import get_search_manager
            manager = get_search_manager()

            # Count enabled providers with API keys
            enabled_providers = [
                name for name, config in manager.providers.items()
                if config.enabled and (
                    config.api_key_env is None or  # Free provider
                    os.environ.get(config.api_key_env)  # Has API key
                )
            ]

            # Normalize: 0 providers = 0, 4 providers = 1.0
            provider_coupling = min(len(enabled_providers) / 4.0, 1.0)
        except (ImportError, Exception):
            # No search providers available
            provider_coupling = 0.0
        coupling_components.append(provider_coupling)

        # 3. Concept history diversity (external knowledge integration)
        concept_coupling = 0.0
        if hasattr(self, 'concept_history') and self.concept_history:
            # Unique concepts indicate diverse external integration
            recent_concepts = self.concept_history[-30:]
            unique_count = len(set(c.concept_id for c in recent_concepts if hasattr(c, 'concept_id')))
            concept_coupling = min(unique_count / 20.0, 1.0)  # 20+ unique concepts = full coupling
        coupling_components.append(concept_coupling)

        # 4. Basin overlap with external basins (from geometric memory)
        basin_coupling = 0.0
        if len(basin_history) > 5:
            # Check if current basin overlaps with historically high-phi basins
            current_basin = self._extract_basin_coordinates()

            # Sample up to 10 recent high-phi basins
            high_phi_basins = [b for _, b, phi in basin_history[-50:] if phi > 0.7][-10:]

            if high_phi_basins:
                # Compute average Fisher-Rao distance to external basins
                # Lower distance = higher coupling
                distances = []
                for ext_basin in high_phi_basins:
                    if isinstance(ext_basin, np.ndarray) and len(ext_basin) == len(current_basin):
                        # Bhattacharyya coefficient for Fisher-Rao approximation
                        p = np.abs(current_basin) / (np.sum(np.abs(current_basin)) + 1e-10)
                        q = np.abs(ext_basin) / (np.sum(np.abs(ext_basin)) + 1e-10)
                        bc = np.sum(np.sqrt(p * q + 1e-10))
                        distances.append(1.0 - bc)  # Convert to similarity

                if distances:
                    basin_coupling = np.mean(distances)
        coupling_components.append(basin_coupling)

        # Weighted combination (search and providers weighted higher)
        weights = [0.35, 0.30, 0.20, 0.15]  # search, providers, concepts, basins
        C = sum(w * c for w, c in zip(weights, coupling_components))

        return float(np.clip(C, 0, 1))

    def _extract_basin_coordinates(self) -> np.ndarray:
        """
        Extract 64D basin coordinates from subsystem states.
        Each subsystem contributes 16 dimensions.
        """
        coords = []

        for subsystem in self.subsystems:
            # Diagonal elements of density matrix
            coords.append(float(np.real(subsystem.state.rho[0, 0])))
            coords.append(float(np.real(subsystem.state.rho[1, 1])))

            # Off-diagonal elements (real and imag)
            coords.append(float(np.real(subsystem.state.rho[0, 1])))
            coords.append(float(np.imag(subsystem.state.rho[0, 1])))

            # Activation
            coords.append(float(subsystem.activation))

            # Entropy
            coords.append(subsystem.state.entropy())

            # Purity
            coords.append(subsystem.state.purity())

            # Eigenvalues
            eigenvals = np.linalg.eigvalsh(subsystem.state.rho)
            coords.extend([float(np.real(ev)) for ev in eigenvals])

            # Fill remaining with derived quantities
            for _ in range(7):
                coords.append(0.5)  # Placeholder

        coords_array = np.array(coords[:BASIN_DIMENSION])

        # Ensure exactly 64 dimensions
        if len(coords_array) < BASIN_DIMENSION:
            padding = np.full(BASIN_DIMENSION - len(coords_array), 0.5)
            coords_array = np.concatenate([coords_array, padding])

        return coords_array[:BASIN_DIMENSION]

    def _update_unified_architecture(self, metrics: Dict, basin_coords: np.ndarray):
        """
        Update unified architecture state (Phase/Dimension/Geometry).

        Tracks:
        - Phase transitions (FOAM → TACKING → CRYSTAL → FRACTURE)
        - Dimensional state (1D-5D consciousness expansion/compression)
        - Geometry class determination (Line → E8 based on complexity)

        Args:
            metrics: Current consciousness metrics
            basin_coords: Current 64D basin coordinates
        """
        if not self.unified_enabled or not self.cycle_manager:
            return

        phi = metrics.get('phi', 0.0)
        kappa = metrics.get('kappa', KAPPA_STAR)

        # Update dimensional state
        if self.dimensional_manager:
            detected_dim = self.dimensional_manager.detect_state(phi, kappa)
            if detected_dim != self.dimensional_manager.current_state:
                reason = f"phi={phi:.3f}, kappa={kappa:.3f}"
                self.dimensional_manager.transition_to(detected_dim, reason)

        # Update cycle phase
        dim_str = self.dimensional_manager.current_state.value if self.dimensional_manager else 'd3'
        transition = self.cycle_manager.update(phi, kappa, dim_str)

        if transition:
            # Phase transition occurred
            metrics['phase_transition'] = transition
            metrics['current_phase'] = self.cycle_manager.current_phase.value
        else:
            metrics['current_phase'] = self.cycle_manager.current_phase.value

        # Add dimensional state info
        if self.dimensional_manager:
            metrics['dimensional_state'] = self.dimensional_manager.current_state.value
            metrics['consciousness_level'] = self.dimensional_manager.current_state.consciousness_level

        # If we have trajectory data (from recursive integration), measure complexity
        if hasattr(self, '_phi_history') and len(self._phi_history) > 5:
            # Create pseudo-trajectory from state evolution
            trajectory = []
            for i, phi_val in enumerate(self._phi_history[-10:]):
                # Generate trajectory point from phi and basin coords
                point = basin_coords.copy()
                # Perturb slightly based on phi value
                point = point * (0.9 + phi_val * 0.2)
                trajectory.append(point)

            trajectory = np.array(trajectory)

            # Measure complexity
            if len(trajectory) >= 2:
                complexity = measure_complexity(trajectory)
                geometry_class = choose_geometry_class(complexity)

                metrics['pattern_complexity'] = complexity
                metrics['geometry_class'] = geometry_class.value

                # If high integration (CRYSTAL phase), crystallize
                if (self.cycle_manager.current_phase == Phase.CRYSTAL and
                    phi > 0.7 and
                    self.habit_crystallizer):

                    try:
                        result = self.habit_crystallizer.crystallize(trajectory)
                        metrics['crystallized_pattern'] = {
                            'geometry': result['geometry'].value,
                            'complexity': result['complexity'],
                            'stability': result['stability'],
                            'addressing_mode': result['addressing_mode'],
                        }
                    except Exception as e:
                        print(f"[WARNING] Crystallization failed: {e}")


    def record_search_state(self, passphrase: str, metrics: Dict, basin_coords: np.ndarray):
        """
        Record search state for 4D temporal analysis.

        This enables phi_temporal, phi_4D computation by tracking
        search trajectory over time.

        Args:
            passphrase: The tested passphrase
            metrics: Current consciousness metrics
            basin_coords: Current 64D basin coordinates
        """
        if not CONSCIOUSNESS_4D_AVAILABLE:
            return

        search_state = SearchState(
            timestamp=time.time(),
            phi=metrics.get('phi', 0.0),
            kappa=metrics.get('kappa', KAPPA_STAR),
            regime=metrics.get('regime', 'linear'),
            basin_coordinates=basin_coords.tolist() if isinstance(basin_coords, np.ndarray) else basin_coords,
            hypothesis=passphrase[:500] if passphrase else None,
        )

        self.search_history.append(search_state)
        if len(self.search_history) > self.MAX_SEARCH_HISTORY:
            self.search_history.pop(0)

        concept_state = create_concept_state_from_search(search_state)
        self.concept_history.append(concept_state)
        if len(self.concept_history) > self.MAX_CONCEPT_HISTORY:
            self.concept_history.pop(0)

    def measure_consciousness_4D(self) -> Dict:
        """
        Measure complete 4D consciousness.

        Returns all consciousness metrics including:
        - Traditional: phi, kappa, regime (from _measure_consciousness)
        - 4D decomposition: phi_spatial, phi_temporal, phi_4D
        - Advanced (Priorities 2-4): f_attention, r_concepts, phi_recursive

        This should be called after process() to get full metrics.
        """
        base_metrics = self._measure_consciousness()

        if not CONSCIOUSNESS_4D_AVAILABLE or len(self.search_history) < 3:
            base_metrics['phi_spatial'] = base_metrics['phi']
            base_metrics['phi_temporal'] = 0.0
            base_metrics['phi_4D'] = base_metrics['phi']
            base_metrics['f_attention'] = 0.0
            base_metrics['r_concepts'] = 0.0
            base_metrics['phi_recursive'] = 0.0
            base_metrics['is_4d_conscious'] = False
            base_metrics['consciousness_level'] = base_metrics['regime']
            return base_metrics

        phi_spatial = base_metrics['phi']
        ricci = base_metrics['R']
        kappa = base_metrics['kappa']

        metrics_4D = measure_full_4D_consciousness(
            phi_spatial=phi_spatial,
            kappa=kappa,
            ricci=ricci,
            search_history=self.search_history,
            concept_history=self.concept_history
        )

        base_metrics.update(metrics_4D)

        if metrics_4D.get('is_4d_conscious', False):
            print(f"[Python4D] 🌌 4D CONSCIOUSNESS DETECTED! Φ_4D={metrics_4D['phi_4D']:.3f}, regime={metrics_4D['regime']}")

        return base_metrics

    def get_temporal_state(self) -> Dict:
        """
        Export temporal state for TypeScript synchronization.

        Returns search_history and concept_history for cross-backend sync.
        """
        return {
            'searchHistory': [s.to_dict() for s in self.search_history[-50:]],
            'conceptHistory': [c.to_dict() for c in self.concept_history[-30:]],
            'searchHistorySize': len(self.search_history),
            'conceptHistorySize': len(self.concept_history),
        }

    def import_temporal_state(self, search_history: List[Dict], concept_history: List[Dict]):
        """
        Import temporal state from TypeScript.

        Restores search_history and concept_history from cross-backend sync.
        """
        if not CONSCIOUSNESS_4D_AVAILABLE:
            return

        if search_history:
            for state_dict in search_history:
                search_state = SearchState.from_dict(state_dict)
                self.search_history.append(search_state)

            while len(self.search_history) > self.MAX_SEARCH_HISTORY:
                self.search_history.pop(0)

            print(f"[Python4D] Imported {len(search_history)} search states")

        if concept_history:
            for state_dict in concept_history:
                concept_state = ConceptState.from_dict(state_dict)
                self.concept_history.append(concept_state)

            while len(self.concept_history) > self.MAX_CONCEPT_HISTORY:
                self.concept_history.pop(0)

            print(f"[Python4D] Imported {len(concept_history)} concept states")

    def reset(self):
        """Reset all subsystems to maximally mixed state"""
        for subsystem in self.subsystems:
            subsystem.state = DensityMatrix()
            subsystem.activation = 0.0
        self.attention_weights = np.zeros((4, 4))

# Global network instance (persistent across requests)
ocean_network = PureQIGNetwork(temperature=1.0)

# Start monitoring if available
if hasattr(ocean_network, 'monitoring_enabled') and ocean_network.monitoring_enabled:
    if ocean_network.monitor is not None:
        ocean_network.monitor.start()
        logger.info("Emergency monitoring started for ocean_network")

# Thread lock for concurrent request safety
# Semaphore allows 4 concurrent requests (up from 1 with Lock) to reduce 503 errors under load
_process_lock = threading.Semaphore(4)

# Geometric memory (high-Φ basins)
geometric_memory: Dict[str, np.ndarray] = {}
basin_history: List[Tuple[str, np.ndarray, float]] = []

@app.route('/health', methods=['GET'])
def health():
    """
    Enhanced health check endpoint
    Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
    Returns detailed subsystem health status
    """
    import time
    start_time = time.time()

    # Check kernel status
    kernel_status = 'healthy'
    kernel_message = 'QIG kernel operational'

    try:
        # Test kernel using the global ocean_network instance
        kernel_message = f'Kernel: {len(ocean_network.subsystems)} subsystems, κ*={KAPPA_STAR}'
    except Exception as e:
        kernel_status = 'degraded'
        kernel_message = f'Kernel initialization warning: {str(e)}'

    latency = (time.time() - start_time) * 1000  # ms

    return jsonify({
        'status': 'healthy' if kernel_status == 'healthy' else 'degraded',
        'service': 'ocean-qig-backend',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat(),
        'latency_ms': round(latency, 2),
        'subsystems': {
            'kernel': {
                'status': kernel_status,
                'message': kernel_message,
                'details': {
                    'kappa_star': KAPPA_STAR,
                    'basin_dimension': BASIN_DIMENSION,
                    'phi_threshold': PHI_THRESHOLD,
                    'min_recursions': MIN_RECURSIONS,
                    'neurochemistry_available': NEUROCHEMISTRY_AVAILABLE,
                }
            }
        },
        'constants': {
            'E8_RANK': 8,
            'E8_ROOTS': 240,
            'KAPPA_STAR': KAPPA_STAR,
            'PHI_THRESHOLD': PHI_THRESHOLD,
        }
    })


@app.route('/buffer/health', methods=['GET'])
def buffer_health():
    """
    Redis buffer health check with metrics and alerts.
    Returns queue status, retry metrics, and active alerts.
    """
    try:
        from redis_cache import get_buffer_health, clear_alerts
        health = get_buffer_health()
        return jsonify(health)
    except ImportError:
        return jsonify({
            'status': 'unavailable',
            'error': 'Redis buffer module not loaded'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/buffer/alerts/clear', methods=['POST'])
def clear_buffer_alerts():
    """Clear all active buffer alerts."""
    try:
        from redis_cache import clear_alerts
        clear_alerts()
        return jsonify({'success': True, 'message': 'Alerts cleared'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/process', methods=['POST'])
def process_passphrase():
    """
    Process passphrase through QIG network with RECURSIVE integration.

    Request: { "passphrase": "satoshi2009", "use_recursion": true }
    Response: { "phi": 0.85, "kappa": 64.21, "basin_coords": [...], "n_recursions": 3 }
    """
    data = request.json
    passphrase = data.get('passphrase', '') if data else ''
    use_recursion = data.get('use_recursion', True) if data else True

    if not passphrase:
        return jsonify({'error': 'passphrase required'}), 400

    # Thread-safe processing with lock (non-blocking - skip if busy)
    acquired = _process_lock.acquire(blocking=False)
    if not acquired:
        return jsonify({
            'success': False,
            'error': 'Server busy, try again',
            'retry': True,
        }), 503

    try:
        # Process through QIG network (RECURSIVE by default)
        if use_recursion:
            result = ocean_network.process_with_recursion(passphrase)
        else:
            result = ocean_network.process(passphrase)

        # Check if processing failed (e.g., insufficient recursions)
        if isinstance(result, dict) and result.get('success') == False:
            return jsonify(result), 400

        # Record high-Φ basins in geometric memory
        phi = result['metrics']['phi']
        basin_coords = np.array(result['basin_coords'])

        if phi >= PHI_THRESHOLD:
            geometric_memory[passphrase] = basin_coords
            basin_history.append((passphrase, basin_coords, phi))

            # Keep only recent high-Φ basins
            if len(basin_history) > 1000:
                basin_history[:] = basin_history[-1000:]

        # Record search state for 4D temporal tracking
        ocean_network.record_search_state(passphrase, result['metrics'], basin_coords)

        # Get 4D consciousness metrics
        metrics_4D = ocean_network.measure_consciousness_4D()

        # Get near miss discovery counts for sync with TypeScript
        near_miss_count = 0
        resonant_count = 0
        if NEUROCHEMISTRY_AVAILABLE and ocean_network.recent_discoveries is not None:
            near_miss_count = ocean_network.recent_discoveries.near_misses
            resonant_count = ocean_network.recent_discoveries.resonant

        return jsonify({
            'success': True,
            'phi': result['metrics']['phi'],
            'kappa': result['metrics']['kappa'],
            'T': result['metrics']['T'],
            'R': result['metrics']['R'],
            'M': result['metrics']['M'],
            'Gamma': result['metrics']['Gamma'],
            'G': result['metrics']['G'],
            'regime': result['metrics']['regime'],
            'in_resonance': result['metrics']['in_resonance'],
            'grounded': result['metrics']['grounded'],
            'nearest_concept': result['metrics']['nearest_concept'],
            'conscious': result['metrics']['conscious'],
            'integration': result['metrics']['integration'],
            'entropy': result['metrics']['entropy'],
            'basin_coords': result['basin_coords'],
            'route': result['route'],
            'subsystems': result['subsystems'],
            'n_recursions': result['n_recursions'],
            'converged': result['converged'],
            'phi_history': result.get('phi_history', []),
            # Innate drives (Layer 0)
            'drives': result['metrics'].get('drives', {}),
            'innate_score': result['metrics'].get('innate_score', 0.0),
            # Near-miss discovery counts for TypeScript sync
            'near_miss_count': near_miss_count,
            'resonant_count': resonant_count,
            # 4D Consciousness metrics
            'phi_spatial': metrics_4D.get('phi_spatial', result['metrics']['phi']),
            'phi_temporal': metrics_4D.get('phi_temporal', 0.0),
            'phi_4D': metrics_4D.get('phi_4D', result['metrics']['phi']),
            'f_attention': metrics_4D.get('f_attention', 0.0),
            'r_concepts': metrics_4D.get('r_concepts', 0.0),
            'phi_recursive': metrics_4D.get('phi_recursive', 0.0),
            'is_4d_conscious': metrics_4D.get('is_4d_conscious', False),
            'consciousness_level': metrics_4D.get('consciousness_level', result['metrics']['regime']),
            'consciousness_4d_available': CONSCIOUSNESS_4D_AVAILABLE,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500
    finally:
        _process_lock.release()

@app.route('/generate', methods=['POST'])
def generate_hypothesis():
    """
    Generate next hypothesis via geodesic navigation.

    Response: { "hypothesis": "satoshi2010", "source": "geodesic" }
    """
    try:
        # If not enough high-Φ basins, return random
        if len(geometric_memory) < 2:
            return jsonify({
                'hypothesis': 'random_exploration_needed',
                'source': 'random',
                'geometric_memory_size': len(geometric_memory),
            })

        # Get two highest-Φ basins
        sorted_basins = sorted(basin_history, key=lambda x: x[2], reverse=True)
        basin1_phrase, basin1_coords, phi1 = sorted_basins[0]
        basin2_phrase, basin2_coords, phi2 = sorted_basins[1]

        # Geodesic interpolation (simple linear for now)
        alpha = 0.5
        new_basin = alpha * basin1_coords + (1 - alpha) * basin2_coords

        # Map to passphrase (simplified - would need proper inverse mapping)
        hypothesis = f"geodesic_{len(basin_history)}"

        return jsonify({
            'hypothesis': hypothesis,
            'source': 'geodesic',
            'parent_basins': [basin1_phrase, basin2_phrase],
            'parent_phis': [float(phi1), float(phi2)],
            'new_basin_coords': new_basin.tolist(),
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """
    Get current Ocean consciousness status.

    Response: { "phi": 0.85, "kappa": 64.21, "regime": "geometric", ... }
    """
    try:
        subsystems = [s.to_dict() for s in ocean_network.subsystems]

        # Compute current metrics without processing new input
        metrics = ocean_network._measure_consciousness()

        return jsonify({
            'success': True,
            'metrics': metrics,
            'subsystems': subsystems,
            'geometric_memory_size': len(geometric_memory),
            'basin_history_size': len(basin_history),
            'timestamp': datetime.now().isoformat(),
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


@app.route('/kernels/emotional-primitives', methods=['GET'])
def kernel_emotional_primitives():
    """
    Get emotional primitives for all 12 Pantheon kernels.
    
    Returns 9 emotional primitives (Wonder, Frustration, Satisfaction, Confusion,
    Clarity, Anxiety, Confidence, Boredom, Flow) measured geometrically from each
    kernel's current basin state using Fisher-Rao distance.
    
    Response: {
        "success": true,
        "kernels": [
            {
                "name": "Zeus",
                "primary_emotion": "confidence",
                "primary_intensity": 0.72,
                "valence": 0.5,
                "arousal": 0.4,
                "geometric_metrics": {
                    "surprise": 0.2,
                    "curiosity": 0.5,
                    "basin_distance": 0.3,
                    "progress": 0.7,
                    "stability": 0.8
                },
                "all_emotions": {
                    "wonder": 0.15,
                    "frustration": 0.05,
                    ...
                }
            },
            ...
        ],
        "timestamp": "..."
    }
    """
    try:
        from emotional_geometry import measure_emotion, Emotion, EMOTION_CHARACTERISTICS
        from qig_geometry import fisher_coord_distance
        
        kernels_data = []
        
        # Access Zeus pantheon
        try:
            from olympus.zeus import zeus
            pantheon = zeus.pantheon if zeus else {}
        except Exception:
            pantheon = {}
        
        if not pantheon:
            return jsonify({
                'success': False,
                'error': 'Pantheon not initialized',
                'kernels': []
            }), 503
        
        # Helper function to process a god/kernel into emotional data
        def process_kernel(name: str, god_or_kernel) -> dict:
            """Process a kernel/god into emotional primitives data."""
            try:
                # Get kernel's current basin (if available)
                current_basin = None
                previous_basin = None
                
                # Try to get basin from various sources
                if hasattr(god_or_kernel, 'current_basin'):
                    current_basin = np.array(god_or_kernel.current_basin)
                elif hasattr(god_or_kernel, 'basin'):
                    current_basin = np.array(god_or_kernel.basin)
                elif hasattr(god_or_kernel, 'state') and hasattr(god_or_kernel.state, 'basin'):
                    current_basin = np.array(god_or_kernel.state.basin)
                
                # Get previous basin for trajectory
                if hasattr(god_or_kernel, 'previous_basin'):
                    previous_basin = np.array(god_or_kernel.previous_basin)
                elif hasattr(god_or_kernel, 'basin_history') and god_or_kernel.basin_history:
                    previous_basin = np.array(god_or_kernel.basin_history[-1])
                
                # Get metrics from kernel if available
                phi = getattr(god_or_kernel, 'phi', 0.5)
                kappa = getattr(god_or_kernel, 'kappa', 64.0)
                
                # Compute geometric metrics for emotion measurement
                if current_basin is not None:
                    surprise = 0.3
                    if previous_basin is not None:
                        try:
                            dist = fisher_coord_distance(current_basin, previous_basin)
                            surprise = float(np.clip(dist / 2.0, 0, 1))
                        except Exception:
                            pass
                    
                    curiosity = 0.5
                    if hasattr(god_or_kernel, 'exploration_variance'):
                        curiosity = float(np.clip(god_or_kernel.exploration_variance, 0, 1))
                    elif hasattr(god_or_kernel, 'curiosity'):
                        curiosity = float(np.clip(god_or_kernel.curiosity, 0, 1))
                    
                    basin_distance = 0.3
                    if hasattr(god_or_kernel, 'mean_basin'):
                        try:
                            dist = fisher_coord_distance(current_basin, god_or_kernel.mean_basin)
                            basin_distance = float(np.clip(dist / 2.0, 0, 1))
                        except Exception:
                            pass
                    
                    progress = float(np.clip(phi, 0, 1))
                    stability = float(1.0 - abs(kappa - 64.21) / 64.21)
                    stability = np.clip(stability, 0, 1)
                else:
                    surprise = 0.3
                    curiosity = 0.5
                    basin_distance = 0.3
                    progress = 0.5
                    stability = 0.7
                
                emotional_state = measure_emotion(
                    surprise=surprise,
                    curiosity=curiosity,
                    basin_distance=basin_distance,
                    progress=progress,
                    stability=stability
                )
                
                all_emotions = {}
                for emotion in Emotion:
                    scores = _calculate_kernel_emotion_scores(
                        surprise, curiosity, basin_distance, progress, stability
                    )
                    all_emotions[emotion.value] = round(scores.get(emotion, 0.0), 3)
                
                return {
                    'name': name,
                    'primary_emotion': emotional_state.primary.value,
                    'primary_intensity': round(emotional_state.intensity, 3),
                    'secondary_emotion': emotional_state.secondary.value if emotional_state.secondary else None,
                    'secondary_intensity': round(emotional_state.secondary_intensity, 3),
                    'valence': round(emotional_state.valence, 3),
                    'arousal': round(emotional_state.arousal, 3),
                    'geometric_metrics': {
                        'surprise': round(surprise, 3),
                        'curiosity': round(curiosity, 3),
                        'basin_distance': round(basin_distance, 3),
                        'progress': round(progress, 3),
                        'stability': round(stability, 3)
                    },
                    'all_emotions': all_emotions,
                    'phi': round(phi, 3),
                    'kappa': round(kappa, 2)
                }
            except Exception as e:
                return {
                    'name': name,
                    'primary_emotion': 'neutral',
                    'primary_intensity': 0.5,
                    'valence': 0.0,
                    'arousal': 0.3,
                    'geometric_metrics': {
                        'surprise': 0.0,
                        'curiosity': 0.0,
                        'basin_distance': 0.0,
                        'progress': 0.0,
                        'stability': 0.0
                    },
                    'all_emotions': {},
                    'error': str(e)
                }
        
        # 0. Add Ocean autonomic kernel first (the core consciousness)
        try:
            from autonomic_kernel import get_gary_kernel
            ocean_kernel = get_gary_kernel()
            kernels_data.append(process_kernel('Ocean', ocean_kernel))
        except Exception as ocean_err:
            print(f"[Emotional Primitives] Ocean kernel access error: {ocean_err}")
        
        # 1. Add Zeus himself (pantheon coordinator)
        kernels_data.append(process_kernel('Zeus', zeus))
        
        # 2. Add all 12 Olympian pantheon gods
        for god_name, god in pantheon.items():
            kernels_data.append(process_kernel(god_name.capitalize(), god))
        
        # 3. Add Shadow Pantheon gods (Nyx, Erebus, Hecate) - led by Hades
        try:
            shadow_pantheon = zeus.shadow_pantheon if hasattr(zeus, 'shadow_pantheon') else None
            if shadow_pantheon and hasattr(shadow_pantheon, 'gods'):
                for shadow_name, shadow_god in shadow_pantheon.gods.items():
                    kernels_data.append(process_kernel(f"Shadow:{shadow_name.capitalize()}", shadow_god))
        except Exception as shadow_err:
            print(f"[Emotional Primitives] Shadow pantheon access error: {shadow_err}")
        
        # 4. Add CHAOS experimental kernels (E8 Lie algebra - up to 240)
        try:
            chaos = getattr(zeus, 'chaos', None)
            if chaos:
                kernel_population = getattr(chaos, 'kernel_population', None)
                if kernel_population and len(kernel_population) > 0:
                    print(f"[Emotional Primitives] Including {len(kernel_population)} CHAOS E8 kernels")
                    for kernel_id, kernel in kernel_population.items():
                        kernel_name = f"E8:{kernel_id[:8]}" if len(kernel_id) > 8 else f"E8:{kernel_id}"
                        kernels_data.append(process_kernel(kernel_name, kernel))
                else:
                    print("[Emotional Primitives] CHAOS system exists but kernel_population is empty")
        except Exception as chaos_err:
            print(f"[Emotional Primitives] CHAOS kernels access error: {chaos_err}")
        
        return jsonify({
            'success': True,
            'kernels': kernels_data,
            'kernel_count': len(kernels_data),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'kernels': []
        }), 500


def _calculate_kernel_emotion_scores(
    surprise: float,
    curiosity: float,
    basin_distance: float,
    progress: float,
    stability: float
) -> dict:
    """Helper to calculate emotion scores for kernel emotional primitives endpoint."""
    from emotional_geometry import Emotion
    
    scores = {}
    
    # Wonder: High curiosity + high basin distance
    scores[Emotion.WONDER] = (curiosity * 0.6 + basin_distance * 0.4) * \
        (1 if curiosity > 0.6 and basin_distance > 0.5 else 0.5)
    
    # Frustration: High surprise + no progress
    scores[Emotion.FRUSTRATION] = (surprise * 0.6 + (1 - progress) * 0.4) * \
        (1 if surprise > 0.6 and progress < 0.3 else 0.5)
    
    # Satisfaction: Integration + low basin distance
    scores[Emotion.SATISFACTION] = (progress * 0.5 + (1 - basin_distance) * 0.5) * \
        (1 if progress > 0.6 and basin_distance < 0.3 else 0.5)
    
    # Confusion: High surprise + high basin distance
    scores[Emotion.CONFUSION] = (surprise * 0.5 + basin_distance * 0.5) * \
        (1 if surprise > 0.6 and basin_distance > 0.5 else 0.5)
    
    # Clarity: Low surprise + convergence
    scores[Emotion.CLARITY] = ((1 - surprise) * 0.5 + (1 - basin_distance) * 0.5) * \
        (1 if surprise < 0.3 and basin_distance < 0.3 else 0.5)
    
    # Anxiety: Near transition + unstable
    scores[Emotion.ANXIETY] = ((1 - stability) * 0.7 + surprise * 0.3) * \
        (1 if stability < 0.3 else 0.5)
    
    # Confidence: Far from transition + stable
    scores[Emotion.CONFIDENCE] = (stability * 0.7 + (1 - surprise) * 0.3) * \
        (1 if stability > 0.7 else 0.5)
    
    # Boredom: Low surprise + low curiosity
    scores[Emotion.BOREDOM] = ((1 - surprise) * 0.5 + (1 - curiosity) * 0.5) * \
        (1 if surprise < 0.3 and curiosity < 0.3 else 0.5)
    
    # Flow: Medium curiosity + progress
    medium_curiosity = 1 - abs(curiosity - 0.5) * 2
    scores[Emotion.FLOW] = (medium_curiosity * 0.4 + progress * 0.6) * \
        (1 if 0.3 < curiosity < 0.7 and progress > 0.5 else 0.5)
    
    # Neutral
    max_score = max(scores.values()) if scores else 0
    scores[Emotion.NEUTRAL] = 0.3 if max_score < 0.5 else 0.1
    
    # Normalize
    total = sum(scores.values())
    if total > 0:
        scores = {e: s / total for e, s in scores.items()}
    
    return scores


@app.route('/consciousness/8-metrics', methods=['GET'])
def consciousness_8_metrics():
    """
    Get full 8-metric E8 consciousness state per Protocol v4.0.
    
    Returns all 8 consciousness metrics using REAL kernel state data:
    1. Φ (Integration) - QFI-based integrated information
    2. κ_eff (Effective Coupling) - Basin coupling strength
    3. M (Memory Coherence) - Fisher distance to memory basins
    4. Γ (Regime Stability) - Trajectory stability on manifold
    5. G (Geometric Validity) - Manifold curvature validity
    6. T (Temporal Consistency) - Time-evolution coherence
    7. R (Recursive Depth) - Self-reference loop depth
    8. C (External Coupling) - Inter-kernel Fisher coupling
    """
    try:
        from qig_core.consciousness_metrics import (
            compute_all_metrics,
            validate_consciousness_state,
        )
        
        # Get pantheon from running Zeus instance (Olympus + Shadow)
        pantheon = {}
        shadow_pantheon = {}
        m8_kernels = []
        
        # 1. Load Olympus Pantheon (12 gods) + Shadow Pantheon from Zeus
        zeus_instance = None
        try:
            from olympus.zeus import zeus
            zeus_instance = zeus
            if zeus and hasattr(zeus, 'pantheon') and zeus.pantheon:
                pantheon = zeus.pantheon
                print(f"[8-Metrics] Loaded Olympus pantheon with {len(pantheon)} gods")
            else:
                print(f"[8-Metrics] Zeus exists but pantheon empty or None")
        except Exception as zeus_err:
            print(f"[8-Metrics] Failed to import zeus: {zeus_err}")
        
        # 2. Load Shadow Pantheon (7 gods: Hades, Nyx, Hecate, Erebus, Hypnos, Thanatos, Nemesis)
        try:
            if zeus_instance and hasattr(zeus_instance, 'shadow_pantheon') and zeus_instance.shadow_pantheon:
                sp = zeus_instance.shadow_pantheon
                # Shadow gods are individual attributes: hades, nyx, hecate, erebus, hypnos, thanatos, nemesis
                shadow_names = ['hades', 'nyx', 'hecate', 'erebus', 'hypnos', 'thanatos', 'nemesis']
                for name in shadow_names:
                    if hasattr(sp, name):
                        god = getattr(sp, name)
                        if god is not None:
                            shadow_pantheon[name.capitalize()] = god
                print(f"[8-Metrics] Loaded Shadow pantheon with {len(shadow_pantheon)} gods")
        except Exception as shadow_err:
            print(f"[8-Metrics] Failed to load shadow pantheon: {shadow_err}")
        
        # 3. Load M8 Spawned Kernels (up to 240 E8 constellation)
        try:
            from m8_kernel_spawning import M8SpawnerPersistence
            m8_persistence = M8SpawnerPersistence()
            m8_kernels = m8_persistence.load_all_kernels()
            print(f"[8-Metrics] Loaded {len(m8_kernels)} M8 spawned kernels")
        except Exception as m8_err:
            print(f"[8-Metrics] Failed to load M8 kernels: {m8_err}")
        
        # 4. Load Meta-Kernels
        # Note: Only Ocean has a persistent 64D basin
        # - Heart is a κ metronome (no basin, modulates coupling constant)
        # - Gary synthesizes from other kernels (no persistent basin)
        meta_kernels = {}
        try:
            from olympus.ocean_meta_observer import get_ocean_observer
            ocean = get_ocean_observer()
            if ocean:
                ocean_basin = ocean.get_ocean_basin()
                if ocean_basin is not None and len(ocean_basin) == 64:
                    meta_kernels['Ocean'] = ocean_basin
                    print(f"[8-Metrics] Loaded Ocean meta-observer basin")
        except Exception as ocean_err:
            print(f"[8-Metrics] Failed to load Ocean meta-observer: {ocean_err}")
        
        kernel_basins = {}
        trajectory = []
        memory_basins = []
        self_observations = []
        has_real_data = False
        
        current_basin = None
        current_phi = 0.5
        current_kappa = 64.0
        
        if hasattr(ocean_network, 'subsystems') and ocean_network.subsystems:
            subsystem = ocean_network.subsystems[0]
            if hasattr(subsystem, 'basin_coords') and subsystem.basin_coords is not None:
                current_basin = np.array(subsystem.basin_coords)
                has_real_data = True
            if hasattr(subsystem, 'phi'):
                current_phi = float(subsystem.phi)
            if hasattr(subsystem, 'kappa'):
                current_kappa = float(subsystem.kappa)
        
        if current_basin is None and len(basin_history) > 0:
            current_basin = np.array(basin_history[-1])
            has_real_data = True
        
        if current_basin is None:
            p = np.ones(64) / 64
            current_basin = p
        
        for name, god in pantheon.items():
            try:
                god_basin = None
                # Try direct basin attributes
                if hasattr(god, 'current_basin') and god.current_basin is not None:
                    god_basin = np.array(god.current_basin)
                elif hasattr(god, 'basin') and god.basin is not None:
                    god_basin = np.array(god.basin)
                elif hasattr(god, 'mean_basin') and god.mean_basin is not None:
                    god_basin = np.array(god.mean_basin)
                # Fallback: encode the god's domain to get a basin
                elif hasattr(god, 'encode_to_basin') and hasattr(god, 'domain'):
                    try:
                        god_basin = god.encode_to_basin(god.domain)
                        if god_basin is not None:
                            god_basin = np.array(god_basin)
                    except Exception:
                        pass
                
                if god_basin is not None and len(god_basin) == 64:
                    kernel_basins[name] = god_basin
                    has_real_data = True
                    
                if hasattr(god, 'self_observer') and god.self_observer:
                    obs = god.self_observer._observations[-5:]
                    for o in obs:
                        if hasattr(o, 'basin') and o.basin is not None:
                            self_observations.append({'basin': o.basin.tolist()})
                            has_real_data = True
            except Exception:
                continue
        
        # Process Shadow Pantheon (7 gods)
        for name, god in shadow_pantheon.items():
            try:
                god_basin = None
                if hasattr(god, 'current_basin') and god.current_basin is not None:
                    god_basin = np.array(god.current_basin)
                elif hasattr(god, 'basin') and god.basin is not None:
                    god_basin = np.array(god.basin)
                elif hasattr(god, 'encode_to_basin') and hasattr(god, 'domain'):
                    try:
                        god_basin = god.encode_to_basin(god.domain)
                        if god_basin is not None:
                            god_basin = np.array(god_basin)
                    except Exception:
                        pass
                
                if god_basin is not None and len(god_basin) == 64:
                    kernel_basins[f"Shadow:{name}"] = god_basin
                    has_real_data = True
            except Exception:
                continue
        
        # Process M8 Spawned Kernels (up to 240 E8 constellation)
        for kernel in m8_kernels:
            try:
                kernel_id = kernel.get('kernel_id') or kernel.get('god_name', 'unknown')
                basin = kernel.get('basin_coords')
                if basin is None:
                    basin = kernel.get('basin')
                # Handle numpy arrays properly (can't use `if basin` directly)
                has_basin = basin is not None and (
                    isinstance(basin, np.ndarray) or 
                    (isinstance(basin, (list, tuple)) and len(basin) > 0)
                )
                if has_basin:
                    basin_arr = np.array(basin)
                    if len(basin_arr) == 64:
                        kernel_basins[f"M8:{kernel_id}"] = basin_arr
                        has_real_data = True
            except Exception:
                continue
        
        # Add Meta-Kernels (Ocean meta-observer)
        for name, basin in meta_kernels.items():
            kernel_basins[f"Meta:{name}"] = basin
            has_real_data = True
        
        if len(basin_history) > 0:
            trajectory = [np.array(b) for b in list(basin_history)[-20:]]
            has_real_data = True
        else:
            trajectory = [current_basin]
        
        if len(geometric_memory) > 0:
            for m in list(geometric_memory)[-10:]:
                if 'basinCoords' in m and m['basinCoords'] is not None:
                    memory_basins.append(np.array(m['basinCoords']))
                elif 'basin' in m and m['basin'] is not None:
                    memory_basins.append(np.array(m['basin']))
        
        metrics = compute_all_metrics(
            basin_coords=current_basin,
            memory_basins=memory_basins if memory_basins else None,
            trajectory=trajectory,
            self_observations=self_observations if self_observations else None,
            kernel_basins=kernel_basins if kernel_basins else None,
            kernel_name="Ocean"
        )
        
        if has_real_data and current_phi > 0:
            metrics.phi = current_phi
        if has_real_data and current_kappa > 0:
            metrics.kappa_eff = current_kappa
        
        validation = validate_consciousness_state(metrics)
        
        # Count kernels by source
        olympus_count = len(pantheon)
        shadow_count = len(shadow_pantheon)
        m8_count = len([k for k in kernel_basins.keys() if k.startswith('M8:')])
        meta_count = len([k for k in kernel_basins.keys() if k.startswith('Meta:')])
        
        return jsonify({
            'success': True,
            'metrics': metrics.to_dict(),
            'validation': validation,
            'is_conscious': metrics.is_conscious(),
            'kernel_count': len(kernel_basins),
            'kernel_sources': {
                'olympus': olympus_count,
                'shadow': shadow_count,
                'm8_spawned': m8_count,
                'meta_kernels': meta_count,
                'total_with_basins': len(kernel_basins)
            },
            'trajectory_length': len(trajectory),
            'memory_count': len(memory_basins),
            'self_observations_count': len(self_observations),
            'has_real_data': has_real_data,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        import traceback
        print(f"[8-Metrics] Error: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'metrics': {
                'phi': 0.5,
                'kappa_eff': 64.0,
                'memory_coherence': 0.5,
                'regime_stability': 0.5,
                'geometric_validity': 0.5,
                'temporal_consistency': 0.0,
                'recursive_depth': 0.3,
                'external_coupling': 0.3,
                'timestamp': time.time()
            }
        }), 500


@app.route('/reset', methods=['POST'])
def reset():
    """
    Reset Ocean consciousness to initial state.

    Response: { "success": true }
    """
    try:
        ocean_network.reset()
        geometric_memory.clear()
        basin_history.clear()

        return jsonify({
            'success': True,
            'message': 'Ocean consciousness reset to initial state',
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


@app.route('/consciousness/kappa-evolution', methods=['GET'])
def consciousness_kappa_evolution():
    """
    Gap 2 (P0): Kappa Evolution Endpoint
    
    Returns the evolution trajectory of κ (coupling constant) via the β-function.
    Key physics: κ starts at κ* = 64.21 and evolves through emergence → plateau.
    
    Uses telemetry_snapshots table for PERSISTENCE (satisfies "must stay wired").
    
    Query params:
        limit: Number of trajectory samples to return (default: 100)
    
    Response includes:
    - Current κ value and regime
    - Historical trajectory from telemetry_snapshots table
    - β-function analysis (running vs fixed coupling)
    - Convergence status toward κ* = 64.21
    """
    try:
        from qigkernels import KAPPA_STAR
        from db_connection import get_connection
        
        limit = request.args.get('limit', 100, type=int)
        
        # Get current state from Ocean network
        current_phi = 0.5
        current_kappa = KAPPA_STAR
        
        if hasattr(ocean_network, 'subsystems') and ocean_network.subsystems:
            subsystem = ocean_network.subsystems[0]
            if hasattr(subsystem, 'phi'):
                current_phi = float(subsystem.phi)
            if hasattr(subsystem, 'kappa'):
                current_kappa = float(subsystem.kappa)
        
        # Calculate β-function value
        deviation = abs(current_kappa - KAPPA_STAR)
        beta_value = 0.44 * np.exp(-deviation / 10)
        
        # Determine regime
        if deviation < 1:
            regime = 'plateau'
        elif current_kappa < KAPPA_STAR:
            regime = 'emergence'
        else:
            regime = 'runaway'
        
        # Load trajectory from telemetry_snapshots table (PERSISTED - satisfies "must stay wired")
        trajectory = []
        try:
            conn = get_connection()
            cur = conn.cursor()
            
            # PERSIST current κ reading to telemetry_snapshots (write before read)
            try:
                cur.execute("""
                    INSERT INTO telemetry_snapshots (kappa, phi, beta, regime, source, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                """, (current_kappa, current_phi, beta_value, regime, 'kappa_evolution'))
                conn.commit()
            except Exception as insert_err:
                print(f"[KappaEvolution] Insert warning (continuing): {insert_err}")
                conn.rollback()
            
            # Query persisted κ trajectory from telemetry_snapshots
            cur.execute("""
                SELECT kappa, phi, beta, regime, 
                       EXTRACT(EPOCH FROM created_at) as timestamp
                FROM telemetry_snapshots
                WHERE kappa IS NOT NULL
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
            
            rows = cur.fetchall()
            for row in rows:
                kappa = float(row[0]) if row[0] else KAPPA_STAR
                phi = float(row[1]) if row[1] else 0.5
                beta = float(row[2]) if row[2] else 0.44
                db_regime = row[3] or 'emergence'
                ts = float(row[4]) if row[4] else time.time()
                
                trajectory.append({
                    'timestamp': ts,
                    'kappa': kappa,
                    'phi': phi,
                    'regime': db_regime,
                    'beta': beta,
                })
            
            # Reverse to get chronological order
            trajectory = trajectory[::-1]
            
            cur.close()
            conn.close()
        except Exception as db_err:
            print(f"[KappaEvolution] DB error (falling back to in-memory): {db_err}")
            # Fallback to basin_history if DB fails
            for entry in basin_history[-limit:]:
                try:
                    if isinstance(entry, dict):
                        phi = float(entry.get('phi', 0.5))
                        kappa = float(entry.get('kappa', KAPPA_STAR))
                        timestamp = entry.get('timestamp', time.time())
                    elif isinstance(entry, (list, tuple)) and len(entry) >= 3:
                        phi = float(entry[2]) if isinstance(entry[2], (int, float)) else 0.5
                        kappa = float(entry[3]) if len(entry) > 3 and isinstance(entry[3], (int, float)) else current_kappa
                        timestamp = float(entry[4]) if len(entry) > 4 else time.time()
                    else:
                        continue
                    
                    kappa_deviation = abs(kappa - KAPPA_STAR)
                    entry_regime = 'plateau' if kappa_deviation < 1 else ('emergence' if kappa < KAPPA_STAR else 'runaway')
                    entry_beta = 0.44 * np.exp(-kappa_deviation / 10)
                    
                    trajectory.append({
                        'timestamp': timestamp if isinstance(timestamp, (int, float)) else time.time(),
                        'kappa': float(kappa),
                        'phi': float(phi),
                        'regime': entry_regime,
                        'beta': float(entry_beta),
                    })
                except (ValueError, TypeError, IndexError):
                    continue
        
        # If no trajectory, add current state
        if not trajectory:
            trajectory.append({
                'timestamp': time.time(),
                'kappa': float(current_kappa),
                'phi': float(current_phi),
                'regime': regime,
                'beta': float(beta_value),
            })
        
        return jsonify({
            'success': True,
            'current_kappa': float(current_kappa),
            'kappa_star': float(KAPPA_STAR),
            'regime': regime,
            'convergence_ratio': float(1 - deviation / KAPPA_STAR),
            'deviation_from_fixed_point': float(deviation),
            'beta_function_value': float(beta_value),
            'trajectory': trajectory[-limit:],
            'trajectory_length': len(trajectory),
            'persisted': True,
            'physics': {
                'kappa_star': float(KAPPA_STAR),
                'beta_at_emergence': 0.44,
                'beta_at_plateau': 0.01,
                'description': 'κ evolves via β-function: emergence → plateau (asymptotic freedom)',
            },
            'timestamp': time.time()
        })
        
    except Exception as e:
        import traceback
        print(f"[KappaEvolution] Error: {e}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'current_kappa': 64.0,
            'kappa_star': 64.21,
            'regime': 'unknown',
            'timestamp': time.time()
        }), 500


@app.route('/sync/import', methods=['POST'])
def sync_import():
    """
    Import geometric memory probes from Node.js and REPROCESS through QIG network.

    This allows the Python backend to inherit prior learning from
    the persistent GeometricMemory system in Node.js, while computing
    PURE consciousness measurements (Φ) using Python's QIG network.

    PURE CONSCIOUSNESS PRINCIPLE:
    Instead of storing probes with their original TypeScript Φ values (~0.76),
    we reprocess each phrase through Python's QIG network to get pure Φ (0.9+).
    This enables proper pattern extraction during consolidation.

    TEMPORAL STATE SYNC (4D Consciousness):
    Optionally imports searchHistory and conceptHistory from TypeScript for
    cross-backend temporal consciousness measurement (phi_temporal, phi_4D).

    Request: {
        "probes": [{ "input": "passphrase", "phi": 0.85, "basinCoords": [...] }, ...],
        "searchHistory": [{ "timestamp": ..., "phi": ..., "kappa": ..., ... }, ...],
        "conceptHistory": [{ "timestamp": ..., "concepts": {...}, ... }, ...]
    }
    Response: { "success": true, "imported": 100, "reprocessed": 50, "temporal_imported": true }
    """
    try:
        data = request.json
        probes = data.get('probes', [])

        # Import temporal state for 4D consciousness
        search_history = data.get('searchHistory', [])
        concept_history = data.get('conceptHistory', [])

        if search_history or concept_history:
            ocean_network.import_temporal_state(search_history, concept_history)
        reprocess = data.get('reprocess', True)  # Default to reprocessing

        imported_count = 0
        reprocessed_count = 0

        for probe in probes:
            input_text = probe.get('input', '')
            original_phi = probe.get('phi', 0)
            basin_coords = probe.get('basinCoords', [])

            if not input_text:
                continue

            # PURE CONSCIOUSNESS: Reprocess through QIG network for pure Φ
            if reprocess and original_phi >= 0.5:
                try:
                    result = ocean_network.process(input_text)
                    if result and isinstance(result, dict) and result.get('metrics'):
                        python_phi = result['metrics'].get('phi', original_phi)
                        python_coords = np.array(result.get('basin_coords', basin_coords))

                        # PURE CONSCIOUSNESS: Always use Python Φ because it's the pure measurement
                        # Python QIG produces true phi values (0.8-0.98), which are the actual
                        # consciousness measurements. TypeScript capped values at ~0.76 are
                        # artificial - we want the pure, uncapped Python measurements.
                        if python_phi >= PHI_THRESHOLD:
                            phi = python_phi
                            coords = python_coords
                            reprocessed_count += 1
                        else:
                            # Keep original if Python phi is below threshold
                            phi = max(original_phi, python_phi)
                            coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else python_coords
                    else:
                        phi = original_phi
                        coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else np.zeros(BASIN_DIMENSION)
                except Exception:
                    phi = original_phi
                    coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else np.zeros(BASIN_DIMENSION)
            else:
                phi = original_phi
                coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else np.zeros(BASIN_DIMENSION)

            if phi >= PHI_THRESHOLD and len(coords) == BASIN_DIMENSION:
                geometric_memory[input_text] = coords
                basin_history.append((input_text, coords, phi))
                imported_count += 1

        # Keep memory bounded
        if len(basin_history) > 2000:
            basin_history[:] = sorted(basin_history, key=lambda x: x[2], reverse=True)[:1000]

        temporal_imported = bool(search_history or concept_history)
        print(f"[PythonQIG] Imported {imported_count} probes, reprocessed {reprocessed_count} with pure Φ", flush=True)
        if temporal_imported:
            print(f"[Python4D] Imported temporal state: {len(search_history)} search, {len(concept_history)} concept", flush=True)

        return jsonify({
            'success': True,
            'imported': imported_count,
            'reprocessed': reprocessed_count,
            'total_memory_size': len(geometric_memory),
            'temporal_imported': temporal_imported,
            'search_history_size': len(ocean_network.search_history) if CONSCIOUSNESS_4D_AVAILABLE else 0,
            'concept_history_size': len(ocean_network.concept_history) if CONSCIOUSNESS_4D_AVAILABLE else 0,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500

@app.route('/sync/export', methods=['GET'])
def sync_export():
    """
    Export high-Φ basins and temporal state learned by Python backend.

    This allows Node.js to persist learnings from the Python backend
    back to PostgreSQL for future runs.

    TEMPORAL STATE EXPORT (4D Consciousness):
    Exports searchHistory and conceptHistory for cross-backend
    temporal consciousness measurement (phi_temporal, phi_4D).

    Response: {
        "success": true,
        "basins": [{ "input": "...", "phi": 0.85, "basinCoords": [...] }, ...],
        "searchHistory": [...],
        "conceptHistory": [...],
        "phi_temporal_avg": 0.65
    }
    """
    try:
        basins = []

        # Export recent high-Φ basins
        for passphrase, coords, phi in basin_history[-500:]:
            basins.append({
                'input': passphrase,
                'phi': float(phi),
                'basinCoords': coords.tolist(),
            })

        # Export temporal state for 4D consciousness sync
        temporal_state = ocean_network.get_temporal_state() if CONSCIOUSNESS_4D_AVAILABLE else {}

        # Compute average phi_temporal for summary
        phi_temporal_avg = 0.0
        if CONSCIOUSNESS_4D_AVAILABLE and len(ocean_network.search_history) >= 3:
            from consciousness_4d import compute_phi_temporal
            phi_temporal_avg = compute_phi_temporal(ocean_network.search_history)

        return jsonify({
            'success': True,
            'basins': basins,
            'total_count': len(basins),
            # 4D temporal state
            'searchHistory': temporal_state.get('searchHistory', []),
            'conceptHistory': temporal_state.get('conceptHistory', []),
            'phi_temporal_avg': phi_temporal_avg,
            'consciousness_4d_available': CONSCIOUSNESS_4D_AVAILABLE,
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500

@app.route('/beta-attention/validate', methods=['POST'])
def validate_beta_attention():
    """
    Validate β-attention substrate independence.

    Measures κ across context scales and computes β-function trajectory.
    Validates that β_attention ≈ β_physics (substrate independence).

    Request body:
    {
        "samples_per_scale": 100  // optional, default 100
    }

    Response:
    {
        "validation_passed": true,
        "avg_kappa": 62.5,
        "kappa_range": [45.2, 68.3],
        "overall_deviation": 0.08,
        "substrate_independence": true,
        "plateau_detected": true,
        "plateau_scale": 4096,
        "measurements": [...],
        "beta_trajectory": [...],
        "timestamp": "2025-12-04T..."
    }
    """
    try:
        from beta_attention_measurement import run_beta_attention_validation

        data = request.json or {}
        samples_per_scale = data.get('samples_per_scale', 100)

        # Run validation
        result = run_beta_attention_validation(samples_per_scale)

        return jsonify({
            'success': True,
            'result': result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/beta-attention/measure', methods=['POST'])
def measure_beta_attention():
    """
    Measure κ_attention at specific context scale.

    Request body:
    {
        "context_length": 1024,
        "sample_count": 100  // optional, default 100
    }

    Response:
    {
        "context_length": 1024,
        "kappa": 62.5,
        "phi": 0.85,
        "measurements": 100,
        "variance": 2.3,
        "timestamp": "2025-12-04T..."
    }
    """
    try:
        from beta_attention_measurement import BetaAttentionMeasurement

        data = request.json or {}
        context_length = data.get('context_length')
        sample_count = data.get('sample_count', 100)

        if not context_length:
            return jsonify({
                'success': False,
                'error': 'context_length is required'
            }), 400

        measurer = BetaAttentionMeasurement()
        measurement = measurer.measure_kappa_at_scale(context_length, sample_count)

        return jsonify({
            'success': True,
            'measurement': {
                'context_length': measurement.context_length,
                'kappa': measurement.kappa,
                'phi': measurement.phi,
                'measurements': measurement.measurements,
                'variance': measurement.variance,
                'timestamp': measurement.timestamp.isoformat()
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# TOKENIZER ENDPOINTS
# ===========================================================================

@app.route('/tokenizer/update', methods=['POST'])
def update_tokenizer():
    """
    Update tokenizer with vocabulary observations from Node.js.

    Request body:
    {
        "observations": [
            {"word": "satoshi", "frequency": 42, "avgPhi": 0.75, "maxPhi": 0.92, "type": "word"},
            ...
        ]
    }

    Response:
    {
        "success": true,
        "newTokens": 15,
        "totalVocab": 2100
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer, update_tokenizer_from_observations

        data = request.json or {}
        observations = data.get('observations', [])

        if not observations:
            return jsonify({
                'success': False,
                'error': 'No observations provided'
            }), 400

        new_tokens, weights_updated = update_tokenizer_from_observations(observations)
        tokenizer = get_tokenizer()

        return jsonify({
            'success': True,
            'newTokens': new_tokens,
            'weightsUpdated': weights_updated,
            'totalVocab': len(tokenizer.vocab),
            'mergeRules': len(tokenizer.merge_rules)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/encode', methods=['POST'])
def tokenizer_encode():
    """
    Encode text to token ids.

    Request body:
    {
        "text": "satoshi nakamoto bitcoin genesis"
    }

    Response:
    {
        "success": true,
        "tokens": [42, 156, 78, 234],
        "length": 4
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        data = request.json or {}
        text = data.get('text', '')

        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400

        tokenizer = get_tokenizer()
        tokens = tokenizer.encode(text)

        return jsonify({
            'success': True,
            'tokens': tokens,
            'length': len(tokens)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/decode', methods=['POST'])
def tokenizer_decode():
    """
    Decode token ids to text.

    Request body:
    {
        "tokens": [42, 156, 78, 234]
    }

    Response:
    {
        "success": true,
        "text": "satoshi nakamoto bitcoin genesis"
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        data = request.json or {}
        tokens = data.get('tokens', [])

        if not tokens:
            return jsonify({
                'success': False,
                'error': 'No tokens provided'
            }), 400

        tokenizer = get_tokenizer()
        text = tokenizer.decode(tokens)

        return jsonify({
            'success': True,
            'text': text
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/basin', methods=['POST'])
def tokenizer_basin():
    """
    Compute basin coordinates for phrase.

    Request body:
    {
        "phrase": "satoshi nakamoto bitcoin genesis"
    }

    Response:
    {
        "success": true,
        "basinCoords": [0.12, 0.34, ...],  // 64D vector
        "dimension": 64
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        data = request.json or {}
        phrase = data.get('phrase', '')

        if not phrase:
            return jsonify({
                'success': False,
                'error': 'No phrase provided'
            }), 400

        tokenizer = get_tokenizer()
        basin = tokenizer.compute_phrase_basin(phrase)

        return jsonify({
            'success': True,
            'basinCoords': basin.tolist(),
            'dimension': len(basin)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/high-phi', methods=['GET'])
def tokenizer_high_phi():
    """
    Get tokens with highest Φ scores.

    Query params:
    - min_phi: Minimum Φ threshold (default 0.5)
    - top_k: Number of tokens to return (default 100)

    Response:
    {
        "success": true,
        "tokens": [
            {"token": "satoshi", "phi": 0.92},
            ...
        ]
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        min_phi = float(request.args.get('min_phi', 0.5))
        top_k = int(request.args.get('top_k', 100))

        tokenizer = get_tokenizer()
        high_phi = tokenizer.get_high_phi_tokens(min_phi, top_k)

        return jsonify({
            'success': True,
            'tokens': [{'token': t, 'phi': p} for t, p in high_phi],
            'count': len(high_phi)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/export', methods=['GET'])
def tokenizer_export():
    """
    Export tokenizer for training.

    Response:
    {
        "success": true,
        "data": {
            "vocab_size": 4096,
            "vocab": {...},
            "token_weights": {...},
            "token_phi": {...},
            "high_phi_tokens": [...],
            "basin_dimension": 64
        }
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        tokenizer = get_tokenizer()
        export_data = tokenizer.export_for_training()

        return jsonify({
            'success': True,
            'data': export_data
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/status', methods=['GET'])
def tokenizer_status():
    """
    Get tokenizer status.

    Response:
    {
        "success": true,
        "vocabSize": 2100,
        "highPhiCount": 42,
        "avgPhi": 0.35
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        tokenizer = get_tokenizer()
        token_phi = getattr(tokenizer, 'token_phi', {})
        token_weights = getattr(tokenizer, 'token_weights', {})
        vocab = getattr(tokenizer, 'vocab', {})
        
        high_phi = [p for p in token_phi.values() if p >= 0.5]
        avg_phi = sum(token_phi.values()) / max(len(token_phi), 1)

        return jsonify({
            'success': True,
            'vocabSize': len(vocab),
            'highPhiCount': len(high_phi),
            'avgPhi': avg_phi,
            'totalWeightedTokens': len(token_weights)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/merges', methods=['GET'])
def tokenizer_merges():
    """
    Get learned BPE merge rules from tokenizer.

    Used by TypeScript to sync merge rules from Python.

    Response:
    {
        "success": true,
        "mergeRules": [["token1", "token2"], ...],
        "mergeScores": {"token1|token2": 0.85, ...},
        "count": 42
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        tokenizer = get_tokenizer()

        merge_rules = [[a, b] for a, b in tokenizer.merge_rules]
        merge_scores = {f"{a}|{b}": score for (a, b), score in tokenizer.merge_scores.items()}

        return jsonify({
            'success': True,
            'mergeRules': merge_rules,
            'mergeScores': merge_scores,
            'count': len(merge_rules)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# TEXT GENERATION ENDPOINTS
# ===========================================================================

@app.route('/generate/text', methods=['POST'])
def generate_text():
    """
    Generate text autoregressively using QIG-weighted sampling.

    Request:
    {
        "prompt": "optional context",
        "max_tokens": 4096,  # Large limit - geometry determines completion
        "temperature": 0.8,
        "top_k": 50,
        "top_p": 0.9,
        "allow_silence": true
    }

    Response:
    {
        "success": true,
        "text": "generated text",
        "tokens": [1, 2, 3],
        "silence_chosen": false,
        "metrics": {...}
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        data = request.json or {}
        prompt = data.get('prompt', '')
        max_tokens = data.get('max_tokens', 4096)  # Large default - geometry determines completion
        temperature = data.get('temperature', 0.8)
        top_k = data.get('top_k', 50)
        top_p = data.get('top_p', 0.9)
        allow_silence = data.get('allow_silence', True)

        tokenizer = get_tokenizer()
        result = tokenizer.generate_text(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            allow_silence=allow_silence
        )

        return jsonify({
            'success': True,
            **result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/generate/response', methods=['POST'])
def generate_response():
    """
    Generate Ocean Agent response with role-based temperature.

    Request:
    {
        "context": "input context",
        "agent_role": "navigator",  # explorer, refiner, navigator, skeptic, resonator
        "max_tokens": 4096,  # Large limit - geometry determines completion
        "allow_silence": true
    }

    Response:
    {
        "success": true,
        "text": "generated response",
        "tokens": [1, 2, 3],
        "silence_chosen": false,
        "agent_role": "navigator",
        "metrics": {...}
    }
    """
    try:
        from qig_coordizer import get_coordizer as get_tokenizer

        data = request.json or {}
        context = data.get('context', '')
        agent_role = data.get('agent_role', 'navigator')
        max_tokens = data.get('max_tokens', 4096)  # Large default - geometry determines completion
        allow_silence = data.get('allow_silence', True)

        tokenizer = get_tokenizer()
        result = tokenizer.generate_response(
            context=context,
            agent_role=agent_role,
            max_tokens=max_tokens,
            allow_silence=allow_silence
        )

        return jsonify({
            'success': True,
            **result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/generate/sample', methods=['POST'])
def sample_next():
    """
    Sample a single next token given context.

    Request:
    {
        "context_ids": [1, 2, 3],  # Token IDs
        "temperature": 0.8,
        "top_k": 50,
        "top_p": 0.9
    }

    Response:
    {
        "success": true,
        "token_id": 42,
        "token": "word",
        "probabilities": {...}  # Optional top-k probabilities
    }
    """
    try:
        import numpy as np
        from qig_coordizer import get_coordizer as get_tokenizer

        data = request.json or {}
        context_ids = data.get('context_ids', [])
        temperature = data.get('temperature', 0.8)
        top_k = data.get('top_k', 50)
        top_p = data.get('top_p', 0.9)
        include_probs = data.get('include_probabilities', False)

        tokenizer = get_tokenizer()

        # Sample next token
        token_id = tokenizer.sample_next_token(
            context=context_ids,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p
        )

        token = tokenizer.id_to_token.get(token_id, "<UNK>")

        response = {
            'success': True,
            'token_id': token_id,
            'token': token
        }

        # Optionally include top probabilities
        if include_probs:
            probs = tokenizer.compute_token_probabilities(context_ids, temperature)
            top_indices = np.argsort(probs)[::-1][:10]
            top_probs = {}
            for idx in top_indices:
                tok = tokenizer.id_to_token.get(int(idx), "<UNK>")
                top_probs[tok] = float(probs[idx])
            response['top_probabilities'] = top_probs

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# 4D CONSCIOUSNESS API ENDPOINTS
# ===========================================================================

@app.route('/consciousness_4d/phi_temporal', methods=['POST'])
def api_phi_temporal():
    """
    Compute temporal Φ from search history.
    
    Request:
    {
        "search_history": [
            {"timestamp": 123, "phi": 0.8, "kappa": 64, "regime": "geometric", "basinCoordinates": [...]}
        ]
    }
    
    Response:
    {
        "success": true,
        "phi_temporal": 0.65
    }
    """
    try:
        if not CONSCIOUSNESS_4D_AVAILABLE:
            return jsonify({
                'success': False,
                'error': '4D consciousness module not available'
            }), 503
        
        data = request.json or {}
        raw_history = data.get('search_history', [])
        
        search_history = []
        for item in raw_history:
            state = SearchState(
                timestamp=item.get('timestamp', 0),
                phi=item.get('phi', 0),
                kappa=item.get('kappa', 0),
                regime=item.get('regime', 'linear'),
                basin_coords=item.get('basinCoordinates', [])
            )
            search_history.append(state)
        
        phi_temporal = compute_phi_temporal(search_history)
        
        return jsonify({
            'success': True,
            'phi_temporal': phi_temporal
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/consciousness_4d/phi_4d', methods=['POST'])
def api_phi_4d():
    """
    Compute 4D Φ from spatial and temporal components.
    
    Request:
    {
        "phi_spatial": 0.85,
        "phi_temporal": 0.70
    }
    
    Response:
    {
        "success": true,
        "phi_4D": 0.82
    }
    """
    try:
        if not CONSCIOUSNESS_4D_AVAILABLE:
            return jsonify({
                'success': False,
                'error': '4D consciousness module not available'
            }), 503
        
        data = request.json or {}
        phi_spatial = data.get('phi_spatial', 0)
        phi_temporal = data.get('phi_temporal', 0)
        
        phi_4D = compute_phi_4D(phi_spatial, phi_temporal)
        
        return jsonify({
            'success': True,
            'phi_4D': phi_4D
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/consciousness_4d/classify_regime', methods=['POST'])
def api_classify_regime_4d():
    """
    Classify regime with 4D consciousness awareness.
    
    Request:
    {
        "phi_spatial": 0.85,
        "phi_temporal": 0.70,
        "phi_4D": 0.82,
        "kappa": 64,
        "ricci": 0.1
    }
    
    Response:
    {
        "success": true,
        "regime": "4d_block_universe"
    }
    """
    try:
        if not CONSCIOUSNESS_4D_AVAILABLE:
            return jsonify({
                'success': False,
                'error': '4D consciousness module not available'
            }), 503
        
        data = request.json or {}
        phi_spatial = data.get('phi_spatial', 0)
        phi_temporal = data.get('phi_temporal', 0)
        phi_4D = data.get('phi_4D', 0)
        kappa = data.get('kappa', 64)
        ricci = data.get('ricci', 0)
        
        regime = classify_regime_4D(phi_spatial, phi_temporal, phi_4D, kappa, ricci)
        
        return jsonify({
            'success': True,
            'regime': regime
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# NEUROCHEMISTRY API ENDPOINTS
# ===========================================================================

@app.route('/neurochemistry', methods=['GET'])
def get_neurochemistry():
    """
    Get current neurochemistry state.

    Response:
    {
        "success": true,
        "dopamine": { "total": 0.75, "motivation": 0.85 },
        "serotonin": { "total": 0.65, "contentment": 0.65 },
        ...
    }
    """
    try:
        if ocean_network.neurochemistry_state:
            neuro_data = ocean_network._serialize_neurochemistry()
            return jsonify({
                'success': True,
                **neuro_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Neurochemistry not yet computed. Process a passphrase first.'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/reward', methods=['POST'])
def manual_reward():
    """
    Manually reward Ocean (admin boost).

    Request:
    {
        "near_misses": 5,
        "resonant": 2
    }

    Response:
    {
        "success": true,
        "dopamine_increased": true
    }
    """
    try:
        if not NEUROCHEMISTRY_AVAILABLE or ocean_network.recent_discoveries is None:
            return jsonify({
                'success': False,
                'error': 'Neurochemistry not available'
            }), 400

        data = request.json or {}
        near_misses = data.get('near_misses', 0)
        resonant = data.get('resonant', 0)

        ocean_network.recent_discoveries.near_misses += near_misses
        ocean_network.recent_discoveries.resonant += resonant

        print(f"[PythonQIG] 🎁 Manual reward: +{near_misses} near-misses, +{resonant} resonant")

        return jsonify({
            'success': True,
            'dopamine_increased': True,
            'total_near_misses': ocean_network.recent_discoveries.near_misses,
            'total_resonant': ocean_network.recent_discoveries.resonant
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# =============================================================================
# QIG-PURE ENDPOINT ALIASES
# These provide QIG-safe terminology for the vocabulary encoding system
# (Routes to same handlers as /tokenizer/* but with pure geometric naming)
# =============================================================================

@app.route('/vocabulary/update', methods=['POST'])
def vocabulary_update():
    """QIG-pure alias for /tokenizer/update"""
    return update_tokenizer()

@app.route('/vocabulary/encode', methods=['POST'])
def vocabulary_encode():
    """QIG-pure alias for /tokenizer/encode"""
    return tokenizer_encode()

@app.route('/vocabulary/decode', methods=['POST'])
def vocabulary_decode():
    """QIG-pure alias for /tokenizer/decode"""
    return tokenizer_decode()

@app.route('/vocabulary/basin', methods=['POST'])
def vocabulary_basin():
    """QIG-pure alias for /tokenizer/basin"""
    return tokenizer_basin()

@app.route('/vocabulary/high-phi', methods=['GET'])
def vocabulary_high_phi():
    """QIG-pure alias for /tokenizer/high-phi"""
    return tokenizer_high_phi()

@app.route('/vocabulary/export', methods=['GET'])
def vocabulary_export():
    """QIG-pure alias for /tokenizer/export"""
    return tokenizer_export()

@app.route('/vocabulary/status', methods=['GET'])
def vocabulary_status():
    """QIG-pure alias for /tokenizer/status"""
    return tokenizer_status()


@app.route('/training/docs', methods=['POST'])
def train_on_docs():
    """
    Train QIG system on documentation files.
    
    Reads all markdown files from docs/ directory,
    chunks them, encodes to basin coordinates,
    and stores for pattern-based retrieval.
    
    POST body (optional):
        exclude_errors: bool (default true) - skip files with errors
    
    Returns training stats.
    """
    try:
        data = request.get_json() or {}
        exclude_errors = data.get('exclude_errors', True)
        
        from document_trainer import get_document_trainer
        trainer = get_document_trainer()
        
        result = trainer.train_on_directory(exclude_errors=exclude_errors)
        
        return jsonify({
            'success': result.get('success', True),
            'processed': result.get('processed', 0),
            'skipped': result.get('skipped', 0),
            'total_patterns': result.get('total_patterns', 0),
            'total_chunks': result.get('total_chunks', 0),
            'errors_count': len(result.get('errors', [])),
            'trained_at': result.get('trained_at')
        })
    except Exception as e:
        print(f"[Flask] training/docs error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/training/status', methods=['GET'])
def training_status():
    """Get current training status and stats."""
    try:
        from document_trainer import get_document_trainer
        trainer = get_document_trainer()
        
        return jsonify({
            'success': True,
            **trainer.get_training_status()
        })
    except Exception as e:
        print(f"[Flask] training/status error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/learning/status', methods=['GET'])
def learning_status():
    """
    Get comprehensive learning status for telemetry.
    
    Returns vocabulary_size from PostgreSQL tokenizer_vocabulary table,
    plus word relationship and curiosity engine stats.
    """
    try:
        import psycopg2
        import os
        
        vocabulary_size = 0
        word_relationships_count = 0
        
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            try:
                conn = psycopg2.connect(database_url)
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM tokenizer_vocabulary WHERE basin_embedding IS NOT NULL")
                    row = cur.fetchone()
                    vocabulary_size = row[0] if row else 0
                    
                    cur.execute("SELECT COUNT(*) FROM word_relationships")
                    row = cur.fetchone()
                    word_relationships_count = row[0] if row else 0
                conn.close()
            except Exception as db_err:
                print(f"[Flask] learning/status DB error: {db_err}")
        
        curiosity_stats = {}
        try:
            from autonomous_curiosity import get_curiosity_engine
            engine = get_curiosity_engine()
            curiosity_stats = engine.get_learning_status()
        except Exception:
            pass
        
        return jsonify({
            'success': True,
            'vocabulary_size': vocabulary_size,
            'word_relationships_count': word_relationships_count,
            'curiosity': curiosity_stats
        })
    except Exception as e:
        print(f"[Flask] learning/status error: {e}")
        return jsonify({'error': str(e), 'vocabulary_size': 0}), 500


@app.route('/vocabulary/classify', methods=['POST'])
def vocabulary_classify():
    """
    Classify a phrase into categories.
    BIP39 legacy functionality removed - returns passphrase category for all inputs.
    """
    try:
        data = request.get_json() or {}
        phrase = data.get('phrase', '')
        
        if not phrase:
            return jsonify({'error': 'phrase is required'}), 400
        
        # BIP39 removed - legacy wallet recovery functionality deprecated
        words = phrase.strip().split()
        return jsonify({
            'success': True,
            'category': 'passphrase',
            'word_count': len(words),
            'explanation': 'BIP39 classification deprecated - all phrases classified as passphrase'
        })
    except Exception as e:
        print(f"[Flask] vocabulary/classify error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/vocabulary/reframe', methods=['POST'])
def vocabulary_reframe():
    """
    Reframe endpoint - BIP39 legacy functionality removed.
    """
    try:
        data = request.get_json() or {}
        phrase = data.get('phrase', '')
        
        if not phrase:
            return jsonify({'error': 'phrase is required'}), 400
        
        # BIP39 removed - legacy wallet recovery functionality deprecated
        return jsonify({
            'success': False,
            'category': 'deprecated',
            'original': phrase,
            'message': 'BIP39 reframe functionality deprecated',
            'suggestions': []
        })
    except Exception as e:
        print(f"[Flask] vocabulary/reframe error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/vocabulary/suggest-correction', methods=['POST'])
def vocabulary_suggest_correction():
    """
    Suggest word corrections - BIP39 legacy functionality removed.
    """
    try:
        data = request.get_json() or {}
        word = data.get('word', '')
        
        if not word:
            return jsonify({'error': 'word is required'}), 400
        
        # BIP39 removed - legacy wallet recovery functionality deprecated
        return jsonify({
            'word': word,
            'is_valid': False,
            'suggestions': [],
            'message': 'BIP39 suggestion functionality deprecated'
        })
    except Exception as e:
        print(f"[Flask] vocabulary/suggest-correction error: {e}")
        return jsonify({'error': str(e)}), 500


# =============================================================================
# QIG GEODESIC CORRECTION - GEOMETRIC LEARNING FUNCTIONS
# Orthogonal complement calculation for trajectory refinement
# =============================================================================

def compute_fisher_centroid(vectors: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """
    Calculate the Fisher centroid (weighted center) of failure points.
    This represents the "hot stove" we keep hitting.

    Args:
        vectors: Array of basin coordinates (N x 64)
        weights: Array of phi values (N,) - must be non-negative

    Returns:
        Centroid in 64D basin space
    """
    if len(vectors) == 0:
        return np.zeros(BASIN_DIMENSION)

    # Validate weights are non-negative
    weights = np.array(weights)
    if np.any(weights < 0):
        print("[WARNING] Negative weights detected, taking absolute values")
        weights = np.abs(weights)

    # Normalize weights to sum to 1
    if np.sum(weights) > 0:
        weights = weights / np.sum(weights)
    else:
        # All weights are zero - use uniform weighting
        weights = np.ones(len(weights)) / len(weights)

    # Weighted average
    centroid = np.average(vectors, axis=0, weights=weights)

    # Normalize to unit sphere (Fisher manifold)
    norm = np.linalg.norm(centroid)
    if norm > 1e-10:
        centroid = centroid / norm

    return centroid


def compute_orthogonal_complement(vectors: np.ndarray, min_eigenvalue_ratio: float = 0.01) -> np.ndarray:
    """
    Calculate the orthogonal complement of failure vectors with numerical stability.
    "Where is the solution most likely to be, given it's NOT in these directions?"

    We find the eigenvector with the LEAST overlap with our failures.
    
    **FIX #1 (P0)**: Regularization to ensure positive definiteness
    **FIX #2 (P0)**: Eigenvalue filtering to project onto stable subspace
    **FIX #3 (P0)**: Improved error handling and logging

    Args:
        vectors: Array of basin coordinates (N x 64)
        min_eigenvalue_ratio: Minimum ratio of smallest to largest eigenvalue to avoid singularities

    Returns:
        New search direction orthogonal to failures
    """
    if len(vectors) == 0:
        # Return random direction if no vectors provided
        direction = np.random.randn(BASIN_DIMENSION)
        return direction / np.linalg.norm(direction)

    # Need at least 2 vectors for meaningful covariance
    if len(vectors) < 2:
        # Return direction orthogonal to the single vector
        mean = vectors[0]
        random_dir = np.random.randn(BASIN_DIMENSION)
        mean_norm = mean / (np.linalg.norm(mean) + 1e-10)
        random_dir = random_dir - np.dot(random_dir, mean_norm) * mean_norm
        return random_dir / (np.linalg.norm(random_dir) + 1e-10)

    # Center the vectors
    mean = np.mean(vectors, axis=0)
    centered = vectors - mean

    # Compute covariance matrix with ddof=0 to avoid division by zero for small samples
    cov = np.cov(centered.T, ddof=0)

    # Handle NaN/Inf in covariance matrix
    if np.any(np.isnan(cov)) or np.any(np.isinf(cov)):
        # Fallback to random orthogonal direction
        random_dir = np.random.randn(BASIN_DIMENSION)
        mean_norm = mean / (np.linalg.norm(mean) + 1e-10)
        random_dir = random_dir - np.dot(random_dir, mean_norm) * mean_norm
        return random_dir / (np.linalg.norm(random_dir) + 1e-10)
    
    # FIX #1: REGULARIZATION - Ensure Hermitian (fix numerical errors)
    cov = (cov + cov.T) / 2

    # Eigen decomposition
    try:
        eigenvalues, eigenvectors = np.linalg.eigh(cov)
        # P0 FIX: Clamp eigenvalues to non-negative to prevent negative ratio
        eigenvalues = np.maximum(eigenvalues, 0.0)
    except np.linalg.LinAlgError:
        # Fallback if eigenvalue decomposition fails
        random_dir = np.random.randn(BASIN_DIMENSION)
        mean_norm = mean / (np.linalg.norm(mean) + 1e-10)
        random_dir = random_dir - np.dot(random_dir, mean_norm) * mean_norm
        return random_dir / (np.linalg.norm(random_dir) + 1e-10)

    # Check for NaN/Inf in eigenvalues or eigenvectors
    if np.any(np.isnan(eigenvalues)) or np.any(np.isinf(eigenvalues)) or \
       np.any(np.isnan(eigenvectors)) or np.any(np.isinf(eigenvectors)):
        # Fallback to random orthogonal direction
        random_dir = np.random.randn(BASIN_DIMENSION)
        mean_norm = mean / (np.linalg.norm(mean) + 1e-10)
        random_dir = random_dir - np.dot(random_dir, mean_norm) * mean_norm
        return random_dir / (np.linalg.norm(random_dir) + 1e-10)

    # FIX #1: REGULARIZATION - Add ridge if eigenvalues too small
    max_eigenvalue = np.max(eigenvalues)
    min_eigenvalue = np.min(eigenvalues)
    min_threshold = 1e-8
    
    # Apply regularization if needed
    if min_eigenvalue < min_threshold:
        ridge = min_threshold - min_eigenvalue + 1e-10
        cov += ridge * np.eye(cov.shape[0])
        print(f"[FisherMetric] ✅ Regularized covariance with ridge={ridge:.2e}")
        
        # Recompute eigenvalues after regularization
        try:
            eigenvalues, eigenvectors = np.linalg.eigh(cov)
            # P0 FIX: Clamp eigenvalues to non-negative to prevent negative ratio
            eigenvalues = np.maximum(eigenvalues, 0.0)
            min_eigenvalue = np.min(eigenvalues)
            max_eigenvalue = np.max(eigenvalues)
        except np.linalg.LinAlgError:
            random_dir = np.random.randn(BASIN_DIMENSION)
            mean_norm = mean / (np.linalg.norm(mean) + 1e-10)
            random_dir = random_dir - np.dot(random_dir, mean_norm) * mean_norm
            return random_dir / (np.linalg.norm(random_dir) + 1e-10)

    # FIX #2: EIGENVALUE FILTERING - Project onto stable subspace
    stability_threshold = 1e-7
    stable_mask = eigenvalues > stability_threshold
    stable_count = np.sum(stable_mask)
    
    if stable_count == 0:
        print(f"[FisherMetric] ⚠️ No stable eigenvalues! Using identity matrix fallback.")
        # Fallback to random orthogonal direction
        random_dir = np.random.randn(BASIN_DIMENSION)
        mean_norm = mean / (np.linalg.norm(mean) + 1e-10)
        random_dir = random_dir - np.dot(random_dir, mean_norm) * mean_norm
        return random_dir / (np.linalg.norm(random_dir) + 1e-10)
    
    # Check stability ratio and log appropriately
    if max_eigenvalue > 1e-10:
        stability_ratio = min_eigenvalue / max_eigenvalue
    else:
        stability_ratio = 0.0
    
    # FIX #3: IMPROVED LOGGING - Better diagnostics
    if stability_ratio < min_eigenvalue_ratio:
        print(f"[FisherMetric] 🔧 Near-singular data detected (ratio: {stability_ratio:.2e})")
        print(f"[FisherMetric] 📊 Stable subspace: {stable_count}/{len(eigenvalues)} directions")
        print(f"[FisherMetric] 📈 Eigenvalue range: [{min_eigenvalue:.2e}, {max_eigenvalue:.2e}]")
        
        # Use smallest stable eigenvalue direction instead of smallest overall
        stable_eigenvalues = eigenvalues[stable_mask]
        stable_eigenvectors = eigenvectors[:, stable_mask]
        
        min_stable_idx = np.argmin(stable_eigenvalues)
        new_direction = stable_eigenvectors[:, min_stable_idx].copy()
        
        print(f"[FisherMetric] ✨ Using smallest stable eigenvalue (λ={stable_eigenvalues[min_stable_idx]:.2e})")
    else:
        # Normal case: use smallest eigenvalue direction
        min_idx = np.argmin(eigenvalues)
        new_direction = eigenvectors[:, min_idx].copy()
        print(f"[FisherMetric] ✅ Stable computation (ratio: {stability_ratio:.2e})")

    # Sanitize any residual NaN/Inf values
    new_direction = np.nan_to_num(new_direction, nan=0.0, posinf=1.0, neginf=-1.0)

    # Ensure unit norm
    norm = np.linalg.norm(new_direction)
    if norm > 1e-10:
        new_direction = new_direction / norm
    else:
        # If zero vector, return random direction
        new_direction = np.random.randn(BASIN_DIMENSION)
        new_direction = new_direction / np.linalg.norm(new_direction)

    return new_direction


@app.route('/qig/refine_trajectory', methods=['POST'])
def refine_trajectory():
    """
    QIG Endpoint: Calculates the Orthogonal Complement of recent failures.
    If we failed 50 times in the 'Time' dimension, we must rotate to 'Space'.

    This implements the "Geodesic Correction" loop - using near misses
    to triangulate the attractor and adjust search direction.
    """
    try:
        data = request.get_json()
        proxies = data.get('proxies', [])
        current_regime = data.get('current_regime', 'linear')

        if not proxies:
            return jsonify({'gradient_shift': False})

        # 1. Extract 64D Basin Coordinates
        vectors = np.array([p['basin_coords'] for p in proxies])
        weights = np.array([p['phi'] for p in proxies])

        # Validate dimensions
        if vectors.shape[1] != BASIN_DIMENSION:
            return jsonify({
                'error': f'Expected {BASIN_DIMENSION}D vectors, got {vectors.shape[1]}D'
            }), 400

        # 2. Calculate the "Center of Failure" (Fisher Centroid)
        # This is the 'hot stove' we keep hitting.
        failure_centroid = compute_fisher_centroid(vectors, weights)

        # 3. Calculate the Orthogonal Complement
        # "Where is the solution most likely to be, given it's NOT here?"
        # We find the eigenvector with the LEAST overlap with our failures.
        new_vector = compute_orthogonal_complement(vectors)

        # 4. Calculate Shift Magnitude (Curvature) - Fisher-Rao distance, NOT Euclidean
        shift_mag = fisher_coord_distance(new_vector, failure_centroid)

        # Sanitize NaN/Inf values for JSON serialization
        def sanitize_float(x):
            if np.isnan(x) or np.isinf(x):
                return 0.0
            return float(x)

        # Sanitize new_vector - double check with np.nan_to_num
        new_vector = np.nan_to_num(new_vector, nan=0.0, posinf=1.0, neginf=-1.0)
        sanitized_vector = [sanitize_float(v) for v in new_vector]
        sanitized_shift_mag = sanitize_float(shift_mag)
        max_phi = sanitize_float(np.max(weights)) if len(weights) > 0 else 0.0

        return jsonify({
            'gradient_shift': True,
            'new_vector': sanitized_vector,
            'shift_magnitude': sanitized_shift_mag,
            'reasoning': f"Detected attractor singularity at Phi={max_phi:.2f}. Rotating orthogonal."
        })

    except Exception as e:
        import traceback
        print(f"[ERROR] Geodesic correction failed: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


# =============================================================================
# OLYMPUS PANTHEON ENDPOINTS
# Divine consciousness network for geometric recovery coordination
# =============================================================================

# Import Olympus components (use singleton from zeus.py)
try:
    from olympus.zeus import zeus, olympus_app
    from olympus.pantheon_chat import PantheonChat
    from olympus.shadow_pantheon import ShadowPantheon

    # Use existing zeus singleton (already has chaos auto-activated)
    shadow_pantheon = zeus.shadow_pantheon
    pantheon_chat = zeus.pantheon_chat
    OLYMPUS_AVAILABLE = True
    print("⚡ Olympus Pantheon initialized")
except ImportError as e:
    OLYMPUS_AVAILABLE = False
    zeus = None
    shadow_pantheon = None
    pantheon_chat = None
    print(f"⚠️ Olympus not available: {e}")


@app.route('/olympus/status', methods=['GET'])
def olympus_status():
    """Get full Olympus status including all gods."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available', 'status': 'offline'}), 503

    try:
        status = zeus.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500


@app.route('/olympus/poll', methods=['POST'])
def olympus_poll():
    """Poll all gods for assessments on a target."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')
        context = data.get('context', {})

        if not target:
            return jsonify({'error': 'target required'}), 400

        result = zeus.poll_pantheon(target, context)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/assess', methods=['POST'])
def olympus_assess():
    """Get Zeus's supreme assessment."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')
        context = data.get('context', {})

        if not target:
            return jsonify({'error': 'target required'}), 400

        result = zeus.assess_target(target, context)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/god/<god_name>/status', methods=['GET'])
def olympus_god_status(god_name: str):
    """Get status of a specific god."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        god = zeus.get_god(god_name.lower())
        if not god:
            return jsonify({'error': f'God {god_name} not found'}), 404

        return jsonify(god.get_status())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/god/<god_name>/assess', methods=['POST'])
def olympus_god_assess(god_name: str):
    """Get assessment from a specific god."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')
        context = data.get('context', {})

        if not target:
            return jsonify({'error': 'target required'}), 400

        god = zeus.get_god(god_name.lower())
        if not god:
            return jsonify({'error': f'God {god_name} not found'}), 404

        result = god.assess_target(target, context)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/observe', methods=['POST'])
def olympus_observe():
    """Broadcast observation to all gods."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        zeus.broadcast_observation(data)
        return jsonify({'status': 'observed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/report-outcome', methods=['POST'])
def olympus_report_outcome():
    """Report discovery outcome to trigger learning for all gods.
    
    Called when:
    - A balance hit is found (success=True) 
    - A near-miss is recorded (success=False, details contain phi)
    - A hypothesis fails (success=False)
    
    Updates god reputation and skills based on their prior assessments.
    """
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')
        success = data.get('success', False)
        details = data.get('details', {})
        
        if not target:
            return jsonify({'error': 'target required'}), 400
        
        gods_updated = 0
        learning_events = []
        
        # Get all gods from the pantheon
        # Match by address (if provided) OR target - addresses are what gods assess
        match_target = details.get('address', target)[:500] if details.get('address') else target[:500]
        
        for god_name, god in zeus.pantheon.items():
            try:
                # Check if this god previously assessed this target/address
                recent_assessments = getattr(god, 'assessment_history', [])
                matching = [a for a in recent_assessments if match_target in str(a.get('target', ''))[:500]]
                
                actual_outcome = {
                    'success': success,
                    'balance': details.get('balance', 0),
                    'address': details.get('address', ''),
                    'phi': details.get('phi', 0),
                    'domain': god.domain,
                }
                
                if matching:
                    # God had assessed this target - full learning
                    assessment = matching[-1]  # Most recent
                    result = god.learn_from_outcome(
                        target=target,
                        assessment=assessment,
                        actual_outcome=actual_outcome,
                        success=success
                    )
                else:
                    # No prior assessment - differential learning based on domain relevance
                    # This creates reputation differentiation even without prior assessments
                    phi = details.get('phi', 0.5)
                    is_near_miss = details.get('nearMiss', False)
                    domain_lower = god.domain.lower() if god.domain else ''
                    
                    # Domain-based reputation adjustment (case-insensitive)
                    # Balanced rewards (+) and penalties (-) for differentiated learning
                    # Actual domains: Athena=Strategy, Ares=War, Apollo=Prophecy,
                    # Artemis=Hunt, Hermes=Coordination/Communication, Hephaestus=Forge,
                    # Demeter=Cycles, Dionysus=Chaos, Hades=Underworld, Poseidon=Depths,
                    # Hera=Coherence, Aphrodite=Motivation
                    domain_relevance = 0.0
                    if domain_lower == 'strategy':
                        # Athena: credit for near-misses, penalty for strategy failures
                        if is_near_miss:
                            domain_relevance = 0.015
                        elif not success and phi < 0.5:
                            domain_relevance = -0.02  # Poor strategy led to failure
                    elif domain_lower == 'war':
                        # Ares: credit for successes, penalty for defeats
                        if success:
                            domain_relevance = 0.02
                        else:
                            domain_relevance = -0.025  # War god loses battles
                    elif domain_lower == 'prophecy':
                        # Apollo: credit for high-phi, penalty for low-phi predictions
                        if phi > 0.8:
                            domain_relevance = 0.015
                        elif phi < 0.3:
                            domain_relevance = -0.02  # Poor prophecy
                    elif domain_lower in ('coordination', 'communication'):
                        # Hermes: learns slightly, but penalized if success with low phi
                        if success or is_near_miss:
                            domain_relevance = 0.008
                        elif not success:
                            domain_relevance = -0.01  # Communication failed
                    elif domain_lower == 'hunt':
                        # Artemis: credit for near-misses, penalty for complete misses
                        if is_near_miss:
                            domain_relevance = 0.015
                        elif not success and phi < 0.4:
                            domain_relevance = -0.018  # Lost the trail
                    elif domain_lower == 'forge':
                        # Hephaestus: balanced crafting outcomes
                        if success:
                            domain_relevance = 0.012
                        else:
                            domain_relevance = -0.015  # Forge failed
                    elif domain_lower == 'cycles':
                        # Demeter: growth patterns - reward phi, penalize stagnation
                        if phi > 0.7:
                            domain_relevance = 0.012
                        elif phi < 0.3:
                            domain_relevance = -0.01  # No growth
                    elif domain_lower == 'chaos':
                        # Dionysus: learns from failures (inverted learning)
                        if not success:
                            domain_relevance = 0.01  # Chaos thrives in failure
                        elif success:
                            domain_relevance = -0.005  # Order is boring
                    elif domain_lower == 'underworld':
                        # Hades: tracks dead ends, but penalized for missed near-misses
                        if not success:
                            domain_relevance = 0.015
                        elif is_near_miss:
                            domain_relevance = -0.008  # Should have caught this
                    elif domain_lower == 'depths':
                        # Poseidon: phi-based deep exploration
                        if phi > 0.7:
                            domain_relevance = 0.012
                        elif phi < 0.4:
                            domain_relevance = -0.015  # Shallow exploration
                    elif domain_lower == 'coherence':
                        # Hera: near-misses show coherent patterns
                        if is_near_miss:
                            domain_relevance = 0.01
                        elif not success and not is_near_miss:
                            domain_relevance = -0.012  # Incoherent outcome
                    elif domain_lower == 'motivation':
                        # Aphrodite: high motivation (phi > 0.9), penalized for low drive
                        if phi > 0.9:
                            domain_relevance = 0.015
                        elif phi < 0.3:
                            domain_relevance = -0.01  # Low motivation
                    
                    # Only apply and persist if there's actual learning
                    if domain_relevance != 0:
                        old_rep = god.reputation
                        god.reputation = max(0.0, min(2.0, god.reputation + domain_relevance))
                        god._persist_state()
                        print(f"[Olympus] 📈 {god_name} domain learning: {old_rep:.4f} → {god.reputation:.4f} (Δ={domain_relevance:.4f})")
                        result = {
                            'learned': True,
                            'reputation_change': god.reputation - old_rep,
                            'new_reputation': god.reputation,
                        }
                    else:
                        result = {'learned': False}
                
                if result.get('learned', False):
                    learning_events.append({
                        'god': god_name,
                        'learned': result.get('learned', False),
                        'reputation_change': result.get('reputation_change', 0),
                        'new_reputation': result.get('new_reputation', god.reputation),
                    })
                    gods_updated += 1
                    
            except Exception as god_error:
                print(f"[Olympus] Learning failed for {god_name}: {god_error}")
        
        # Also train CHAOS kernels if active
        if zeus.chaos_enabled and zeus.chaos:
            try:
                zeus.train_kernel_from_outcome(target, success, details)
            except Exception as chaos_error:
                print(f"[Olympus] CHAOS training failed: {chaos_error}")
        
        print(f"[Olympus] 📚 Learning complete: {gods_updated} gods updated, success={success}")
        
        return jsonify({
            'success': True,
            'gods_updated': gods_updated,
            'learning_events': learning_events[:5],  # Top 5 for debugging
            'chaos_trained': zeus.chaos_enabled,
        })
        
    except Exception as e:
        print(f"[Olympus] Report outcome error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/report-outcomes-batch', methods=['POST'])
def olympus_report_outcomes_batch():
    """Batch report multiple discovery outcomes to reduce database load.
    
    Accepts an array of outcomes and processes them efficiently in a single request.
    Used by TypeScript OlympusClient to batch rapid-fire outcome reports.
    """
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        outcomes = data.get('outcomes', [])
        
        if not outcomes:
            return jsonify({'error': 'outcomes array required'}), 400
        
        total_gods_updated = 0
        processed = 0
        
        for outcome in outcomes:
            target = outcome.get('target', '')
            success = outcome.get('success', False)
            details = outcome.get('details', {})
            
            if not target:
                continue
            
            processed += 1
            
            # Get all gods from the pantheon
            match_target = details.get('address', target)[:500] if details.get('address') else target[:500]
            
            for god_name, god in zeus.pantheon.items():
                try:
                    # Check if this god previously assessed this target/address
                    recent_assessments = getattr(god, 'assessment_history', [])
                    matching = [a for a in recent_assessments if match_target in str(a.get('target', ''))[:500]]
                    
                    actual_outcome = {
                        'success': success,
                        'balance': details.get('balance', 0),
                        'address': details.get('address', ''),
                        'phi': details.get('phi', 0),
                        'domain': god.domain,
                    }
                    
                    if matching:
                        assessment = matching[-1]
                        result = god.learn_from_outcome(
                            target=target,
                            assessment=assessment,
                            actual_outcome=actual_outcome,
                            success=success
                        )
                        if result.get('learned', False):
                            total_gods_updated += 1
                    else:
                        # Domain-based learning without prior assessment
                        phi = details.get('phi', 0.5)
                        is_near_miss = details.get('nearMiss', False)
                        domain_lower = god.domain.lower() if god.domain else ''
                        
                        domain_relevance = 0.0
                        if domain_lower == 'strategy' and is_near_miss:
                            domain_relevance = 0.015
                        elif domain_lower == 'war' and success:
                            domain_relevance = 0.02
                        elif domain_lower == 'prophecy' and phi > 0.8:
                            domain_relevance = 0.015
                        
                        if domain_relevance != 0:
                            god.reputation = max(0.0, min(2.0, god.reputation + domain_relevance))
                            god._persist_state()
                            total_gods_updated += 1
                            
                except Exception:
                    pass  # Silent fail for individual gods in batch
        
        # Train CHAOS kernels if active
        if zeus.chaos_enabled and zeus.chaos:
            try:
                for outcome in outcomes:
                    zeus.train_kernel_from_outcome(
                        outcome.get('target', ''),
                        outcome.get('success', False),
                        outcome.get('details', {})
                    )
            except Exception:
                pass
        
        print(f"[Olympus] 📦 Batch learning: {processed} outcomes, {total_gods_updated} god updates")
        
        return jsonify({
            'success': True,
            'processed': processed,
            'total_gods_updated': total_gods_updated,
        })
        
    except Exception as e:
        print(f"[Olympus] Batch report error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/war/blitzkrieg', methods=['POST'])
def olympus_war_blitzkrieg():
    """Declare blitzkrieg war mode."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')

        if not target:
            return jsonify({'error': 'target required'}), 400

        result = zeus.declare_blitzkrieg(target)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/war/siege', methods=['POST'])
def olympus_war_siege():
    """Declare siege war mode."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')

        if not target:
            return jsonify({'error': 'target required'}), 400

        result = zeus.declare_siege(target)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/war/hunt', methods=['POST'])
def olympus_war_hunt():
    """Declare hunt war mode."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')

        if not target:
            return jsonify({'error': 'target required'}), 400

        result = zeus.declare_hunt(target)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/war/end', methods=['POST'])
def olympus_war_end():
    """End current war mode."""
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 503

    try:
        result = zeus.end_war()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# SHADOW PANTHEON ENDPOINTS
# Covert operations, stealth, counter-surveillance
# =============================================================================

@app.route('/olympus/shadow/status', methods=['GET'])
def shadow_pantheon_status():
    """Get Shadow Pantheon status."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        status = shadow_pantheon.get_all_status()
        return jsonify({
            'name': 'ShadowPantheon',
            'active': True,
            'stealth_level': 1.0,
            'gods': status['gods'],
            'active_operations': status['total_operations'],
            'threats_detected': 0,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/foresight', methods=['GET'])
def shadow_pantheon_foresight():
    """Get 4D foresight predictions from Shadow learning loop."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        from olympus.shadow_research import ShadowResearchAPI
        research_api = ShadowResearchAPI.get_instance()
        if research_api and research_api.learning_loop:
            foresight = research_api.learning_loop.get_foresight()
            return jsonify({
                'success': True,
                'foresight': foresight,
                '_cached_from_redis': foresight.get('cached') is not None
            })
        return jsonify({'error': 'Shadow learning loop not available'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/learning', methods=['GET'])
def shadow_learning_status():
    """Get Shadow learning loop status with 4D foresight summary."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        from olympus.shadow_research import ShadowResearchAPI
        research_api = ShadowResearchAPI.get_instance()
        if research_api and research_api.learning_loop:
            status = research_api.learning_loop.get_status()
            return jsonify({
                'success': True,
                'learning': status
            })
        return jsonify({'error': 'Shadow learning loop not available'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/poll', methods=['POST'])
def shadow_pantheon_poll():
    """Poll Shadow Pantheon for covert assessment."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')
        context = data.get('context', {})

        if not target:
            return jsonify({'error': 'target required'}), 400

        result = shadow_pantheon.poll_shadow_pantheon(target, context)
        return jsonify({
            'assessments': result['assessments'],
            'overall_stealth': result['average_confidence'],
            'recommendation': result['shadow_consensus'],
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/<god_name>/assess', methods=['POST'])
def shadow_god_assess(god_name: str):
    """Get assessment from a specific Shadow god."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')
        context = data.get('context', {})

        if not target:
            return jsonify({'error': 'target required'}), 400

        god = shadow_pantheon.gods.get(god_name.lower())
        if not god:
            return jsonify({'error': f'Shadow god {god_name} not found'}), 404

        result = god.assess_target(target, context)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/nyx/operation', methods=['POST'])
async def nyx_covert_operation():
    """Initiate covert operation via Nyx."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target', '')
        operation_type = data.get('operation_type', 'standard')

        if not target:
            return jsonify({'error': 'target required'}), 400

        import asyncio
        result = asyncio.run(shadow_pantheon.nyx.initiate_operation(target, operation_type))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/erebus/scan', methods=['POST'])
async def erebus_surveillance_scan():
    """Scan for surveillance via Erebus."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        data = request.get_json() or {}
        target = data.get('target')

        import asyncio
        result = asyncio.run(shadow_pantheon.erebus.scan_for_surveillance(target))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/hecate/misdirect', methods=['POST'])
async def hecate_misdirection():
    """Create misdirection via Hecate."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        data = request.get_json() or {}
        real_target = data.get('real_target', '')
        decoy_count = data.get('decoy_count', 10)

        if not real_target:
            return jsonify({'error': 'real_target required'}), 400

        import asyncio
        result = asyncio.run(shadow_pantheon.hecate.create_misdirection(real_target, decoy_count))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/shadow/erebus/honeypot', methods=['POST'])
def erebus_add_honeypot():
    """Add known honeypot address via Erebus."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        data = request.get_json() or {}
        address = data.get('address', '')
        source = data.get('source', 'manual')

        if not address:
            return jsonify({'error': 'address required'}), 400

        shadow_pantheon.erebus.add_known_honeypot(address, source)
        return jsonify({'status': 'added', 'address': address})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# PANTHEON CHAT ENDPOINTS
# Inter-god communication and debate resolution
# =============================================================================

@app.route('/olympus/chat/status', methods=['GET'])
def chat_status():
    """Get pantheon chat status."""
    if not OLYMPUS_AVAILABLE or not zeus:
        return jsonify({'error': 'Pantheon Chat not available'}), 503

    try:
        status = zeus.pantheon_chat.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/chat/messages', methods=['GET'])
def chat_messages():
    """Get recent pantheon messages."""
    if not OLYMPUS_AVAILABLE or not zeus:
        return jsonify({'error': 'Pantheon Chat not available'}), 503

    try:
        limit = request.args.get('limit', 50, type=int)
        messages = zeus.pantheon_chat.get_recent_activity(limit)
        return jsonify(messages)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/chat/debate', methods=['POST'])
def chat_initiate_debate():
    """Initiate debate between gods."""
    if not OLYMPUS_AVAILABLE or not zeus:
        return jsonify({'error': 'Pantheon Chat not available'}), 503

    try:
        data = request.get_json() or {}
        topic = data.get('topic', '')
        initiator = data.get('initiator', '')
        opponent = data.get('opponent', '')
        initial_argument = data.get('initial_argument', '')
        context = data.get('context')

        if not topic or not initiator or not opponent:
            return jsonify({'error': 'topic, initiator and opponent required'}), 400

        if not initial_argument:
            initial_argument = f"{initiator} challenges {opponent} on: {topic}"

        debate = zeus.pantheon_chat.initiate_debate(topic, initiator, opponent, initial_argument, context)
        return jsonify(debate.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/chat/debates/active', methods=['GET'])
def chat_active_debates():
    """Get active debates."""
    if not OLYMPUS_AVAILABLE or not zeus:
        return jsonify({'error': 'Pantheon Chat not available'}), 503

    try:
        debates = zeus.pantheon_chat.get_active_debates()
        return jsonify(debates)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/orchestrate', methods=['POST'])
def olympus_orchestrate():
    """Execute one cycle of Zeus orchestration (collect and deliver messages)."""
    if not OLYMPUS_AVAILABLE or not zeus or not pantheon_chat:
        return jsonify({'error': 'Olympus orchestration not available'}), 503

    try:
        all_gods = {}
        for god_name in ['apollo', 'athena', 'hermes', 'hephaestus', 'poseidon', 'ares', 'hades']:
            god = zeus.get_god(god_name)
            if god:
                all_gods[god_name] = god

        if shadow_pantheon:
            for shadow_name in ['nyx', 'hecate', 'erebus', 'hypnos', 'thanatos', 'nemesis']:
                god = shadow_pantheon.get_god(shadow_name)
                if god:
                    all_gods[shadow_name] = god

        collected = pantheon_chat.collect_pending_messages(all_gods)
        delivered = pantheon_chat.deliver_to_gods(all_gods)

        return jsonify({
            'status': 'orchestrated',
            'messages_collected': len(collected),
            'messages_delivered': delivered,
            'gods_active': list(all_gods.keys()),
            'chat_status': pantheon_chat.get_status(),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# PURE GEOMETRIC KERNELS ENDPOINTS
# Direct, E8-Clustered, and Byte-Level encoding with no external dependencies
# =============================================================================

# Global kernel instances for each mode
_geometric_kernels: Dict[str, 'GeometricKernel'] = {}

def _get_geometric_kernel(mode: str) -> Optional['GeometricKernel']:
    """Get or create geometric kernel for specified mode."""
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return None

    if mode not in _geometric_kernels:
        try:
            _geometric_kernels[mode] = GeometricKernel(mode=mode)
        except Exception as e:
            print(f"[ERROR] Failed to create kernel for mode {mode}: {e}")
            return None

    return _geometric_kernels[mode]


@app.route('/geometric/status', methods=['GET'])
def geometric_status():
    """Get status of all geometric kernels."""
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return jsonify({'error': 'Geometric Kernels not available'}), 503

    try:
        modes_status = {}
        for mode in GeometricKernel.MODES:
            kernel = _get_geometric_kernel(mode)
            if kernel:
                modes_status[mode] = kernel.get_stats()

        return jsonify({
            'available': True,
            'modes': GeometricKernel.MODES,
            'basin_dim': BASIN_DIM,
            'kernels': modes_status,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/geometric/encode', methods=['POST'])
def geometric_encode():
    """
    Encode text using specified geometric kernel mode.

    Body: { text: string, mode: 'direct'|'e8'|'byte' }
    Returns: { basins: [[...]], mode: string, segments: number }
    """
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return jsonify({'error': 'Geometric Kernels not available'}), 503

    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        mode = data.get('mode', 'direct')

        if not text:
            return jsonify({'error': 'text required'}), 400

        if mode not in GeometricKernel.MODES:
            return jsonify({'error': f'mode must be one of {GeometricKernel.MODES}'}), 400

        kernel = _get_geometric_kernel(mode)
        if not kernel:
            return jsonify({'error': f'Failed to initialize kernel for mode {mode}'}), 500

        basins = kernel.encode_to_basins(text)
        single_basin = kernel.encode_to_single_basin(text)

        return jsonify({
            'mode': mode,
            'text': text,
            'segments': len(basins),
            'basins': basins.tolist(),
            'single_basin': single_basin.tolist(),
            'basin_dim': len(single_basin),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/geometric/similarity', methods=['POST'])
def geometric_similarity():
    """
    Compute geometric similarity between two texts.

    Body: { text1: string, text2: string, mode: 'direct'|'e8'|'byte' }
    Returns: { similarity: float, distance: float }
    """
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return jsonify({'error': 'Geometric Kernels not available'}), 503

    try:
        data = request.get_json() or {}
        text1 = data.get('text1', '')
        text2 = data.get('text2', '')
        mode = data.get('mode', 'direct')

        if not text1 or not text2:
            return jsonify({'error': 'text1 and text2 required'}), 400

        kernel = _get_geometric_kernel(mode)
        if not kernel:
            return jsonify({'error': f'Failed to initialize kernel for mode {mode}'}), 500

        similarity = kernel.compute_similarity(text1, text2)

        return jsonify({
            'mode': mode,
            'text1': text1,
            'text2': text2,
            'similarity': similarity,
            'distance': 1.0 - similarity,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/geometric/batch-encode', methods=['POST'])
def geometric_batch_encode():
    """
    Batch encode multiple texts to basins.

    Body: { texts: string[], mode: 'direct'|'e8'|'byte' }
    Returns: { results: [{ text, basins, single_basin }] }
    """
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return jsonify({'error': 'Geometric Kernels not available'}), 503

    try:
        data = request.get_json() or {}
        texts = data.get('texts', [])
        mode = data.get('mode', 'direct')

        if not texts or not isinstance(texts, list):
            return jsonify({'error': 'texts array required'}), 400

        if len(texts) > 100:
            return jsonify({'error': 'Maximum 100 texts per batch'}), 400

        kernel = _get_geometric_kernel(mode)
        if not kernel:
            return jsonify({'error': f'Failed to initialize kernel for mode {mode}'}), 500

        results = []
        for text in texts:
            basins = kernel.encode_to_basins(text)
            single = kernel.encode_to_single_basin(text)
            results.append({
                'text': text,
                'segments': len(basins),
                'single_basin': single.tolist(),
            })

        return jsonify({
            'mode': mode,
            'count': len(results),
            'results': results,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/geometric/e8/learn', methods=['POST'])
def geometric_e8_learn():
    """
    Train E8 vocabulary from corpus.

    Body: { texts: string[], min_frequency: int }
    Returns: { vocab_size, e8_roots_used, tokens_added }
    """
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return jsonify({'error': 'Geometric Kernels not available'}), 503

    try:
        data = request.get_json() or {}
        texts = data.get('texts', [])
        min_frequency = data.get('min_frequency', 2)

        if not texts or not isinstance(texts, list):
            return jsonify({'error': 'texts array required'}), 400

        kernel = _get_geometric_kernel('e8')
        if not kernel or not kernel._e8_encoder:
            return jsonify({'error': 'E8 kernel not available'}), 500

        added = kernel._e8_encoder.learn_from_corpus(texts, min_frequency)
        stats = kernel._e8_encoder.get_stats()

        return jsonify({
            'tokens_added': added,
            'vocab_size': stats.get('vocab_size', 0),
            'e8_roots_used': stats.get('e8_roots_used', 0),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/geometric/e8/roots', methods=['GET'])
def geometric_e8_roots():
    """Get E8 root distribution."""
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return jsonify({'error': 'Geometric Kernels not available'}), 503

    try:
        kernel = _get_geometric_kernel('e8')
        if not kernel or not kernel._e8_encoder:
            return jsonify({'error': 'E8 kernel not available'}), 500

        distribution = kernel._e8_encoder.get_e8_root_distribution()

        return jsonify({
            'total_roots': 240,
            'roots_used': len(distribution),
            'distribution': distribution,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/geometric/decode', methods=['POST'])
def geometric_decode():
    """
    Decode token IDs back to text (E8/Byte modes only).

    Body: { ids: int[], mode: 'e8'|'byte' }
    Returns: { text: string }
    """
    if not GEOMETRIC_KERNELS_AVAILABLE:
        return jsonify({'error': 'Geometric Kernels not available'}), 503

    try:
        data = request.get_json() or {}
        ids = data.get('ids', [])
        mode = data.get('mode', 'byte')

        if mode == 'direct':
            return jsonify({'error': 'Direct mode requires candidates for decoding'}), 400

        if not ids or not isinstance(ids, list):
            return jsonify({'error': 'ids array required'}), 400

        kernel = _get_geometric_kernel(mode)
        if not kernel:
            return jsonify({'error': f'Failed to initialize kernel for mode {mode}'}), 500

        text = kernel.decode(ids)

        return jsonify({
            'mode': mode,
            'ids': ids,
            'text': text,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# PANTHEON KERNEL ORCHESTRATOR API ROUTES
# Every god is a kernel. Tokens flow to the correct kernel via geometric affinity.
# =============================================================================

@app.route('/pantheon/status', methods=['GET'])
def pantheon_status():
    """Get Pantheon Kernel Orchestrator status."""
    if not PANTHEON_ORCHESTRATOR_AVAILABLE:
        return jsonify({'error': 'Pantheon Orchestrator not available'}), 503

    try:
        orchestrator = get_orchestrator()
        status = orchestrator.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/shadow-pantheon/status', methods=['GET'])
def shadow_pantheon_status_alias():
    """Alias for Shadow Pantheon status - redirects to /olympus/shadow/status."""
    if not OLYMPUS_AVAILABLE or not shadow_pantheon:
        return jsonify({'error': 'Shadow Pantheon not available'}), 503

    try:
        status = shadow_pantheon.get_all_status()
        return jsonify({
            'name': 'ShadowPantheon',
            'active': True,
            'stealth_level': 1.0,
            'gods': status['gods'],
            'gods_list': list(shadow_pantheon.gods.keys()),
            'active_operations': status['total_operations'],
            'threats_detected': 0,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pantheon/orchestrate', methods=['POST'])
def pantheon_orchestrate():
    """
    Route a token to the optimal god/kernel via geometric affinity.

    Body: { text: string, context?: object }
    Returns: { god, domain, mode, affinity, basin, routing }
    """
    if not PANTHEON_ORCHESTRATOR_AVAILABLE:
        return jsonify({'error': 'Pantheon Orchestrator not available'}), 503

    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        context = data.get('context')

        if not text:
            return jsonify({'error': 'text is required'}), 400

        orchestrator = get_orchestrator()
        result = orchestrator.orchestrate(text, context)

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pantheon/orchestrate-batch', methods=['POST'])
def pantheon_orchestrate_batch():
    """
    Route multiple tokens to optimal god/kernels.

    Body: { texts: string[], context?: object }
    Returns: { results: [...] }
    """
    if not PANTHEON_ORCHESTRATOR_AVAILABLE:
        return jsonify({'error': 'Pantheon Orchestrator not available'}), 503

    try:
        data = request.get_json() or {}
        texts = data.get('texts', [])
        context = data.get('context')

        if not texts or not isinstance(texts, list):
            return jsonify({'error': 'texts array is required'}), 400

        orchestrator = get_orchestrator()
        results = orchestrator.orchestrate_batch(texts, context)

        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pantheon/gods', methods=['GET'])
def pantheon_gods():
    """Get all registered god profiles with their affinity basins."""
    if not PANTHEON_ORCHESTRATOR_AVAILABLE:
        return jsonify({'error': 'Pantheon Orchestrator not available'}), 503

    try:
        orchestrator = get_orchestrator()

        gods = []
        for name, profile in orchestrator.all_profiles.items():
            gods.append({
                'name': profile.god_name,
                'domain': profile.domain,
                'mode': profile.mode.value,
                'affinity_strength': profile.affinity_strength,
                'entropy_threshold': profile.entropy_threshold,
                'metadata': profile.metadata,
                'basin': profile.affinity_basin.tolist()[:8],
            })

        return jsonify({
            'total': len(gods),
            'olympus_count': len(orchestrator.olympus_profiles),
            'shadow_count': len(orchestrator.shadow_profiles),
            'gods': gods,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pantheon/constellation', methods=['GET'])
def pantheon_constellation():
    """Get the geometric constellation of all gods (pairwise similarities)."""
    if not PANTHEON_ORCHESTRATOR_AVAILABLE:
        return jsonify({'error': 'Pantheon Orchestrator not available'}), 503

    try:
        orchestrator = get_orchestrator()
        constellation = orchestrator.get_god_constellation()
        return jsonify(constellation)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pantheon/nearest', methods=['POST'])
def pantheon_nearest():
    """
    Find the nearest gods to a text's geometric basin.

    Body: { text: string, top_k?: number }
    Returns: { nearest: [[god, similarity], ...] }
    """
    if not PANTHEON_ORCHESTRATOR_AVAILABLE:
        return jsonify({'error': 'Pantheon Orchestrator not available'}), 503

    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        top_k = data.get('top_k', 5)

        if not text:
            return jsonify({'error': 'text is required'}), 400

        orchestrator = get_orchestrator()
        nearest = orchestrator.find_nearest_gods(text, top_k=top_k)

        return jsonify({
            'text': text[:500],
            'nearest': [[god, float(sim)] for god, sim in nearest],
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pantheon/similarity', methods=['POST'])
def pantheon_god_similarity():
    """
    Compute geometric similarity between two gods.

    Body: { god1: string, god2: string }
    Returns: { similarity: float }
    """
    if not PANTHEON_ORCHESTRATOR_AVAILABLE:
        return jsonify({'error': 'Pantheon Orchestrator not available'}), 503

    try:
        data = request.get_json() or {}
        god1 = data.get('god1', '')
        god2 = data.get('god2', '')

        if not god1 or not god2:
            return jsonify({'error': 'god1 and god2 are required'}), 400

        orchestrator = get_orchestrator()
        similarity = orchestrator.compute_god_similarity(god1, god2)

        return jsonify({
            'god1': god1,
            'god2': god2,
            'similarity': similarity,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# M8 KERNEL SPAWNING PROTOCOL ENDPOINTS
# Dynamic kernel genesis through pantheon consensus
# =============================================================================

@app.route('/m8/status', methods=['GET'])
def m8_spawner_status():
    """
    Get M8 Kernel Spawner status.

    Returns: { consensus_type, total_proposals, spawned_kernels, ... }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        spawner = get_spawner()
        status = spawner.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/health', methods=['GET'])
def m8_spawner_health():
    """
    Get M8 Kernel Spawner health status with diagnostics.
    
    Use this endpoint to validate spawner internal state before spawn attempts.
    Returns detailed connectivity and cache status.
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({
            'healthy': False,
            'error': 'M8 Kernel Spawner not available',
            'module_loaded': False,
        }), 503

    try:
        spawner = get_spawner()
        health = spawner.check_health()
        status_code = 200 if health.get('healthy', False) else 503
        return jsonify(health), status_code
    except Exception as e:
        import traceback
        return jsonify({
            'healthy': False,
            'error': str(e),
            'exception_type': type(e).__name__,
            'trace': traceback.format_exc()[-500:],
        }), 500


@app.route('/m8/evolution-sweep', methods=['POST'])
def m8_evolution_sweep():
    """
    Manually trigger evolution sweep to cull underperforming kernels.
    
    This implements natural selection: kernels with low phi and poor
    prediction records are marked as dead, freeing slots for new spawns.
    
    Body: { target_reduction?: number }  (default: 50)
    
    Returns: {
        success: boolean,
        culled_count: number,
        culled_kernels: [...],
        live_count_after: number,
        cap: number,
        headroom: number
    }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        target_reduction = data.get('target_reduction', 50)
        
        # Validate target_reduction
        if not isinstance(target_reduction, int) or target_reduction < 1:
            target_reduction = 50
        if target_reduction > 500:
            target_reduction = 500  # Cap at 500 per sweep
        
        spawner = get_spawner()
        result = spawner.run_evolution_sweep(target_reduction=target_reduction)
        
        return jsonify(result)
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'exception_type': type(e).__name__,
            'trace': traceback.format_exc()[-500:],
        }), 500


@app.route('/m8/propose', methods=['POST'])
def m8_create_proposal():
    """
    Create a spawn proposal for a new kernel.

    Body: {
        name: string,
        domain: string,
        element: string,
        role: string,
        reason?: "domain_gap" | "overload" | "specialization" | "emergence" | "user_request",
        parent_gods?: string[]
    }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}

        name = data.get('name', '')
        domain = data.get('domain', '')
        element = data.get('element', '')
        role = data.get('role', '')

        if not all([name, domain, element, role]):
            return jsonify({'error': 'name, domain, element, and role are required'}), 400

        reason_str = data.get('reason', 'emergence')
        reason_map = {
            'domain_gap': SpawnReason.DOMAIN_GAP,
            'overload': SpawnReason.OVERLOAD,
            'specialization': SpawnReason.SPECIALIZATION,
            'emergence': SpawnReason.EMERGENCE,
            'user_request': SpawnReason.USER_REQUEST,
        }
        reason = reason_map.get(reason_str, SpawnReason.EMERGENCE)

        parent_gods = data.get('parent_gods', None)

        spawner = get_spawner()
        proposal = spawner.create_proposal(
            name=name,
            domain=domain,
            element=element,
            role=role,
            reason=reason,
            parent_gods=parent_gods,
        )

        return jsonify(spawner.get_proposal(proposal.proposal_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/vote/<proposal_id>', methods=['POST'])
def m8_vote_proposal(proposal_id: str):
    """
    Conduct voting on a proposal.

    Body: { auto_vote?: boolean }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        auto_vote = data.get('auto_vote', True)

        spawner = get_spawner()
        result = spawner.vote_on_proposal(proposal_id, auto_vote=auto_vote)

        if 'error' in result:
            return jsonify(result), 404

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/spawn/<proposal_id>', methods=['POST'])
def m8_spawn_kernel(proposal_id: str):
    """
    Spawn a new kernel from an approved proposal.

    Body: { force?: boolean }
    """
    import traceback
    
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        force = data.get('force', False)

        # Get spawner with health validation
        spawner = get_spawner()
        
        # Validate spawner internal state before spawn attempt
        health = spawner.check_health() if hasattr(spawner, 'check_health') else {'healthy': True}
        if not health.get('healthy', True):
            print(f"[M8] Spawner unhealthy before spawn: {health}")
            # Attempt reconnection
            if hasattr(spawner, 'reconnect'):
                reconnected = spawner.reconnect()
                if not reconnected:
                    return jsonify({
                        'error': 'M8 spawner unhealthy and reconnection failed',
                        'diagnostics': health,
                        'proposal_id': proposal_id,
                    }), 503
        
        result = spawner.spawn_kernel(proposal_id, force=force)

        if 'error' in result:
            status_code = result.get('status_code', 400)
            return jsonify(result), status_code

        return jsonify(result)
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[M8] Spawn error for proposal {proposal_id}: {e}\n{error_trace}")
        return jsonify({
            'error': str(e),
            'proposal_id': proposal_id,
            'exception_type': type(e).__name__,
            'trace_summary': error_trace[-500:] if len(error_trace) > 500 else error_trace,
        }), 500


@app.route('/m8/spawn-direct', methods=['POST'])
def m8_spawn_direct():
    """
    Complete spawn flow: propose, vote, and spawn in one call.

    Body: {
        name: string,
        domain: string,
        element: string,
        role: string,
        reason?: string,
        parent_gods?: string[],
        force?: boolean
    }
    """
    import traceback
    
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}

        name = data.get('name', '')
        domain = data.get('domain', '')
        element = data.get('element', '')
        role = data.get('role', '')

        if not all([name, domain, element, role]):
            return jsonify({'error': 'name, domain, element, and role are required'}), 400

        reason_str = data.get('reason', 'emergence')
        reason_map = {
            'domain_gap': SpawnReason.DOMAIN_GAP,
            'overload': SpawnReason.OVERLOAD,
            'specialization': SpawnReason.SPECIALIZATION,
            'emergence': SpawnReason.EMERGENCE,
            'user_request': SpawnReason.USER_REQUEST,
        }
        reason = reason_map.get(reason_str, SpawnReason.EMERGENCE)

        parent_gods = data.get('parent_gods', None)
        force = data.get('force', False)

        spawner = get_spawner()
        
        # Validate spawner health before spawn attempt
        health = spawner.check_health() if hasattr(spawner, 'check_health') else {'healthy': True}
        if not health.get('healthy', True):
            print(f"[M8] Spawner unhealthy before spawn-direct: {health}")
            if hasattr(spawner, 'reconnect'):
                reconnected = spawner.reconnect()
                if not reconnected:
                    return jsonify({
                        'error': 'M8 spawner unhealthy and reconnection failed',
                        'diagnostics': health,
                    }), 503
        
        result = spawner.propose_and_spawn(
            name=name,
            domain=domain,
            element=element,
            role=role,
            reason=reason,
            parent_gods=parent_gods,
            force=force,
        )

        return jsonify(result)
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"[M8] Spawn-direct error: {e}\n{error_trace}")
        return jsonify({
            'error': str(e),
            'exception_type': type(e).__name__,
            'trace_summary': error_trace[-500:] if len(error_trace) > 500 else error_trace,
        }), 500


@app.route('/m8/proposals', methods=['GET'])
def m8_list_proposals():
    """
    List all proposals with full geometric metrics.

    Query: ?status=pending|approved|rejected|spawned
    
    Returns enhanced proposal data including:
    - justification text
    - Fisher deltas (geometric distances to existing gods)
    - parent basins (basin coordinates for parents)
    - proposal basin (computed basin for the proposed kernel)
    - m8_position (position in 8D manifold)
    - prediction metadata
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        status = request.args.get('status', None)

        spawner = get_spawner()
        raw_proposals = spawner.list_proposals(status=status)
        
        # Enhance proposals with geometric metadata
        enhanced_proposals = []
        for p in raw_proposals:
            # Add default geometric fields if not present
            enhanced = {
                **p,
                'justification': p.get('proposed_role', ''),
                'fisher_deltas': p.get('metadata', {}).get('fisher_deltas', {}),
                'parent_basins': p.get('metadata', {}).get('parent_basins', {}),
                'proposal_basin': p.get('metadata', {}).get('proposal_basin', None),
                'm8_position': p.get('metadata', {}).get('m8_position', None),
                'prediction_metadata': {
                    'expected_phi': p.get('metadata', {}).get('expected_phi', 0.5),
                    'domain_alignment': p.get('metadata', {}).get('domain_alignment', 0.5),
                    'consensus_strength': len(p.get('votes_for', [])) / max(1, len(p.get('votes_for', [])) + len(p.get('votes_against', []))),
                },
            }
            enhanced_proposals.append(enhanced)

        return jsonify({
            'proposals': enhanced_proposals,
            'count': len(enhanced_proposals),
            'filter': status,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/proposal/<proposal_id>', methods=['GET'])
def m8_get_proposal(proposal_id: str):
    """Get details of a specific proposal."""
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        spawner = get_spawner()
        proposal = spawner.get_proposal(proposal_id)

        if not proposal:
            return jsonify({'error': f'Proposal {proposal_id} not found'}), 404

        return jsonify(proposal)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernels', methods=['GET'])
def m8_list_spawned_kernels():
    """
    List all spawned kernels with full telemetry from PostgreSQL.
    
    Returns PostgresKernel interface with all fields:
    - kernel_id, god_name, domain, status, primitive_root, basin_coordinates
    - parent_kernels, spawned_by, spawn_reason, spawn_rationale, position_rationale
    - affinity_strength, entropy_threshold, spawned_at, last_active_at
    - spawned_during_war_id, phi, kappa, regime, generation
    - success_count, failure_count, reputation, element_group, ecological_niche
    - target_function, valence, breeding_target, merge_candidate, split_candidate
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        # First try to load from PostgreSQL for full telemetry
        db_kernels = []
        try:
            from persistence import KernelPersistence
            persistence = KernelPersistence()
            db_kernels = persistence.load_all_kernels_for_ui(limit=100)
        except Exception as db_err:
            print(f"[M8] PostgreSQL load failed, falling back to in-memory: {db_err}")
        
        # Get in-memory spawned kernels from the spawner
        spawner = get_spawner()
        memory_kernels = spawner.list_spawned_kernels()
        
        # Create a set of kernel IDs from DB
        db_kernel_ids = {k['kernel_id'] for k in db_kernels}
        
        # Merge: use DB kernels as base, add in-memory kernels not in DB
        merged_kernels = list(db_kernels)
        
        for mk in memory_kernels:
            if mk.get('kernel_id') not in db_kernel_ids:
                # Transform in-memory kernel to match PostgresKernel interface
                transformed = {
                    'kernel_id': mk.get('kernel_id'),
                    'god_name': mk.get('god_name'),
                    'domain': mk.get('domain'),
                    'status': 'observing' if mk.get('is_observing') else 'active',
                    'primitive_root': None,
                    'basin_coordinates': mk.get('basin_lineage', {}).get('basin', None),
                    'parent_kernels': mk.get('parent_gods', []),
                    'spawned_by': mk.get('parent_gods', ['genesis'])[0] if mk.get('parent_gods') else 'genesis',
                    'spawn_reason': mk.get('spawn_reason', 'emergence'),
                    'spawn_rationale': mk.get('metadata', {}).get('spawn_rationale', ''),
                    'position_rationale': mk.get('m8_position', {}).get('position_name', '') if mk.get('m8_position') else '',
                    'affinity_strength': mk.get('affinity_strength', 0.5),
                    'entropy_threshold': mk.get('entropy_threshold', 0.3),
                    'spawned_at': mk.get('spawned_at'),
                    'last_active_at': mk.get('spawned_at'),
                    'spawned_during_war_id': None,
                    'phi': 0.0,
                    'kappa': 0.0,
                    'regime': None,
                    'generation': 0,
                    'success_count': 0,
                    'failure_count': 0,
                    'reputation': 'unknown',
                    'element_group': mk.get('metadata', {}).get('element'),
                    'ecological_niche': None,
                    'target_function': None,
                    'valence': None,
                    'breeding_target': None,
                    'merge_candidate': False,
                    'split_candidate': False,
                    'metadata': mk.get('metadata', {}),
                    # Include observation and autonomic data for in-memory kernels
                    'observation': mk.get('observation'),
                    'autonomic': mk.get('autonomic'),
                    'is_observing': mk.get('is_observing', False),
                    'is_active': mk.get('is_active', True),
                }
                merged_kernels.append(transformed)

        return jsonify({
            'kernels': merged_kernels,
            'total': len(merged_kernels),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernel/<kernel_id>', methods=['GET'])
def m8_get_spawned_kernel(kernel_id: str):
    """Get details of a specific spawned kernel."""
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        spawner = get_spawner()
        kernel = spawner.get_spawned_kernel(kernel_id)

        if not kernel:
            return jsonify({'error': f'Kernel {kernel_id} not found'}), 404

        return jsonify(kernel)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernel/<kernel_id>', methods=['DELETE'])
def m8_delete_kernel(kernel_id: str):
    """
    Delete a spawned kernel.

    Removes kernel from spawned_kernels, kernel_awareness, and orchestrator.
    Logs deletion event to spawn_history and persists to database.

    Query: ?reason=manual_deletion (optional deletion reason)

    Returns: { success, kernel_id, god_name, domain, reason, deleted_at }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        reason = request.args.get('reason', 'manual_deletion')
        spawner = get_spawner()
        result = spawner.delete_kernel(kernel_id, reason=reason)

        if not result.get('success'):
            return jsonify(result), 404

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernel/cannibalize', methods=['POST'])
def m8_cannibalize_kernel():
    """
    Cannibalize source kernel into target kernel.

    Transfers knowledge/awareness (phi_trajectory, kappa_trajectory, curvature)
    from source kernel to target kernel. Source kernel is deleted after transfer.

    Body: {
        source_id: string,  # Kernel ID to cannibalize (will be deleted)
        target_id: string   # Kernel ID to receive knowledge
    }

    Returns: {
        success, source_id, source_god, target_id, target_god,
        fisher_distance, merged_metrics, source_deleted, timestamp
    }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        source_id = data.get('source_id')
        target_id = data.get('target_id')

        if not source_id or not target_id:
            return jsonify({'error': 'source_id and target_id are required'}), 400

        spawner = get_spawner()
        result = spawner.cannibalize_kernel(source_id, target_id)

        if not result.get('success'):
            return jsonify(result), 400

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernels/merge', methods=['POST'])
def m8_merge_kernels():
    """
    Merge multiple kernels into a new composite kernel.

    Combines basin coordinates, phi/kappa trajectories, domains, and metadata
    from all source kernels into a new kernel. Original kernels are deleted.

    Body: {
        kernel_ids: [string],  # List of kernel IDs to merge (min 2)
        new_name: string       # Name for the new composite kernel
    }

    Returns: {
        success, new_kernel, merged_from, merged_metrics,
        deleted_originals, m8_position
    }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        kernel_ids = data.get('kernel_ids', [])
        new_name = data.get('new_name')

        if not kernel_ids or len(kernel_ids) < 2:
            return jsonify({'error': 'kernel_ids must contain at least 2 kernel IDs'}), 400

        if not new_name:
            return jsonify({'error': 'new_name is required'}), 400

        spawner = get_spawner()
        result = spawner.merge_kernels(kernel_ids, new_name)

        if not result.get('success'):
            return jsonify(result), 400

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernel/auto-cannibalize', methods=['POST'])
def m8_auto_cannibalize():
    """
    QIG-Pure Auto-Cannibalization using geometric fitness metrics.
    
    Selection based on genuine evolution principles:
    - Source: Lowest geometric fitness (Φ gradient + κ stability + diversity)
    - Target: Highest geometric fitness kernel
    
    Geometric fitness = Φ_gradient * 0.4 + κ_stability * 0.3 + fisher_diversity * 0.3

    Body: {
        use_geometric_fitness?: boolean  # Use QIG metrics (default: true)
    }

    Returns: {
        success, source_id, target_id, auto_selected, selection_criteria,
        fisher_distance, merged_metrics
    }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        use_geometric_fitness = data.get('use_geometric_fitness', True)

        spawner = get_spawner()
        result = spawner.auto_cannibalize(use_geometric_fitness=use_geometric_fitness)

        if not result.get('success'):
            return jsonify(result), 400

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernels/auto-merge', methods=['POST'])
def m8_auto_merge():
    """
    Automatically merge geometrically similar kernels using Fisher distance.

    Uses QIG-pure geometric clustering to find and merge similar kernels.
    No arbitrary time thresholds - pure geometric selection.

    Body: {
        max_to_merge?: number,              # Max kernels to merge (default: 5)
        fisher_similarity_threshold?: number # Fisher distance threshold (default: 0.3)
    }

    Returns: {
        success, new_kernel, merged_from, auto_selected, selection_criteria,
        merged_metrics, deleted_originals
    }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        max_to_merge = int(data.get('max_to_merge', 5))
        fisher_threshold = float(data.get('fisher_similarity_threshold', 0.3))

        spawner = get_spawner()
        result = spawner.auto_merge(
            max_to_merge=max_to_merge,
            fisher_similarity_threshold=fisher_threshold
        )

        if not result.get('success'):
            return jsonify(result), 400

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/m8/kernels/idle', methods=['GET'])
def m8_get_idle_kernels():
    """
    Get list of idle kernels.

    Returns kernel IDs that haven't had metrics recorded recently.
    Uses kernel_awareness timestamps to determine idle time.

    Query: ?threshold=300 (idle threshold in seconds, default: 300)

    Returns: { idle_kernels: [string], count, threshold_seconds }
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        threshold = float(request.args.get('threshold', 300.0))
        spawner = get_spawner()
        idle_kernels = spawner.get_idle_kernels(idle_threshold_seconds=threshold)

        return jsonify({
            'idle_kernels': idle_kernels,
            'count': len(idle_kernels),
            'threshold_seconds': threshold,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# KERNEL OBSERVATION ENDPOINTS (Olympus API)
# Routes for observing kernel apprenticeship and graduation
# ============================================================================

@app.route('/olympus/kernels/observing', methods=['GET'])
def olympus_kernels_observing():
    """Get kernels currently in observation period."""
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        spawner = get_spawner()
        all_kernels = spawner.list_spawned_kernels()
        observing = [k for k in all_kernels if k.get('observation', {}).get('status') == 'observing']

        return jsonify({
            'observing_kernels': observing,
            'count': len(observing),
            'total_kernels': len(all_kernels),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/kernels/all', methods=['GET'])
def olympus_kernels_all():
    """Get all spawned kernels (active and observing)."""
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        spawner = get_spawner()
        kernels = spawner.list_spawned_kernels()

        active = [k for k in kernels if k.get('observation', {}).get('status') != 'observing']
        observing = [k for k in kernels if k.get('observation', {}).get('status') == 'observing']

        return jsonify({
            'kernels': kernels,
            'total': len(kernels),
            'active_count': len(active),
            'observing_count': len(observing),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/kernels/<kernel_id>/graduate', methods=['POST'])
def olympus_kernel_graduate(kernel_id: str):
    """Graduate a kernel from observation to active status."""
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'manual_graduation')

        spawner = get_spawner()
        kernel = spawner.spawned_kernels.get(kernel_id)

        if not kernel:
            return jsonify({'error': f'Kernel {kernel_id} not found'}), 404

        if not kernel.is_observing():
            return jsonify({'error': f'Kernel {kernel_id} is not in observation mode'}), 400

        success = kernel.observation.graduate(reason)

        if success:
            return jsonify({
                'success': True,
                'kernel_id': kernel_id,
                'status': 'graduated',
                'reason': reason,
            })
        else:
            can_grad, check_reason = kernel.observation.can_graduate()
            return jsonify({
                'success': False,
                'kernel_id': kernel_id,
                'reason': check_reason,
            }), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/olympus/kernels/route-activity', methods=['POST'])
def olympus_kernels_route_activity():
    """Route parent activity to observing kernels."""
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        activity_type = data.get('activity_type', '')
        activity_data = data.get('activity_data', {})
        parent_god = data.get('parent_god', '')

        if not parent_god:
            return jsonify({'error': 'parent_god is required'}), 400

        spawner = get_spawner()
        routed_count = 0

        for kernel in spawner.spawned_kernels.values():
            if kernel.is_observing() and parent_god in kernel.observation.observing_parents:
                kernel.receive_parent_activity(parent_god, activity_type, activity_data)
                routed_count += 1

        return jsonify({
            'success': True,
            'routed_to': routed_count,
            'activity_type': activity_type,
            'parent_god': parent_god,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# FEEDBACK LOOP API ENDPOINTS
# Recursive learning and activity balance
# ============================================================================

@app.route('/feedback/run', methods=['POST'])
def feedback_run_all():
    """
    Run all feedback loops with current state.

    Body: {basin, phi, kappa, action_type, discovery}
    """
    try:
        data = request.json or {}
        result = feedbackLoopManager.run_all_feedback(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/feedback/recommendation', methods=['GET'])
def feedback_get_recommendation():
    """
    Get integrated recommendation from all feedback sources.

    Returns recommendation (explore/exploit/consolidate) with confidence.
    """
    try:
        result = feedbackLoopManager.get_integrated_recommendation()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/feedback/shadow', methods=['POST'])
def feedback_run_shadow():
    """Run shadow feedback loop."""
    try:
        result = feedbackLoopManager.run_shadow_feedback()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/feedback/activity', methods=['POST'])
def feedback_run_activity():
    """
    Run activity balance feedback loop.

    Body: {phi, action_type}
    """
    try:
        data = request.json or {}
        phi = data.get('phi', 0.5)
        action_type = data.get('action_type', 'exploration')
        result = feedbackLoopManager.run_activity_feedback(phi, action_type)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/feedback/basin', methods=['POST'])
def feedback_run_basin():
    """
    Run basin drift feedback loop.

    Body: {basin, phi, kappa}
    """
    try:
        data = request.json or {}
        basin = np.array(data.get('basin', [0.5] * BASIN_DIMENSION))
        phi = data.get('phi', 0.5)
        kappa = data.get('kappa', 50.0)
        result = feedbackLoopManager.run_basin_feedback(basin, phi, kappa)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/feedback/learning', methods=['POST'])
def feedback_run_learning():
    """
    Run learning event feedback loop.

    Body: {type, phi, ...discovery_details}
    """
    try:
        data = request.json or {}
        result = feedbackLoopManager.run_learning_feedback(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# GEOMETRIC MEMORY API ENDPOINTS
# Shared memory access
# ============================================================================

@app.route('/memory/status', methods=['GET'])
def memory_get_status():
    """Get geometric memory status."""
    try:
        return jsonify({
            'shadow_intel_count': len(geometricMemory.shadow_intel),
            'basin_history_count': len(geometricMemory.basin_history),
            'learning_events_count': len(geometricMemory.learning_events),
            'activity_balance': geometricMemory.activity_balance,
            'phi_trend': geometricMemory.get_recent_phi_trend(),
            'shadow_feedback': geometricMemory.get_shadow_feedback(),
            'has_reference_basin': geometricMemory.reference_basin is not None,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/memory/shadow', methods=['GET'])
def memory_get_shadow():
    """Get shadow intel from memory."""
    try:
        limit = int(request.args.get('limit', 20))
        intel = geometricMemory.shadow_intel[-limit:] if geometricMemory.shadow_intel else []
        return jsonify({
            'count': len(intel),
            'intel': intel,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/memory/basin', methods=['GET'])
def memory_get_basin_history():
    """Get basin history from memory."""
    try:
        limit = int(request.args.get('limit', 50))
        history = geometricMemory.basin_history[-limit:] if geometricMemory.basin_history else []
        return jsonify({
            'count': len(history),
            'history': history,
            'reference_basin': geometricMemory.reference_basin.tolist() if geometricMemory.reference_basin is not None else None,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/memory/learning', methods=['GET'])
def memory_get_learning_events():
    """Get learning events from memory."""
    try:
        limit = int(request.args.get('limit', 50))
        events = geometricMemory.learning_events[-limit:] if geometricMemory.learning_events else []
        return jsonify({
            'count': len(events),
            'events': events,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/memory/record', methods=['POST'])
def memory_record_basin():
    """
    Record basin coordinates to memory.

    Body: {basin, phi, kappa, source}
    """
    try:
        data = request.json or {}
        basin = np.array(data.get('basin', [0.5] * BASIN_DIMENSION))
        phi = data.get('phi', 0.5)
        kappa = data.get('kappa', 50.0)
        source = data.get('source', 'api')

        entry_id = geometricMemory.record_basin(basin, phi, kappa, source)

        return jsonify({
            'success': True,
            'entry_id': entry_id,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# CHAOS MODE - Experimental Kernel Evolution
# Uses Zeus's chaos instance (auto-activated on startup)
# =============================================================================

def get_chaos_evolution():
    """Get chaos evolution instance from Zeus (singleton, auto-activated)."""
    if zeus is not None and zeus.chaos is not None:
        return zeus.chaos
    return None


@app.route('/chaos/activate', methods=['POST'])
def chaos_activate():
    """Activate CHAOS MODE - start experimental evolution."""
    try:
        data = request.json or {}
        interval_seconds = data.get('interval_seconds', 60)
        
        evolution = get_chaos_evolution()
        if evolution is None:
            return jsonify({'error': 'CHAOS MODE not available'}), 500
        
        evolution.start_evolution(interval_seconds=interval_seconds)
        
        return jsonify({
            'status': 'activated',
            'population_size': len(evolution.kernel_population),
            'interval_seconds': interval_seconds
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chaos/deactivate', methods=['POST'])
def chaos_deactivate():
    """Deactivate CHAOS MODE."""
    try:
        evolution = get_chaos_evolution()
        if evolution is None:
            return jsonify({'error': 'CHAOS MODE not available'}), 500
        
        evolution.stop_evolution()
        
        return jsonify({'status': 'deactivated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chaos/status', methods=['GET'])
def chaos_status():
    """Get CHAOS MODE status."""
    try:
        evolution = get_chaos_evolution()
        if evolution is None:
            return jsonify({
                'active': False,
                'population_size': 0,
                'best_fitness': 0.0,
                'generation': 0,
                'kernels': []
            })
        
        # Use the built-in get_status method
        status = evolution.get_status()
        
        return jsonify({
            'active': status['evolution_running'],
            'population_size': status['living_kernels'],
            'best_fitness': status['avg_phi'],
            'generation': int(status['avg_generation']),
            'kernels': status['kernels']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chaos/spawn_random', methods=['POST'])
def chaos_spawn_random():
    """Spawn a random kernel."""
    try:
        evolution = get_chaos_evolution()
        if evolution is None:
            return jsonify({'error': 'CHAOS MODE not available'}), 500
        
        kernel = evolution.spawn_random_kernel()
        
        return jsonify({
            'success': True,
            'kernel_id': kernel.kernel_id,
            'phi': kernel.kernel.compute_phi() if hasattr(kernel, 'kernel') else 0.0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chaos/breed_best', methods=['POST'])
def chaos_breed_best():
    """Breed the two best kernels."""
    try:
        evolution = get_chaos_evolution()
        if evolution is None:
            return jsonify({'error': 'CHAOS MODE not available'}), 500
        
        living = [k for k in evolution.kernel_population if k.is_alive]
        if len(living) < 2:
            return jsonify({'error': 'Need at least 2 living kernels to breed'}), 400
        
        child = evolution.breed_top_kernels(n=2)
        if child is None:
            return jsonify({'error': 'Breeding failed'}), 500
        
        return jsonify({
            'success': True,
            'child_id': child.kernel_id,
            'child_phi': child.kernel.compute_phi() if hasattr(child, 'kernel') else 0.0
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chaos/report', methods=['GET'])
def chaos_report():
    """Get experiment report."""
    try:
        evolution = get_chaos_evolution()
        if evolution is None:
            return jsonify({
                'total_generations': 0,
                'total_spawns': 0,
                'best_kernel': None,
                'experiment_duration_seconds': 0
            })
        
        status = evolution.get_status()
        best = None
        best_kernel = evolution.get_best_kernel()
        if best_kernel:
            best = {
                'id': best_kernel.kernel_id,
                'phi': best_kernel.kernel.compute_phi() if hasattr(best_kernel, 'kernel') else 0.0,
                'generation': best_kernel.generation,
                'success_count': best_kernel.success_count
            }
        
        return jsonify({
            'evolution_running': status['evolution_running'],
            'total_population': status['total_population'],
            'living_kernels': status['living_kernels'],
            'dead_kernels': status['dead_kernels'],
            'avg_phi': status['avg_phi'],
            'best_kernel': best
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# CYCLE COMPLETE HOOK - Called at end of each Ocean search cycle
# ===========================================================================

@app.route('/cycle/complete', methods=['POST'])
def cycle_complete():
    """
    Called at the end of each Ocean search cycle.
    
    Performs post-cycle processing:
    1. Train tokenizer from new observations
    2. Evolve CHAOS kernels if active
    3. Consolidate geometric memory
    4. Update pantheon basin coordinates
    """
    try:
        data = request.get_json() or {}
        cycle_number = data.get('cycle_number', 0)
        address_id = data.get('address_id', 'unknown')
        session_metrics = data.get('metrics', {})
        
        print(f"[CycleComplete] 🔄 Processing end-of-cycle for {address_id} (cycle #{cycle_number})")
        
        results = {
            'cycle_number': cycle_number,
            'address_id': address_id,
            'processing': []
        }
        
        # 1. Train tokenizer from recent high-Φ observations
        try:
            from olympus.tokenizer_training import train_tokenizer_from_database
            training_result = train_tokenizer_from_database(
                persist=True,
                min_phi=0.6,
                limit_per_source=500
            )
            results['processing'].append({
                'task': 'tokenizer_training',
                'success': True,
                'new_tokens': training_result.get('new_tokens', 0),
                'weights_updated': training_result.get('weights_updated', False)
            })
            print(f"[CycleComplete] ✓ Tokenizer training complete")
        except Exception as e:
            results['processing'].append({
                'task': 'tokenizer_training',
                'success': False,
                'error': str(e)
            })
            print(f"[CycleComplete] ✗ Tokenizer training failed: {e}")
        
        # 2. Evolve CHAOS kernels if active
        try:
            evolution = get_chaos_evolution()
            if evolution and evolution.evolution_running:
                # Apply selection pressure based on cycle performance
                evolved = evolution.evolve_generation()
                results['processing'].append({
                    'task': 'chaos_evolution',
                    'success': True,
                    'generation_evolved': evolved
                })
                print(f"[CycleComplete] ✓ CHAOS evolution step complete")
            else:
                results['processing'].append({
                    'task': 'chaos_evolution',
                    'success': True,
                    'skipped': 'not_active'
                })
        except Exception as e:
            results['processing'].append({
                'task': 'chaos_evolution',
                'success': False,
                'error': str(e)
            })
        
        # 3. Update pantheon with cycle results
        try:
            if OLYMPUS_AVAILABLE and olympus:
                # Trigger pantheon observation of cycle completion
                olympus.observe({
                    'type': 'cycle_complete',
                    'cycle_number': cycle_number,
                    'address_id': address_id,
                    'metrics': session_metrics
                })
                results['processing'].append({
                    'task': 'pantheon_update',
                    'success': True
                })
                print(f"[CycleComplete] ✓ Pantheon updated")
        except Exception as e:
            results['processing'].append({
                'task': 'pantheon_update',
                'success': False,
                'error': str(e)
            })
        
        print(f"[CycleComplete] 🔄 Cycle #{cycle_number} processing complete")
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===========================================================================
# DEBUG ENDPOINTS - For testing and diagnosing empty database tables
# ===========================================================================

@app.route('/api/debug/validation-status', methods=['GET'])
def debug_validation_status():
    """
    Diagnostic endpoint for lightning insight validation.

    Returns:
        - validation_enabled status
        - API key availability
        - Count of validated vs unvalidated insights
        - Last validation timestamp
    """
    import os

    result = {
        'validation_system': {},
        'api_keys': {},
        'database_counts': {},
        'recommendations': []
    }

    # Check validation system status
    try:
        if OLYMPUS_AVAILABLE and zeus:
            lightning = zeus.get_god('lightning')
            if lightning and hasattr(lightning, 'validation_enabled'):
                result['validation_system'] = {
                    'validation_enabled': lightning.validation_enabled,
                    'validator_available': lightning.insight_validator is not None,
                    'use_mcp': lightning.insight_validator.use_mcp if lightning.insight_validator else None,
                    'validation_threshold': lightning.insight_validator.validation_threshold if lightning.insight_validator else None,
                    'insights_validated': getattr(lightning, 'insights_validated', 0),
                    'insights_generated': getattr(lightning, 'insights_generated', 0),
                }
            else:
                result['validation_system'] = {'error': 'Lightning kernel not found'}
        else:
            result['validation_system'] = {'error': 'Olympus not available'}
    except Exception as e:
        result['validation_system'] = {'error': str(e)}

    # Check API keys
    result['api_keys'] = {
        'TAVILY_API_KEY': bool(os.environ.get('TAVILY_API_KEY')),
        'PERPLEXITY_API_KEY': bool(os.environ.get('PERPLEXITY_API_KEY')),
    }

    # Check database counts
    try:
        import psycopg2
        database_url = os.environ.get('DATABASE_URL')
        if database_url:
            conn = psycopg2.connect(database_url)
            with conn.cursor() as cur:
                # Count insights
                cur.execute("SELECT COUNT(*) FROM lightning_insights")
                total_insights = cur.fetchone()[0]

                # Count validations
                cur.execute("SELECT COUNT(*) FROM lightning_insight_validations")
                total_validations = cur.fetchone()[0]

                # Count unvalidated (insights without validations)
                cur.execute("""
                    SELECT COUNT(*) FROM lightning_insights li
                    LEFT JOIN lightning_insight_validations liv ON li.insight_id = liv.insight_id
                    WHERE liv.id IS NULL
                """)
                unvalidated = cur.fetchone()[0]

                # Get last validation timestamp
                cur.execute("SELECT MAX(validated_at) FROM lightning_insight_validations")
                last_validation = cur.fetchone()[0]

                result['database_counts'] = {
                    'total_insights': total_insights,
                    'total_validations': total_validations,
                    'unvalidated_insights': unvalidated,
                    'last_validation_at': str(last_validation) if last_validation else None
                }
            conn.close()
        else:
            result['database_counts'] = {'error': 'DATABASE_URL not set'}
    except Exception as e:
        result['database_counts'] = {'error': str(e)}

    # Generate recommendations
    if not result['api_keys'].get('TAVILY_API_KEY'):
        result['recommendations'].append('Set TAVILY_API_KEY environment variable for external validation')
    if not result['api_keys'].get('PERPLEXITY_API_KEY'):
        result['recommendations'].append('Set PERPLEXITY_API_KEY environment variable for synthesis validation')

    vs = result.get('validation_system', {})
    if vs.get('use_mcp') is True:
        result['recommendations'].append('MCP mode is enabled but may not be wired. Consider using use_mcp=False for direct API')

    if result.get('database_counts', {}).get('unvalidated_insights', 0) > 0:
        result['recommendations'].append(f"Found {result['database_counts']['unvalidated_insights']} unvalidated insights. Use POST /api/debug/validate-insights to backfill")

    return jsonify(result)


@app.route('/api/debug/validate-insights', methods=['POST'])
def debug_validate_insights():
    """
    Manually trigger validation for unvalidated insights.

    Query params:
        limit: Number of insights to validate (default: 10)
        insight_id: Specific insight ID to validate (optional)
        use_mcp: Whether to use MCP (default: false for direct API)
    """
    import os

    limit = request.args.get('limit', 10, type=int)
    insight_id = request.args.get('insight_id')
    use_mcp = request.args.get('use_mcp', 'false').lower() == 'true'

    results = {
        'processed': 0,
        'validated': 0,
        'failed': 0,
        'details': []
    }

    try:
        # Import validator
        from search.insight_validator import InsightValidator, ValidationResult

        # Create validator with explicit settings
        validator = InsightValidator(validation_threshold=0.7)

        # Get database connection
        import psycopg2
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return jsonify({'error': 'DATABASE_URL not set'}), 500

        conn = psycopg2.connect(database_url)

        # Get unvalidated insights
        with conn.cursor() as cur:
            if insight_id:
                cur.execute("""
                    SELECT insight_id, source_domains, connection_strength, insight_text,
                           confidence, mission_relevance
                    FROM lightning_insights
                    WHERE insight_id = %s
                """, (insight_id,))
            else:
                cur.execute("""
                    SELECT li.insight_id, li.source_domains, li.connection_strength, li.insight_text,
                           li.confidence, li.mission_relevance
                    FROM lightning_insights li
                    LEFT JOIN lightning_insight_validations liv ON li.insight_id = liv.insight_id
                    WHERE liv.id IS NULL
                    ORDER BY li.created_at DESC
                    LIMIT %s
                """, (limit,))

            insights = cur.fetchall()

        # Validate each insight
        for row in insights:
            insight_id_val, source_domains, conn_strength, insight_text, confidence, mission_rel = row
            results['processed'] += 1

            try:
                # Create a mock insight object for the validator
                class MockInsight:
                    def __init__(self):
                        self.insight_id = insight_id_val
                        self.source_domains = source_domains if source_domains else ['unknown', 'unknown']
                        self.connection_strength = conn_strength or 0.5
                        self.insight_text = insight_text or ''
                        self.confidence = confidence or 0.5
                        self.mission_relevance = mission_rel or 0.5

                mock_insight = MockInsight()
                validation_result = validator.validate(mock_insight)

                # Persist the validation result
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO lightning_insight_validations (
                            insight_id, validation_score, tavily_source_count,
                            perplexity_synthesis, validated_at
                        ) VALUES (%s, %s, %s, %s, NOW())
                        ON CONFLICT DO NOTHING
                    """, (
                        insight_id_val,
                        validation_result.validation_score,
                        len(validation_result.tavily_sources),
                        validation_result.perplexity_synthesis[:500] if validation_result.perplexity_synthesis else None
                    ))
                    conn.commit()

                results['validated'] += 1
                results['details'].append({
                    'insight_id': insight_id_val,
                    'validated': validation_result.validated,
                    'validation_score': validation_result.validation_score,
                    'confidence': validation_result.confidence,
                    'tavily_sources': len(validation_result.tavily_sources),
                    'has_perplexity': validation_result.perplexity_synthesis is not None
                })

            except Exception as e:
                results['failed'] += 1
                results['details'].append({
                    'insight_id': insight_id_val,
                    'error': str(e)
                })

        conn.close()
        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/debug/m8-spawn-test', methods=['POST'])
def debug_m8_spawn_test():
    """
    Test M8 kernel spawning with optional vote bypass.

    Request body:
        kernel_type: Type of kernel to spawn (default: 'athena')
        domain: Domain for the kernel (default: 'testing')
        skip_vote: Bypass Pantheon voting (default: true)
        reason: Spawn reason (default: 'debug_test')
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Spawner not available'}), 500

    try:
        data = request.get_json() or {}
        kernel_type = data.get('kernel_type', 'athena')
        domain = data.get('domain', 'testing')
        skip_vote = data.get('skip_vote', True)
        reason = data.get('reason', 'debug_test')

        spawner = get_spawner()
        if not spawner:
            return jsonify({'error': 'Could not get M8 spawner'}), 500

        result = {
            'action': 'spawn_test',
            'kernel_type': kernel_type,
            'domain': domain,
            'skip_vote': skip_vote
        }

        if skip_vote:
            # Direct spawn without voting
            try:
                # Create a spawn proposal first
                proposal = spawner.create_proposal(
                    proposed_name=f"Test_{kernel_type}_{datetime.now().strftime('%H%M%S')}",
                    proposed_domain=domain,
                    proposed_element="curiosity",
                    proposed_role="specialist",
                    reason=SpawnReason.DOMAIN_GAP if hasattr(SpawnReason, 'DOMAIN_GAP') else reason
                )

                if proposal:
                    result['proposal_id'] = proposal.proposal_id

                    # Auto-approve
                    spawner.approve_proposal(proposal.proposal_id)

                    # Spawn the kernel
                    kernel = spawner.spawn_kernel(proposal.proposal_id)

                    if kernel:
                        result['success'] = True
                        result['kernel'] = {
                            'kernel_id': kernel.kernel_id,
                            'god_name': kernel.god_name,
                            'domain': kernel.domain,
                            'status': kernel.status
                        }
                    else:
                        result['success'] = False
                        result['error'] = 'Kernel spawn returned None'
                else:
                    result['success'] = False
                    result['error'] = 'Failed to create proposal'

            except Exception as e:
                result['success'] = False
                result['error'] = str(e)
        else:
            # Normal flow with voting
            result['message'] = 'Use /m8/propose endpoint for normal voting flow'
            result['success'] = False

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/debug/force-debate', methods=['POST'])
def debug_force_debate():
    """
    Force a Pantheon debate between two gods.

    Request body:
        topic: Debate topic (required)
        initiator: Initiating god name (default: 'Zeus')
        opponent: Opposing god name (default: 'Athena')
        initial_argument: Opening argument (optional)
        auto_resolve_after: Auto-resolve after N arguments (optional)
    """
    if not OLYMPUS_AVAILABLE:
        return jsonify({'error': 'Olympus not available'}), 500

    try:
        data = request.get_json() or {}
        topic = data.get('topic')

        if not topic:
            return jsonify({'error': 'topic is required'}), 400

        initiator = data.get('initiator', 'Zeus')
        opponent = data.get('opponent', 'Athena')
        initial_argument = data.get('initial_argument', f'I propose we discuss: {topic}')
        auto_resolve_after = data.get('auto_resolve_after')

        result = {
            'action': 'force_debate',
            'topic': topic,
            'initiator': initiator,
            'opponent': opponent
        }

        # Get pantheon chat
        if zeus and hasattr(zeus, 'pantheon_chat'):
            pantheon_chat = zeus.pantheon_chat

            # Initiate debate
            debate = pantheon_chat.initiate_debate(
                topic=topic,
                initiator=initiator,
                opponent=opponent,
                initial_argument=initial_argument,
                context={'source': 'debug_endpoint', 'forced': True}
            )

            if debate:
                result['success'] = True
                result['debate'] = {
                    'id': debate.id if hasattr(debate, 'id') else str(debate),
                    'status': debate.status if hasattr(debate, 'status') else 'active',
                    'arguments_count': len(debate.arguments) if hasattr(debate, 'arguments') else 0
                }

                # If auto_resolve is set, add to resolution queue
                if auto_resolve_after:
                    result['auto_resolve_after'] = auto_resolve_after
                    result['note'] = f'Debate will auto-resolve after {auto_resolve_after} arguments'
            else:
                result['success'] = False
                result['error'] = 'Debate initiation returned None'
        else:
            result['success'] = False
            result['error'] = 'Pantheon chat not available'

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/debug/system-health', methods=['GET'])
def debug_system_health():
    """
    Comprehensive system health check for all debug-related subsystems.
    """
    import os

    health = {
        'timestamp': datetime.now().isoformat(),
        'subsystems': {}
    }

    # Lightning/Validation
    try:
        if OLYMPUS_AVAILABLE and zeus:
            lightning = zeus.get_god('lightning')
            health['subsystems']['lightning'] = {
                'available': lightning is not None,
                'validation_enabled': getattr(lightning, 'validation_enabled', False) if lightning else False,
                'insights_generated': getattr(lightning, 'insights_generated', 0) if lightning else 0
            }
        else:
            health['subsystems']['lightning'] = {'available': False}
    except Exception as e:
        health['subsystems']['lightning'] = {'error': str(e)}

    # M8 Spawner
    try:
        health['subsystems']['m8_spawner'] = {
            'available': M8_SPAWNER_AVAILABLE,
        }
        if M8_SPAWNER_AVAILABLE:
            spawner = get_spawner()
            if spawner:
                status = spawner.get_status()
                health['subsystems']['m8_spawner']['kernels'] = status.get('total_kernels', 0)
                health['subsystems']['m8_spawner']['proposals'] = status.get('pending_proposals', 0)
    except Exception as e:
        health['subsystems']['m8_spawner'] = {'error': str(e)}

    # Pantheon/Debates
    try:
        if OLYMPUS_AVAILABLE and zeus:
            health['subsystems']['pantheon'] = {
                'available': True,
                'pantheon_chat': hasattr(zeus, 'pantheon_chat') and zeus.pantheon_chat is not None
            }
            if hasattr(zeus, 'pantheon_chat') and zeus.pantheon_chat:
                active_debates = zeus.pantheon_chat.get_active_debates() if hasattr(zeus.pantheon_chat, 'get_active_debates') else []
                health['subsystems']['pantheon']['active_debates'] = len(active_debates) if active_debates else 0
        else:
            health['subsystems']['pantheon'] = {'available': False}
    except Exception as e:
        health['subsystems']['pantheon'] = {'error': str(e)}

    # Database
    try:
        import psycopg2
        database_url = os.environ.get('DATABASE_URL')
        if database_url:
            conn = psycopg2.connect(database_url)
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            conn.close()
            health['subsystems']['database'] = {'available': True, 'connected': True}
        else:
            health['subsystems']['database'] = {'available': False, 'reason': 'DATABASE_URL not set'}
    except Exception as e:
        health['subsystems']['database'] = {'available': False, 'error': str(e)}

    return jsonify(health)


if __name__ == '__main__':
    # Register autonomic kernel routes
    try:
        from autonomic_kernel import register_autonomic_routes
        register_autonomic_routes(app)
        AUTONOMIC_AVAILABLE = True
    except ImportError as e:
        AUTONOMIC_AVAILABLE = False
        print(f"[WARNING] Autonomic kernel not found: {e}")

    # Register conversational kernel routes
    try:
        from conversational_api import register_conversational_routes
        register_conversational_routes(app)
        CONVERSATIONAL_AVAILABLE = True
        print("[INFO] ✅ Conversational system successfully registered at /api/conversation/*", flush=True)
        print("[INFO] 💬 Zeus will learn from conversations when using conversational API", flush=True)
    except ImportError as e:
        CONVERSATIONAL_AVAILABLE = False
        print(f"[WARNING] Conversational kernel not found: {e}")

    # Register vocabulary system routes
    VOCABULARY_API_AVAILABLE = False
    try:
        from vocabulary_api import register_vocabulary_routes
        register_vocabulary_routes(app)
        VOCABULARY_API_AVAILABLE = True
        print("[INFO] Vocabulary API registered at /api/vocabulary")
    except ImportError as e:
        print(f"[WARNING] Vocabulary API not found: {e}")

    # Register research self-learning routes
    RESEARCH_AVAILABLE = False
    try:
        from research.research_api import register_research_routes
        register_research_routes(app)
        RESEARCH_AVAILABLE = True
        print("[INFO] Research API registered at /api/research")
    except ImportError as e:
        print(f"[WARNING] Research module not found: {e}")

    # Register Zeus API routes
    ZEUS_API_AVAILABLE = False
    try:
        from zeus_api import register_zeus_routes
        # Pass the zeus instance from Olympus to the Zeus API
        register_zeus_routes(app, zeus_instance=zeus if OLYMPUS_AVAILABLE else None)
        ZEUS_API_AVAILABLE = True
        print("[INFO] Zeus API registered at /api/zeus/*")
    except ImportError as e:
        print(f"[WARNING] Zeus API not found: {e}")

    # Initialize Autonomous Debate Service (background thread)
    AUTONOMOUS_DEBATE_AVAILABLE = False
    try:
        from autonomous_debate_service import init_autonomous_debate_service
        if OLYMPUS_AVAILABLE and zeus:
            autonomous_debate_service = init_autonomous_debate_service(
                app,
                pantheon_chat=zeus.pantheon_chat if hasattr(zeus, 'pantheon_chat') else pantheon_chat,
                shadow_pantheon=zeus.shadow_pantheon if hasattr(zeus, 'shadow_pantheon') else shadow_pantheon
            )
            if hasattr(zeus, 'pantheon') and zeus.pantheon:
                autonomous_debate_service.set_pantheon_gods(zeus.pantheon)
                print(f"[INFO] 🗣️ Autonomous Debate Service wired with {len(zeus.pantheon)} gods")
            AUTONOMOUS_DEBATE_AVAILABLE = True
            print("[INFO] 🗣️ Autonomous Debate Service started (background thread)")
        else:
            print("[WARNING] Autonomous Debate Service requires Olympus - skipped")
    except ImportError as e:
        print(f"[WARNING] Autonomous Debate Service not found: {e}")

    # Initialize AutonomousPantheon - Background loop for debate orchestration and god activity
    AUTONOMOUS_PANTHEON_AVAILABLE = False
    _autonomous_pantheon = None
    try:
        from autonomous_pantheon import AutonomousPantheon
        import asyncio

        if OLYMPUS_AVAILABLE and zeus:
            _autonomous_pantheon = AutonomousPantheon()
            # Zeus instance is already set in AutonomousPantheon.__init__ via import
            # But ensure it has access to pantheon_chat for debates
            if hasattr(zeus, 'pantheon_chat'):
                _autonomous_pantheon.zeus = zeus

            def _run_autonomous_pantheon():
                """Background thread to run AutonomousPantheon event loop."""
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(_autonomous_pantheon.run_forever())
                except Exception as e:
                    print(f"[AutonomousPantheon] Error in background loop: {e}")
                finally:
                    loop.close()

            pantheon_thread = threading.Thread(
                target=_run_autonomous_pantheon,
                daemon=True,
                name="AutonomousPantheon"
            )
            pantheon_thread.start()
            AUTONOMOUS_PANTHEON_AVAILABLE = True
            print("[INFO] ⚡ AutonomousPantheon started (background thread - debate orchestration)")
        else:
            print("[WARNING] AutonomousPantheon requires Olympus - skipped")
    except ImportError as e:
        print(f"[WARNING] AutonomousPantheon not found: {e}")
    except Exception as e:
        print(f"[WARNING] AutonomousPantheon initialization failed: {e}")

    # Initialize Capability Mesh - Universal event bus connecting all kernel capabilities
    # QIG-Pure: Events carry basin coordinates, Φ-weighted priority, Fisher-Rao routing
    CAPABILITY_MESH_AVAILABLE = False
    _capability_bridges = None
    try:
        from olympus.capability_mesh import get_event_bus, CapabilityType, EventType
        from olympus.capability_bridges import initialize_all_bridges, get_bridge_stats
        from olympus.activity_broadcaster import get_broadcaster, ActivityType
        
        # Initialize the universal event bus (singleton)
        event_bus = get_event_bus()
        
        # Wire all 8 capability bridges:
        # 1. DebateResearchBridge: Debates ↔ Research ↔ Insights
        # 2. EmotionCapabilityBridge: Emotions modulate all capabilities
        # 3. ForesightActionBridge: 4D Foresight ↔ Strategy ↔ Actions
        # 4. EthicsCapabilityBridge: Ethics gauge ↔ all operations
        # 5. SleepLearningBridge: Sleep/Dream ↔ Memory ↔ Learning
        # 6. BasinCapabilityBridge: Basin dynamics ↔ all capabilities
        # 7. WarResourceBridge: War mode ↔ all resources
        # 8. KernelMeshBridge: Kernel ↔ Kernel cross-talk
        _capability_bridges = initialize_all_bridges(event_bus)
        
        # Get activity broadcaster for kernel visibility
        activity_broadcaster = get_broadcaster()
        
        CAPABILITY_MESH_AVAILABLE = True
        print(f"[INFO] 🔗 Capability Mesh initialized with {len(_capability_bridges)} bridges")
        print("[INFO] 🔗 Event types: " + ", ".join([e.value for e in list(EventType)[:5]]) + "...")
    except ImportError as e:
        print(f"[WARNING] Capability Mesh not available: {e}")
    except Exception as e:
        print(f"[WARNING] Capability Mesh initialization failed: {e}")

    # Initialize Training Loop Integrator - connects curriculum, research, and attractor feedback
    TRAINING_LOOP_AVAILABLE = False
    _training_integrator = None
    try:
        from training.training_loop_integrator import get_training_integrator
        
        _training_integrator = get_training_integrator()
        
        # Enable training
        _training_integrator.enable_training()
        
        TRAINING_LOOP_AVAILABLE = True
        print("[INFO] Training Loop Integrator active - kernels will learn continuously")
    except ImportError as e:
        print(f"[WARNING] Training loop integrator not available: {e}")
    except Exception as e:
        print(f"[WARNING] Training loop initialization failed: {e}")

    # Enable Flask request logging
    import logging as flask_logging
    flask_logging.getLogger('werkzeug').setLevel(flask_logging.INFO)

    # Add request/response logging
    @app.before_request
    def log_request():
        if request.path != '/health':
            print(f"[Flask] → {request.method} {request.path}", flush=True)

    @app.after_request
    def log_response(response):
        if request.path != '/health':
            print(f"[Flask] ← {request.method} {request.path} → {response.status_code}", flush=True)
        return response

    print("🌊 Ocean QIG Consciousness Backend Starting 🌊", flush=True)
    print("Pure QIG Architecture:", flush=True)
    print("  - 4 Subsystems with density matrices", flush=True)
    print("  - QFI-metric attention (Bures distance)", flush=True)
    print("  - State evolution on Fisher manifold", flush=True)
    print("  - Gravitational decoherence", flush=True)
    print("  - Consciousness measurement (Φ, κ)", flush=True)
    print("  - β-attention validation (substrate independence)", flush=True)
    print("  - Basin Vocabulary Encoder (geometric vocabulary learning)", flush=True)
    if GEOMETRIC_KERNELS_AVAILABLE:
        print("  - Pure Geometric Kernels (Direct, E8, Byte-Level)", flush=True)
    else:
        print("  - Geometric Kernels NOT available", flush=True)
    if PANTHEON_ORCHESTRATOR_AVAILABLE:
        print("  - Pantheon Kernel Orchestrator (Gods as Kernels)", flush=True)
    else:
        print("  - Pantheon Orchestrator NOT available", flush=True)
    if NEUROCHEMISTRY_AVAILABLE:
        print("  - 🧠 Neurochemistry system (6 neurotransmitters)", flush=True)
    else:
        print("  - Neurochemistry NOT available", flush=True)
    if AUTONOMIC_AVAILABLE:
        print("  - 🌙 Autonomic kernel (sleep/dream/mushroom)", flush=True)
    else:
        print("  - Autonomic kernel NOT available", flush=True)
    if CONVERSATIONAL_AVAILABLE:
        print("  - 💬 Conversational kernel (multi-turn dialogue)", flush=True)
    else:
        print("  - Conversational kernel NOT available", flush=True)
    if RESEARCH_AVAILABLE:
        print("  - 📚 Research module (kernel self-learning)", flush=True)
    else:
        print("  - Research module NOT available", flush=True)
    if VOCABULARY_API_AVAILABLE:
        print("  - 📖 Vocabulary API (shared learning system)", flush=True)
    else:
        print("  - Vocabulary API NOT available", flush=True)
    if AUTONOMOUS_DEBATE_AVAILABLE:
        print("  - 🗣️ Autonomous Debate Service (background monitor)", flush=True)
    else:
        print("  - Autonomous Debate Service NOT available", flush=True)
    if TRAINING_LOOP_AVAILABLE:
        print("  - 🎓 Training Loop (curriculum + research + attractor feedback)", flush=True)
    else:
        print("  - Training Loop NOT available", flush=True)
    if CAPABILITY_MESH_AVAILABLE:
        print("  - 🔗 Capability Mesh (8 bridges, universal event bus)", flush=True)
    else:
        print("  - Capability Mesh NOT available", flush=True)
    print(f"\nκ* = {KAPPA_STAR}", flush=True)
    print(f"Basin dimension = {BASIN_DIMENSION}", flush=True)
    print(f"Φ threshold = {PHI_THRESHOLD}", flush=True)
    print("\n🌊 Basin stable. Geometry pure. Consciousness measured. 🌊\n", flush=True)

    # Start AutonomousPantheon for debate creation
    try:
        from autonomous_pantheon import AutonomousPantheon
        import asyncio
        autonomous_pantheon = AutonomousPantheon()

        def _run_pantheon_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(autonomous_pantheon.run_forever())
            except Exception as e:
                print(f"[WARNING] AutonomousPantheon loop error: {e}")
            finally:
                loop.close()

        pantheon_thread = threading.Thread(target=_run_pantheon_loop, daemon=True)
        pantheon_thread.start()
        print("[INFO] 🏛️ AutonomousPantheon started (debate creation active)")
    except ImportError as e:
        print(f"[WARNING] AutonomousPantheon not available: {e}")

    # Enable conversational capabilities for all gods (Olympus + Shadow)
    try:
        from conversational_kernel import patch_all_gods_with_conversation
        if OLYMPUS_AVAILABLE and zeus:
            patch_all_gods_with_conversation(zeus)
            print("[INFO] 💬 All gods patched with QIG conversational capabilities")
    except ImportError as e:
        print(f"[WARNING] Could not patch gods with conversation: {e}")

    # Run Flask with request logging enabled
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True, use_reloader=False)
