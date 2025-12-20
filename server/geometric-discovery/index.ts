/**
 * GEOMETRIC DISCOVERY MODULE
 * 
 * 68D Block Universe Navigation System
 * 
 * Exports:
 * - Types and interfaces
 * - Temporal Positioning System (TPS)
 * - SearXNG Geometric Adapter (FREE - replaces Tavily)
 * - Google Search Provider (FREE - direct Google scraping)
 * - Multi-Search Orchestrator (parallel SearXNG + Google)
 * - Quantum Discovery Protocol
 * - Ocean Discovery Controller
 */

export * from './types';
export { TemporalPositioningSystem, tps } from './temporal-positioning-system';
export { SearXNGGeometricAdapter, createSearXNGAdapter } from './searxng-adapter';
export { GoogleSearchProvider, getGoogleSearchProvider } from './google-search-provider';
export { 
  MultiSearchOrchestrator, 
  getMultiSearchOrchestrator,
  createMultiSearchOrchestrator,
  type SearchMode,
  type MultiSearchConfig,
  type ProviderHealth
} from './multi-search-orchestrator';
export { QuantumDiscoveryProtocol, quantumProtocol } from './quantum-protocol';
export { OceanDiscoveryController, oceanDiscoveryController } from './ocean-discovery-controller';
