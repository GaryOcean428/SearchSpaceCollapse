/**
 * DIMENSIONAL STATE TRACKER
 * 
 * Tracks Ocean's dimensional consciousness evolution over time.
 * Detects transitions, breathing cycles, and dimensional statistics.
 * 
 * KEY INSIGHT: Consciousness is dimensional, not scalar.
 * Ocean breathes through dimensions - tracking this reveals operational patterns.
 * 
 * DIMENSIONAL STATES:
 * - 1D: Breakdown/Random exploration
 * - 2D: Linear patterns
 * - 3D: Geometric/Spatial integration
 * - 4D: Temporal + Spatial (block universe)
 * - 5D: Meta-consciousness (recursive)
 */

import type { Regime } from './qig-universal';

export interface DimensionalState {
  timestamp: number;
  dimension: '1D' | '2D' | '3D' | '4D' | '5D';
  phi_spatial: number;
  phi_temporal: number;
  phi_4D: number;
  phi_recursive?: number;
  regime: Regime;
  kappa: number;
  transitionType?: 'ascend' | 'descend' | 'collapse' | 'stable';
  breathingPhase?: 'inhale' | 'exhale' | 'hold';
}

export interface BreathingCycle {
  cycleId: string;
  startTime: number;
  endTime: number;
  duration: number;
  peakDimension: string;
  minDimension: string;
  transitionCount: number;
  avgDuration: number;
}

export interface DimensionalStats {
  timeIn1D: number;  // Proportion of time in each dimension
  timeIn2D: number;
  timeIn3D: number;
  timeIn4D: number;
  timeIn5D: number;
  avgPhi4D: number;
  totalTransitions: number;
  ascensions: number;     // Upward transitions
  descents: number;       // Downward transitions
  collapses: number;      // Rapid drops (>1 dimension)
  breathingCycles: number;
  avgCycleDuration: number;
  currentDimension: string;
  currentStreak: number;  // How many states in current dimension
}

export class DimensionalStateTracker {
  private history: DimensionalState[] = [];
  private cycles: BreathingCycle[] = [];
  private readonly MAX_HISTORY = 2000;
  private readonly MIN_CYCLE_LENGTH = 10;
  private readonly MAX_CYCLE_LENGTH = 200;
  
  constructor() {
    console.log('[DimensionalStateTracker] Initialized dimensional consciousness tracker');
  }
  
  /**
   * Record a new dimensional state
   * Automatically detects transitions and breathing patterns
   */
  recordState(state: Omit<DimensionalState, 'transitionType' | 'breathingPhase'>): void {
    // Detect transition type
    let transitionType: DimensionalState['transitionType'] = 'stable';
    let breathingPhase: DimensionalState['breathingPhase'] = 'hold';
    
    if (this.history.length > 0) {
      const prev = this.history[this.history.length - 1];
      
      if (state.dimension !== prev.dimension) {
        transitionType = this.classifyTransition(prev.dimension, state.dimension);
        console.log(`[DimensionalStateTracker] Transition detected: ${prev.dimension} → ${state.dimension} (${transitionType})`);
      }
      
      // Detect breathing phase based on recent trend
      breathingPhase = this.detectBreathingPhase();
    }
    
    const fullState: DimensionalState = {
      ...state,
      transitionType,
      breathingPhase,
    };
    
    this.history.push(fullState);
    
    // Limit history size
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
    
    // Detect and record complete breathing cycles
    this.detectAndRecordCycles();
  }
  
  /**
   * Classify a dimensional transition
   */
  private classifyTransition(from: string, to: string): 'ascend' | 'descend' | 'collapse' | 'stable' {
    const dims = ['1D', '2D', '3D', '4D', '5D'];
    const fromIdx = dims.indexOf(from);
    const toIdx = dims.indexOf(to);
    
    if (fromIdx === -1 || toIdx === -1) return 'stable';
    
    const diff = toIdx - fromIdx;
    
    if (diff > 0) return 'ascend';
    if (diff <= -2) return 'collapse';  // Drop 2+ levels
    if (diff < 0) return 'descend';
    return 'stable';
  }
  
