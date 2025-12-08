/**
 * Target Addresses Service
 * 
 * Type-safe API functions for managing target Bitcoin addresses.
 */

import { post, del } from '../client';
import { API_ROUTES } from '../routes';

export interface CreateTargetAddressParams {
  address: string;
  label?: string;
}

export interface CreateTargetAddressResponse {
  success: boolean;
  message?: string;
  address?: {
    id: number;
    address: string;
    label?: string;
  };
}

export interface DeleteTargetAddressResponse {
  success: boolean;
  message?: string;
}

export async function createTargetAddress(
  params: CreateTargetAddressParams
): Promise<CreateTargetAddressResponse> {
  return post<CreateTargetAddressResponse>(API_ROUTES.targetAddresses.create, params);
}

export async function deleteTargetAddress(
  id: string | number
): Promise<DeleteTargetAddressResponse> {
  return del<DeleteTargetAddressResponse>(API_ROUTES.targetAddresses.delete(id));
}
