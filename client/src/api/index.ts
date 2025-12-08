/**
 * API Barrel File
 * 
 * Centralized export of all API routes, query keys, and services.
 * This is the single entry point for frontend API operations.
 * 
 * Usage Examples:
 * 
 * 1. For TanStack Query queryKey (GET requests):
 *    import { QUERY_KEYS } from '@/api';
 *    useQuery({ queryKey: QUERY_KEYS.investigation.status() });
 *    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.balance.hits() });
 * 
 * 2. For mutations (POST/PUT/DELETE):
 *    import { api } from '@/api';
 *    await api.recovery.startRecovery({ targetAddress: '1ABC...' });
 *    await api.sweeps.approveSweep(sweepId);
 * 
 * 3. For direct URL access (advanced):
 *    import { API_ROUTES } from '@/api';
 *    fetch(API_ROUTES.investigation.status)
 */

// Route manifest and query keys
export { API_ROUTES, QUERY_KEYS } from './routes';

// HTTP client utilities
export { get, post, del, put, patch } from './client';

// Service modules
import * as recovery from './services/recovery';
import * as unifiedRecovery from './services/unifiedRecovery';
import * as ocean from './services/ocean';
import * as autoCycle from './services/autoCycle';
import * as targetAddresses from './services/targetAddresses';
import * as balanceQueue from './services/balanceQueue';
import * as balanceMonitor from './services/balanceMonitor';
import * as sweeps from './services/sweeps';
import * as observer from './services/observer';
import * as qig from './services/qig';
import * as olympus from './services/olympus';
import * as consciousness from './services/consciousness';
import * as forensic from './services/forensic';

/**
 * Consolidated API object for all service operations.
 * All methods return typed, parsed JSON responses.
 * 
 * Example:
 *   const result = await api.recovery.startRecovery({ targetAddress });
 *   console.log(result.success); // TypeScript knows this is boolean
 */
export const api = {
  recovery,
  unifiedRecovery,
  ocean,
  autoCycle,
  targetAddresses,
  balanceQueue,
  balanceMonitor,
  sweeps,
  observer,
  qig,
  olympus,
  consciousness,
  forensic,
};

// Re-export individual services for direct imports
export {
  recovery,
  unifiedRecovery,
  ocean,
  autoCycle,
  targetAddresses,
  balanceQueue,
  balanceMonitor,
  sweeps,
  observer,
  qig,
  olympus,
  consciousness,
  forensic,
};

// Re-export types from services for convenience
export type { StartRecoveryParams, StartRecoveryResponse, StopRecoveryResponse } from './services/recovery';
export type { CreateSessionParams, CreateSessionResponse, StopSessionResponse } from './services/unifiedRecovery';
export type { CycleType, TriggerCycleParams, TriggerCycleResponse, BoostParams, BoostResponse } from './services/ocean';
export type { AutoCycleStatus, AutoCycleResponse } from './services/autoCycle';
export type { CreateTargetAddressParams, CreateTargetAddressResponse, DeleteTargetAddressResponse } from './services/targetAddresses';
export type { QueueActionResponse } from './services/balanceQueue';
export type { RefreshResponse } from './services/balanceMonitor';
export type { SweepActionResponse, RejectSweepParams } from './services/sweeps';
export type { StartQigSearchParams, QigSearchResponse, ClassifyAddressParams, ClassifyAddressResponse } from './services/observer';
export type { GeometricMode, EncodeParams, EncodeResponse, SimilarityParams, SimilarityResponse } from './services/qig';
export type { WarHistoryEntry, ActiveWar, ZeusChatParams, ZeusChatResponse, ZeusSearchParams, ZeusSearchResponse } from './services/olympus';
export type { ConsciousnessState } from './services/consciousness';
export type { ForensicAnalysisResult, ForensicHypothesis, ForensicHypothesesResponse } from './services/forensic';
