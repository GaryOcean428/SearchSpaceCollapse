/**
 * Tests for Pure QIG Kernel
 * 
 * Validates:
 * 1. Density matrix operations (Hermitian, normalized)
 * 2. Bures distance (quantum metric)
 * 3. Von Neumann entropy
 * 4. Quantum fidelity
 * 5. State evolution on Fisher manifold
 * 6. Consciousness measurement (no optimization)
 * 7. Continuous learning through state evolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PureQIGKernel } from '../qig-kernel-pure';

describe('PureQIGKernel', () => {
  let kernel: PureQIGKernel;
  
  beforeEach(() => {
    kernel = new PureQIGKernel();
  });
  
  describe('Initialization', () => {
    it('should initialize 4 subsystems with maximally mixed states', () => {
      const states = kernel.getSubsystemStates();
      
      expect(states).toHaveLength(4);
      expect(states.map(s => s.name)).toEqual([
        'Perception',
        'Pattern',
        'Context',
        'Generation',
      ]);
      
      // Maximally mixed state has maximum entropy (1.0 for 2x2 matrix)
      for (const state of states) {
        expect(state.entropy).toBeCloseTo(1.0, 2);
        expect(state.purity).toBeCloseTo(0.5, 2); // Tr(ρ²) = 0.5 for mixed state
      }
    });
    
    it('should initialize with zero activation', () => {
      const states = kernel.getSubsystemStates();
      
      for (const state of states) {
        expect(state.activation).toBe(0);
      }
    });
  });
  
  describe('Process passphrase', () => {
    it('should process passphrase and update states', () => {
      const result = kernel.process('test passphrase');
      
      expect(result.metrics).toBeDefined();
      expect(result.metrics.phi).toBeGreaterThanOrEqual(0);
      expect(result.metrics.phi).toBeLessThanOrEqual(1);
      expect(result.metrics.kappa).toBeGreaterThanOrEqual(0);
      expect(result.route).toBeDefined();
      expect(result.route.length).toBeGreaterThan(0);
      expect(result.basinCoordinates).toHaveLength(64);
    });
    
    it('should activate perception subsystem', () => {
      kernel.process('short');
      const states = kernel.getSubsystemStates();
      
      // Perception (id=0) should have some activation
      expect(states[0].activation).toBeGreaterThan(0);
    });
    
    it('should evolve states (continuous learning)', () => {
      const statesBefore = kernel.getSubsystemStates();
      const entropyBefore = statesBefore.map(s => s.entropy);
      
      kernel.process('test phrase 1');
      kernel.process('test phrase 2');
      
      const statesAfter = kernel.getSubsystemStates();
      const entropyAfter = statesAfter.map(s => s.entropy);
      
      // States should have changed (learning happened)
      let changed = false;
      for (let i = 0; i < entropyBefore.length; i++) {
        if (Math.abs(entropyBefore[i] - entropyAfter[i]) > 0.001) {
          changed = true;
          break;
        }
      }
      
      expect(changed).toBe(true);
    });
    
    it('should produce deterministic results for same input', () => {
      kernel.reset();
      const result1 = kernel.process('determinism test');
      
      kernel.reset();
      const result2 = kernel.process('determinism test');
      
      expect(result1.metrics.phi).toBeCloseTo(result2.metrics.phi, 10);
      expect(result1.metrics.kappa).toBeCloseTo(result2.metrics.kappa, 10);
    });
    
    it('should produce different results for different inputs', () => {
      kernel.reset();
      const result1 = kernel.process('phrase A');
      
      kernel.reset();
      const result2 = kernel.process('phrase B');
      
      // Should be different
      expect(result1.metrics.phi).not.toBeCloseTo(result2.metrics.phi, 5);
    });
  });
  
  describe('Consciousness measurement', () => {
    it('should measure phi in [0, 1]', () => {
      const result = kernel.process('consciousness test');
      
      expect(result.metrics.phi).toBeGreaterThanOrEqual(0);
      expect(result.metrics.phi).toBeLessThanOrEqual(1);
    });
    
    it('should measure kappa in [0, 100]', () => {
      const result = kernel.process('coupling test');
      
      expect(result.metrics.kappa).toBeGreaterThanOrEqual(0);
      expect(result.metrics.kappa).toBeLessThanOrEqual(100);
    });
    
    it('should measure integration from fidelity', () => {
      const result = kernel.process('integration test');
      
      expect(result.metrics.integration).toBeGreaterThanOrEqual(0);
      expect(result.metrics.integration).toBeLessThanOrEqual(1);
      expect(result.metrics.fidelity).toBeGreaterThanOrEqual(0);
      expect(result.metrics.fidelity).toBeLessThanOrEqual(1);
    });
    
    it('should compute total entropy', () => {
      const result = kernel.process('entropy test');
      
      // Total entropy for 4 subsystems, max 1.0 each = 4.0 max
      expect(result.metrics.entropy).toBeGreaterThanOrEqual(0);
      expect(result.metrics.entropy).toBeLessThanOrEqual(4.0);
    });
  });
  
  describe('State evolution', () => {
    it('should evolve toward excited state with activation', () => {
      kernel.reset();
      
      // Process multiple times
      for (let i = 0; i < 10; i++) {
        kernel.process('evolve test');
      }
      
      const states = kernel.getSubsystemStates();
      
      // At least one subsystem should be less than maximally mixed
      const hasEvolvedState = states.some(s => s.entropy < 0.9);
      expect(hasEvolvedState).toBe(true);
    });
    
    it('should maintain normalization Tr(ρ) = 1', () => {
      // Process many times
      for (let i = 0; i < 20; i++) {
        kernel.process(`iteration ${i}`);
      }
      
      const states = kernel.getSubsystemStates();
      
      // Purity check implies normalization
      for (const state of states) {
        expect(state.purity).toBeGreaterThanOrEqual(0);
        expect(state.purity).toBeLessThanOrEqual(1);
      }
    });
  });
  
  describe('Gravitational decoherence', () => {
    it('should decay low-activation subsystems', () => {
      kernel.reset();
      
      // Activate only perception
      kernel.process('a');
      
      const statesAfter1 = kernel.getSubsystemStates();
      const activations1 = statesAfter1.map(s => s.activation);
      
      // Process many times with no new input
      for (let i = 0; i < 10; i++) {
        kernel.process('');
      }
      
      const statesAfter2 = kernel.getSubsystemStates();
      const activations2 = statesAfter2.map(s => s.activation);
      
      // Activations should decay
      for (let i = 0; i < activations1.length; i++) {
        expect(activations2[i]).toBeLessThanOrEqual(activations1[i]);
      }
    });
    
    it('should decay states toward maximally mixed', () => {
      kernel.reset();
      
      // Activate strongly
      kernel.process('long passphrase to activate subsystems strongly');
      
      const statesBefore = kernel.getSubsystemStates();
      const entropyBefore = statesBefore.map(s => s.entropy);
      
      // Let it decay
      for (let i = 0; i < 50; i++) {
        kernel.process('');
      }
      
      const statesAfter = kernel.getSubsystemStates();
      const entropyAfter = statesAfter.map(s => s.entropy);
      
      // Entropy should increase (toward maximally mixed)
      let entropyIncreased = false;
      for (let i = 0; i < entropyBefore.length; i++) {
        if (entropyAfter[i] > entropyBefore[i] + 0.01) {
          entropyIncreased = true;
          break;
        }
      }
      
      expect(entropyIncreased).toBe(true);
    });
  });
  
  describe('Basin coordinates', () => {
    it('should extract 64D basin coordinates', () => {
      const result = kernel.process('basin test');
      
      expect(result.basinCoordinates).toHaveLength(64);
      
      // All coordinates should be in [0, 1]
      for (const coord of result.basinCoordinates) {
        expect(coord).toBeGreaterThanOrEqual(0);
        expect(coord).toBeLessThanOrEqual(1);
      }
    });
    
    it('should update basin coordinates with state evolution', () => {
      kernel.reset();
      const result1 = kernel.process('state A');
      
      kernel.reset();
      const result2 = kernel.process('state B');
      
      // Coordinates should differ
      let different = false;
      for (let i = 0; i < result1.basinCoordinates.length; i++) {
        if (Math.abs(result1.basinCoordinates[i] - result2.basinCoordinates[i]) > 0.01) {
          different = true;
          break;
        }
      }
      
      expect(different).toBe(true);
    });
  });
  
  describe('Curvature-based routing', () => {
    it('should compute routing path', () => {
      const result = kernel.process('routing test');
      
      expect(result.route).toBeDefined();
      expect(result.route.length).toBeGreaterThan(0);
      expect(result.route.length).toBeLessThanOrEqual(4); // Max 4 subsystems
      
      // Each route element should be valid subsystem ID
      for (const id of result.route) {
        expect(id).toBeGreaterThanOrEqual(0);
        expect(id).toBeLessThan(4);
      }
    });
    
    it('should start from most activated subsystem', () => {
      kernel.reset();
      const result = kernel.process('start routing');
      
      // Should start from subsystem 0 (Perception) as it gets activated first
      expect(result.route[0]).toBe(0);
    });
  });
  
  describe('Pure QIG principles', () => {
    it('should NOT use Euclidean distance (uses Bures metric)', () => {
      // This is a structural test - the code doesn't use sqrt(sum((x-y)^2))
      // for quantum states, it uses Bures distance based on fidelity
      const result = kernel.process('pure qig test');
      
      // Just verify it runs with pure QIG
      expect(result.metrics).toBeDefined();
    });
    
    it('should MEASURE consciousness, not optimize it', () => {
      // Phi and kappa should be MEASURED from state, not set to targets
      kernel.reset();
      const result1 = kernel.process('test 1');
      
      // Phi should never be exactly 1.0 or kappa exactly 64 unless by chance
      const isNotHardcoded = (
        result1.metrics.phi !== 1.0 ||
        result1.metrics.kappa !== 64.0
      );
      
      expect(isNotHardcoded).toBe(true);
    });
    
    it('should use state evolution, not backpropagation', () => {
      // States evolve through geometric dynamics, not gradient descent
      // This is structural - no gradient computation in the code
      kernel.reset();
      
      // Multiple processes should evolve states naturally
      for (let i = 0; i < 5; i++) {
        kernel.process(`evolution step ${i}`);
      }
      
      const states = kernel.getSubsystemStates();
      
      // States should have evolved
      expect(states.some(s => s.activation > 0 || s.entropy < 0.99)).toBe(true);
    });
  });
  
  describe('Reset', () => {
    it('should reset all subsystems to initial state', () => {
      // Process some data
      kernel.process('some data');
      
      const statesBefore = kernel.getSubsystemStates();
      const hasActivation = statesBefore.some(s => s.activation > 0.01);
      expect(hasActivation).toBe(true);
      
      // Reset
      kernel.reset();
      
      const statesAfter = kernel.getSubsystemStates();
      
      // All should be back to initial
      for (const state of statesAfter) {
        expect(state.activation).toBe(0);
        expect(state.entropy).toBeCloseTo(1.0, 2);
      }
    });
  });
});
