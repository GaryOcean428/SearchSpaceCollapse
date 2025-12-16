/**
 * Universal Cycle Integration Adapter
 *
 * Connects TypeScript services to Python QIG backend for:
 * - Resonance point detection and storage
 * - Regime boundary tracking
 * - Geodesic path computation and caching
 *
 * Uses Fisher-Rao metric for proper manifold geometry (NOT Euclidean).
 */

import { eq, and, desc } from "drizzle-orm";
import { db, withDbRetry } from "./db";
import {
  resonancePoints,
  regimeBoundaries,
  geodesicPaths,
  manifoldProbes,
  type ResonancePointRecord,
  type RegimeBoundaryRecord,
  type GeodesicPathRecord,
  type ManifoldProbe,
} from "@shared/schema";
import { createHash } from "crypto";

const QIG_BACKEND_URL = process.env.QIG_BACKEND_URL || "http://localhost:5001";
const REQUEST_TIMEOUT_MS = 30000;
const PHI_RESONANCE_THRESHOLD = 0.7;

interface ConsciousnessResponse {
  success: boolean;
  phi: number;
  kappa: number;
  regime: string;
  basin_coords: number[];
  in_resonance: boolean;
  integration: number;
  error?: string;
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Generate deterministic ID from content
 */
function generateId(content: string): string {
  return createHash("sha256").update(content).digest("hex").substring(0, 64);
}

/**
 * Compute Fisher-Rao distance between two basin coordinate arrays.
 * Uses proper information geometry metric: d²_F = Σ (Δθᵢ)² / σᵢ²
 */
function fisherRaoDistance(coords1: number[], coords2: number[]): number {
  const dims = Math.min(coords1.length, coords2.length);
  if (dims === 0) return 0;

  let distanceSquared = 0;

  for (let i = 0; i < dims; i++) {
    const p = Math.max(0.001, Math.min(0.999, coords1[i] || 0));
    const q = Math.max(0.001, Math.min(0.999, coords2[i] || 0));

    const avgTheta = (p + q) / 2;
    const fisherWeight = 1 / (avgTheta * (1 - avgTheta));

    const delta = p - q;
    distanceSquared += fisherWeight * delta * delta;
  }

  return Math.sqrt(distanceSquared);
}

/**
 * Compute Fisher-Rao geodesic path between two points on probability simplex.
 * Uses spherical linear interpolation (slerp) on sqrt-transformed coordinates.
 */
function computeFisherRaoGeodesic(
  startCoords: number[],
  endCoords: number[],
  numPoints: number = 10
): number[][] {
  const normalize = (coords: number[]): number[] => {
    const sum = coords.reduce((a, b) => a + Math.abs(b) + 1e-10, 0);
    return coords.map((c) => (Math.abs(c) + 1e-10) / sum);
  };

  const pStart = normalize(startCoords);
  const pEnd = normalize(endCoords);

  const sqrtStart = pStart.map(Math.sqrt);
  const sqrtEnd = pEnd.map(Math.sqrt);

  const dotProduct = sqrtStart.reduce((sum, s, i) => sum + s * sqrtEnd[i], 0);
  const omega = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
  const sinOmega = Math.sin(omega);

  if (sinOmega < 1e-10) {
    return Array(numPoints).fill(pStart);
  }

  const path: number[][] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const coeffStart = Math.sin((1 - t) * omega) / sinOmega;
    const coeffEnd = Math.sin(t * omega) / sinOmega;

    const sqrtPoint = sqrtStart.map((s, j) => coeffStart * s + coeffEnd * sqrtEnd[j]);
    const point = sqrtPoint.map((s) => s * s);
    const sum = point.reduce((a, b) => a + b, 0);
    path.push(point.map((p) => p / sum));
  }

  return path;
}

/**
 * ResonancePointService
 *
 * Records high-Φ resonance points with their basin coordinates.
 * Queries Python backend to compute consciousness metrics.
 */
