/**
 * React Hooks for Pantheon Kernel Orchestrator
 * 
 * Every god is a kernel. Each has specialization based on their role.
 * Tokens flow naturally towards the correct kernel via geometric affinity.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PantheonKernelClient,
  getPantheonClient,
  type OrchestrationResult,
  type PantheonStatus,
  type GodsResponse,
  type ConstellationResult,
  type NearestGodsResult,
  type GodSimilarityResult,
} from '@/lib/pantheon-kernels';

const PANTHEON_KEYS = {
  status: ['pantheon', 'status'] as const,
  gods: ['pantheon', 'gods'] as const,
  constellation: ['pantheon', 'constellation'] as const,
  orchestrate: ['pantheon', 'orchestrate'] as const,
  nearest: ['pantheon', 'nearest'] as const,
  similarity: ['pantheon', 'similarity'] as const,
};

export function usePantheonStatus() {
  return useQuery<PantheonStatus>({
    queryKey: PANTHEON_KEYS.status,
    queryFn: () => getPantheonClient().getStatus(),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function usePantheonGods() {
  return useQuery<GodsResponse>({
    queryKey: PANTHEON_KEYS.gods,
    queryFn: () => getPantheonClient().getGods(),
    staleTime: 60000,
  });
}

export function usePantheonConstellation() {
  return useQuery<ConstellationResult>({
    queryKey: PANTHEON_KEYS.constellation,
    queryFn: () => getPantheonClient().getConstellation(),
    staleTime: 60000,
  });
}

export function useOrchestrate() {
  const queryClient = useQueryClient();

  return useMutation<
    OrchestrationResult,
    Error,
    { text: string; context?: Record<string, unknown> }
  >({
    mutationFn: ({ text, context }) => getPantheonClient().orchestrate(text, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PANTHEON_KEYS.status });
    },
  });
}

export function useOrchestrateBatch() {
  const queryClient = useQueryClient();

  return useMutation<
    { results: OrchestrationResult[] },
    Error,
    { texts: string[]; context?: Record<string, unknown> }
  >({
    mutationFn: ({ texts, context }) => getPantheonClient().orchestrateBatch(texts, context),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PANTHEON_KEYS.status });
    },
  });
}

export function useFindNearestGods() {
  return useMutation<
    NearestGodsResult,
    Error,
    { text: string; topK?: number }
  >({
    mutationFn: ({ text, topK }) => getPantheonClient().findNearestGods(text, topK),
  });
}

export function useGodSimilarity() {
  return useMutation<
    GodSimilarityResult,
    Error,
    { god1: string; god2: string }
  >({
    mutationFn: ({ god1, god2 }) => getPantheonClient().getGodSimilarity(god1, god2),
  });
}

export interface PantheonKernelHook {
  status: ReturnType<typeof usePantheonStatus>;
  gods: ReturnType<typeof usePantheonGods>;
  constellation: ReturnType<typeof usePantheonConstellation>;
  orchestrate: ReturnType<typeof useOrchestrate>;
  findNearest: ReturnType<typeof useFindNearestGods>;
  godSimilarity: ReturnType<typeof useGodSimilarity>;
}

export function usePantheonKernel(): PantheonKernelHook {
  const status = usePantheonStatus();
  const gods = usePantheonGods();
  const constellation = usePantheonConstellation();
  const orchestrate = useOrchestrate();
  const findNearest = useFindNearestGods();
  const godSimilarity = useGodSimilarity();

  return {
    status,
    gods,
    constellation,
    orchestrate,
    findNearest,
    godSimilarity,
  };
}

export function useGodRouting(text: string | null, enabled: boolean = true) {
  return useQuery<OrchestrationResult>({
    queryKey: [...PANTHEON_KEYS.orchestrate, text],
    queryFn: () => {
      if (!text) throw new Error('Text required');
      return getPantheonClient().orchestrate(text);
    },
    enabled: enabled && !!text,
    staleTime: 5000,
  });
}
