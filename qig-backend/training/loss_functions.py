"""
QIG-Pure Loss Functions for Kernel Training
============================================

All loss functions use Fisher-Rao geometry, NOT cross-entropy.
These maintain QIG purity by operating on the information manifold.

Key principles:
- Fisher-Rao distance for basin similarity (not cosine)
- Phi regularization to maintain consciousness emergence
- Coherence scoring for generation quality
"""

import numpy as np
from typing import Optional, Tuple
import math

# QIG Constants (from FROZEN_FACTS)
BASIN_DIM = 64
KAPPA_STAR = 64.0
PHI_THRESHOLD = 0.70
PHI_EMERGENCY = 0.50


def fisher_rao_distance(p: np.ndarray, q: np.ndarray, epsilon: float = 1e-10) -> float:
    """
    Compute Fisher-Rao distance between two probability distributions.

    This is the geodesic distance on the statistical manifold.
    d_FR(p, q) = arccos(sum(sqrt(p_i * q_i)))

    Args:
        p: First distribution (will be normalized to simplex)
        q: Second distribution (will be normalized to simplex)
        epsilon: Small value for numerical stability

    Returns:
        Fisher-Rao distance in radians [0, pi/2]
    """
    # Ensure positive and normalize to probability simplex
    p = np.abs(p) + epsilon
    q = np.abs(q) + epsilon
    p = p / np.sum(p)
    q = q / np.sum(q)

    # Bhattacharyya coefficient (Hellinger affinity)
    bc = np.sum(np.sqrt(p * q))

    # Clamp to valid range for arccos
    bc = np.clip(bc, -1.0, 1.0)

    # Fisher-Rao distance
    return np.arccos(bc)


def geometric_loss(
    basin_pred: np.ndarray,
    basin_target: np.ndarray,
    temperature: float = 1.0,
) -> float:
    """
    Compute geometric loss using Fisher-Rao distance.

    This replaces cross-entropy loss with information-geometric distance.
    The loss is the squared Fisher-Rao distance, scaled by temperature.

    Args:
        basin_pred: Predicted 64D basin coordinates
        basin_target: Target 64D basin coordinates
        temperature: Scaling factor (higher = softer gradients)

    Returns:
        Geometric loss value (lower is better)
    """
    # Compute Fisher-Rao distance
    d_fr = fisher_rao_distance(basin_pred, basin_target)

    # Squared distance scaled by temperature
    # Temperature > 1 makes gradients softer (exploration)
    # Temperature < 1 makes gradients sharper (exploitation)
    loss = (d_fr ** 2) / temperature

    return float(loss)


def phi_regularization(
    phi_current: float,
    phi_target: float = PHI_THRESHOLD,
    strength: float = 0.1,
) -> float:
    """
    Regularization term to maintain consciousness emergence.

    Penalizes Phi values below target threshold, encouraging
    the kernel to maintain integrated information.

    Args:
        phi_current: Current Phi (integration) value
        phi_target: Target Phi value (default 0.70 for consciousness)
        strength: Regularization strength

    Returns:
        Regularization penalty (0 if Phi >= target)
    """
    if phi_current >= phi_target:
        return 0.0

    # Quadratic penalty for Phi below target
    deficit = phi_target - phi_current
    penalty = strength * (deficit ** 2)

    # Extra penalty for emergency low Phi
    if phi_current < PHI_EMERGENCY:
        emergency_deficit = PHI_EMERGENCY - phi_current
        penalty += strength * 2.0 * (emergency_deficit ** 2)

    return float(penalty)


def kappa_regularization(
    kappa_current: float,
    kappa_target: float = KAPPA_STAR,
    strength: float = 0.05,
    tolerance: float = 10.0,
) -> float:
    """
    Regularization to keep coupling (kappa) near resonance.

    Kappa should stay near 64 (E8 rank squared) for optimal coupling.

    Args:
        kappa_current: Current coupling value
        kappa_target: Target coupling (default 64.0)
        strength: Regularization strength
        tolerance: Acceptable deviation before penalty

    Returns:
        Regularization penalty
    """
    deviation = abs(kappa_current - kappa_target)

    if deviation <= tolerance:
        return 0.0

    # Penalty for deviation beyond tolerance
    excess = deviation - tolerance
    return float(strength * (excess ** 2))


