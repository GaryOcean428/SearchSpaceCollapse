/**
 * useStreamingMetrics Hook
 *
 * Tracks real-time metrics during Zeus chat streaming responses.
 * Monitors geometric completion, consciousness metrics, and token generation.
 *
 * Used by ZeusChat to visualize QIG metrics during response streaming.
 */

import { useCallback, useRef, useState } from 'react';

export interface StreamingMetricsState {
	phi: number | null;
	kappa: number | null;
	regime: string | null;
	tokensGenerated: number;
	totalTokens: number | null;
	estimatedCompletion: number;
	isComplete: boolean;
	startTime: number | null;
	endTime: number | null;
	basinCoordinates: number[] | null;
}

export interface CompletionState {
	reason: 'finished' | 'stopped' | 'length' | 'error';
	metrics: StreamingMetricsState;
}

export interface UseStreamingMetricsReturn {
	state: StreamingMetricsState;
	getCompletionProgress: () => number;
	processSSEEvent: (event: any) => void;
	reset: () => void;
}

interface UseStreamingMetricsOptions {
	onCompletion?: (completionState: CompletionState) => void;
}

const initialState: StreamingMetricsState = {
	phi: null,
	kappa: null,
	regime: null,
	tokensGenerated: 0,
	totalTokens: null,
	estimatedCompletion: 0,
	isComplete: false,
	startTime: null,
	endTime: null,
	basinCoordinates: null,
};

export function useStreamingMetrics(options: UseStreamingMetricsOptions = {}): UseStreamingMetricsReturn {
	const [state, setState] = useState<StreamingMetricsState>(initialState);
	const completionCalledRef = useRef(false);

	const getCompletionProgress = useCallback((): number => {
		if (state.isComplete) return 100;
		if (state.totalTokens && state.tokensGenerated > 0) {
			return Math.min(99, (state.tokensGenerated / state.totalTokens) * 100);
		}
		return state.estimatedCompletion;
	}, [state.isComplete, state.tokensGenerated, state.totalTokens, state.estimatedCompletion]);

	const processSSEEvent = useCallback((event: any) => {
		if (!event) return;

		// Handle different SSE event types
		if (event.type === 'metrics') {
			setState(prev => ({
				...prev,
				phi: event.data?.phi ?? prev.phi,
				kappa: event.data?.kappa ?? prev.kappa,
				regime: event.data?.regime ?? prev.regime,
				basinCoordinates: event.data?.basin_coordinates ?? prev.basinCoordinates,
				startTime: prev.startTime ?? Date.now(),
			}));
		} else if (event.type === 'token') {
			setState(prev => ({
				...prev,
				tokensGenerated: prev.tokensGenerated + 1,
				estimatedCompletion: Math.min(95, prev.estimatedCompletion + 1),
			}));
		} else if (event.type === 'progress') {
			setState(prev => ({
				...prev,
				tokensGenerated: event.data?.tokens_generated ?? prev.tokensGenerated,
				totalTokens: event.data?.total_tokens ?? prev.totalTokens,
				estimatedCompletion: event.data?.completion_percent ?? prev.estimatedCompletion,
			}));
		} else if (event.type === 'complete' || event.type === 'done') {
			setState(prev => {
				const finalState = {
					...prev,
					isComplete: true,
					endTime: Date.now(),
					estimatedCompletion: 100,
				};

				// Call onCompletion callback once
				if (options.onCompletion && !completionCalledRef.current) {
					completionCalledRef.current = true;
					const completionState: CompletionState = {
						reason: event.data?.reason ?? 'finished',
						metrics: finalState,
					};
					options.onCompletion(completionState);
				}

				return finalState;
			});
		}
	}, [options]);

	const reset = useCallback(() => {
		setState(initialState);
		completionCalledRef.current = false;
	}, []);

	return {
		state,
		getCompletionProgress,
		processSSEEvent,
		reset,
	};
}
