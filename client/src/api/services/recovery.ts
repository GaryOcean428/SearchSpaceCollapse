/**
 * Recovery Service
 * 
 * Type-safe API functions for recovery operations.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

// Request/Response types
export interface StartRecoveryParams {
  targetAddress: string;
}

export interface StopRecoveryResponse {
  success: boolean;
  message?: string;
}

export interface StartRecoveryResponse {
  success: boolean;
  message?: string;
  sessionId?: string;
}

// Service functions
export async function startRecovery(params: StartRecoveryParams): Promise<StartRecoveryResponse> {
  return post<StartRecoveryResponse>(API_ROUTES.recovery.start, params);
}

export async function stopRecovery(): Promise<StopRecoveryResponse> {
  return post<StopRecoveryResponse>(API_ROUTES.recovery.stop);
}
