/**
 * Olympus Service
 * 
 * Type-safe API functions for Olympus chat and war operations.
 */

import { get, post, del, postMultipart } from '../client';
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
  session_id?: string;
}

export interface ZeusSession {
  session_id: string;
  title: string;
  message_count: number;
  last_phi: number;
  created_at: string;
  updated_at: string;
}

export interface ZeusSessionMessage {
  role: 'human' | 'zeus';
  content: string;
  metadata?: Record<string, unknown>;
  phi_estimate: number;
  created_at: string;
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

export interface WarDeclarationParams {
  target: string;
}

export interface WarDeclarationResponse {
  id?: string;
  mode: string;
  target: string;
  status: string;
  strategy?: string;
  gods_engaged?: string[];
  success?: boolean;
  error?: string;
}

export async function declareBlitzkrieg(params: WarDeclarationParams): Promise<WarDeclarationResponse> {
  return post<WarDeclarationResponse>(API_ROUTES.olympus.warBlitzkrieg, params);
}

export async function declareSiege(params: WarDeclarationParams): Promise<WarDeclarationResponse> {
  return post<WarDeclarationResponse>(API_ROUTES.olympus.warSiege, params);
}

export async function declareHunt(params: WarDeclarationParams): Promise<WarDeclarationResponse> {
  return post<WarDeclarationResponse>(API_ROUTES.olympus.warHunt, params);
}

export async function endWar(): Promise<{ success: boolean }> {
  return post<{ success: boolean }>(API_ROUTES.olympus.warEnd, {});
}

export async function sendZeusChat(params: ZeusChatParams): Promise<ZeusChatResponse & { session_id?: string }> {
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
    if (params.session_id) {
      formData.append('session_id', params.session_id);
    }
    files.forEach(file => formData.append('files', file));
    return postMultipart<ZeusChatResponse & { session_id?: string }>(API_ROUTES.olympus.zeusChat, formData);
  }
  
  return post<ZeusChatResponse & { session_id?: string }>(API_ROUTES.olympus.zeusChat, jsonParams);
}

export async function getZeusSessions(limit: number = 20): Promise<{ sessions: ZeusSession[] }> {
  return get<{ sessions: ZeusSession[] }>(`/api/olympus/zeus/sessions?limit=${limit}`);
}

export async function getZeusSessionMessages(sessionId: string): Promise<{ messages: ZeusSessionMessage[], session_id: string }> {
  return get<{ messages: ZeusSessionMessage[], session_id: string }>(`/api/olympus/zeus/sessions/${sessionId}/messages`);
}

export async function createZeusSession(title?: string): Promise<{ session_id: string, title: string }> {
  return post<{ session_id: string, title: string }>('/api/olympus/zeus/sessions', { title: title || 'New Conversation' });
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

// ==================== M8 KERNEL SPAWNING ====================

export interface CannibalizeRequest {
  source_id: string;
  target_id: string;
}

export interface CannibalizeResponse {
  success: boolean;
  source_god?: string;
  target_god?: string;
  fisher_distance?: number;
  merged_metrics?: Record<string, number>;
  error?: string;
}

export interface MergeKernelsRequest {
  kernel_ids: string[];
}

export interface MergeKernelsResponse {
  success: boolean;
  new_kernel?: Record<string, unknown>;
  merged_from?: string[];
  error?: string;
}

export interface AutoCannibalizeRequest {
  idle_threshold?: number;
}

export interface AutoCannibalizeResponse {
  success: boolean;
  source_id?: string;
  source_god?: string;
  target_id?: string;
  target_god?: string;
  auto_selected: boolean;
  selection_criteria: Record<string, unknown>;
  error?: string;
}

export interface AutoMergeRequest {
  idle_threshold?: number;
  max_to_merge?: number;
}

export interface AutoMergeResponse {
  success: boolean;
  new_kernel?: Record<string, unknown>;
  merged_from?: { kernel_ids: string[]; god_names: string[] };
  auto_selected: boolean;
  selection_criteria: Record<string, unknown>;
  error?: string;
}

export async function deleteKernel(kernelId: string): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(API_ROUTES.olympus.m8.kernel(kernelId));
}

export async function cannibalizeKernel(params: CannibalizeRequest): Promise<CannibalizeResponse> {
  return post<CannibalizeResponse>(API_ROUTES.olympus.m8.cannibalize, params);
}

export async function mergeKernels(params: MergeKernelsRequest): Promise<MergeKernelsResponse> {
  return post<MergeKernelsResponse>(API_ROUTES.olympus.m8.merge, params);
}

export async function autoCannibalize(params: AutoCannibalizeRequest): Promise<AutoCannibalizeResponse> {
  return post<AutoCannibalizeResponse>(API_ROUTES.olympus.m8.autoCannibalize, params);
}

export async function autoMerge(params: AutoMergeRequest): Promise<AutoMergeResponse> {
  return post<AutoMergeResponse>(API_ROUTES.olympus.m8.autoMerge, params);
}
