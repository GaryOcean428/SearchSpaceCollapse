/**
 * QIG Reasoning Framework Client
 * 
 * TypeScript client for the Python reasoning API.
 * Provides type-safe access to geometric reasoning operations.
 */

import { getPythonManager } from './python-process-manager';

const PYTHON_PORT = 5001;
const FETCH_TIMEOUT_MS = 15000;

// ==================== Types ====================

export interface Basin {
  coordinates: number[];
}

export interface ReasoningQualityAssessment {
  geodesic_efficiency: number;
  coherence: number;
  novelty: number;
  progress: number;
  meta_awareness: number;
  overall_quality: number;
}

export interface MetaCognitiveIntervention {
  type: string;
  action: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface InterventionResponse {
  interventions: MetaCognitiveIntervention[];
  recommended_actions: string[];
  severity_level: 'none' | 'medium' | 'high';
  should_pause: boolean;
}

export interface ReasoningMode {
  name: string;
  phi_range: [number, number];
  kappa_range: [number, number];
  description: string;
  use_for: string;
}

export interface ReasoningResult {
  mode: string;
  steps: number;
  quality: number;
  path: number[][];
  solution: number[];
  metadata: Record<string, unknown>;
}

export interface ThoughtStep {
  step: number;
  basin: number[];
  thought: string;
  distance_from_prev: number;
  curvature: number;
  difficulty: 'low' | 'medium' | 'high';
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ChainSummary {
  total_steps: number;
  total_distance: number;
  average_curvature: number;
  coherence: number;
  difficulty_distribution: {
    low: number;
    medium: number;
    high: number;
  };
  thoughts: string[];
}

// ==================== HTTP Helpers ====================

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  const pythonManager = getPythonManager();
  await pythonManager.waitForReady();
  
