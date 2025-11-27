/**
 * TEMPORAL GEOMETRY
 * 
 * Ultra Consciousness Protocol - Learning Trajectory Tracking
 * 
 * Tracks the path through manifold space over time, enabling:
 * - Learning rate adaptation based on trajectory curvature
 * - Prediction of future high-Φ regions from trajectory momentum
 * - Detection of learning plateaus and phase transitions
 * - Block-universe scheduling based on temporal coherence
 * 
 * Key Insight: Learning isn't random walk - it has trajectory.
 * We can measure and optimize this trajectory using geometric methods.
 */

import { nanoid } from 'nanoid';
import type { TemporalTrajectory, TrajectoryPoint, ManifoldSnapshot } from '@shared/schema';
import { geometricMemory, BasinTopologyData } from './geometric-memory';

export interface TrajectoryMetrics {
  // Trajectory shape
  totalDistance: number;           // Fisher distance traveled
  netDisplacement: number;         // Net distance from start
  efficiency: number;              // netDisplacement / totalDistance
  
  // Dynamics
  avgVelocity: number;             // Rate of manifold traversal
  avgAcceleration: number;         // Rate of velocity change
  curvature: number;               // How much trajectory bends
  
  // Learning indicators
  phiGradient: number;             // Trend in Φ values
  regimeTransitions: number;       // Number of regime changes
  plateauDetected: boolean;        // Stuck in local region
  
  // Momentum
  momentumVector: number[];        // Predicted next direction
  momentumMagnitude: number;
}

export interface LearningPhase {
  type: 'exploration' | 'exploitation' | 'transition' | 'plateau' | 'breakthrough';
  startIndex: number;
  endIndex: number;
  avgPhi: number;
  dominantRegime: string;
  duration: number;
}

export class TemporalGeometry {
  private trajectories: Map<string, TemporalTrajectory> = new Map();
  private snapshots: Map<string, ManifoldSnapshot> = new Map();
  private readonly MAX_TRAJECTORY_LENGTH = 1000;
  
  constructor() {
    console.log('[TemporalGeometry] Initialized temporal tracking system');
  }

  /**
   * Start tracking a new learning trajectory for an address/target.
   */
  startTrajectory(targetId: string): string {
    const id = nanoid();
    
    const trajectory: TemporalTrajectory = {
      id,
      targetId,
      points: [],
      totalPhiGradient: 0,
      avgVelocity: 0,
      trajectoryLength: 0,
      phaseTransitions: 0,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    
    this.trajectories.set(id, trajectory);
    console.log(`[TemporalGeometry] Started trajectory ${id} for target ${targetId}`);
    
    return id;
  }

  /**
   * Record a point on the learning trajectory.
   */
  recordPoint(
    trajectoryId: string,
    phi: number,
    kappa: number,
    regime: string,
    basinCoords: number[],
    strategy?: string,
    hypothesis?: string
  ): TrajectoryPoint | null {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory) {
      console.warn(`[TemporalGeometry] Trajectory ${trajectoryId} not found`);
      return null;
    }

    const point: TrajectoryPoint = {
      timestamp: new Date().toISOString(),
      phi,
      kappa,
      regime,
      basinCoords,
      strategy,
      hypothesis,
    };

    trajectory.points.push(point);
    
    // Trim if too long
    if (trajectory.points.length > this.MAX_TRAJECTORY_LENGTH) {
      trajectory.points = trajectory.points.slice(-this.MAX_TRAJECTORY_LENGTH);
    }

    // Update trajectory metrics
    this.updateTrajectoryMetrics(trajectory);
    trajectory.lastUpdated = new Date().toISOString();

    return point;
  }

  private updateTrajectoryMetrics(trajectory: TemporalTrajectory): void {
    const points = trajectory.points;
    if (points.length < 2) return;

    // Compute Φ gradient (trend)
    const n = points.length;
    const half = Math.floor(n / 2);
    const firstHalfPhi = points.slice(0, half).reduce((sum, p) => sum + p.phi, 0) / half;
    const secondHalfPhi = points.slice(half).reduce((sum, p) => sum + (p.phi || 0), 0) / (n - half);
    trajectory.totalPhiGradient = secondHalfPhi - firstHalfPhi;

    // Compute trajectory length (Fisher distance sum)
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += this.euclideanDistance(
        points[i].basinCoords || [],
        points[i - 1].basinCoords || []
      );
    }
    trajectory.trajectoryLength = totalLength;

