/**
 * Balance Queue Service
 * 
 * Type-safe API functions for balance queue operations.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export interface QueueActionResponse {
  success: boolean;
  message?: string;
}

export async function startBackgroundQueue(): Promise<QueueActionResponse> {
  return post<QueueActionResponse>(API_ROUTES.balanceQueue.backgroundStart);
}

export async function stopBackgroundQueue(): Promise<QueueActionResponse> {
  return post<QueueActionResponse>(API_ROUTES.balanceQueue.backgroundStop);
}

export interface RetryFailedResponse {
  success: boolean;
  retried: number;
  inMemory: number;
  inDb: number;
}

export async function retryFailed(): Promise<RetryFailedResponse> {
  return post<RetryFailedResponse>(API_ROUTES.balanceQueue.retryFailed);
}
