/**
 * TEMPORAL POSITIONING SYSTEM (TPS)
 * 
 * GPS for 4D Spacetime + 64D Cultural Manifold = 68D Navigation
 * 
 * PARADIGM: Like GPS uses satellite distances to compute position,
 * TPS uses Fisher-Rao distances to Bitcoin landmarks to compute
 * WHERE-WHEN information exists in the block universe.
 * 
 * The passphrase exists at specific 68D coordinates.
 * We trilaterate to find it.
 * 
 * PERSISTENCE: Calibration data saved for cross-session continuity
 * BASIN SYNC: Geodesic paths exported for QIG-pure knowledge transfer
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { fisherCoordDistance, scoreUniversalQIG, type Regime } from '../qig-universal';
import { computeFisherDistanceVectorized, computeGeodesicDirection } from '../fisher-vectorized';
import {
  type BlockUniverseMap,
  type SpacetimeLandmark,
  type SpacetimeCoords,
  type BitcoinEra,
  type GeodesicPath,
  BITCOIN_LANDMARKS,
  ERA_CULTURAL_PATTERNS
} from './types';

const CULTURAL_DIM = 64;  // Full cultural manifold dimension

/**
 * Pad coordinates to 64D for consistent Fisher metric computation
 */
function padTo64D(coords: number[]): number[] {
  if (coords.length >= CULTURAL_DIM) {
    return coords.slice(0, CULTURAL_DIM);
  }
  const padded = new Array(CULTURAL_DIM).fill(0.5);  // Neutral value
  for (let i = 0; i < coords.length; i++) {
    padded[i] = coords[i];
  }
  return padded;
}

/**
 * Compute cultural basin from text content
 * Maps text to 64D Fisher manifold coordinates
 */
function computeCulturalBasin(content: string): number[] {
  const hash = createHash('sha256').update(content.toLowerCase()).digest();
  const coords = new Array(CULTURAL_DIM);
  
  // Expand 32-byte hash to 64D coordinates
  for (let i = 0; i < CULTURAL_DIM; i++) {
    const byteIdx = i % 32;
    const bitOffset = Math.floor(i / 32);
    const value = hash[byteIdx];
    
    // Normalize to [0.01, 0.99] for Fisher metric stability
    coords[i] = 0.01 + (value / 255) * 0.98 + bitOffset * 0.001;
  }
  
  return coords;
}

/**
 * Initialize landmarks with computed cultural basins
 */
function initializeLandmarks(): SpacetimeLandmark[] {
  const landmarks = [...BITCOIN_LANDMARKS];
  
  for (const landmark of landmarks) {
    // Compute cultural basin from landmark description
    const culturalContent = [
      landmark.eventId,
      landmark.description,
      ...landmark.lightCone.pastEvents,
      ...landmark.lightCone.futureEvents
    ].join(' ');
    
    landmark.coords.cultural = computeCulturalBasin(culturalContent);
    
    // Compute Fisher signature (simplified diagonal approximation)
    const n = CULTURAL_DIM;
    landmark.fisherSignature = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      const c = landmark.coords.cultural[i];
      row[i] = 1 / Math.max(0.01, c * (1 - c));  // Bernoulli Fisher info
      landmark.fisherSignature.push(row);
    }
  }
  
  return landmarks;
}

/**
 * Temporal Positioning System
 * 
 * Locates patterns in 68D block universe using Fisher-Rao trilateration
 */
export class TemporalPositioningSystem {
  private landmarks: SpacetimeLandmark[];
  
  constructor() {
    this.landmarks = initializeLandmarks();
    console.log(`[TPS] Initialized with ${this.landmarks.length} spacetime landmarks`);
  }
  
