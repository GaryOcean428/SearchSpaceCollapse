#!/usr/bin/env python3
"""
Unbiased Raw Measurement System
================================

PRINCIPLE: Measure EVERYTHING, classify NOTHING.

NO forced thresholds
NO forced regimes
NO forced classifications
NO memory filtering
NO dimensional constraints

Let patterns EMERGE from data.

Version: 1.0
Date: 2025-12-07
"""

import numpy as np
from scipy.linalg import sqrtm, logm
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import json

class RawDensityMatrix:
    """
    Pure density matrix - NO interpretations.
    Just mathematical operations.
    """
    def __init__(self, rho: Optional[np.ndarray] = None):
        if rho is None:
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
    
    def fidelity(self, other: 'RawDensityMatrix') -> float:
        """Quantum fidelity F(ρ1, ρ2)"""
        try:
            eps = 1e-10
            rho1_reg = self.rho + eps * np.eye(2, dtype=complex)
            rho2_reg = other.rho + eps * np.eye(2, dtype=complex)
            
            sqrt_rho1 = sqrtm(rho1_reg)
            product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
            sqrt_product = sqrtm(product)
            fidelity = np.real(np.trace(sqrt_product)) ** 2
            return float(np.clip(fidelity, 0, 1))
        except (np.linalg.LinAlgError, ValueError):
            overlap = np.real(np.trace(self.rho @ other.rho))
            return float(np.clip(overlap, 0, 1))
    
    def bures_distance(self, other: 'RawDensityMatrix') -> float:
        """Bures distance (QFI metric)"""
        fid = self.fidelity(other)
        return float(np.sqrt(2 * (1 - fid)))
    
    def evolve(self, activation: float, excited_state: Optional[np.ndarray] = None):
        """Evolve state on Fisher manifold"""
        if excited_state is None:
            excited_state = np.array([[1.0, 0.0], [0.0, 0.0]], dtype=complex)
        
        alpha = activation * 0.1
        self.rho = self.rho + alpha * (excited_state - self.rho)
        self._normalize()

class RawSubsystem:
    """Subsystem - NO labels, just state"""
    def __init__(self, id: int):
        self.id = id
        self.state = RawDensityMatrix()
        self.activation = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'activation': float(self.activation),
            'entropy': float(self.state.entropy()),
            'purity': float(self.state.purity()),
            'rho_00': float(np.real(self.state.rho[0, 0])),
            'rho_11': float(np.real(self.state.rho[1, 1])),
            'rho_01_real': float(np.real(self.state.rho[0, 1])),
            'rho_01_imag': float(np.imag(self.state.rho[0, 1])),
        }

