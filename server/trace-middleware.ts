/**
 * Trace ID Middleware
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * 
 * Propagates trace context across services for distributed tracing.
 * Enables correlation of logs, metrics, and events across frontend/backend.
 */

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
    }
  }
}

/**
 * Add trace ID to all incoming requests
 * Uses X-Trace-ID header if provided, otherwise generates new UUID
 */
export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check for existing trace ID in header
  const incomingTraceId = req.headers['x-trace-id'] as string;
  
  // Use existing or generate new
  const traceId = incomingTraceId || randomUUID();
  
  // Attach to request object
  req.traceId = traceId;
  
  // Add to response headers for client correlation
  res.setHeader('X-Trace-ID', traceId);
  
  // Log request with trace ID
  const method = req.method;
  const path = req.path;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] [${traceId}] ${method} ${path}`);
  
  next();
}

/**
 * Get trace ID from request
 */
export function getTraceId(req: Request): string {
  return req.traceId || 'unknown';
}

/**
 * Create logger with trace context
 */
export function createTraceLogger(req: Request) {
  const traceId = getTraceId(req);
  
  return {
    info: (message: string, data?: any) => {
      console.log(`[INFO] [${traceId}] ${message}`, data || '');
    },
    warn: (message: string, data?: any) => {
      console.warn(`[WARN] [${traceId}] ${message}`, data || '');
    },
    error: (message: string, error?: any) => {
      console.error(`[ERROR] [${traceId}] ${message}`, error || '');
    },
    debug: (message: string, data?: any) => {
      if (process.env.DEBUG_TRACES === 'true') {
        console.debug(`[DEBUG] [${traceId}] ${message}`, data || '');
      }
    },
  };
}
