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
