/**
 * PERSISTENCE MODULE - BARREL EXPORT
 * 
 * Centralized persistence layer for the Observer Archaeology System.
 * 
 * Usage:
 *   import { storageFacade, FileJsonAdapter, createArrayAdapter } from './persistence';
 *   
 *   // Use domain-specific storage via facade
 *   const candidates = await storageFacade.candidates.getCandidates();
 *   
 *   // Create custom JSON adapter for module-specific storage
 *   const adapter = createArrayAdapter<MyType>('./data/my-data.json');
 * 
 * Migration Path:
 *   1. New code should use storageFacade for candidates and searchJobs
 *   2. Existing code using `storage` from storage.ts still works
 *   3. Over time, migrate consumers to use storageFacade
 *   4. Eventually, storage.ts becomes a thin compatibility layer
 */

export * from './interfaces';
export * from './adapters';
export { storageFacade } from './facade';
