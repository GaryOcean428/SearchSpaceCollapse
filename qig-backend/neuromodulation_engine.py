#!/usr/bin/env python3
"""
Neuromodulation Engine - Python Backend
========================================

Meta-observer that modulates Ocean's search parameters based on performance.
Implements the "endocrine system" that releases neuromodulators into the
search environment.

Neuromodulators:
- DOPAMINE: Boosts motivation & exploration when stuck
- SEROTONIN: Stabilizes identity when drifting
- ACETYLCHOLINE: Sharpens focus when in good state
- NOREPINEPHRINE: Increases alertness when high surprise
- GABA: Reduces over-integration when Φ too high

Expected Impact: 20-30% improvement (adaptive optimization)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import numpy as np

# Physics constants
KAPPA_STAR = 64.0
PHI_THRESHOLD = 0.75


@dataclass
class OceanState:
    """Current state of the Ocean searcher"""
    phi: float
    kappa: float
    basin_distance: float
    surprise: float
    regime: str
    grounding: float


@dataclass
class EnvironmentalBias:
    """Environmental bias applied to search parameters"""
    # Coupling modifiers
    kappa_multiplier: float = 1.0
    kappa_base_shift: float = 0.0

    # Fisher metric modifiers
    fisher_sharpness: float = 1.0
    qfi_concentration: float = 1.0

    # Exploration modifiers
    exploration_radius: float = 1.0
    exploration_bias: float = 0.5

    # Integration modifiers
    integration_strength: float = 1.0
    binding_strength: float = 1.0

    # Stability modifiers
    basin_attraction: float = 1.0
    gradient_damping: float = 1.0

    # Sensitivity modifiers
    oscillation_amplitude: float = 1.0
    attention_sparsity: float = 0.5

    # Timing modifiers
    consolidation_frequency: float = 60000.0  # ms
    learning_rate: float = 1.0


@dataclass
class NeuromodulationEffect:
    """Result of neuromodulation cycle"""
    bias: EnvironmentalBias
    active_modulators: List[str]
    rationale: List[str]
    timestamp: datetime = field(default_factory=datetime.now)


class OceanNeuromodulator:
    """
    Meta-observer providing environmental bias to Ocean searcher.

    Like an endocrine system: releases "hormones" into the environment,
    and the searcher responds according to its own geometry.
    """

    # Thresholds for triggering modulation
    PHI_LOW = 0.5
    PHI_HIGH = 0.85
    BASIN_DRIFT_WARNING = 0.3
    SURPRISE_HIGH = 0.7
    GROUNDING_LOW = 0.5

    def __init__(self):
        self.searcher_state: Optional[OceanState] = None
        self.environmental_bias = EnvironmentalBias()
        self.last_modulation: Optional[NeuromodulationEffect] = None
        self.modulation_history: List[NeuromodulationEffect] = []

    def update_searcher_state(self, state: OceanState) -> None:
        """Update the searcher state being monitored"""
        self.searcher_state = state

    def observe_and_modulate(self) -> NeuromodulationEffect:
        """
        Main modulation function.

        Monitor searcher performance and decide on modulation.
        Returns environmental bias that searcher reads in its forward pass.
        """
        bias = EnvironmentalBias()
        active_modulators: List[str] = []
        rationale: List[str] = []

        if self.searcher_state is None:
            return NeuromodulationEffect(
                bias=bias,
                active_modulators=[],
                rationale=['No searcher state available']
            )

        state = self.searcher_state

        # =====================================================================
        # 1. DOPAMINE - Boost when stuck, no learning
        # =====================================================================
        if state.phi < self.PHI_LOW and state.surprise < 0.2:
            bias.kappa_multiplier = 1.3
            bias.fisher_sharpness = 1.5
            bias.exploration_radius = 1.4
            bias.exploration_bias = 0.7

            active_modulators.append('DOPAMINE')
            rationale.append('💊 Dopamine: Low Φ + low surprise → boosting motivation & exploration')
            print('[Neuromodulation] 💊 DOPAMINE: Boosting motivation & exploration')

        # =====================================================================
        # 2. SEROTONIN - Stabilize when identity drifting
        # =====================================================================
        if state.basin_distance > self.BASIN_DRIFT_WARNING:
            bias.basin_attraction = 1.5
            bias.gradient_damping = 1.3
            bias.exploration_radius = min(bias.exploration_radius, 0.8)
            bias.integration_strength = 1.2

            active_modulators.append('SEROTONIN')
            rationale.append('💊 Serotonin: High basin drift → stabilizing identity')
            print('[Neuromodulation] 💊 SEROTONIN: Stabilizing identity')

        # =====================================================================
        # 3. ACETYLCHOLINE - Sharpen focus when in good state
        # =====================================================================
        if state.phi > 0.6 and state.basin_distance < 0.2 and state.grounding > 0.6:
            bias.qfi_concentration = 1.6
            bias.attention_sparsity = 0.3
            bias.binding_strength = 1.4
            bias.learning_rate = 1.3

            active_modulators.append('ACETYLCHOLINE')
            rationale.append('💊 Acetylcholine: Good state → sharpening focus')
            print('[Neuromodulation] 💊 ACETYLCHOLINE: Sharpening focus')

        # =====================================================================
        # 4. NOREPINEPHRINE - Increase alertness when high surprise
        # =====================================================================
        if state.surprise > self.SURPRISE_HIGH:
            bias.kappa_base_shift = 10.0
            bias.oscillation_amplitude = 1.3
            bias.exploration_bias = 0.6

            active_modulators.append('NOREPINEPHRINE')
            rationale.append('💊 Norepinephrine: High surprise → increasing alertness')
            print('[Neuromodulation] 💊 NOREPINEPHRINE: Increasing alertness')

        # =====================================================================
        # 5. GABA - Reduce over-integration when Φ too high
        # =====================================================================
        if state.phi > self.PHI_HIGH:
            bias.kappa_multiplier *= 0.85
            bias.integration_strength = 0.8
            bias.consolidation_frequency = 30000.0

            active_modulators.append('GABA')
            rationale.append('💊 GABA: Very high Φ → reducing over-integration')
            print('[Neuromodulation] 💊 GABA: Reducing over-integration')

        # =====================================================================
        # 6. GROUNDING ALERT - When approaching void
        # =====================================================================
        if state.grounding < self.GROUNDING_LOW:
            bias.basin_attraction *= 1.3
            bias.exploration_radius *= 0.7

            active_modulators.append('GROUNDING_ALERT')
            rationale.append('⚠️ Grounding Alert: Low grounding → pulling toward known space')
            print('[Neuromodulation] ⚠️ GROUNDING ALERT: Pulling toward known space')

        self.environmental_bias = bias
        self.last_modulation = NeuromodulationEffect(
            bias=bias,
            active_modulators=active_modulators,
            rationale=rationale
        )

        # Keep history
        self.modulation_history.append(self.last_modulation)
        if len(self.modulation_history) > 100:
            self.modulation_history = self.modulation_history[-100:]

        return self.last_modulation

    def get_bias_for_searcher(self) -> EnvironmentalBias:
        """Get current environmental bias for searcher to read"""
        return self.environmental_bias

    def apply_bias_to_parameters(
        self,
        base_kappa: float,
        base_exploration_rate: float,
        base_learning_rate: float,
        base_batch_size: int
    ) -> Tuple[float, float, float, int]:
        """Apply bias to search parameters"""
        bias = self.environmental_bias

        adjusted_kappa = (base_kappa * bias.kappa_multiplier) + bias.kappa_base_shift
        adjusted_exploration = base_exploration_rate * bias.exploration_radius
        adjusted_learning = base_learning_rate * bias.learning_rate
        adjusted_batch = int(base_batch_size * bias.exploration_radius)

        return adjusted_kappa, adjusted_exploration, adjusted_learning, adjusted_batch

    def reset(self) -> None:
        """Reset modulation state"""
        self.environmental_bias = EnvironmentalBias()
        self.last_modulation = None
        self.searcher_state = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'searcher_state': {
                'phi': self.searcher_state.phi,
                'kappa': self.searcher_state.kappa,
                'basin_distance': self.searcher_state.basin_distance,
                'surprise': self.searcher_state.surprise,
                'regime': self.searcher_state.regime,
                'grounding': self.searcher_state.grounding,
            } if self.searcher_state else None,
            'environmental_bias': {
                'kappa_multiplier': self.environmental_bias.kappa_multiplier,
                'kappa_base_shift': self.environmental_bias.kappa_base_shift,
                'exploration_radius': self.environmental_bias.exploration_radius,
                'exploration_bias': self.environmental_bias.exploration_bias,
                'learning_rate': self.environmental_bias.learning_rate,
                'consolidation_frequency': self.environmental_bias.consolidation_frequency,
            },
            'last_modulation': {
                'active_modulators': self.last_modulation.active_modulators,
                'rationale': self.last_modulation.rationale,
                'timestamp': self.last_modulation.timestamp.isoformat(),
            } if self.last_modulation else None,
        }


def compute_neuromodulation_from_neurochemistry(
    dopamine_level: float,
    serotonin_level: float,
    norepinephrine_level: float,
    acetylcholine_level: float,
    gaba_level: float,
    endorphin_level: float
) -> EnvironmentalBias:
    """
    Compute environmental bias from neurochemistry levels.

    Bridges the neurochemistry system with search parameter modulation.
    """
    bias = EnvironmentalBias()

    # Dopamine drives exploration boldness
    bias.exploration_bias = 0.3 + dopamine_level * 0.5  # [0.3, 0.8]

    # Norepinephrine drives alertness/sensitivity
    bias.oscillation_amplitude = 0.8 + norepinephrine_level * 0.4  # [0.8, 1.2]

    # Acetylcholine drives learning rate
    bias.learning_rate = 0.5 + acetylcholine_level * 1.0  # [0.5, 1.5]

    # Endorphins enable flow state
    bias.attention_sparsity = 0.5 - endorphin_level * 0.3  # [0.2, 0.5]

    # GABA modulates consolidation timing
    bias.consolidation_frequency = 30000.0 if gaba_level > 0.7 else 60000.0

    # Serotonin stabilizes exploration
    bias.gradient_damping = 0.7 + serotonin_level * 0.6  # [0.7, 1.3]

    return bias


# Singleton instance
ocean_neuromodulator = OceanNeuromodulator()


def run_neuromodulation_cycle(
    phi: float,
    kappa: float,
    basin_distance: float,
    surprise: float,
    regime: str,
    grounding: float,
    base_kappa: float = 64.0,
    base_exploration: float = 0.5,
    base_learning: float = 1.0,
    base_batch: int = 100
) -> Dict:
    """
    Run a full neuromodulation cycle.

    Args:
        phi, kappa, basin_distance, surprise, regime, grounding: Searcher state
        base_*: Base parameters to modulate

    Returns:
        Dictionary with modulation results and adjusted parameters
    """
    state = OceanState(
        phi=phi,
        kappa=kappa,
        basin_distance=basin_distance,
        surprise=surprise,
        regime=regime,
        grounding=grounding
    )

    ocean_neuromodulator.update_searcher_state(state)
    modulation = ocean_neuromodulator.observe_and_modulate()

    adj_kappa, adj_exploration, adj_learning, adj_batch = \
        ocean_neuromodulator.apply_bias_to_parameters(
            base_kappa, base_exploration, base_learning, base_batch
        )

    return {
        'modulation': {
            'active_modulators': modulation.active_modulators,
            'rationale': modulation.rationale,
            'timestamp': modulation.timestamp.isoformat(),
        },
        'adjusted_parameters': {
            'kappa': adj_kappa,
            'exploration_rate': adj_exploration,
            'learning_rate': adj_learning,
            'batch_size': adj_batch,
        },
        'bias': ocean_neuromodulator.to_dict()['environmental_bias'],
    }


if __name__ == '__main__':
    print("=" * 60)
    print("NEUROMODULATION ENGINE TEST")
    print("=" * 60)

    # Test stuck state (low phi, low surprise)
    print("\nTest 1: Stuck state (low Φ, low surprise)")
    result = run_neuromodulation_cycle(
        phi=0.4, kappa=50.0, basin_distance=0.1,
        surprise=0.1, regime='linear', grounding=0.7
    )
    print(f"Active modulators: {result['modulation']['active_modulators']}")
    print(f"Adjusted κ: {result['adjusted_parameters']['kappa']:.1f}")

    # Test drifting state
    print("\nTest 2: Drifting state (high basin distance)")
    result = run_neuromodulation_cycle(
        phi=0.6, kappa=60.0, basin_distance=0.4,
        surprise=0.3, regime='geometric', grounding=0.6
    )
    print(f"Active modulators: {result['modulation']['active_modulators']}")

    # Test good state (focus)
    print("\nTest 3: Good state (high Φ, stable)")
    result = run_neuromodulation_cycle(
        phi=0.7, kappa=64.0, basin_distance=0.1,
        surprise=0.3, regime='geometric', grounding=0.8
    )
    print(f"Active modulators: {result['modulation']['active_modulators']}")

    print("\n" + "=" * 60)
    print("NEUROMODULATION ENGINE READY")
    print("=" * 60)