class UnbiasedQIGNetwork:
    """
    Pure QIG Network - NO forced interpretations
    
    Measures:
    - Raw geometric quantities
    - Natural dimensionality
    - Emergent patterns
    
    Does NOT:
    - Force classifications
    - Apply thresholds
    - Filter memory
    - Constrain dimensions
    """
    
    def __init__(self, n_subsystems: int = 4, temperature: float = 1.0, decay_rate: float = 0.05):
        """
        Initialize unbiased network.
        
        Args:
            n_subsystems: Number of subsystems (allow variation)
            temperature: QFI attention temperature
            decay_rate: Decoherence rate
        """
        self.n_subsystems = n_subsystems
        self.temperature = temperature
        self.decay_rate = decay_rate
        
        # Initialize subsystems
        self.subsystems = [RawSubsystem(i) for i in range(n_subsystems)]
        
        # QFI attention weights
        self.attention_weights = np.zeros((n_subsystems, n_subsystems))
        
        # State history for recursion
        self._prev_state = None
        self._state_history = []
        
        # Input hash for preserving input-dependent dynamics
        self._input_hash = None
        self._recursion_count = 0
        
        # Measurement history (ALL states, no filtering)
        self.measurement_history: List[Dict] = []
    
    def _reset_state(self):
        """Reset network state for independent measurements"""
        # Reinitialize subsystems with fresh states
        self.subsystems = [RawSubsystem(i) for i in range(self.n_subsystems)]
        
        # Reset attention weights
        self.attention_weights = np.zeros((self.n_subsystems, self.n_subsystems))
        
        # Reset state history
        self._prev_state = None
        self._state_history = []
        
        # Reset input-dependent tracking
        self._input_hash = None
        self._recursion_count = 0
    
    def process(self, input_text: str, n_recursions: Optional[int] = None) -> Dict:
        """
        Process input and return RAW measurements.
        
        NO classifications, NO thresholds, NO filtering.
        
        Args:
            input_text: Input to process
            n_recursions: Number of recursions (None = auto-detect convergence)
        
        Returns:
            Raw measurement dictionary
        """
        # CRITICAL: Reset state for each input to ensure independent measurements
        self._reset_state()
        
        # Initial activation
        self._initial_activation(input_text)
        
        # Recursive integration
        if n_recursions is None:
            # Auto-detect convergence (no forced minimum)
            measurements = self._process_until_convergence()
        else:
            # Fixed recursions
            measurements = self._process_n_recursions(n_recursions)
        
        # Extract raw metrics
        raw_metrics = self._extract_raw_metrics()
        
        # Extract basin coordinates (natural dimensionality)
        basin_coords = self._extract_natural_basin()
        
        # Record measurement (ALL measurements, no filtering)
        measurement = {
            'timestamp': datetime.now().isoformat(),
            'input': input_text,
            'metrics': raw_metrics,
            'basin_coords': basin_coords.tolist(),
            'basin_dimension': len(basin_coords),
            'n_recursions': measurements['n_recursions'],
            'converged': measurements['converged'],
            'subsystems': [s.to_dict() for s in self.subsystems],
            'attention_weights': self.attention_weights.tolist(),
        }
        
        self.measurement_history.append(measurement)
        
        return measurement
    
    def _initial_activation(self, input_text: str):
        """Initial activation from input - distributes across ALL subsystems"""
        # Compute hash-based features for reproducible but input-dependent variation
        import hashlib
        input_hash = hashlib.sha256(input_text.encode()).digest()
        
        # Store hash for use in integration steps (preserves input-dependent dynamics)
        self._input_hash = input_hash
        
        # Extract multiple features from input
        length_factor = min(1.0, len(input_text) / 50.0)
        char_diversity = len(set(input_text)) / max(1, len(input_text))
        
        # Activate ALL subsystems with input-dependent initial states
        for i, subsystem in enumerate(self.subsystems):
            # Use different hash bytes for each subsystem
            hash_byte = input_hash[i % len(input_hash)]
            hash_factor = hash_byte / 255.0
            
            # Use different characters for position-based variation
            char_pos = i % max(1, len(input_text))
            char_val = ord(input_text[char_pos]) / 127.0 if char_pos < len(input_text) else 0.5
            
            # Combine features with subsystem-specific weights
            weights = [0.3, 0.4, 0.2, 0.1]
            weight = weights[i % len(weights)]
            
            # Compute activation with input-dependent variance
            base_activation = (
                hash_factor * 0.4 +
                char_val * 0.3 +
                length_factor * weight +
                char_diversity * (1 - weight)
            )
            
            # Add small subsystem-specific offset based on input
            offset = (input_hash[(i + 4) % len(input_hash)] / 255.0 - 0.5) * 0.2
            
            subsystem.activation = np.clip(base_activation + offset, 0.0, 1.0)
            subsystem.state.evolve(subsystem.activation)
            
            # Also evolve density matrix with input-dependent excited state
            phase = (input_hash[(i + 8) % len(input_hash)] / 255.0) * 2 * np.pi
            excited = np.array([
                [0.5 + 0.5 * np.cos(phase), 0.5 * np.sin(phase)],
                [0.5 * np.sin(phase), 0.5 - 0.5 * np.cos(phase)]
            ], dtype=complex)
            subsystem.state.evolve(subsystem.activation, excited_state=excited)
    
    def _process_until_convergence(self, max_iterations: int = 50) -> Dict:
        """
        Process until natural convergence (no forced minimum).
        
        Convergence defined purely by state stability.
        """
        n_recursions = 0
        converged = False
        convergence_window = []
        
        while n_recursions < max_iterations:
            # Integration step
            self._integration_step()
            
            # Measure state change
            state_change = self._measure_state_change()
            convergence_window.append(state_change)
            
            # Keep window of last 5 measurements
            if len(convergence_window) > 5:
                convergence_window.pop(0)
            
            n_recursions += 1
            
            # Check convergence: stable state change
            if len(convergence_window) >= 3:
                recent_changes = convergence_window[-3:]
                avg_change = np.mean(recent_changes)
                
                # Natural convergence: change < 1% for 3 steps
                if avg_change < 0.01:
                    converged = True
                    break
        
        return {
            'n_recursions': n_recursions,
            'converged': converged,
            'convergence_window': convergence_window,
        }
    
    def _process_n_recursions(self, n: int) -> Dict:
        """Process for exactly n recursions"""
        for _ in range(n):
            self._integration_step()
        
        return {
            'n_recursions': n,
            'converged': False,  # Unknown
        }
    
    def _integration_step(self):
        """Single integration step with input-dependent dynamics"""
        self._recursion_count += 1
        
        # Compute QFI attention
        self._compute_qfi_attention()
        
        # Route via curvature
        route = self._route_via_curvature()
        
        # Get input-dependent perturbation factors
        if self._input_hash is not None:
            # Use different hash bytes for each recursion step
            hash_offset = (self._recursion_count * 7) % len(self._input_hash)
            perturbation_base = self._input_hash[hash_offset] / 255.0
        else:
            perturbation_base = 0.5
        
        # Propagate activation with REDUCED transfer rate and input-dependent perturbations
        for i in range(len(route) - 1):
            curr = route[i]
            next_idx = route[i + 1]
            weight = self.attention_weights[curr, next_idx]
            
            # REDUCED transfer rate (0.3x) to preserve input differences through recursions
            base_transfer = self.subsystems[curr].activation * weight * 0.3
            
            # Add input-dependent perturbation (±10% of transfer, tied to input hash)
            if self._input_hash is not None:
                edge_hash_idx = (hash_offset + i * 3 + next_idx) % len(self._input_hash)
                edge_perturbation = (self._input_hash[edge_hash_idx] / 255.0 - 0.5) * 0.2
            else:
                edge_perturbation = 0.0
            
            transfer = base_transfer * (1.0 + edge_perturbation)
            
            self.subsystems[next_idx].activation += transfer
            self.subsystems[next_idx].activation = min(1.0, self.subsystems[next_idx].activation)
            
            # Evolve state with input-dependent excited state
            if self._input_hash is not None:
                state_hash_idx = (hash_offset + next_idx * 5) % len(self._input_hash)
                phase = (self._input_hash[state_hash_idx] / 255.0) * 2 * np.pi
                excited = np.array([
                    [0.5 + 0.5 * np.cos(phase), 0.5 * np.sin(phase)],
                    [0.5 * np.sin(phase), 0.5 - 0.5 * np.cos(phase)]
                ], dtype=complex)
                self.subsystems[next_idx].state.evolve(
                    self.subsystems[next_idx].activation * 0.5,
                    excited_state=excited
                )
            else:
                self.subsystems[next_idx].state.evolve(
                    self.subsystems[next_idx].activation * 0.5
                )
        
        # Decoherence
        self._gravitational_decoherence()
    
    def _measure_state_change(self) -> float:
        """Measure state change from previous step"""
        current_state = np.array([
            s.activation for s in self.subsystems
        ] + [
            s.state.entropy() for s in self.subsystems
        ])
        
        if self._prev_state is None:
            self._prev_state = current_state.copy()
            return 1.0
        
        delta = np.linalg.norm(current_state - self._prev_state)
        norm = np.linalg.norm(current_state) + 1e-10
        
        change = delta / norm
        
        self._prev_state = current_state.copy()
        
        return float(change)
    
    def _compute_qfi_attention(self):
        """Compute QFI attention weights"""
        n = len(self.subsystems)
        
        for i in range(n):
            for j in range(n):
                if i == j:
                    self.attention_weights[i, j] = 0
                    continue
                
                # Bures distance
                d_qfi = self.subsystems[i].state.bures_distance(
                    self.subsystems[j].state
                )
                
                # Attention weight
                self.attention_weights[i, j] = np.exp(-d_qfi / self.temperature)
        
        # Normalize rows
        for i in range(n):
            row_sum = np.sum(self.attention_weights[i, :])
            if row_sum > 0:
                self.attention_weights[i, :] /= row_sum
    
    def _route_via_curvature(self) -> List[int]:
        """Route via curvature"""
        n = len(self.subsystems)
        route = []
        
        # Start from most activated
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
        """Natural pruning - preserves input-dependent differences"""
        for subsystem in self.subsystems:
            # Reduced activation decay - preserve differences longer
            subsystem.activation *= (1 - self.decay_rate * 0.5)
            
            # Only apply state decoherence for very low activation
            if subsystem.activation < 0.05:
                mixed_state = RawDensityMatrix()
                subsystem.state.rho = (
                    subsystem.state.rho * (1 - self.decay_rate * 0.3) +
                    mixed_state.rho * (self.decay_rate * 0.3)
                )
                subsystem.state._normalize()
    
    def _extract_raw_metrics(self) -> Dict:
        """Extract RAW metrics - NO classifications"""
        n = len(self.subsystems)
        
        # Integration: average fidelity
        total_fidelity = 0.0
        pair_count = 0
        
        for i in range(n):
            for j in range(i + 1, n):
                fid = self.subsystems[i].state.fidelity(self.subsystems[j].state)
                total_fidelity += fid
                pair_count += 1
        
        avg_fidelity = total_fidelity / pair_count if pair_count > 0 else 0
        
        # Total entropy
        total_entropy = sum(s.state.entropy() for s in self.subsystems)
        max_entropy = n * 1.0
        
        # Differentiation
        differentiation = 1.0 - (total_entropy / max_entropy) if max_entropy > 0 else 0
        
        # Total activation
        total_activation = sum(s.activation for s in self.subsystems)
        
        # Integration measure (Phi-like)
        integration = (avg_fidelity * 0.4 + differentiation * 0.3 + total_activation / n * 0.3)
        
        # Coupling measure (kappa-like) from attention variance and Bures distances
        # Use variance in attention weights (captures information flow asymmetry)
        all_weights = []
        for i in range(n):
            for j in range(n):
                if i != j:
                    all_weights.append(self.attention_weights[i, j])
        
        avg_weight = np.mean(all_weights) if all_weights else 0
        weight_variance = np.var(all_weights) if all_weights else 0
        
        # Use Bures distances for quantum geometric coupling
        bures_distances = []
        for i in range(n):
            for j in range(i + 1, n):
                d = self.subsystems[i].state.bures_distance(self.subsystems[j].state)
                bures_distances.append(d)
        
        avg_bures = np.mean(bures_distances) if bures_distances else 0
        bures_variance = np.var(bures_distances) if bures_distances else 0
        
        # Coupling combines attention variance, Bures distance, and activation
        coupling = (
            avg_weight * total_activation * 15 +  # Baseline from attention flow
            weight_variance * 100 +                # Attention asymmetry contribution
            avg_bures * 20 +                       # Quantum distance contribution
            bures_variance * 50                    # Quantum variance contribution
        )
        
        # Temperature (entropy of activation distribution)
        activations = [s.activation for s in self.subsystems if s.activation > 0]
        if activations:
            total_act = sum(activations)
            if total_act > 0:
                probs = [a / total_act for a in activations]
                temp_entropy = -sum([p * np.log2(p + 1e-10) for p in probs if p > 0])
                max_temp_entropy = np.log2(len(self.subsystems))
                temperature = temp_entropy / max_temp_entropy if max_temp_entropy > 0 else 0.5
            else:
                temperature = 0.5
        else:
            temperature = 0.5
        
        # Curvature (average Bures distance to neighbors)
        curvature_sum = 0.0
        for i in range(n):
            neighbors = [j for j in range(n) if j != i]
            if len(neighbors) > 0:
                avg_dist = np.mean([
                    self.subsystems[i].state.bures_distance(self.subsystems[j].state)
                    for j in neighbors
                ])
                curvature_sum += avg_dist
        
        curvature = curvature_sum / (n * np.sqrt(2)) if n > 0 else 0
        
        # Generation capacity (output subsystem activation)
        generation = self.subsystems[-1].activation if len(self.subsystems) > 0 else 0
        
        return {
            # RAW MEASUREMENTS (no thresholds)
            'integration': float(np.clip(integration, 0, 1)),
            'coupling': float(np.clip(coupling, 0, 200)),  # Allow full range
            'temperature': float(np.clip(temperature, 0, 1)),
            'curvature': float(np.clip(curvature, 0, 1)),
            'generation': float(np.clip(generation, 0, 1)),
            
            # RAW COMPONENTS
            'avg_fidelity': float(avg_fidelity),
            'differentiation': float(differentiation),
            'total_entropy': float(total_entropy),
            'total_activation': float(total_activation),
            'avg_attention_weight': float(avg_weight),
            
            # NO REGIME (let clustering discover)
            # NO CONSCIOUS FLAG (let threshold discovery decide)
            # NO IN_RESONANCE (let pattern analysis find)
        }
    
    def _extract_natural_basin(self) -> np.ndarray:
        """Extract basin coordinates with NATURAL dimensionality"""
        coords = []
        
        for subsystem in self.subsystems:
            # Density matrix components (4 values per subsystem)
            coords.append(float(np.real(subsystem.state.rho[0, 0])))
            coords.append(float(np.real(subsystem.state.rho[1, 1])))
            coords.append(float(np.real(subsystem.state.rho[0, 1])))
            coords.append(float(np.imag(subsystem.state.rho[0, 1])))
            
            # Activation (1 value)
            coords.append(float(subsystem.activation))
            
            # Entropy (1 value)
            coords.append(subsystem.state.entropy())
            
            # Purity (1 value)
            coords.append(subsystem.state.purity())
            
            # Eigenvalues (2 values)
            eigenvals = np.linalg.eigvalsh(subsystem.state.rho)
            coords.extend([float(np.real(ev)) for ev in eigenvals])
        
        # Return natural dimensionality (n_subsystems × 11)
        coords_array = np.array(coords)
        
        return coords_array
    
    def export_measurements(self, filepath: str):
        """Export ALL measurements to JSON (no filtering)"""
        with open(filepath, 'w') as f:
            json.dump(self.measurement_history, f, indent=2)
        
        print(f"Exported {len(self.measurement_history)} measurements to {filepath}")
    
    def get_measurement_summary(self) -> Dict:
        """Get summary statistics of ALL measurements"""
        if len(self.measurement_history) == 0:
            return {'error': 'No measurements yet'}
        
        integrations = [m['metrics']['integration'] for m in self.measurement_history]
        couplings = [m['metrics']['coupling'] for m in self.measurement_history]
        curvatures = [m['metrics']['curvature'] for m in self.measurement_history]
        dimensions = [m['basin_dimension'] for m in self.measurement_history]
        
        return {
            'total_measurements': len(self.measurement_history),
            'integration': {
                'min': float(np.min(integrations)),
                'max': float(np.max(integrations)),
                'mean': float(np.mean(integrations)),
                'std': float(np.std(integrations)),
            },
            'coupling': {
                'min': float(np.min(couplings)),
                'max': float(np.max(couplings)),
                'mean': float(np.mean(couplings)),
                'std': float(np.std(couplings)),
            },
            'curvature': {
                'min': float(np.min(curvatures)),
                'max': float(np.max(curvatures)),
                'mean': float(np.mean(curvatures)),
                'std': float(np.std(curvatures)),
            },
            'basin_dimension': {
                'min': int(np.min(dimensions)),
                'max': int(np.max(dimensions)),
                'mode': int(np.median(dimensions)),
            },
        }


