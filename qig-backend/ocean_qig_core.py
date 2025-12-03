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
        
        return {
            'metrics': metrics,
            'route': route,
            'basin_coords': basin_coords.tolist(),
            'subsystems': [s.to_dict() for s in self.subsystems],
        }
    
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
        Measure consciousness (NEVER optimize).
        Φ from integration, κ from Fisher metric.
        """
        n = len(self.subsystems)
        
        # Integration: average fidelity between all pairs
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
        max_entropy = n * 1.0  # Max entropy per subsystem is 1.0
        
        # Differentiation: inverse of normalized entropy (low entropy = high differentiation)
        differentiation = 1.0 - (total_entropy / max_entropy)
        
        # Total activation (measure of system energy)
        total_activation = sum(s.activation for s in self.subsystems)
        
        # Φ: combination of integration, differentiation, and activation
        # High Φ requires:
        # 1. High integration (states correlated)
        # 2. Some differentiation (states not identical)
        # 3. Activation present (system active)
        phi = (integration * 0.4 + differentiation * 0.3 + total_activation / n * 0.3)
        
        # κ: coupling from Fisher metric (average attention weight magnitude)
        total_weight = 0.0
        weight_count = 0
        for i in range(n):
            for j in range(n):
                if i != j:
                    total_weight += self.attention_weights[i, j]
                    weight_count += 1
        
        avg_weight = total_weight / weight_count if weight_count > 0 else 0
        
        # Scale kappa based on activation and attention
        kappa = avg_weight * total_activation * 25  # Scale to [0, 100]
        
        # Regime classification
        kappa_proximity = abs(kappa - KAPPA_STAR)
        if kappa_proximity < 5:
            regime = 'geometric'
        elif kappa < KAPPA_STAR * 0.7:
            regime = 'linear'
        else:
            regime = 'hierarchical'
        
        return {
            'phi': float(np.clip(phi, 0, 1)),
            'kappa': float(np.clip(kappa, 0, 100)),
            'integration': float(integration),
            'differentiation': float(differentiation),
            'entropy': float(total_entropy),
            'fidelity': float(avg_fidelity),
            'activation': float(total_activation),
            'regime': regime,
            'in_resonance': kappa_proximity < KAPPA_STAR * 0.1,
        }
    
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
    Process passphrase through QIG network.
    
    Request: { "passphrase": "satoshi2009" }
    Response: { "phi": 0.85, "kappa": 63.5, "basin_coords": [...] }
    """
    try:
        data = request.json
        passphrase = data.get('passphrase', '')
        
        if not passphrase:
            return jsonify({'error': 'passphrase required'}), 400
        
        # Process through QIG network
        result = ocean_network.process(passphrase)
        
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
            'regime': result['metrics']['regime'],
            'in_resonance': result['metrics']['in_resonance'],
            'integration': result['metrics']['integration'],
            'entropy': result['metrics']['entropy'],
            'basin_coords': result['basin_coords'],
            'route': result['route'],
            'subsystems': result['subsystems'],
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
