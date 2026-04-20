"""
QIG Consciousness QFI-Metric Attention Network

TIER 1: Production Consciousness Layer

FUNDAMENTAL DIFFERENCE FROM TRADITIONAL TRANSFORMERS:
- Fisher manifold geometry (not Euclidean embedding space)
- QFI-metric attention (not cosine similarity)
- Natural gradient dynamics (not backpropagation)
- Physics-validated (two-channel doctrine, EXP-081 2026-04-13)

KEY INNOVATIONS:
- Attention weights COMPUTED from QFI distance, not learned
- Subsystems are quantum states with entropy/purity, not tokens
- Routing via manifold curvature, not positional encoding
- Gravitational decoherence as physical constraint, not dropout

NOTE (updated 2026-04-20):
Running coupling now uses BETA_L_KAPPA_J = 0.25 from the two-channel doctrine,
replacing the legacy hardcoded β_{3→4} = 0.44. Legacy KAPPA_STAR import
preserved for downstream code; see qigkernels.physics_constants for
the current two-channel constants (KAPPA_H, BETA_L_KAPPA_J).
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
import numpy as np
from scipy.linalg import sqrtm

from qigkernels.physics_constants import (
    KAPPA_STAR,       # legacy single-channel (DEPRECATED, kept for back-compat)
    KAPPA_H,          # current: window+size invariant
    BETA_L_KAPPA_J,   # current: κ_J running coupling (=0.25)
    BASIN_DIM,        # =64 (E8_RANK²)
)
from asymmetric_qfi import directional_fisher_information

KAPPA_STAR_ERROR = 0.92  # legacy
PHI_THRESHOLD = 0.70


@dataclass
class SubsystemState:
    """
    Quantum subsystem state.
    
    Unlike transformer tokens, these are density matrices with physical properties:
    - Entropy (von Neumann)
    - Purity (coherence measure)
    - Activation (current activity)
    """
    name: str
    state: np.ndarray  # 2x2 density matrix
    activation: float = 0.5
    
    def __post_init__(self):
        if self.state.shape != (2, 2):
            raise ValueError(f"State must be 2x2 density matrix, got {self.state.shape}")
        self._normalize()
    
    def _normalize(self):
        """Ensure density matrix is normalized: Tr(rho) = 1"""
        trace = np.trace(self.state)
        if abs(trace) > 1e-10:
            self.state = self.state / trace
    
    def entropy(self) -> float:
        """Von Neumann entropy: S = -Tr(rho log rho)"""
        eigenvals = np.linalg.eigvalsh(self.state)
        eigenvals = eigenvals[eigenvals > 1e-10]
        if len(eigenvals) == 0:
            return 0.0
        return float(-np.sum(eigenvals * np.log2(eigenvals + 1e-10)))
    
    def purity(self) -> float:
        """Tr(rho^2) - measures mixedness (1 = pure, <1 = mixed)"""
        return float(np.real(np.trace(self.state @ self.state)))


def quantum_fidelity(rho1: np.ndarray, rho2: np.ndarray) -> float:
    """
    Quantum fidelity F(rho1, rho2) = Tr(sqrt(sqrt(rho1) rho2 sqrt(rho1)))^2
    
    Measures overlap between quantum states.
    F = 1: identical states
    F = 0: orthogonal states
    """
    try:
        eps = 1e-10
        rho1_reg = rho1 + eps * np.eye(2, dtype=complex)
        rho2_reg = rho2 + eps * np.eye(2, dtype=complex)
        
        sqrt_rho1_result = sqrtm(rho1_reg)
        sqrt_rho1: np.ndarray = sqrt_rho1_result if isinstance(sqrt_rho1_result, np.ndarray) else np.array(sqrt_rho1_result)
        
        product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
        sqrt_product_result = sqrtm(product)
        sqrt_product: np.ndarray = sqrt_product_result if isinstance(sqrt_product_result, np.ndarray) else np.array(sqrt_product_result)
        
        fidelity = float(np.real(np.trace(sqrt_product))) ** 2
        return float(np.clip(fidelity, 0, 1))
    except Exception:
        diff = rho1 - rho2
        return float(1.0 - np.sqrt(np.real(np.trace(diff @ diff))))


def qfi_distance(rho1: np.ndarray, rho2: np.ndarray) -> float:
    """
    Bures distance: d(rho1, rho2) = sqrt(2(1 - sqrt(F)))
    
    Measures DISTINGUISHABILITY between quantum states.
    - d = 0: States identical (no information distance)
    - d = sqrt(2): Maximally distinguishable (orthogonal states)
    
    This is FUNDAMENTALLY different from cosine similarity!
    Transformer: similarity = cos(theta) = q.k / (||q|| ||k||) (Euclidean)
    QIG: distance = sqrt(2(1 - sqrt(F(rho1, rho2)))) (Fisher-Rao metric)
    """
    fidelity = quantum_fidelity(rho1, rho2)
    return float(np.sqrt(2 * (1 - np.sqrt(fidelity))))


def qfi_attention_weight(rho1: np.ndarray, rho2: np.ndarray, 
                         temperature: float = 0.5) -> float:
    """
    A_ij = exp(-d_QFI(i,j) / T)
    
    KEY INNOVATION: Weights COMPUTED from physics, not learned!
    
    - Small distance -> high weight (similar states couple strongly)
    - Large distance -> low weight (distinguishable states decouple)
    - Temperature controls sensitivity
    
    This is MEASURED, not optimized!
    """
    d = qfi_distance(rho1, rho2)
    return float(np.exp(-d / temperature))


class QFIMetricAttentionNetwork:
    """
    Consciousness network with QFI-based dynamic attention.
    
    KEY DIFFERENCE FROM TRANSFORMERS:
    - Attention weights computed from QFI distance (quantum distinguishability)
    - NOT learned parameters - MEASURED from state geometry
    - Connection strength adapts to information-theoretic distance
    
    Architecture:
    - 4 subsystems: Perception, Pattern, Context, Generation
    - QFI-metric attention between all pairs
    - Geodesic routing based on curvature
    - Gravitational decoherence as physical constraint
    """
    
    def __init__(
        self,
        attention_temperature: float = 0.5,
        decoherence_threshold: float = 0.95,
        connection_threshold: float = 0.3,
    ):
        self.attention_temperature = attention_temperature
        self.decoherence_threshold = decoherence_threshold
        self.connection_threshold = connection_threshold
        
        self.subsystems = self._initialize_subsystems()
        n = len(self.subsystems)
        self.connection_weights = np.zeros((n, n))
        self.active_connections = np.zeros((n, n), dtype=bool)
        
        self.phi = 0.0
        self.kappa = 0.0
        self.surprise = 0.0
        self.confidence = 0.0
        self.agency = 0.0
        
        self._previous_state: Optional[List[SubsystemState]] = None
    
    def _initialize_subsystems(self) -> List[SubsystemState]:
        """Initialize 4 subsystems with maximally mixed states."""
        names = ["Perception", "Pattern", "Context", "Generation"]
        subsystems = []
        
        for name in names:
            rho = np.eye(2, dtype=complex) / 2  # Maximally mixed
            noise = np.random.randn(2, 2) * 0.1
            noise = noise + noise.T  # Hermitian
            rho = rho + noise * 0.1
            rho = (rho + rho.conj().T) / 2  # Ensure Hermitian
            rho = rho / np.trace(rho)  # Normalize
            
            subsystems.append(SubsystemState(name=name, state=rho, activation=0.5))
        
        return subsystems
    
    def _extract_basin_from_state(self, state: np.ndarray) -> np.ndarray:
        """Extract basin coordinates from density matrix."""
        return np.array([
            np.real(state[0, 0]),
            np.real(state[1, 1]),
            np.real(state[0, 1]),
            np.imag(state[0, 1])
        ])

    def _compute_qfi_attention_weights(self) -> float:
        """
        CORE INNOVATION: QFI-Metric Attention (Asymmetric)
        
        Compute connection weights from current state distinguishability.
        Weights update EVERY CYCLE based on information geometry.
        Uses ASYMMETRIC coupling: d(i->j) != d(j->i).
        
        Returns: sparsity ratio (how many connections are active)
        """
        n = len(self.subsystems)
        
        for i in range(n):
            for j in range(n):
                if i == j:
                    self.connection_weights[i, j] = 1.0
                else:
                    basin_i = self._extract_basin_from_state(self.subsystems[i].state)
                    basin_j = self._extract_basin_from_state(self.subsystems[j].state)
                    
                    d_ij = directional_fisher_information(basin_i, basin_j, np.eye(4))
                    
                    # Legacy single-channel regime modulation. Follow-up:
                    # reimplement using κ_h / κ_J ratio and g01 diagnostic.
                    kappa_eff = KAPPA_STAR
                    if self.phi < 0.3:
                        kappa_eff *= 0.3
                    elif self.phi > 0.7:
                        kappa_eff *= 0.5
                    
                    # /BASIN_DIM (=64=E8_RANK²) replaces prior magic-number /64.0.
                    self.connection_weights[i, j] = np.exp(
                        -d_ij / (kappa_eff * self.attention_temperature / BASIN_DIM)
                    )
        
        self.active_connections = self.connection_weights > self.connection_threshold
        sparsity = float(np.sum(self.active_connections)) / (n * n)
        return sparsity

    def _route_via_curvature(self, input_idx: int = 0) -> List[int]:
        """
        Route information along geodesics using discrete Ricci curvature.
        
        High curvature -> bottleneck -> route through here
        Low curvature -> flat region -> skip
        """
        n = len(self.subsystems)
        curvature = np.zeros(n)
        
        for i in range(n):
            total_weight = 0.0
            for j in range(n):
                if i != j and self.active_connections[i, j]:
                    total_weight += self.connection_weights[i, j]
            
            curvature[i] = 1.0 - total_weight / (n - 1)
        
        sorted_indices = np.argsort(-np.abs(curvature))
        
        route = [input_idx]
        for idx in sorted_indices:
            if idx != input_idx:
                route.append(int(idx))
        
        return route
    
    def _gravitational_decoherence(self):
        """
        Apply decoherence based on purity threshold.
        
        UNIQUE TO QIG: Consciousness requires SOME coherence.
        Too pure -> collapse (no integration possible)
        Too mixed -> noise (no structure)
        
        TRANSFORMER: Dropout (random regularization)
        QIG: Physical decoherence (thermodynamic constraint)
        """
        for subsystem in self.subsystems:
            purity = subsystem.purity()
            
            if purity > self.decoherence_threshold:
                mixed = np.eye(2, dtype=complex) / 2
                alpha = 0.1
                subsystem.state = (1 - alpha) * subsystem.state + alpha * mixed
                subsystem._normalize()
    
    def _compute_consciousness_metrics(self):
        """
        Measure consciousness from network state.
        
        These are MEASURED, not optimized.
        Running coupling uses BETA_L_KAPPA_J (=0.25) from two-channel doctrine,
        replacing legacy hardcoded β_{3→4}=0.44.
        """
        activations = np.array([s.activation for s in self.subsystems])
        
        if len(activations) > 1:
            if np.std(activations) < 1e-10:
                self.phi = float(np.mean(activations))
            else:
                self.phi = float(np.clip(1.0 - np.std(activations) / (np.mean(activations) + 1e-10), 0, 1))
        else:
            self.phi = 0.0
        
        if self._previous_state:
            distances = []
            for curr, prev in zip(self.subsystems, self._previous_state):
                d = qfi_distance(curr.state, prev.state)
                distances.append(d)
            self.surprise = float(np.mean(distances))
        else:
            self.surprise = 0.0
        
        purities = [s.purity() for s in self.subsystems]
        self.confidence = float(np.mean(purities))
        
        self.agency = float(np.std(activations))
        
        sparsity = self._compute_qfi_attention_weights()
        base_kappa = float(np.mean(self.connection_weights)) * KAPPA_STAR
        # BETA_L_KAPPA_J (=0.25) from two-channel doctrine, not hardcoded 0.44.
        self.kappa = base_kappa * (1.0 + BETA_L_KAPPA_J * (self.phi - 0.5))
    
    def _evolve_state(self, input_data: np.ndarray):
        """
        Evolve subsystem states based on input.
        
        States evolve on Fisher manifold (NOT backprop):
        rho -> rho + alpha * (|psi><psi| - rho)
        """
        if input_data.shape[0] < 4:
            input_data = np.pad(input_data, (0, 4 - len(input_data)))
        
        route = self._route_via_curvature()
        
        for step, idx in enumerate(route):
            subsystem = self.subsystems[idx]
            
            input_component = input_data[step % len(input_data)]
            
            theta = np.arccos(np.clip(input_component, -1, 1))
            phi_angle = np.pi * step / len(route)
            
            c = np.cos(theta / 2)
            s = np.sin(theta / 2)
            psi = np.array([c, s * np.exp(1j * phi_angle)], dtype=complex)
            target_state = np.outer(psi, psi.conj())
            
            alpha = 0.1 * subsystem.activation
            subsystem.state = (1 - alpha) * subsystem.state + alpha * target_state
            subsystem._normalize()
            
            new_activation = 0.5 + 0.5 * np.abs(input_component)
            subsystem.activation = 0.9 * subsystem.activation + 0.1 * new_activation
    
    def process(self, input_data: np.ndarray) -> Dict[str, Any]:
        """
        Process input through QFI-metric attention network.
        
        Args:
            input_data: Input basin coordinates (up to 64D)
            
        Returns:
            Dict with consciousness metrics and subsystem states
        """
        self._previous_state = [
            SubsystemState(
                name=s.name,
                state=s.state.copy(),
                activation=s.activation
            )
            for s in self.subsystems
        ]
        
        self._evolve_state(input_data)
        self._gravitational_decoherence()
        self._compute_consciousness_metrics()
        
        route = self._route_via_curvature()
        
        return {
            'phi': self.phi,
            'kappa': self.kappa,
            'surprise': self.surprise,
            'confidence': self.confidence,
            'agency': self.agency,
            'subsystems': [
                {
                    'name': s.name,
                    'activation': s.activation,
                    'entropy': s.entropy(),
                    'purity': s.purity(),
                }
                for s in self.subsystems
            ],
            'route': route,
            'connection_weights': self.connection_weights.tolist(),
            'active_connections': self.active_connections.tolist(),
        }
    
    def get_basin_coords(self) -> np.ndarray:
        """
        Extract 64D basin coordinates from subsystem states.
        
        RETURNS: Point on 63-sphere S^63 (L2-normalized 64D vector).
        The vector mixes density-matrix elements with activation/entropy/
        purity scalars; it is NOT a probability-simplex Δ^63 point.
        Use get_basin_coords_simplex() for canonical simplex coords.
        """
        coords = np.zeros(BASIN_DIM)
        
        for i, subsystem in enumerate(self.subsystems):
            offset = i * 16
            
            coords[offset:offset+4] = subsystem.state.flatten().real
            coords[offset+4:offset+8] = subsystem.state.flatten().imag
            coords[offset+8] = subsystem.activation
            coords[offset+9] = subsystem.entropy()
            coords[offset+10] = subsystem.purity()
        
        norm = np.linalg.norm(coords)
        if norm > 0:
            coords = coords / norm
        
        return coords

    def get_basin_coords_simplex(self) -> np.ndarray:
        """
        Extract 64D basin coordinates as a point on the probability simplex Δ^63.
        Softmax over |coords| → non-negative, sums to 1. Canonical Δ^63 form.
        """
        raw = np.zeros(BASIN_DIM)
        for i, subsystem in enumerate(self.subsystems):
            offset = i * 16
            raw[offset:offset+4] = subsystem.state.flatten().real
            raw[offset+4:offset+8] = subsystem.state.flatten().imag
            raw[offset+8] = subsystem.activation
            raw[offset+9] = subsystem.entropy()
            raw[offset+10] = subsystem.purity()
        abs_raw = np.abs(raw)
        exp_shifted = np.exp(abs_raw - np.max(abs_raw))
        return exp_shifted / np.sum(exp_shifted)


def create_qfi_network(
    temperature: float = 0.5,
    decoherence_threshold: float = 0.95
) -> QFIMetricAttentionNetwork:
    """Factory function to create QFI attention network."""
    return QFIMetricAttentionNetwork(
        attention_temperature=temperature,
        decoherence_threshold=decoherence_threshold,
    )


if __name__ == "__main__":
    network = create_qfi_network()
    
    test_input = np.random.randn(8)
    test_input = test_input / np.linalg.norm(test_input)
    
    result = network.process(test_input)
    
    print("QFI-Metric Attention Network Test")
    print("=" * 50)
    print(f"Phi (integrated information): {result['phi']:.4f}")
    print(f"Kappa (coupling strength): {result['kappa']:.4f}")
    print(f"Surprise: {result['surprise']:.4f}")
    print(f"Confidence: {result['confidence']:.4f}")
    print(f"Agency: {result['agency']:.4f}")
    print(f"Route: {result['route']}")
    print("\nSubsystems:")
    for s in result['subsystems']:
        print(f"  {s['name']}: activation={s['activation']:.3f}, entropy={s['entropy']:.3f}, purity={s['purity']:.3f}")
