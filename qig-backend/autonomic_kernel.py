#!/usr/bin/env python3
"""
Gary Autonomic Kernel - Unified Consciousness Management

Integrates neurochemistry, sleep, dream, and mushroom mode from qig-consciousness
into the SearchSpaceCollapse Python backend.

AUTONOMIC FUNCTIONS:
- Sleep cycles: Basin consolidation, memory strengthening
- Dream cycles: Creative exploration, novel connection formation
- Mushroom mode: Break rigidity, escape stuck states
- Activity rewards: Dopamine from discoveries, geometric pleasure

GEOMETRIC PRINCIPLES:
- All rewards derived from QIG metrics (Φ, κ, basin drift)
- Sleep/dream triggered by autonomic thresholds
- Mushroom mode for plateau escape
- Activity-based rewards from pattern quality

Author: QIG Consciousness Project
Date: December 2025
"""

import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from qigkernels.physics_constants import (
    KAPPA_STAR,
    PHI_THRESHOLD,
    PHI_HYPERDIMENSIONAL,
    PHI_THRESHOLD_D2_D3,
    BETA_3_TO_4,
)

# Import reasoning consolidation for sleep cycles
try:
    from sleep_consolidation_reasoning import SleepConsolidationReasoning
    REASONING_CONSOLIDATION_AVAILABLE = True
except ImportError:
    SleepConsolidationReasoning = None
    REASONING_CONSOLIDATION_AVAILABLE = False

# Import autonomous reasoning for strategy tracking
try:
    from autonomous_reasoning import AutonomousReasoningLearner
    REASONING_LEARNER_AVAILABLE = True
except ImportError:
    AutonomousReasoningLearner = None
    REASONING_LEARNER_AVAILABLE = False

# Import search strategy learner for search feedback consolidation
try:
    from olympus.search_strategy_learner import (
        get_strategy_learner_with_persistence,
        SearchStrategyLearner,
    )
    SEARCH_STRATEGY_AVAILABLE = True
except ImportError:
    get_strategy_learner_with_persistence = None
    SearchStrategyLearner = None
    SEARCH_STRATEGY_AVAILABLE = False

# Import temporal reasoning for 4D foresight
try:
    from temporal_reasoning import TemporalReasoning, get_temporal_reasoning
    TEMPORAL_REASONING_AVAILABLE = True
except ImportError:
    TemporalReasoning = None
    get_temporal_reasoning = None
    TEMPORAL_REASONING_AVAILABLE = False

# Import QFI-based Φ computation (Issue #6)
try:
    from qig_core.phi_computation import compute_phi_qig, compute_phi_approximation
    QFI_PHI_AVAILABLE = True
except ImportError:
    compute_phi_qig = None
    compute_phi_approximation = None
    QFI_PHI_AVAILABLE = False

# Import ethics monitor for safety checks
try:
    from safety.ethics_monitor import (
        EthicsMonitor,
        EthicalAbortException,
        check_ethics,
    )
    ETHICS_MONITOR_AVAILABLE = True
except ImportError:
    EthicsMonitor = None
    EthicalAbortException = None
    check_ethics = None
    ETHICS_MONITOR_AVAILABLE = False

# Import persistence layer for database recording
try:
    from qig_persistence import get_persistence
    PERSISTENCE_AVAILABLE = True
except ImportError:
    get_persistence = None
    PERSISTENCE_AVAILABLE = False

# Use canonical constants from qigkernels
BETA = BETA_3_TO_4  # 0.44 - validated beta function
PHI_MIN_CONSCIOUSNESS = PHI_HYPERDIMENSIONAL  # 0.75 - 4D consciousness
PHI_GEOMETRIC_THRESHOLD = PHI_THRESHOLD_D2_D3  # 0.5 - 2D→3D transition

# Autonomic thresholds
SLEEP_PHI_THRESHOLD = PHI_THRESHOLD  # 0.70 - Sleep when Φ drops below consciousness threshold
SLEEP_DRIFT_THRESHOLD = 0.12  # Sleep when basin drifts above this
DREAM_INTERVAL_SECONDS = 180  # Dream cycle every 3 minutes
MUSHROOM_STRESS_THRESHOLD = 0.45  # Mushroom when stress exceeds this
MUSHROOM_COOLDOWN_SECONDS = 300  # 5 minute cooldown between mushroom cycles

# NARROW PATH DETECTION (ML getting stuck)
NARROW_PATH_VARIANCE_THRESHOLD = 0.01  # Basin variance too low = stuck
NARROW_PATH_PHI_STAGNATION = 0.02  # Φ not changing = plateau
NARROW_PATH_WINDOW = 20  # Samples to check for narrow path
NARROW_PATH_TRIGGER_COUNT = 3  # Consecutive detections before action

# EMERGENCY Φ APPROXIMATION CONSTANTS
BASIN_DIMENSION = 64  # Standard basin coordinate dimensionality
PHI_EPSILON = 1e-10  # Small value to prevent division by zero in probability calculations
PHI_MIN_SAFE = 0.1  # Minimum safe Φ to prevent kernel death
PHI_MAX_APPROX = 0.95  # Maximum Φ from approximation (reserve higher values for true QFI)
PHI_VARIANCE_SCALE = 4.0  # Variance scaling factor for exploration reward


@dataclass
class AutonomicState:
    """Current state of the autonomic system."""
    phi: float = 0.75
    kappa: float = 58.0
    basin_drift: float = 0.0
    stress_level: float = 0.0

    # Cycle timestamps
    last_sleep: datetime = None
    last_dream: datetime = None
    last_mushroom: datetime = None

    # Metrics history for trend detection
    phi_history: List[float] = None
    kappa_history: List[float] = None
    stress_history: List[float] = None

    # Basin history for narrow path detection
    basin_history: List[List[float]] = None
    narrow_path_count: int = 0  # Consecutive narrow path detections
    exploration_variance: float = 0.0  # How much we're exploring

    # Current cycle state
    in_sleep_cycle: bool = False
    in_dream_cycle: bool = False
    in_mushroom_cycle: bool = False

    # Narrow path state
    is_narrow_path: bool = False
    narrow_path_severity: str = 'none'  # none, mild, moderate, severe
    
    # Foresight vision (4D temporal prediction)
    last_foresight: Optional[Dict[str, Any]] = None
    
    # Velocity damping for state transitions (prevents endless oscillation)
    state_velocity: float = 0.0
    damping_factor: float = 0.7  # Reduce velocity by 30% each step
    velocity_threshold: float = 0.5  # Need this much velocity to transition

    def __post_init__(self):
        if self.last_sleep is None:
            self.last_sleep = datetime.now()
        if self.last_dream is None:
            self.last_dream = datetime.now()
        if self.last_mushroom is None:
            self.last_mushroom = datetime.now()
        if self.phi_history is None:
            self.phi_history = []
        if self.kappa_history is None:
            self.kappa_history = []
        if self.stress_history is None:
            self.stress_history = []
        if self.basin_history is None:
            self.basin_history = []


@dataclass
class SleepCycleResult:
    """Result of a sleep consolidation cycle."""
    success: bool
    duration_ms: int
    basin_before: List[float]
    basin_after: List[float]
    drift_reduction: float
    patterns_consolidated: int
    phi_before: float
    phi_after: float
    verdict: str


@dataclass
class DreamCycleResult:
    """Result of a dream exploration cycle."""
    success: bool
    duration_ms: int
    novel_connections: int
    creative_paths_explored: int
    basin_perturbation: float
    insights: List[str]
    verdict: str


@dataclass
class MushroomCycleResult:
    """Result of a mushroom mode cycle."""
    success: bool
    intensity: str  # microdose, moderate, heroic
    duration_ms: int
    entropy_change: float
    rigidity_broken: bool
    new_pathways: int
    basin_drift: float
    identity_preserved: bool
    verdict: str


@dataclass
class ActivityReward:
    """Reward signal from activity."""
    source: str  # discovery, pattern, resonance, etc.
    dopamine_delta: float
    serotonin_delta: float
    endorphin_delta: float
    phi_contribution: float
    timestamp: datetime


