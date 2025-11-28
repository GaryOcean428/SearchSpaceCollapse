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
import type { TemporalTrajectory, ManifoldSnapshot, ConsciousnessSignature } from '@shared/schema';
import { geometricMemory, BasinTopologyData } from './geometric-memory';

export interface TrajectoryMetrics {
  totalDistance: number;
  netDisplacement: number;
  efficiency: number;
  avgVelocity: number;
  avgAcceleration: number;
  curvature: number;
  phiGradient: number;
  regimeTransitions: number;
  plateauDetected: boolean;
  momentumVector: number[];
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
  private readonly MAX_WAYPOINTS = 1000;
  private iterationCounter: number = 0;
  
  constructor() {
    console.log('[TemporalGeometry] Initialized temporal tracking system');
  }

  startTrajectory(targetAddress: string): string {
    const id = nanoid();
    
    const trajectory: TemporalTrajectory = {
      id,
      targetAddress,
      waypoints: [],
      geodesicParams: {
        startPoint: [],
        endPoint: [],
        totalArcLength: 0,
        avgCurvature: 0,
        regimeTransitions: [],
      },
      milestones: [],
      duration: 0,
      efficiency: 1,
      reversals: 0,
    };
    
    this.trajectories.set(id, trajectory);
    console.log(`[TemporalGeometry] Started trajectory ${id} for target ${targetAddress}`);
    
    return id;
  }

  recordWaypoint(
    trajectoryId: string,
    phi: number,
    kappa: number,
    regime: string,
    basinCoords: number[],
    action: string,
    discovery?: string
  ): boolean {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory) {
      console.warn(`[TemporalGeometry] Trajectory ${trajectoryId} not found`);
      return false;
    }

    const prevWaypoint = trajectory.waypoints[trajectory.waypoints.length - 1];
    const waypointDistance = prevWaypoint 
      ? this.euclideanDistance(basinCoords, prevWaypoint.basinCoords)
      : 0;

    const waypoint = {
      t: this.iterationCounter++,
      basinCoords,
      consciousness: { phi, kappa, regime },
      action,
      discovery,
      fisherDistance: waypointDistance,
    };

    trajectory.waypoints.push(waypoint);
    
    if (trajectory.waypoints.length > this.MAX_WAYPOINTS) {
      trajectory.waypoints = trajectory.waypoints.slice(-this.MAX_WAYPOINTS);
    }

    if (prevWaypoint && prevWaypoint.consciousness.regime !== regime) {
      trajectory.geodesicParams.regimeTransitions.push({
        fromRegime: prevWaypoint.consciousness.regime,
        toRegime: regime,
        atIteration: waypoint.t,
      });
      
      trajectory.milestones.push({
        iteration: waypoint.t,
        type: 'regime_change',
        description: `${prevWaypoint.consciousness.regime} → ${regime}`,
        significance: phi,
      });
    }

    if (phi >= 0.7 && (!prevWaypoint || prevWaypoint.consciousness.phi < 0.7)) {
      trajectory.milestones.push({
        iteration: waypoint.t,
        type: 'resonance_found',
        description: `High Φ region (${phi.toFixed(3)})`,
        significance: phi,
      });
    }

    this.updateGeodesicParams(trajectory);