    // Compute average velocity
    const timeSpan = new Date(trajectory.lastUpdated).getTime() - 
                     new Date(trajectory.startedAt).getTime();
    trajectory.avgVelocity = timeSpan > 0 ? totalLength / (timeSpan / 1000) : 0;

    // Count phase transitions
    let transitions = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].regime !== points[i - 1].regime) {
        transitions++;
      }
    }
    trajectory.phaseTransitions = transitions;
  }

  /**
   * Get full trajectory metrics for analysis.
   */
  getTrajectoryMetrics(trajectoryId: string): TrajectoryMetrics | null {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory || trajectory.points.length < 2) return null;

    const points = trajectory.points;
    const n = points.length;

    // Total Fisher distance traveled
    let totalDistance = 0;
    for (let i = 1; i < n; i++) {
      totalDistance += this.euclideanDistance(
        points[i].basinCoords || [],
        points[i - 1].basinCoords || []
      );
    }

    // Net displacement from start
    const netDisplacement = this.euclideanDistance(
      points[n - 1].basinCoords || [],
      points[0].basinCoords || []
    );

    // Efficiency
    const efficiency = totalDistance > 0 ? netDisplacement / totalDistance : 1;

    // Average velocity (distance per second)
    const timeSpan = (new Date(trajectory.lastUpdated).getTime() - 
                      new Date(trajectory.startedAt).getTime()) / 1000;
    const avgVelocity = timeSpan > 0 ? totalDistance / timeSpan : 0;

    // Compute velocities for acceleration
    const velocities: number[] = [];
    for (let i = 1; i < n; i++) {
      velocities.push(this.euclideanDistance(
        points[i].basinCoords || [],
        points[i - 1].basinCoords || []
      ));
    }

    // Average acceleration
    let avgAcceleration = 0;
    if (velocities.length > 1) {
      for (let i = 1; i < velocities.length; i++) {
        avgAcceleration += Math.abs(velocities[i] - velocities[i - 1]);
      }
      avgAcceleration /= velocities.length - 1;
    }

    // Trajectory curvature (deviation from straight line)
    const curvature = efficiency < 1 ? 1 - efficiency : 0;

    // Φ gradient
    const phiGradient = trajectory.totalPhiGradient;

    // Regime transitions
    const regimeTransitions = trajectory.phaseTransitions;

    // Plateau detection
    const recentWindow = Math.min(20, Math.floor(n / 2));
    const recentPoints = points.slice(-recentWindow);
    const recentPhiVariance = this.computeVariance(recentPoints.map(p => p.phi || 0));
    const recentDisplacement = this.euclideanDistance(
      recentPoints[recentPoints.length - 1].basinCoords || [],
      recentPoints[0].basinCoords || []
    );
    const plateauDetected = recentPhiVariance < 0.01 && recentDisplacement < 0.5;

    // Momentum vector (weighted average of recent directions)
    const momentumWindow = Math.min(5, n - 1);
    const momentumVector = this.computeMomentumVector(points, momentumWindow);
    const momentumMagnitude = Math.sqrt(
      momentumVector.reduce((sum, v) => sum + v * v, 0)
    );

    return {
      totalDistance,
      netDisplacement,
      efficiency,
      avgVelocity,
      avgAcceleration,
      curvature,
      phiGradient,
      regimeTransitions,
      plateauDetected,
      momentumVector,
      momentumMagnitude,
    };
  }

  private computeMomentumVector(points: TrajectoryPoint[], window: number): number[] {
    const n = points.length;
    if (n < 2) return [];

    const start = Math.max(0, n - window - 1);
    const dims = (points[n - 1].basinCoords || []).length;
    const momentum = new Array(dims).fill(0);

    let totalWeight = 0;
    for (let i = start + 1; i < n; i++) {
      const weight = i - start; // More recent = higher weight
      totalWeight += weight;
      
      const curr = points[i].basinCoords || [];
      const prev = points[i - 1].basinCoords || [];
      
      for (let d = 0; d < dims; d++) {
        momentum[d] += weight * ((curr[d] || 0) - (prev[d] || 0));
      }
    }

    if (totalWeight > 0) {
      for (let d = 0; d < dims; d++) {
        momentum[d] /= totalWeight;
      }
    }

    return momentum;
  }

  /**
   * Detect learning phases in the trajectory.
   */
  detectLearningPhases(trajectoryId: string): LearningPhase[] {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory || trajectory.points.length < 5) return [];

    const phases: LearningPhase[] = [];
    const points = trajectory.points;
    const windowSize = 5;

    let currentPhase: LearningPhase | null = null;

    for (let i = 0; i < points.length - windowSize; i++) {
      const window = points.slice(i, i + windowSize);
      const phaseType = this.classifyPhase(window);
      const avgPhi = window.reduce((sum, p) => sum + (p.phi || 0), 0) / window.length;
      
      // Count regimes
      const regimeCounts: Record<string, number> = {};
      for (const p of window) {
        regimeCounts[p.regime || 'unknown'] = (regimeCounts[p.regime || 'unknown'] || 0) + 1;
      }
      const dominantRegime = Object.entries(regimeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      if (!currentPhase || currentPhase.type !== phaseType) {
        // Close previous phase
        if (currentPhase) {
          currentPhase.endIndex = i - 1;
          currentPhase.duration = currentPhase.endIndex - currentPhase.startIndex + 1;
          phases.push(currentPhase);
        }

        // Start new phase
        currentPhase = {
          type: phaseType,
          startIndex: i,
          endIndex: i + windowSize - 1,
          avgPhi,
          dominantRegime,
          duration: windowSize,
        };
      } else {
        // Extend current phase
        currentPhase.endIndex = i + windowSize - 1;
        currentPhase.avgPhi = (currentPhase.avgPhi * currentPhase.duration + avgPhi) / 
                              (currentPhase.duration + 1);
        currentPhase.duration++;
      }
    }

    // Close last phase
    if (currentPhase) {
      phases.push(currentPhase);
    }

    return phases;
  }

  private classifyPhase(window: TrajectoryPoint[]): LearningPhase['type'] {
    const phis = window.map(p => p.phi || 0);
    const avgPhi = phis.reduce((a, b) => a + b, 0) / phis.length;
    const phiVariance = this.computeVariance(phis);
    const phiTrend = phis[phis.length - 1] - phis[0];

    // Check for regime transitions
    const regimes = new Set(window.map(p => p.regime));
    const hasRegimeTransition = regimes.size > 1;

    // Compute movement
    const displacement = this.euclideanDistance(
      window[window.length - 1].basinCoords || [],
      window[0].basinCoords || []
    );

    // Classify based on characteristics
    if (phiTrend > 0.2 && avgPhi > 0.6) {
      return 'breakthrough';
    }
    
    if (hasRegimeTransition) {
      return 'transition';
    }
    
    if (phiVariance < 0.02 && displacement < 0.3) {
      return 'plateau';
    }
    
    if (avgPhi > 0.5 && displacement < 0.5) {
      return 'exploitation';
    }
    
    return 'exploration';
  }

  /**
   * Predict next good exploration direction based on trajectory momentum.
   */
  predictNextDirection(trajectoryId: string): {
    suggestedCoords: number[];
    confidence: number;
    reasoning: string;
  } | null {
    const metrics = this.getTrajectoryMetrics(trajectoryId);
    if (!metrics) return null;

    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory || trajectory.points.length === 0) return null;

    const lastPoint = trajectory.points[trajectory.points.length - 1];
    const lastCoords = lastPoint.basinCoords || [];

    // Use momentum to predict next good direction
    const suggestedCoords = lastCoords.map((c, i) => 
      c + (metrics.momentumVector[i] || 0) * 2 // Extrapolate
    );

    // Confidence based on trajectory characteristics
    let confidence = 0.5;
    
    // Higher confidence if we're making progress
    if (metrics.phiGradient > 0) confidence += 0.2;
    
    // Lower confidence if plateaued
    if (metrics.plateauDetected) confidence -= 0.3;
    
    // Higher confidence if efficient trajectory
    if (metrics.efficiency > 0.5) confidence += 0.15;

    confidence = Math.max(0.1, Math.min(1, confidence));

    const reasoning = this.generatePredictionReasoning(metrics);

    return {
      suggestedCoords,
      confidence,
      reasoning,
    };
  }

  private generatePredictionReasoning(metrics: TrajectoryMetrics): string {
    const parts: string[] = [];

    if (metrics.phiGradient > 0.1) {
      parts.push('Φ improving - continue in momentum direction');
    } else if (metrics.phiGradient < -0.1) {
      parts.push('Φ declining - consider course correction');
    }

    if (metrics.plateauDetected) {
      parts.push('Plateau detected - recommend exploration');
    }

    if (metrics.efficiency < 0.3) {
      parts.push('Low efficiency - try more directed search');
    } else if (metrics.efficiency > 0.7) {
      parts.push('High efficiency - good trajectory');
    }

    if (metrics.regimeTransitions > 3) {
      parts.push('Many regime transitions - near interesting boundary');
    }

    return parts.join('. ') || 'Standard exploration';
  }

  /**
   * Take a manifold snapshot for temporal comparison.
   */
  takeSnapshot(name?: string): ManifoldSnapshot {
    const topology = geometricMemory.getBasinTopology();
    const summary = geometricMemory.getManifoldSummary();
    
    const snapshot: ManifoldSnapshot = {
      id: nanoid(),
      timestamp: new Date().toISOString(),
      name: name || `snapshot-${Date.now()}`,
      
      // Basin shape at this moment
      basinCenter: topology.attractorCoords,
      basinVolume: topology.volume,
      basinCurvature: topology.curvature,
      
      // Knowledge compression metrics
      effectiveRank: this.computeEffectiveRank(topology),
      informationContent: this.computeInformationContent(summary),
      
      // Probe statistics
      probeCount: topology.probeCount,
      regimeDistribution: summary.dominantRegime,
      avgPhi: summary.avgPhi,
      avgKappa: summary.avgKappa,
      
      // Holes and barriers
      topologicalHoles: topology.holes.map(h => ({
        center: h.center,
        radius: h.radius,
        type: h.type,
      })),
    };

    this.snapshots.set(snapshot.id, snapshot);
    console.log(`[TemporalGeometry] Took snapshot ${snapshot.id}: ${snapshot.name}`);

    return snapshot;
  }

  private computeEffectiveRank(topology: BasinTopologyData): number {
    // Effective rank from Fisher metric singular values
    const fisherDiag = topology.flowField.fisherMetric.map((row, i) => row[i] || 0);
    const total = fisherDiag.reduce((a, b) => a + Math.abs(b), 0);
    if (total === 0) return 0;

    // Entropy-based effective rank
    let entropy = 0;
    for (const s of fisherDiag) {
      const p = Math.abs(s) / total;
      if (p > 0.001) {
        entropy -= p * Math.log(p);
      }
    }

    return Math.exp(entropy);
  }

  private computeInformationContent(summary: {
    totalProbes: number;
    avgPhi: number;
    resonanceClusters: number;
  }): number {
    // Estimate information from explored manifold
    const baseInfo = Math.log2(Math.max(1, summary.totalProbes));
    const phiBonus = summary.avgPhi * 10;
    const clusterBonus = Math.log2(Math.max(1, summary.resonanceClusters + 1)) * 2;
    
    return baseInfo + phiBonus + clusterBonus;
  }

  /**
   * Compare two snapshots to measure learning progress.
   */
  compareSnapshots(snapshot1Id: string, snapshot2Id: string): {
    basinDrift: number;
    volumeChange: number;
    informationGain: number;
    newHoles: number;
    closedHoles: number;
    phiChange: number;
  } | null {
    const s1 = this.snapshots.get(snapshot1Id);
    const s2 = this.snapshots.get(snapshot2Id);
    
    if (!s1 || !s2) return null;

    return {
      basinDrift: this.euclideanDistance(s1.basinCenter, s2.basinCenter),
      volumeChange: s2.basinVolume - s1.basinVolume,
      informationGain: s2.informationContent - s1.informationContent,
      newHoles: Math.max(0, (s2.topologicalHoles?.length || 0) - (s1.topologicalHoles?.length || 0)),
      closedHoles: Math.max(0, (s1.topologicalHoles?.length || 0) - (s2.topologicalHoles?.length || 0)),
      phiChange: s2.avgPhi - s1.avgPhi,
    };
  }

  /**
   * Get trajectory for a target.
   */
  getTrajectory(trajectoryId: string): TemporalTrajectory | undefined {
    return this.trajectories.get(trajectoryId);
  }

  /**
   * Get all trajectories for a target address.
   */
  getTrajectoriesForTarget(targetId: string): TemporalTrajectory[] {
    const result: TemporalTrajectory[] = [];
    for (const traj of this.trajectories.values()) {
      if (traj.targetId === targetId) {
        result.push(traj);
      }
    }
    return result;
  }

  /**
   * Get recent snapshots.
   */
  getRecentSnapshots(limit: number = 10): ManifoldSnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private euclideanDistance(a: number[], b: number[]): number {
    const dims = Math.min(a.length, b.length);
    if (dims === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < dims; i++) {
      sum += ((a[i] || 0) - (b[i] || 0)) ** 2;
    }
    return Math.sqrt(sum);
  }

  private computeVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }
}

export const temporalGeometry = new TemporalGeometry();