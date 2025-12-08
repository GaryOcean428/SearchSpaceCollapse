/**
 * Observer Service
 * 
 * Type-safe API functions for observer system operations.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export interface StartQigSearchParams {
  address: string;
  maxProbes?: number;
}

export interface QigSearchResponse {
  success: boolean;
  message?: string;
  searchId?: string;
}

export interface ClassifyAddressParams {
  address: string;
}

export interface ClassifyAddressResponse {
  success: boolean;
  format?: string;
  era?: string;
  type?: string;
}

export async function startQigSearch(
  params: StartQigSearchParams
): Promise<QigSearchResponse> {
  return post<QigSearchResponse>(API_ROUTES.observer.qigSearchStart, params);
}

export async function stopQigSearch(address: string): Promise<QigSearchResponse> {
  return post<QigSearchResponse>(API_ROUTES.observer.qigSearchStop(address));
}

export async function classifyAddress(
  params: ClassifyAddressParams
): Promise<ClassifyAddressResponse> {
  return post<ClassifyAddressResponse>(API_ROUTES.observer.classifyAddress, params);
}
