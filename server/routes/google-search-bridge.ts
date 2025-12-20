/**
 * Google Search Bridge API
 * 
 * Provides HTTP endpoints for Python backend to access TypeScript Google search.
 * This bridges the MultiSearchOrchestrator to the Python ScrapyOrchestrator.
 */
import { Router, Request, Response } from 'express';
import { getMultiSearchOrchestrator } from '../geometric-discovery';
import type { GeometricQuery } from '../geometric-discovery/types';

const router = Router();

/**
 * POST /api/search/google
 * Execute a Google search via MultiSearchOrchestrator
 */
router.post('/google', async (req: Request, res: Response) => {
  const orchestrator = getMultiSearchOrchestrator();
  const originalMode = orchestrator.getConfig().mode;
  
  try {
    const { query, maxResults = 10, timeRange } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string required' });
    }
    
    const geometricQuery: GeometricQuery = {
      text: query,
      maxResults,
      timeRange: timeRange ? {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      } : undefined,
    };
    
    orchestrator.setMode('parallel');
    
    const results = await orchestrator.search(geometricQuery);
    
    console.log(`[GoogleBridge] Returned ${results.length} results for: "${query.slice(0, 50)}..."`);
    
    res.json({
      success: true,
      results,
      query,
      resultCount: results.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[GoogleBridge] Search error:', error.message);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  } finally {
    orchestrator.setMode(originalMode);
  }
});

/**
 * GET /api/search/health
 * Check search provider health status
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const orchestrator = getMultiSearchOrchestrator();
    const health = orchestrator.getProviderHealth();
    
    res.json({
      success: true,
      providers: health,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
