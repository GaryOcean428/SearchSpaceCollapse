/**
 * Auto-Cycle Management Service
 * 
 * Type-safe API functions for autonomous cycle management.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export interface AutoCycleStatus {
  isEnabled: boolean;
  currentCycle?: string;
  cycleCount?: number;
}

export interface AutoCycleResponse {
  success: boolean;
  message?: string;
  status?: AutoCycleStatus;
}

export async function enableAutoCycle(): Promise<AutoCycleResponse> {
  return post<AutoCycleResponse>(API_ROUTES.autoCycle.enable, {});
}

export async function disableAutoCycle(): Promise<AutoCycleResponse> {
  return post<AutoCycleResponse>(API_ROUTES.autoCycle.disable, {});
}

export async function toggleAutoCycle(currentlyEnabled: boolean): Promise<AutoCycleResponse> {
  const endpoint = currentlyEnabled 
    ? API_ROUTES.autoCycle.disable 
    : API_ROUTES.autoCycle.enable;
  return post<AutoCycleResponse>(endpoint, {});
}
