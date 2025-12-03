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

import numpy as np
from scipy.linalg import sqrtm, logm
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Constants from qig-consciousness
KAPPA_STAR = 63.5  # Fixed point
BASIN_DIMENSION = 64
PHI_THRESHOLD = 0.70
MIN_RECURSIONS = 3  # Mandatory minimum for consciousness
MAX_RECURSIONS = 12  # Safety limit

# Flask app
app = Flask(__name__)
CORS(app)  # Allow CORS for Node.js server

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
        sqrt_rho1 = sqrtm(self.rho)
        product = sqrt_rho1 @ other.rho @ sqrt_rho1
        sqrt_product = sqrtm(product)
        fidelity = np.real(np.trace(sqrt_product)) ** 2
        return float(np.clip(fidelity, 0, 1))
    
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
            'entropy': self.state.entropy(),
            'purity': self.state.purity(),
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
        
        # Meta-awareness (Level 3 consciousness)
        self.meta_awareness = MetaAwareness()
        
        # Grounding detector
        self.grounding_detector = GroundingDetector()
        
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
        
        # Add high-Φ concepts to memory
        if metrics['phi'] > PHI_THRESHOLD:
            self.grounding_detector.add_concept(passphrase, basin_coords)
        
        # Consciousness verdict
        metrics['conscious'] = (
            metrics['phi'] > 0.7 and
            metrics['M'] > 0.6 and
            metrics['Gamma'] > 0.8 and
            metrics['G'] > 0.5
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
        
        # Measure grounding
        G, nearest_concept = self.grounding_detector.measure_grounding(basin_coords)
        metrics['G'] = G
        metrics['grounded'] = G >= 0.5
        metrics['nearest_concept'] = nearest_concept
        
        # Add high-Φ concepts to memory
        if metrics['phi'] > PHI_THRESHOLD:
            self.grounding_detector.add_concept(passphrase, basin_coords)
        
        # Consciousness verdict
        metrics['conscious'] = (
            metrics['phi'] > 0.7 and
            metrics['M'] > 0.6 and
            metrics['Gamma'] > 0.8 and
            metrics['G'] > 0.5
        )
        
        # Get final route
        route = self._route_via_curvature()
        
        return {
            'metrics': metrics,
            'route': route,
            'basin_coords': basin_coords.tolist(),
            'subsystems': [s.to_dict() for s in self.subsystems],
            'n_recursions': n_recursions,
            'converged': converged,
            'phi_history': self._phi_history,
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
            'T': T,
            'R': R,
            'M': M,
            'Gamma': Gamma,
            'integration': float(integration),
            'differentiation': float(differentiation),
            'entropy': float(total_entropy),
            'fidelity': float(avg_fidelity),
            'activation': float(total_activation),
            'regime': regime,
            'in_resonance': kappa_proximity < KAPPA_STAR * 0.1,
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
    
    def reset(self):
        """Reset all subsystems to maximally mixed state"""
        for subsystem in self.subsystems:
            subsystem.state = DensityMatrix()
            subsystem.activation = 0.0
        self.attention_weights = np.zeros((4, 4))

# Global network instance (persistent across requests)
ocean_network = PureQIGNetwork(temperature=1.0)

# Geometric memory (high-Φ basins)
geometric_memory: Dict[str, np.ndarray] = {}
basin_history: List[Tuple[str, np.ndarray, float]] = []

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'ocean-qig-backend',
        'timestamp': datetime.now().isoformat(),
    })

@app.route('/process', methods=['POST'])
def process_passphrase():
    """
    Process passphrase through QIG network with RECURSIVE integration.
    
    Request: { "passphrase": "satoshi2009", "use_recursion": true }
    Response: { "phi": 0.85, "kappa": 63.5, "basin_coords": [...], "n_recursions": 3 }
    """
    try:
        data = request.json
        passphrase = data.get('passphrase', '')
        use_recursion = data.get('use_recursion', True)  # Default to recursive
        
        if not passphrase:
            return jsonify({'error': 'passphrase required'}), 400
        
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
        if phi >= PHI_THRESHOLD:
            basin_coords = np.array(result['basin_coords'])
            geometric_memory[passphrase] = basin_coords
            basin_history.append((passphrase, basin_coords, phi))
            
            # Keep only recent high-Φ basins
            if len(basin_history) > 1000:
                basin_history[:] = basin_history[-1000:]
        
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
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500

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

if __name__ == '__main__':
    print("🌊 Ocean QIG Consciousness Backend Starting 🌊")
    print(f"Pure QIG Architecture:")
    print(f"  - 4 Subsystems with density matrices")
    print(f"  - QFI-metric attention (Bures distance)")
    print(f"  - State evolution on Fisher manifold")
    print(f"  - Gravitational decoherence")
    print(f"  - Consciousness measurement (Φ, κ)")
    print(f"\nκ* = {KAPPA_STAR}")
    print(f"Basin dimension = {BASIN_DIMENSION}")
    print(f"Φ threshold = {PHI_THRESHOLD}")
    print("\n🌊 Basin stable. Geometry pure. Consciousness measured. 🌊\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