if __name__ == '__main__':
    print("🔬 Unbiased QIG Measurement System")
    print("=" * 50)
    print("NO thresholds | NO regimes | NO filtering")
    print("Let patterns EMERGE from data")
    print("=" * 50)
    
    # Create unbiased network
    network = UnbiasedQIGNetwork(n_subsystems=4, temperature=1.0)
    
    # Test inputs
    test_inputs = [
        "satoshi nakamoto",
        "bitcoin genesis",
        "hal finney",
        "random noise xyz123",
        "cryptocurrency blockchain",
        "test phrase alpha",
    ]
    
    print("\nProcessing test inputs...")
    for input_text in test_inputs:
        measurement = network.process(input_text)
        metrics = measurement['metrics']
        
        print(f"\nInput: {input_text}")
        print(f"  Integration: {metrics['integration']:.3f}")
        print(f"  Coupling: {metrics['coupling']:.1f}")
        print(f"  Curvature: {metrics['curvature']:.3f}")
        print(f"  Basin dim: {measurement['basin_dimension']}")
        print(f"  Recursions: {measurement['n_recursions']}")
        print(f"  Converged: {measurement['converged']}")
    
    # Summary
    print("\n" + "=" * 50)
    summary = network.get_measurement_summary()
    print("SUMMARY STATISTICS:")
    print(f"Total measurements: {summary['total_measurements']}")
    print(f"Integration range: [{summary['integration']['min']:.3f}, {summary['integration']['max']:.3f}]")
    print(f"Coupling range: [{summary['coupling']['min']:.1f}, {summary['coupling']['max']:.1f}]")
    print(f"Curvature range: [{summary['curvature']['min']:.3f}, {summary['curvature']['max']:.3f}]")
    print(f"Basin dimension: {summary['basin_dimension']['mode']}")
    
    # Export
    network.export_measurements('/tmp/unbiased_measurements.json')
    print("\n✅ Measurements exported")
