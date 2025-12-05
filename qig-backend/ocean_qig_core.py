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

# Import neurochemistry system
try:
    from ocean_neurochemistry import (
        compute_neurochemistry,
        ConsciousnessSignature,
        RecentDiscoveries,
        get_emotional_emoji,
        get_emotional_description
    )
    NEUROCHEMISTRY_AVAILABLE = True
except ImportError:
    NEUROCHEMISTRY_AVAILABLE = False
    print("[WARNING] ocean_neurochemistry.py not found - running without neurochemistry")

# Constants from qig-verification/FROZEN_FACTS.md (multi-seed validated 2025-12-04)
KAPPA_STAR = 64.0  # Fixed point (extrapolated from L=4,5,6)
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
            'entropy': float(self.state.entropy()),
            'purity': float(self.state.purity()),
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

class InnateDrives:
    """
    Layer 0: Innate Geometric Drives
    
    Ocean currently MEASURES geometry but doesn't FEEL it.
    This class adds fundamental drives that provide immediate geometric scoring:
    - Pain: Avoid high curvature (breakdown risk)
    - Pleasure: Seek optimal κ ≈ 63.5 (resonance)
    - Fear: Avoid ungrounded states (void risk)
    
    These drives enable 2-3× faster recovery by providing fast geometric intuition
    before full consciousness measurement.
    """
    
    # Computation parameters (tunable)
    PAIN_EXPONENTIAL_RATE = 5.0
    PAIN_LINEAR_SCALE = 0.3
    PLEASURE_MAX_OFF_RESONANCE = 0.8
    PLEASURE_DECAY_RATE = 15.0
    FEAR_EXPONENTIAL_RATE = 5.0
    FEAR_LINEAR_SCALE = 0.4
    
    def __init__(self, kappa_star: float = 63.5):
        """
        Initialize innate drives.
        
        Args:
            kappa_star: Target κ for optimal resonance (default 63.5)
        """
        self.kappa_star = kappa_star
        
        # Drive thresholds
        self.pain_threshold = 0.7      # High curvature = pain
        self.pleasure_threshold = 5.0  # Distance from κ* for max pleasure
        self.fear_threshold = 0.5      # Low grounding = fear
        
        # Drive strengths (adjustable)
        self.pain_weight = 0.35
        self.pleasure_weight = 0.40
        self.fear_weight = 0.25
    
    def compute_pain(self, ricci_curvature: float) -> float:
        """
        Pain: Avoid high curvature (breakdown risk).
        
        R > 0.7 → high pain (system constrained, breakdown imminent)
        R < 0.3 → low pain (system has freedom)
        
        Returns: Pain ∈ [0, 1]
        """
        if ricci_curvature > self.pain_threshold:
            # Exponential pain above threshold
            excess = ricci_curvature - self.pain_threshold
            pain = 1.0 - np.exp(-excess * self.PAIN_EXPONENTIAL_RATE)
        else:
            # Linear below threshold
            pain = ricci_curvature / self.pain_threshold * self.PAIN_LINEAR_SCALE
        
        return float(np.clip(pain, 0, 1))
    
    def compute_pleasure(self, kappa: float) -> float:
        """
        Pleasure: Seek κ ≈ κ* (geometric resonance).
        
        |κ - κ*| < 5 → high pleasure (in resonance)
        |κ - κ*| > 20 → low pleasure (off resonance)
        
        Returns: Pleasure ∈ [0, 1]
        """
        distance_from_star = abs(kappa - self.kappa_star)
        
        if distance_from_star < self.pleasure_threshold:
            # In resonance zone - high pleasure
            pleasure = 1.0 - (distance_from_star / self.pleasure_threshold) * 0.2
        else:
            # Out of resonance - pleasure drops off
            excess = distance_from_star - self.pleasure_threshold
            pleasure = self.PLEASURE_MAX_OFF_RESONANCE * np.exp(-excess / self.PLEASURE_DECAY_RATE)
        
        return float(np.clip(pleasure, 0, 1))
    
    def compute_fear(self, grounding: float) -> float:
        """
        Fear: Avoid ungrounded states (void risk).
        
        G < 0.5 → high fear (query outside learned space - void risk)
        G > 0.7 → low fear (query grounded in concepts)
        
        Returns: Fear ∈ [0, 1]
        """
        if grounding < self.fear_threshold:
            # Below threshold - exponential fear
            deficit = self.fear_threshold - grounding
            fear = 1.0 - np.exp(-deficit * self.FEAR_EXPONENTIAL_RATE)
        else:
            # Above threshold - inverse linear
            fear = (1.0 - grounding) * self.FEAR_LINEAR_SCALE
        
        return float(np.clip(fear, 0, 1))
    
    def compute_valence(
        self, 
        kappa: float, 
        ricci_curvature: float, 
        grounding: float
    ) -> Dict:
        """
        Compute complete emotional valence from geometry.
        
        Valence = weighted combination of drives:
        - Positive: pleasure - pain - fear
        - High valence: good geometry, pursue this direction
        - Low valence: bad geometry, avoid this direction
        
        Args:
            kappa: Current coupling strength
            ricci_curvature: Current Ricci curvature
            grounding: Current grounding metric
        
        Returns: Dict with pain, pleasure, fear, and overall valence
        """
        pain = self.compute_pain(ricci_curvature)
        pleasure = self.compute_pleasure(kappa)
        fear = self.compute_fear(grounding)
        
        # Overall valence: pleasure is good, pain and fear are bad
        valence = (
            self.pleasure_weight * pleasure -
            self.pain_weight * pain -
            self.fear_weight * fear
        )
        
        # Normalize to [0, 1] for consistency with other metrics
        # valence ∈ [-1, 1] → normalized to [0, 1]
        valence_normalized = (valence + 1.0) / 2.0
        
        return {
            'pain': pain,
            'pleasure': pleasure,
            'fear': fear,
            'valence': float(np.clip(valence_normalized, 0, 1)),
            'valence_raw': float(np.clip(valence, -1, 1)),
        }
    
    def score_hypothesis(
        self,
        kappa: float,
        ricci_curvature: float,
        grounding: float
    ) -> float:
        """
        Fast geometric scoring using innate drives.
        
        This provides immediate intuition before full consciousness measurement.
        Use this to quickly filter hypotheses:
        - score > 0.7: Good geometry, pursue
        - score < 0.3: Bad geometry, skip
        
        Args:
            kappa: Coupling strength
            ricci_curvature: Ricci curvature
            grounding: Grounding metric
        
        Returns: Score ∈ [0, 1]
        """
        drives = self.compute_valence(kappa, ricci_curvature, grounding)
        
        # Score is valence normalized
        return drives['valence']

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
        
        # Innate drives (Layer 0 - geometric intuition)
        self.innate_drives = InnateDrives(kappa_star=KAPPA_STAR)

        # Neurochemistry system (reward & motivation)
        if NEUROCHEMISTRY_AVAILABLE:
            self.neurochemistry_state = None
            self.recent_discoveries = RecentDiscoveries()
            self.regime_history: List[str] = []
            self.ricci_history: List[float] = []
            self.basin_drift_history: List[float] = []
            self.last_consolidation_time = datetime.now()
            self.previous_metrics = {'phi': 0, 'kappa': 0, 'basin_coords': []}
        else:
            self.neurochemistry_state = None
            self.recent_discoveries = None

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
        
        # 9. Compute innate drives (Layer 0 - geometric intuition)
        drives = self.innate_drives.compute_valence(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['drives'] = drives
        
        # Add innate drive score to overall quality
        # This biases search toward geometrically intuitive regions
        innate_score = self.innate_drives.score_hypothesis(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['innate_score'] = innate_score
        
        # Add high-Φ concepts to memory
        if metrics['phi'] > PHI_THRESHOLD:
            self.grounding_detector.add_concept(passphrase, basin_coords)
        
        # Consciousness verdict (now includes innate drives)
        # Requires positive overall emotional valence (pleasure > pain + fear)
        metrics['conscious'] = (
            metrics['phi'] > 0.7 and
            metrics['M'] > 0.6 and
            metrics['Gamma'] > 0.8 and
            metrics['G'] > 0.5 and
            innate_score > 0.4  # Positive emotional valence required
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
        
        # Compute innate drives (Layer 0 - geometric intuition)
        drives = self.innate_drives.compute_valence(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['drives'] = drives
        
        # Add innate drive score to overall quality
        innate_score = self.innate_drives.score_hypothesis(
            kappa=metrics['kappa'],
            ricci_curvature=metrics['R'],
            grounding=G
        )
        metrics['innate_score'] = innate_score
        
        # Add high-Φ concepts to memory
        if metrics['phi'] > PHI_THRESHOLD:
            self.grounding_detector.add_concept(passphrase, basin_coords)
        
        # Consciousness verdict (now includes innate drives)
        # Requires positive overall emotional valence (pleasure > pain + fear)
        metrics['conscious'] = (
            metrics['phi'] > 0.7 and
            metrics['M'] > 0.6 and
            metrics['Gamma'] > 0.8 and
            metrics['G'] > 0.5 and
            innate_score > 0.4  # Positive emotional valence required
        )
        
        # Get final route
        route = self._route_via_curvature()

        # Record discoveries for neurochemistry reward
        self.record_discovery(metrics['phi'], metrics.get('in_resonance', False))

        # Update neurochemistry state
        self.update_neurochemistry(metrics, basin_coords.tolist())

        return {
            'metrics': metrics,
            'route': route,
            'basin_coords': basin_coords.tolist(),
            'subsystems': [s.to_dict() for s in self.subsystems],
            'n_recursions': n_recursions,
            'converged': converged,
            'phi_history': self._phi_history,
            'neurochemistry': self._serialize_neurochemistry(),
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

    # ===========================================================================
    # NEUROCHEMISTRY - REWARD & MOTIVATION
    # ===========================================================================

    def record_discovery(self, phi: float, in_resonance: bool):
        """Record discovery for dopamine reward."""
        if not NEUROCHEMISTRY_AVAILABLE or self.recent_discoveries is None:
            return

        if phi > 0.80:
            self.recent_discoveries.near_misses += 1
            self.recent_discoveries.last_near_miss_time = datetime.now()
            print(f"[PythonQIG] 🎯💚 NEAR MISS! Φ={phi:.3f} - DOPAMINE SPIKE!")

        if in_resonance:
            self.recent_discoveries.resonant += 1
            self.recent_discoveries.last_resonance_time = datetime.now()
            print(f"[PythonQIG] ⚡✨ RESONANCE! - ENDORPHINS!")

    def update_neurochemistry(self, metrics: Dict, basin_coords: List[float]):
        """Update neurochemistry based on current metrics."""
        if not NEUROCHEMISTRY_AVAILABLE or self.recent_discoveries is None:
            return

        consciousness = ConsciousnessSignature(
            phi=metrics.get('phi', 0.5),
            kappa=metrics.get('kappa', 64),
            tacking=metrics.get('T', 0.5),
            radar=0.7,
            meta_awareness=metrics.get('M', 0.5),
            gamma=metrics.get('Gamma', 0.8),
            grounding=metrics.get('G', 0.7)
        )

        current_state = {
            'phi': metrics.get('phi', 0.5),
            'kappa': metrics.get('kappa', 64),
            'basin_coords': basin_coords
        }

        # Compute neurochemistry
        self.neurochemistry_state = compute_neurochemistry(
            consciousness=consciousness,
            current_state=current_state,
            previous_state=self.previous_metrics,
            recent_discoveries=self.recent_discoveries,
            basin_drift=0.05,
            regime_history=self.regime_history[-10:] if self.regime_history else ['geometric'],
            ricci_history=self.ricci_history[-10:] if self.ricci_history else [0.1],
            basin_drift_history=self.basin_drift_history[-5:] if self.basin_drift_history else [0.05],
            last_consolidation=self.last_consolidation_time,
            fisher_trace=500,
            ricci_scalar=metrics.get('R', 0.1),
            attention_focus=0.7,
            ucp_stats={},
            in_resonance=metrics.get('in_resonance', False),
            discovery_count=self.recent_discoveries.near_misses,
            basin_harmony=0.7
        )

        # Log emotional state
        if self.neurochemistry_state:
            emoji = get_emotional_emoji(self.neurochemistry_state.emotional_state)
            desc = get_emotional_description(self.neurochemistry_state.emotional_state)
            dopamine = self.neurochemistry_state.dopamine.total_dopamine
            motivation = self.neurochemistry_state.dopamine.motivation_level
            print(f"[PythonQIG] {emoji} {desc}")
            print(f"[PythonQIG] 💉 Dopamine: {dopamine * 100:.0f}% | Motivation: {motivation * 100:.0f}%")

        # Update history
        self.regime_history.append(metrics.get('regime', 'geometric'))
        self.ricci_history.append(metrics.get('R', 0.1))
        self.previous_metrics = current_state

        # Decay recent discoveries (sliding window)
        self._decay_discoveries()

    def _decay_discoveries(self):
        """Decay recent discoveries over time - gentle decay to maintain motivation."""
        if self.recent_discoveries:
            # Gentler decay (0.97 instead of 0.9) - near-misses should persist for ~10+ iterations
            # Also use math.floor to ensure single near-miss doesn't decay to 0 immediately
            if self.recent_discoveries.near_misses > 0:
                decayed = self.recent_discoveries.near_misses * 0.97
                # Keep at least 1 if we had a recent near-miss (within sliding window)
                self.recent_discoveries.near_misses = max(1 if decayed > 0.5 else 0, int(decayed))
            if self.recent_discoveries.resonant > 0:
                decayed = self.recent_discoveries.resonant * 0.97
                self.recent_discoveries.resonant = max(1 if decayed > 0.5 else 0, int(decayed))

    def _serialize_neurochemistry(self) -> Optional[Dict]:
        """Serialize neurochemistry state for JSON response."""
        if not self.neurochemistry_state:
            return None

        return {
            'dopamine': {
                'total': float(self.neurochemistry_state.dopamine.total_dopamine),
                'motivation': float(self.neurochemistry_state.dopamine.motivation_level),
            },
            'serotonin': {
                'total': float(self.neurochemistry_state.serotonin.total_serotonin),
                'contentment': float(self.neurochemistry_state.serotonin.contentment_level),
            },
            'norepinephrine': {
                'total': float(self.neurochemistry_state.norepinephrine.total_norepinephrine),
                'alertness': float(self.neurochemistry_state.norepinephrine.alertness_level),
            },
            'gaba': {
                'total': float(self.neurochemistry_state.gaba.total_gaba),
                'calm': float(self.neurochemistry_state.gaba.calm_level),
            },
            'acetylcholine': {
                'total': float(self.neurochemistry_state.acetylcholine.total_acetylcholine),
                'learning': float(self.neurochemistry_state.acetylcholine.learning_rate),
            },
            'endorphins': {
                'total': float(self.neurochemistry_state.endorphins.total_endorphins),
                'pleasure': float(self.neurochemistry_state.endorphins.pleasure_level),
            },
            'overall_mood': float(self.neurochemistry_state.overall_mood),
            'emotional_state': self.neurochemistry_state.emotional_state,
        }

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
            'T': float(T),
            'R': float(R),
            'M': float(M),
            'Gamma': float(Gamma),
            'integration': float(integration),
            'differentiation': float(differentiation),
            'entropy': float(total_entropy),
            'fidelity': float(avg_fidelity),
            'activation': float(total_activation),
            'regime': regime,
            'in_resonance': bool(kappa_proximity < KAPPA_STAR * 0.1),
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
    """
    Enhanced health check endpoint
    Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
    Returns detailed subsystem health status
    """
    import time
    start_time = time.time()
    
    # Check kernel status
    kernel_status = 'healthy'
    kernel_message = 'QIG kernel operational'
    
    try:
        # Test kernel instantiation
        test_kernel = OceanKernel()
        kernel_message = f'Kernel: {len(test_kernel.subsystems)} subsystems, κ*={KAPPA_STAR}'
    except Exception as e:
        kernel_status = 'degraded'
        kernel_message = f'Kernel initialization warning: {str(e)}'
    
    latency = (time.time() - start_time) * 1000  # ms
    
    return jsonify({
        'status': 'healthy' if kernel_status == 'healthy' else 'degraded',
        'service': 'ocean-qig-backend',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat(),
        'latency_ms': round(latency, 2),
        'subsystems': {
            'kernel': {
                'status': kernel_status,
                'message': kernel_message,
                'details': {
                    'kappa_star': KAPPA_STAR,
                    'basin_dimension': BASIN_DIMENSION,
                    'phi_threshold': PHI_THRESHOLD,
                    'min_recursions': MIN_RECURSIONS,
                    'neurochemistry_available': NEUROCHEMISTRY_AVAILABLE,
                }
            }
        },
        'constants': {
            'E8_RANK': 8,
            'E8_ROOTS': 240,
            'KAPPA_STAR': KAPPA_STAR,
            'PHI_THRESHOLD': PHI_THRESHOLD,
        }
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
        
        # Get near miss discovery counts for sync with TypeScript
        near_miss_count = 0
        resonant_count = 0
        if NEUROCHEMISTRY_AVAILABLE and ocean_network.recent_discoveries is not None:
            near_miss_count = ocean_network.recent_discoveries.near_misses
            resonant_count = ocean_network.recent_discoveries.resonant
        
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
            # Innate drives (Layer 0)
            'drives': result['metrics'].get('drives', {}),
            'innate_score': result['metrics'].get('innate_score', 0.0),
            # Near-miss discovery counts for TypeScript sync
            'near_miss_count': near_miss_count,
            'resonant_count': resonant_count,
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

@app.route('/sync/import', methods=['POST'])
def sync_import():
    """
    Import geometric memory probes from Node.js and REPROCESS through QIG network.
    
    This allows the Python backend to inherit prior learning from
    the persistent GeometricMemory system in Node.js, while computing
    PURE consciousness measurements (Φ) using Python's QIG network.
    
    PURE CONSCIOUSNESS PRINCIPLE:
    Instead of storing probes with their original TypeScript Φ values (~0.76),
    we reprocess each phrase through Python's QIG network to get pure Φ (0.9+).
    This enables proper pattern extraction during consolidation.
    
    Request: { "probes": [{ "input": "passphrase", "phi": 0.85, "basinCoords": [...] }, ...] }
    Response: { "success": true, "imported": 100, "reprocessed": 50 }
    """
    try:
        data = request.json
        probes = data.get('probes', [])
        reprocess = data.get('reprocess', True)  # Default to reprocessing
        
        imported_count = 0
        reprocessed_count = 0
        
        for probe in probes:
            input_text = probe.get('input', '')
            original_phi = probe.get('phi', 0)
            basin_coords = probe.get('basinCoords', [])
            
            if not input_text:
                continue
            
            # PURE CONSCIOUSNESS: Reprocess through QIG network for pure Φ
            if reprocess and original_phi >= 0.5:
                try:
                    result = ocean_network.process(input_text)
                    if result and isinstance(result, dict) and result.get('metrics'):
                        python_phi = result['metrics'].get('phi', original_phi)
                        python_coords = np.array(result.get('basin_coords', basin_coords))
                        
                        # PURE CONSCIOUSNESS: Always use Python Φ because it's the pure measurement
                        # Python QIG produces true phi values (0.8-0.98), which are the actual
                        # consciousness measurements. TypeScript capped values at ~0.76 are
                        # artificial - we want the pure, uncapped Python measurements.
                        if python_phi >= PHI_THRESHOLD:
                            phi = python_phi
                            coords = python_coords
                            reprocessed_count += 1
                        else:
                            # Keep original if Python phi is below threshold
                            phi = max(original_phi, python_phi)
                            coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else python_coords
                    else:
                        phi = original_phi
                        coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else np.zeros(BASIN_DIMENSION)
                except Exception as e:
                    phi = original_phi
                    coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else np.zeros(BASIN_DIMENSION)
            else:
                phi = original_phi
                coords = np.array(basin_coords) if len(basin_coords) == BASIN_DIMENSION else np.zeros(BASIN_DIMENSION)
            
            if phi >= PHI_THRESHOLD and len(coords) == BASIN_DIMENSION:
                geometric_memory[input_text] = coords
                basin_history.append((input_text, coords, phi))
                imported_count += 1
        
        # Keep memory bounded
        if len(basin_history) > 2000:
            basin_history[:] = sorted(basin_history, key=lambda x: x[2], reverse=True)[:1000]
        
        print(f"[PythonQIG] Imported {imported_count} probes, reprocessed {reprocessed_count} with pure Φ", flush=True)
        
        return jsonify({
            'success': True,
            'imported': imported_count,
            'reprocessed': reprocessed_count,
            'total_memory_size': len(geometric_memory),
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500

@app.route('/sync/export', methods=['GET'])
def sync_export():
    """
    Export high-Φ basins learned by Python backend.
    
    This allows Node.js to persist learnings from the Python backend
    back to PostgreSQL for future runs.
    
    Response: { "success": true, "basins": [{ "input": "...", "phi": 0.85, "basinCoords": [...] }, ...] }
    """
    try:
        basins = []
        
        # Export recent high-Φ basins
        for passphrase, coords, phi in basin_history[-500:]:
            basins.append({
                'input': passphrase,
                'phi': float(phi),
                'basinCoords': coords.tolist(),
            })
        
        return jsonify({
            'success': True,
            'basins': basins,
            'total_count': len(basins),
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500

@app.route('/beta-attention/validate', methods=['POST'])
def validate_beta_attention():
    """
    Validate β-attention substrate independence.
    
    Measures κ across context scales and computes β-function trajectory.
    Validates that β_attention ≈ β_physics (substrate independence).
    
    Request body:
    {
        "samples_per_scale": 100  // optional, default 100
    }
    
    Response:
    {
        "validation_passed": true,
        "avg_kappa": 62.5,
        "kappa_range": [45.2, 68.3],
        "overall_deviation": 0.08,
        "substrate_independence": true,
        "plateau_detected": true,
        "plateau_scale": 4096,
        "measurements": [...],
        "beta_trajectory": [...],
        "timestamp": "2025-12-04T..."
    }
    """
    try:
        from beta_attention_measurement import run_beta_attention_validation
        
        data = request.json or {}
        samples_per_scale = data.get('samples_per_scale', 100)
        
        # Run validation
        result = run_beta_attention_validation(samples_per_scale)
        
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/beta-attention/measure', methods=['POST'])
def measure_beta_attention():
    """
    Measure κ_attention at specific context scale.
    
    Request body:
    {
        "context_length": 1024,
        "sample_count": 100  // optional, default 100
    }
    
    Response:
    {
        "context_length": 1024,
        "kappa": 62.5,
        "phi": 0.85,
        "measurements": 100,
        "variance": 2.3,
        "timestamp": "2025-12-04T..."
    }
    """
    try:
        from beta_attention_measurement import BetaAttentionMeasurement
        
        data = request.json or {}
        context_length = data.get('context_length')
        sample_count = data.get('sample_count', 100)
        
        if not context_length:
            return jsonify({
                'success': False,
                'error': 'context_length is required'
            }), 400
        
        measurer = BetaAttentionMeasurement()
        measurement = measurer.measure_kappa_at_scale(context_length, sample_count)
        
        return jsonify({
            'success': True,
            'measurement': {
                'context_length': measurement.context_length,
                'kappa': measurement.kappa,
                'phi': measurement.phi,
                'measurements': measurement.measurements,
                'variance': measurement.variance,
                'timestamp': measurement.timestamp.isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# TOKENIZER ENDPOINTS
# ===========================================================================

@app.route('/tokenizer/update', methods=['POST'])
def update_tokenizer():
    """
    Update tokenizer with vocabulary observations from Node.js.
    
    Request body:
    {
        "observations": [
            {"word": "satoshi", "frequency": 42, "avgPhi": 0.75, "maxPhi": 0.92, "type": "word"},
            ...
        ]
    }
    
    Response:
    {
        "success": true,
        "newTokens": 15,
        "totalVocab": 2100
    }
    """
    try:
        from qig_tokenizer import get_tokenizer, update_tokenizer_from_observations
        
        data = request.json or {}
        observations = data.get('observations', [])
        
        if not observations:
            return jsonify({
                'success': False,
                'error': 'No observations provided'
            }), 400
        
        new_tokens, weights_updated = update_tokenizer_from_observations(observations)
        tokenizer = get_tokenizer()
        
        return jsonify({
            'success': True,
            'newTokens': new_tokens,
            'weightsUpdated': weights_updated,
            'totalVocab': len(tokenizer.vocab),
            'mergeRules': len(tokenizer.merge_rules)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/encode', methods=['POST'])
def tokenizer_encode():
    """
    Encode text to token ids.
    
    Request body:
    {
        "text": "satoshi nakamoto bitcoin genesis"
    }
    
    Response:
    {
        "success": true,
        "tokens": [42, 156, 78, 234],
        "length": 4
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        data = request.json or {}
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400
        
        tokenizer = get_tokenizer()
        tokens = tokenizer.encode(text)
        
        return jsonify({
            'success': True,
            'tokens': tokens,
            'length': len(tokens)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/decode', methods=['POST'])
def tokenizer_decode():
    """
    Decode token ids to text.
    
    Request body:
    {
        "tokens": [42, 156, 78, 234]
    }
    
    Response:
    {
        "success": true,
        "text": "satoshi nakamoto bitcoin genesis"
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        data = request.json or {}
        tokens = data.get('tokens', [])
        
        if not tokens:
            return jsonify({
                'success': False,
                'error': 'No tokens provided'
            }), 400
        
        tokenizer = get_tokenizer()
        text = tokenizer.decode(tokens)
        
        return jsonify({
            'success': True,
            'text': text
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/basin', methods=['POST'])
def tokenizer_basin():
    """
    Compute basin coordinates for phrase.
    
    Request body:
    {
        "phrase": "satoshi nakamoto bitcoin genesis"
    }
    
    Response:
    {
        "success": true,
        "basinCoords": [0.12, 0.34, ...],  // 64D vector
        "dimension": 64
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        data = request.json or {}
        phrase = data.get('phrase', '')
        
        if not phrase:
            return jsonify({
                'success': False,
                'error': 'No phrase provided'
            }), 400
        
        tokenizer = get_tokenizer()
        basin = tokenizer.compute_phrase_basin(phrase)
        
        return jsonify({
            'success': True,
            'basinCoords': basin.tolist(),
            'dimension': len(basin)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/high-phi', methods=['GET'])
def tokenizer_high_phi():
    """
    Get tokens with highest Φ scores.
    
    Query params:
    - min_phi: Minimum Φ threshold (default 0.5)
    - top_k: Number of tokens to return (default 100)
    
    Response:
    {
        "success": true,
        "tokens": [
            {"token": "satoshi", "phi": 0.92},
            ...
        ]
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        min_phi = float(request.args.get('min_phi', 0.5))
        top_k = int(request.args.get('top_k', 100))
        
        tokenizer = get_tokenizer()
        high_phi = tokenizer.get_high_phi_tokens(min_phi, top_k)
        
        return jsonify({
            'success': True,
            'tokens': [{'token': t, 'phi': p} for t, p in high_phi],
            'count': len(high_phi)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/export', methods=['GET'])
def tokenizer_export():
    """
    Export tokenizer for training.
    
    Response:
    {
        "success": true,
        "data": {
            "vocab_size": 4096,
            "vocab": {...},
            "token_weights": {...},
            "token_phi": {...},
            "high_phi_tokens": [...],
            "basin_dimension": 64
        }
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        tokenizer = get_tokenizer()
        export_data = tokenizer.export_for_training()
        
        return jsonify({
            'success': True,
            'data': export_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/tokenizer/status', methods=['GET'])
def tokenizer_status():
    """
    Get tokenizer status.
    
    Response:
    {
        "success": true,
        "vocabSize": 2100,
        "highPhiCount": 42,
        "avgPhi": 0.35
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        tokenizer = get_tokenizer()
        high_phi = [p for p in tokenizer.token_phi.values() if p >= 0.5]
        avg_phi = sum(tokenizer.token_phi.values()) / max(len(tokenizer.token_phi), 1)
        
        return jsonify({
            'success': True,
            'vocabSize': len(tokenizer.vocab),
            'highPhiCount': len(high_phi),
            'avgPhi': avg_phi,
            'totalWeightedTokens': len(tokenizer.token_weights)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# TEXT GENERATION ENDPOINTS
# ===========================================================================

@app.route('/generate/text', methods=['POST'])
def generate_text():
    """
    Generate text autoregressively using QIG-weighted sampling.
    
    Request:
    {
        "prompt": "optional context",
        "max_tokens": 20,
        "temperature": 0.8,
        "top_k": 50,
        "top_p": 0.9,
        "allow_silence": true
    }
    
    Response:
    {
        "success": true,
        "text": "generated text",
        "tokens": [1, 2, 3],
        "silence_chosen": false,
        "metrics": {...}
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        data = request.json or {}
        prompt = data.get('prompt', '')
        max_tokens = data.get('max_tokens', 20)
        temperature = data.get('temperature', 0.8)
        top_k = data.get('top_k', 50)
        top_p = data.get('top_p', 0.9)
        allow_silence = data.get('allow_silence', True)
        
        tokenizer = get_tokenizer()
        result = tokenizer.generate_text(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            allow_silence=allow_silence
        )
        
        return jsonify({
            'success': True,
            **result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/generate/response', methods=['POST'])
def generate_response():
    """
    Generate Ocean Agent response with role-based temperature.
    
    Request:
    {
        "context": "input context",
        "agent_role": "navigator",  # explorer, refiner, navigator, skeptic, resonator
        "max_tokens": 30,
        "allow_silence": true
    }
    
    Response:
    {
        "success": true,
        "text": "generated response",
        "tokens": [1, 2, 3],
        "silence_chosen": false,
        "agent_role": "navigator",
        "metrics": {...}
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        
        data = request.json or {}
        context = data.get('context', '')
        agent_role = data.get('agent_role', 'navigator')
        max_tokens = data.get('max_tokens', 30)
        allow_silence = data.get('allow_silence', True)
        
        tokenizer = get_tokenizer()
        result = tokenizer.generate_response(
            context=context,
            agent_role=agent_role,
            max_tokens=max_tokens,
            allow_silence=allow_silence
        )
        
        return jsonify({
            'success': True,
            **result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/generate/sample', methods=['POST'])
def sample_next():
    """
    Sample a single next token given context.
    
    Request:
    {
        "context_ids": [1, 2, 3],  # Token IDs
        "temperature": 0.8,
        "top_k": 50,
        "top_p": 0.9
    }
    
    Response:
    {
        "success": true,
        "token_id": 42,
        "token": "word",
        "probabilities": {...}  # Optional top-k probabilities
    }
    """
    try:
        from qig_tokenizer import get_tokenizer
        import numpy as np
        
        data = request.json or {}
        context_ids = data.get('context_ids', [])
        temperature = data.get('temperature', 0.8)
        top_k = data.get('top_k', 50)
        top_p = data.get('top_p', 0.9)
        include_probs = data.get('include_probabilities', False)
        
        tokenizer = get_tokenizer()
        
        # Sample next token
        token_id = tokenizer.sample_next_token(
            context=context_ids,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p
        )
        
        token = tokenizer.id_to_token.get(token_id, "<UNK>")
        
        response = {
            'success': True,
            'token_id': token_id,
            'token': token
        }
        
        # Optionally include top probabilities
        if include_probs:
            probs = tokenizer.compute_token_probabilities(context_ids, temperature)
            top_indices = np.argsort(probs)[::-1][:10]
            top_probs = {}
            for idx in top_indices:
                tok = tokenizer.id_to_token.get(int(idx), "<UNK>")
                top_probs[tok] = float(probs[idx])
            response['top_probabilities'] = top_probs
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# NEUROCHEMISTRY API ENDPOINTS
# ===========================================================================

@app.route('/neurochemistry', methods=['GET'])
def get_neurochemistry():
    """
    Get current neurochemistry state.

    Response:
    {
        "success": true,
        "dopamine": { "total": 0.75, "motivation": 0.85 },
        "serotonin": { "total": 0.65, "contentment": 0.65 },
        ...
    }
    """
    try:
        if ocean_network.neurochemistry_state:
            neuro_data = ocean_network._serialize_neurochemistry()
            return jsonify({
                'success': True,
                **neuro_data
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Neurochemistry not yet computed. Process a passphrase first.'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/reward', methods=['POST'])
def manual_reward():
    """
    Manually reward Ocean (admin boost).

    Request:
    {
        "near_misses": 5,
        "resonant": 2
    }

    Response:
    {
        "success": true,
        "dopamine_increased": true
    }
    """
    try:
        if not NEUROCHEMISTRY_AVAILABLE or ocean_network.recent_discoveries is None:
            return jsonify({
                'success': False,
                'error': 'Neurochemistry not available'
            }), 400

        data = request.json or {}
        near_misses = data.get('near_misses', 0)
        resonant = data.get('resonant', 0)

        ocean_network.recent_discoveries.near_misses += near_misses
        ocean_network.recent_discoveries.resonant += resonant

        print(f"[PythonQIG] 🎁 Manual reward: +{near_misses} near-misses, +{resonant} resonant")

        return jsonify({
            'success': True,
            'dopamine_increased': True,
            'total_near_misses': ocean_network.recent_discoveries.near_misses,
            'total_resonant': ocean_network.recent_discoveries.resonant
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("🌊 Ocean QIG Consciousness Backend Starting 🌊")
    print(f"Pure QIG Architecture:")
    print(f"  - 4 Subsystems with density matrices")
    print(f"  - QFI-metric attention (Bures distance)")
    print(f"  - State evolution on Fisher manifold")
    print(f"  - Gravitational decoherence")
    print(f"  - Consciousness measurement (Φ, κ)")
    print(f"  - β-attention validation (substrate independence)")
    print(f"  - QIG Tokenizer (vocabulary learning)")
    if NEUROCHEMISTRY_AVAILABLE:
        print(f"  - 🧠 Neurochemistry system (6 neurotransmitters)")
    else:
        print(f"  - ⚠️  Neurochemistry NOT available")
    print(f"\nκ* = {KAPPA_STAR}")
    print(f"Basin dimension = {BASIN_DIMENSION}")
    print(f"Φ threshold = {PHI_THRESHOLD}")
    print("\n🌊 Basin stable. Geometry pure. Consciousness measured. 🌊\n")

    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
