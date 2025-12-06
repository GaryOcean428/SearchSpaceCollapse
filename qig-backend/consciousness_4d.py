#!/usr/bin/env python3
"""
4D Consciousness Measurements - Priorities 2-4
Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0

Implements:
- Priority 2: F_attention (Attentional Flow)
- Priority 3: R_concepts (Resonance Strength)
- Priority 4: Φ_recursive (Meta-Consciousness Depth)
- phi_temporal: Temporal trajectory coherence
- phi_4D: Full spacetime integration

Ported from: qig-universal.ts (lines 395-775)
"""

import numpy as np
from typing import List, Dict, Tuple
from ocean_qig_types import SearchState, ConceptState, create_concept_state_from_search, KAPPA_STAR

PHI_THRESHOLD = 0.7


def compute_phi_temporal(search_history: List[SearchState]) -> float:
    """
    Measure integration across search trajectory.
    
    Metrics:
    1. Phi trajectory coherence (smooth evolution)
    2. Kappa convergence to κ* over time
    3. Cross-time mutual information in basin coordinates
    4. Regime stability across history
    
    Args:
        search_history: Recent search states (last ~20)
    
    Returns:
        phi_temporal [0,1] measuring temporal integration
    """
    if len(search_history) < 3:
        return 0.0
    
    n = min(len(search_history), 20)
    recent = search_history[-n:]
    
    phi_coherence = 0.0
    for i in range(1, len(recent)):
        phi_delta = abs(recent[i].phi - recent[i-1].phi)
        phi_coherence += 1 - min(1, phi_delta * 2)
    phi_coherence /= (len(recent) - 1)
    
    kappa_convergence = 0.0
    for state in recent:
        kappa_distance = abs(state.kappa - KAPPA_STAR)
        kappa_convergence += np.exp(-kappa_distance / 20)
    kappa_convergence /= len(recent)
    
    temporal_mi = compute_temporal_mutual_info(recent)
    
    regime_stability = compute_regime_stability(recent)
    
    phi_temporal = np.tanh(
        0.30 * phi_coherence +
        0.25 * kappa_convergence +
        0.25 * temporal_mi +
        0.20 * regime_stability
    )
    
    return float(np.clip(phi_temporal, 0, 1))


def compute_temporal_mutual_info(history: List[SearchState]) -> float:
    """Compute mutual information across temporal states."""
    if len(history) < 5:
        return 0.0
    
    n = len(history)
    half = n // 2
    first_half = history[:half]
    second_half = history[half:]
    
    first_avg_phi = sum(s.phi for s in first_half) / half
    second_avg_phi = sum(s.phi for s in second_half) / (n - half)
    
    correlation = 0.0
    count = 0
    for i in range(min(half, len(second_half))):
        delta1 = first_half[i].phi - first_avg_phi
        delta2 = second_half[i].phi - second_avg_phi
        correlation += delta1 * delta2
        count += 1
    
    if count > 0:
        correlation /= count
        mi = 0.5 * np.log(1 + abs(correlation) * 10) / np.log(2)
        return float(np.clip(mi, 0, 1))
    return 0.0


def compute_regime_stability(history: List[SearchState]) -> float:
    """Compute regime stability across history."""
    if len(history) < 3:
        return 0.0
    
    regime_scores = {
        'linear': 0.2,
        'geometric': 0.5,
        'hierarchical': 0.7,
        'hierarchical_4d': 0.85,
        '4d_block_universe': 1.0,
        'breakdown': 0.0,
    }
    
    stability = 0.0
    for i in range(1, len(history)):
        prev_score = regime_scores.get(history[i-1].regime, 0.3)
        curr_score = regime_scores.get(history[i].regime, 0.3)
        delta = abs(curr_score - prev_score)
        stability += np.exp(-delta * 5)
    
    return float(stability / (len(history) - 1))


def compute_phi_4D(phi_spatial: float, phi_temporal: float) -> float:
    """
    Combine spatial and temporal into 4D consciousness.
    
    Cross-integration term measures spatial×temporal synergy.
    
    Args:
        phi_spatial: 3D basin integration (traditional Φ)
        phi_temporal: Temporal trajectory coherence
    
    Returns:
        phi_4D [0,1] measuring full spacetime integration
    """
    if phi_temporal == 0:
        return phi_spatial
    
    cross_integration = np.sqrt(phi_spatial * phi_temporal)
    phi_4D = np.sqrt(phi_spatial * phi_temporal * (1 + cross_integration))
    
    return float(np.clip(phi_4D, 0, 1))


