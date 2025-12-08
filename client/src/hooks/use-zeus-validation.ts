/**
 * useZeusValidation Hook
 * 
 * Provides geometric validation through the centralized Zeus chat action.
 * Uses validate_only mode to get metrics without full chat processing.
 * 
 * ARCHITECTURE:
 * - Validation via /zeus/chat with validate_only=true flag
 * - Uses QIG metrics: φ (phi), κ (kappa), regime
 * - No separate validation endpoint - stays within centralized action pattern
 */

import { useState, useCallback } from 'react';
import { api } from '@/api';

export interface GeometricValidationState {
  phi: number | null;
  kappa: number | null;
  regime: string | null;
  isValid: boolean | null;
  errorMessage: string | null;
}

export interface UseZeusValidationReturn {
  validationState: GeometricValidationState;
  isValidating: boolean;
  validate: (message: string) => Promise<boolean>;
  validateAndSend: (message: string, context?: string, files?: File[]) => Promise<{ response?: string; success: boolean }>;
  resetValidation: () => void;
}

const initialState: GeometricValidationState = {
  phi: null,
  kappa: null,
  regime: null,
  isValid: null,
  errorMessage: null,
};

/**
 * Hook for geometric validation through Zeus chat action.
 * 
 * Provides two modes:
 * 1. validate() - Pre-validation only, returns metrics without sending
 * 2. validateAndSend() - Validates and sends in one call
 * 
 * Usage:
 * ```tsx
 * const { validationState, validate, validateAndSend } = useZeusValidation();
 * 
 * // Pre-validate before sending
 * const isValid = await validate(message);
 * if (isValid) {
 *   const result = await validateAndSend(message, context, files);
 * }
 * 
 * // Or validate and send in one call
 * const result = await validateAndSend(message, context, files);
 * ```
 */
export function useZeusValidation(): UseZeusValidationReturn {
  const [validationState, setValidationState] = useState<GeometricValidationState>(initialState);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (message: string): Promise<boolean> => {
    setIsValidating(true);
    setValidationState(initialState);

    try {
      const result = await api.olympus.validateZeusInput(message);
      
      setValidationState({
        phi: result.phi,
        kappa: result.kappa,
        regime: result.regime,
        isValid: result.is_valid,
        errorMessage: result.is_valid ? null : 'Input lacks geometric coherence',
      });

      return result.is_valid;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Validation error';
      setValidationState({
        phi: null,
        kappa: null,
        regime: null,
        isValid: false,
        errorMessage,
      });
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const validateAndSend = useCallback(async (
    message: string,
    context?: string,
    files?: File[]
  ): Promise<{ response?: string; success: boolean }> => {
    setIsValidating(true);
    setValidationState(initialState);

    try {
      const result = await api.olympus.sendZeusChat({ 
        message, 
        context,
        files 
      });
      
      setValidationState({
        phi: null,
        kappa: null,
        regime: null,
        isValid: true,
        errorMessage: null,
      });

      return { response: result.response, success: true };
    } catch (error: unknown) {
      const errorData = (error as { message?: string })?.message;
      
      // Try to parse geometric validation error from response
      let phi = null, kappa = null, regime = null;
      try {
        const match = errorData?.match(/φ=([0-9.]+).*κ=([0-9.]+).*regime=(\w+)/);
        if (match) {
          phi = parseFloat(match[1]);
          kappa = parseFloat(match[2]);
          regime = match[3];
        }
      } catch {}

      setValidationState({
        phi,
        kappa,
        regime,
        isValid: false,
        errorMessage: errorData || 'Failed to send message',
      });
      
      return { success: false };
    } finally {
      setIsValidating(false);
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidationState(initialState);
  }, []);

  return {
    validationState,
    isValidating,
    validate,
    validateAndSend,
    resetValidation,
  };
}