  /**
   * Locate pattern in 68D block universe
   * 
   * Returns full BlockUniverseMap with estimated coordinates
   */
  locateInBlockUniverse(
    pattern: string,
    context?: string
  ): BlockUniverseMap {
    // Encode pattern to cultural manifold
    const culturalSignature = this.encodeConcept(pattern, context);
    
    // Measure Fisher-Rao distances to ALL landmarks
    const distances = this.landmarks.map(landmark => ({
      landmark,
      culturalDistance: fisherCoordDistance(culturalSignature, landmark.coords.cultural),
      temporalHint: landmark.coords.spacetime[3]
    }));
    
    // Sort by cultural distance (closest landmarks first)
    distances.sort((a, b) => a.culturalDistance - b.culturalDistance);
    
    // Trilaterate in 68D using top 5 nearest landmarks
    const coords = this.trilaterate68D(distances.slice(0, 5));
    
    // Compute local geometry at discovered position
    const geometry = this.computeLocalGeometry(coords.cultural);
    
    // Classify regime from curvature
    const regime = this.classifyRegime(geometry.ricci);
    
    return {
      spacetime: {
        x: 0,  // Abstract spatial
        y: 0,
        z: 0,
        t: coords.temporal
      },
      cultural: coords.cultural,
      fisherMetric: geometry.fisherMetric,
      ricci: geometry.ricci,
      phi: geometry.phi,
      regime
    };
  }
  
  /**
   * Encode concept to 64D cultural manifold
   */
  encodeConcept(pattern: string, context?: string): number[] {
    const fullContent = context ? `${pattern} ${context}` : pattern;
    return computeCulturalBasin(fullContent);
  }
  
  /**
   * 68D Trilateration: Estimate position from landmark distances
   * 
   * Similar to GPS trilateration but in 4D spacetime + 64D cultural space
   */
  private trilaterate68D(
    nearestLandmarks: Array<{
      landmark: SpacetimeLandmark;
      culturalDistance: number;
      temporalHint: number;
    }>
  ): { temporal: number; cultural: number[] } {
    if (nearestLandmarks.length === 0) {
      return {
        temporal: Date.now() / 1000,
        cultural: new Array(CULTURAL_DIM).fill(0.5)
      };
    }
    
    // Weighted average of landmark coordinates
    // Weight inversely proportional to distance
    let totalWeight = 0;
    let weightedTemporal = 0;
    const weightedCultural = new Array(CULTURAL_DIM).fill(0);
    
    for (const { landmark, culturalDistance } of nearestLandmarks) {
      // Avoid division by zero, use small epsilon
      const weight = 1 / Math.max(0.001, culturalDistance);
      totalWeight += weight;
      
      weightedTemporal += weight * landmark.coords.spacetime[3];
      
      for (let i = 0; i < CULTURAL_DIM; i++) {
        weightedCultural[i] += weight * landmark.coords.cultural[i];
      }
    }
    
    // Normalize
    const temporal = weightedTemporal / totalWeight;
    const cultural = weightedCultural.map(c => c / totalWeight);
    
    return { temporal, cultural };
  }
  
  /**
   * Compute local geometry at cultural coordinates
   */
  private computeLocalGeometry(cultural: number[]): {
    fisherMetric: number[][];
    ricci: number;
    phi: number;
  } {
    const n = cultural.length;
    
    // Compute Fisher metric (diagonal approximation for efficiency)
    const fisherMetric: number[][] = [];
    let trace = 0;
    
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      const c = Math.max(0.01, Math.min(0.99, cultural[i]));
      row[i] = 1 / (c * (1 - c));  // Bernoulli Fisher info
      trace += row[i];
      fisherMetric.push(row);
    }
    
    // Ricci scalar approximation from trace
    // Maps to proximity to κ* = 64
    const avgFisher = trace / n;
    const ricci = Math.log(avgFisher) * 10;  // Scale to reasonable range
    
    // Phi from integration measure
    const variance = cultural.reduce((acc, c) => {
      const centered = c - 0.5;
      return acc + centered * centered;
    }, 0) / n;
    
    const phi = Math.min(1, Math.max(0, 1 - variance * 4));
    
