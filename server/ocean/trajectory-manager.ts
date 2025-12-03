/**
 * Trajectory Lifecycle Manager
 * 
 * Proper management of temporal trajectories with cleanup.
 * Implements recommendations from optnPR Part 3.1.
 * 
 * PERSISTENCE: Trajectories persisted to PostgreSQL for cross-session 4D navigation
 */

import { temporalGeometry } from '../temporal-geometry';
import { oceanPersistence } from './ocean-persistence';

export interface TrajectoryOutcome {
  success: boolean;
  finalPhi: number;
  finalKappa: number;
  totalWaypoints: number;
  duration: number;
  nearMissCount: number;
  resonantCount: number;
  finalResult: 'match' | 'exhausted' | 'stopped' | 'error';
}

export interface ActiveTrajectory {
  trajectoryId: string;
  address: string;
  startTime: number;
  waypointCount: number;
  lastPhi: number;
  lastKappa: number;
}

export class TrajectoryManager {
  private activeTrajectories = new Map<string, ActiveTrajectory>();
  private completedCount = 0;
  private archivedCount = 0;

  startTrajectory(address: string): string {
    if (this.activeTrajectories.has(address)) {
      console.warn(`[TrajectoryManager] Trajectory already active for ${address.slice(0, 12)}...`);
      return this.activeTrajectories.get(address)!.trajectoryId;
    }

    const trajectoryId = temporalGeometry.startTrajectory(address);
    
    this.activeTrajectories.set(address, {
      trajectoryId,
      address,
      startTime: Date.now(),
      waypointCount: 0,
      lastPhi: 0,
      lastKappa: 0,
    });

    // Persist to PostgreSQL
    oceanPersistence.startTrajectory(trajectoryId, address).catch(err => {
      console.error('[TrajectoryManager] PostgreSQL persist failed:', err);
    });

    console.log(`[TrajectoryManager] Started trajectory ${trajectoryId} for ${address.slice(0, 12)}...`);
    return trajectoryId;
  }

  recordWaypoint(
    address: string,
    phi: number,
    kappa: number,
    regime: 'linear' | 'geometric' | 'breakdown',
    basinCoords: number[],
    event: string,
    details: string
  ): void {
    const trajectory = this.activeTrajectories.get(address);
    if (!trajectory) {
      console.warn(`[TrajectoryManager] No active trajectory for ${address.slice(0, 12)}...`);
      return;
    }

    temporalGeometry.recordWaypoint(
      trajectory.trajectoryId,
      phi,
      kappa,
      regime,
      basinCoords,
      event,
      details
    );

    trajectory.waypointCount++;
    trajectory.lastPhi = phi;
    trajectory.lastKappa = kappa;

    // Persist waypoint to PostgreSQL
    oceanPersistence.recordWaypoint(trajectory.trajectoryId, {
      phi,
      kappa,
      regime,
      basinCoords,
      event,
      details,
    }).catch(err => {
      console.error('[TrajectoryManager] PostgreSQL waypoint persist failed:', err);
    });
  }

  completeTrajectory(address: string, outcome: TrajectoryOutcome): void {
    const trajectory = this.activeTrajectories.get(address);
    if (!trajectory) {
      console.warn(`[TrajectoryManager] No active trajectory for ${address.slice(0, 12)}...`);
      return;
    }

    temporalGeometry.recordWaypoint(
      trajectory.trajectoryId,
      outcome.finalPhi,
      outcome.finalKappa,
      'linear',
      [],
      'trajectory_complete',
      JSON.stringify({
        success: outcome.success,
        duration: `${outcome.duration.toFixed(1)}s`,
        waypoints: outcome.totalWaypoints,
        nearMisses: outcome.nearMissCount,
        resonant: outcome.resonantCount,
        finalResult: outcome.finalResult,
      })
    );

    temporalGeometry.completeTrajectory(trajectory.trajectoryId);
    this.activeTrajectories.delete(address);
    this.completedCount++;

    // Persist completion to PostgreSQL
    oceanPersistence.completeTrajectory(trajectory.trajectoryId, outcome.finalResult, {
      nearMissCount: outcome.nearMissCount,
      resonantCount: outcome.resonantCount,
    }).catch(err => {
      console.error('[TrajectoryManager] PostgreSQL completion persist failed:', err);
    });

    console.log(`[TrajectoryManager] Completed trajectory ${trajectory.trajectoryId}`);
    console.log(`[TrajectoryManager]   Duration: ${outcome.duration.toFixed(1)}s, Waypoints: ${outcome.totalWaypoints}`);
    console.log(`[TrajectoryManager]   Result: ${outcome.finalResult}, Near-misses: ${outcome.nearMissCount}`);
  }

  getActiveTrajectory(address: string): ActiveTrajectory | undefined {
    return this.activeTrajectories.get(address);
  }

  hasActiveTrajectory(address: string): boolean {
    return this.activeTrajectories.has(address);
  }

  getActiveCount(): number {
    return this.activeTrajectories.size;
  }

  getCompletedCount(): number {
    return this.completedCount;
  }

  getArchivedCount(): number {
    return this.archivedCount;
  }

  getStatistics(): {
    active: number;
    completed: number;
    archived: number;
    activeDetails: Array<{
      address: string;
      trajectoryId: string;
      duration: number;
      waypoints: number;
      lastPhi: number;
      lastKappa: number;
    }>;
  } {
    const activeDetails = Array.from(this.activeTrajectories.values()).map(t => ({
      address: t.address.slice(0, 12) + '...',
      trajectoryId: t.trajectoryId,
      duration: (Date.now() - t.startTime) / 1000,
      waypoints: t.waypointCount,
      lastPhi: t.lastPhi,
      lastKappa: t.lastKappa,
    }));

    return {
      active: this.activeTrajectories.size,
      completed: this.completedCount,
      archived: this.archivedCount,
      activeDetails,
    };
  }

  cleanupAll(): void {
    console.log(`[TrajectoryManager] Cleaning up ${this.activeTrajectories.size} active trajectories`);

    const entries = Array.from(this.activeTrajectories.entries());
    for (const [address, trajectory] of entries) {
      try {
        temporalGeometry.recordWaypoint(
          trajectory.trajectoryId,
          trajectory.lastPhi,
          trajectory.lastKappa,
          'linear',
          [],
          'cleanup_forced',
          'Trajectory cleaned up due to manager shutdown'
        );

        temporalGeometry.completeTrajectory(trajectory.trajectoryId);
        this.archivedCount++;
      } catch (error) {
        console.error(`[TrajectoryManager] Failed to cleanup trajectory for ${address}:`, error);
      }
    }

    this.activeTrajectories.clear();
    console.log('[TrajectoryManager] Cleanup complete');
  }

  abandonTrajectory(address: string, reason: string): void {
    const trajectory = this.activeTrajectories.get(address);
    if (!trajectory) {
      return;
    }

    try {
      temporalGeometry.recordWaypoint(
        trajectory.trajectoryId,
        trajectory.lastPhi,
        trajectory.lastKappa,
        'breakdown',
        [],
        'trajectory_abandoned',
        reason
      );

      temporalGeometry.completeTrajectory(trajectory.trajectoryId);
      this.archivedCount++;
    } catch (error) {
      console.error(`[TrajectoryManager] Failed to abandon trajectory:`, error);
    }

    this.activeTrajectories.delete(address);
    console.log(`[TrajectoryManager] Abandoned trajectory for ${address.slice(0, 12)}...: ${reason}`);
  }
}

export const trajectoryManager = new TrajectoryManager();
