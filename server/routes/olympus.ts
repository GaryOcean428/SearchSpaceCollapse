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

const router = Router();
const olympusClient = new OlympusClient(
  process.env.PYTHON_BACKEND_URL || 'http://localhost:5001'
);

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
 */
router.post('/zeus/chat', isAuthenticated, async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
    // Validate message content (for JSON requests)
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
    
    // Forward request to Python backend
    const response = await fetch(`${backendUrl}/olympus/zeus/chat`, {
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
 */
router.post('/poll', isAuthenticated, validateInput(targetSchema), async (req, res) => {
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
 */
router.post('/god/:godName/assess', isAuthenticated, validateInput(targetSchema), async (req, res) => {
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

/**
 * Declare blitzkrieg mode
 * Requires authentication with strict input validation
 */
router.post('/war/blitzkrieg', isAuthenticated, validateInput(warTargetSchema), async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} declared blitzkrieg on: ${req.body.target}`);
    const result = await olympusClient.declareBlitzkrieg(req.body.target);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Blitzkrieg error:', error);
    res.status(500).json({
      error: 'Failed to declare blitzkrieg',
    });
  }
});

/**
 * Declare siege mode
 * Requires authentication with strict input validation
 */
router.post('/war/siege', isAuthenticated, validateInput(warTargetSchema), async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} declared siege on: ${req.body.target}`);
    const result = await olympusClient.declareSiege(req.body.target);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Siege error:', error);
    res.status(500).json({
      error: 'Failed to declare siege',
    });
  }
});

/**
 * Declare hunt mode
 * Requires authentication with strict input validation
 */
router.post('/war/hunt', isAuthenticated, validateInput(warTargetSchema), async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} declared hunt on: ${req.body.target}`);
    const result = await olympusClient.declareHunt(req.body.target);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Hunt error:', error);
    res.status(500).json({
      error: 'Failed to declare hunt',
    });
  }
});

/**
 * End war mode
 * Requires authentication
 */
router.post('/war/end', isAuthenticated, async (req, res) => {
  try {
    console.log(`[Olympus] User ${(req.user as any)?.claims?.sub} ended war mode`);
    const result = await olympusClient.endWar();
    res.json(result);
  } catch (error) {
    console.error('[Olympus] End war error:', error);
    res.status(500).json({
      error: 'Failed to end war',
    });
  }
});

export default router;