    return { fisherMetric, ricci, phi };
  }
  
  /**
   * Classify regime from Ricci curvature
   */
  private classifyRegime(ricci: number): Regime {
    // Based on validated physics from qig-pure-v2.ts
    // κ* = 64 is the fixed point
    if (ricci < 10) return 'breakdown';
    if (ricci < 41) return 'linear';  // Pre-emergence
    if (ricci < 58) return 'geometric';
    if (ricci < 70) return 'hierarchical';
    if (ricci < 80) return 'hierarchical_4d';
    return '4d_block_universe';
  }
  
  /**
   * Classify Bitcoin era from timestamp
   */
  classifyEra(timestamp: number): BitcoinEra {
    const GENESIS = 1231006505;  // Jan 3, 2009
    const PIZZA = 1274009688;    // May 22, 2010
    const MTGOX_RISE = 1279324800;  // Jul 17, 2010
    const SATOSHI_LAST = 1292342400;  // Dec 12, 2010
    const MTGOX_COLLAPSE = 1393286400;  // Feb 24, 2014
    const MODERN = 1420070400;  // Jan 1, 2015
    
    if (timestamp < GENESIS) return 'pre_genesis';
    if (timestamp < 1238544000) return 'genesis';  // Apr 1, 2009
    if (timestamp < PIZZA) return 'early_adoption';
    if (timestamp < SATOSHI_LAST) return 'pizza_era';
    if (timestamp < MTGOX_COLLAPSE) return 'mtgox_rise';
    if (timestamp < MODERN) return 'mtgox_collapse';
    return 'modern';
  }
  
  /**
   * Compute geodesic path from current position to target
   * 
   * Uses natural gradient on Fisher manifold
   */
  computeGeodesicPath(
    from: BlockUniverseMap,
    to: BlockUniverseMap,
    steps: number = 20
  ): GeodesicPath {
    const waypoints: BlockUniverseMap[] = [from];
    let current = from;
    
    const regimeTransitions: Array<{ from: Regime; to: Regime; atWaypoint: number }> = [];
    let totalArcLength = 0;
    let totalCurvature = 0;
    
    for (let i = 0; i < steps; i++) {
      // Compute geodesic direction on cultural manifold
      const direction = computeGeodesicDirection(
        padTo64D(current.cultural),
        padTo64D(to.cultural),
        1 / steps  // Step size
      );
      
      // Step along geodesic
      const nextCultural = current.cultural.map((c, idx) => {
        const step = direction[idx] || 0;
        return Math.max(0.01, Math.min(0.99, c + step));
      });
      
      // Interpolate temporal coordinate
      const t_fraction = (i + 1) / steps;
      const nextT = current.spacetime.t + t_fraction * (to.spacetime.t - current.spacetime.t);
      
      // Compute geometry at new position
      const geometry = this.computeLocalGeometry(nextCultural);
      const regime = this.classifyRegime(geometry.ricci);
      
      // Track regime transitions
      if (regime !== current.regime) {
        regimeTransitions.push({
          from: current.regime,
          to: regime,
          atWaypoint: waypoints.length
        });
      }
      
      // Accumulate arc length and curvature
      const stepDistance = fisherCoordDistance(current.cultural, nextCultural);
      totalArcLength += stepDistance;
      totalCurvature += geometry.ricci;
      
      const next: BlockUniverseMap = {
        spacetime: { x: 0, y: 0, z: 0, t: nextT },
        cultural: nextCultural,
        fisherMetric: geometry.fisherMetric,
        ricci: geometry.ricci,
        phi: geometry.phi,
        regime
      };
      
      waypoints.push(next);
      current = next;
      
      // Check if arrived (within epsilon)
      const distanceToTarget = fisherCoordDistance(nextCultural, to.cultural);
      if (distanceToTarget < 0.1) break;
    }
    
    return {
      waypoints,
      totalArcLength,
      avgCurvature: totalCurvature / waypoints.length,
      regimeTransitions
    };
  }
  
  /**
   * Get past light cone - events that could have caused this
   */
  getPastLightCone(event: BlockUniverseMap): BlockUniverseMap[] {
    return this.landmarks
      .filter(lm => {
        const t_lm = lm.coords.spacetime[3];
        const t_event = event.spacetime.t;
        
        // Past light cone: t_landmark < t_event (causally precedes)
        return t_lm < t_event;
      })
      .map(lm => this.landmarkToMap(lm));
  }
  
  /**
   * Get future light cone - events this could influence
   */
  getFutureLightCone(event: BlockUniverseMap): BlockUniverseMap[] {
    return this.landmarks
      .filter(lm => {
        const t_lm = lm.coords.spacetime[3];
        const t_event = event.spacetime.t;
        
        // Future light cone: t_landmark > t_event
        return t_lm > t_event;
      })
      .map(lm => this.landmarkToMap(lm));
  }
  
  /**
   * Convert landmark to BlockUniverseMap
   */
  private landmarkToMap(landmark: SpacetimeLandmark): BlockUniverseMap {
    const geometry = this.computeLocalGeometry(landmark.coords.cultural);
    
    return {
      spacetime: {
        x: landmark.coords.spacetime[0],
        y: landmark.coords.spacetime[1],
        z: landmark.coords.spacetime[2],
        t: landmark.coords.spacetime[3]
      },
      cultural: landmark.coords.cultural,
      fisherMetric: landmark.fisherSignature,
      ricci: geometry.ricci,
      phi: geometry.phi,
      regime: this.classifyRegime(geometry.ricci)
    };
  }
  
  /**
   * Find nearby landmarks to a position
   */
  findNearbyLandmarks(
    coords: BlockUniverseMap,
    count: number = 3
  ): SpacetimeLandmark[] {
    const distances = this.landmarks.map(lm => ({
      landmark: lm,
      distance: fisherCoordDistance(coords.cultural, lm.coords.cultural)
    }));
    
    distances.sort((a, b) => a.distance - b.distance);
    
    return distances.slice(0, count).map(d => d.landmark);
  }
  
  /**
   * Get cultural baseline for an era
   */
  getEraCulturalBaseline(era: BitcoinEra): number[] {
    const patterns = ERA_CULTURAL_PATTERNS[era] || [];
    if (patterns.length === 0) {
      return new Array(CULTURAL_DIM).fill(0.5);
    }
    
    // Combine all era patterns into basin
    const content = patterns.join(' ');
    return computeCulturalBasin(content);
  }
  
  /**
   * Compute 4D spacetime interval with Fisher metric
   * 
   * ds² = g_spatial * (Δx² + Δy² + Δz²) - g_temporal * Δt²
   */
  spacetimeInterval(
    event1: BlockUniverseMap,
    event2: BlockUniverseMap
  ): number {
    // Spatial part (positive signature)
    const dx = event1.spacetime.x - event2.spacetime.x;
    const dy = event1.spacetime.y - event2.spacetime.y;
    const dz = event1.spacetime.z - event2.spacetime.z;
    const spatialSq = dx * dx + dy * dy + dz * dz;
    
    // Temporal part (negative signature)
    const dt = event1.spacetime.t - event2.spacetime.t;
    const temporalSq = dt * dt;
    
    // Fisher-weighted interval (using diagonal approximation)
    const g_spatial = event1.fisherMetric[0]?.[0] || 1;
    const g_temporal = event1.fisherMetric[3]?.[3] || 1;
    
    // Normalize temporal by typical Bitcoin lifetime (~15 years in seconds)
    const TEMPORAL_SCALE = 15 * 365.25 * 24 * 3600;
    
    return g_spatial * spatialSq - g_temporal * (temporalSq / (TEMPORAL_SCALE * TEMPORAL_SCALE));
  }
  
  /**
   * Get all landmarks
   */
  getAllLandmarks(): SpacetimeLandmark[] {
    return [...this.landmarks];
  }
  
  /**
   * Get landmark by event ID
   */
  getLandmark(eventId: string): SpacetimeLandmark | undefined {
    return this.landmarks.find(lm => lm.eventId === eventId);
  }
  
  /**
   * Export data for basin sync
   * 
   * Exports spacetime navigation structure for QIG-pure knowledge transfer
   */
  exportForBasinSync(): TPSSyncData {
    // Export landmark distances and calibration data
    const landmarkSummary = this.landmarks.map(lm => ({
      eventId: lm.eventId,
      era: lm.era,
      timestamp: lm.coords.spacetime[3],  // t is the 4th element of the tuple (x, y, z, t)
      culturalSignature: lm.coords.cultural.slice(0, 8)  // First 8 dims for coupling
    }));
    
    return {
      landmarkCount: this.landmarks.length,
      landmarks: landmarkSummary,
      geodesicPathsComputed: this.computedPaths.length,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Import basin sync data from peer
   * 
   * Blends peer landmark/geodesic data using Fisher-Rao distance for coupling
   * Appends new paths to existing paths (does not overwrite)
   */
  importFromBasinSync(data: TPSSyncData, couplingStrength: number): void {
    if (couplingStrength < 0.1) return;
    
    const peerLandmarks = data.landmarks || [];
    let addedPaths = 0;
    
    // Use Fisher distance to weight which peer landmarks are geometrically close
    for (const peerLandmark of peerLandmarks) {
      if (!peerLandmark.culturalSignature || peerLandmark.culturalSignature.length < 8) continue;
      
      // Find our corresponding landmark
      const ourLandmark = this.landmarks.find(lm => lm.eventId === peerLandmark.eventId);
      
      if (ourLandmark) {
        // Compute Fisher-Rao distance between cultural signatures
        const distance = fisherCoordDistance(
          ourLandmark.coords.cultural.slice(0, 8),
          peerLandmark.culturalSignature.slice(0, 8)
        );
        
        // Only accept paths with distance < 0.5 (geometrically close)
        if (distance >= 0.5) continue;
        
        // Check for duplicate path (avoid appending same path multiple times)
        const pathKey = `${ourLandmark.eventId}:${peerLandmark.eventId}`;
        const isDuplicate = this.computedPaths.some(
          p => p.from.includes(ourLandmark.eventId) && p.to.includes(peerLandmark.eventId)
        );
        
        if (isDuplicate) continue;
        
        // Append new geodesic path with Fisher-weighted distance
        const weightedDistance = distance * couplingStrength;
        this.computedPaths.push({
          from: `local:${ourLandmark.eventId}`,
          to: `peer:${peerLandmark.eventId}`,
          distance: weightedDistance
        });
        addedPaths++;
      }
    }
    
    // Cap computed paths to prevent unbounded growth
    const MAX_PATHS = 100;
    if (this.computedPaths.length > MAX_PATHS) {
      // Keep paths sorted by shortest distance (most valuable for navigation)
      this.computedPaths.sort((a, b) => a.distance - b.distance);
      this.computedPaths = this.computedPaths.slice(0, MAX_PATHS);
    }
    
    console.log(`[TPS] Basin sync: added ${addedPaths} geodesic paths, total ${this.computedPaths.length} (coupling=${couplingStrength.toFixed(2)})`);
  }
  
  // Track computed paths for basin sync (persists across import calls)
  private computedPaths: Array<{ from: string; to: string; distance: number }> = [];
}

/**
 * Basin sync data for TPS
 */
export interface TPSSyncData {
  landmarkCount: number;
  landmarks: Array<{
    eventId: string;
    era?: BitcoinEra;  // Optional - landmarks may not have era assigned
    timestamp: number;
    culturalSignature: number[];
  }>;
  geodesicPathsComputed: number;
  lastUpdated: string;
}

// Export singleton instance
export const tps = new TemporalPositioningSystem();
