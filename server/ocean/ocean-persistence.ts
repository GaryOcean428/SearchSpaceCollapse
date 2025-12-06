/**
 * OCEAN PERSISTENCE SERVICE
 * 
 * PostgreSQL-backed persistence for Ocean's 4D navigation state.
 * Enables cross-session geometric memory and 68D manifold navigation.
 * 
 * Design Principles:
 * - All geometric data persists for non-linear 4D jumps
 * - Efficient batch operations for probe insertion (50+ per cycle)
 * - φ/κ indexed queries for fast geometric lookups
 * - Graceful fallback to in-memory if DB unavailable
 */

import { db } from '../db';
import { eq, and, gte, lte, desc, asc, sql, inArray } from 'drizzle-orm';
import {
  manifoldProbes,
  resonancePoints,
  regimeBoundaries,
  geodesicPaths,
  tpsLandmarks,
  tpsGeodesicPaths,
  oceanTrajectories,
  oceanWaypoints,
  oceanQuantumState,
  oceanExcludedRegions,
  testedPhrasesIndex,
  type ManifoldProbe,
  type InsertManifoldProbe,
  type ResonancePointRecord,
  type RegimeBoundaryRecord,
  type TpsLandmarkRecord,
  type OceanTrajectoryRecord,
  type OceanWaypointRecord,
  type OceanQuantumStateRecord,
  type OceanExcludedRegionRecord,
} from '@shared/schema';
import * as crypto from 'crypto';

export interface PhiKappaRange {
  phiMin?: number;
  phiMax?: number;
  kappaMin?: number;
  kappaMax?: number;
}

export interface ProbeInsertData {
  id: string;
  input: string;
  coordinates: number[];
  phi: number;
  kappa: number;
  regime: string;
  ricciScalar?: number;
  fisherTrace?: number;
  source?: string;
}

export interface TrajectoryWaypoint {
  phi: number;
  kappa: number;
  regime: string;
  basinCoords?: number[];
  event?: string;
  details?: string;
}

/**
 * Ocean Persistence Service
 * 
 * Central service for all Ocean 4D navigation persistence
 */
export class OceanPersistence {
  private isAvailable: boolean;
  
  // Batching system for markTested to prevent connection pool exhaustion
  private testedPhraseBuffer: Set<string> = new Set(); // Use Set for deduplication
  private readonly BATCH_SIZE = 100;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000; // Flush every 5 seconds if not full
  private isFlushingTested = false;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 10;
  
