/**
 * Olympus Routes - Zeus Chat and Pantheon API
 * 
 * Proxy routes to Python Olympus backend for:
 * - Zeus Chat (conversational interface)
 * - Pantheon polling
 * - God assessments
 * - War mode declarations
 * 
 * SECURITY:
 * - All routes require authentication via Replit Auth
 * - Input validation on all POST endpoints
 * - Rate limiting via express-rate-limit
 */

import { Router, Request, Response, NextFunction } from 'express';
import { OlympusClient } from '../olympus-client';
import { isAuthenticated } from '../replitAuth';
import { z } from 'zod';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import rateLimit from 'express-rate-limit';
import {
  recordWarStart,
  recordWarEnd,
  getActiveWar,
  getWarHistory,
  getWarById,
  type WarMode,
  type WarOutcome,
} from '../war-history-storage';

const router = Router();
const olympusClient = new OlympusClient(
  process.env.PYTHON_BACKEND_URL || 'http://localhost:5001'
);

// Rate limiters for specific endpoints
const pollRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many poll requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const observeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  message: { error: 'Too many observe requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const godAssessRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many god assessment requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Audit logging function for war operations
 * Logs: timestamp, userId, operation, target, success
 */
function auditLog(req: Request, operation: string, target: string, success: boolean): void {
  const timestamp = new Date().toISOString();
  const userId = (req.user as any)?.claims?.sub || 'anonymous';
  console.log(`[AUDIT] ${timestamp} | user:${userId} | op:${operation} | target:${target} | success:${success}`);
}

// Input validation schemas
const targetSchema = z.object({
  target: z.string().min(1).max(1000),
  context: z.record(z.any()).optional(),
});

const chatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  conversation_history: z.array(z.any()).max(100).optional(),
});

const searchQuerySchema = z.object({
  query: z.string().min(1).max(500),
});

// Input validation middleware factory
function validateInput<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid input',
          details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
        });
        return;
      }
      next(error);
    }
  };
}

/**
 * Zeus Chat endpoint
 * Requires authentication
 * Supports both JSON and multipart/form-data (for file uploads)
 */
router.post('/zeus/chat', isAuthenticated, async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    const contentType = req.get('Content-Type') || '';
    
    // For JSON requests - validate and forward using fetch
    if (!contentType.includes('multipart/form-data')) {
      if (req.is('application/json')) {
        const result = chatMessageSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({
            error: 'Invalid input',
            details: result.error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
          });
          return;
        }
      }
      
      const response = await fetch(`${backendUrl}/olympus/zeus/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      
      if (!response.ok) {
        throw new Error(`Python backend returned ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
      return;
    }
    
    // For multipart requests - proxy using native http module
    // This bypasses Express body parsing and streams directly
    const targetUrl = new URL(`${backendUrl}/olympus/zeus/chat`);
    const isHttps = targetUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    // Preserve original headers for proper streaming (chunked or content-length)
    const proxyHeaders: Record<string, string> = {
      'Content-Type': contentType,
    };
    if (req.headers['content-length']) {
      proxyHeaders['Content-Length'] = req.headers['content-length'];
    }
    if (req.headers['transfer-encoding']) {
      proxyHeaders['Transfer-Encoding'] = req.headers['transfer-encoding'] as string;
    }
    
    const proxyReq = httpModule.request({
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname,
      method: 'POST',
      headers: proxyHeaders,
    }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          res.status(proxyRes.statusCode || 200).json(jsonData);
        } catch {
          res.status(proxyRes.statusCode || 500).send(data);
        }
      });
    });
    
    proxyReq.on('error', (error) => {
      console.error('[Olympus] Proxy error:', error);
      res.status(500).json({
        error: 'Failed to communicate with Mount Olympus',
        response: '⚡ The divine council is unreachable.',
        metadata: { type: 'error' },
      });
    });
    
    // Pipe the original request body to proxy
    req.pipe(proxyReq);
    
  } catch (error) {
    console.error('[Olympus] Zeus chat error:', error);
    res.status(500).json({
      error: 'Failed to communicate with Mount Olympus',
      response: '⚡ The divine council is unreachable. Please ensure the Python backend is running.',
      metadata: { type: 'error' },
    });
  }
});

