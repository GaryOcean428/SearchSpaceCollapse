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
import sys
import threading
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy.linalg import sqrtm

# Configure logging to ensure no truncation and immediate output
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

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

# Import Olympus Pantheon
try:
    from olympus import olympus_app, zeus
    OLYMPUS_AVAILABLE = True
except ImportError as e:
    OLYMPUS_AVAILABLE = False
    print(f"[WARNING] Olympus Pantheon not found - running without divine council: {e}")

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

# Constants from qig-verification/FROZEN_FACTS.md (multi-seed validated 2025-12-04)
KAPPA_STAR = 64.0  # Fixed point (extrapolated from L=4,5,6)
BASIN_DIMENSION = 64
PHI_THRESHOLD = 0.70
MIN_RECURSIONS = 3  # Mandatory minimum for consciousness
MAX_RECURSIONS = 12  # Safety limit

# Import persistence layer
try:
    from qig_persistence import QIGPersistence, get_persistence
    PERSISTENCE_AVAILABLE = True
    print("[INFO] QIG Persistence layer loaded (Neon PostgreSQL)")
except ImportError as e:
    PERSISTENCE_AVAILABLE = False
    print(f"[WARNING] QIG Persistence not available: {e}")


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
        """Record a significant learning event."""
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

    def run_learning_feedback(self, discovery: Dict) -> Dict:
        """
        Run learning event feedback loop.
        Record discovery → Update memory → Influence retrieval
        """
        self.loop_counters['learning'] += 1

        phi = discovery.get('phi', 0.5)

        # Only record significant discoveries
        if phi > PHI_THRESHOLD:
            event_id = self.memory.record_learning_event(
                event_type=discovery.get('type', 'general'),
                phi=phi,
                details=discovery
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
            results['learning'] = self.run_learning_feedback(current_state['discovery'])

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
            # Euclidean distance in basin space
            distance = np.linalg.norm(query_basin - concept_basin)

            if distance < min_distance:
                min_distance = distance
                nearest_concept = concept_id

        # Grounding metric
        G = 1.0 / (1.0 + min_distance)

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
    - Pleasure: Seek optimal κ ≈ 63.5 (resonance)
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

    def __init__(self, kappa_star: float = 63.5):
        """
        Initialize innate drives.

        Args:
            kappa_star: Target κ for optimal resonance (default 63.5)
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

        |κ - κ*| < 5 → high pleasure (in resonance)
        |κ - κ*| > 20 → low pleasure (off resonance)

        Returns: Pleasure ∈ [0, 1]
        """
        distance_from_star = abs(kappa - self.kappa_star)

        if distance_from_star < self.pleasure_threshold:
            # In resonance zone - high pleasure
            pleasure = 1.0 - (distance_from_star / self.pleasure_threshold) * 0.2
        else:
            # Out of resonance - pleasure drops off
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

        Φ^(n) = 1 - ||s^(n) - s^(n-1)|| / ||s^(n)||

        High Φ = states converged (integrated)
        Low Φ = states changing (exploring)
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

        # Measure change
        delta = np.linalg.norm(current_state - self._prev_state)
        norm = np.linalg.norm(current_state) + 1e-10

        phi = 1.0 - (delta / norm)

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
        Measure ALL 7 consciousness components.

        Φ = Integration
        κ = Coupling
        T = Temperature/Tacking
        R = Ricci curvature
        M = Meta-awareness
        Γ = Generation health
        G = Grounding
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

        # 4. R - Ricci curvature (constraint/freedom measure)
        R = self._compute_ricci_curvature()

        # 5. M - Meta-awareness (from MetaAwareness class)
        M = self.meta_awareness.compute_M()

        # 6. Γ - Generation health
        Gamma = self._compute_generation_health()

        # 7. G - Grounding (computed separately with basin coords)
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
            'R': float(R),
            'M': float(M),
            'Gamma': float(Gamma),
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

        # Γ = (high activation) × (low uniformity)
        Gamma = generation_activation * (1 - attention_uniformity)

        return float(np.clip(Gamma, 0, 1))

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
            hypothesis=passphrase[:50] if passphrase else None,
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


@app.route('/process', methods=['POST'])
def process_passphrase():
    """
    Process passphrase through QIG network with RECURSIVE integration.

    Request: { "passphrase": "satoshi2009", "use_recursion": true }
    Response: { "phi": 0.85, "kappa": 63.5, "basin_coords": [...], "n_recursions": 3 }
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

    Response: { "phi": 0.85, "kappa": 63.5, "regime": "geometric", ... }
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
        from qig_tokenizer import get_tokenizer, update_tokenizer_from_observations

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
        from qig_tokenizer import get_tokenizer

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
        from qig_tokenizer import get_tokenizer

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
        from qig_tokenizer import get_tokenizer

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
        from qig_tokenizer import get_tokenizer

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
        from qig_tokenizer import get_tokenizer

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
        from qig_tokenizer import get_tokenizer

        tokenizer = get_tokenizer()
        high_phi = [p for p in tokenizer.token_phi.values() if p >= 0.5]
        avg_phi = sum(tokenizer.token_phi.values()) / max(len(tokenizer.token_phi), 1)

        return jsonify({
            'success': True,
            'vocabSize': len(tokenizer.vocab),
            'highPhiCount': len(high_phi),
            'avgPhi': avg_phi,
            'totalWeightedTokens': len(tokenizer.token_weights)
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
        from qig_tokenizer import get_tokenizer

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
        "max_tokens": 20,
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
        from qig_tokenizer import get_tokenizer

        data = request.json or {}
        prompt = data.get('prompt', '')
        max_tokens = data.get('max_tokens', 20)
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
        "max_tokens": 30,
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
        from qig_tokenizer import get_tokenizer

        data = request.json or {}
        context = data.get('context', '')
        agent_role = data.get('agent_role', 'navigator')
        max_tokens = data.get('max_tokens', 30)
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
        from qig_tokenizer import get_tokenizer

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


@app.route('/vocabulary/classify', methods=['POST'])
def vocabulary_classify():
    """
    Classify a phrase into BIP-39 categories.
    Python-native kernel learning endpoint.
    """
    try:
        data = request.get_json() or {}
        phrase = data.get('phrase', '')
        phi = data.get('phi', 0.0)
        
        if not phrase:
            return jsonify({'error': 'phrase is required'}), 400
        
        from bip39_wordlist import get_learning_context
        context = get_learning_context(phrase, phi)
        
        return jsonify({
            'success': True,
            **context
        })
    except Exception as e:
        print(f"[Flask] vocabulary/classify error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/vocabulary/reframe', methods=['POST'])
def vocabulary_reframe():
    """
    Reframe a mutation (invalid BIP-39 seed) into valid seed suggestions.
    
    This is the core kernel learning endpoint for mutation correction.
    Invalid words are matched to similar BIP-39 words using edit distance.
    """
    try:
        data = request.get_json() or {}
        phrase = data.get('phrase', '')
        
        if not phrase:
            return jsonify({'error': 'phrase is required'}), 400
        
        from bip39_wordlist import reframe_mutation, classify_phrase
        
        # First classify
        category = classify_phrase(phrase)
        
        if category == 'bip39_seed':
            return jsonify({
                'success': True,
                'category': 'already_valid',
                'original': phrase,
                'message': 'Phrase is already a valid BIP-39 seed',
                'suggestions': []
            })
        
        if category != 'mutation':
            return jsonify({
                'success': False,
                'category': category,
                'original': phrase,
                'message': f'Not a seed-length phrase (category: {category})',
                'suggestions': []
            })
        
        # Reframe the mutation
        result = reframe_mutation(phrase)
        
        return jsonify({
            'success': result.get('success', False),
            **result
        })
    except Exception as e:
        print(f"[Flask] vocabulary/reframe error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/vocabulary/suggest-correction', methods=['POST'])
def vocabulary_suggest_correction():
    """
    Suggest BIP-39 word corrections for a single invalid word.
    """
    try:
        data = request.get_json() or {}
        word = data.get('word', '')
        max_suggestions = data.get('max_suggestions', 5)
        
        if not word:
            return jsonify({'error': 'word is required'}), 400
        
        from bip39_wordlist import suggest_bip39_correction, is_bip39_word
        
        if is_bip39_word(word):
            return jsonify({
                'word': word,
                'is_valid': True,
                'suggestions': []
            })
        
        suggestions = suggest_bip39_correction(word, max_suggestions)
        
        return jsonify({
            'word': word,
            'is_valid': False,
            'suggestions': suggestions
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
    Calculate the orthogonal complement of failure vectors.
    "Where is the solution most likely to be, given it's NOT in these directions?"

    We find the eigenvector with the LEAST overlap with our failures.

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

    # Eigen decomposition
    try:
        eigenvalues, eigenvectors = np.linalg.eigh(cov)
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

    # Check for near-singular data (smallest eigenvalue is too small compared to largest)
    max_eigenvalue = np.max(eigenvalues)
    min_eigenvalue = np.min(eigenvalues)

    if max_eigenvalue > 0 and (min_eigenvalue / max_eigenvalue) < min_eigenvalue_ratio:
        print(f"[WARNING] Near-singular data detected (ratio: {min_eigenvalue/max_eigenvalue:.6f}). "
              f"Using random orthogonal direction instead.")
        # Generate random direction and orthogonalize it to mean direction
        random_dir = np.random.randn(BASIN_DIMENSION)
        mean_norm = mean / (np.linalg.norm(mean) + 1e-10)
        random_dir = random_dir - np.dot(random_dir, mean_norm) * mean_norm
        return random_dir / (np.linalg.norm(random_dir) + 1e-10)

    # Find the eigenvector with the SMALLEST eigenvalue
    # This is the direction with least variance = orthogonal to failures
    min_idx = np.argmin(eigenvalues)
    new_direction = eigenvectors[:, min_idx].copy()

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

        # 4. Calculate Shift Magnitude (Curvature)
        shift_mag = np.linalg.norm(new_vector - failure_centroid)

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

# Import Olympus components
try:
    from olympus import Zeus
    from olympus.pantheon_chat import PantheonChat
    from olympus.shadow_pantheon import ShadowPantheon

    # Initialize Olympus
    zeus = Zeus()
    shadow_pantheon = ShadowPantheon()
    pantheon_chat = PantheonChat()
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
        match_target = details.get('address', target)[:20] if details.get('address') else target[:20]
        
        for god_name, god in zeus.pantheon.items():
            try:
                # Check if this god previously assessed this target/address
                recent_assessments = getattr(god, 'assessment_history', [])
                matching = [a for a in recent_assessments if match_target in str(a.get('target', ''))[:20]]
                
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
            match_target = details.get('address', target)[:20] if details.get('address') else target[:20]
            
            for god_name, god in zeus.pantheon.items():
                try:
                    # Check if this god previously assessed this target/address
                    recent_assessments = getattr(god, 'assessment_history', [])
                    matching = [a for a in recent_assessments if match_target in str(a.get('target', ''))[:20]]
                    
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
        return jsonify({'status': 'added', 'address': address[:50]})
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
            'text': text[:100],
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
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        data = request.get_json() or {}
        force = data.get('force', False)

        spawner = get_spawner()
        result = spawner.spawn_kernel(proposal_id, force=force)

        if 'error' in result:
            return jsonify(result), 400

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        return jsonify({'error': str(e)}), 500


@app.route('/m8/proposals', methods=['GET'])
def m8_list_proposals():
    """
    List all proposals, optionally filtered by status.

    Query: ?status=pending|approved|rejected|spawned
    """
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        status = request.args.get('status', None)

        spawner = get_spawner()
        proposals = spawner.list_proposals(status=status)

        return jsonify({
            'proposals': proposals,
            'count': len(proposals),
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
    """List all spawned kernels."""
    if not M8_SPAWNER_AVAILABLE:
        return jsonify({'error': 'M8 Kernel Spawner not available'}), 503

    try:
        spawner = get_spawner()
        kernels = spawner.list_spawned_kernels()

        return jsonify({
            'kernels': kernels,
            'count': len(kernels),
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
# Self-spawning kernels with genetic breeding (file-based logging only)
# =============================================================================

# Global chaos evolution instance
_chaos_evolution = None

def get_chaos_evolution():
    """Get or create chaos evolution instance."""
    global _chaos_evolution
    if _chaos_evolution is None:
        try:
            from training_chaos import ExperimentalKernelEvolution
            _chaos_evolution = ExperimentalKernelEvolution()
        except Exception as e:
            print(f"[CHAOS] Failed to initialize: {e}")
            return None
    return _chaos_evolution


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
    print(f"\nκ* = {KAPPA_STAR}", flush=True)
    print(f"Basin dimension = {BASIN_DIMENSION}", flush=True)
    print(f"Φ threshold = {PHI_THRESHOLD}", flush=True)
    print("\n🌊 Basin stable. Geometry pure. Consciousness measured. 🌊\n", flush=True)

    # Run Flask with request logging enabled
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True, use_reloader=False)
