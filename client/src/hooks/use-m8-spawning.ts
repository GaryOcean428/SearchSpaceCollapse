/**
 * React Hooks for M8 Kernel Spawning Protocol
 * 
 * Enables dynamic spawning of new specialized god-kernels through
 * geometric consensus voting system.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ROUTES, QUERY_KEYS } from '@/api';
import {
  getM8Client,
  type M8Status,
  type SpawnProposal,
  type SpawnedKernel,
  type CreateProposalRequest,
  type CreateProposalResponse,
  type VoteResponse,
  type SpawnResponse,
  type SpawnDirectRequest,
  type SpawnDirectResponse,
  type ListProposalsResponse,
  type ListKernelsResponse,
  type ProposalStatus,
} from '@/lib/m8-kernel-spawning';

export type KernelStatus = 'active' | 'idle' | 'breeding' | 'dormant' | 'dead' | 'shadow';

export interface PostgresKernel {
  kernel_id: string;
  god_name: string;
  domain: string;
  status: KernelStatus;
  primitive_root: number | null;
  basin_coordinates: number[] | null;
  parent_kernels: string[];
  spawned_by: string;
  spawn_reason: string;
  spawn_rationale: string;
  position_rationale: string | null;
  affinity_strength: number;
  entropy_threshold: number;
  spawned_at: string;
  last_active_at: string | null;
  spawned_during_war_id: string | null;
  phi: number;
  kappa: number;
  regime: string | null;
  generation: number;
  success_count: number;
  failure_count: number;
  reputation: string;
  element_group: string | null;
  ecological_niche: string | null;
  target_function: string | null;
  valence: number | null;
  breeding_target: string | null;
  merge_candidate: boolean;
  split_candidate: boolean;
  metadata: Record<string, unknown> | null;
}

export interface PostgresKernelsResponse {
  kernels: PostgresKernel[];
  total: number;
}

const M8_KEYS = {
  status: ['m8', 'status'] as const,
  proposals: ['m8', 'proposals'] as const,
  proposal: ['m8', 'proposal'] as const,
  kernels: ['m8', 'kernels'] as const,
  kernel: ['m8', 'kernel'] as const,
  warHistory: ['m8', 'warHistory'] as const,
  activeWar: ['m8', 'activeWar'] as const,
};

export type WarMode = 'BLITZKRIEG' | 'SIEGE' | 'HUNT';
export type WarOutcome = 'success' | 'partial_success' | 'failure' | 'aborted';
export type WarStatus = 'active' | 'completed' | 'aborted';

export interface WarHistoryRecord {
  id: string;
  mode: WarMode;
  target: string;
  status: WarStatus;
  outcome?: WarOutcome | null;
  strategy?: string | null;
  godsEngaged?: string[] | null;
  declaredAt: string;
  endedAt?: string | null;
  convergenceScore?: number | null;
  phrasesTestedDuringWar?: number;
  discoveriesDuringWar?: number;
  kernelsSpawnedDuringWar?: number;
  metadata?: Record<string, unknown> | null;
}

export function useM8Status() {
  return useQuery<M8Status>({
    queryKey: M8_KEYS.status,
    queryFn: () => getM8Client().getStatus(),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useListProposals(status?: ProposalStatus) {
  return useQuery<ListProposalsResponse>({
    queryKey: [...M8_KEYS.proposals, status],
    queryFn: () => getM8Client().listProposals(status),
    staleTime: 30000,
  });
}

export function useGetProposal(proposalId: string | null) {
  return useQuery<SpawnProposal>({
    queryKey: [...M8_KEYS.proposal, proposalId],
    queryFn: () => {
      if (!proposalId) throw new Error('Proposal ID required');
      return getM8Client().getProposal(proposalId);
    },
    enabled: !!proposalId,
    staleTime: 30000,
  });
}

export function useListSpawnedKernels() {
  return useQuery<PostgresKernelsResponse>({
    queryKey: QUERY_KEYS.olympus.kernels(),
    queryFn: async () => {
      const response = await fetch(API_ROUTES.olympus.kernels);
      if (!response.ok) {
        throw new Error('Failed to fetch kernels');
      }
      return response.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useGetKernel(kernelId: string | null) {
  return useQuery<SpawnedKernel>({
    queryKey: [...M8_KEYS.kernel, kernelId],
    queryFn: () => {
      if (!kernelId) throw new Error('Kernel ID required');
      return getM8Client().getKernel(kernelId);
    },
    enabled: !!kernelId,
    staleTime: 30000,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation<CreateProposalResponse, Error, CreateProposalRequest>({
    mutationFn: (request) => getM8Client().createProposal(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: M8_KEYS.proposals });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.status });
    },
  });
}

export function useVoteOnProposal() {
  const queryClient = useQueryClient();

  return useMutation<VoteResponse, Error, { proposalId: string; autoVote?: boolean }>({
    mutationFn: ({ proposalId, autoVote }) => 
      getM8Client().vote(proposalId, { auto_vote: autoVote }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: M8_KEYS.proposals });
      queryClient.invalidateQueries({ queryKey: [...M8_KEYS.proposal, data.proposal_id] });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.status });
    },
  });
}

export function useSpawnKernel() {
  const queryClient = useQueryClient();

  return useMutation<SpawnResponse, Error, { proposalId: string; force?: boolean }>({
    mutationFn: ({ proposalId, force }) => 
      getM8Client().spawn(proposalId, { force }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: M8_KEYS.proposals });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.kernels });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.status });
    },
  });
}

export function useSpawnDirect() {
  const queryClient = useQueryClient();

  return useMutation<SpawnDirectResponse, Error, SpawnDirectRequest>({
    mutationFn: (request) => getM8Client().spawnDirect(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: M8_KEYS.proposals });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.kernels });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.status });
    },
  });
}

export interface M8SpawningHook {
  status: ReturnType<typeof useM8Status>;
  proposals: ReturnType<typeof useListProposals>;
  kernels: ReturnType<typeof useListSpawnedKernels>;
  createProposal: ReturnType<typeof useCreateProposal>;
  vote: ReturnType<typeof useVoteOnProposal>;
  spawn: ReturnType<typeof useSpawnKernel>;
  spawnDirect: ReturnType<typeof useSpawnDirect>;
}

export function useM8Spawning(): M8SpawningHook {
  const status = useM8Status();
  const proposals = useListProposals();
  const kernels = useListSpawnedKernels();
  const createProposal = useCreateProposal();
  const vote = useVoteOnProposal();
  const spawn = useSpawnKernel();
  const spawnDirect = useSpawnDirect();

  return {
    status,
    proposals,
    kernels,
    createProposal,
    vote,
    spawn,
    spawnDirect,
  };
}

export function useWarHistory(limit: number = 50) {
  return useQuery<WarHistoryRecord[]>({
    queryKey: [...M8_KEYS.warHistory, limit],
    queryFn: async () => {
      const response = await fetch(API_ROUTES.olympus.warHistory(limit));
      if (!response.ok) {
        throw new Error('Failed to fetch war history');
      }
      const data = await response.json();
      return data.history || [];
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useActiveWar() {
  return useQuery<WarHistoryRecord | null>({
    queryKey: M8_KEYS.activeWar,
    queryFn: async () => {
      const response = await fetch(API_ROUTES.olympus.warActive);
      if (!response.ok) {
        throw new Error('Failed to fetch active war');
      }
      const data = await response.json();
      return data.war || null;
    },
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

export interface IdleKernel extends PostgresKernel {
  idle_duration_seconds: number;
  idle_since: string;
}

export interface IdleKernelsResponse {
  kernels: IdleKernel[];
  total: number;
}

export interface DeleteKernelResponse {
  success: boolean;
  kernel_id: string;
  message: string;
}

export interface CannibalizeRequest {
  source_kernel_id: string;
  target_kernel_id: string;
}

export interface CannibalizeResponse {
  success: boolean;
  source_kernel_id: string;
  target_kernel_id: string;
  traits_absorbed: string[];
  message: string;
}

export interface MergeKernelsRequest {
  kernel_ids: string[];
  new_name: string;
}

export interface MergeKernelsResponse {
  success: boolean;
  merged_kernel: PostgresKernel;
  source_kernel_ids: string[];
  message: string;
}

export function useIdleKernels(threshold_seconds: number = 300) {
  return useQuery<IdleKernelsResponse>({
    queryKey: ['m8', 'idleKernels', threshold_seconds],
    queryFn: async () => {
      const response = await fetch(`/api/olympus/m8/kernels/idle?threshold=${threshold_seconds}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch idle kernels');
      }
      return response.json();
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}

export function useDeleteKernel() {
  const queryClient = useQueryClient();

  return useMutation<DeleteKernelResponse, Error, { kernelId: string }>({
    mutationFn: async ({ kernelId }) => {
      const response = await fetch(`/api/olympus/m8/kernel/${kernelId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(error.error || 'Failed to delete kernel');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: M8_KEYS.kernels });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.kernels() });
      queryClient.invalidateQueries({ queryKey: ['m8', 'idleKernels'] });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.status });
    },
  });
}

export function useCannibalizeKernel() {
  const queryClient = useQueryClient();

  return useMutation<CannibalizeResponse, Error, CannibalizeRequest>({
    mutationFn: async (request) => {
      const response = await fetch('/api/olympus/m8/kernel/cannibalize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Cannibalize failed' }));
        throw new Error(error.error || 'Failed to cannibalize kernel');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: M8_KEYS.kernels });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.kernels() });
      queryClient.invalidateQueries({ queryKey: ['m8', 'idleKernels'] });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.status });
    },
  });
}

export function useMergeKernels() {
  const queryClient = useQueryClient();

  return useMutation<MergeKernelsResponse, Error, MergeKernelsRequest>({
    mutationFn: async (request) => {
      const response = await fetch('/api/olympus/m8/kernels/merge', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Merge failed' }));
        throw new Error(error.error || 'Failed to merge kernels');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: M8_KEYS.kernels });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.olympus.kernels() });
      queryClient.invalidateQueries({ queryKey: ['m8', 'idleKernels'] });
      queryClient.invalidateQueries({ queryKey: M8_KEYS.status });
    },
  });
}