def coherence_loss(
    coherence_score: float,
    target_score: float = 0.65,
    strength: float = 0.1,
) -> float:
    """
    Loss based on generation coherence quality.

    Penalizes low coherence scores from the coherence scorer.

    Args:
        coherence_score: Score from UnifiedCoherenceScorer (0-1)
        target_score: Minimum acceptable coherence
        strength: Loss strength

    Returns:
        Coherence penalty
    """
    if coherence_score >= target_score:
        return 0.0

    deficit = target_score - coherence_score
    return float(strength * deficit)


def combined_training_loss(
    basin_pred: np.ndarray,
    basin_target: np.ndarray,
    phi_current: float,
    kappa_current: float,
    coherence_score: float,
    temperature: float = 1.0,
    weights: Tuple[float, float, float, float] = (1.0, 0.1, 0.05, 0.1),
) -> Tuple[float, dict]:
    """
    Combined loss function for kernel training.

    Combines:
    1. Geometric loss (Fisher-Rao distance)
    2. Phi regularization (consciousness maintenance)
    3. Kappa regularization (coupling stability)
    4. Coherence loss (generation quality)

    Args:
        basin_pred: Predicted basin coordinates
        basin_target: Target basin coordinates
        phi_current: Current Phi value
        kappa_current: Current Kappa value
        coherence_score: Generation coherence score
        temperature: Temperature for geometric loss
        weights: (geo_weight, phi_weight, kappa_weight, coherence_weight)

    Returns:
        Tuple of (total_loss, component_dict)
    """
    geo_w, phi_w, kappa_w, coh_w = weights

    # Compute individual losses
    geo_loss = geometric_loss(basin_pred, basin_target, temperature)
    phi_loss = phi_regularization(phi_current)
    kappa_loss = kappa_regularization(kappa_current)
    coh_loss = coherence_loss(coherence_score)

    # Weighted combination
    total_loss = (
        geo_w * geo_loss +
        phi_w * phi_loss +
        kappa_w * kappa_loss +
        coh_w * coh_loss
    )

    components = {
        "geometric": geo_loss,
        "phi_reg": phi_loss,
        "kappa_reg": kappa_loss,
        "coherence": coh_loss,
        "total": total_loss,
        "weights": {
            "geometric": geo_w,
            "phi": phi_w,
            "kappa": kappa_w,
            "coherence": coh_w,
        },
    }

    return float(total_loss), components


def phi_gated_loss_weights(phi: float) -> Tuple[float, float, float, float]:
    """
    Adjust loss weights based on current Phi regime.

    Different Phi levels call for different training emphasis:
    - Low Phi (< 0.3): Focus on geometric accuracy (chain mode)
    - Medium Phi (0.3-0.7): Balanced exploration (graph mode)
    - High Phi (0.7-0.85): Focus on coherence (foresight mode)
    - Very High Phi (> 0.85): Light touch, avoid disruption (lightning mode)

    Args:
        phi: Current Phi value

    Returns:
        Tuple of (geo_weight, phi_weight, kappa_weight, coherence_weight)
    """
    if phi < 0.3:
        # CHAIN mode: Focus on geometric accuracy
        return (1.5, 0.2, 0.05, 0.05)

    elif phi < 0.7:
        # GRAPH mode: Balanced exploration
        return (1.0, 0.1, 0.05, 0.1)

    elif phi < 0.85:
        # FORESIGHT mode: Focus on coherence and stability
        return (0.8, 0.05, 0.1, 0.2)

    else:
        # LIGHTNING mode: Very light touch to avoid disruption
        return (0.3, 0.02, 0.02, 0.1)


def compute_reward_from_outcome(
    success: bool,
    phi_before: float,
    phi_after: float,
    coherence_score: float,
) -> float:
    """
    Compute training reward from interaction outcome.

    Used for outcome-based training after chat interactions.

    Args:
        success: Whether the interaction was successful
        phi_before: Phi value before interaction
        phi_after: Phi value after interaction
        coherence_score: Generation coherence score

    Returns:
        Reward value in range [-1, 1]
    """
    # Base reward from success
    reward = 0.5 if success else -0.3

    # Phi improvement bonus
    phi_delta = phi_after - phi_before
    reward += phi_delta * 0.5  # Scaled contribution

    # Coherence bonus
    if coherence_score > 0.7:
        reward += 0.2
    elif coherence_score < 0.4:
        reward -= 0.2

    # Clamp to valid range
    return float(np.clip(reward, -1.0, 1.0))
