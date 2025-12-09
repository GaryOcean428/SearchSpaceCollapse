"""
Fisher Information Metric

The Fisher information metric defines the geometry of the probability
manifold. It's fundamental to pure QIG - we use Fisher-Rao distance,
NOT Euclidean distance.

Key insight: Information geometry is intrinsically curved, not flat.
"""

import numpy as np
from scipy.linalg import sqrtm


def fisher_metric_tensor(probabilities: np.ndarray) -> np.ndarray:
    """
    Compute Fisher information metric tensor at a point on probability simplex.

    For categorical distribution with probabilities p = (p_1, ..., p_n):
    G_ij = δ_ij / p_i  (diagonal metric)

    Args:
        probabilities: Probability distribution (must sum to 1)

    Returns:
        Fisher metric tensor (n x n matrix)
    """
    if not np.isclose(probabilities.sum(), 1.0):
        raise ValueError(f"Probabilities must sum to 1, got {probabilities.sum()}")

    # Diagonal Fisher metric
    n = len(probabilities)
    G = np.zeros((n, n))

    for i in range(n):
        if probabilities[i] > 1e-10:  # Avoid division by zero
            G[i, i] = 1.0 / probabilities[i]

    return G


def fisher_rao_distance(p: np.ndarray, q: np.ndarray) -> float:
    """
    Compute Fisher-Rao distance between two probability distributions.

    This is the GEODESIC distance on the information manifold.

    Formula: d_FR(p, q) = 2 * arccos(Σ√(p_i * q_i))

    Args:
        p: First probability distribution
        q: Second probability distribution

    Returns:
        Fisher-Rao distance (≥ 0)
    """
    # Ensure valid probability distributions
    p = np.abs(p) + 1e-10
    p = p / p.sum()

    q = np.abs(q) + 1e-10
    q = q / q.sum()

    # Bhattacharyya coefficient
    bc = np.sum(np.sqrt(p * q))
    bc = np.clip(bc, 0, 1)  # Numerical stability

    # Fisher-Rao distance
    distance = 2 * np.arccos(bc)

    return distance