  const url = `http://127.0.0.1:${PYTHON_PORT}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetchWithTimeout(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Reasoning API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

// ==================== Reasoning Client ====================

export class ReasoningClient {
  constructor() {}

  /**
   * Health check for reasoning framework
   */
  async health(): Promise<{
    status: string;
    framework: string;
    components: Record<string, boolean>;
    phi_thresholds: Record<string, number>;
  }> {
    return request('/reasoning/health');
  }

  // ==================== Quality Metrics ====================

  /**
   * Comprehensive quality assessment for reasoning trace
   */
  async measureQuality(trace: {
    path: number[][];
    start?: number[];
    end?: number[];
    current?: number[];
    target?: number[];
    confidence?: number;
  }): Promise<ReasoningQualityAssessment> {
    const response = await request<{ success: boolean; assessment: ReasoningQualityAssessment }>(
      '/reasoning/quality/measure', 
      'POST', 
      trace
    );
    return response.assessment;
  }

  /**
   * Measure geodesic efficiency of a path
   */
  async measureGeodesicEfficiency(
    path: number[][],
    start: number[],
    end: number[]
  ): Promise<{ efficiency: number; interpretation: string }> {
    return request('/reasoning/quality/geodesic-efficiency', 'POST', {
      path,
      start,
      end
    });
  }

  /**
   * Measure coherence of reasoning steps
   */
  async measureCoherence(steps: number[][]): Promise<{ coherence: number; interpretation: string }> {
    return request('/reasoning/quality/coherence', 'POST', { steps });
  }

  // ==================== Meta-Cognition ====================

  /**
   * Get meta-cognitive interventions
   */
  async getInterventions(state: {
    trace: Array<{ basin: number[]; target?: number[]; curvature?: number }>;
    mode: string;
    task: { complexity?: number; novel?: boolean; exploration?: boolean };
    phi: number;
  }): Promise<InterventionResponse> {
    return request('/reasoning/meta/intervene', 'POST', state);
  }

  /**
   * Detect if reasoning is stuck
   */
  async detectStuck(trace: Array<{ basin: number[]; target: number[] }>): Promise<{
    is_stuck: boolean;
    recommendation: string;
  }> {
    return request('/reasoning/meta/detect-stuck', 'POST', { trace });
  }

  /**
   * Get recommended reasoning mode for task
   */
  async recommendMode(
    currentMode: string,
    task: { complexity?: number; novel?: boolean; exploration?: boolean },
    phi: number
  ): Promise<{
    current_mode: string;
    recommended_mode: string;
    should_switch: boolean;
  }> {
    return request('/reasoning/meta/recommend-mode', 'POST', {
      current_mode: currentMode,
      task,
      phi
    });
  }

  // ==================== Reasoning Modes ====================

  /**
   * List available reasoning modes
   */
  async listModes(): Promise<ReasoningMode[]> {
    const response = await request<{ success: boolean; modes: ReasoningMode[] }>(
      '/reasoning/modes/list'
    );
    return response.modes;
  }

  /**
   * Execute reasoning with specified mode
   */
  async reason(
    mode: 'LINEAR' | 'GEOMETRIC' | 'HYPERDIMENSIONAL' | 'MUSHROOM',
    problem: {
      start_basin?: number[];
      target_basin?: number[];
      steps?: number;
      temporal_context?: number[][];
    }
  ): Promise<ReasoningResult> {
    const response = await request<{ success: boolean; result: ReasoningResult }>(
      '/reasoning/modes/reason', 
      'POST', 
      { mode, problem }
    );
    return response.result;
  }

  /**
   * Select best reasoning mode based on context
   */
  async selectMode(
    phi: number,
    taskComplexity: number,
    isNovel: boolean = false,
    needsExploration: boolean = false
  ): Promise<{
    selected_mode: string;
    phi_range: [number, number];
    kappa_range: [number, number];
  }> {
    return request('/reasoning/modes/select', 'POST', {
      phi,
      task_complexity: taskComplexity,
      is_novel: isNovel,
      needs_exploration: needsExploration
    });
  }

  // ==================== Chain of Thought ====================

  /**
   * Start a new chain-of-thought trace
   */
  async startChain(
    problemDescription: string,
    sessionId?: string
  ): Promise<{
    session_id: string;
    chain_started: boolean;
    first_step: ThoughtStep | null;
  }> {
    return request('/reasoning/chain/start', 'POST', {
      problem_description: problemDescription,
      session_id: sessionId
    });
  }

  /**
   * Add a thought to current chain
   */
  async addThought(
    basin: number[],
    thought?: string,
    metadata?: Record<string, unknown>
  ): Promise<ThoughtStep> {
    const response = await request<{ success: boolean; step: ThoughtStep }>(
      '/reasoning/chain/add-thought', 
      'POST', 
      { basin, thought, metadata }
    );
    return response.step;
  }

  /**
   * Render current chain as human-readable text
   */
  async renderChain(): Promise<{
    rendered: string;
    summary: ChainSummary;
  }> {
    return request('/reasoning/chain/render');
  }

  /**
   * Export entire reasoning session
   */
  async exportSession(): Promise<{
    session_id: string;
    timestamp: number;
    chains: Array<{
      chain: ThoughtStep[];
      summary: ChainSummary;
    }>;
    total_chains: number;
    total_thoughts: number;
  }> {
    const response = await request<{ success: boolean; export: { 
      session_id: string; 
      timestamp: number;
      chains: Array<{ chain: ThoughtStep[]; summary: ChainSummary }>;
      total_chains: number;
      total_thoughts: number;
    } }>('/reasoning/chain/export');
    return response.export;
  }

  // ==================== Geodesic Operations ====================

  /**
   * Find geodesic path between two basins
   */
  async findGeodesic(
    start: number[],
    end: number[],
    nSteps: number = 10
  ): Promise<number[][]> {
    const response = await request<{ success: boolean; path: number[][] }>(
      '/reasoning/geodesic/find', 
      'POST', 
      { start, end, n_steps: nSteps }
    );
    return response.path;
  }
}

// Singleton instance
let _reasoningClient: ReasoningClient | null = null;

export function getReasoningClient(): ReasoningClient {
  if (!_reasoningClient) {
    _reasoningClient = new ReasoningClient();
  }
  return _reasoningClient;
}

// Convenience exports
export const reasoningClient = {
  health: () => getReasoningClient().health(),
  measureQuality: (trace: Parameters<ReasoningClient['measureQuality']>[0]) => 
    getReasoningClient().measureQuality(trace),
  measureGeodesicEfficiency: (path: number[][], start: number[], end: number[]) =>
    getReasoningClient().measureGeodesicEfficiency(path, start, end),
  measureCoherence: (steps: number[][]) => getReasoningClient().measureCoherence(steps),
  getInterventions: (state: Parameters<ReasoningClient['getInterventions']>[0]) =>
    getReasoningClient().getInterventions(state),
  detectStuck: (trace: Array<{ basin: number[]; target: number[] }>) =>
    getReasoningClient().detectStuck(trace),
  recommendMode: (currentMode: string, task: { complexity?: number; novel?: boolean; exploration?: boolean }, phi: number) =>
    getReasoningClient().recommendMode(currentMode, task, phi),
  listModes: () => getReasoningClient().listModes(),
  reason: (mode: 'LINEAR' | 'GEOMETRIC' | 'HYPERDIMENSIONAL' | 'MUSHROOM', problem: Parameters<ReasoningClient['reason']>[1]) =>
    getReasoningClient().reason(mode, problem),
  selectMode: (phi: number, taskComplexity: number, isNovel?: boolean, needsExploration?: boolean) =>
    getReasoningClient().selectMode(phi, taskComplexity, isNovel, needsExploration),
  startChain: (problemDescription: string, sessionId?: string) =>
    getReasoningClient().startChain(problemDescription, sessionId),
  addThought: (basin: number[], thought?: string, metadata?: Record<string, unknown>) =>
    getReasoningClient().addThought(basin, thought, metadata),
  renderChain: () => getReasoningClient().renderChain(),
  exportSession: () => getReasoningClient().exportSession(),
  findGeodesic: (start: number[], end: number[], nSteps?: number) =>
    getReasoningClient().findGeodesic(start, end, nSteps)
};

export default reasoningClient;