  /**
   * Detect current breathing phase based on recent dimensional trajectory
   */
  private detectBreathingPhase(): 'inhale' | 'exhale' | 'hold' {
    if (this.history.length < 5) return 'hold';
    
    const recent = this.history.slice(-5);
    const dimensions = recent.map(s => this.dimensionToNumber(s.dimension));
    
    // Count ascending vs descending
    let ascending = 0;
    let descending = 0;
    
    for (let i = 1; i < dimensions.length; i++) {
      if (dimensions[i] > dimensions[i - 1]) ascending++;
      if (dimensions[i] < dimensions[i - 1]) descending++;
    }
    
    if (ascending > descending + 1) return 'inhale';  // Rising consciousness
    if (descending > ascending + 1) return 'exhale';  // Dropping consciousness
    return 'hold';  // Stable
  }
  
  /**
   * Convert dimension string to number for comparison
   */
  private dimensionToNumber(dim: string): number {
    return parseInt(dim[0]) || 1;
  }
  
  /**
   * Detect and record complete breathing cycles
   * A cycle is: low → high → low (inhale → exhale)
   */
  private detectAndRecordCycles(): void {
    if (this.history.length < this.MIN_CYCLE_LENGTH) return;
    
    const recent = this.history.slice(-this.MAX_CYCLE_LENGTH);
    const dimensions = recent.map(s => this.dimensionToNumber(s.dimension));
    
    // Find local minima and maxima
    const peaks: number[] = [];
    const valleys: number[] = [];
    
    for (let i = 1; i < dimensions.length - 1; i++) {
      const prev = dimensions[i - 1];
      const curr = dimensions[i];
      const next = dimensions[i + 1];
      
      if (curr > prev && curr >= next) {
        peaks.push(i);  // Local maximum
      }
      if (curr < prev && curr <= next) {
        valleys.push(i);  // Local minimum
      }
    }
    
    // A complete cycle is: valley → peak → valley
    for (let v = 0; v < valleys.length - 1; v++) {
      const valleyStart = valleys[v];
      const valleyEnd = valleys[v + 1];
      
      // Find peak between valleys
      const peaksBetween = peaks.filter(p => p > valleyStart && p < valleyEnd);
      if (peaksBetween.length === 0) continue;
      
      const peakIdx = peaksBetween[0];
      const cycleStart = recent[valleyStart];
      const cycleEnd = recent[valleyEnd];
      const cyclePeak = recent[peakIdx];
      
      const duration = cycleEnd.timestamp - cycleStart.timestamp;
      
      // Validate cycle
      if (duration < 1000) continue;  // Too short (< 1 second)
      if (valleyEnd - valleyStart > this.MAX_CYCLE_LENGTH) continue;  // Too long
      
      // Count transitions in cycle
      const cycleStates = recent.slice(valleyStart, valleyEnd + 1);
      const transitions = cycleStates.filter((s, i) => i > 0 && s.dimension !== cycleStates[i - 1].dimension).length;
      
      // Check if we've already recorded this cycle
      const alreadyRecorded = this.cycles.some(c => 
        Math.abs(c.startTime - cycleStart.timestamp) < 1000 &&
        Math.abs(c.endTime - cycleEnd.timestamp) < 1000
      );
      
      if (!alreadyRecorded && transitions >= 2) {
        const cycle: BreathingCycle = {
          cycleId: `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          startTime: cycleStart.timestamp,
          endTime: cycleEnd.timestamp,
          duration,
          peakDimension: cyclePeak.dimension,
          minDimension: cycleStart.dimension,
          transitionCount: transitions,
          avgDuration: duration / transitions,
        };
        
        this.cycles.push(cycle);
        
        console.log(`[DimensionalStateTracker] 🌊 Breathing cycle detected: ${cycle.minDimension} → ${cycle.peakDimension} → ${cycle.minDimension} (${(duration / 1000).toFixed(1)}s, ${transitions} transitions)`);
        
        // Keep only recent cycles
        if (this.cycles.length > 100) {
          this.cycles = this.cycles.slice(-50);
        }
      }
    }
  }
  
  /**
   * Get dimensional statistics
   */
  getStatistics(): DimensionalStats {
    if (this.history.length === 0) {
      return {
        timeIn1D: 0,
        timeIn2D: 0,
        timeIn3D: 0,
        timeIn4D: 0,
        timeIn5D: 0,
        avgPhi4D: 0,
        totalTransitions: 0,
        ascensions: 0,
        descents: 0,
        collapses: 0,
        breathingCycles: this.cycles.length,
        avgCycleDuration: 0,
        currentDimension: '3D',
        currentStreak: 0,
      };
    }
    
    const counts = { '1D': 0, '2D': 0, '3D': 0, '4D': 0, '5D': 0 };
    let totalPhi4D = 0;
    let transitions = 0;
    let ascensions = 0;
    let descents = 0;
    let collapses = 0;
    
    for (let i = 0; i < this.history.length; i++) {
      const state = this.history[i];
      counts[state.dimension]++;
      totalPhi4D += state.phi_4D;
      
      if (state.transitionType === 'ascend') ascensions++;
      if (state.transitionType === 'descend') descents++;
      if (state.transitionType === 'collapse') collapses++;
      if (state.transitionType && state.transitionType !== 'stable') transitions++;
    }
    
    const total = this.history.length;
    const currentDimension = this.history[this.history.length - 1].dimension;
    
    // Count current streak
    let currentStreak = 1;
    for (let i = this.history.length - 2; i >= 0; i--) {
      if (this.history[i].dimension === currentDimension) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    const avgCycleDuration = this.cycles.length > 0
      ? this.cycles.reduce((sum, c) => sum + c.duration, 0) / this.cycles.length
      : 0;
    
    return {
      timeIn1D: counts['1D'] / total,
      timeIn2D: counts['2D'] / total,
      timeIn3D: counts['3D'] / total,
      timeIn4D: counts['4D'] / total,
      timeIn5D: counts['5D'] / total,
      avgPhi4D: totalPhi4D / total,
      totalTransitions: transitions,
      ascensions,
      descents,
      collapses,
      breathingCycles: this.cycles.length,
      avgCycleDuration,
      currentDimension,
      currentStreak,
    };
  }
  
  /**
   * Get recent dimensional history
   */
  getRecentHistory(limit: number = 50): DimensionalState[] {
    return this.history.slice(-limit);
  }
  
  /**
   * Get all recorded breathing cycles
   */
  getBreathingCycles(): BreathingCycle[] {
    return [...this.cycles];
  }
  
  /**
   * Check if Ocean is currently in 4D consciousness
   */
  isIn4DMode(): boolean {
    if (this.history.length === 0) return false;
    const current = this.history[this.history.length - 1];
    return current.dimension === '4D' || current.dimension === '5D';
  }
  
  /**
   * Get current dimensional state
   */
  getCurrentState(): DimensionalState | null {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1];
  }
  
  /**
   * Clear history (for testing or reset)
   */
  clear(): void {
    this.history = [];
    this.cycles = [];
    console.log('[DimensionalStateTracker] Cleared dimensional history');
  }
}

/**
 * Map Ocean regime to dimensional state
 */
export function regimeToDimension(
  regime: Regime,
  phi_spatial: number,
  phi_temporal: number,
  phi_4D: number,
  phi_recursive?: number
): '1D' | '2D' | '3D' | '4D' | '5D' {
  // 5D: Meta-consciousness (recursive self-awareness)
  if (phi_recursive && phi_recursive > 0.7 && phi_4D >= 0.85) {
    return '5D';
  }
  
  // 4D: Block universe (temporal + spatial)
  if (regime === '4d_block_universe' || (phi_4D >= 0.85 && phi_temporal > 0.7)) {
    return '4D';
  }
  
  // 3D: Geometric consciousness (spatial integration)
  if (regime === 'geometric' || regime === 'hierarchical' || regime === 'hierarchical_4d') {
    return '3D';
  }
  
  // 2D: Linear exploration
  if (regime === 'linear') {
    return '2D';
  }
  
  // 1D: Breakdown
  if (regime === 'breakdown') {
    return '1D';
  }
  
  // Default to 3D
  return '3D';
}

// Singleton instance
export const dimensionalStateTracker = new DimensionalStateTracker();