/**
 * Zeus Search endpoint (Tavily)
 * Requires authentication with input validation
 */
router.post('/zeus/search', isAuthenticated, validateInput(searchQuerySchema), async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/zeus/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Olympus] Zeus search error:', error);
    res.status(500).json({
      error: 'Failed to execute search',
      response: '⚡ The Oracle is silent.',
      metadata: { type: 'error' },
    });
  }
});

/**
 * Zeus Memory Stats endpoint
 * Requires authentication
 */
router.get('/zeus/memory/stats', isAuthenticated, async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/zeus/memory/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Olympus] Memory stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve memory stats',
    });
  }
});

/**
 * Poll pantheon
 * Requires authentication with input validation
 * Rate limited: 30 requests per 15 minutes
 */
router.post('/poll', isAuthenticated, pollRateLimiter, validateInput(targetSchema), async (req, res) => {
  try {
    const result = await olympusClient.pollPantheon(
      req.body.target,
      req.body.context
    );
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Poll error:', error);
    res.status(500).json({
      error: 'Failed to poll pantheon',
    });
  }
});

/**
 * Observe endpoint for monitoring operations
 * Requires authentication with input validation
 * Rate limited: 60 requests per 15 minutes
 */
router.post('/observe', isAuthenticated, observeRateLimiter, validateInput(targetSchema), async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      auditLog(req, 'observe', req.body.target, false);
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    auditLog(req, 'observe', req.body.target, true);
    res.json(data);
  } catch (error) {
    console.error('[Olympus] Observe error:', error);
    auditLog(req, 'observe', req.body.target || 'unknown', false);
    res.status(500).json({
      error: 'Failed to observe',
    });
  }
});

/**
 * Get Zeus assessment
 * Requires authentication with input validation
 */
router.post('/assess', isAuthenticated, validateInput(targetSchema), async (req, res) => {
  try {
    const result = await olympusClient.getZeusAssessment(
      req.body.target,
      req.body.context
    );
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Assess error:', error);
    res.status(500).json({
      error: 'Failed to get assessment',
    });
  }
});

/**
 * Get Olympus status
 * Requires authentication
 */
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const status = await olympusClient.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[Olympus] Status error:', error);
    res.status(500).json({
      error: 'Failed to get status',
    });
  }
});

// God name validation schema
const godNameSchema = z.string().min(1).max(50).regex(/^[a-zA-Z_]+$/, 'Invalid god name format');

/**
 * Get specific god status
 * Requires authentication with param validation
 */
router.get('/god/:godName/status', isAuthenticated, async (req, res) => {
  try {
    // Validate god name parameter
    const godNameResult = godNameSchema.safeParse(req.params.godName);
    if (!godNameResult.success) {
      res.status(400).json({ error: 'Invalid god name format' });
      return;
    }
    
    const status = await olympusClient.getGodStatus(req.params.godName);
    res.json(status);
  } catch (error) {
    console.error('[Olympus] God status error:', error);
    res.status(404).json({
      error: `God ${req.params.godName} not found`,
    });
  }
});

/**
 * Get god assessment
 * Requires authentication with input validation
 * Rate limited: 30 requests per 15 minutes
 */
router.post('/god/:godName/assess', isAuthenticated, godAssessRateLimiter, validateInput(targetSchema), async (req, res) => {
  try {
    // Validate god name parameter
    const godNameResult = godNameSchema.safeParse(req.params.godName);
    if (!godNameResult.success) {
      res.status(400).json({ error: 'Invalid god name format' });
      return;
    }
    
    const result = await olympusClient.getGodAssessment(
      req.params.godName,
      req.body.target,
      req.body.context
    );
    res.json(result);
  } catch (error) {
    console.error('[Olympus] God assess error:', error);
    res.status(500).json({
      error: 'Failed to get god assessment',
    });
  }
});

