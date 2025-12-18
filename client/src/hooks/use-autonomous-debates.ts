/**
 * React Hooks for Autonomous Debate System
 * 
 * Provides access to the autonomous debate service status,
 * active debates, and kernel observation tracking.
 * Uses project's default queryFn with credentials.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ROUTES, QUERY_KEYS } from '@/api';

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

export function useDebateServiceStatus() {
  return useQuery<DebateServiceStatus>({
    queryKey: QUERY_KEYS.olympus.debatesStatus(),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useActiveDebates() {
  return useQuery<ActiveDebatesResponse>({
    queryKey: QUERY_KEYS.olympus.debatesActive(),
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export function useObservingKernels() {
  return useQuery<ObservingKernelsResponse>({
    queryKey: QUERY_KEYS.olympus.kernelsObserving(),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useAllKernels() {
  return useQuery<AllKernelsResponse>({
    queryKey: QUERY_KEYS.olympus.kernelsAll(),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useGraduateKernel() {
  const queryClient = useQueryClient();
  
  return useMutation<GraduateResponse, Error, { kernelId: string; reason?: string }>({
    mutationFn: async ({ kernelId, reason }) => {
      const res = await apiRequest('POST', `/api/olympus/kernels/${kernelId}/graduate`, { 
        reason: reason || 'manual_graduation' 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.kernelsObserving() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.kernelsAll() });
    },
  });
}