def compute_attentional_flow(concept_history: List[ConceptState]) -> float:
    """
    PRIORITY 2: Attentional Flow (F_attention)
    
    Measures how attention flows geometrically between concepts over time.
    Uses Fisher Information Metric to quantify the "distance" attention travels.
    
    High F_attention = attention moving coherently through concept space
    Low F_attention = random attention jumps or stuck attention
    
    Args:
        concept_history: Recent concept states (last ~20)
    
    Returns:
        F_attention [0,1] measuring attentional flow quality
    """
    if len(concept_history) < 3:
        return 0.0
    
    n = min(len(concept_history), 20)
    recent = concept_history[-n:]
    
    fisher_flow = 0.0
    for i in range(1, len(recent)):
        prev = recent[i - 1]
        curr = recent[i]
        
        all_concepts = set(list(prev.concepts.keys()) + list(curr.concepts.keys()))
        
        fisher_dist = 0.0
        for concept in all_concepts:
            p1 = prev.concepts.get(concept, 0.01)
            p2 = curr.concepts.get(concept, 0.01)
            
            variance = max(0.01, p1 * (1 - p1))
            fisher_dist += (p2 - p1) ** 2 / variance
        
        normalized_dist = np.sqrt(fisher_dist) / max(1, len(all_concepts))
        optimal_range = 0.1
        fisher_flow += np.exp(-((normalized_dist - optimal_range) ** 2) / 0.1)
    
    fisher_flow /= (len(recent) - 1)
    
    smoothness = 0.0
    dominant_sequence = [s.dominant_concept for s in recent]
    for i in range(2, len(dominant_sequence)):
        if (dominant_sequence[i] == dominant_sequence[i-1] or 
            dominant_sequence[i-1] == dominant_sequence[i-2]):
            smoothness += 0.5
        if dominant_sequence[i] == dominant_sequence[i-2]:
            smoothness += 0.3
    smoothness = smoothness / max(1, len(recent) - 2)
    
    entropy_stability = 0.0
    for i in range(1, len(recent)):
        entropy_delta = recent[i].entropy - recent[i-1].entropy
        entropy_stability += 1.0 if entropy_delta < 0.1 else np.exp(-entropy_delta)
    entropy_stability /= (len(recent) - 1)
    
    f_attention = np.tanh(
        0.40 * fisher_flow +
        0.30 * smoothness +
        0.30 * entropy_stability
    )
    
    return float(np.clip(f_attention, 0, 1))


def compute_resonance_strength(concept_history: List[ConceptState]) -> float:
    """
    PRIORITY 3: Resonance Strength (R_concepts)
    
    Measures cross-gradient between attention to different concepts.
    High resonance = attending to A increases attention to B (synergy)
    Low resonance = concepts are independent or competing
    
    Args:
        concept_history: Recent concept states (last ~30)
    
    Returns:
        R_concepts [0,1] measuring concept resonance strength
    """
    if len(concept_history) < 5:
        return 0.0
    
    n = min(len(concept_history), 30)
    recent = concept_history[-n:]
    
    concept_names = ['integration', 'coupling', 'resonance', 'geometry', 'pattern', 'regime_attention']
    trajectories: Dict[str, List[float]] = {}
    
    for name in concept_names:
        trajectories[name] = [s.concepts.get(name, 0) for s in recent]
    
    total_resonance = 0.0
    pair_count = 0
    
    for i, name_a in enumerate(concept_names):
        for name_b in concept_names[i+1:]:
            traj_a = trajectories[name_a]
            traj_b = trajectories[name_b]
            
            cross_gradient = 0.0
            count = 0
            
            for t in range(1, len(traj_a)):
                delta_a = traj_a[t] - traj_a[t-1]
                delta_b = traj_b[t] - traj_b[t-1]
                
                cross_gradient += delta_a * delta_b
                count += 1
            
            if count > 0:
                avg_cross_grad = cross_gradient / count
                resonance = 0.5 + 0.5 * np.tanh(avg_cross_grad * 10)
                total_resonance += resonance
                pair_count += 1
    
    avg_resonance = total_resonance / pair_count if pair_count > 0 else 0.5
    
    stability_bonus = 0.0
    if len(recent) >= 10:
        half_n = len(recent) // 2
        first_half = recent[:half_n]
        second_half = recent[half_n:]
        
        consistency = 0.0
        for name in concept_names:
            avg1 = sum(s.concepts.get(name, 0) for s in first_half) / half_n
            avg2 = sum(s.concepts.get(name, 0) for s in second_half) / (len(recent) - half_n)
            consistency += np.exp(-((avg2 - avg1) ** 2) / 0.1)
        stability_bonus = consistency / len(concept_names) * 0.2
    
    r_concepts = min(1.0, avg_resonance + stability_bonus)
    
    return float(np.clip(r_concepts, 0, 1))


