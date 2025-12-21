/**
 * Self-Healing Routes
 * 
 * Exposes self-healing monitoring and control endpoints.
 */

import { Router, type Request, type Response } from 'express';
import { selfHealingAdapter, type GeometricSnapshot } from '../lib/self-healing/adapter';

const router = Router();

/**
 * GET /api/self-healing/health
 * Check geometric health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await selfHealingAdapter.detectDegradation();
    
    const statusCode = health.severity === 'critical' ? 503 
                     : health.severity === 'warning' ? 207 
                     : 200;
    
    res.status(statusCode).json(health);
  } catch (error: any) {
    console.error('Health check error:', error);
    res.status(500).json({
      degraded: true,
      issues: ['Health check failed'],
      severity: 'critical',
      error: error.message,
    });
  }
});

/**
 * POST /api/self-healing/snapshot
 * Capture a geometric snapshot
 */
router.post('/snapshot', async (req: Request, res: Response) => {
  try {
    const systemState = req.body;
    
    // Validate required fields
    if (typeof systemState.phi !== 'number' || 
        typeof systemState.kappa_eff !== 'number') {
      return res.status(400).json({
        error: 'Missing required fields: phi, kappa_eff'
      });
    }
    
    const snapshot = await selfHealingAdapter.captureSnapshot(systemState);
    res.json(snapshot);
  } catch (error: any) {
    console.error('Snapshot capture error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/self-healing/stats
 * Get monitoring statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await selfHealingAdapter.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/self-healing/heal
 * Manually trigger healing attempt
 */
router.post('/heal', async (req: Request, res: Response) => {
  try {
    const result = await selfHealingAdapter.attemptHealing();
    
    const statusCode = result.healed ? 200 : 207;
    res.status(statusCode).json(result);
  } catch (error: any) {
    console.error('Healing attempt error:', error);
    res.status(500).json({
      healed: false,
      reason: error.message,
    });
  }
});

/**
 * POST /api/self-healing/evaluate
 * Evaluate code change fitness
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const { module_name, new_code, test_env } = req.body;
    
    if (!module_name || !new_code) {
      return res.status(400).json({
        error: 'Missing required fields: module_name, new_code'
      });
    }
    
    const result = await selfHealingAdapter.evaluateCodeChange(
      module_name,
      new_code,
      test_env
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('Code evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as selfHealingRouter };