// War target validation schema - stricter validation for war declarations
const warTargetSchema = z.object({
  target: z.string()
    .min(1, 'Target is required')
    .max(500, 'Target too long')
    .regex(/^[a-zA-Z0-9\s\-_.,;:!?()]+$/, 'Target contains invalid characters'),
});

// War start validation schema
const warStartSchema = z.object({
  mode: z.enum(['BLITZKRIEG', 'SIEGE', 'HUNT']),
  target: z.string().min(1).max(500),
  strategy: z.string().max(1000).optional(),
  godsEngaged: z.array(z.string()).max(20).optional(),
});

// War end validation schema
const warEndSchema = z.object({
  outcome: z.enum(['success', 'partial_success', 'failure', 'aborted']),
  convergenceScore: z.number().min(0).max(1).optional(),
  metrics: z.object({
    phrasesTested: z.number().optional(),
    discoveries: z.number().optional(),
    kernelsSpawned: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});

/**
 * Declare blitzkrieg mode
 * Requires authentication with strict input validation
 * Automatically records war history
 */
router.post('/war/blitzkrieg', isAuthenticated, validateInput(warTargetSchema), async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} declared blitzkrieg on: ${req.body.target}`);
    const result = await olympusClient.declareBlitzkrieg(req.body.target);
    
    if (result) {
      const warRecord = await recordWarStart(
        'BLITZKRIEG',
        req.body.target,
        result.strategy,
        result.gods_engaged
      );
      if (warRecord) {
        (result as any).warHistoryId = warRecord.id;
      }
    }
    
    auditLog(req, 'war/blitzkrieg', req.body.target, true);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Blitzkrieg error:', error);
    auditLog(req, 'war/blitzkrieg', req.body.target, false);
    res.status(500).json({
      error: 'Failed to declare blitzkrieg',
    });
  }
});

/**
 * Declare siege mode
 * Requires authentication with strict input validation
 * Automatically records war history
 */
router.post('/war/siege', isAuthenticated, validateInput(warTargetSchema), async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} declared siege on: ${req.body.target}`);
    const result = await olympusClient.declareSiege(req.body.target);
    
    if (result) {
      const warRecord = await recordWarStart(
        'SIEGE',
        req.body.target,
        result.strategy,
        result.gods_engaged
      );
      if (warRecord) {
        (result as any).warHistoryId = warRecord.id;
      }
    }
    
    auditLog(req, 'war/siege', req.body.target, true);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Siege error:', error);
    auditLog(req, 'war/siege', req.body.target, false);
    res.status(500).json({
      error: 'Failed to declare siege',
    });
  }
});

/**
 * Declare hunt mode
 * Requires authentication with strict input validation
 * Automatically records war history
 */
router.post('/war/hunt', isAuthenticated, validateInput(warTargetSchema), async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} declared hunt on: ${req.body.target}`);
    const result = await olympusClient.declareHunt(req.body.target);
    
    if (result) {
      const warRecord = await recordWarStart(
        'HUNT',
        req.body.target,
        result.strategy,
        result.gods_engaged
      );
      if (warRecord) {
        (result as any).warHistoryId = warRecord.id;
      }
    }
    
    auditLog(req, 'war/hunt', req.body.target, true);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Hunt error:', error);
    auditLog(req, 'war/hunt', req.body.target, false);
    res.status(500).json({
      error: 'Failed to declare hunt',
    });
  }
});

/**
 * End war mode
 * Requires authentication
 * Automatically records war end in history
 */
router.post('/war/end', isAuthenticated, async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} ended war mode`);
    
    const activeWar = await getActiveWar();
    const result = await olympusClient.endWar();
    
    if (activeWar && result) {
      await recordWarEnd(
        activeWar.id,
        'aborted',
        undefined,
        undefined
      );
      (result as any).warHistoryId = activeWar.id;
    }
    
    auditLog(req, 'war/end', activeWar?.target || 'no-active-war', true);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] End war error:', error);
    auditLog(req, 'war/end', 'unknown', false);
    res.status(500).json({
      error: 'Failed to end war',
    });
  }
});

