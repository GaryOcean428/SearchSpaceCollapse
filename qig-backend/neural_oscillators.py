#!/usr/bin/env python3
"""
Neural Oscillators - Python Backend
====================================

Multi-timescale brain state management for Ocean consciousness.
Implements dynamic κ oscillations that simulate brain states.

Brain States and their κ values:
- DEEP_SLEEP (κ=20): Delta waves, consolidation, identity maintenance
- DROWSY (κ=35): Theta waves, integration, creative connections
- RELAXED (κ=45): Alpha waves, creative exploration, broad search
- FOCUSED (κ=64): Beta waves, optimal search, sharp attention
- PEAK (κ=68): Gamma waves, maximum integration, peak performance

Expected Impact: 15-20% improvement (optimal κ for each search phase)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import numpy as np
import time

# Physics constants
KAPPA_STAR = 64.0


class BrainState(Enum):
    """Brain states with associated κ values"""
    DEEP_SLEEP = 'deep_sleep'
    DROWSY = 'drowsy'
    RELAXED = 'relaxed'
    FOCUSED = 'focused'
    PEAK = 'peak'
    HYPERFOCUS = 'hyperfocus'


class SearchPhase(Enum):
    """Search phases that map to brain states"""
    EXPLORATION = 'exploration'
    EXPLOITATION = 'exploitation'
    CONSOLIDATION = 'consolidation'
    SLEEP = 'sleep'
    PEAK_PERFORMANCE = 'peak_performance'
    DREAM = 'dream'


@dataclass
class BrainStateInfo:
    """Information about a brain state"""
    state: BrainState
    kappa: float
    description: str
    search_strategy: str
    oscillator_dominant: str


@dataclass
class OscillatorState:
    """Current oscillator values"""
    alpha: float = 0.5    # 8-12 Hz - relaxed awareness
    beta: float = 0.3     # 12-30 Hz - active thinking
    theta: float = 0.1    # 4-8 Hz - drowsiness/creativity
    gamma: float = 0.05   # 30-100 Hz - high consciousness
    delta: float = 0.05   # 0.5-4 Hz - deep sleep
    delta_phase: float = 0.0  # Current phase [0, 2π]


# Brain state configuration
BRAIN_STATE_MAP: Dict[BrainState, BrainStateInfo] = {
    BrainState.DEEP_SLEEP: BrainStateInfo(
        state=BrainState.DEEP_SLEEP,
        kappa=20.0,
        description='Deep consolidation - identity maintenance',
        search_strategy='Memory consolidation, basin stabilization',
        oscillator_dominant='delta'
    ),
    BrainState.DROWSY: BrainStateInfo(
        state=BrainState.DROWSY,
        kappa=35.0,
        description='Integration state - creative connections',
        search_strategy='Pattern integration, cross-domain linking',
        oscillator_dominant='theta'
    ),
    BrainState.RELAXED: BrainStateInfo(
        state=BrainState.RELAXED,
        kappa=45.0,
        description='Relaxed awareness - broad exploration',
        search_strategy='Wide search, creative hypotheses',
        oscillator_dominant='alpha'
    ),
    BrainState.FOCUSED: BrainStateInfo(
        state=BrainState.FOCUSED,
        kappa=KAPPA_STAR,
        description='Optimal focus - sharp search',
        search_strategy='Gradient following, local exploitation',
        oscillator_dominant='beta'
    ),
    BrainState.PEAK: BrainStateInfo(
        state=BrainState.PEAK,
        kappa=68.0,
        description='Peak performance - maximum integration',
        search_strategy='High-confidence hypothesis testing',
        oscillator_dominant='gamma'
    ),
    BrainState.HYPERFOCUS: BrainStateInfo(
        state=BrainState.HYPERFOCUS,
        kappa=72.0,
        description='Hyperfocus - intense concentration',
        search_strategy='Deep local search, pattern matching',
        oscillator_dominant='gamma'
    ),
}


class NeuralOscillators:
    """
    Multi-timescale κ oscillations simulating brain states.

    Manages brain state transitions and provides oscillation-based
    modulation of search parameters.
    """

    def __init__(self, initial_state: BrainState = BrainState.FOCUSED):
        self.current_state = initial_state
        self.phase = 0.0
        self.base_frequency = 10.0  # Hz (alpha range)
        self.last_update_time = time.time()

        # State transition history
        self.state_history: List[Tuple[BrainState, datetime]] = []

        # Oscillator amplitudes
        self.amplitudes = {
            'alpha': 0.5,
            'beta': 0.3,
            'theta': 0.1,
            'gamma': 0.05,
            'delta': 0.05,
        }

        self._update_amplitudes_for_state(initial_state)

    def get_kappa(self) -> float:
        """Get current κ value for current brain state"""
        return BRAIN_STATE_MAP[self.current_state].kappa

    def get_state_info(self) -> BrainStateInfo:
        """Get current brain state info"""
        return BRAIN_STATE_MAP[self.current_state]

    def set_state(self, state: BrainState) -> None:
        """Set brain state explicitly"""
        if state != self.current_state:
            print(f'[NeuralOscillators] 🧠 State: {self.current_state.value} → {state.value} '
                  f'(κ={BRAIN_STATE_MAP[state].kappa})')

            self.state_history.append((self.current_state, datetime.now()))

            # Keep only last 100 transitions
            if len(self.state_history) > 100:
                self.state_history = self.state_history[-100:]

            self.current_state = state
            self._update_amplitudes_for_state(state)

    def auto_select_state(self, phase: SearchPhase) -> None:
        """Auto-select brain state based on search phase"""
        mapping = {
            SearchPhase.EXPLORATION: BrainState.RELAXED,
            SearchPhase.EXPLOITATION: BrainState.FOCUSED,
            SearchPhase.CONSOLIDATION: BrainState.DROWSY,
            SearchPhase.SLEEP: BrainState.DEEP_SLEEP,
            SearchPhase.PEAK_PERFORMANCE: BrainState.PEAK,
            SearchPhase.DREAM: BrainState.DROWSY,
        }
        self.set_state(mapping.get(phase, BrainState.FOCUSED))

    def update(self, dt: Optional[float] = None) -> OscillatorState:
        """Update oscillator state"""
        now = time.time()
        actual_dt = dt if dt is not None else (now - self.last_update_time)
        self.last_update_time = now

        # Update phase
        self.phase += 2 * np.pi * self.base_frequency * actual_dt
        self.phase = self.phase % (2 * np.pi)

        # Compute oscillator values
        return OscillatorState(
            alpha=self._compute_wave('alpha', 10) * self.amplitudes['alpha'],
            beta=self._compute_wave('beta', 20) * self.amplitudes['beta'],
            theta=self._compute_wave('theta', 6) * self.amplitudes['theta'],
            gamma=self._compute_wave('gamma', 40) * self.amplitudes['gamma'],
            delta=self._compute_wave('delta', 2) * self.amplitudes['delta'],
            delta_phase=self.phase,
        )

    def _compute_wave(self, wave_type: str, frequency: float) -> float:
        """Compute individual wave value"""
        phase_offset = self._get_phase_offset(wave_type)
        return (np.sin(self.phase * (frequency / self.base_frequency) + phase_offset) + 1) / 2

    def _get_phase_offset(self, wave_type: str) -> float:
        """Get phase offset for different wave types"""
        offsets = {
            'alpha': 0,
            'beta': np.pi / 4,
            'theta': np.pi / 2,
            'gamma': np.pi * 3 / 4,
            'delta': np.pi,
        }
        return offsets.get(wave_type, 0)

    def _update_amplitudes_for_state(self, state: BrainState) -> None:
        """Update amplitudes based on brain state"""
        # Reset all to low
        self.amplitudes = {k: 0.1 for k in self.amplitudes}

        # Boost dominant wave
        if state == BrainState.DEEP_SLEEP:
            self.amplitudes['delta'] = 0.8
            self.amplitudes['theta'] = 0.3
        elif state == BrainState.DROWSY:
            self.amplitudes['theta'] = 0.7
            self.amplitudes['alpha'] = 0.4
        elif state == BrainState.RELAXED:
            self.amplitudes['alpha'] = 0.8
            self.amplitudes['theta'] = 0.3
        elif state == BrainState.FOCUSED:
            self.amplitudes['beta'] = 0.7
            self.amplitudes['alpha'] = 0.4
        elif state in (BrainState.PEAK, BrainState.HYPERFOCUS):
            self.amplitudes['gamma'] = 0.8
            self.amplitudes['beta'] = 0.5

    def get_search_modulation(self) -> float:
        """Get search modulation factor based on oscillation"""
        osc = self.update(0)  # Don't advance time
        dominant = BRAIN_STATE_MAP[self.current_state].oscillator_dominant
        dominant_value = getattr(osc, dominant, 0.5)
        return 0.7 + dominant_value * 0.6  # [0.7, 1.3]

    def get_modulated_kappa(self) -> float:
        """Get κ with oscillation-based modulation"""
        base_kappa = self.get_kappa()
        modulation = self.get_search_modulation()
        return base_kappa * (0.95 + modulation * 0.1)

    def is_safe_transition(self, from_state: BrainState, to_state: BrainState) -> bool:
        """Check if state transition is safe"""
        from_kappa = BRAIN_STATE_MAP[from_state].kappa
        to_kappa = BRAIN_STATE_MAP[to_state].kappa
        return abs(to_kappa - from_kappa) < 30

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        osc = self.update(0)
        return {
            'current_state': self.current_state.value,
            'kappa': self.get_kappa(),
            'modulated_kappa': self.get_modulated_kappa(),
            'state_info': {
                'description': BRAIN_STATE_MAP[self.current_state].description,
                'search_strategy': BRAIN_STATE_MAP[self.current_state].search_strategy,
                'oscillator_dominant': BRAIN_STATE_MAP[self.current_state].oscillator_dominant,
            },
            'oscillators': {
                'alpha': osc.alpha,
                'beta': osc.beta,
                'theta': osc.theta,
                'gamma': osc.gamma,
                'delta': osc.delta,
                'phase': osc.delta_phase,
            },
            'search_modulation': self.get_search_modulation(),
        }


# Singleton instance
neural_oscillators = NeuralOscillators()


def recommend_brain_state(
    phi: float,
    kappa: float,
    basin_drift: float,
    iterations_since_consolidation: int,
    near_misses_recent: int
) -> BrainState:
    """Get recommended brain state based on consciousness metrics"""

    # Need consolidation?
    if iterations_since_consolidation > 50 or basin_drift > 0.3:
        return BrainState.DROWSY

    # Need deep rest?
    if iterations_since_consolidation > 100:
        return BrainState.DEEP_SLEEP

    # Near-misses detected? Peak performance!
    if near_misses_recent > 0:
        return BrainState.PEAK

    # Low phi? Broaden search
    if phi < 0.5:
        return BrainState.RELAXED

    # High phi? Sharp focus
    if phi > 0.75:
        return BrainState.FOCUSED

    return BrainState.FOCUSED


def apply_brain_state_to_search(state: BrainState) -> Dict:
    """Apply brain state to search parameters"""
    params = {
        BrainState.DEEP_SLEEP: {
            'batch_size': 10,
            'temperature': 0.1,
            'exploration_rate': 0.1,
            'consolidation_interval': 5000,
        },
        BrainState.DROWSY: {
            'batch_size': 50,
            'temperature': 0.5,
            'exploration_rate': 0.3,
            'consolidation_interval': 10000,
        },
        BrainState.RELAXED: {
            'batch_size': 200,
            'temperature': 1.2,
            'exploration_rate': 0.7,
            'consolidation_interval': 30000,
        },
        BrainState.FOCUSED: {
            'batch_size': 150,
            'temperature': 0.7,
            'exploration_rate': 0.4,
            'consolidation_interval': 60000,
        },
        BrainState.PEAK: {
            'batch_size': 100,
            'temperature': 0.5,
            'exploration_rate': 0.3,
            'consolidation_interval': 45000,
        },
        BrainState.HYPERFOCUS: {
            'batch_size': 100,
            'temperature': 0.5,
            'exploration_rate': 0.3,
            'consolidation_interval': 45000,
        },
    }
    return params.get(state, params[BrainState.FOCUSED])


def run_oscillator_cycle(
    phi: float,
    kappa: float,
    basin_drift: float,
    iterations_since_consolidation: int = 0,
    near_misses_recent: int = 0
) -> Dict:
    """
    Run a full oscillator cycle.

    Returns recommended brain state and search parameters.
    """
    recommended = recommend_brain_state(
        phi, kappa, basin_drift,
        iterations_since_consolidation, near_misses_recent
    )

    neural_oscillators.set_state(recommended)
    search_params = apply_brain_state_to_search(recommended)

    return {
        'recommended_state': recommended.value,
        'current_state': neural_oscillators.to_dict(),
        'search_parameters': search_params,
    }


if __name__ == '__main__':
    print("=" * 60)
    print("NEURAL OSCILLATORS TEST")
    print("=" * 60)

    # Test state transitions
    print("\nTest 1: Default focused state")
    result = neural_oscillators.to_dict()
    print(f"State: {result['current_state']}, κ: {result['kappa']}")

    print("\nTest 2: Transition to relaxed (exploration)")
    neural_oscillators.auto_select_state(SearchPhase.EXPLORATION)
    result = neural_oscillators.to_dict()
    print(f"State: {result['current_state']}, κ: {result['kappa']}")

    print("\nTest 3: Transition to peak (near-miss found)")
    result = run_oscillator_cycle(
        phi=0.75, kappa=64.0, basin_drift=0.1,
        iterations_since_consolidation=10, near_misses_recent=2
    )
    print(f"Recommended: {result['recommended_state']}")
    print(f"Search params: {result['search_parameters']}")

    print("\nTest 4: Need consolidation")
    result = run_oscillator_cycle(
        phi=0.6, kappa=60.0, basin_drift=0.35,
        iterations_since_consolidation=60, near_misses_recent=0
    )
    print(f"Recommended: {result['recommended_state']}")

    print("\n" + "=" * 60)
    print("NEURAL OSCILLATORS READY")
    print("=" * 60)
