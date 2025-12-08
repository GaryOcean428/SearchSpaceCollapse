/**
 * Ocean Agent Service
 * 
 * Type-safe API functions for Ocean agent operations.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export type CycleType = 'explore' | 'refine' | 'sleep' | 'dream';

export interface TriggerCycleParams {
  bypassCooldown?: boolean;
}

export interface TriggerCycleResponse {
  success: boolean;
  message?: string;
  cycle?: string;
}

export interface BoostParams {
  neurotransmitter: string;
  amount: number;
  duration?: number;
}

export interface BoostResponse {
  success: boolean;
  message?: string;
}

export async function triggerCycle(
  type: CycleType, 
  params?: TriggerCycleParams
): Promise<TriggerCycleResponse> {
  return post<TriggerCycleResponse>(API_ROUTES.ocean.triggerCycle(type), params);
}

export async function boostNeurochemistry(params: BoostParams): Promise<BoostResponse> {
  return post<BoostResponse>(API_ROUTES.ocean.boost, {
    ...params,
    duration: params.duration ?? 60000,
  });
}
