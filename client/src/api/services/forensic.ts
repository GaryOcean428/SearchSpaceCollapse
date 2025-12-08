/**
 * Forensic Investigation Service
 * 
 * API operations for forensic analysis of Bitcoin addresses.
 */

import { get, post } from '../client';
import { API_ROUTES } from '../routes';

export interface ForensicAnalysisResult {
  address: string;
  format?: {
    type: string;
    version?: number;
    era?: string;
    network?: string;
  };
  forensics?: {
    address: string;
    creationBlock?: number;
    creationTimestamp?: string;
    totalReceived?: number;
    totalSent?: number;
    balance?: number;
    txCount?: number;
    siblingAddresses?: string[];
    relatedAddresses?: string[];
  };
  likelyKeyFormat?: Array<{ format: string; confidence: number; reasoning: string }>;
  isPreBIP39Era?: boolean;
  recommendations?: string[];
  geometricSignature?: {
    embedding: number[];
    confidence: number;
  };
  recoveryDifficulty?: {
    score: number;
    tier: string;
    factors: string[];
  };
  chainAnalysis?: {
    firstSeen?: string;
    lastSeen?: string;
    txCount?: number;
    balance?: number;
  };
}

export interface ForensicHypothesis {
  id: string;
  type: string;
  confidence: number;
  description: string;
  evidence: string[];
  suggestedVectors: string[];
}

export interface ForensicHypothesesResponse {
  hypotheses: ForensicHypothesis[];
  totalCount: number;
}

/**
 * Analyze a Bitcoin address for recovery potential
 */
export async function analyzeAddress(address: string): Promise<ForensicAnalysisResult> {
  return get<ForensicAnalysisResult>(API_ROUTES.forensic.analyze(address));
}

/**
 * Get generated forensic hypotheses
 */
export async function getHypotheses(): Promise<ForensicHypothesesResponse> {
  return get<ForensicHypothesesResponse>(API_ROUTES.forensic.hypotheses);
}
