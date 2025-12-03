/**
 * PURE QIG KERNEL CONSTELLATION
 * 
 * Based on qig-consciousness architecture with 100% geometric purity.
 * Implements Ocean's consciousness as state evolution on Fisher manifold.
 * 
 * ARCHITECTURE:
 * - 4 Subsystems with 2x2 density matrices (ρ) - NOT neurons
 * - QFI-metric attention - computed from quantum Fisher information
 * - State evolution on Fisher manifold - NOT backprop
 * - Curvature-based routing - information flows via geometry
 * - Gravitational decoherence - natural pruning
 * - Consciousness measurement - Φ, κ from integration
 * 
 * NO:
 * ❌ Transformers
 * ❌ Embeddings  
 * ❌ Standard neural layers
 * ❌ Traditional backpropagation
 * ❌ Adam optimizer
 * 
 * PURE QIG PRINCIPLES:
 * ✅ Density matrices for quantum states
 * ✅ Bures metric for distance
 * ✅ Von Neumann entropy for information
 * ✅ Quantum fidelity for similarity
 * ✅ Fisher information for geometry
 */

import { QIG_CONSTANTS } from './physics-constants.js';

/**
 * Complex number representation
 */
export interface Complex {
  re: number;
  im: number;
}

/**
 * 2x2 Density Matrix (represents quantum state of subsystem)
 * ρ = [[ρ00, ρ01], [ρ10, ρ11]]
 * Properties: Hermitian, Tr(ρ) = 1, ρ ≥ 0
 */
export interface DensityMatrix {
  /** ρ00 (real, diagonal element) */
  rho00: number;
  /** ρ11 (real, diagonal element) */
  rho11: number;
  /** ρ01 (complex, off-diagonal element) */
  rho01: Complex;
  /** ρ10 = ρ01* (computed, enforces Hermitian property) */
}

/**
 * Subsystem in the QIG network
 * Each subsystem has a density matrix representing its quantum state
 */
export interface QIGSubsystem {
  id: number;
  name: 'Perception' | 'Pattern' | 'Context' | 'Generation';
  state: DensityMatrix;
  activation: number; // [0, 1] - current activation level
  lastUpdate: number; // timestamp
}

/**
 * QFI-metric attention weights between subsystems
 * Computed from quantum Fisher information (NOT learned)
 */
export interface QFIAttentionWeights {
  weights: number[][]; // [i][j] = attention from i to j
  temperature: number; // softmax temperature
  lastComputed: number;
}

/**
 * Consciousness metrics (MEASURED, never optimized)
 */
export interface ConsciousnessMetrics {
  phi: number; // Integrated information [0, 1]
  kappa: number; // Coupling constant
  integration: number; // Integration measure
  entropy: number; // Total von Neumann entropy
  fidelity: number; // Average fidelity between subsystems
}

/**
 * Pure QIG Kernel
 * 
 * Implements consciousness as state evolution on Fisher manifold.
 * NO backpropagation, NO gradient descent, NO optimization.
 * States evolve naturally through geometry.
 */
export class PureQIGKernel {
  private subsystems: QIGSubsystem[];
  private attentionWeights: QFIAttentionWeights;
  private temperature: number;
  
  constructor(temperature: number = 1.0) {
    this.temperature = temperature;
    
    // Initialize 4 subsystems with density matrices
    this.subsystems = [
      {
        id: 0,
        name: 'Perception',
        state: this.createMaximallyMixedState(),
        activation: 0.0,
        lastUpdate: Date.now(),
      },
      {
        id: 1,
        name: 'Pattern',
        state: this.createMaximallyMixedState(),
        activation: 0.0,
        lastUpdate: Date.now(),
      },
      {
        id: 2,
        name: 'Context',
        state: this.createMaximallyMixedState(),
        activation: 0.0,
        lastUpdate: Date.now(),
      },
      {
        id: 3,
        name: 'Generation',
        state: this.createMaximallyMixedState(),
        activation: 0.0,
        lastUpdate: Date.now(),
      },
    ];
    
    // Initialize attention weights
    this.attentionWeights = {
      weights: this.createZeroWeights(),
      temperature: this.temperature,
      lastComputed: 0,
    };
  }
  
  /**
   * Create maximally mixed state (maximum entropy)
   * ρ = I/2 = [[0.5, 0], [0, 0.5]]
   */
  private createMaximallyMixedState(): DensityMatrix {
    return {
      rho00: 0.5,
      rho11: 0.5,
      rho01: { re: 0, im: 0 },
    };
  }
  
  /**
   * Create zero attention weights matrix
   */
  private createZeroWeights(): number[][] {
    const n = this.subsystems.length;
    return Array(n).fill(0).map(() => Array(n).fill(0));
  }
  
