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
