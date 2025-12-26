/**
 * Kernel Evolution Routes - Near-Miss Fitness Rewards & E8 Population Control
 * 
 * API endpoints for:
 * - Evolution statistics and monitoring
 * - Kernel fitness tracking
 * - Recent evolution events
 * - E8 population control status
 * - Manual evolution triggers (for testing)
 */

import { Router, Request, Response } from 'express';
import { kernelFitnessService } from '../kernel-fitness-service';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await kernelFitnessService.getEvolutionStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Evolution API] Failed to get stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get evolution stats' });
  }
});

router.get('/events', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const events = await kernelFitnessService.getRecentEvents(limit);
    res.json({
      success: true,
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Evolution API] Failed to get events:', error);
    res.status(500).json({ success: false, error: 'Failed to get evolution events' });
  }
});

router.get('/fitness', async (req: Request, res: Response) => {
  try {
    const reproductionCandidates = kernelFitnessService.getReproductionCandidates();
    const mutationCandidates = kernelFitnessService.getMutationCandidates();
    
    res.json({
      success: true,
      reproductionCandidates: reproductionCandidates.map(f => ({
        kernelId: f.kernelId,
        fitness: f.geometricFitness,
        phi: f.phiCurrent,
        kappa: f.kappaCurrent,
        contributions: f.nearMissContributions,
      })),
      mutationCandidates: mutationCandidates.map(f => ({
        kernelId: f.kernelId,
        fitness: f.geometricFitness,
        phi: f.phiCurrent,
        kappa: f.kappaCurrent,
        contributions: f.nearMissContributions,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Evolution API] Failed to get fitness data:', error);
    res.status(500).json({ success: false, error: 'Failed to get fitness data' });
  }
});

router.get('/fitness/:kernelId', async (req: Request, res: Response) => {
  try {
    const { kernelId } = req.params;
    const fitness = await kernelFitnessService.getKernelFitness(kernelId);
    res.json({
      success: true,
      fitness: {
        kernelId: fitness.kernelId,
        geometricFitness: fitness.geometricFitness,
        phiCurrent: fitness.phiCurrent,
        phiGradient: fitness.phiGradient,
        kappaCurrent: fitness.kappaCurrent,
        kappaStability: fitness.kappaStability,
        evolutionPressure: fitness.evolutionPressure,
        nearMissContributions: fitness.nearMissContributions,
        lastRewardAt: fitness.lastRewardAt,
        fitnessComputedAt: fitness.fitnessComputedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Evolution API] Failed to get kernel fitness:', error);
    res.status(500).json({ success: false, error: 'Failed to get kernel fitness' });
  }
});

router.post('/decay', async (req: Request, res: Response) => {
  try {
    const result = await kernelFitnessService.applyFitnessDecay();
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Evolution API] Failed to apply decay:', error);
    res.status(500).json({ success: false, error: 'Failed to apply fitness decay' });
  }
});

router.post('/enforce-e8-cap', async (req: Request, res: Response) => {
  try {
    const result = await kernelFitnessService.enforceE8Cap();
    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Evolution API] Failed to enforce E8 cap:', error);
    res.status(500).json({ success: false, error: 'Failed to enforce E8 cap' });
  }
});

export default router;
