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
    files.forEach(file => formData.append('files', file));
    return postMultipart<ZeusChatResponse>(API_ROUTES.olympus.zeusChat, formData);
  }
  
  return post<ZeusChatResponse>(API_ROUTES.olympus.zeusChat, jsonParams);
}

export async function searchZeus(params: ZeusSearchParams): Promise<ZeusSearchResponse> {
  return post<ZeusSearchResponse>(API_ROUTES.olympus.zeusSearch, params);
}