  constructor() {
    this.isAvailable = db !== null;
    if (this.isAvailable) {
      console.log('[OceanPersistence] PostgreSQL persistence enabled');
    } else {
      console.log('[OceanPersistence] Database not available - using in-memory fallback');
    }
    
    // Start periodic flush timer
    this.startFlushTimer();
    
    // Register shutdown hook to flush remaining data
    process.on('beforeExit', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  /**
   * Graceful shutdown - flush all pending data
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    if (this.testedPhraseBuffer.size > 0) {
      console.log(`[OceanPersistence] Shutdown: flushing ${this.testedPhraseBuffer.size} pending phrases...`);
      await this.flushTestedPhrases();
    }
  }
  
  /**
   * Start the periodic flush timer for tested phrases
   */
  private startFlushTimer(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => {
      this.flushTestedPhrases().catch(err => {
        console.error('[OceanPersistence] Periodic flush error:', err);
      });
    }, this.FLUSH_INTERVAL_MS);
  }
  
  /**
   * Flush all buffered tested phrases to the database with retry logic
   */
  async flushTestedPhrases(): Promise<number> {
    if (this.testedPhraseBuffer.size === 0 || this.isFlushingTested) return 0;
    
    // Check for persistent failures - back off if too many
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      console.warn('[OceanPersistence] Too many consecutive failures, waiting for next cycle');
      return 0;
    }
    
    this.isFlushingTested = true;
    const toFlush = Array.from(this.testedPhraseBuffer);
    this.testedPhraseBuffer.clear();
    
    let retries = 3;
    let delay = 100;
    const maxDelay = 2000; // Cap at 2 seconds
    
    while (retries > 0) {
      try {
        const count = await this.batchMarkTestedDirect(toFlush);
        this.isFlushingTested = false;
        this.consecutiveFailures = 0; // Reset on success
        return count;
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          this.consecutiveFailures++;
          console.error(`[OceanPersistence] Failed to flush ${toFlush.length} phrases after 3 retries (consecutive failures: ${this.consecutiveFailures}):`, error.message);
          // Re-add failed phrases to buffer for next attempt
          toFlush.forEach(p => this.testedPhraseBuffer.add(p));
          this.isFlushingTested = false;
          return 0;
        }
        console.log(`[OceanPersistence] Flush retry in ${delay}ms (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelay); // Exponential backoff with cap
      }
    }
    
    this.isFlushingTested = false;
    return 0;
  }
  
  /**
   * Internal direct batch write (no buffering)
   */
  private async batchMarkTestedDirect(phrases: string[]): Promise<number> {
    if (!db || phrases.length === 0) return 0;
    
    // Deduplicate and hash (using Array.from for ES5 compat)
    const uniquePhrases = Array.from(new Set(phrases));
    const uniqueHashes = uniquePhrases.map(p => ({
      phraseHash: crypto.createHash('sha256').update(p).digest('hex'),
    }));
    
    await db.insert(testedPhrasesIndex)
      .values(uniqueHashes)
      .onConflictDoNothing();
    
    return uniqueHashes.length;
  }
  
  /**
   * Check if persistence is available
   */
  isPersistenceAvailable(): boolean {
    return this.isAvailable;
  }
  
  // ============================================================================
  // MANIFOLD PROBES - Geometric memory points on the QIG manifold
  // ============================================================================
  
  /**
   * Insert a batch of manifold probes efficiently
   * Used during investigation cycles (50+ probes per cycle)
   */
  async insertProbes(probes: ProbeInsertData[]): Promise<number> {
    if (!db || probes.length === 0) return 0;
    
    try {
      const records: InsertManifoldProbe[] = probes.map(p => ({
        id: p.id,
        input: p.input,
        coordinates: p.coordinates,
        phi: p.phi,
        kappa: p.kappa,
        regime: p.regime,
        ricciScalar: p.ricciScalar ?? 0,
        fisherTrace: p.fisherTrace ?? 0,
        source: p.source,
      }));
      
      await db.insert(manifoldProbes)
        .values(records)
        .onConflictDoNothing();
      
      return probes.length;
    } catch (error) {
      console.error('[OceanPersistence] Failed to insert probes:', error);
      return 0;
    }
  }
  
  /**
   * Query probes by φ/κ range
   * Optimized for geometric navigation
   */
  async queryProbesByPhiKappa(range: PhiKappaRange, limit: number = 100): Promise<ManifoldProbe[]> {
    if (!db) return [];
    
    try {
      const conditions = [];
      if (range.phiMin !== undefined) conditions.push(gte(manifoldProbes.phi, range.phiMin));
      if (range.phiMax !== undefined) conditions.push(lte(manifoldProbes.phi, range.phiMax));
      if (range.kappaMin !== undefined) conditions.push(gte(manifoldProbes.kappa, range.kappaMin));
      if (range.kappaMax !== undefined) conditions.push(lte(manifoldProbes.kappa, range.kappaMax));
      
      const query = conditions.length > 0
        ? db.select().from(manifoldProbes).where(and(...conditions))
        : db.select().from(manifoldProbes);
      
      return await query.orderBy(desc(manifoldProbes.phi)).limit(limit);
    } catch (error) {
      console.error('[OceanPersistence] Failed to query probes:', error);
      return [];
    }
  }
  
  /**
   * Query probes by regime
   */
  async queryProbesByRegime(regime: string, limit: number = 100): Promise<ManifoldProbe[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(manifoldProbes)
        .where(eq(manifoldProbes.regime, regime))
        .orderBy(desc(manifoldProbes.phi))
        .limit(limit);
    } catch (error) {
      console.error('[OceanPersistence] Failed to query probes by regime:', error);
      return [];
    }
  }
  
  /**
   * Get high-Φ probes (resonant points)
   */
  async getHighPhiProbes(minPhi: number = 0.75, limit: number = 100): Promise<ManifoldProbe[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(manifoldProbes)
        .where(gte(manifoldProbes.phi, minPhi))
        .orderBy(desc(manifoldProbes.phi))
        .limit(limit);
    } catch (error) {
      console.error('[OceanPersistence] Failed to get high-Φ probes:', error);
      return [];
    }
  }
  
  /**
   * Get total probe count
   */
  async getProbeCount(): Promise<number> {
    if (!db) return 0;
    
    try {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(manifoldProbes);
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      console.error('[OceanPersistence] Failed to get probe count:', error);
      return 0;
    }
  }
  
  /**
   * Get probes by IDs
   */
  async getProbesByIds(ids: string[]): Promise<ManifoldProbe[]> {
    if (!db || ids.length === 0) return [];
    
    try {
      return await db.select()
        .from(manifoldProbes)
        .where(inArray(manifoldProbes.id, ids));
    } catch (error) {
      console.error('[OceanPersistence] Failed to get probes by IDs:', error);
      return [];
    }
  }
  
  // ============================================================================
  // RESONANCE POINTS - High-Φ clusters on the manifold
  // ============================================================================
  
  /**
   * Insert a resonance point
   */
  async insertResonancePoint(point: {
    id: string;
    probeId: string;
    phi: number;
    kappa: number;
    nearbyProbes: string[];
    clusterStrength: number;
  }): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.insert(resonancePoints)
        .values({
          id: point.id,
          probeId: point.probeId,
          phi: point.phi,
          kappa: point.kappa,
          nearbyProbes: point.nearbyProbes,
          clusterStrength: point.clusterStrength,
        })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to insert resonance point:', error);
      return false;
    }
  }
  
  /**
   * Get all resonance points
   */
  async getResonancePoints(limit: number = 100): Promise<ResonancePointRecord[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(resonancePoints)
        .orderBy(desc(resonancePoints.clusterStrength))
        .limit(limit);
    } catch (error) {
      console.error('[OceanPersistence] Failed to get resonance points:', error);
      return [];
    }
  }
  
  // ============================================================================
  // REGIME BOUNDARIES - Transitions between regimes
  // ============================================================================
  
  /**
   * Insert a regime boundary
   */
  async insertRegimeBoundary(boundary: {
    id: string;
    fromRegime: string;
    toRegime: string;
    probeIdFrom: string;
    probeIdTo: string;
    fisherDistance: number;
    midpointPhi: number;
  }): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.insert(regimeBoundaries)
        .values(boundary)
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to insert regime boundary:', error);
      return false;
    }
  }
  
  /**
   * Get regime boundaries
   */
  async getRegimeBoundaries(fromRegime?: string, toRegime?: string): Promise<RegimeBoundaryRecord[]> {
    if (!db) return [];
    
    try {
      const conditions = [];
      if (fromRegime) conditions.push(eq(regimeBoundaries.fromRegime, fromRegime));
      if (toRegime) conditions.push(eq(regimeBoundaries.toRegime, toRegime));
      
      const query = conditions.length > 0
        ? db.select().from(regimeBoundaries).where(and(...conditions))
        : db.select().from(regimeBoundaries);
      
      return await query.orderBy(desc(regimeBoundaries.midpointPhi));
    } catch (error) {
      console.error('[OceanPersistence] Failed to get regime boundaries:', error);
      return [];
    }
  }
  
  // ============================================================================
  // GEODESIC PATHS - Fisher-optimal paths between probes
  // ============================================================================
  
  /**
   * Insert a geodesic path
   */
  async insertGeodesicPath(path: {
    id: string;
    fromProbeId: string;
    toProbeId: string;
    distance: number;
    waypoints: string[];
    avgPhi: number;
  }): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.insert(geodesicPaths)
        .values(path)
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to insert geodesic path:', error);
      return false;
    }
  }
  
  // ============================================================================
  // TPS LANDMARKS - Fixed spacetime reference points
  // ============================================================================
  
  /**
   * Insert or update a TPS landmark
   */
  async upsertLandmark(landmark: {
    eventId: string;
    description: string;
    era?: string;
    spacetimeX?: number;
    spacetimeY?: number;
    spacetimeZ?: number;
    spacetimeT: number;
    culturalCoords?: number[];
    fisherSignature?: Record<string, unknown>;
    lightConePast?: string[];
    lightConeFuture?: string[];
  }): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.insert(tpsLandmarks)
        .values({
          eventId: landmark.eventId,
          description: landmark.description,
          era: landmark.era,
          spacetimeX: landmark.spacetimeX ?? 0,
          spacetimeY: landmark.spacetimeY ?? 0,
          spacetimeZ: landmark.spacetimeZ ?? 0,
          spacetimeT: landmark.spacetimeT,
          culturalCoords: landmark.culturalCoords,
          fisherSignature: landmark.fisherSignature,
          lightConePast: landmark.lightConePast,
          lightConeFuture: landmark.lightConeFuture,
        })
        .onConflictDoUpdate({
          target: tpsLandmarks.eventId,
          set: {
            description: landmark.description,
            era: landmark.era,
            spacetimeX: landmark.spacetimeX ?? 0,
            spacetimeY: landmark.spacetimeY ?? 0,
            spacetimeZ: landmark.spacetimeZ ?? 0,
            spacetimeT: landmark.spacetimeT,
            culturalCoords: landmark.culturalCoords,
            fisherSignature: landmark.fisherSignature,
            lightConePast: landmark.lightConePast,
            lightConeFuture: landmark.lightConeFuture,
          },
        });
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to upsert landmark:', error);
      return false;
    }
  }
  
  /**
   * Get all TPS landmarks
   */
  async getLandmarks(): Promise<TpsLandmarkRecord[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(tpsLandmarks)
        .orderBy(asc(tpsLandmarks.spacetimeT));
    } catch (error) {
      console.error('[OceanPersistence] Failed to get landmarks:', error);
      return [];
    }
  }
  
  /**
   * Get landmarks by era
   */
  async getLandmarksByEra(era: string): Promise<TpsLandmarkRecord[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(tpsLandmarks)
        .where(eq(tpsLandmarks.era, era))
        .orderBy(asc(tpsLandmarks.spacetimeT));
    } catch (error) {
      console.error('[OceanPersistence] Failed to get landmarks by era:', error);
      return [];
    }
  }
  
  // ============================================================================
  // TPS GEODESIC PATHS - Computed paths between landmarks
  // ============================================================================
  
  /**
   * Insert a TPS geodesic path
   */
  async insertTpsGeodesicPath(path: {
    id: string;
    fromLandmark: string;
    toLandmark: string;
    distance: number;
    waypoints?: unknown[];
    totalArcLength?: number;
    avgCurvature?: number;
    regimeTransitions?: unknown[];
  }): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.insert(tpsGeodesicPaths)
        .values({
          id: path.id,
          fromLandmark: path.fromLandmark,
          toLandmark: path.toLandmark,
          distance: path.distance,
          waypoints: path.waypoints,
          totalArcLength: path.totalArcLength,
          avgCurvature: path.avgCurvature,
          regimeTransitions: path.regimeTransitions,
        })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to insert TPS geodesic path:', error);
      return false;
    }
  }
  
  // ============================================================================
  // OCEAN TRAJECTORIES - Navigation trajectories
  // ============================================================================
  
  /**
   * Start a new trajectory
   */
  async startTrajectory(id: string, address: string): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.insert(oceanTrajectories)
        .values({
          id,
          address,
          status: 'active',
        });
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to start trajectory:', error);
      return false;
    }
  }
  
  /**
   * Record a waypoint on a trajectory
   */
  async recordWaypoint(trajectoryId: string, waypoint: TrajectoryWaypoint): Promise<boolean> {
    if (!db) return false;
    
    try {
      const waypointId = crypto.randomUUID().substring(0, 32);
      
      const trajectory = await db.select()
        .from(oceanTrajectories)
        .where(eq(oceanTrajectories.id, trajectoryId))
        .limit(1);
      
      if (trajectory.length === 0) return false;
      
      const nextSequence = (trajectory[0].waypointCount ?? 0) + 1;
      
      await db.insert(oceanWaypoints)
        .values({
          id: waypointId,
          trajectoryId,
          sequence: nextSequence,
          phi: waypoint.phi,
          kappa: waypoint.kappa,
          regime: waypoint.regime,
          basinCoords: waypoint.basinCoords,
          event: waypoint.event,
          details: waypoint.details,
        });
      
      await db.update(oceanTrajectories)
        .set({
          waypointCount: nextSequence,
          lastPhi: waypoint.phi,
          lastKappa: waypoint.kappa,
          updatedAt: new Date(),
        })
        .where(eq(oceanTrajectories.id, trajectoryId));
      
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to record waypoint:', error);
      return false;
    }
  }
  
  /**
   * Complete a trajectory
   */
  async completeTrajectory(
    trajectoryId: string,
    result: 'match' | 'exhausted' | 'stopped' | 'error',
    stats?: { nearMissCount?: number; resonantCount?: number }
  ): Promise<boolean> {
    if (!db) return false;
    
    try {
      const trajectory = await db.select()
        .from(oceanTrajectories)
        .where(eq(oceanTrajectories.id, trajectoryId))
        .limit(1);
      
      if (trajectory.length === 0) return false;
      
      const startTime = trajectory[0].startTime;
      const endTime = new Date();
      const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
      
      await db.update(oceanTrajectories)
        .set({
          status: 'completed',
          endTime,
          finalResult: result,
          durationSeconds,
          nearMissCount: stats?.nearMissCount ?? trajectory[0].nearMissCount,
          resonantCount: stats?.resonantCount ?? trajectory[0].resonantCount,
          updatedAt: endTime,
        })
        .where(eq(oceanTrajectories.id, trajectoryId));
      
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to complete trajectory:', error);
      return false;
    }
  }
  
  /**
   * Get active trajectories for an address
   */
  async getActiveTrajectories(address?: string): Promise<OceanTrajectoryRecord[]> {
    if (!db) return [];
    
    try {
      const conditions = [eq(oceanTrajectories.status, 'active')];
      if (address) conditions.push(eq(oceanTrajectories.address, address));
      
      return await db.select()
        .from(oceanTrajectories)
        .where(and(...conditions))
        .orderBy(desc(oceanTrajectories.startTime));
    } catch (error) {
      console.error('[OceanPersistence] Failed to get active trajectories:', error);
      return [];
    }
  }
  
  /**
   * Get trajectory with its waypoints
   */
  async getTrajectoryWithWaypoints(trajectoryId: string): Promise<{
    trajectory: OceanTrajectoryRecord | null;
    waypoints: OceanWaypointRecord[];
  }> {
    if (!db) return { trajectory: null, waypoints: [] };
    
    try {
      const trajectories = await db.select()
        .from(oceanTrajectories)
        .where(eq(oceanTrajectories.id, trajectoryId))
        .limit(1);
      
      if (trajectories.length === 0) {
        return { trajectory: null, waypoints: [] };
      }
      
      const waypoints = await db.select()
        .from(oceanWaypoints)
        .where(eq(oceanWaypoints.trajectoryId, trajectoryId))
        .orderBy(asc(oceanWaypoints.sequence));
      
      return { trajectory: trajectories[0], waypoints };
    } catch (error) {
      console.error('[OceanPersistence] Failed to get trajectory with waypoints:', error);
      return { trajectory: null, waypoints: [] };
    }
  }
  
  // ============================================================================
  // QUANTUM STATE - Wave function and entropy tracking
  // ============================================================================
  
  /**
   * Get or initialize quantum state
   */
  async getQuantumState(): Promise<OceanQuantumStateRecord | null> {
    if (!db) return null;
    
    try {
      const states = await db.select()
        .from(oceanQuantumState)
        .where(eq(oceanQuantumState.id, 'singleton'))
        .limit(1);
      
      if (states.length === 0) {
        await db.insert(oceanQuantumState)
          .values({
            id: 'singleton',
            entropy: 256,
            initialEntropy: 256,
            totalProbability: 1.0,
            measurementCount: 0,
            successfulMeasurements: 0,
            status: 'searching',
          });
        
        return await db.select()
          .from(oceanQuantumState)
          .where(eq(oceanQuantumState.id, 'singleton'))
          .limit(1)
          .then(r => r[0] ?? null);
      }
      
      return states[0];
    } catch (error) {
      console.error('[OceanPersistence] Failed to get quantum state:', error);
      return null;
    }
  }
  
  /**
   * Update quantum state after a measurement
   */
  async updateQuantumState(update: {
    entropy?: number;
    totalProbability?: number;
    measurementCount?: number;
    successfulMeasurements?: number;
    status?: 'searching' | 'solved' | 'exhausted';
  }): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.update(oceanQuantumState)
        .set({
          ...update,
          lastMeasurementAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(oceanQuantumState.id, 'singleton'));
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to update quantum state:', error);
      return false;
    }
  }
  
  // ============================================================================
  // EXCLUDED REGIONS - Regions excluded from possibility space
  // ============================================================================
  
  /**
   * Insert an excluded region
   */
  async insertExcludedRegion(region: {
    id: string;
    dimension: number;
    origin: number[];
    basis?: number[][];
    measure: number;
    phi?: number;
    regime?: string;
  }): Promise<boolean> {
    if (!db) return false;
    
    try {
      await db.insert(oceanExcludedRegions)
        .values({
          id: region.id,
          dimension: region.dimension,
          origin: region.origin,
          basis: region.basis,
          measure: region.measure,
          phi: region.phi,
          regime: region.regime,
        })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error('[OceanPersistence] Failed to insert excluded region:', error);
      return false;
    }
  }
  
  /**
   * Get excluded regions (top by measure)
   */
  async getExcludedRegions(limit: number = 100): Promise<OceanExcludedRegionRecord[]> {
    if (!db) return [];
    
    try {
      return await db.select()
        .from(oceanExcludedRegions)
        .orderBy(desc(oceanExcludedRegions.measure))
        .limit(limit);
    } catch (error) {
      console.error('[OceanPersistence] Failed to get excluded regions:', error);
      return [];
    }
  }
  
  /**
   * Get excluded region count
   */
  async getExcludedRegionCount(): Promise<number> {
    if (!db) return 0;
    
    try {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(oceanExcludedRegions);
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      console.error('[OceanPersistence] Failed to get excluded region count:', error);
      return 0;
    }
  }
  
  // ============================================================================
  // TESTED PHRASES INDEX - Fast lookup for already-tested phrases
  // ============================================================================
  
  /**
   * Check if a phrase has been tested
   */
  async hasBeenTested(phrase: string): Promise<boolean> {
    if (!db) return false;
    
    try {
      const hash = crypto.createHash('sha256').update(phrase).digest('hex');
      const result = await db.select()
        .from(testedPhrasesIndex)
        .where(eq(testedPhrasesIndex.phraseHash, hash))
        .limit(1);
      return result.length > 0;
    } catch (error) {
      console.error('[OceanPersistence] Failed to check tested phrase:', error);
      return false;
    }
  }
  
  /**
   * Mark a phrase as tested (BUFFERED - no immediate DB write)
   * Uses internal buffer to batch writes and prevent connection pool exhaustion
   */
  async markTested(phrase: string): Promise<boolean> {
    if (!db) return false;
    
    // Add to buffer (Set handles deduplication)
    this.testedPhraseBuffer.add(phrase);
    
    // Auto-flush when buffer is full
    if (this.testedPhraseBuffer.size >= this.BATCH_SIZE) {
      // Don't await - let it flush in background to not block caller
      this.flushTestedPhrases().catch(err => {
        console.error('[OceanPersistence] Background flush error:', err);
      });
    }
    
    return true;
  }
  
  /**
   * Batch mark phrases as tested (BUFFERED)
   * Adds to internal buffer for efficient batched writes
   */
  async batchMarkTested(phrases: string[]): Promise<number> {
    if (!db || phrases.length === 0) return 0;
    
    // Add all to buffer (Set handles deduplication)
    phrases.forEach(p => this.testedPhraseBuffer.add(p));
    
    // Flush if buffer exceeds threshold
    if (this.testedPhraseBuffer.size >= this.BATCH_SIZE) {
      await this.flushTestedPhrases();
    }
    
    return phrases.length;
  }
  
  /**
   * Get current buffer size (for monitoring)
   */
  getTestedPhraseBufferSize(): number {
    return this.testedPhraseBuffer.size;
  }
  
  // ============================================================================
  // STATISTICS AND SUMMARY
  // ============================================================================
  
  /**
   * Get persistence statistics
   */
  async getStats(): Promise<{
    probeCount: number;
    resonancePointCount: number;
    trajectoryCount: number;
    activeTrajectoryCount: number;
    excludedRegionCount: number;
    testedPhraseCount: number;
    quantumState: OceanQuantumStateRecord | null;
  }> {
    const [
      probeCount,
      resonancePointCount,
      trajectoryCount,
      activeTrajectoryCount,
      excludedRegionCount,
      testedPhraseCount,
      quantumState,
    ] = await Promise.all([
      this.getProbeCount(),
      this.getResonancePoints(1).then(r => r.length > 0 ? this.getResonancePoints(1000).then(r2 => r2.length) : 0),
      db ? db.select({ count: sql<number>`count(*)` }).from(oceanTrajectories).then(r => Number(r[0]?.count ?? 0)) : 0,
      db ? db.select({ count: sql<number>`count(*)` }).from(oceanTrajectories).where(eq(oceanTrajectories.status, 'active')).then(r => Number(r[0]?.count ?? 0)) : 0,
      this.getExcludedRegionCount(),
      db ? db.select({ count: sql<number>`count(*)` }).from(testedPhrasesIndex).then(r => Number(r[0]?.count ?? 0)) : 0,
      this.getQuantumState(),
    ]);
    
    return {
      probeCount,
      resonancePointCount,
      trajectoryCount,
      activeTrajectoryCount,
      excludedRegionCount,
      testedPhraseCount,
      quantumState,
    };
  }
}

export const oceanPersistence = new OceanPersistence();
