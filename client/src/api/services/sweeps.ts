/**
 * Sweeps Service
 * 
 * Type-safe API functions for sweep operations.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export interface SweepActionResponse {
  success: boolean;
  message?: string;
}

export interface RejectSweepParams {
  reason: string;
}

export async function approveSweep(id: string): Promise<SweepActionResponse> {
  return post<SweepActionResponse>(API_ROUTES.sweeps.approve(id));
}

export async function rejectSweep(
  id: string, 
  params: RejectSweepParams
): Promise<SweepActionResponse> {
  return post<SweepActionResponse>(API_ROUTES.sweeps.reject(id), params);
}

export async function broadcastSweep(id: string): Promise<SweepActionResponse> {
  return post<SweepActionResponse>(API_ROUTES.sweeps.broadcast(id));
}

export async function refreshSweep(id: string): Promise<SweepActionResponse> {
  return post<SweepActionResponse>(API_ROUTES.sweeps.refresh(id));
}
