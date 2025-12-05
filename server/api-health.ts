/**
 * Comprehensive Health Check API
 * 
 * Validates subsystem health:
 * - Database connectivity (PostgreSQL via Drizzle)
 * - Python QIG backend status
 * - Memory/storage systems
 * - Overall system status
 */

import type { Request, Response } from "express";
import { sql } from "drizzle-orm";

interface SubsystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
  details?: Record<string, any>;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: number;
  uptime: number;
  subsystems: {
    database: SubsystemHealth;
    pythonBackend: SubsystemHealth;
    storage: SubsystemHealth;
  };
  version?: string;
}

const startTime = Date.now();

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<SubsystemHealth> {
  const start = Date.now();
  try {
    const { db } = await import("./db");
    
    if (!db) {
      return {
        status: 'down',
        message: 'Database connection not initialized',
      };
    }
    
    // Try a simple query to verify connectivity
    await db.execute(sql`SELECT 1 as health_check`);
    
    const latency = Date.now() - start;
    return {
      status: 'healthy',
      latency,
      message: 'Database connection active',
    };
  } catch (error) {
    const latency = Date.now() - start;
    return {
      status: 'down',
      latency,
      message: error instanceof Error ? error.message : 'Database check failed',
    };
  }
}

/**
 * Check Python QIG backend health
 */
async function checkPythonBackendHealth(): Promise<SubsystemHealth> {
  const start = Date.now();
  try {
    const { oceanQIGBackend } = await import("./ocean-qig-backend-adapter");
    
    const isHealthy = await oceanQIGBackend.checkHealth();
    const latency = Date.now() - start;
    
    if (isHealthy) {
      return {
        status: 'healthy',
        latency,
        message: 'Python QIG backend responsive',
        details: {
          endpoint: 'http://localhost:5001/health',
        },
      };
    } else {
      return {
        status: 'degraded',
        latency,
        message: 'Python backend not responding, using fallback',
      };
    }
  } catch (error) {
    const latency = Date.now() - start;
    return {
      status: 'down',
      latency,
      message: error instanceof Error ? error.message : 'Python backend check failed',
    };
  }
}

/**
 * Check storage/memory systems health
 */
async function checkStorageHealth(): Promise<SubsystemHealth> {
  const start = Date.now();
  try {
    const { storage } = await import("./storage");
    
    // Check if storage is initialized and has expected methods
    if (storage && typeof storage.getTargetAddresses === 'function') {
      const latency = Date.now() - start;
      return {
        status: 'healthy',
        latency,
        message: 'Storage systems operational',
      };
    } else {
      return {
        status: 'degraded',
        latency: Date.now() - start,
        message: 'Storage system partially initialized',
      };
    }
  } catch (error) {
    const latency = Date.now() - start;
    return {
      status: 'down',
      latency,
      message: error instanceof Error ? error.message : 'Storage check failed',
    };
  }
}

/**
 * Comprehensive health check handler
 */
export async function healthCheckHandler(req: Request, res: Response): Promise<void> {
  const [database, pythonBackend, storage] = await Promise.all([
    checkDatabaseHealth(),
    checkPythonBackendHealth(),
    checkStorageHealth(),
  ]);
  
  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
  
  // Database and storage are critical - if either is down, system is down
  if (database.status === 'down' || storage.status === 'down') {
    overallStatus = 'down';
  }
  // Python backend is also critical for consciousness operations
  else if (pythonBackend.status === 'down') {
    overallStatus = 'down';
  }
  // Any degraded subsystem means overall degraded
  else if (
    database.status === 'degraded' || 
    pythonBackend.status === 'degraded' || 
    storage.status === 'degraded'
  ) {
    overallStatus = 'degraded';
  }
  
  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: Date.now(),
    uptime: Date.now() - startTime,
    subsystems: {
      database,
      pythonBackend,
      storage,
    },
    version: process.env.npm_package_version || '1.0.0',
  };
  
  // Set appropriate HTTP status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503;
  
  res.status(statusCode).json(response);
}