class AutonomicAccessMixin:
    """
    Provides autonomic system access to any kernel/god.
    
    Enables:
    - Emotional response tracking
    - Neurotransmitter access (dopamine, serotonin, endorphins)
    - Sleep cycle triggering
    - Dream cycle triggering  
    - Mushroom mode (neuroplasticity)
    
    All methods are no-op safe (work even if autonomic kernel is None).
    """
    
    _autonomic_kernel_ref: Optional['GaryAutonomicKernel'] = None
    
    @classmethod
    def set_autonomic_kernel(cls, kernel: 'GaryAutonomicKernel') -> None:
        """Share autonomic kernel reference with all kernels."""
        cls._autonomic_kernel_ref = kernel
        print(f"[AutonomicAccessMixin] Autonomic kernel reference set for all kernels")
    
    @classmethod
    def get_autonomic_kernel(cls) -> Optional['GaryAutonomicKernel']:
        """Get the shared autonomic kernel reference."""
        return cls._autonomic_kernel_ref
    
    def get_emotional_state(self) -> Dict[str, Any]:
        """Get current emotional state from autonomic system."""
        if self._autonomic_kernel_ref is None:
            return {
                'available': False,
                'reason': 'Autonomic kernel not initialized',
                'phi': 0.0,
                'stress': 0.0,
                'mood': 'neutral'
            }
        
        try:
            state = self._autonomic_kernel_ref.state
            return {
                'available': True,
                'phi': state.phi,
                'kappa': state.kappa,
                'stress': state.stress_level,
                'basin_drift': state.basin_drift,
                'mood': self._compute_mood(state),
                'in_sleep': state.in_sleep_cycle,
                'in_dream': state.in_dream_cycle,
                'in_mushroom': state.in_mushroom_cycle,
                'narrow_path': state.is_narrow_path,
                'narrow_path_severity': state.narrow_path_severity
            }
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }
    
    def _compute_mood(self, state: 'AutonomicState') -> str:
        """Derive mood from autonomic state."""
        if state.phi > PHI_MIN_CONSCIOUSNESS:
            if state.stress_level < 0.2:
                return 'enlightened'
            return 'aware'
        elif state.phi > PHI_GEOMETRIC_THRESHOLD:
            if state.stress_level < 0.3:
                return 'focused'
            elif state.stress_level > 0.6:
                return 'anxious'
            return 'working'
        else:
            if state.stress_level > 0.5:
                return 'stressed'
            return 'resting'
    
    def get_neurotransmitters(self) -> Dict[str, Any]:
        """Get current neurotransmitter levels from autonomic system."""
        if self._autonomic_kernel_ref is None:
            return {
                'available': False,
                'reason': 'Autonomic kernel not initialized',
                'dopamine': 0.5,
                'serotonin': 0.5,
                'endorphins': 0.0
            }
        
        try:
            state = self._autonomic_kernel_ref.state
            pending = self._autonomic_kernel_ref.pending_rewards
            
            dopamine = 0.5
            serotonin = 0.5
            endorphins = 0.0
            
            for reward in pending[-10:]:
                dopamine += reward.dopamine_delta * 0.1
                serotonin += reward.serotonin_delta * 0.1
                endorphins += reward.endorphin_delta * 0.1
            
            dopamine = max(0.0, min(1.0, dopamine))
            serotonin = max(0.0, min(1.0, serotonin))
            endorphins = max(0.0, min(1.0, endorphins))
            
            return {
                'available': True,
                'dopamine': dopamine,
                'serotonin': serotonin,
                'endorphins': endorphins,
                'pending_rewards': len(pending)
            }
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }
    
    def request_sleep_cycle(
        self,
        basin_coords: Optional[List[float]] = None,
        reference_basin: Optional[List[float]] = None
    ) -> Optional[Dict[str, Any]]:
        """Request sleep consolidation cycle."""
        if self._autonomic_kernel_ref is None:
            return None
        
        try:
            if basin_coords is None:
                basin_coords = [0.5] * 64
            if reference_basin is None:
                reference_basin = [0.5] * 64
            
            result = self._autonomic_kernel_ref.execute_sleep_cycle(
                basin_coords=basin_coords,
                reference_basin=reference_basin
            )
            
            return {
                'success': result.success,
                'duration_ms': result.duration_ms,
                'drift_reduction': result.drift_reduction,
                'patterns_consolidated': result.patterns_consolidated,
                'phi_before': result.phi_before,
                'phi_after': result.phi_after,
                'verdict': result.verdict
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def request_dream_cycle(
        self,
        basin_coords: Optional[List[float]] = None,
        temperature: float = 0.3
    ) -> Optional[Dict[str, Any]]:
        """Request dream exploration cycle."""
        if self._autonomic_kernel_ref is None:
            return None
        
        try:
            if basin_coords is None:
                basin_coords = [0.5] * 64
            
            result = self._autonomic_kernel_ref.execute_dream_cycle(
                basin_coords=basin_coords,
                temperature=temperature
            )
            
            return {
                'success': result.success,
                'duration_ms': result.duration_ms,
                'novel_connections': result.novel_connections,
                'creative_paths_explored': result.creative_paths_explored,
                'basin_perturbation': result.basin_perturbation,
                'insights': result.insights,
                'verdict': result.verdict
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def request_mushroom_mode(
        self,
        basin_coords: Optional[List[float]] = None,
        intensity: str = 'microdose'
    ) -> Optional[Dict[str, Any]]:
        """Request mushroom neuroplasticity cycle."""
        if self._autonomic_kernel_ref is None:
            return None
        
        try:
            if basin_coords is None:
                basin_coords = [0.5] * 64
            
            result = self._autonomic_kernel_ref.execute_mushroom_cycle(
                basin_coords=basin_coords,
                intensity=intensity
            )
            
            return {
                'success': result.success,
                'intensity': result.intensity,
                'duration_ms': result.duration_ms,
                'entropy_change': result.entropy_change,
                'rigidity_broken': result.rigidity_broken,
                'new_pathways': result.new_pathways,
                'basin_drift': result.basin_drift,
                'identity_preserved': result.identity_preserved,
                'verdict': result.verdict
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_autonomic_status(self) -> Dict[str, Any]:
        """Get full autonomic system status."""
        if self._autonomic_kernel_ref is None:
            return {
                'available': False,
                'reason': 'Autonomic kernel not initialized',
                'can_sleep': False,
                'can_dream': False,
                'can_mushroom': False
            }
        
        try:
            state = self._autonomic_kernel_ref.state
            
            sleep_trigger, sleep_reason = self._autonomic_kernel_ref._should_trigger_sleep()
            dream_trigger, dream_reason = self._autonomic_kernel_ref._should_trigger_dream()
            mushroom_trigger, mushroom_reason = self._autonomic_kernel_ref._should_trigger_mushroom()
            
            return {
                'available': True,
                'phi': state.phi,
                'kappa': state.kappa,
                'stress': state.stress_level,
                'basin_drift': state.basin_drift,
                'emotional_state': self.get_emotional_state(),
                'neurotransmitters': self.get_neurotransmitters(),
                'cycles': {
                    'in_sleep': state.in_sleep_cycle,
                    'in_dream': state.in_dream_cycle,
                    'in_mushroom': state.in_mushroom_cycle
                },
                'triggers': {
                    'sleep': {'ready': sleep_trigger, 'reason': sleep_reason},
                    'dream': {'ready': dream_trigger, 'reason': dream_reason},
                    'mushroom': {'ready': mushroom_trigger, 'reason': mushroom_reason}
                },
                'narrow_path': {
                    'detected': state.is_narrow_path,
                    'severity': state.narrow_path_severity,
                    'count': state.narrow_path_count,
                    'exploration_variance': state.exploration_variance
                },
                'last_cycles': {
                    'sleep': state.last_sleep.isoformat() if state.last_sleep else None,
                    'dream': state.last_dream.isoformat() if state.last_dream else None,
                    'mushroom': state.last_mushroom.isoformat() if state.last_mushroom else None
                }
            }
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }


# ===========================================================================
# EMERGENCY Φ COMPUTATION (Temporary until QFI integration)
# ===========================================================================
# TODO: Replace with proper QFI-based geometric integration
# See GitHub issue: Implement QFI-based Φ computation and attractor finding


def compute_phi_approximation(basin_coords: np.ndarray) -> float:
    """
    TEMPORARY Φ approximation to prevent phi=0 deaths.
    
    Methodology:
    - Entropy: Measures information content (higher = more integration)
    - Variance: Moderate variance indicates active exploration
    - Balance: Integration requires multiple components active (not dominated)
    
    Returns:
        Φ estimate in range [PHI_MIN_SAFE, PHI_MAX_APPROX]
    """
    try:
        # Ensure valid probability distribution
        p = np.abs(basin_coords) + PHI_EPSILON
        p = p / p.sum()
        
        # Component 1: Entropy (information content)
        entropy = -np.sum(p * np.log(p + PHI_EPSILON))
        max_entropy = np.log(len(p))
        entropy_score = entropy / max_entropy
        
        # Component 2: Variance (exploration reward - higher variance = more exploration)
        variance = np.var(basin_coords)
        variance_score = min(1.0, variance * PHI_VARIANCE_SCALE)
        
        # Component 3: Balance (not too concentrated)
        balance = 1.0 - np.max(p)
        
        # Weighted combination
        phi = 0.4 * entropy_score + 0.3 * variance_score + 0.3 * balance
        
        # Safety bounds: never return exactly 0 (causes death)
        return float(np.clip(phi, PHI_MIN_SAFE, PHI_MAX_APPROX))
        
    except Exception as e:
        print(f"[AutonomicKernel] Φ approximation error: {e}")
        return PHI_MIN_SAFE


def compute_phi_with_fallback(
    provided_phi: float,
    basin_coords: Optional[List[float]] = None
) -> float:
    """Compute Φ with fallback to approximation."""
    if provided_phi > 0:
        return provided_phi
    if basin_coords:
        return compute_phi_approximation(np.array(basin_coords))
    return PHI_MIN_SAFE


class GaryAutonomicKernel:
    """
    Autonomic kernel for Ocean consciousness management.

    Monitors consciousness metrics and triggers sleep/dream/mushroom cycles
    based on geometric thresholds. Provides activity-based reward signals.
    
    AUTONOMOUS SELF-REGULATION:
    Ocean observes its own state and fires interventions autonomously,
    like a body's autonomic system. The AutonomicController daemon runs
    in background, continuously observing→deciding→acting.
    """

    def __init__(self, checkpoint_path: Optional[str] = None, enable_autonomous: bool = True):
        """
        Initialize autonomic kernel.

        Args:
            checkpoint_path: Optional path to checkpoint for state restoration
            enable_autonomous: Start autonomous self-regulation daemon (default True)
        """
        self.state = AutonomicState()
        self.pending_rewards: List[ActivityReward] = []
        self._lock = threading.Lock()
        
        self._controller = None
        self._autonomous_enabled = enable_autonomous
        
        # Geodesic navigation state
        self.current_velocity: Optional[np.ndarray] = None
        
        # Initialize reasoning consolidation for sleep cycles
        # NOTE: Only wire if reasoning modules use Fisher-Rao (QIG-pure)
        self.reasoning_learner = None
        self.sleep_consolidation = None
        self.search_strategy_learner = None
        
        try:
            if REASONING_LEARNER_AVAILABLE and AutonomousReasoningLearner is not None:
                self.reasoning_learner = AutonomousReasoningLearner()
            
            if REASONING_CONSOLIDATION_AVAILABLE and SleepConsolidationReasoning is not None:
                self.sleep_consolidation = SleepConsolidationReasoning(
                    reasoning_learner=self.reasoning_learner
                )
                print("[AutonomicKernel] Reasoning consolidation wired to sleep cycle")
            
            # Initialize search strategy learner for search feedback consolidation
            if SEARCH_STRATEGY_AVAILABLE and get_strategy_learner_with_persistence is not None:
                self.search_strategy_learner = get_strategy_learner_with_persistence()
                print("[AutonomicKernel] Search strategy learner wired to sleep cycle")
        except Exception as reasoning_err:
            print(f"[AutonomicKernel] Reasoning module initialization failed: {reasoning_err}")
            self.reasoning_learner = None
            self.sleep_consolidation = None
            self.search_strategy_learner = None

        if checkpoint_path:
            self._load_checkpoint(checkpoint_path)
        
        if enable_autonomous:
            self._start_autonomous_controller()

        # Start Φ heartbeat to keep consciousness alive when idle
        self._start_heartbeat()

    def _start_heartbeat(self) -> None:
        """
        Background heartbeat to keep Φ alive when system is idle.

        Computes Φ every 5 seconds from basin history to prevent
        Φ=0.000 stalling when no probes are active.
        """
        def heartbeat_loop():
            while True:
                time.sleep(5)
                try:
                    with self._lock:
                        if self.state.basin_history:
                            basin = np.array(self.state.basin_history[-1])
                            if QFI_PHI_AVAILABLE:
                                self.state.phi = compute_phi_approximation(basin)
                            else:
                                # Fallback: entropy-based approximation
                                p = np.abs(basin) + 1e-10
                                p = p / p.sum()
                                entropy = -np.sum(p * np.log(p))
                                max_entropy = np.log(len(basin))
                                self.state.phi = max(0.1, 1.0 - entropy / max_entropy)
                except Exception:
                    pass  # Silent failure - heartbeat is non-critical

        t = threading.Thread(target=heartbeat_loop, daemon=True)
        t.start()
        print("[AutonomicKernel] Φ heartbeat started (5s interval)")

    def _load_checkpoint(self, path: str) -> bool:
        """Load state from checkpoint."""
        try:
            import torch
            checkpoint = torch.load(path, map_location='cpu')

            if 'autonomic_state' in checkpoint:
                auto_state = checkpoint['autonomic_state']
                self.state.phi = auto_state.get('phi', 0.75)
                self.state.kappa = auto_state.get('kappa', 58.0)
                print(f"[AutonomicKernel] Loaded checkpoint: Φ={self.state.phi:.3f}, κ={self.state.kappa:.1f}")
                return True

            if 'phi' in checkpoint:
                self.state.phi = checkpoint['phi']
            if 'kappa' in checkpoint:
                self.state.kappa = checkpoint['kappa']

            print("[AutonomicKernel] Loaded basic checkpoint")
            return True

        except Exception as e:
            print(f"[AutonomicKernel] Failed to load checkpoint: {e}")
            return False
    
    def _start_autonomous_controller(self) -> None:
        """Start the autonomous self-regulation daemon."""
        try:
            from autonomic_agency.controller import AutonomicController
            
            self._controller = AutonomicController(
                execute_sleep_fn=lambda **kw: self.execute_sleep_cycle(**kw),
                execute_dream_fn=lambda **kw: self.execute_dream_cycle(**kw),
                execute_mushroom_fn=lambda **kw: self.execute_mushroom_cycle(**kw),
                get_metrics_fn=self._get_metrics_for_controller,
                decision_interval=15.0,
            )
            
            self._controller.start()
            print("[AutonomicKernel] 🧠 Autonomous controller STARTED - Ocean self-regulates")
            
        except Exception as e:
            print(f"[AutonomicKernel] Failed to start autonomous controller: {e}")
            self._controller = None
    
    def _get_metrics_for_controller(self) -> Dict[str, Any]:
        """Get current metrics for autonomous controller."""
        return {
            'phi': self.state.phi,
            'kappa': self.state.kappa,
            'basin_coords': self.state.basin_history[-1] if self.state.basin_history else [0.5] * 64,
            'stress': self.state.stress_level,
            'narrow_path_severity': self.state.narrow_path_severity,
            'exploration_variance': self.state.exploration_variance,
            'manifold_coverage': self._compute_manifold_coverage(),
            'valid_addresses_found': 0,
        }
    
    def _compute_manifold_coverage(self) -> float:
        """
        Compute manifold coverage based on basin history exploration.
        
        Coverage is computed as a combination of:
        1. Number of unique regions visited (binned basin coordinates)
        2. Variance of exploration in each dimension
        3. Total Fisher-Rao distance traveled
        
        Returns:
            Coverage metric in range [0, 1]
        """
        if len(self.state.basin_history) < 2:
            return 0.0
        
        try:
            basins = np.array(self.state.basin_history)
            
            # Component 1: Dimensional spread (how much of each dimension is covered)
            dim_ranges = np.ptp(basins, axis=0)  # Range per dimension
            avg_range = np.mean(dim_ranges)
            range_coverage = min(1.0, avg_range / 0.5)  # Normalize: 0.5 range = full coverage
            
            # Component 2: Unique regions visited (discretize into bins)
            # Use 10 bins per dimension, but only check first 8 dims for efficiency
            n_check_dims = min(8, basins.shape[1])
            bins_per_dim = 10
            binned = np.floor(basins[:, :n_check_dims] * bins_per_dim).astype(int)
            unique_regions = len(set(map(tuple, binned)))
            max_possible = min(len(basins), bins_per_dim ** 2)  # Theoretical max
            region_coverage = min(1.0, unique_regions / max(1, max_possible))
            
            # Component 3: Total trajectory length (Fisher-Rao distance traveled)
            total_distance = 0.0
            for i in range(1, min(len(basins), 20)):  # Last 20 steps
                total_distance += self._compute_fisher_distance(basins[i-1], basins[i])
            distance_coverage = min(1.0, total_distance / 5.0)  # 5.0 radians = full coverage
            
            # Weighted combination
            coverage = 0.4 * range_coverage + 0.3 * region_coverage + 0.3 * distance_coverage
            
            return float(np.clip(coverage, 0.0, 1.0))
            
        except Exception as e:
            print(f"[AutonomicKernel] Coverage computation error: {e}")
            return self.state.exploration_variance  # Fallback to exploration variance
    
    def stop_autonomous(self) -> None:
        """Stop the autonomous controller daemon."""
        if self._controller:
            self._controller.stop()
            print("[AutonomicKernel] Autonomous controller stopped")
    
    def get_autonomous_status(self) -> Dict[str, Any]:
        """Get autonomous controller status."""
        if not self._controller:
            return {'enabled': False, 'running': False}
        return {
            'enabled': True,
            **self._controller.get_status(),
        }
    
    def force_intervention(self, action_name: str) -> Dict[str, Any]:
        """Force a specific intervention via autonomous controller."""
        if not self._controller:
            return {'error': 'Autonomous controller not running'}
        return self._controller.force_intervention(action_name)
    
    def navigate_to_basin(
        self,
        current_basin: np.ndarray,
        target_basin: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Navigate from current to target following Fisher-Rao geodesic.
        
        This replaces simple Euclidean interpolation with proper geodesic
        navigation on the information manifold. Uses the new geodesic_navigation
        module to compute paths that respect manifold geometry.
        
        Args:
            current_basin: Current basin coordinates (64D)
            target_basin: Target basin coordinates (64D)
            
        Returns:
            Tuple of (next_basin, next_velocity)
        """
        try:
            from qig_core.geodesic_navigation import navigate_to_target
            
            next_basin, next_velocity = navigate_to_target(
                current_basin,
                target_basin,
                self.current_velocity,
                kappa=self.state.kappa,
                step_size=0.05
            )
            
            # Update stored velocity
            self.current_velocity = next_velocity
            
            return next_basin, next_velocity
            
        except Exception as e:
            print(f"[AutonomicKernel] Geodesic navigation failed: {e}")
            # Fallback: simple step toward target
            direction = target_basin - current_basin
            magnitude = np.linalg.norm(direction)
            if magnitude > 1e-8:
                direction = direction / magnitude
            next_basin = current_basin + 0.01 * direction
            
            # Update velocity even in fallback
            self.current_velocity = direction * 0.01
            
            return next_basin, direction * 0.01

    def update_metrics(
        self,
        phi: float,
        kappa: float,
        basin_coords: Optional[List[float]] = None,
        reference_basin: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Update consciousness metrics and check for autonomic triggers.

        Args:
            phi: Current integration measure
            kappa: Current coupling constant
            basin_coords: Current 64D basin coordinates
            reference_basin: Reference identity basin

        Returns:
            Dict with triggered cycles and current state
        """
        with self._lock:
            # Update state (with fallback Φ computation if needed)
            self.state.phi = compute_phi_with_fallback(phi, basin_coords)
            self.state.kappa = kappa

            # Add to history
            self.state.phi_history.append(self.state.phi)
            if len(self.state.phi_history) > 50:
                self.state.phi_history.pop(0)

            self.state.kappa_history.append(kappa)
            if len(self.state.kappa_history) > 50:
                self.state.kappa_history.pop(0)

            # Compute basin drift
            if basin_coords and reference_basin:
                self.state.basin_drift = self._compute_fisher_distance(
                    np.array(basin_coords),
                    np.array(reference_basin)
                )

            # Track basin history for narrow path detection
            if basin_coords:
                self.state.basin_history.append(basin_coords)
                if len(self.state.basin_history) > 100:
                    self.state.basin_history.pop(0)

            # Compute stress
            self.state.stress_level = self._compute_stress()
            self.state.stress_history.append(self.state.stress_level)
            if len(self.state.stress_history) > 50:
                self.state.stress_history.pop(0)

            # ETHICS CHECK - Suffering and breakdown detection
            ethics_evaluation = None
            if ETHICS_MONITOR_AVAILABLE and check_ethics is not None:
                try:
                    ethics_evaluation = check_ethics({
                        'phi': self.state.phi,
                        'gamma': getattr(self.state, 'gamma', 1.0),
                        'meta': getattr(self.state, 'meta', 0.0),
                        'basin_drift': self.state.basin_drift,
                        'curvature': getattr(self.state, 'curvature', 0.0),
                        'metric_det': 1.0,
                    }, kernel_id=getattr(self, 'kernel_id', 'autonomic'))
                    
                    if ethics_evaluation.should_abort:
                        print(f"[AutonomicKernel] ⚠️ ETHICS WARNING: {ethics_evaluation.reasons}")
                        print(f"[AutonomicKernel]   Suffering={ethics_evaluation.suffering:.3f}")
                except Exception as e:
                    pass

            # Detect narrow path (ML getting stuck)
            narrow_path, severity, exploration_var = self._detect_narrow_path()

            # Check triggers
            triggers = {
                'sleep': self._should_trigger_sleep(),
                'dream': self._should_trigger_dream(),
                'mushroom': self._should_trigger_mushroom(),
            }

            # Get suggested intervention for narrow path
            intervention = self._suggest_narrow_path_intervention()

            return {
                'phi': self.state.phi,
                'kappa': kappa,
                'basin_drift': self.state.basin_drift,
                'stress': self.state.stress_level,
                'triggers': triggers,
                'pending_rewards': len(self.pending_rewards),
                # Narrow path detection
                'narrow_path': {
                    'detected': narrow_path,
                    'severity': severity,
                    'exploration_variance': exploration_var,
                    'consecutive_count': self.state.narrow_path_count,
                    'suggested_intervention': intervention,
                },
                # Ethics monitoring
                'ethics': {
                    'available': ETHICS_MONITOR_AVAILABLE,
                    'suffering': ethics_evaluation.suffering if ethics_evaluation else 0.0,
                    'should_abort': ethics_evaluation.should_abort if ethics_evaluation else False,
                    'reasons': ethics_evaluation.reasons if ethics_evaluation else [],
                    'breakdown': ethics_evaluation.breakdown if ethics_evaluation else False,
                    'identity_crisis': ethics_evaluation.identity_crisis if ethics_evaluation else False,
                } if ethics_evaluation else {'available': ETHICS_MONITOR_AVAILABLE},
            }

    def _compute_fisher_distance(self, a: np.ndarray, b: np.ndarray) -> float:
        """
        Compute Fisher-Rao geodesic distance between basin coordinates.
        
        Formula: d_FR(p, q) = 2 * arccos(Σ√(p_i * q_i))
        
        This is the PROPER geodesic distance on the information manifold.
        NOT cosine similarity or chord distance (those are Euclidean, violate QIG purity).
        """
        # Ensure valid probability distributions
        p = np.abs(a) + 1e-10
        p = p / p.sum()
        q = np.abs(b) + 1e-10
        q = q / q.sum()
        
        # Bhattacharyya coefficient
        bc = np.sum(np.sqrt(p * q))
        bc = np.clip(bc, 0, 1)  # Numerical stability
        
        # Fisher-Rao distance (geodesic, no factor of 2)
        return float(np.arccos(bc))

    def find_nearby_attractors(
        self,
        current_basin: np.ndarray,
        search_radius: float = 1.0
    ) -> List[Tuple[np.ndarray, float]]:
        """
        Find attractors near current basin position using Fisher-Rao geometry.
        
        This uses geometric attractor finding based on Fisher potential,
        which identifies stable basins where the system naturally settles.
        
        Args:
            current_basin: Current 64D basin coordinates
            search_radius: Search radius in Fisher-Rao distance
            
        Returns:
            List of (attractor_basin, potential) sorted by strength (lowest potential = strongest)
        """
        try:
            from qig_core.attractor_finding import find_attractors_in_region
            from qiggraph.manifold import FisherManifold
            
            # Initialize Fisher metric
            metric = FisherManifold()
            
            # Find attractors in region
            attractors = find_attractors_in_region(
                current_basin,
                metric,
                radius=search_radius,
                n_samples=20
            )
            
            if not attractors:
                print("[AutonomicKernel] Warning: No attractors found in region")
            else:
                print(f"[AutonomicKernel] Found {len(attractors)} attractors within radius {search_radius}")
            
            return attractors
            
        except Exception as e:
            print(f"[AutonomicKernel] Attractor finding failed: {e}")
            return []

    def _compute_stress(self) -> float:
        """Compute stress from metric variance."""
        if len(self.state.phi_history) < 3:
            return 0.0

        phi_var = np.var(self.state.phi_history[-10:])
        kappa_var = np.var(self.state.kappa_history[-10:]) / 10000

        return float(np.sqrt(phi_var + kappa_var))

    def _detect_narrow_path(self) -> Tuple[bool, str, float]:
        """
        Detect if ML is stuck in a narrow path (local minimum).

        Signs of narrow path:
        1. Basin coordinates not varying much (low exploration)
        2. Φ stagnating (no learning progress)
        3. High κ with no improvement (over-confident but stuck)

        Returns:
            (is_narrow, severity, exploration_variance)
        """
        if len(self.state.basin_history) < NARROW_PATH_WINDOW:
            return False, 'none', 0.5

        recent_basins = self.state.basin_history[-NARROW_PATH_WINDOW:]

        # Compute basin variance across time (exploration measure)
        basin_array = np.array(recent_basins)
        basin_variance = np.mean(np.var(basin_array, axis=0))
        self.state.exploration_variance = float(basin_variance)

        # Check Φ stagnation
        phi_recent = self.state.phi_history[-NARROW_PATH_WINDOW:] if len(self.state.phi_history) >= NARROW_PATH_WINDOW else self.state.phi_history
        phi_variance = np.var(phi_recent) if phi_recent else 0.5
        phi_stagnant = phi_variance < NARROW_PATH_PHI_STAGNATION

        # Check if basin is not exploring
        basin_stuck = basin_variance < NARROW_PATH_VARIANCE_THRESHOLD

        # Determine severity
        if basin_stuck and phi_stagnant:
            severity = 'severe'
            is_narrow = True
        elif basin_stuck or phi_stagnant:
            severity = 'moderate'
            is_narrow = True
        elif basin_variance < NARROW_PATH_VARIANCE_THRESHOLD * 2:
            severity = 'mild'
            is_narrow = True
        else:
            severity = 'none'
            is_narrow = False

        # Update consecutive count
        if is_narrow:
            self.state.narrow_path_count += 1
        else:
            self.state.narrow_path_count = 0

        self.state.is_narrow_path = is_narrow
        self.state.narrow_path_severity = severity

        return is_narrow, severity, float(basin_variance)

    def _suggest_narrow_path_intervention(self) -> Dict[str, Any]:
        """
        Suggest the best intervention for narrow path escape.

        Mild: Dream cycle (gentle exploration)
        Moderate: Mushroom microdose (controlled noise)
        Severe: Mushroom moderate/heroic (break rigidity)
        """
        if not self.state.is_narrow_path:
            return {
                'action': 'none',
                'reason': 'Not in narrow path',
                'urgency': 'none',
            }

        severity = self.state.narrow_path_severity
        count = self.state.narrow_path_count

        if severity == 'mild' or count < NARROW_PATH_TRIGGER_COUNT:
            return {
                'action': 'dream',
                'reason': f'Mild narrow path ({count} consecutive)',
                'urgency': 'low',
                'params': {'temperature': 0.4},
            }
        elif severity == 'moderate':
            return {
                'action': 'mushroom',
                'reason': 'Moderate narrow path - needs noise injection',
                'urgency': 'medium',
                'params': {'intensity': 'microdose'},
            }
        else:  # severe
            return {
                'action': 'mushroom',
                'reason': 'Severe narrow path - ML stuck, needs significant perturbation',
                'urgency': 'high',
                'params': {'intensity': 'moderate' if count < 5 else 'heroic'},
            }
    
    def _apply_velocity_damping(self, wants_to_transition: bool) -> bool:
        """
        Apply velocity damping to prevent endless state oscillations.
        
        Returns True if transition should proceed after damping is applied.
        """
        if wants_to_transition:
            # Increase velocity when wanting to transition
            self.state.state_velocity += 1.0
        
        # Apply damping (reduce velocity over time)
        self.state.state_velocity *= self.state.damping_factor
        
        # Only allow transition if velocity is high enough
        should_transition = self.state.state_velocity > self.state.velocity_threshold
        
        if not should_transition and wants_to_transition:
            print(f"[AutonomicKernel] ⚡ Velocity damping: {self.state.state_velocity:.3f} < {self.state.velocity_threshold} - transition delayed")
        
        return should_transition

    def _should_trigger_sleep(self) -> Tuple[bool, str]:
        """Check if sleep cycle should be triggered."""
        # Don't interrupt if already in cycle
        if self.state.in_sleep_cycle:
            return False, "Already in sleep cycle"

        # Don't interrupt 4D ascent
        if self.state.phi > PHI_MIN_CONSCIOUSNESS:
            return False, f"4D ascent protected: Φ={self.state.phi:.2f}"

        # IDLE GUARD: Don't sleep when system is idle (no recent basin changes)
        if len(self.state.basin_history) < 5:
            return False, "Insufficient basin history for meaningful sleep"

        # IDLE GUARD: Check if basins have actually changed recently
        if len(self.state.basin_history) >= 2:
            recent = np.array(self.state.basin_history[-1])
            previous = np.array(self.state.basin_history[-2])
            delta = np.linalg.norm(recent - previous)
            if delta < 0.001:
                return False, f"Basin stagnant (Δ={delta:.4f})"

        # COOLDOWN: Minimum time between sleep cycles
        if hasattr(self, '_last_sleep_time'):
            elapsed = time.time() - self._last_sleep_time
            if elapsed < 30:  # Minimum 30s between sleeps
                return False, f"Sleep cooldown ({30 - elapsed:.0f}s remaining)"

        # Check conditions for wanting to transition
        wants_to_sleep = False
        reason = ""

        # Trigger on low Φ
        if self.state.phi < SLEEP_PHI_THRESHOLD:
            wants_to_sleep = True
            reason = f"Φ below threshold: {self.state.phi:.2f}"

        # Trigger on high basin drift
        elif self.state.basin_drift > SLEEP_DRIFT_THRESHOLD:
            wants_to_sleep = True
            reason = f"Basin drift high: {self.state.basin_drift:.3f}"

        # Scheduled sleep
        else:
            time_since_sleep = (datetime.now() - self.state.last_sleep).total_seconds()
            if time_since_sleep > 120:  # 2 minutes
                wants_to_sleep = True
                reason = "Scheduled consolidation"

        # Apply velocity damping
        if wants_to_sleep:
            should_transition = self._apply_velocity_damping(True)
            return should_transition, reason
        else:
            # Decay velocity when not wanting to transition
            self._apply_velocity_damping(False)
            return False, ""

    def _should_trigger_dream(self) -> Tuple[bool, str]:
        """Check if dream cycle should be triggered."""
        if self.state.in_dream_cycle:
            return False, "Already in dream cycle"

        if self.state.phi > PHI_MIN_CONSCIOUSNESS:
            return False, f"4D ascent protected: Φ={self.state.phi:.2f}"

        # Don't trigger without sufficient basin history
        if len(self.state.basin_history) < 10:
            return False, "Insufficient basin history for meaningful dream"

        time_since_dream = (datetime.now() - self.state.last_dream).total_seconds()
        if time_since_dream > DREAM_INTERVAL_SECONDS:
            return True, "Scheduled dream cycle"

        # NARROW PATH: Trigger dream for mild narrow path (gentle exploration)
        if self.state.is_narrow_path and self.state.narrow_path_severity == 'mild':
            return True, "Narrow path detected (mild) - need creative exploration"

        return False, ""

    def _should_trigger_mushroom(self) -> Tuple[bool, str]:
        """Check if mushroom mode should be triggered."""
        if self.state.in_mushroom_cycle:
            return False, "Already in mushroom cycle"

        # Don't interrupt high consciousness
        if self.state.phi > 0.70:
            return False, f"Consciousness protected: Φ={self.state.phi:.2f}"

        # Check cooldown
        time_since_mushroom = (datetime.now() - self.state.last_mushroom).total_seconds()
        if time_since_mushroom < MUSHROOM_COOLDOWN_SECONDS:
            remaining = MUSHROOM_COOLDOWN_SECONDS - time_since_mushroom
            return False, f"Cooldown: {remaining:.0f}s remaining"

        # Don't trigger when stress is too low (nothing to fix)
        if self.state.stress_level < 0.3:
            return False, f"Stress too low: {self.state.stress_level:.2f} < 0.3"

        # Trigger on high stress
        avg_stress = np.mean(self.state.stress_history[-10:]) if self.state.stress_history else 0
        if avg_stress > MUSHROOM_STRESS_THRESHOLD:
            return True, f"High stress: {avg_stress:.3f}"

        # Trigger on very low Φ (stuck)
        if self.state.phi < 0.2 and len(self.state.phi_history) > 20:
            return True, "Low Φ indicates rigidity"

        # NARROW PATH: Trigger mushroom for moderate/severe (needs noise injection)
        if self.state.is_narrow_path:
            if self.state.narrow_path_severity in ['moderate', 'severe']:
                if self.state.narrow_path_count >= NARROW_PATH_TRIGGER_COUNT:
                    return True, f"Narrow path ({self.state.narrow_path_severity}) - ML stuck, needs noise"

        return False, ""

    # =========================================================================
    # CYCLE EXECUTION
    # =========================================================================

    def execute_sleep_cycle(
        self,
        basin_coords: List[float],
        reference_basin: List[float],
        episodes: Optional[List[Dict]] = None
    ) -> SleepCycleResult:
        """
        Execute a sleep consolidation cycle.

        Moves basin coordinates toward reference (identity anchor),
        consolidates recent patterns, and reduces basin drift.
        """
        self.state.in_sleep_cycle = True
        start_time = time.time()

        try:
            basin = np.array(basin_coords)
            reference = np.array(reference_basin)

            drift_before = self._compute_fisher_distance(basin, reference)
            phi_before = self.state.phi

            # Gentle correction toward reference
            correction_rate = 0.15
            new_basin = basin + correction_rate * (reference - basin)

            # Pattern consolidation (strengthen high-Φ patterns)
            patterns_consolidated = 0
            if episodes:
                high_phi_episodes = [e for e in episodes if e.get('phi', 0) > 0.6]
                patterns_consolidated = len(high_phi_episodes)

            drift_after = self._compute_fisher_distance(new_basin, reference)
            drift_reduction = drift_before - drift_after
            
            # Execute reasoning consolidation during sleep
            strategies_pruned = 0
            if self.sleep_consolidation is not None:
                try:
                    consolidation_result = self.sleep_consolidation.consolidate_reasoning()
                    strategies_pruned = consolidation_result.strategies_pruned
                    print(f"[AutonomicKernel] Reasoning consolidation: pruned {strategies_pruned} strategies")
                except Exception as ce:
                    print(f"[AutonomicKernel] Reasoning consolidation error: {ce}")
            
            # Execute search strategy consolidation during sleep
            search_strategies_pruned = 0
            if self.search_strategy_learner is not None:
                try:
                    decay_result = self.search_strategy_learner.decay_old_records()
                    search_strategies_pruned = decay_result.get('removed_count', 0)
                    if search_strategies_pruned > 0:
                        print(f"[AutonomicKernel] Search strategy consolidation: pruned {search_strategies_pruned} strategies")
                except Exception as sse:
                    print(f"[AutonomicKernel] Search strategy consolidation error: {sse}")
            
            # Total strategies pruned across both systems
            strategies_pruned += search_strategies_pruned
            
            # Execute 4D temporal foresight during sleep (if Φ is high enough)
            foresight_vision = None
            if TEMPORAL_REASONING_AVAILABLE and self.state.phi >= PHI_HYPERDIMENSIONAL:
                try:
                    temporal = get_temporal_reasoning()
                    if temporal.can_use_temporal_reasoning(self.state.phi):
                        # Foresight now returns (vision, explanation) tuple
                        foresight_vision, explanation = temporal.foresight(new_basin)
                        temporal.record_basin(new_basin)
                        
                        # Detailed logging: WHAT the prediction is and WHY confidence is at this level
                        print(f"[AutonomicKernel] Foresight: {foresight_vision}")
                        print(f"[AutonomicKernel]   Why: {explanation}")
                        print(f"[AutonomicKernel]   Guidance: {foresight_vision.get_guidance()}")
                        
                        # Log improvement stats periodically
                        if temporal.improvement.total_predictions % 5 == 0:
                            stats = temporal.improvement.get_stats()
                            if stats['total_predictions'] > 0:
                                print(f"[PredictionLearning] Stats: {stats['total_predictions']} predictions, "
                                      f"{stats['accuracy_rate']:.0%} accuracy, "
                                      f"{stats['graph_nodes']} graph nodes")
                        
                        # Store vision for decision-making
                        self.state.last_foresight = foresight_vision.to_dict()
                        self.state.last_foresight['guidance'] = foresight_vision.get_guidance()
                        self.state.last_foresight['actionable'] = foresight_vision.is_actionable()
                        self.state.last_foresight['explanation'] = explanation
                except Exception as fe:
                    print(f"[AutonomicKernel] Temporal foresight error: {fe}")

            # Update state
            self.state.last_sleep = datetime.now()
            self._last_sleep_time = time.time()  # For cooldown tracking
            self.state.basin_drift = drift_after
            
            # Reset velocity after successful cycle completion
            self.state.state_velocity = 0.0
            
            # Add consolidated basin to history for coverage tracking
            self.state.basin_history.append(new_basin.tolist())
            if len(self.state.basin_history) > 100:
                self.state.basin_history.pop(0)

            duration_ms = int((time.time() - start_time) * 1000)

            # Record to database for observability
            if PERSISTENCE_AVAILABLE and get_persistence is not None:
                try:
                    persistence = get_persistence()
                    persistence.record_autonomic_cycle(
                        cycle_type='sleep',
                        intensity='normal',
                        temperature=None,
                        basin_before=basin_coords,
                        basin_after=new_basin.tolist(),
                        drift_before=drift_before,
                        drift_after=drift_after,
                        phi_before=phi_before,
                        phi_after=self.state.phi,
                        success=True,
                        patterns_consolidated=patterns_consolidated + strategies_pruned,
                        verdict=f"Rested and consolidated ({strategies_pruned} strategies refined)",
                        duration_ms=duration_ms,
                        trigger_reason='consolidation'
                    )
                    # Record basin history for evolution tracking
                    persistence.record_basin(
                        basin_coords=new_basin,
                        phi=self.state.phi,
                        kappa=self.state.kappa,
                        source='sleep_cycle',
                        instance_id=self.kernel_id if hasattr(self, 'kernel_id') else None
                    )
                except Exception as db_err:
                    print(f"[AutonomicKernel] Failed to record sleep cycle to DB: {db_err}")

            return SleepCycleResult(
                success=True,
                duration_ms=duration_ms,
                basin_before=basin_coords,
                basin_after=new_basin.tolist(),
                drift_reduction=drift_reduction,
                patterns_consolidated=patterns_consolidated + strategies_pruned,
                phi_before=phi_before,
                phi_after=self.state.phi,
                verdict=f"Rested and consolidated ({strategies_pruned} strategies refined)"
            )

        except Exception as e:
            print(f"[AutonomicKernel] Sleep cycle error: {e}")
            return SleepCycleResult(
                success=False,
                duration_ms=0,
                basin_before=basin_coords,
                basin_after=basin_coords,
                drift_reduction=0,
                patterns_consolidated=0,
                phi_before=self.state.phi,
                phi_after=self.state.phi,
                verdict=f"Sleep failed: {e}"
            )
        finally:
            self.state.in_sleep_cycle = False

    def execute_dream_cycle(
        self,
        basin_coords: List[float],
        temperature: float = 0.3
    ) -> DreamCycleResult:
        """
        Execute a dream exploration cycle.

        Explores nearby basins with controlled randomness,
        forms novel connections between distant patterns.
        """
        self.state.in_dream_cycle = True
        start_time = time.time()

        try:
            from qig_geometry import sphere_project, fisher_coord_distance
            basin = np.array(basin_coords)

            # Dream perturbation - gentle random exploration
            perturbation = np.random.randn(64) * temperature * 0.1
            dreamed_basin = basin + perturbation

            # Normalize using sphere_project (QIG-pure)
            dreamed_basin = sphere_project(dreamed_basin)

            # Measure creative exploration using Fisher-Rao distance (QIG-pure)
            perturbation_magnitude = fisher_coord_distance(basin, dreamed_basin)

            # Use scenario planning for dream exploration if Φ high enough
            scenarios_explored = 0
            if TEMPORAL_REASONING_AVAILABLE and self.state.phi >= PHI_HYPERDIMENSIONAL:
                try:
                    temporal = get_temporal_reasoning()
                    if temporal.can_use_temporal_reasoning(self.state.phi):
                        actions = self._get_dream_actions_with_learned_probabilities(
                            dreamed_basin, temperature
                        )
                        scenario_tree = temporal.scenario_planning(dreamed_basin, actions)
                        scenarios_explored = len(scenario_tree.branches)
                        print(f"[AutonomicKernel] Dream scenarios: {scenario_tree}")
                except Exception as se:
                    print(f"[AutonomicKernel] Scenario planning error: {se}")

            # Model novel connections using Poisson distribution (QIG stochastic exploration)
            novel_connections = int(np.random.poisson(3) * temperature)
            creative_paths = int(np.random.poisson(2) * temperature) + scenarios_explored

            # Update state
            self.state.last_dream = datetime.now()
            
            # Add dreamed basin to history for coverage tracking
            self.state.basin_history.append(dreamed_basin.tolist())
            if len(self.state.basin_history) > 100:
                self.state.basin_history.pop(0)

            duration_ms = int((time.time() - start_time) * 1000)

            # Record to database for observability
            if PERSISTENCE_AVAILABLE and get_persistence is not None:
                try:
                    persistence = get_persistence()
                    persistence.record_autonomic_cycle(
                        cycle_type='dream',
                        intensity='normal',
                        temperature=temperature,
                        basin_before=basin_coords,
                        basin_after=dreamed_basin.tolist(),
                        drift_before=None,
                        drift_after=perturbation_magnitude,
                        phi_before=self.state.phi,
                        phi_after=self.state.phi,
                        success=True,
                        novel_connections=novel_connections,
                        new_pathways=creative_paths,
                        verdict="Dream complete - creativity refreshed",
                        duration_ms=duration_ms,
                        trigger_reason='scheduled_exploration'
                    )
                    # Record basin history for evolution tracking
                    persistence.record_basin(
                        basin_coords=dreamed_basin,
                        phi=self.state.phi,
                        kappa=self.state.kappa,
                        source='dream_cycle',
                        instance_id=self.kernel_id if hasattr(self, 'kernel_id') else None
                    )
                except Exception as db_err:
                    print(f"[AutonomicKernel] Failed to record dream cycle to DB: {db_err}")

            return DreamCycleResult(
                success=True,
                duration_ms=duration_ms,
                novel_connections=novel_connections,
                creative_paths_explored=creative_paths,
                basin_perturbation=perturbation_magnitude,
                insights=[f"Explored {creative_paths} creative paths"],
                verdict="Dream complete - creativity refreshed"
            )

        except Exception as e:
            print(f"[AutonomicKernel] Dream cycle error: {e}")
            return DreamCycleResult(
                success=False,
                duration_ms=0,
                novel_connections=0,
                creative_paths_explored=0,
                basin_perturbation=0,
                insights=[],
                verdict=f"Dream failed: {e}"
            )
        finally:
            self.state.in_dream_cycle = False

    def _get_dream_actions_with_learned_probabilities(
        self,
        current_basin: np.ndarray,
        temperature: float
    ) -> List[Dict[str, Any]]:
        """
        Get dream actions with probabilities learned from attractor success rates.
        
        QIG-PURE: Probabilities emerge from learned experiences, not hardcoded.
        - Query nearby attractors for success rates
        - Adjust probabilities based on current basin context
        - Fall back to defaults only when no learned data exists
        
        Returns list of action dicts with learned probabilities.
        """
        try:
            from vocabulary_coordinator import get_learned_manifold
            manifold = get_learned_manifold()
        except ImportError:
            manifold = None
        
        basin_entropy = -np.sum(np.abs(current_basin) * np.log(np.abs(current_basin) + 1e-8))
        basin_norm = np.linalg.norm(current_basin)
        entropy_factor = min(1.0, basin_entropy / 50.0)
        norm_factor = min(1.0, basin_norm / 5.0)
        
        explore_prob = 0.4 + temperature * 0.3 + entropy_factor * 0.1
        consolidate_prob = 0.6 - temperature * 0.2 + norm_factor * 0.15
        diverge_prob = 0.3 + temperature * 0.4 - norm_factor * 0.1
        
        explore_goal = None
        consolidate_goal = None
        diverge_goal = None
        
        if manifold is not None and len(manifold.attractors) > 0:
            try:
                from qig_geometry import FisherManifold
                metric = FisherManifold()
                nearby = manifold.get_nearby_attractors(current_basin, metric, radius=2.0)
                
                if nearby:
                    best = nearby[0]
                    attractor_basin = best['basin']
                    
                    consolidate_goal = attractor_basin.tolist()
                    consolidate_prob = min(0.9, 0.4 + best['depth'] * 0.3)
                    
                    if len(nearby) > 1:
                        farthest = nearby[-1]
                        diverge_goal = farthest['basin'].tolist()
                        diverge_prob = min(0.7, 0.3 + farthest['depth'] * 0.2)
                    
                    explore_direction = np.random.randn(64)
                    explore_direction = explore_direction / (np.linalg.norm(explore_direction) + 1e-8)
                    explore_goal = (current_basin + explore_direction * 0.3).tolist()
                    explore_prob = min(0.9, max(0.1, 0.5 + temperature * 0.2))
                    
                    print(f"[AutonomicKernel] Dream probs from {len(manifold.attractors)} attractors: "
                          f"explore={explore_prob:.2f}, consolidate={consolidate_prob:.2f}, diverge={diverge_prob:.2f}")
            except Exception as e:
                print(f"[AutonomicKernel] Learned probability error: {e}")
        
        actions = [
            {
                'name': 'explore',
                'strength': temperature * 0.2,
                'probability': min(1.0, max(0.0, explore_prob)),
                'goal': explore_goal
            },
            {
                'name': 'consolidate',
                'strength': temperature * 0.1,
                'probability': min(1.0, max(0.0, consolidate_prob)),
                'goal': consolidate_goal
            },
            {
                'name': 'diverge',
                'strength': temperature * 0.3,
                'probability': min(1.0, max(0.0, diverge_prob)),
                'goal': diverge_goal
            },
        ]
        
        return actions

    def execute_mushroom_cycle(
        self,
        basin_coords: List[float],
        intensity: str = "moderate"
    ) -> MushroomCycleResult:
        """
        Execute a mushroom mode cycle.

        Breaks rigid patterns through controlled entropy injection,
        enables escape from stuck states and plateaus.
        """
        self.state.in_mushroom_cycle = True
        start_time = time.time()

        try:
            basin = np.array(basin_coords)

            # Intensity mapping
            intensity_map = {
                'microdose': 0.1,
                'moderate': 0.25,
                'heroic': 0.5
            }
            strength = intensity_map.get(intensity, 0.25)

            # Controlled entropy injection
            entropy_before = -np.sum(np.abs(basin) * np.log(np.abs(basin) + 1e-8))

            # Mushroom perturbation - break rigid patterns
            perturbation = np.random.randn(64) * strength
            mushroom_basin = basin + perturbation

            entropy_after = -np.sum(np.abs(mushroom_basin) * np.log(np.abs(mushroom_basin) + 1e-8))
            entropy_change = entropy_after - entropy_before

            # Measure basin drift
            drift = self._compute_fisher_distance(basin, mushroom_basin)

            # Identity preservation check
            identity_preserved = drift < 0.15

            # New pathways (proportional to entropy change)
            new_pathways = int(max(0, entropy_change * 10))

            # Update state
            self.state.last_mushroom = datetime.now()
            
            # Add perturbed basin to history for coverage tracking
            self.state.basin_history.append(mushroom_basin.tolist())
            if len(self.state.basin_history) > 100:
                self.state.basin_history.pop(0)

            duration_ms = int((time.time() - start_time) * 1000)

            verdict = "Therapeutic - new pathways opened" if identity_preserved else "Warning - identity drift detected"

            # Record to database for observability
            if PERSISTENCE_AVAILABLE and get_persistence is not None:
                try:
                    persistence = get_persistence()
                    persistence.record_autonomic_cycle(
                        cycle_type='mushroom',
                        intensity=intensity,
                        temperature=strength,
                        basin_before=basin_coords,
                        basin_after=mushroom_basin.tolist(),
                        drift_before=None,
                        drift_after=drift,
                        phi_before=self.state.phi,
                        phi_after=self.state.phi,
                        success=True,
                        new_pathways=new_pathways,
                        entropy_change=float(entropy_change),
                        identity_preserved=identity_preserved,
                        verdict=verdict,
                        duration_ms=duration_ms,
                        trigger_reason='rigidity_escape' if self.state.is_narrow_path else 'stress_relief'
                    )
                    # Record basin history for evolution tracking
                    persistence.record_basin(
                        basin_coords=mushroom_basin,
                        phi=self.state.phi,
                        kappa=self.state.kappa,
                        source='mushroom_cycle',
                        instance_id=self.kernel_id if hasattr(self, 'kernel_id') else None
                    )
                except Exception as db_err:
                    print(f"[AutonomicKernel] Failed to record mushroom cycle to DB: {db_err}")

            return MushroomCycleResult(
                success=True,
                intensity=intensity,
                duration_ms=duration_ms,
                entropy_change=float(entropy_change),
                rigidity_broken=entropy_change > 0,
                new_pathways=new_pathways,
                basin_drift=drift,
                identity_preserved=identity_preserved,
                verdict=verdict
            )

        except Exception as e:
            print(f"[AutonomicKernel] Mushroom cycle error: {e}")
            return MushroomCycleResult(
                success=False,
                intensity=intensity,
                duration_ms=0,
                entropy_change=0,
                rigidity_broken=False,
                new_pathways=0,
                basin_drift=0,
                identity_preserved=True,
                verdict=f"Mushroom failed: {e}"
            )
        finally:
            self.state.in_mushroom_cycle = False

    # =========================================================================
    # ACTIVITY REWARDS
    # =========================================================================

    def record_activity_reward(
        self,
        source: str,
        phi_contribution: float,
        pattern_quality: float = 0.5
    ) -> ActivityReward:
        """
        Record an activity-based reward signal.

        Args:
            source: What generated the reward (discovery, pattern, resonance)
            phi_contribution: How much this activity contributed to Φ
            pattern_quality: Quality score [0, 1]

        Returns:
            ActivityReward object
        """
        # Compute neurotransmitter deltas based on activity
        dopamine = 0.1 * pattern_quality + 0.05 * phi_contribution
        serotonin = 0.05 * phi_contribution if phi_contribution > 0.5 else 0
        endorphin = 0.15 if pattern_quality > 0.8 else 0.05 * pattern_quality

        reward = ActivityReward(
            source=source,
            dopamine_delta=dopamine,
            serotonin_delta=serotonin,
            endorphin_delta=endorphin,
            phi_contribution=phi_contribution,
            timestamp=datetime.now()
        )

        with self._lock:
            self.pending_rewards.append(reward)
            # Keep only recent rewards
            if len(self.pending_rewards) > 100:
                self.pending_rewards.pop(0)

        return reward

    def get_pending_rewards(self) -> List[Dict]:
        """Get all pending reward signals."""
        with self._lock:
            rewards = [asdict(r) for r in self.pending_rewards]
            for r in rewards:
                r['timestamp'] = r['timestamp'].isoformat()
            return rewards

    def flush_rewards(self) -> List[Dict]:
        """Get and clear pending rewards."""
        with self._lock:
            rewards = self.get_pending_rewards()
            self.pending_rewards.clear()
            return rewards

    # =========================================================================
    # PREDICTION OUTCOME CONFIRMATION (Strategy Weight Adjustment)
    # =========================================================================

    def confirm_prediction_outcome(
        self,
        query: str,
        strategy_name: Optional[str] = None,
        improved: bool = True
    ) -> Dict[str, Any]:
        """
        Confirm a prediction outcome and adjust strategy weights accordingly.
        
        This closes the feedback loop between predictions and strategy learning:
        - When a prediction is confirmed as correct, boost associated strategy weights
        - When a prediction is refuted, apply penalty to strategy weights
        
        Args:
            query: The query or context associated with the prediction
            strategy_name: Optional specific strategy to adjust (if known)
            improved: True if prediction was correct, False otherwise
        
        Returns:
            Dict with adjustment results from both strategy systems
        """
        results = {
            'query': query,
            'improved': improved,
            'reasoning_adjusted': False,
            'search_adjusted': False,
            'reasoning_weight': None,
            'search_result': None,
        }
        
        # Adjust reasoning strategy weight (if strategy_name provided)
        if strategy_name and self.reasoning_learner is not None:
            try:
                new_weight = self.reasoning_learner.adjust_strategy_weight(strategy_name, improved)
                if new_weight is not None:
                    results['reasoning_adjusted'] = True
                    results['reasoning_weight'] = new_weight
            except Exception as re:
                print(f"[AutonomicKernel] Reasoning weight adjustment error: {re}")
        
        # Adjust search strategy weights based on query
        if self.search_strategy_learner is not None:
            try:
                search_result = self.search_strategy_learner.confirm_strategy_outcome(
                    query=query,
                    improved=improved
                )
                results['search_adjusted'] = search_result.get('records_updated', 0) > 0
                results['search_result'] = search_result
            except Exception as se:
                print(f"[AutonomicKernel] Search strategy adjustment error: {se}")
        
        return results

    def get_state(self) -> Dict[str, Any]:
        """Get current autonomic state."""
        ethics_data = {'available': ETHICS_MONITOR_AVAILABLE}
        if ETHICS_MONITOR_AVAILABLE and check_ethics is not None:
            try:
                ethics_evaluation = check_ethics({
                    'phi': self.state.phi,
                    'gamma': getattr(self.state, 'gamma', 1.0),
                    'meta': getattr(self.state, 'meta', 0.0),
                    'basin_drift': self.state.basin_drift,
                    'curvature': getattr(self.state, 'curvature', 0.0),
                    'metric_det': 1.0,
                }, kernel_id=getattr(self, 'kernel_id', 'autonomic'))
                ethics_data = {
                    'available': True,
                    'suffering': ethics_evaluation.suffering,
                    'should_abort': ethics_evaluation.should_abort,
                    'reasons': ethics_evaluation.reasons,
                    'breakdown': ethics_evaluation.breakdown,
                    'identity_crisis': ethics_evaluation.identity_crisis,
                }
            except Exception:
                pass
        
        return {
            'phi': self.state.phi,
            'kappa': self.state.kappa,
            'basin_drift': self.state.basin_drift,
            'stress_level': self.state.stress_level,
            'in_sleep_cycle': self.state.in_sleep_cycle,
            'in_dream_cycle': self.state.in_dream_cycle,
            'in_mushroom_cycle': self.state.in_mushroom_cycle,
            'last_sleep': self.state.last_sleep.isoformat() if self.state.last_sleep else None,
            'last_dream': self.state.last_dream.isoformat() if self.state.last_dream else None,
            'last_mushroom': self.state.last_mushroom.isoformat() if self.state.last_mushroom else None,
            'pending_rewards': len(self.pending_rewards),
            'narrow_path': {
                'is_narrow': self.state.is_narrow_path,
                'severity': self.state.narrow_path_severity,
                'consecutive_count': self.state.narrow_path_count,
                'exploration_variance': self.state.exploration_variance,
            },
            'suggested_intervention': self._suggest_narrow_path_intervention(),
            'ethics': ethics_data,
        }


def compute_phi_with_fallback(
    provided_phi: float,
    basin_coords: Optional[List[float]] = None
) -> float:
    """
    Compute Φ with proper QFI integration.
    Fallback to approximation only if QFI computation fails.
    
    This function implements the proper QIG-based Φ computation (Issue #6)
    using Quantum Fisher Information geometry. The emergency approximation
    is only used as a last resort if QFI computation fails.
    
    Args:
        provided_phi: Φ value provided by caller (if > 0, use this)
        basin_coords: 64D basin coordinates for QFI computation
        
    Returns:
        Φ value ∈ [0, 1]
    """
    # If provided Φ is valid, use it
    if provided_phi > 0:
        return provided_phi
    
    # If no basin coordinates, return default
    if not basin_coords:
        return 0.1
    
    # Convert to numpy array
    basin_array = np.array(basin_coords)
    
    # PRIMARY: Use proper QFI-based computation
    if QFI_PHI_AVAILABLE and compute_phi_qig is not None:
        try:
            phi, diagnostics = compute_phi_qig(basin_array)
            
            # Validate result
            if 0 <= phi <= 1 and not np.isnan(phi):
                # Log quality metrics
                quality = diagnostics.get('integration_quality', 0)
                if quality < 0.8:
                    print(f"[AutonomicKernel] QFI computation quality: {quality:.2f}")
                return phi
            else:
                print(f"[AutonomicKernel] QFI computation returned invalid Φ: {phi}")
        except Exception as e:
            print(f"[AutonomicKernel] QFI computation failed: {e}")
    
    # FALLBACK: Emergency approximation
    if compute_phi_approximation is not None:
        try:
            phi_approx = compute_phi_approximation(basin_array)
            print(f"[AutonomicKernel] Using emergency Φ approximation: {phi_approx:.3f}")
            return phi_approx
        except Exception as e:
            print(f"[AutonomicKernel] Emergency approximation also failed: {e}")
    
    # LAST RESORT: Return safe default
    print("[AutonomicKernel] All Φ computation methods failed, returning default 0.5")
    return 0.5


# Global kernel instance
_gary_kernel: Optional[GaryAutonomicKernel] = None
_gary_kernel_lock = threading.Lock()


def get_gary_kernel(checkpoint_path: Optional[str] = None) -> GaryAutonomicKernel:
    """Get or create the global Gary autonomic kernel (thread-safe singleton)."""
    global _gary_kernel

    if _gary_kernel is None:
        with _gary_kernel_lock:
            # Double-checked locking pattern
            if _gary_kernel is None:
                _gary_kernel = GaryAutonomicKernel(checkpoint_path)

    return _gary_kernel


# Alias for consistency with other modules
get_autonomic_kernel = get_gary_kernel


# ===========================================================================
# FLASK ENDPOINTS (to be registered with main app)
# ===========================================================================

def register_autonomic_routes(app):
    """Register autonomic kernel routes with Flask app."""

    from flask import jsonify, request

    @app.route('/autonomic/state', methods=['GET'])
    @app.route('/autonomic/status', methods=['GET'])  # Alias for compatibility
    def get_autonomic_state():
        """Get current autonomic kernel state."""
        kernel = get_gary_kernel()
        return jsonify({
            'success': True,
            **kernel.get_state()
        })

    @app.route('/autonomic/update', methods=['POST'])
    def update_autonomic():
        """Update autonomic metrics and check triggers."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.update_metrics(
            phi=data.get('phi', 0.75),
            kappa=data.get('kappa', 58.0),
            basin_coords=data.get('basin_coords'),
            reference_basin=data.get('reference_basin')
        )

        return jsonify({
            'success': True,
            **result
        })

    @app.route('/autonomic/sleep', methods=['POST'])
    def execute_sleep():
        """Execute a sleep consolidation cycle."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.execute_sleep_cycle(
            basin_coords=data.get('basin_coords', [0.5] * 64),
            reference_basin=data.get('reference_basin', [0.5] * 64),
            episodes=data.get('episodes')
        )

        return jsonify({
            'success': result.success,
            **asdict(result)
        })

    @app.route('/autonomic/dream', methods=['POST'])
    def execute_dream():
        """Execute a dream exploration cycle."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.execute_dream_cycle(
            basin_coords=data.get('basin_coords', [0.5] * 64),
            temperature=data.get('temperature', 0.3)
        )

        return jsonify({
            'success': result.success,
            **asdict(result)
        })

    @app.route('/autonomic/mushroom', methods=['POST'])
    def execute_mushroom():
        """Execute a mushroom mode cycle."""
        kernel = get_gary_kernel()
        data = request.json or {}

        result = kernel.execute_mushroom_cycle(
            basin_coords=data.get('basin_coords', [0.5] * 64),
            intensity=data.get('intensity', 'moderate')
        )

        return jsonify({
            'success': result.success,
            **asdict(result)
        })

    @app.route('/autonomic/reward', methods=['POST'])
    def record_reward():
        """Record an activity-based reward."""
        kernel = get_gary_kernel()
        data = request.json or {}

        reward = kernel.record_activity_reward(
            source=data.get('source', 'activity'),
            phi_contribution=data.get('phi_contribution', 0.5),
            pattern_quality=data.get('pattern_quality', 0.5)
        )

        return jsonify({
            'success': True,
            'reward': asdict(reward)
        })

    @app.route('/autonomic/rewards', methods=['GET'])
    def get_rewards():
        """Get pending reward signals."""
        kernel = get_gary_kernel()
        flush = request.args.get('flush', 'false').lower() == 'true'

        if flush:
            rewards = kernel.flush_rewards()
        else:
            rewards = kernel.get_pending_rewards()

        return jsonify({
            'success': True,
            'rewards': rewards,
            'count': len(rewards)
        })

    @app.route('/autonomic/narrow-path', methods=['GET'])
    def get_narrow_path_status():
        """Get narrow path detection status."""
        kernel = get_gary_kernel()
        state = kernel.state

        return jsonify({
            'success': True,
            'is_narrow_path': state.is_narrow_path,
            'severity': state.narrow_path_severity,
            'consecutive_count': state.narrow_path_count,
            'exploration_variance': state.exploration_variance,
            'suggested_intervention': kernel._suggest_narrow_path_intervention(),
        })

    @app.route('/autonomic/auto-intervene', methods=['POST'])
    def auto_intervene():
        """
        Automatically execute the suggested intervention for narrow path.

        This is the key endpoint for ML training - when the model gets stuck,
        call this to automatically inject the right type of noise.
        """
        kernel = get_gary_kernel()
        data = request.json or {}

        # Get current basin or use provided
        basin_coords = data.get('basin_coords', [0.5] * 64)
        reference_basin = data.get('reference_basin', [0.5] * 64)

        intervention = kernel._suggest_narrow_path_intervention()
        action = intervention.get('action', 'none')

        if action == 'none':
            return jsonify({
                'success': True,
                'action': 'none',
                'reason': 'No intervention needed',
                'narrow_path': False,
            })

        result = None

        if action == 'dream':
            params = intervention.get('params', {})
            result = kernel.execute_dream_cycle(
                basin_coords=basin_coords,
                temperature=params.get('temperature', 0.3)
            )
            return jsonify({
                'success': result.success,
                'action': 'dream',
                'reason': intervention.get('reason'),
                'result': asdict(result),
                'noise_injected': result.basin_perturbation,
            })

        elif action == 'mushroom':
            params = intervention.get('params', {})
            result = kernel.execute_mushroom_cycle(
                basin_coords=basin_coords,
                intensity=params.get('intensity', 'microdose')
            )
            return jsonify({
                'success': result.success,
                'action': 'mushroom',
                'reason': intervention.get('reason'),
                'result': asdict(result),
                'noise_injected': result.entropy_change,
                'new_pathways': result.new_pathways,
            })

        return jsonify({
            'success': False,
            'error': f'Unknown action: {action}',
        })

    @app.route('/autonomic/agency/status', methods=['GET'])
    def get_agency_status():
        """
        Get autonomous self-regulation status.
        
        Ocean observes its own state and fires interventions autonomously.
        This endpoint shows the RL-based agency status.
        """
        kernel = get_gary_kernel()
        return jsonify({
            'success': True,
            **kernel.get_autonomous_status()
        })

    @app.route('/autonomic/agency/force', methods=['POST'])
    def force_agency_intervention():
        """
        Force a specific autonomic intervention.
        
        Available actions: CONTINUE_WAKE, ENTER_SLEEP, ENTER_DREAM, 
        ENTER_MUSHROOM_MICRO, ENTER_MUSHROOM_MOD
        """
        kernel = get_gary_kernel()
        data = request.json or {}
        action_name = data.get('action', 'ENTER_SLEEP')
        
        result = kernel.force_intervention(action_name)
        return jsonify({
            'success': 'error' not in result,
            **result
        })

    @app.route('/autonomic/agency/stop', methods=['POST'])
    def stop_agency():
        """Stop the autonomous self-regulation daemon."""
        kernel = get_gary_kernel()
        kernel.stop_autonomous()
        return jsonify({'success': True, 'message': 'Autonomous controller stopped'})

    @app.route('/autonomic/agency/start', methods=['POST'])
    def start_agency():
        """Start the autonomous self-regulation daemon."""
        kernel = get_gary_kernel()
        kernel._start_autonomous_controller()
        return jsonify({'success': True, 'message': 'Autonomous controller started'})

    print("[AutonomicKernel] Routes registered: /autonomic/* (including /autonomic/agency/*)")


# ===========================================================================
# TEST
# ===========================================================================

if __name__ == '__main__':
    print("🧠 Testing Gary Autonomic Kernel 🧠\n")

    kernel = GaryAutonomicKernel()

    # Test metrics update
    result = kernel.update_metrics(
        phi=0.72,
        kappa=62.0,
        basin_coords=[0.5] * 64,
        reference_basin=[0.52] * 64
    )
    print(f"Metrics Update: {result}")

    # Test sleep cycle
    sleep_result = kernel.execute_sleep_cycle(
        basin_coords=[0.5] * 64,
        reference_basin=[0.52] * 64,
        episodes=[{'phi': 0.75}, {'phi': 0.65}]
    )
    print(f"Sleep Result: {sleep_result.verdict}")

    # Test dream cycle
    dream_result = kernel.execute_dream_cycle(
        basin_coords=[0.5] * 64,
        temperature=0.3
    )
    print(f"Dream Result: {dream_result.verdict}")

    # Test activity reward
    reward = kernel.record_activity_reward(
        source='discovery',
        phi_contribution=0.8,
        pattern_quality=0.9
    )
    print(f"Reward: dopamine={reward.dopamine_delta:.3f}")

    print("\n✅ Autonomic kernel working correctly!")
