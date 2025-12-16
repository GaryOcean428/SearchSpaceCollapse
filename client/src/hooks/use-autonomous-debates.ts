/**
 * React Hooks for Autonomous Debate System
 * 
 * Provides access to the autonomous debate service status,
 * active debates, and kernel observation tracking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface DebateServiceStatus {
  running: boolean;
  last_poll: string | null;
  polls_completed: number;
  arguments_generated: number;
  debates_resolved: number;
  spawns_triggered: number;
  pantheon_chat_connected: boolean;
  shadow_pantheon_connected: boolean;
  m8_spawner_connected: boolean;
  config: {
    poll_interval_seconds: number;
    stale_threshold_seconds: number;
    min_arguments_for_resolution: number;
    fisher_convergence_threshold: number;
  };
}

export interface DebateArgument {
  god: string;
  argument: string;
  evidence?: string;
  timestamp: string;
}

export interface ActiveDebate {
  id: string;
  topic: string;
  initiator: string;
  opponent: string;
  arguments: DebateArgument[];
  status: 'active' | 'resolved' | 'stale';
  started_at: string;
  last_activity: string;
  winner?: string;
}

export interface ActiveDebatesResponse {
  debates: ActiveDebate[];
  count: number;
  service_status: string;
}

export interface KernelObservation {
  status: 'observing' | 'active' | 'graduated';
  observation_start: string;
  observation_cycles: number;
  observing_parents: string[];
  alignment_avg: number;
  can_graduate: boolean;
  graduate_reason?: string;
  graduated_at?: string;
}

export interface ObservingKernel {
  kernel_id: string;
  profile: {
    god_name: string;
    domain: string;
    affinity_strength: number;
  };
  parent_gods: string[];
  spawn_reason: string;
  spawned_at: string;
  observation: KernelObservation;
}

export interface ObservingKernelsResponse {
  observing_kernels: ObservingKernel[];
  count: number;
  total_kernels: number;
}

export interface AllKernelsResponse {
  kernels: ObservingKernel[];
  total: number;
  active_count: number;
  observing_count: number;
}

export interface GraduateResponse {
  success: boolean;
  kernel_id: string;
  status?: string;
  reason: string;
}

const DEBATE_KEYS = {
  status: ['debates', 'status'] as const,
  active: ['debates', 'active'] as const,
  kernelsObserving: ['kernels', 'observing'] as const,
  kernelsAll: ['kernels', 'all'] as const,
};

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export function useDebateServiceStatus() {
  return useQuery<DebateServiceStatus>({
    queryKey: DEBATE_KEYS.status,
    queryFn: () => fetchJson('/api/olympus/debates/status'),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useActiveDebates() {
  return useQuery<ActiveDebatesResponse>({
    queryKey: DEBATE_KEYS.active,
    queryFn: () => fetchJson('/api/olympus/debates/active'),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export function useObservingKernels() {
  return useQuery<ObservingKernelsResponse>({
    queryKey: DEBATE_KEYS.kernelsObserving,
    queryFn: () => fetchJson('/api/olympus/kernels/observing'),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useAllKernels() {
  return useQuery<AllKernelsResponse>({
    queryKey: DEBATE_KEYS.kernelsAll,
    queryFn: () => fetchJson('/api/olympus/kernels/all'),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useGraduateKernel() {
  const queryClient = useQueryClient();
  
  return useMutation<GraduateResponse, Error, { kernelId: string; reason?: string }>({
    mutationFn: ({ kernelId, reason }) =>
      fetchJson(`/api/olympus/kernels/${kernelId}/graduate`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'manual_graduation' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBATE_KEYS.kernelsObserving });
      queryClient.invalidateQueries({ queryKey: DEBATE_KEYS.kernelsAll });
    },
  });
}