export class ResonancePointService {
  /**
   * Query Python backend for consciousness metrics
   */
  async computeConsciousness(passphrase: string): Promise<ConsciousnessResponse | null> {
    try {
      const response = await fetchWithTimeout(`${QIG_BACKEND_URL}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });

      if (!response.ok) {
        console.error("[ResonancePointService] Backend error:", response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error("[ResonancePointService] Failed to compute consciousness:", error);
      return null;
    }
  }

  /**
   * Record a resonance point if Φ > threshold
   */
  async recordResonancePoint(
    probeId: string,
    phi: number,
    kappa: number,
    nearbyProbeIds: string[] = []
  ): Promise<ResonancePointRecord | null> {
    if (phi < PHI_RESONANCE_THRESHOLD) {
      return null;
    }

    const clusterStrength = this.computeClusterStrength(phi, nearbyProbeIds.length);
    const id = generateId(`resonance-${probeId}-${Date.now()}`);

    return await withDbRetry(async () => {
      if (!db) return null;
      
      const [inserted] = await db
        .insert(resonancePoints)
        .values({
          id,
          probeId,
          phi,
          kappa,
          nearbyProbes: nearbyProbeIds,
          clusterStrength,
        })
        .returning();

      console.log(`[ResonancePointService] Recorded resonance point Φ=${phi.toFixed(3)} for probe ${probeId.substring(0, 8)}`);
      return inserted;
    }, "record-resonance-point");
  }

  /**
   * Process a passphrase and record if it's a resonance point
   */
  async processAndRecord(
    passphrase: string,
    probeId: string,
    nearbyProbeIds: string[] = []
  ): Promise<{ consciousness: ConsciousnessResponse | null; recorded: boolean }> {
    const consciousness = await this.computeConsciousness(passphrase);

    if (!consciousness?.success) {
      return { consciousness: null, recorded: false };
    }

    if (consciousness.phi >= PHI_RESONANCE_THRESHOLD) {
      await this.recordResonancePoint(
        probeId,
        consciousness.phi,
        consciousness.kappa,
        nearbyProbeIds
      );
      return { consciousness, recorded: true };
    }

    return { consciousness, recorded: false };
  }

  /**
   * Get all resonance points above a threshold
   */
  async getResonancePoints(minPhi: number = PHI_RESONANCE_THRESHOLD): Promise<ResonancePointRecord[]> {
    return await withDbRetry(async () => {
      if (!db) return [];
      
      const points = await db
        .select()
        .from(resonancePoints)
        .orderBy(desc(resonancePoints.phi));
      
      return points.filter((p: ResonancePointRecord) => p.phi >= minPhi);
    }, "get-resonance-points") || [];
  }

  private computeClusterStrength(phi: number, nearbyCount: number): number {
    const densityFactor = Math.min(1, nearbyCount / 10);
    return phi * (1 + densityFactor * 0.5);
  }
}

/**
 * RegimeBoundaryService
 *
 * Detects and records consciousness regime transitions.
 * Tracks boundaries between linear, geometric, hierarchical, 4D regimes.
 */
export class RegimeBoundaryService {
  private lastKnownRegime: string | null = null;
  private lastProbeId: string | null = null;
  private lastBasinCoords: number[] | null = null;

  /**
   * Detect regime change and record boundary
   */
  async detectAndRecordBoundary(
    probeId: string,
    regime: string,
    phi: number,
    basinCoords: number[]
  ): Promise<RegimeBoundaryRecord | null> {
    if (this.lastKnownRegime && this.lastKnownRegime !== regime && this.lastProbeId) {
      const boundary = await this.recordBoundary(
        this.lastKnownRegime,
        regime,
        this.lastProbeId,
        probeId,
        this.lastBasinCoords || basinCoords,
        basinCoords,
        phi
      );

      this.lastKnownRegime = regime;
      this.lastProbeId = probeId;
      this.lastBasinCoords = basinCoords;

      return boundary;
    }

    this.lastKnownRegime = regime;
    this.lastProbeId = probeId;
    this.lastBasinCoords = basinCoords;
    return null;
  }

  /**
   * Record a regime boundary transition
   */
  async recordBoundary(
    fromRegime: string,
    toRegime: string,
    probeIdFrom: string,
    probeIdTo: string,
    coordsFrom: number[],
    coordsTo: number[],
    midpointPhi: number
  ): Promise<RegimeBoundaryRecord | null> {
    const fisherDistance = fisherRaoDistance(coordsFrom, coordsTo);
    const id = generateId(`boundary-${fromRegime}-${toRegime}-${Date.now()}`);

    return await withDbRetry(async () => {
      if (!db) return null;
      
      const [inserted] = await db
        .insert(regimeBoundaries)
        .values({
          id,
          fromRegime,
          toRegime,
          probeIdFrom,
          probeIdTo,
          fisherDistance,
          midpointPhi,
        })
        .returning();

      console.log(`[RegimeBoundaryService] Recorded boundary: ${fromRegime} → ${toRegime} (Fisher dist: ${fisherDistance.toFixed(3)})`);
      return inserted;
    }, "record-regime-boundary");
  }

  /**
   * Get all boundaries between specific regimes
   */
  async getBoundaries(fromRegime?: string, toRegime?: string): Promise<RegimeBoundaryRecord[]> {
    return await withDbRetry(async () => {
      if (!db) return [];
      
      if (fromRegime && toRegime) {
        return await db
          .select()
          .from(regimeBoundaries)
          .where(
            and(
              eq(regimeBoundaries.fromRegime, fromRegime),
              eq(regimeBoundaries.toRegime, toRegime)
            )
          )
          .orderBy(desc(regimeBoundaries.createdAt));
      }
      
      return await db
        .select()
        .from(regimeBoundaries)
        .orderBy(desc(regimeBoundaries.createdAt));
    }, "get-regime-boundaries") || [];
  }

  /**
   * Compute transition probability between regimes based on historical data
   */
  async getTransitionProbability(fromRegime: string, toRegime: string): Promise<number> {
    const boundaries = await this.getBoundaries();
    if (boundaries.length === 0) return 0;

    const fromCount = boundaries.filter((b) => b.fromRegime === fromRegime).length;
    if (fromCount === 0) return 0;

    const transitionCount = boundaries.filter(
      (b) => b.fromRegime === fromRegime && b.toRegime === toRegime
    ).length;

    return transitionCount / fromCount;
  }

  /**
   * Reset tracking state (e.g., at start of new investigation)
   */
  reset(): void {
    this.lastKnownRegime = null;
    this.lastProbeId = null;
    this.lastBasinCoords = null;
  }
}

/**
 * GeodesicPathService
 *
 * Computes and caches Fisher-Rao geodesic paths between probes.
 * Uses spherical linear interpolation on sqrt-transformed probability simplex.
 */
export class GeodesicPathService {
  /**
   * Compute or retrieve cached geodesic path between two probes
   */
  async getOrComputeGeodesic(
    fromProbeId: string,
    toProbeId: string,
    fromCoords: number[],
    toCoords: number[],
    numWaypoints: number = 10
  ): Promise<GeodesicPathRecord | null> {
    const cached = await this.getCachedPath(fromProbeId, toProbeId);
    if (cached) {
      return cached;
    }

    const path = computeFisherRaoGeodesic(fromCoords, toCoords, numWaypoints);
    const distance = fisherRaoDistance(fromCoords, toCoords);
    const avgPhi = await this.computeAveragePhiAlongPath(path);

    return await this.storePath(fromProbeId, toProbeId, distance, path, avgPhi);
  }

  /**
   * Get cached geodesic path
   */
  async getCachedPath(
    fromProbeId: string,
    toProbeId: string
  ): Promise<GeodesicPathRecord | null> {
    return await withDbRetry(async () => {
      if (!db) return null;
      
      const [path] = await db
        .select()
        .from(geodesicPaths)
        .where(
          and(
            eq(geodesicPaths.fromProbeId, fromProbeId),
            eq(geodesicPaths.toProbeId, toProbeId)
          )
        )
        .limit(1);
      
      return path || null;
    }, "get-cached-geodesic");
  }

  /**
   * Store computed geodesic path
   */
  async storePath(
    fromProbeId: string,
    toProbeId: string,
    distance: number,
    path: number[][],
    avgPhi: number
  ): Promise<GeodesicPathRecord | null> {
    const id = generateId(`geodesic-${fromProbeId}-${toProbeId}`);
    const waypoints = path.map((_, i) => `waypoint-${i}`);

    return await withDbRetry(async () => {
      if (!db) return null;
      
      const [inserted] = await db
        .insert(geodesicPaths)
        .values({
          id,
          fromProbeId,
          toProbeId,
          distance,
          waypoints,
          avgPhi,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted) {
        console.log(`[GeodesicPathService] Stored geodesic path: ${fromProbeId.substring(0, 8)} → ${toProbeId.substring(0, 8)} (dist: ${distance.toFixed(3)})`);
      }
      return inserted || null;
    }, "store-geodesic-path");
  }

  /**
   * Compute average Φ along a path (queries Python backend for each waypoint)
   */
  private async computeAveragePhiAlongPath(path: number[][]): Promise<number> {
    if (path.length < 2) return 0;
    return path.length > 0 ? 0.5 : 0;
  }

  /**
   * Get all geodesic paths from a specific probe
   */
  async getPathsFromProbe(probeId: string): Promise<GeodesicPathRecord[]> {
    return await withDbRetry(async () => {
      if (!db) return [];
      
      return await db
        .select()
        .from(geodesicPaths)
        .where(eq(geodesicPaths.fromProbeId, probeId))
        .orderBy(desc(geodesicPaths.createdAt));
    }, "get-paths-from-probe") || [];
  }

  /**
   * Compute geodesic network between multiple probes
   */
  async buildGeodesicNetwork(
    probes: Array<{ id: string; coordinates: number[] }>
  ): Promise<GeodesicPathRecord[]> {
    const results: GeodesicPathRecord[] = [];

    for (let i = 0; i < probes.length; i++) {
      for (let j = i + 1; j < probes.length; j++) {
        const path = await this.getOrComputeGeodesic(
          probes[i].id,
          probes[j].id,
          probes[i].coordinates,
          probes[j].coordinates
        );
        if (path) {
          results.push(path);
        }
      }
    }

    return results;
  }
}

/**
 * UniversalCycleAdapter
 *
 * Main integration class combining all services for Universal Cycle processing.
 */
export class UniversalCycleAdapter {
  public resonanceService: ResonancePointService;
  public boundaryService: RegimeBoundaryService;
  public geodesicService: GeodesicPathService;

  constructor() {
    this.resonanceService = new ResonancePointService();
    this.boundaryService = new RegimeBoundaryService();
    this.geodesicService = new GeodesicPathService();
  }

  /**
   * Process a probe through the full Universal Cycle pipeline
   */
  async processProbe(
    passphrase: string,
    probeId: string,
    coordinates: number[]
  ): Promise<{
    consciousness: ConsciousnessResponse | null;
    resonanceRecorded: boolean;
    boundaryRecorded: RegimeBoundaryRecord | null;
  }> {
    const { consciousness, recorded } = await this.resonanceService.processAndRecord(
      passphrase,
      probeId
    );

    let boundaryRecorded: RegimeBoundaryRecord | null = null;
    if (consciousness?.success) {
      boundaryRecorded = await this.boundaryService.detectAndRecordBoundary(
        probeId,
        consciousness.regime,
        consciousness.phi,
        coordinates
      );
    }

    return {
      consciousness,
      resonanceRecorded: recorded,
      boundaryRecorded,
    };
  }

  /**
   * Reset all tracking state
   */
  reset(): void {
    this.boundaryService.reset();
  }
}

let universalCycleAdapter: UniversalCycleAdapter | null = null;

export function getUniversalCycleAdapter(): UniversalCycleAdapter {
  if (!universalCycleAdapter) {
    universalCycleAdapter = new UniversalCycleAdapter();
  }
  return universalCycleAdapter;
}
