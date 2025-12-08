/**
 * QIG (Quantum Information Geometry) Service
 * 
 * Type-safe API functions for geometric kernel operations.
 */

import { post } from '../client';
import { API_ROUTES } from '../routes';

export type GeometricMode = 'semantic' | 'phonetic' | 'structural';

export interface EncodeParams {
  text: string;
  mode: GeometricMode;
}

export interface EncodeResponse {
  success: boolean;
  embedding?: number[];
  coordinates?: number[];
}

export interface SimilarityParams {
  text1: string;
  text2: string;
  mode: GeometricMode;
}

export interface SimilarityResponse {
  success: boolean;
  similarity?: number;
  distance?: number;
}

export async function encodeText(params: EncodeParams): Promise<EncodeResponse> {
  return post<EncodeResponse>(API_ROUTES.qig.geometricEncode, params);
}

export async function computeSimilarity(params: SimilarityParams): Promise<SimilarityResponse> {
  return post<SimilarityResponse>(API_ROUTES.qig.geometricSimilarity, params);
}
