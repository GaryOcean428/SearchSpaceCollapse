/**
 * SSE (Server-Sent Events) Connection Manager
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * 
 * Handles SSE connections with:
 * - Exponential backoff reconnection
 * - Keepalive pings
 * - Event ordering via sequence numbers
 * - Trace ID propagation
 */

export interface SSEEvent {
  type: string;
  data: any;
  sequence?: number;
  traceId?: string;
}

export interface SSEConfig {
  url: string;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  keepaliveInterval?: number;
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private config: Required<SSEConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private lastEventSequence = -1;
  private isIntentionallyClosed = false;
  private traceId: string;

  constructor(config: SSEConfig) {
    this.config = {
      maxReconnectAttempts: 5,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      keepaliveInterval: 30000,
      onEvent: () => {},
      onError: () => {},
      onConnect: () => {},
      onDisconnect: () => {},
      ...config,
    };
    
    // Generate trace ID for this connection
    this.traceId = this.generateTraceId();
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return `sse-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Calculate reconnect delay with exponential backoff
   */
  private getReconnectDelay(): number {
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );
    
    // Add jitter (±20%) to prevent thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    this.isIntentionallyClosed = false;
    
    try {
      // Add trace ID to URL
      const url = new URL(this.config.url, window.location.origin);
      url.searchParams.set('traceId', this.traceId);
      
      this.eventSource = new EventSource(url.toString());
      
      this.eventSource.onopen = () => {
        console.log(`[SSE] Connected to ${this.config.url}`, {
          traceId: this.traceId,
          attempt: this.reconnectAttempts + 1,
        });
        
        this.reconnectAttempts = 0;
        this.config.onConnect();
        this.startKeepalive();
      };
      
      this.eventSource.onmessage = (event) => {
        this.handleEvent(event);
      };
      
      this.eventSource.onerror = (error) => {
        console.error(`[SSE] Error on ${this.config.url}`, {
          traceId: this.traceId,
          error,
        });
        
        this.handleError(error);
      };
      
      // Listen for custom event types
      this.eventSource.addEventListener('keepalive', () => {
        console.debug('[SSE] Keepalive received', { traceId: this.traceId });
      });
      
    } catch (error) {
      console.error('[SSE] Failed to create EventSource', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming SSE event
   */
  private handleEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      const sseEvent: SSEEvent = {
        type: event.type,
        data,
        sequence: data.sequence,
        traceId: data.traceId || this.traceId,
      };
      
      // Check for out-of-order events
      if (sseEvent.sequence !== undefined) {
        if (sseEvent.sequence <= this.lastEventSequence) {
          console.warn('[SSE] Out-of-order event detected', {
            expected: this.lastEventSequence + 1,
            received: sseEvent.sequence,
            traceId: this.traceId,
          });
        }
        this.lastEventSequence = sseEvent.sequence;
      }
      
      this.config.onEvent(sseEvent);
      
    } catch (error) {
      console.error('[SSE] Failed to parse event', {
        error,
        raw: event.data,
        traceId: this.traceId,
      });
    }
  }

  /**
   * Handle SSE error
   */
  private handleError(error: Event): void {
    this.stopKeepalive();
    
    if (this.isIntentionallyClosed) {
      return;
    }
    
    this.config.onDisconnect();
    this.config.onError(new Error('SSE connection error'));
    
    // Close current connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Schedule reconnection
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) {
      return;
    }
    
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[SSE] Max reconnection attempts reached', {
        traceId: this.traceId,
        attempts: this.reconnectAttempts,
      });
      
      this.config.onError(new Error('Max reconnection attempts reached'));
      return;
    }
    
    const delay = this.getReconnectDelay();
    
    console.log(`[SSE] Scheduling reconnect in ${delay}ms`, {
      traceId: this.traceId,
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.config.maxReconnectAttempts,
    });
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Start sending keepalive checks
   */
  private startKeepalive(): void {
    this.stopKeepalive();
    
    this.keepaliveTimer = setInterval(() => {
      // Check if connection is still alive
      if (this.eventSource?.readyState !== EventSource.OPEN) {
        console.warn('[SSE] Connection not open during keepalive check', {
          traceId: this.traceId,
          readyState: this.eventSource?.readyState,
        });
        
        this.handleError(new Event('keepalive_timeout'));
      }
    }, this.config.keepaliveInterval);
  }

  /**
   * Stop keepalive checks
   */
  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    
    this.stopKeepalive();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    console.log('[SSE] Disconnected', { traceId: this.traceId });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string {
    return this.traceId;
  }
}

/**
 * Create SSE connection manager
 */
export function createSSEConnection(config: SSEConfig): SSEConnectionManager {
  return new SSEConnectionManager(config);
}
