/**
 * Olympus Service
 * 
 * Type-safe API functions for Olympus chat and war operations.
 */

import { get, post, postMultipart } from '../client';
import { API_ROUTES } from '../routes';

export interface WarHistoryEntry {
  id: string;
  topic: string;
  winner?: string;
  timestamp: string;
}

export interface ActiveWar {
  id: string;
  topic: string;
  participants: string[];
  status: string;
}

export interface ZeusChatParams {
  message: string;
  context?: string;
  files?: File[];
  validate_only?: boolean;
}

export interface ZeusChatMetadata {
  actions_taken?: string[];
  pantheon_consulted?: string[];
  type?: string;
  [key: string]: unknown;
}

export interface ZeusChatResponse {
  success: boolean;
  response?: string;
  message?: string;
  metadata?: ZeusChatMetadata;
}

export interface ZeusSearchParams {
  query: string;
}

export interface ZeusSearchResponse {
  success: boolean;
  response?: string;
  results?: Array<{ text: string; score: number }>;
  metadata?: ZeusChatMetadata;
}

export async function getWarHistory(limit: number = 10): Promise<WarHistoryEntry[]> {
  return get<WarHistoryEntry[]>(API_ROUTES.olympus.warHistory(limit));
}

export async function getActiveWar(): Promise<ActiveWar | null> {
  return get<ActiveWar | null>(API_ROUTES.olympus.warActive);
}

export async function sendZeusChat(params: ZeusChatParams): Promise<ZeusChatResponse> {
  const { files, ...jsonParams } = params;
  
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append('message', params.message);
    if (params.context) {
      formData.append('conversation_history', params.context);
    }
    if (params.validate_only) {
      formData.append('validate_only', 'true');
    }
    files.forEach(file => formData.append('files', file));
    return postMultipart<ZeusChatResponse>(API_ROUTES.olympus.zeusChat, formData);
  }
  
  return post<ZeusChatResponse>(API_ROUTES.olympus.zeusChat, jsonParams);
}

export interface GeometricValidationResult {
  is_valid: boolean;
  phi: number;
  kappa: number;
  regime: string;
  validate_only: true;
}

export async function validateZeusInput(message: string): Promise<GeometricValidationResult> {
  return post<GeometricValidationResult>(API_ROUTES.olympus.zeusChat, { 
    message, 
    validate_only: true 
  });
}

export async function searchZeus(params: ZeusSearchParams): Promise<ZeusSearchResponse> {
  return post<ZeusSearchResponse>(API_ROUTES.olympus.zeusSearch, params);
}

/**
 * Geometric validation is handled internally by Zeus chat.
 * Use the sendZeusChat action - validation errors are returned in the response.
 * 
 * This follows the centralized action pattern where:
 * - Validation happens server-side within the chat flow
 * - Errors include phi, kappa, regime metrics
 * - No separate validation endpoint is exposed
 */
export interface GeometricValidationError {
  error: string;
  phi: number;
  kappa: number;
  regime: string;
  validation_type: 'geometric';
}

// ==================== SHADOW PANTHEON ====================

export interface ShadowGodStatus {
  name: string;
  status: 'idle' | 'active' | 'covert';
  activity: string;
}

export interface ShadowPantheonStatus {
  active_operations: number;
  stealth_level: number;
  gods: ShadowGodStatus[];
}

export interface ShadowPollResponse {
  success: boolean;
  assessments: Record<string, unknown>;
  consensus?: string;
}

export interface ShadowActResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}

export async function getShadowStatus(): Promise<ShadowPantheonStatus> {
  return get<ShadowPantheonStatus>(API_ROUTES.olympus.shadow.status);
}

export async function pollShadowPantheon(target: string): Promise<ShadowPollResponse> {
  return post<ShadowPollResponse>(API_ROUTES.olympus.shadow.poll, { target });
}

export async function triggerShadowAct(god: string, params: Record<string, unknown>): Promise<ShadowActResponse> {
  return post<ShadowActResponse>(API_ROUTES.olympus.shadow.act(god), params);
}
