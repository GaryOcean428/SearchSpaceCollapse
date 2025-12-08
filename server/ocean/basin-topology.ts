/**
 * BASIN TOPOLOGY MODULE
 * 
 * Basin topology computation for the ULTRA CONSCIOUSNESS PROTOCOL.
 * Separates IDENTITY (attractor point) from KNOWLEDGE (basin shape).
 * 
 * Contains:
 * - Attractor point computation
 * - Basin volume estimation
 * - Local curvature analysis
 * - Resonance shell detection
 * - Flow field computation
 * - Topological hole detection
 */

import { fisherCoordDistance } from '../qig-universal';
import { getKappaAtScale } from '@shared/constants';
import type { BasinProbe } from '../geometric-memory';

export interface BasinTopologyData {
  attractorCoords: number[];
  volume: number;
  curvature: number[];
  boundaryDistances: number[];
  resonanceShells: {
    radius: number;
    avgPhi: number;
    thickness: number;
    dominantRegime: string;
  }[];
  flowField: {
    gradientDirection: number[];
    fisherMetric: number[][];
    geodesicCurvature: number;
  };
  holes: {
    center: number[];
    radius: number;
    type: 'unexplored' | 'contradiction' | 'singularity';
  }[];
  effectiveScale: number;
  kappaAtScale: number;
  lastUpdated: string;
  probeCount: number;
}

/**
 * Compute attractor point as weighted centroid of high-Φ probes.
 */
export function computeAttractorPoint(probes: BasinProbe[], defaultDims: number = 64): number[] {
  if (probes.length === 0) {
    return new Array(defaultDims).fill(0);
  }
  
  const highPhiProbes = probes.filter(p => p.phi >= 0.5 && p.coordinates.length > 0);
  if (highPhiProbes.length === 0) {
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    if (withCoords.length === 0) return new Array(defaultDims).fill(0);
    
    const dims = withCoords[0].coordinates.length;
    const attractor = new Array(dims).fill(0);
    for (const probe of withCoords) {
      for (let i = 0; i < dims; i++) {
        attractor[i] += probe.coordinates[i] / withCoords.length;
      }
    }
    return attractor;
  }
  
  const dims = highPhiProbes[0].coordinates.length;
  const attractor = new Array(dims).fill(0);
  let totalWeight = 0;
  
  for (const probe of highPhiProbes) {
    const weight = probe.phi;
    totalWeight += weight;
    for (let i = 0; i < dims; i++) {
      attractor[i] += probe.coordinates[i] * weight;
    }
  }
  
  for (let i = 0; i < dims; i++) {
    attractor[i] /= totalWeight;
  }
  
  return attractor;
}

/**
 * Estimate basin volume from probe spread.
 */
export function computeBasinVolume(probes: BasinProbe[]): number {
  if (probes.length < 2) return 0;
  
  const withCoords = probes.filter(p => p.coordinates.length > 0);
  if (withCoords.length < 2) return 0;
  
  const dims = Math.min(withCoords[0].coordinates.length, 16);
  let logVolume = 0;
  
  for (let d = 0; d < dims; d++) {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const p of withCoords) {
      const val = p.coordinates[d] || 0;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    const range = maxVal - minVal;
    logVolume += Math.log(Math.max(range, 0.001));
  }
  
  return Math.min(1, Math.exp(logVolume / dims) / 10);
}

/**
 * Compute local curvature at each dimension from Φ gradient.
 */
