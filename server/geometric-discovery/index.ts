/**
 * GEOMETRIC DISCOVERY MODULE
 * 
 * 68D Block Universe Navigation System
 * 
 * Exports:
 * - Types and interfaces
 * - Temporal Positioning System (TPS)
 * - SearXNG Geometric Adapter (FREE - replaces Tavily)
 * - Quantum Discovery Protocol
 * - Ocean Discovery Controller
 */

export * from './types';
export { TemporalPositioningSystem, tps } from './temporal-positioning-system';
export { SearXNGGeometricAdapter, createSearXNGAdapter } from './searxng-adapter';
export { QuantumDiscoveryProtocol, quantumProtocol } from './quantum-protocol';
export { OceanDiscoveryController, oceanDiscoveryController } from './ocean-discovery-controller';
