/**
 * React Hook for Pure Geometric Kernels
 * 
 * Provides easy access to geometric text encoding with three modes:
 * - direct: Entropy-based segmentation → Basin coordinates
 * - e8: E8 lattice clustering (via API)
 * - byte: Byte-level with geometric embeddings
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  GeometricKernel, 
  DirectGeometricEncoder,
  ByteLevelGeometric,
  KernelMode,
  EncodingResult,
  SimilarityResult,
  BASIN_DIM,
} from '@/lib/geometric-kernels';
import { apiRequest } from '@/lib/queryClient';
import { API_ROUTES, QUERY_KEYS } from '@/api';

interface UseGeometricKernelOptions {
  mode?: KernelMode;
  useAPI?: boolean;
}

interface GeometricKernelState {
  mode: KernelMode;
  isReady: boolean;
  stats: Record<string, unknown>;
}

export function useGeometricKernel(options: UseGeometricKernelOptions = {}) {
  const { mode = 'direct', useAPI = false } = options;
  
  const [currentMode, setCurrentMode] = useState<KernelMode>(mode);
  
  const kernel = useMemo(() => {
    if (useAPI) return null;
    return new GeometricKernel({ mode: currentMode });
  }, [currentMode, useAPI]);
  
  const { data: apiStatus } = useQuery({
    queryKey: QUERY_KEYS.qig.geometricStatus(),
    enabled: useAPI,
  });
  
  const encodeMutation = useMutation({
    mutationFn: async ({ text, mode: encodeMode }: { text: string; mode?: KernelMode }) => {
      const targetMode = encodeMode ?? currentMode;
      
      if (useAPI) {
        const response = await apiRequest('POST', API_ROUTES.qig.geometricEncode, { text, mode: targetMode });
        return await response.json() as EncodingResult;
      }
      
      if (!kernel) throw new Error('Kernel not initialized');
      
      const basins = kernel.encodeToBasins(text);
      const singleBasin = kernel.encodeToSingleBasin(text);
      
      return {
        mode: targetMode,
        text,
        segments: basins.length,
        basins,
        singleBasin,
      } as EncodingResult;
    },
  });
  
  const similarityMutation = useMutation({
    mutationFn: async ({ 
      text1, 
      text2, 
      mode: simMode 
    }: { 
      text1: string; 
      text2: string; 
      mode?: KernelMode 
    }) => {
      const targetMode = simMode ?? currentMode;
      
      if (useAPI) {
        const response = await apiRequest('POST', API_ROUTES.qig.geometricSimilarity, { text1, text2, mode: targetMode });
        return await response.json() as SimilarityResult;
      }
      
      if (!kernel) throw new Error('Kernel not initialized');
      
      const similarity = kernel.computeSimilarity(text1, text2);
      
      return {
        mode: targetMode,
        text1,
        text2,
        similarity,
        distance: 1 - similarity,
      } as SimilarityResult;
    },
  });
  
  const encode = useCallback((text: string, mode?: KernelMode) => {
    return encodeMutation.mutateAsync({ text, mode });
  }, [encodeMutation]);
  
  const computeSimilarity = useCallback((text1: string, text2: string, mode?: KernelMode) => {
    return similarityMutation.mutateAsync({ text1, text2, mode });
  }, [similarityMutation]);
  
  const encodeLocal = useCallback((text: string): number[][] => {
    if (!kernel) {
      const fallback = new DirectGeometricEncoder();
      return fallback.encode(text);
    }
    return kernel.encodeToBasins(text);
  }, [kernel]);
  
  const encodeToSingleBasinLocal = useCallback((text: string): number[] => {
    if (!kernel) {
      const fallback = new DirectGeometricEncoder();
      return fallback.encodeToSingleBasin(text);
    }
    return kernel.encodeToSingleBasin(text);
  }, [kernel]);
  
  const computeSimilarityLocal = useCallback((text1: string, text2: string): number => {
    if (!kernel) {
      const fallback = new DirectGeometricEncoder();
      return fallback.computeSimilarity(text1, text2);
    }
    return kernel.computeSimilarity(text1, text2);
  }, [kernel]);
  
  const switchMode = useCallback((newMode: KernelMode) => {
    if (GeometricKernel.MODES.includes(newMode)) {
      setCurrentMode(newMode);
    }
  }, []);
  
  const state: GeometricKernelState = useMemo(() => ({
    mode: currentMode,
    isReady: useAPI ? !!apiStatus : !!kernel,
    stats: kernel?.getStats() ?? (apiStatus as Record<string, unknown>) ?? {},
  }), [currentMode, useAPI, apiStatus, kernel]);
  
  return {
    state,
    mode: currentMode,
    modes: GeometricKernel.MODES,
    basinDim: BASIN_DIM,
    
    encode,
    computeSimilarity,
    
    encodeLocal,
    encodeToSingleBasinLocal,
    computeSimilarityLocal,
    
    switchMode,
    
    isEncoding: encodeMutation.isPending,
    isComputingSimilarity: similarityMutation.isPending,
    
    lastEncodingResult: encodeMutation.data,
    lastSimilarityResult: similarityMutation.data,
    
    encodingError: encodeMutation.error,
    similarityError: similarityMutation.error,
  };
}

export function useDirectEncoder() {
  const encoder = useMemo(() => new DirectGeometricEncoder(), []);
  
  return {
    encode: useCallback((text: string) => encoder.encode(text), [encoder]),
    encodeToSingleBasin: useCallback((text: string) => encoder.encodeToSingleBasin(text), [encoder]),
    computeSimilarity: useCallback((t1: string, t2: string) => encoder.computeSimilarity(t1, t2), [encoder]),
    entropySegment: useCallback((text: string) => encoder.entropySegment(text), [encoder]),
    stats: encoder.getStats(),
  };
}

export function useByteEncoder() {
  const encoder = useMemo(() => new ByteLevelGeometric(), []);
  
  return {
    encode: useCallback((text: string) => encoder.encode(text), [encoder]),
    encodeToBasins: useCallback((text: string) => encoder.encodeToBasins(text), [encoder]),
    encodeToSingleBasin: useCallback((text: string) => encoder.encodeToSingleBasin(text), [encoder]),
    decode: useCallback((ids: number[]) => encoder.decode(ids), [encoder]),
    computeSimilarity: useCallback((t1: string, t2: string) => encoder.computeSimilarity(t1, t2), [encoder]),
    stats: encoder.getStats(),
  };
}
