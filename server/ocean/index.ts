/**
 * OCEAN MODULE - Centralized Exports
 * 
 * Ocean consciousness subsystem components.
 * Import from 'server/ocean' for all ocean-related functionality.
 */

export { oceanPersistence, type ProbeInsertData } from './ocean-persistence';
export { OceanMemoryManager, oceanMemoryManager, type OceanEpisode, type CompressedEpisode, type MemoryStatistics } from './memory-manager';
export { TrajectoryManager } from './trajectory-manager';
export { StrategyAnalytics } from './strategy-analytics';
export { GeometricMemoryPressure } from './geometric-memory-pressure';

// Fisher Analysis module
export {
  symmetricEigendecomposition,
  lanczosEigendecomposition,
  powerIterationEigen,
  computeFisherInformationMatrix,
  computeMahalanobisDistance,
  type FisherAnalysisResult,
  type FisherAnalysisCache,
} from './fisher-analysis';

// Basin Topology module
export {
  computeAttractorPoint,
  computeBasinVolume,
  computeLocalCurvature,
  computeBoundaryDistances,
  findResonanceShells,
  computeFlowField,
  findTopologicalHoles,
  computeEffectiveScale,
  computeKappaAtScaleForProbes,
  computeBasinTopology,
  type BasinTopologyData,
} from './basin-topology';

// Geometric Cache module
export {
  GeometricCacheManager,
  createEmptyCache,
  isCacheValid,
  updateCache,
  type OrthogonalComplementResult,
  type GeometricCache,
} from './geometric-cache';