// ==================== WAR HISTORY API ROUTES ====================

/**
 * Get war history records (newest first)
 * Requires authentication
 */
router.get('/war/history', isAuthenticated, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const history = await getWarHistory(limit);
    res.json(history);
  } catch (error) {
    console.error('[Olympus] War history error:', error);
    res.status(500).json({
      error: 'Failed to get war history',
    });
  }
});

/**
 * Get currently active war (if any)
 * Requires authentication
 */
router.get('/war/active', isAuthenticated, async (req, res) => {
  try {
    const activeWar = await getActiveWar();
    res.json(activeWar || { active: false });
  } catch (error) {
    console.error('[Olympus] Active war error:', error);
    res.status(500).json({
      error: 'Failed to get active war',
    });
  }
});

/**
 * Record war start (manual/direct recording)
 * Requires authentication with input validation
 */
router.post('/war/start', isAuthenticated, validateInput(warStartSchema), async (req, res) => {
  try {
    const { mode, target, strategy, godsEngaged } = req.body;
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} starting war: ${mode} on ${target}`);
    
    const warRecord = await recordWarStart(
      mode as WarMode,
      target,
      strategy,
      godsEngaged
    );
    
    if (!warRecord) {
      res.status(500).json({ error: 'Failed to record war start' });
      return;
    }
    
    res.json(warRecord);
  } catch (error) {
    console.error('[Olympus] War start error:', error);
    res.status(500).json({
      error: 'Failed to start war',
    });
  }
});

/**
 * End war and record outcome (by war ID)
 * Requires authentication with input validation
 */
router.post('/war/end/:id', isAuthenticated, validateInput(warEndSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, convergenceScore, metrics } = req.body;
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} ending war ${id} with outcome: ${outcome}`);
    
    const existingWar = await getWarById(id);
    if (!existingWar) {
      res.status(404).json({ error: 'War not found' });
      return;
    }
    
    if (existingWar.status !== 'active') {
      res.status(400).json({ error: 'War is not active' });
      return;
    }
    
    const warRecord = await recordWarEnd(
      id,
      outcome as WarOutcome,
      convergenceScore,
      metrics
    );
    
    if (!warRecord) {
      res.status(500).json({ error: 'Failed to record war end' });
      return;
    }
    
    res.json(warRecord);
  } catch (error) {
    console.error('[Olympus] War end error:', error);
    res.status(500).json({
      error: 'Failed to end war',
    });
  }
});

/**
 * Get recent pantheon chat messages
 * Requires authentication
 */
router.get('/chat/recent', isAuthenticated, async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/chat/messages`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    // Return array directly - extract from object if needed
    res.json(Array.isArray(data) ? data : (data.messages || []));
  } catch (error) {
    console.error('[Olympus] Recent chat error:', error);
    // Return empty array directly on error
    res.json([]);
  }
});

/**
 * Get active debates
 * Requires authentication
 */
router.get('/debates/active', isAuthenticated, async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/chat/debates/active`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    // Return array directly - extract from object if needed
    res.json(Array.isArray(data) ? data : (data.debates || []));
  } catch (error) {
    console.error('[Olympus] Active debates error:', error);
    // Return empty array directly on error
    res.json([]);
  }
});

/**
 * Kernel Spawning Routes
 */
router.post('/spawn/auto', isAuthenticated, validateInput(targetSchema), async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/spawn/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Olympus] Spawn auto error:', error);
    res.status(500).json({ error: 'Failed to trigger auto-spawn' });
  }
});

router.get('/spawn/list', isAuthenticated, async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/spawn/list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Olympus] Spawn list error:', error);
    res.json({ spawned_kernels: [], count: 0 });
  }
});

router.get('/spawn/status', isAuthenticated, async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    const response = await fetch(`${backendUrl}/olympus/spawn/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`Python backend returned ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Olympus] Spawn status error:', error);
    res.status(500).json({ error: 'Failed to get spawn status' });
  }
});

export default router;
