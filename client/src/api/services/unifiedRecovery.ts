/**
 * Unified Recovery Service
 * 
 * Type-safe API functions for unified recovery session management.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export interface CreateSessionParams {
  targetAddress: string;
  vectors?: string[];
}

export interface CreateSessionResponse {
  success: boolean;
  sessionId?: string;
  message?: string;
}

export interface StopSessionResponse {
  success: boolean;
  message?: string;
}

export async function createSession(params: CreateSessionParams): Promise<CreateSessionResponse> {
  return post<CreateSessionResponse>(API_ROUTES.unifiedRecovery.sessions, params);
}

export async function stopSession(sessionId: string): Promise<StopSessionResponse> {
  return post<StopSessionResponse>(API_ROUTES.unifiedRecovery.stopSession(sessionId), {});
}
