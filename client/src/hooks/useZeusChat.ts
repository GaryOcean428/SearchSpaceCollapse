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
    moe?: {
      domain?: string;
      contributors?: string[];
      weights?: Record<string, number>;
      synthesizer?: string;
      selection_method?: string;
      autonomous?: boolean;
      fallback_used?: boolean;
    };
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
  type: 'actions_taken' | 'message_sent' | 'file_processed';
  message: string;
  actions?: string[];
  fileCount?: number;
}

export type SyncStatus = 'idle' | 'sending' | 'synced' | 'error';

export interface ZeusSessionInfo {
  session_id: string;
  title: string;
  message_count: number;
  updated_at: string;
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
  syncStatus: SyncStatus;
  sessionId: string | null;
  sessions: ZeusSessionInfo[];
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const SESSION_STORAGE_KEY = 'zeus_session_id';

export function useZeusChat(): UseZeusChatReturn {
  const [messages, setMessages] = useState<ZeusMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [lastError, setLastError] = useState<ZeusChatError | null>(null);
  const [lastSuccess, setLastSuccess] = useState<ZeusChatSuccess | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [sessions, setSessions] = useState<ZeusSessionInfo[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const refreshSessions = useCallback(async () => {
    try {
      const data = await api.olympus.getZeusSessions(20);
      setSessions(data.sessions.map(s => ({
        session_id: s.session_id,
        title: s.title,
        message_count: s.message_count,
        updated_at: s.updated_at,
      })));
    } catch (e) {
      console.error('[useZeusChat] Failed to fetch sessions:', e);
    }
  }, []);
  
  const loadSession = useCallback(async (id: string) => {
    try {
      const data = await api.olympus.getZeusSessionMessages(id);
      setMessages(data.messages.map((m, idx) => ({
        id: `msg-loaded-${idx}`,
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        metadata: m.metadata as ZeusMessage['metadata'],
      })));
      setSessionId(id);
      localStorage.setItem(SESSION_STORAGE_KEY, id);
    } catch (e: unknown) {
      console.error('[useZeusChat] Failed to load session:', e);
      const status = (e as { status?: number })?.status || 
                     (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setSessionId(null);
        setMessages([]);
      }
    }
  }, []);
  
  const startNewSession = useCallback(async () => {
    try {
      const data = await api.olympus.createZeusSession('New Conversation');
      setSessionId(data.session_id);
      setMessages([]);
      localStorage.setItem(SESSION_STORAGE_KEY, data.session_id);
      await refreshSessions();
    } catch (e) {
      console.error('[useZeusChat] Failed to create session:', e);
    }
  }, [refreshSessions]);
  
  useEffect(() => {
    refreshSessions();
    if (sessionId) {
      loadSession(sessionId);
    }
  }, []);
  
  const clearLastError = useCallback(() => setLastError(null), []);
  const clearLastSuccess = useCallback(() => setLastSuccess(null), []);
  
  const sendMessage = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;
    
    setLastError(null);
    setLastSuccess(null);
    setSyncStatus('sending');
    
    const humanMessage: ZeusMessage = {
      id: `msg-${Date.now()}`,
      role: 'human',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, humanMessage]);
    const messageToSend = input;
    const fileCount = uploadedFiles.length;
    setInput('');
    
    setIsThinking(true);
    
    try {
      const filesToSend = uploadedFiles.length > 0 ? uploadedFiles : undefined;
      const data = await api.olympus.sendZeusChat({
        message: messageToSend,
        context: JSON.stringify([...messages, humanMessage]),
        files: filesToSend,
        session_id: sessionId || undefined,
      });
      
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem(SESSION_STORAGE_KEY, data.session_id);
      }
      
      const zeusMessage: ZeusMessage = {
        id: `msg-${Date.now()}-zeus`,
        role: 'zeus',
        content: data.response || 'No response from Zeus',
        timestamp: new Date().toISOString(),
        metadata: data.metadata as ZeusMessage['metadata'],
      };
      setMessages(prev => [...prev, zeusMessage]);
      setSyncStatus('synced');
      
      // Emit success notification based on what was sent
      if (fileCount > 0) {
        setLastSuccess({
          type: 'file_processed',
          message: `${fileCount} file${fileCount > 1 ? 's' : ''} processed by Zeus`,
          fileCount,
        });
      } else {
        setLastSuccess({
          type: 'message_sent',
          message: 'Message received by Zeus',
        });
      }
      
      // Override with actions_taken if present (more important)
      if ((data.metadata?.actions_taken?.length ?? 0) > 0) {
        setLastSuccess({
          type: 'actions_taken',
          message: 'Zeus coordinated actions',
          actions: data.metadata?.actions_taken ?? [],
        });
      }
      
    } catch (error: unknown) {
      // Properly serialize error for logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[useZeusChat] Error:', {
        message: errorMessage,
        stack: errorStack,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : error,
      });
      setSyncStatus('error');
      
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
      
    } catch (error: unknown) {
      // Properly serialize error for logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[useZeusChat] Search error:', {
        message: errorMessage,
        stack: errorStack,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
        } : error,
      });
      setLastError({
        type: 'search',
        message: `Tavily search error: ${errorMessage}`,
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
    syncStatus,
    sessionId,
    sessions,
    loadSession,
    startNewSession,
    refreshSessions,
  };
}