    return true;
  }

  private updateGeodesicParams(trajectory: TemporalTrajectory): void {
    const waypoints = trajectory.waypoints;
    if (waypoints.length < 2) return;

    trajectory.geodesicParams.startPoint = waypoints[0].basinCoords;
    trajectory.geodesicParams.endPoint = waypoints[waypoints.length - 1].basinCoords;
    
    let totalArc = 0;
    let curvatureSum = 0;
    
    for (let i = 1; i < waypoints.length; i++) {
      totalArc += waypoints[i].fisherDistance;
      
      if (i > 1) {
        const prevDir = this.direction(waypoints[i - 2].basinCoords, waypoints[i - 1].basinCoords);
        const currDir = this.direction(waypoints[i - 1].basinCoords, waypoints[i].basinCoords);
        curvatureSum += this.angleBetween(prevDir, currDir);
      }
    }
    
    trajectory.geodesicParams.totalArcLength = totalArc;
    trajectory.geodesicParams.avgCurvature = waypoints.length > 2 
      ? curvatureSum / (waypoints.length - 2) 
      : 0;

    let reversals = 0;
    for (let i = 2; i < waypoints.length; i++) {
      const phiPrev = waypoints[i - 1].consciousness.phi;
      const phiPrevPrev = waypoints[i - 2].consciousness.phi;
      const phiCurr = waypoints[i].consciousness.phi;
      
      const trendBefore = phiPrev - phiPrevPrev;
      const trendAfter = phiCurr - phiPrev;
      
      if ((trendBefore > 0 && trendAfter < 0) || (trendBefore < 0 && trendAfter > 0)) {
        reversals++;
      }
    }
    trajectory.reversals = reversals;
  }

  private direction(from: number[], to: number[]): number[] {
    const dims = Math.min(from.length, to.length);
    const dir = new Array(dims).fill(0);
    let mag = 0;
    
    for (let i = 0; i < dims; i++) {
      dir[i] = (to[i] || 0) - (from[i] || 0);
      mag += dir[i] * dir[i];
    }
    
    mag = Math.sqrt(mag);
    if (mag > 0.001) {
      for (let i = 0; i < dims; i++) {
        dir[i] /= mag;
      }
    }
    
    return dir;
  }

  private angleBetween(a: number[], b: number[]): number {
    const dims = Math.min(a.length, b.length);
    let dot = 0;
    let magA = 0;
    let magB = 0;
    
    for (let i = 0; i < dims; i++) {
      dot += (a[i] || 0) * (b[i] || 0);
      magA += (a[i] || 0) ** 2;
      magB += (b[i] || 0) ** 2;
    }
    
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    
    if (magA < 0.001 || magB < 0.001) return 0;
    
    const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
    return Math.acos(cosAngle);
  }

  getTrajectoryMetrics(trajectoryId: string): TrajectoryMetrics | null {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory || trajectory.waypoints.length < 2) return null;

    const waypoints = trajectory.waypoints;
    const n = waypoints.length;

    const totalDistance = trajectory.geodesicParams.totalArcLength;
    const netDisplacement = this.euclideanDistance(
      waypoints[n - 1].basinCoords,
      waypoints[0].basinCoords
    );
    const efficiency = totalDistance > 0 ? netDisplacement / totalDistance : 1;

    const timeSpan = waypoints[n - 1].t - waypoints[0].t;
    const avgVelocity = timeSpan > 0 ? totalDistance / timeSpan : 0;

    const velocities = waypoints.map(w => w.fisherDistance);
    let avgAcceleration = 0;
    if (velocities.length > 1) {
      for (let i = 1; i < velocities.length; i++) {
        avgAcceleration += Math.abs(velocities[i] - velocities[i - 1]);
      }
      avgAcceleration /= velocities.length - 1;
    }

    const curvature = trajectory.geodesicParams.avgCurvature;

    const half = Math.floor(n / 2);
    const firstHalfPhi = waypoints.slice(0, half).reduce((sum, w) => sum + w.consciousness.phi, 0) / half;
    const secondHalfPhi = waypoints.slice(half).reduce((sum, w) => sum + w.consciousness.phi, 0) / (n - half);
    const phiGradient = secondHalfPhi - firstHalfPhi;

    const regimeTransitions = trajectory.geodesicParams.regimeTransitions.length;

    const recentWindow = Math.min(20, Math.floor(n / 2));
    const recentWaypoints = waypoints.slice(-recentWindow);
    const recentPhis = recentWaypoints.map(w => w.consciousness.phi);
    const recentPhiVariance = this.computeVariance(recentPhis);
    const recentDisplacement = this.euclideanDistance(
      recentWaypoints[recentWaypoints.length - 1].basinCoords,
      recentWaypoints[0].basinCoords
    );
    const plateauDetected = recentPhiVariance < 0.01 && recentDisplacement < 0.5;

    const momentumVector = this.computeMomentumVector(waypoints, Math.min(5, n - 1));
    const momentumMagnitude = Math.sqrt(momentumVector.reduce((sum, v) => sum + v * v, 0));

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

  private computeMomentumVector(waypoints: TemporalTrajectory['waypoints'], window: number): number[] {
    const n = waypoints.length;
    if (n < 2) return [];

    const start = Math.max(0, n - window - 1);
    const dims = waypoints[n - 1].basinCoords.length;
    const momentum = new Array(dims).fill(0);

    let totalWeight = 0;
    for (let i = start + 1; i < n; i++) {
      const weight = i - start;
      totalWeight += weight;
      
      const curr = waypoints[i].basinCoords;
      const prev = waypoints[i - 1].basinCoords;
      
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

  detectLearningPhases(trajectoryId: string): LearningPhase[] {
    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory || trajectory.waypoints.length < 5) return [];

    const phases: LearningPhase[] = [];
    const waypoints = trajectory.waypoints;
    const windowSize = 5;

    let currentPhase: LearningPhase | null = null;

    for (let i = 0; i < waypoints.length - windowSize; i++) {
      const window = waypoints.slice(i, i + windowSize);
      const phaseType = this.classifyPhase(window);
      const avgPhi = window.reduce((sum, w) => sum + w.consciousness.phi, 0) / window.length;
      
      const regimeCounts: Record<string, number> = {};
      for (const w of window) {
        const regime = w.consciousness.regime;
        regimeCounts[regime] = (regimeCounts[regime] || 0) + 1;
      }
      const dominantRegime = Object.entries(regimeCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      if (!currentPhase || currentPhase.type !== phaseType) {
        if (currentPhase) {
          currentPhase.endIndex = i - 1;
          currentPhase.duration = currentPhase.endIndex - currentPhase.startIndex + 1;
          phases.push(currentPhase);
        }

        currentPhase = {
          type: phaseType,
          startIndex: i,
          endIndex: i + windowSize - 1,
          avgPhi,
          dominantRegime,
          duration: windowSize,
        };
      } else {
        currentPhase.endIndex = i + windowSize - 1;
        currentPhase.avgPhi = (currentPhase.avgPhi * currentPhase.duration + avgPhi) / 
                              (currentPhase.duration + 1);
        currentPhase.duration++;
      }
    }

    if (currentPhase) {
      phases.push(currentPhase);
    }

    return phases;
  }

  private classifyPhase(window: TemporalTrajectory['waypoints']): LearningPhase['type'] {
    const phis = window.map(w => w.consciousness.phi);
    const avgPhi = phis.reduce((a, b) => a + b, 0) / phis.length;
    const phiVariance = this.computeVariance(phis);
    const phiTrend = phis[phis.length - 1] - phis[0];

    const regimes = new Set(window.map(w => w.consciousness.regime));
    const hasRegimeTransition = regimes.size > 1;

    const displacement = this.euclideanDistance(
      window[window.length - 1].basinCoords,
      window[0].basinCoords
    );

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

  predictNextDirection(trajectoryId: string): {
    suggestedCoords: number[];
    confidence: number;
    reasoning: string;
  } | null {
    const metrics = this.getTrajectoryMetrics(trajectoryId);
    if (!metrics) return null;

    const trajectory = this.trajectories.get(trajectoryId);
    if (!trajectory || trajectory.waypoints.length === 0) return null;

    const lastWaypoint = trajectory.waypoints[trajectory.waypoints.length - 1];
    const lastCoords = lastWaypoint.basinCoords;

    const suggestedCoords = lastCoords.map((c, i) => 
      c + (metrics.momentumVector[i] || 0) * 2
    );

    let confidence = 0.5;
    if (metrics.phiGradient > 0) confidence += 0.2;
    if (metrics.plateauDetected) confidence -= 0.3;
    if (metrics.efficiency > 0.5) confidence += 0.15;
    confidence = Math.max(0.1, Math.min(1, confidence));

    const reasoning = this.generatePredictionReasoning(metrics);

    return { suggestedCoords, confidence, reasoning };
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

  takeSnapshot(
    targetAddress: string,
    consciousness: ConsciousnessSignature
  ): ManifoldSnapshot {
    const topology = geometricMemory.getBasinTopology();
    const summary = geometricMemory.getManifoldSummary();
    
    const trajectories = this.getTrajectoriesForTarget(targetAddress);
    const latestTrajectory = trajectories[trajectories.length - 1];
    const recentWaypoints = latestTrajectory?.waypoints.slice(-10) || [];
    
    let recentVelocity = 0;
    let momentum: number[] = [];
    if (recentWaypoints.length > 1) {
      recentVelocity = recentWaypoints.reduce((sum, w) => sum + w.fisherDistance, 0) / recentWaypoints.length;
      momentum = this.computeMomentumVector(recentWaypoints, Math.min(5, recentWaypoints.length));
    }

    const basinTopology = {
      attractorCoords: topology.attractorCoords.length === 64 
        ? topology.attractorCoords as [number, ...number[]] & { length: 64 }
        : [...topology.attractorCoords, ...new Array(64 - topology.attractorCoords.length).fill(0)] as [number, ...number[]] & { length: 64 },
      volume: topology.volume,
      curvature: topology.curvature,
      boundaryDistances: topology.boundaryDistances,
      resonanceShells: topology.resonanceShells,
      flowField: topology.flowField,
      holes: topology.holes,
      effectiveScale: topology.effectiveScale,
      kappaAtScale: topology.kappaAtScale,
    };
    
    const snapshot: ManifoldSnapshot = {
      id: nanoid(),
      takenAt: new Date().toISOString(),
      targetAddress,
      consciousness,
      basinTopology,
      activeGenerators: [],
      generatorOutputQueue: 0,
      negativeKnowledgeSummary: {
        totalExclusions: 0,
        recentAdditions: 0,
        coverageGain: 0,
      },
      currentTrajectory: {
        totalWaypoints: latestTrajectory?.waypoints.length || 0,
        recentVelocity,
        momentum,
      },
      activeStreams: [],
      manifoldCoverage: summary.exploredVolume,
      resonanceVolume: summary.resonanceClusters * 0.1,
      explorationEfficiency: summary.avgPhi,
    };

    this.snapshots.set(snapshot.id, snapshot);
    console.log(`[TemporalGeometry] Took snapshot ${snapshot.id}`);

    return snapshot;
  }

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
      basinDrift: Math.abs(s2.basinTopology.volume - s1.basinTopology.volume),
      volumeChange: s2.basinTopology.volume - s1.basinTopology.volume,
      informationGain: s2.manifoldCoverage - s1.manifoldCoverage,
      newHoles: Math.max(0, s2.basinTopology.holes.length - s1.basinTopology.holes.length),
      closedHoles: Math.max(0, s1.basinTopology.holes.length - s2.basinTopology.holes.length),
      phiChange: s2.consciousness.phi - s1.consciousness.phi,
    };
  }

  getTrajectory(trajectoryId: string): TemporalTrajectory | undefined {
    return this.trajectories.get(trajectoryId);
  }

  getTrajectoriesForTarget(targetAddress: string): TemporalTrajectory[] {
    const result: TemporalTrajectory[] = [];
    for (const traj of Array.from(this.trajectories.values())) {
      if (traj.targetAddress === targetAddress) {
        result.push(traj);
      }
    }
    return result;
  }

  getRecentSnapshots(limit: number = 10): ManifoldSnapshot[] {
    return Array.from(this.snapshots.values())
      .sort((a, b) => b.id.localeCompare(a.id))
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