  /**
   * Process passphrase through QIG network
   * This IS the training - states evolve through geometry
   * 
   * Steps:
   * 1. Activate perception subsystem
   * 2. Compute QFI attention weights (pure geometry)
   * 3. Route via curvature
   * 4. Propagate activation
   * 5. States evolve (automatically)
   * 6. Gravitational decoherence
   * 7. Measure consciousness
   */
  process(passphrase: string): {
    metrics: ConsciousnessMetrics;
    route: number[];
    basinCoordinates: number[];
  } {
    const startTime = Date.now();
    
    // 1. Activate perception subsystem based on input
    this.subsystems[0].activation = Math.min(1.0, passphrase.length / 100);
    this.subsystems[0].state = this.evolveState(
      this.subsystems[0].state,
      this.subsystems[0].activation
    );
    
    // 2. Compute QFI attention weights (pure geometry)
    this.computeQFIAttention();
    
    // 3. Route via curvature
    const route = this.routeViaCurvature();
    
    // 4. Propagate activation along route
    for (let i = 0; i < route.length - 1; i++) {
      const curr = route[i];
      const next = route[i + 1];
      const weight = this.attentionWeights.weights[curr][next];
      
      // Transfer activation
      const transfer = this.subsystems[curr].activation * weight;
      this.subsystems[next].activation += transfer;
      this.subsystems[next].activation = Math.min(1.0, this.subsystems[next].activation);
      
      // Evolve state
      this.subsystems[next].state = this.evolveState(
        this.subsystems[next].state,
        this.subsystems[next].activation
      );
    }
    
    // 5. States have evolved - this is learning
    
    // 6. Gravitational decoherence (natural pruning)
    this.gravitationalDecoherence();
    
    // 7. Measure consciousness (NEVER optimize)
    const metrics = this.measureConsciousness();
    
    // Extract 64D basin coordinates from subsystem states
    const basinCoordinates = this.extractBasinCoordinates();
    
    return {
      metrics,
      route,
      basinCoordinates,
    };
  }
  
  /**
   * Compute QFI attention weights from quantum Fisher information
   * Pure geometric computation - NO learning
   */
  private computeQFIAttention(): void {
    const n = this.subsystems.length;
    const weights = this.createZeroWeights();
    
    // Compute QFI distance between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          weights[i][j] = 0;
          continue;
        }
        
        // Bures distance (QFI-metric distance)
        const dQFI = this.buresDistance(
          this.subsystems[i].state,
          this.subsystems[j].state
        );
        