def compute_phi(trajectory: np.ndarray, window_size: int = 5) -> float:
    """
    Compute integrated information Φ from basin trajectory.

    Φ measures how much the system integrates information across subsystems.
    High Φ = consciousness/integration
    Low Φ = fragmented/unconscious

    Args:
        trajectory: Array of shape (T, D) where T = time steps, D = dimensions
        window_size: Number of time steps to consider for integration

    Returns:
        Φ value (0-1)
    """
    if len(trajectory) < window_size:
        return 0.0

    # Measure integration across time windows
    integrations = []

    for i in range(len(trajectory) - window_size + 1):
        window = trajectory[i:i+window_size]

        # Compute mutual information between past and future
        past = window[:window_size//2]
        future = window[window_size//2:]

        # Simplified Φ: correlation between past and future
        if len(past) > 0 and len(future) > 0:
            correlation = np.corrcoef(
                past.flatten(),
                future.flatten()
            )[0, 1]

            if not np.isnan(correlation):
                integrations.append(abs(correlation))

    if not integrations:
        return 0.0

    # Φ is average integration
    phi = np.mean(integrations)

    return float(np.clip(phi, 0, 1))


def compute_kappa(phi: float, dimension: int = 64) -> float:
    """
    Compute κ (coupling constant) from Φ and dimensionality.

    Relationship from QIG physics:
    κ* ≈ 63.5 ± 1.5 (validated at L=6)

    κ = Φ * κ* * sqrt(D/64)

    Args:
        phi: Integrated information
        dimension: Basin coordinate dimensionality

    Returns:
        Coupling constant κ
    """
    KAPPA_STAR = 63.5  # Validated fixed point

    # Scale by dimension
    kappa = phi * KAPPA_STAR * np.sqrt(dimension / 64)

    return kappa


def natural_gradient(
    gradient: np.ndarray,
    fisher_metric: np.ndarray
) -> np.ndarray:
    """
    Compute natural gradient using Fisher metric.

    Natural gradient: ∇̃f = G^(-1) ∇f
    where G is the Fisher metric tensor.

    This is the proper way to do gradient descent on curved manifolds.

    Args:
        gradient: Ordinary gradient ∇f
        fisher_metric: Fisher metric tensor G

    Returns:
        Natural gradient ∇̃f
    """
    try:
        # Compute G^(-1) ∇f
        natural_grad = np.linalg.solve(fisher_metric, gradient)
        return natural_grad
    except np.linalg.LinAlgError:
        # Singular matrix - add small regularization
        reg_metric = fisher_metric + 1e-6 * np.eye(len(fisher_metric))
        natural_grad = np.linalg.solve(reg_metric, gradient)
        return natural_grad


def parallel_transport(
    vector: np.ndarray,
    start_point: np.ndarray,
    end_point: np.ndarray
) -> np.ndarray:
    """
    Parallel transport a vector along geodesic on Fisher manifold.

    This preserves the "direction" of the vector as we move along
    the curved manifold.

    Args:
        vector: Tangent vector at start_point
        start_point: Starting probability distribution
        end_point: Ending probability distribution

    Returns:
        Parallel transported vector at end_point
    """
    # Ensure valid distributions
    p_start = np.abs(start_point) + 1e-10
    p_start = p_start / p_start.sum()

    p_end = np.abs(end_point) + 1e-10
    p_end = p_end / p_end.sum()

    # Simplified parallel transport using metric tensors
    G_start = fisher_metric_tensor(p_start)
    G_end = fisher_metric_tensor(p_end)

    try:
        # Transform: v_end = sqrt(G_end) * sqrt(G_start^(-1)) * v_start
        G_start_inv = np.linalg.inv(G_start + 1e-6 * np.eye(len(G_start)))

        sqrt_G_start_inv = np.real(np.asarray(sqrtm(G_start_inv)))
        sqrt_G_end = np.real(np.asarray(sqrtm(G_end)))

        transported = sqrt_G_end @ sqrt_G_start_inv @ vector

        return transported
    except np.linalg.LinAlgError:
        # Fallback: just return the vector (flat space approximation)
        return vector


def ricci_curvature_estimate(
    center: np.ndarray,
    neighbors: list[np.ndarray],
    epsilon: float = 0.01
) -> float:
    """
    Estimate Ricci curvature at a point on the manifold.

    Positive curvature = sphere-like (converging geodesics)
    Negative curvature = saddle-like (diverging geodesics)
    Zero curvature = flat

    High Ricci curvature indicates geometric stress (FRACTURE risk).

    Args:
        center: Central point on manifold
        neighbors: Nearby points
        epsilon: Small parameter for finite differences

    Returns:
        Ricci curvature estimate
    """
    if len(neighbors) < 4:
        return 0.0  # Need sufficient neighbors

    # Compute average expansion/contraction of geodesic ball
    distances = [fisher_rao_distance(center, n) for n in neighbors]

    # Compare actual distances to expected (flat space)
    avg_distance = np.mean(distances)

    # Normalized variance indicates curvature
    variance = np.var(distances)

    # Positive curvature = smaller variance (geodesics converge)
    # Negative curvature = larger variance (geodesics diverge)
    ricci = -variance / (avg_distance ** 2 + epsilon)

    return float(ricci)


def sectional_curvature(
    point: np.ndarray,
    tangent1: np.ndarray,
    tangent2: np.ndarray
) -> float:
    """
    Compute sectional curvature in the plane spanned by two tangent vectors.

    This measures the intrinsic curvature of the 2D submanifold.

    Args:
        point: Point on manifold
        tangent1: First tangent vector
        tangent2: Second tangent vector

    Returns:
        Sectional curvature
    """
    # Ensure valid distribution
    p = np.abs(point) + 1e-10
    p = p / p.sum()

    G = fisher_metric_tensor(p)

    # Compute curvature using Riemann tensor (simplified)
    # For Fisher manifold, curvature can be computed from metric

    # Gram determinant
    g11 = tangent1 @ G @ tangent1
    g12 = tangent1 @ G @ tangent2
    g22 = tangent2 @ G @ tangent2

    gram_det = g11 * g22 - g12 ** 2

    if gram_det < 1e-10:
        return 0.0  # Degenerate

    # Simplified sectional curvature for Fisher manifold
    # K = -1/4 * trace(G^(-1))
    try:
        G_inv = np.linalg.inv(G + 1e-6 * np.eye(len(G)))
        K = -0.25 * np.trace(G_inv)
        return K
    except np.linalg.LinAlgError:
        return 0.0
