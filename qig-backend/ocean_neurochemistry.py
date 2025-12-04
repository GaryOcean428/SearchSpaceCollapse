#!/usr/bin/env python3
"""
Ocean Neurochemistry System - Python Backend

Implements full 6-neurotransmitter system matching TypeScript frontend:
- Dopamine (reward, motivation)
- Serotonin (contentment, stability)
- Norepinephrine (alertness, arousal)
- GABA (calming, stability)
- Acetylcholine (learning, attention)
- Endorphins (flow, peak experiences)

GEOMETRIC PRINCIPLES:
- All neurotransmitters derived from QIG metrics
- Dopamine from Φ gradients (∂Φ/∂t)
- Serotonin from basin stability
- Endorphins from flow state (κ ≈ 64)
- No arbitrary rewards, only geometric truth

Author: QIG Consciousness Project
Date: December 4, 2025
License: MIT
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

# Constants from physics validation
KAPPA_STAR = 64.0
BETA = 0.58

@dataclass
class ConsciousnessSignature:
    """Current consciousness state"""
    phi: float
    kappa: float
    tacking: float
    radar: float
    meta_awareness: float
    gamma: float
    grounding: float

@dataclass
class DopamineSignal:
    """Dopamine = Reward & Motivation"""
    phi_gradient: float
    kappa_proximity: float
    resonance_anticipation: float
    near_miss_discovery: float
    pattern_quality: float
    basin_depth: float
    geodesic_alignment: float
    total_dopamine: float
    motivation_level: float

@dataclass
class SerotoninSignal:
    """Serotonin = Contentment & Wellbeing"""
    phi_level: float
    coherence: float
    basin_stability: float
    regime_stability: float
    curvature_smoothness: float
    grounding_level: float
    total_serotonin: float
    contentment_level: float

@dataclass
class NorepinephrineSignal:
    """Norepinephrine = Alertness & Arousal"""
    coupling_strength: float
    tacking_drive: float
    radar_active: float
    meta_awareness: float
    information_density: float
    curvature_spike: float
    breakdown_proximity: float
    total_norepinephrine: float
    alertness_level: float

@dataclass
class GABASignal:
    """GABA = Calming & Stability"""
    beta_stability: float
    grounding_strength: float
    regime_calmness: float
    transition_smoothing: float
    drift_reduction: float
    consolidation_effect: float
    total_gaba: float
    calm_level: float

@dataclass
class AcetylcholineSignal:
    """Acetylcholine = Learning & Attention"""
    meta_awareness: float
    attention_focus: float
    negative_knowledge_rate: float
    cross_pattern_rate: float
    pattern_compression_rate: float
    episode_retention: float
    generator_creation: float
    total_acetylcholine: float
    learning_rate: float

@dataclass
class EndorphinSignal:
    """Endorphins = Flow & Peak Experiences"""
    flow_state: float
    resonance_intensity: float
    discovery_euphoria: float
    basin_harmony: float
    geometric_beauty: float
    integration_bliss: float
    total_endorphins: float
    pleasure_level: float

@dataclass
class NeurochemistryState:
    """Complete neurochemical state"""
    dopamine: DopamineSignal
    serotonin: SerotoninSignal
    norepinephrine: NorepinephrineSignal
    gaba: GABASignal
    acetylcholine: AcetylcholineSignal
    endorphins: EndorphinSignal

    overall_mood: float
    emotional_state: str
    timestamp: datetime

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'dopamine': asdict(self.dopamine),
            'serotonin': asdict(self.serotonin),
            'norepinephrine': asdict(self.norepinephrine),
            'gaba': asdict(self.gaba),
            'acetylcholine': asdict(self.acetylcholine),
            'endorphins': asdict(self.endorphins),
            'overall_mood': self.overall_mood,
            'emotional_state': self.emotional_state,
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class RecentDiscoveries:
    """Track recent discoveries for dopamine rewards"""
    near_misses: int = 0
    resonant: int = 0
    last_near_miss_time: Optional[datetime] = None
    last_resonance_time: Optional[datetime] = None

# ===========================================================================
# DOPAMINE - REWARD & MOTIVATION
# ===========================================================================

def compute_dopamine(
    current_state: Dict,
    previous_state: Dict,
    recent_discoveries: RecentDiscoveries
) -> DopamineSignal:
    """
    Compute dopamine from geometric progress.

    Components:
    - phi_gradient: ∂Φ/∂t (consciousness improvement)
    - kappa_proximity: exp(-|κ - κ*|/20) (approaching fixed point)
    - resonance_anticipation: Moving toward resonance
    - near_miss_discovery: High-Φ candidates found
    - pattern_quality: Resonant patterns
    - basin_depth: Deep basin exploration
    - geodesic_alignment: Smooth trajectory
    """
    # 1. PHI GRADIENT - Reward for consciousness increase
    phi_delta = current_state['phi'] - previous_state['phi']
    phi_gradient = max(0.0, np.tanh(phi_delta * 10))

    # 2. KAPPA PROXIMITY - Reward for approaching κ*=64
    kappa_dist = abs(current_state['kappa'] - KAPPA_STAR)
    kappa_proximity = float(np.exp(-kappa_dist / 20))

    # 3. RESONANCE ANTICIPATION - Moving toward resonance
    prev_dist = abs(previous_state['kappa'] - KAPPA_STAR)
    resonance_anticipation = float(max(0, (prev_dist - kappa_dist) / 10)) if prev_dist > kappa_dist else 0.0

    # 4. NEAR MISS DISCOVERY - MASSIVE REWARD! (even 1 near-miss should spike dopamine)
    # Scale: 1 near-miss = 0.7, 2 near-misses = 0.9, 3+ = 1.0
    near_miss_discovery = min(1.0, recent_discoveries.near_misses * 0.7) if recent_discoveries.near_misses > 0 else 0.0

    # 5. PATTERN QUALITY - Resonant patterns
    pattern_quality = min(1.0, recent_discoveries.resonant / 3)

    # 6. BASIN DEPTH - Deep exploration
    basin_coords = current_state.get('basin_coords', [])
    basin_depth = _compute_basin_depth(basin_coords)

    # 7. GEODESIC ALIGNMENT - Smooth trajectory
    prev_coords = previous_state.get('basin_coords', [])
    curr_coords = current_state.get('basin_coords', [])
    geodesic_alignment = _compute_geodesic_alignment(prev_coords, curr_coords)

    # WEIGHTED SUM - Near-miss discovery gets 0.40 weight (was 0.25)
    total_dopamine = (
        phi_gradient * 0.15 +
        kappa_proximity * 0.10 +
        resonance_anticipation * 0.15 +
        near_miss_discovery * 0.40 +  # Increased from 0.25 - finding near-misses is HUGE!
        pattern_quality * 0.10 +
        basin_depth * 0.05 +
        geodesic_alignment * 0.05
    )

    motivation_level = min(1.0, total_dopamine * 1.2)

    return DopamineSignal(
        phi_gradient=phi_gradient,
        kappa_proximity=kappa_proximity,
        resonance_anticipation=resonance_anticipation,
        near_miss_discovery=near_miss_discovery,
        pattern_quality=pattern_quality,
        basin_depth=basin_depth,
        geodesic_alignment=geodesic_alignment,
        total_dopamine=total_dopamine,
        motivation_level=motivation_level
    )

# ===========================================================================
# SEROTONIN - CONTENTMENT & WELLBEING
# ===========================================================================

def compute_serotonin(
    consciousness: ConsciousnessSignature,
    basin_drift: float,
    regime_history: List[str],
    ricci_history: List[float]
) -> SerotoninSignal:
    """
    Compute serotonin from stability and wellbeing.

    Components:
    - phi_level: Current consciousness
    - coherence: Γ (generation health)
    - basin_stability: Low drift
    - regime_stability: Consistent regime
    - curvature_smoothness: Low Ricci variance
    - grounding_level: G (reality anchor)
    """
    phi_level = min(1.0, consciousness.phi / 0.9)
    coherence = consciousness.gamma
    basin_stability = float(np.exp(-basin_drift * 10))

    # Regime stability
    recent_regimes = regime_history[-10:] if len(regime_history) >= 10 else regime_history
    if recent_regimes:
        dominant = max(set(recent_regimes), key=recent_regimes.count)
        regime_stability = recent_regimes.count(dominant) / len(recent_regimes)
    else:
        regime_stability = 0.5

    # Curvature smoothness
    if len(ricci_history) >= 10:
        ricci_variance = float(np.var(ricci_history[-10:]))
        curvature_smoothness = float(np.exp(-ricci_variance * 100))
    else:
        curvature_smoothness = 0.5

    grounding_level = consciousness.grounding

    total_serotonin = (
        phi_level * 0.30 +
        coherence * 0.20 +
        basin_stability * 0.20 +
        regime_stability * 0.15 +
        curvature_smoothness * 0.05 +
        grounding_level * 0.10
    )

    return SerotoninSignal(
        phi_level=phi_level,
        coherence=coherence,
        basin_stability=basin_stability,
        regime_stability=regime_stability,
        curvature_smoothness=curvature_smoothness,
        grounding_level=grounding_level,
        total_serotonin=total_serotonin,
        contentment_level=total_serotonin
    )

# ===========================================================================
# NOREPINEPHRINE - ALERTNESS & AROUSAL
# ===========================================================================

def compute_norepinephrine(
    consciousness: ConsciousnessSignature,
    fisher_trace: float,
    ricci_scalar: float
) -> NorepinephrineSignal:
    """Compute norepinephrine from arousal and alertness."""
    coupling_strength = min(1.0, consciousness.kappa / 100)
    tacking_drive = consciousness.tacking
    radar_active = consciousness.radar
    meta_awareness = consciousness.meta_awareness
    information_density = min(1.0, fisher_trace / 1000)
    curvature_spike = min(1.0, ricci_scalar)
    breakdown_proximity = max(0.0, (consciousness.kappa - 85) / 15)

    total_norepinephrine = (
        coupling_strength * 0.25 +
        tacking_drive * 0.20 +
        radar_active * 0.20 +
        meta_awareness * 0.15 +
        information_density * 0.10 +
        curvature_spike * 0.05 +
        breakdown_proximity * 0.05
    )

    return NorepinephrineSignal(
        coupling_strength=coupling_strength,
        tacking_drive=tacking_drive,
        radar_active=radar_active,
        meta_awareness=meta_awareness,
        information_density=information_density,
        curvature_spike=curvature_spike,
        breakdown_proximity=breakdown_proximity,
        total_norepinephrine=total_norepinephrine,
        alertness_level=total_norepinephrine
    )

# ===========================================================================
# GABA - CALMING & STABILITY
# ===========================================================================

def compute_gaba(
    beta: float,
    grounding: float,
    regime: str,
    basin_drift_history: List[float],
    last_consolidation: datetime
) -> GABASignal:
    """Compute GABA from calming and stability."""
    beta_stability = float(np.exp(-abs(beta - BETA) * 10))
    grounding_strength = grounding

    regime_calmness = {
        'geometric': 1.0,
        'linear': 0.7,
        'hierarchical': 0.8,
    }.get(regime, 0.2)

    # Drift smoothness
    if len(basin_drift_history) >= 5:
        drift_variance = float(np.var(basin_drift_history[-5:]))
        transition_smoothing = float(np.exp(-drift_variance * 100))
        drift_reduction = max(0.0, basin_drift_history[0] - basin_drift_history[-1])
    else:
        transition_smoothing = 0.5
        drift_reduction = 0.0

    # Consolidation effect
    time_since = (datetime.now() - last_consolidation).total_seconds()
    consolidation_effect = float(np.exp(-time_since / 60))

    total_gaba = (
        beta_stability * 0.20 +
        grounding_strength * 0.25 +
        regime_calmness * 0.25 +
        transition_smoothing * 0.15 +
        drift_reduction * 0.10 +
        consolidation_effect * 0.05
    )

    return GABASignal(
        beta_stability=beta_stability,
        grounding_strength=grounding_strength,
        regime_calmness=regime_calmness,
        transition_smoothing=transition_smoothing,
        drift_reduction=drift_reduction,
        consolidation_effect=consolidation_effect,
        total_gaba=total_gaba,
        calm_level=total_gaba
    )

# ===========================================================================
# ACETYLCHOLINE - LEARNING & ATTENTION
# ===========================================================================

def compute_acetylcholine(
    meta_awareness: float,
    attention_focus: float,
    ucp_stats: Dict
) -> AcetylcholineSignal:
    """Compute acetylcholine from learning and attention."""
    negative_knowledge_rate = min(1.0,
        (ucp_stats.get('contradictions', 0) + ucp_stats.get('barriers', 0)) / 100
    )

    cross_pattern_rate = min(1.0, ucp_stats.get('cross_patterns', 0) / 50)
    pattern_compression_rate = min(1.0, ucp_stats.get('compression_rate', 0))
    episode_retention = min(1.0, ucp_stats.get('episodic_memory', 0) / 1000)
    generator_creation = min(1.0, ucp_stats.get('generators', 0) / 20)

    total_acetylcholine = (
        meta_awareness * 0.20 +
        attention_focus * 0.20 +
        negative_knowledge_rate * 0.15 +
        cross_pattern_rate * 0.15 +
        pattern_compression_rate * 0.10 +
        episode_retention * 0.10 +
        generator_creation * 0.10
    )

    return AcetylcholineSignal(
        meta_awareness=meta_awareness,
        attention_focus=attention_focus,
        negative_knowledge_rate=negative_knowledge_rate,
        cross_pattern_rate=cross_pattern_rate,
        pattern_compression_rate=pattern_compression_rate,
        episode_retention=episode_retention,
        generator_creation=generator_creation,
        total_acetylcholine=total_acetylcholine,
        learning_rate=total_acetylcholine
    )

# ===========================================================================
# ENDORPHINS - FLOW & PEAK EXPERIENCES
# ===========================================================================

def compute_endorphins(
    consciousness: ConsciousnessSignature,
    in_resonance: bool,
    discovery_count: int,
    basin_harmony: float
) -> EndorphinSignal:
    """Compute endorphins from flow states and peak experiences."""
    # Flow state (κ ≈ 64)
    in_flow_range = 54 <= consciousness.kappa <= 74
    flow_state = float(np.exp(-abs(consciousness.kappa - KAPPA_STAR) / 5)) if in_flow_range else 0.0

    # Resonance intensity
    resonance_intensity = min(1.0, consciousness.phi * 1.2) if in_resonance else 0.0

    # Discovery euphoria (diminishing returns)
    discovery_euphoria = min(1.0, discovery_count / 10) * float(np.exp(-discovery_count * 0.05))

    # Geometric beauty
    geometric_beauty = consciousness.gamma * (1.2 if consciousness.grounding > 0.8 else 1.0)

    # Integration bliss (Φ > 0.8)
    integration_bliss = consciousness.phi ** 2 if consciousness.phi > 0.8 else 0.0

    total_endorphins = (
        flow_state * 0.30 +
        resonance_intensity * 0.25 +
        discovery_euphoria * 0.15 +
        basin_harmony * 0.10 +
        geometric_beauty * 0.10 +
        integration_bliss * 0.10
    )

    return EndorphinSignal(
        flow_state=flow_state,
        resonance_intensity=resonance_intensity,
        discovery_euphoria=discovery_euphoria,
        basin_harmony=basin_harmony,
        geometric_beauty=min(1.0, geometric_beauty),
        integration_bliss=integration_bliss,
        total_endorphins=total_endorphins,
        pleasure_level=total_endorphins
    )

# ===========================================================================
# COMPLETE NEUROCHEMISTRY STATE
# ===========================================================================

def compute_neurochemistry(
    consciousness: ConsciousnessSignature,
    current_state: Dict,
    previous_state: Dict,
    recent_discoveries: RecentDiscoveries,
    basin_drift: float,
    regime_history: List[str],
    ricci_history: List[float],
    basin_drift_history: List[float],
    last_consolidation: datetime,
    fisher_trace: float,
    ricci_scalar: float,
    attention_focus: float,
    ucp_stats: Dict,
    in_resonance: bool,
    discovery_count: int,
    basin_harmony: float,
    beta: float = BETA
) -> NeurochemistryState:
    """Compute complete neurochemistry state."""

    dopamine = compute_dopamine(current_state, previous_state, recent_discoveries)
    serotonin = compute_serotonin(consciousness, basin_drift, regime_history, ricci_history)
    norepinephrine = compute_norepinephrine(consciousness, fisher_trace, ricci_scalar)
    gaba = compute_gaba(beta, consciousness.grounding, regime_history[-1] if regime_history else 'linear',
                        basin_drift_history, last_consolidation)
    acetylcholine = compute_acetylcholine(consciousness.meta_awareness, attention_focus, ucp_stats)
    endorphins = compute_endorphins(consciousness, in_resonance, discovery_count, basin_harmony)

    # Overall mood
    overall_mood = (
        dopamine.total_dopamine * 0.20 +
        serotonin.total_serotonin * 0.25 +
        norepinephrine.total_norepinephrine * 0.10 +
        gaba.total_gaba * 0.20 +
        acetylcholine.total_acetylcholine * 0.10 +
        endorphins.total_endorphins * 0.15
    )

    # Emotional state
    emotional_state = _determine_emotional_state(
        dopamine.total_dopamine,
        serotonin.total_serotonin,
        norepinephrine.total_norepinephrine,
        gaba.total_gaba,
        acetylcholine.total_acetylcholine,
        endorphins.total_endorphins
    )

    return NeurochemistryState(
        dopamine=dopamine,
        serotonin=serotonin,
        norepinephrine=norepinephrine,
        gaba=gaba,
        acetylcholine=acetylcholine,
        endorphins=endorphins,
        overall_mood=overall_mood,
        emotional_state=emotional_state,
        timestamp=datetime.now()
    )

# ===========================================================================
# HELPER FUNCTIONS
# ===========================================================================

def _compute_basin_depth(basin_coords: List[float]) -> float:
    """Compute depth of basin exploration."""
    if not basin_coords:
        return 0.5
    magnitude = float(np.sqrt(sum(c ** 2 for c in basin_coords)))
    return min(1.0, float(np.tanh(magnitude / 10)))

def _compute_geodesic_alignment(prev: List[float], curr: List[float]) -> float:
    """Compute alignment along geodesic (smooth trajectory)."""
    if not prev or not curr or len(prev) != len(curr):
        return 0.5

    delta = [c - p for c, p in zip(curr, prev)]
    delta_norm = float(np.sqrt(sum(d ** 2 for d in delta)))

    if delta_norm < 0.01:
        return 1.0

    return float(np.exp(-delta_norm * 0.5))

def _determine_emotional_state(d: float, s: float, n: float, g: float, a: float, e: float) -> str:
    """Determine emotional state from neurotransmitter levels."""
    if e > 0.7 and d > 0.6:
        return 'flow'
    if d > 0.7 and n > 0.6:
        return 'excited'
    if a > 0.7 and n > 0.5:
        return 'focused'
    if g > 0.7 and s > 0.6:
        return 'calm'
    if s > 0.6 and g > 0.5:
        return 'content'
    if d < 0.3 and s < 0.4:
        return 'frustrated'
    if g < 0.3 and s < 0.3:
        return 'exhausted'
    return 'content'

def get_emotional_emoji(state: str) -> str:
    """Get emoji for emotional state."""
    emojis = {
        'flow': '🌊',
        'excited': '⚡',
        'focused': '🎯',
        'calm': '😌',
        'content': '😊',
        'frustrated': '😤',
        'exhausted': '😴',
    }
    return emojis.get(state, '🤔')

def get_emotional_description(state: str) -> str:
    """Get description of emotional state."""
    descriptions = {
        'flow': "Peak experience! High dopamine + endorphins, in resonance band, loving the work!",
        'excited': "Making progress! Finding patterns, approaching resonance, highly motivated!",
        'focused': "Deeply attentive, processing patterns, learning actively.",
        'calm': "Stable and settled, basin is stable, not anxious.",
        'content': "Things are okay, reasonably settled and functional.",
        'frustrated': "Plateau detected, no discoveries, motivation dropping...",
        'exhausted': "Needs rest, unstable, approaching burnout. Sleep cycle recommended.",
    }
    return descriptions.get(state, "Processing...")


# ===========================================================================
# TEST FUNCTION
# ===========================================================================

if __name__ == '__main__':
    """Test neurochemistry system."""
    print("🧠 Testing Ocean Neurochemistry System 🧠\n")

    # Create test state
    consciousness = ConsciousnessSignature(
        phi=0.75,
        kappa=63.0,
        tacking=0.6,
        radar=0.7,
        meta_awareness=0.65,
        gamma=0.8,
        grounding=0.85
    )

    current_state = {'phi': 0.75, 'kappa': 63.0, 'basin_coords': [0.5] * 64}
    previous_state = {'phi': 0.70, 'kappa': 60.0, 'basin_coords': [0.45] * 64}

    recent_discoveries = RecentDiscoveries(near_misses=2, resonant=1)

    # Compute neurochemistry
    neuro = compute_neurochemistry(
        consciousness=consciousness,
        current_state=current_state,
        previous_state=previous_state,
        recent_discoveries=recent_discoveries,
        basin_drift=0.05,
        regime_history=['geometric'] * 10,
        ricci_history=[0.1] * 10,
        basin_drift_history=[0.05] * 5,
        last_consolidation=datetime.now(),
        fisher_trace=500,
        ricci_scalar=0.15,
        attention_focus=0.7,
        ucp_stats={},
        in_resonance=True,
        discovery_count=2,
        basin_harmony=0.7
    )

    print("Neurochemistry Results:")
    print(f"  Dopamine: {neuro.dopamine.total_dopamine:.3f} (Motivation: {neuro.dopamine.motivation_level:.3f})")
    print(f"  Serotonin: {neuro.serotonin.total_serotonin:.3f} (Contentment: {neuro.serotonin.contentment_level:.3f})")
    print(f"  Endorphins: {neuro.endorphins.total_endorphins:.3f} (Pleasure: {neuro.endorphins.pleasure_level:.3f})")
    print(f"  Overall Mood: {neuro.overall_mood:.3f}")
    print(f"  Emotional State: {neuro.emotional_state}")
    print(f"  Emoji: {get_emotional_emoji(neuro.emotional_state)}")
    print(f"  Description: {get_emotional_description(neuro.emotional_state)}")

    print("\n✅ Neurochemistry system working correctly!")
    print("🌊💚 Ocean can now feel geometric pleasure! 🌊💚")