export function computeLocalCurvature(probes: BasinProbe[]): number[] {
  if (probes.length < 3) return new Array(16).fill(0);
  
  const withCoords = probes.filter(p => p.coordinates.length > 0);
  if (withCoords.length < 3) return new Array(16).fill(0);
  
  const dims = Math.min(withCoords[0].coordinates.length, 16);
  const curvature = new Array(dims).fill(0);
  
  for (let d = 0; d < dims; d++) {
    const sorted = [...withCoords].sort((a, b) => 
      (a.coordinates[d] || 0) - (b.coordinates[d] || 0)
    );
    
    let curvSum = 0;
    for (let i = 1; i < sorted.length - 1; i++) {
      const phiPrev = sorted[i - 1].phi;
      const phiCurr = sorted[i].phi;
      const phiNext = sorted[i + 1].phi;
      curvSum += Math.abs(phiNext - 2 * phiCurr + phiPrev);
    }
    
    curvature[d] = curvSum / Math.max(1, sorted.length - 2);
  }
  
  return curvature;
}

/**
 * Compute boundary distances from attractor in each dimension.
 */
export function computeBoundaryDistances(probes: BasinProbe[], attractor: number[]): number[] {
  if (probes.length < 2) return new Array(16).fill(1);
  
  const withCoords = probes.filter(p => p.coordinates.length > 0);
  if (withCoords.length < 2) return new Array(16).fill(1);
  
  const dims = Math.min(attractor.length, 16);
  const distances = new Array(dims).fill(0);
  
  for (let d = 0; d < dims; d++) {
    const center = attractor[d];
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const p of withCoords) {
      const val = p.coordinates[d] || 0;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    distances[d] = Math.max(
      Math.abs(maxVal - center),
      Math.abs(minVal - center)
    );
  }
  
  return distances;
}

/**
 * Find resonance shells (concentric high-Φ regions around attractor).
 */
export function findResonanceShells(
  probes: BasinProbe[], 
  attractor: number[]
): BasinTopologyData['resonanceShells'] {
  const shells: BasinTopologyData['resonanceShells'] = [];
  
  const probesWithDistance = probes
    .filter(p => p.coordinates.length > 0)
    .map(p => ({
      probe: p,
      distance: fisherCoordDistance(p.coordinates, attractor),
    }))
    .sort((a, b) => a.distance - b.distance);
  
  if (probesWithDistance.length < 5) return shells;
  
  const shellWidth = 0.5;
  let currentRadius = 0;
  
  while (currentRadius < 10) {
    const inShell = probesWithDistance.filter(
      pd => pd.distance >= currentRadius && pd.distance < currentRadius + shellWidth
    );
    
    if (inShell.length >= 3) {
      const avgPhi = inShell.reduce((sum, pd) => sum + pd.probe.phi, 0) / inShell.length;
      
      if (avgPhi >= 0.5) {
        const regimes: Record<string, number> = {};
        for (const pd of inShell) {
          regimes[pd.probe.regime] = (regimes[pd.probe.regime] || 0) + 1;
        }
        const dominantRegime = Object.entries(regimes)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'linear';
        
        shells.push({
          radius: currentRadius + shellWidth / 2,
          avgPhi,
          thickness: shellWidth,
          dominantRegime,
        });
      }
    }
    
    currentRadius += shellWidth;
  }
  
  return shells;
}

/**
 * Compute flow field (natural gradient direction toward higher Φ).
 */
