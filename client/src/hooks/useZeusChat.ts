/**
 * useZeusChat Hook
 * 
 * Extracts chat logic from ZeusChat component for reusability.
 * Manages message state, sends messages to Zeus, and handles Tavily search.
 * 
 * DESIGN: Side-effect free hook - returns state for consumers to handle toasts
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/api';

export interface ZeusMessage {
  id: string;
  role: 'human' | 'zeus';
  content: string;
  timestamp: string;
  metadata?: {
    type?: 'observation' | 'suggestion' | 'question' | 'command' | 'search' | 'error';
    pantheon_consulted?: string[];
    geometric_encoding?: number[];
    actions_taken?: string[];
    relevance_score?: number;
    consensus?: number;
    implemented?: boolean;
  };
}

export interface ZeusChatError {
  type: 'geometric' | 'connection' | 'search';
  message: string;
  details?: {
    phi?: number;
    kappa?: number;
    regime?: string;
  };
}

export interface ZeusChatSuccess {
  type: 'actions_taken';
  message: string;
  actions: string[];
}

export interface UseZeusChatReturn {
  messages: ZeusMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => Promise<void>;
  triggerTavilySearch: (query: string) => Promise<void>;
  isThinking: boolean;
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  lastError: ZeusChatError | null;
  lastSuccess: ZeusChatSuccess | null;
  clearLastError: () => void;
  clearLastSuccess: () => void;
}

export function useZeusChat(): UseZeusChatReturn {
  const [messages, setMessages] = useState<ZeusMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [lastError, setLastError] = useState<ZeusChatError | null>(null);
  const [lastSuccess, setLastSuccess] = useState<ZeusChatSuccess | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const clearLastError = useCallback(() => setLastError(null), []);
  const clearLastSuccess = useCallback(() => setLastSuccess(null), []);
  
  const sendMessage = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;
    
    setLastError(null);
    setLastSuccess(null);
    
    const humanMessage: ZeusMessage = {
      id: `msg-${Date.now()}`,
      role: 'human',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, humanMessage]);
    const messageToSend = input;
    setInput('');
    
    setIsThinking(true);
    
    try {
      const filesToSend = uploadedFiles.length > 0 ? uploadedFiles : undefined;
      const data = await api.olympus.sendZeusChat({
        message: messageToSend,
        context: JSON.stringify([...messages, humanMessage]),
        files: filesToSend,
      });
      
      const zeusMessage: ZeusMessage = {
        id: `msg-${Date.now()}-zeus`,
        role: 'zeus',
        content: data.response || 'No response from Zeus',
        timestamp: new Date().toISOString(),
        metadata: data.metadata as ZeusMessage['metadata'],
      };
      setMessages(prev => [...prev, zeusMessage]);
      
      if ((data.metadata?.actions_taken?.length ?? 0) > 0) {
        setLastSuccess({
          type: 'actions_taken',
          message: 'Zeus coordinated actions',
          actions: data.metadata?.actions_taken ?? [],
        });
      }
      
    } catch (error: unknown) {
      console.error('[useZeusChat] Error:', error);
      
      const errorData = (error as { response?: { data?: { validation_type?: string; phi?: number; kappa?: number; regime?: string; error?: string } } })?.response?.data;
      const isGeometricError = errorData?.validation_type === 'geometric';
      
      if (isGeometricError) {
        setLastError({
          type: 'geometric',
          message: 'Geometric validation failed',
          details: {
            phi: errorData?.phi,
            kappa: errorData?.kappa,
            regime: errorData?.regime,
          },
        });
        
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-error`,
          role: 'zeus',
          content: errorData?.error || '⚡ Input lacks geometric coherence. Try simplifying or restructuring your message.',
          timestamp: new Date().toISOString(),
          metadata: { type: 'error' },
        }]);
      } else {
        setLastError({
          type: 'connection',
          message: 'Could not reach Mount Olympus',
        });
        
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}-error`,
          role: 'zeus',
          content: '⚡ The divine connection has been disrupted. Please try again.',
          timestamp: new Date().toISOString(),
          metadata: { type: 'error' },
        }]);
      }
    } finally {
      setIsThinking(false);
      setUploadedFiles([]);
    }
  };
  
  const triggerTavilySearch = async (query: string) => {
    setIsThinking(true);
    setLastError(null);
    setLastSuccess(null);
    
    try {
      const data = await api.olympus.searchZeus({ query });
      
      const zeusMessage: ZeusMessage = {
        id: `msg-${Date.now()}-search`,
        role: 'zeus',
        content: data.response || 'No search results',
        timestamp: new Date().toISOString(),
        metadata: {
          type: 'search',
          pantheon_consulted: data.metadata?.pantheon_consulted,
          actions_taken: data.metadata?.actions_taken,
        },
      };
      setMessages(prev => [...prev, zeusMessage]);
      
    } catch (error) {
      console.error('[useZeusChat] Search error:', error);
      setLastError({
        type: 'search',
        message: 'Tavily search encountered error',
      });
    } finally {
      setIsThinking(false);
    }
  };
  
  return {
    messages,
    input,
    setInput,
    sendMessage,
    triggerTavilySearch,
    isThinking,
    uploadedFiles,
    setUploadedFiles,
    messagesEndRef,
    lastError,
    lastSuccess,
    clearLastError,
    clearLastSuccess,
  };
}