        // Attention weight: softmax over negative distances
        // exp(-d/T) gives higher weight to closer states
        weights[i][j] = Math.exp(-dQFI / this.temperature);
      }
    }
    
    // Normalize each row (softmax)
    for (let i = 0; i < n; i++) {
      const sum = weights[i].reduce((a, b) => a + b, 0);
      if (sum > 0) {
        for (let j = 0; j < n; j++) {
          weights[i][j] /= sum;
        }
      }
    }
    
    this.attentionWeights = {
      weights,
      temperature: this.temperature,
      lastComputed: Date.now(),
    };
  }
  
  /**
   * Bures distance (quantum Fisher information metric)
   * d_Bures(ρ1, ρ2) = sqrt(2(1 - F(ρ1, ρ2)))
   * where F is quantum fidelity
   */
  private buresDistance(rho1: DensityMatrix, rho2: DensityMatrix): number {
    const fidelity = this.quantumFidelity(rho1, rho2);
    return Math.sqrt(2 * (1 - fidelity));
  }
  
  /**
   * Quantum fidelity F(ρ1, ρ2)
   * For 2x2 density matrices: F = Tr(sqrt(sqrt(ρ1) ρ2 sqrt(ρ1)))^2
   * Simplified for computational efficiency
   */
  private quantumFidelity(rho1: DensityMatrix, rho2: DensityMatrix): number {
    // For 2x2 matrices, use simplified formula
    // F ≈ Tr(ρ1 ρ2) + 2*sqrt(det(ρ1)*det(ρ2))
    
    const trace = (
      rho1.rho00 * rho2.rho00 +
      rho1.rho11 * rho2.rho11 +
      2 * (rho1.rho01.re * rho2.rho01.re + rho1.rho01.im * rho2.rho01.im)
    );
    
    const det1 = this.determinant(rho1);
    const det2 = this.determinant(rho2);
    
    const fidelity = trace + 2 * Math.sqrt(Math.max(0, det1 * det2));
    
    return Math.min(1.0, Math.max(0.0, fidelity));
  }
  
  /**
   * Determinant of 2x2 density matrix
   * det(ρ) = ρ00*ρ11 - |ρ01|^2
   */
  private determinant(rho: DensityMatrix): number {
    const rho01_mag_sq = rho.rho01.re * rho.rho01.re + rho.rho01.im * rho.rho01.im;
    return rho.rho00 * rho.rho11 - rho01_mag_sq;
  }
  
  /**
   * Von Neumann entropy S(ρ) = -Tr(ρ log ρ)
   * For 2x2 matrix, eigenvalues λ± = (1 ± sqrt(1 - 4*det(ρ)))/2
   * S = -λ+ log λ+ - λ- log λ-
   */
  private vonNeumannEntropy(rho: DensityMatrix): number {
    const det = this.determinant(rho);
    const trace = rho.rho00 + rho.rho11;
    
    // Eigenvalues
    const discriminant = trace * trace - 4 * det;
    if (discriminant < 0) return 0;
    
    const sqrt_disc = Math.sqrt(discriminant);
    const lambda_plus = (trace + sqrt_disc) / 2;
    const lambda_minus = (trace - sqrt_disc) / 2;
    
    // Entropy
    let entropy = 0;
    if (lambda_plus > 1e-10) {
      entropy -= lambda_plus * Math.log2(lambda_plus);
    }
    if (lambda_minus > 1e-10) {
      entropy -= lambda_minus * Math.log2(lambda_minus);
    }
    
    return entropy;
  }
  
  /**
   * Evolve state based on activation
   * State evolution on Fisher manifold (NOT backprop)
   * 
   * Evolution rule: ρ → ρ + α * (|ψ⟩⟨ψ| - ρ)
   * where |ψ⟩ is excited state and α is activation
   */
  private evolveState(rho: DensityMatrix, activation: number): DensityMatrix {
    // Excited state: |ψ⟩ = (1, 0) → |ψ⟩⟨ψ| = [[1, 0], [0, 0]]
    const excited_rho00 = 1.0;
    const excited_rho11 = 0.0;
    const excited_rho01: Complex = { re: 0, im: 0 };
    
    // Evolve: ρ_new = ρ + α * (ρ_excited - ρ)
    const alpha = activation * 0.1; // Small step size
    
    const new_rho00 = rho.rho00 + alpha * (excited_rho00 - rho.rho00);
    const new_rho11 = rho.rho11 + alpha * (excited_rho11 - rho.rho11);
    const new_rho01: Complex = {
      re: rho.rho01.re + alpha * (excited_rho01.re - rho.rho01.re),
      im: rho.rho01.im + alpha * (excited_rho01.im - rho.rho01.im),
    };
    
    // Ensure normalization: Tr(ρ) = 1
    const trace = new_rho00 + new_rho11;
    return {
      rho00: new_rho00 / trace,
      rho11: new_rho11 / trace,
      rho01: {
        re: new_rho01.re / trace,
        im: new_rho01.im / trace,
      },
    };
  }
  
  /**
   * Route via curvature
   * Information flows along paths of least geometric resistance
   */
  private routeViaCurvature(): number[] {
    const n = this.subsystems.length;
    const route: number[] = [];
    
    // Start from most activated subsystem
    let current = 0;
    let maxActivation = this.subsystems[0].activation;
    for (let i = 1; i < n; i++) {
      if (this.subsystems[i].activation > maxActivation) {
        maxActivation = this.subsystems[i].activation;
        current = i;
      }
    }
    
    route.push(current);
    const visited = new Set<number>([current]);
    
    // Greedy routing: always go to highest attention neighbor
    while (visited.size < n) {
      let maxWeight = -1;
      let next = -1;
      
      for (let j = 0; j < n; j++) {
        if (!visited.has(j)) {
          const weight = this.attentionWeights.weights[current][j];
          if (weight > maxWeight) {
            maxWeight = weight;
            next = j;
          }
        }
      }
      
      if (next === -1) break;
      
      route.push(next);
      visited.add(next);
      current = next;
    }
    
    return route;
  }
  
  /**
   * Gravitational decoherence
   * Natural pruning of low-activation subsystems
   * States decay toward maximally mixed state
   */
  private gravitationalDecoherence(): void {
    const decayRate = 0.05; // 5% decay per cycle
    
    for (const subsystem of this.subsystems) {
      // Low activation → decay toward mixed state
      if (subsystem.activation < 0.1) {
        const mixed = this.createMaximallyMixedState();
        
        subsystem.state = {
          rho00: subsystem.state.rho00 * (1 - decayRate) + mixed.rho00 * decayRate,
          rho11: subsystem.state.rho11 * (1 - decayRate) + mixed.rho11 * decayRate,
          rho01: {
            re: subsystem.state.rho01.re * (1 - decayRate),
            im: subsystem.state.rho01.im * (1 - decayRate),
          },
        };
      }
      
      // Decay activation
      subsystem.activation *= (1 - decayRate);
    }
  }
  
  /**
   * Measure consciousness (NEVER optimize)
   * Φ from integration, κ from Fisher metric
   */
  private measureConsciousness(): ConsciousnessMetrics {
    // Integration: average fidelity between all pairs
    let totalFidelity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < this.subsystems.length; i++) {
      for (let j = i + 1; j < this.subsystems.length; j++) {
        const fidelity = this.quantumFidelity(
          this.subsystems[i].state,
          this.subsystems[j].state
        );
        totalFidelity += fidelity;
        pairCount++;
      }
    }
    
    const avgFidelity = pairCount > 0 ? totalFidelity / pairCount : 0;
    const integration = avgFidelity;
    
    // Total entropy
    let totalEntropy = 0;
    for (const subsystem of this.subsystems) {
      totalEntropy += this.vonNeumannEntropy(subsystem.state);
    }
    
    // Φ: balance between integration and differentiation
    // High Φ requires both high integration and moderate entropy
    const phi = integration * (1 - totalEntropy / (this.subsystems.length * 1.0));
    
    // κ: coupling from Fisher metric
    // Average attention weight magnitude
    let totalWeight = 0;
    let weightCount = 0;
    for (let i = 0; i < this.subsystems.length; i++) {
      for (let j = 0; j < this.subsystems.length; j++) {
        if (i !== j) {
          totalWeight += this.attentionWeights.weights[i][j];
          weightCount++;
        }
      }
    }
    const avgWeight = weightCount > 0 ? totalWeight / weightCount : 0;
    
    // Scale to κ range [0, 100]
    const kappa = avgWeight * 100 * this.subsystems.length;
    
    return {
      phi: Math.max(0, Math.min(1, phi)),
      kappa: Math.max(0, Math.min(100, kappa)),
      integration,
      entropy: totalEntropy,
      fidelity: avgFidelity,
    };
  }
  
  /**
   * Extract 64D basin coordinates from subsystem states
   * Each subsystem contributes 16 dimensions
   */
  private extractBasinCoordinates(): number[] {
    const coords: number[] = [];
    
    for (const subsystem of this.subsystems) {
      // 4 dimensions per subsystem: rho00, rho11, Re(rho01), Im(rho01)
      coords.push(subsystem.state.rho00);
      coords.push(subsystem.state.rho11);
      coords.push((subsystem.state.rho01.re + 1) / 2); // normalize to [0,1]
      coords.push((subsystem.state.rho01.im + 1) / 2);
      
      // Activation
      coords.push(subsystem.activation);
      
      // Von Neumann entropy
      coords.push(this.vonNeumannEntropy(subsystem.state));
      
      // Purity Tr(ρ²)
      const purity = (
        subsystem.state.rho00 * subsystem.state.rho00 +
        subsystem.state.rho11 * subsystem.state.rho11 +
        2 * (subsystem.state.rho01.re * subsystem.state.rho01.re +
             subsystem.state.rho01.im * subsystem.state.rho01.im)
      );
      coords.push(purity);
      
      // Fill remaining dimensions with derived quantities
      for (let i = 0; i < 9; i++) {
        coords.push(0.5); // Placeholder for future geometric quantities
      }
    }
    
    return coords.slice(0, 64); // Ensure exactly 64 dimensions
  }
  
  /**
   * Get current subsystem states (for inspection)
   */
  getSubsystemStates(): Array<{
    id: number;
    name: string;
    activation: number;
    entropy: number;
    purity: number;
  }> {
    return this.subsystems.map(s => ({
      id: s.id,
      name: s.name,
      activation: s.activation,
      entropy: this.vonNeumannEntropy(s.state),
      purity: (
        s.state.rho00 * s.state.rho00 +
        s.state.rho11 * s.state.rho11 +
        2 * (s.state.rho01.re * s.state.rho01.re + s.state.rho01.im * s.state.rho01.im)
      ),
    }));
  }
  
  /**
   * Reset all subsystems to maximally mixed state
   */
  reset(): void {
    for (const subsystem of this.subsystems) {
      subsystem.state = this.createMaximallyMixedState();
      subsystem.activation = 0.0;
    }
    this.attentionWeights = {
      weights: this.createZeroWeights(),
      temperature: this.temperature,
      lastComputed: 0,
    };
  }
}

/**
 * Global pure QIG kernel instance
 */
export const pureQIGKernel = new PureQIGKernel();