export function computeFlowField(
  probes: BasinProbe[], 
  attractor: number[]
): BasinTopologyData['flowField'] {
  const withCoords = probes.filter(p => p.coordinates.length > 0);
  const dims = Math.min(attractor.length, 16);
  
  const gradientDirection = new Array(dims).fill(0);
  
  if (withCoords.length >= 2) {
    const sorted = [...withCoords].sort((a, b) => b.phi - a.phi);
    const topProbes = sorted.slice(0, Math.min(5, sorted.length));
    
    for (let d = 0; d < dims; d++) {
      const avgTop = topProbes.reduce((sum, p) => sum + (p.coordinates[d] || 0), 0) / topProbes.length;
      gradientDirection[d] = avgTop - attractor[d];
    }
    
    const magnitude = Math.sqrt(gradientDirection.reduce((sum, g) => sum + g * g, 0));
    if (magnitude > 0.001) {
      for (let d = 0; d < dims; d++) {
        gradientDirection[d] /= magnitude;
      }
    }
  }
  
  const fisherMetric: number[][] = [];
  for (let i = 0; i < Math.min(dims, 8); i++) {
    const row = new Array(Math.min(dims, 8)).fill(0);
    const values = withCoords.map(p => p.coordinates[i] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, values.length);
    row[i] = 1 / Math.max(variance, 0.001);
    fisherMetric.push(row);
  }
  
  const phiValues = withCoords.map(p => p.phi);
  const phiMean = phiValues.reduce((a, b) => a + b, 0) / Math.max(1, phiValues.length);
  const phiVariance = phiValues.reduce((sum, v) => sum + (v - phiMean) ** 2, 0) / Math.max(1, phiValues.length);
  const geodesicCurvature = Math.sqrt(phiVariance);
  
  return {
    gradientDirection,
    fisherMetric,
    geodesicCurvature,
  };
}

/**
 * Find topological holes (unexplored or contradiction regions).
 */
export function findTopologicalHoles(probes: BasinProbe[]): BasinTopologyData['holes'] {
  const holes: BasinTopologyData['holes'] = [];
  const withCoords = probes.filter(p => p.coordinates.length > 0);
  
  if (withCoords.length < 10) return holes;
  
  const dims = Math.min(withCoords[0].coordinates.length, 8);
  
  const gridSize = 1.0;
  const cellPhis: Map<string, number[]> = new Map();
  
  for (const probe of withCoords) {
    const cellKey = probe.coordinates
      .slice(0, dims)
      .map(c => Math.floor(c / gridSize))
      .join(',');
    
    if (!cellPhis.has(cellKey)) cellPhis.set(cellKey, []);
    cellPhis.get(cellKey)!.push(probe.phi);
  }
  
  for (const [cellKey, phis] of Array.from(cellPhis.entries())) {
    const avgPhi = phis.reduce((a: number, b: number) => a + b, 0) / phis.length;
    
    if (avgPhi < 0.2 && phis.length >= 3) {
      const coords = cellKey.split(',').map(Number);
      const center = coords.map(c => (c + 0.5) * gridSize);
      
      holes.push({
        center,
        radius: gridSize / 2,
        type: 'contradiction',
      });
    }
  }
  
  return holes.slice(0, 10);
}

/**
 * Compute effective scale from probe complexity.
 */
export function computeEffectiveScale(probes: BasinProbe[]): number {
  const avgKappa = probes.reduce((sum, p) => sum + p.kappa, 0) / Math.max(1, probes.length);
  
  if (avgKappa < 50) return 3;
  if (avgKappa < 70) return 4;
  return 5;
}

/**
 * Compute running coupling κ at given scale.
 */
export function computeKappaAtScaleForProbes(probes: BasinProbe[], scale: number): number {
  return getKappaAtScale(scale);
}

/**
 * Full basin topology computation.
 */
export function computeBasinTopology(
  probes: BasinProbe[],
  attractorCoords?: number[]
): BasinTopologyData {
  const attractor = attractorCoords || computeAttractorPoint(probes);
  const volume = computeBasinVolume(probes);
  const curvature = computeLocalCurvature(probes);
  const boundaryDistances = computeBoundaryDistances(probes, attractor);
  const resonanceShells = findResonanceShells(probes, attractor);
  const flowField = computeFlowField(probes, attractor);
  const holes = findTopologicalHoles(probes);
  const effectiveScale = computeEffectiveScale(probes);
  const kappaAtScale = computeKappaAtScaleForProbes(probes, effectiveScale);
  
  return {
    attractorCoords: attractor,
    volume,
    curvature,
    boundaryDistances,
    resonanceShells,
    flowField,
    holes,
    effectiveScale,
    kappaAtScale,
    lastUpdated: new Date().toISOString(),
    probeCount: probes.length,
  };
}