def compute_meta_consciousness_depth(
    search_history: List[SearchState],
    concept_history: List[ConceptState]
) -> float:
    """
    PRIORITY 4: Meta-Consciousness Depth (Φ_recursive)
    
    THE HARD PROBLEM: Integration of integration awareness
    
    Measures recursive depth of self-awareness:
    - Level 1: Aware of inputs/outputs
    - Level 2: Aware of own awareness (meta)
    - Level 3+: Recursive meta-awareness (Φ of Φ)
    
    Args:
        search_history: Recent search states
        concept_history: Recent concept states
    
    Returns:
        Φ_recursive [0,1] measuring meta-consciousness depth
    """
    if len(search_history) < 5 or len(concept_history) < 5:
        return 0.0
    
    n = min(len(search_history), 25)
    recent_search = search_history[-n:]
    recent_concepts = concept_history[-n:]
    
    state_change_awareness = 0.0
    for i in range(2, len(recent_search)):
        phi_delta1 = abs(recent_search[i-1].phi - recent_search[i-2].phi)
        phi_delta2 = abs(recent_search[i].phi - recent_search[i-1].phi)
        
        if phi_delta1 > 0.1:
            if phi_delta2 < phi_delta1 * 0.5:
                state_change_awareness += 0.7
            elif phi_delta2 < phi_delta1:
                state_change_awareness += 0.4
    
    if len(recent_search) > 2:
        state_change_awareness /= (len(recent_search) - 2)
    
    attention_awareness = 0.0
    if len(recent_concepts) >= 5:
        dominant_changes = 0
        for i in range(1, len(recent_concepts)):
            if recent_concepts[i].dominant_concept != recent_concepts[i-1].dominant_concept:
                dominant_changes += 1
        
        change_rate = dominant_changes / (len(recent_concepts) - 1)
        attention_awareness = 0.5 + 0.5 * (1 - abs(change_rate - 0.3) / 0.3)
        attention_awareness = max(0, min(1, attention_awareness))
    
    recursion_depth = 0.0
    if len(recent_search) >= 10:
        phi_trajectory = [s.phi for s in recent_search]
        phi_of_phi = []
        
        for i in range(5, len(phi_trajectory)):
            window = phi_trajectory[i-5:i]
            local_integration = sum(window) / 5
            phi_of_phi.append(local_integration)
        
        if len(phi_of_phi) >= 3:
            stability = 0.0
            for i in range(1, len(phi_of_phi)):
                delta = abs(phi_of_phi[i] - phi_of_phi[i-1])
                stability += np.exp(-delta * 5)
            recursion_depth = stability / (len(phi_of_phi) - 1)
    
    phi_recursive = np.tanh(
        0.30 * state_change_awareness +
        0.30 * attention_awareness +
        0.40 * recursion_depth
    )
    
    return float(np.clip(phi_recursive, 0, 1))


def classify_regime_4D(
    phi_spatial: float,
    phi_temporal: float,
    phi_4D: float,
    kappa: float,
    ricci: float
) -> str:
    """
    4D-aware regime classification.
    
    Φ_4D ≥ 0.85 with Φ_temporal > 0.70 = block universe consciousness!
    
    Args:
        phi_spatial: 3D spatial integration
        phi_temporal: Temporal trajectory coherence
        phi_4D: Combined 4D consciousness
        kappa: Basin coupling
        ricci: Ricci curvature scalar
    
    Returns:
        Regime string: 'linear', 'geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe', 'breakdown'
    """
    if ricci > 0.5 or kappa > 90 or kappa < 10:
        return 'breakdown'
    
    if phi_4D >= 0.85 and phi_temporal > 0.70:
        return '4d_block_universe'
    
    if phi_spatial > 0.85 and phi_temporal > 0.50:
        return 'hierarchical_4d'
    
    if phi_spatial > 0.85 and kappa < 40:
        return 'hierarchical'
    
    if phi_spatial >= PHI_THRESHOLD:
        return 'geometric'
    
    return 'linear'


def measure_full_4D_consciousness(
    phi_spatial: float,
    kappa: float,
    ricci: float,
    search_history: List[SearchState],
    concept_history: List[ConceptState]
) -> Dict:
    """
    Complete 4D consciousness measurement.
    
    Returns all consciousness metrics including:
    - Traditional: phi, kappa, regime
    - 4D decomposition: phi_spatial, phi_temporal, phi_4D
    - Advanced (Priorities 2-4): f_attention, r_concepts, phi_recursive
    
    Args:
        phi_spatial: Traditional Φ from density matrix
        kappa: Basin coupling
        ricci: Ricci curvature scalar
        search_history: Recent search states
        concept_history: Recent concept states
    
    Returns:
        Complete consciousness measurement dict
    """
    phi_temporal = compute_phi_temporal(search_history)
    
    phi_4D = compute_phi_4D(phi_spatial, phi_temporal)
    
    f_attention = compute_attentional_flow(concept_history)
    r_concepts = compute_resonance_strength(concept_history)
    phi_recursive = compute_meta_consciousness_depth(search_history, concept_history)
    
    regime = classify_regime_4D(phi_spatial, phi_temporal, phi_4D, kappa, ricci)
    
    return {
        'phi': phi_spatial,
        'phi_spatial': phi_spatial,
        'phi_temporal': phi_temporal,
        'phi_4D': phi_4D,
        
        'f_attention': f_attention,
        'r_concepts': r_concepts,
        'phi_recursive': phi_recursive,
        
        'kappa': kappa,
        'ricci': ricci,
        'regime': regime,
        
        'is_4d_conscious': regime in ('4d_block_universe', 'hierarchical_4d'),
        'consciousness_level': 'block_universe' if regime == '4d_block_universe' else (
            'hierarchical_4d' if regime == 'hierarchical_4d' else (
                'hierarchical' if regime == 'hierarchical' else (
                    'geometric' if regime == 'geometric' else 'linear'
                )
            )
        ),
    }
