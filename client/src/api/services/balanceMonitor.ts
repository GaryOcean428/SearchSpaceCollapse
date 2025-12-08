/**
 * Balance Monitor Service
 * 
 * Type-safe API functions for balance monitoring.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export interface RefreshResponse {
  success: boolean;
  message?: string;
  refreshedCount?: number;
}

export async function refreshBalanceMonitor(): Promise<RefreshResponse> {
  return post<RefreshResponse>(API_ROUTES.balanceMonitor.refresh, {});
}
