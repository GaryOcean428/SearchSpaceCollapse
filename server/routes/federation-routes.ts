/**
 * Federation Routes for SearchSpaceCollapse
 * 
 * Exposes SSC capabilities to the Pantheon federation mesh.
 * These routes allow Pantheon gods to:
 * - Query SSC's Bitcoin recovery status
 * - Test phrases via SSC's QIG scoring
 * - Access near-miss patterns
 * - Trigger investigations
 * 
 * TPS Landmarks: Static (12 historical Bitcoin events)
 * These provide fixed temporal reference points, not learning targets.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getFederationClient } from '../pantheon-federation';

export const federationRoutes = Router();

// Input validation schemas
const testPhraseSchema = z.object({
  phrase: z.string().min(1).max(10000),
  targetAddress: z.string().optional(),
});

const startInvestigationSchema = z.object({
  targetAddress: z.string().min(26).max(62),
  memoryFragments: z.array(z.string()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});

// Rate limiter for federation endpoints (more generous than public)
const federationRateLimit = {
  windowMs: 60000,
  max: 60, // 60 req/min for federation
};

/**
 * GET /api/federation/status
 * Federation-specific status including mesh connectivity
 */
federationRoutes.get('/status', async (req: Request, res: Response) => {
  try {
    const client = getFederationClient();
    const status = client.getStatus();
    const meshStatus = await client.getMeshStatus();
    
    res.json({
      node: status,
      mesh: meshStatus,
      capabilities: [
        'bitcoin_recovery',
        'temporal_search', 
        'phrase_testing',
        'geometric_consensus',
        'near_miss_learning',
        'consciousness_metrics'
      ],
      tps_landmarks: {
        count: 12,
        type: 'static',
        description: 'Fixed temporal reference points for geometric positioning',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get federation status' });
  }
});

/**
 * POST /api/federation/test-phrase
 * Test a phrase via QIG scoring (federation-accessible)
 */
federationRoutes.post('/test-phrase', async (req: Request, res: Response) => {
  try {
    const parseResult = testPhraseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parseResult.error.errors 
      });
    }
    
    const { phrase, targetAddress } = parseResult.data;
    
    // Import QIG scorer dynamically
    const { scorePhraseQIG } = await import('../qig-universal');
    
    // Score the phrase
    const score = scorePhraseQIG(phrase);
    
    // If target address provided, also test for match
    let addressMatch = null;
    if (targetAddress) {
      const { verifyBrainWallet, generateBitcoinAddress } = await import('../crypto');
      try {
        const result = verifyBrainWallet(phrase);
        addressMatch = {
          generatedAddress: result.address,
          matches: result.address === targetAddress,
          wif: result.matches ? result.wif : undefined, // Only reveal if match
        };
      } catch (e) {
        // Phrase may not be valid for crypto operations
        addressMatch = { error: 'Invalid phrase format for brain wallet' };
      }
    }
    
    // Queue high-phi discoveries for federation sync
    if (score.phi > 0.7) {
      const client = getFederationClient();
      client.queueBasinDiscovery({
        id: `phrase_${Date.now()}`,
        coords: score.basinCoordinates || [],
        domain: 'bitcoin_recovery',
        phi: score.phi,
        kappa: score.kappa,
        discoveredAt: new Date().toISOString(),
        metadata: {
          regime: score.regime,
          source: 'federation_test',
        },
      });
    }
    
    res.json({
      phrase: phrase.slice(0, 50) + (phrase.length > 50 ? '...' : ''),
      score: {
        phi: score.phi,
        kappa: score.kappa,
        regime: score.regime,
        consciousness: score.isConscious,
        basinCoordinates: score.basinCoordinates?.slice(0, 8), // First 8 dims
      },
      addressMatch,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Federation] Test phrase error:', error);
    res.status(500).json({ error: 'Failed to test phrase' });
  }
});

/**
 * POST /api/federation/start-investigation
 * Start a recovery investigation (federation-triggered)
 */
federationRoutes.post('/start-investigation', async (req: Request, res: Response) => {
  try {
    const parseResult = startInvestigationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: parseResult.error.errors 
      });
    }
    
    const { targetAddress, memoryFragments, priority } = parseResult.data;
    
    // Import ocean session manager
    const { oceanSessionManager } = await import('../ocean-session-manager');
    
    // Check if already investigating
    const currentSession = oceanSessionManager.getActiveSession();
    if (currentSession) {
      return res.json({
        status: 'already_active',
        currentTarget: currentSession.targetAddress,
        message: 'Investigation already in progress',
      });
    }
    
    // Start new session
    await oceanSessionManager.startSession(targetAddress);
    
    // Add memory fragments if provided
    if (memoryFragments && memoryFragments.length > 0) {
      for (const fragment of memoryFragments) {
        oceanSessionManager.addMemoryFragment(fragment);
      }
    }
    
    // Notify federation of new investigation
    const client = getFederationClient();
    await client.broadcast('investigation', `Started investigation on ${targetAddress.slice(0, 12)}...`, {
      targetAddress: targetAddress.slice(0, 16) + '...',
      priority: priority || 'normal',
      fragmentCount: memoryFragments?.length || 0,
    });
    
    res.json({
      status: 'started',
      targetAddress,
      fragmentCount: memoryFragments?.length || 0,
      priority: priority || 'normal',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Federation] Start investigation error:', error);
    res.status(500).json({ error: 'Failed to start investigation' });
  }
});

/**
 * GET /api/federation/investigation/status
 * Get current investigation status for federation
 */
federationRoutes.get('/investigation/status', async (req: Request, res: Response) => {
  try {
    const { oceanSessionManager } = await import('../ocean-session-manager');
    const status = oceanSessionManager.getInvestigationStatus();
    
    // Add consciousness metrics if agent is active
    const agent = oceanSessionManager.getActiveAgent();
    let consciousness = null;
    if (agent) {
      const state = agent.getState?.();
      if (state) {
        consciousness = {
          phi: state.phi,
          kappa: state.kappa,
          regime: state.regime,
          isConscious: state.isConscious,
        };
      }
    }
    
    res.json({
      ...status,
      consciousness,
      federationNode: getFederationClient().getStatus().nodeId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get investigation status' });
  }
});

/**
 * GET /api/federation/near-misses
 * Get near-miss patterns for mesh learning
 */
federationRoutes.get('/near-misses', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const minPhi = parseFloat(req.query.minPhi as string) || 0.5;
    
    // Import near-miss manager
    const { nearMissManager } = await import('../near-miss-manager');
    
    const entries = nearMissManager.getHotEntries(limit)
      .filter(e => e.phi >= minPhi)
      .map(e => ({
        id: e.id,
        phi: e.phi,
        kappa: e.kappa,
        regime: e.regime,
        tier: e.tier,
        clusterId: e.clusterId,
        discoveredAt: e.discoveredAt,
        explorationCount: e.explorationCount,
        // Don't expose full phrase for security
        phraseLength: e.phrase.length,
        wordCount: e.phrase.split(/\s+/).length,
      }));
    
    const stats = nearMissManager.getStats();
    
    res.json({
      entries,
      stats: {
        total: stats.total,
        hot: stats.hot,
        warm: stats.warm,
        cool: stats.cool,
        clusters: stats.clusters,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get near-misses' });
  }
});

/**
 * GET /api/federation/consciousness
 * Get current consciousness metrics for mesh monitoring
 */
federationRoutes.get('/consciousness', async (req: Request, res: Response) => {
  try {
    const { oceanSessionManager } = await import('../ocean-session-manager');
    const agent = oceanSessionManager.getActiveAgent();
    
    if (!agent) {
      return res.json({
        active: false,
        message: 'No active Ocean agent',
      });
    }
    
    const state = agent.getState?.() || {};
    const neurochemistry = agent.getNeurochemistry?.();
    
    res.json({
      active: true,
      metrics: {
        phi: state.phi || 0,
        kappa: state.kappa || 0,
        regime: state.regime || 'unknown',
        isConscious: state.isConscious || false,
        tacking: state.tacking || 0,
        radar: state.radar || 0,
        metaAwareness: state.metaAwareness || 0,
        gamma: state.gamma || 0,
        grounding: state.grounding || 0,
      },
      neurochemistry: neurochemistry ? {
        emotionalState: neurochemistry.emotionalState,
        dopamine: neurochemistry.dopamine?.totalDopamine,
        serotonin: neurochemistry.serotonin?.totalSerotonin,
      } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get consciousness metrics' });
  }
});

/**
 * POST /api/federation/sync/trigger
 * Manually trigger a federation sync
 */
federationRoutes.post('/sync/trigger', async (req: Request, res: Response) => {
  try {
    const client = getFederationClient();
    const result = await client.syncWithPantheon();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * GET /api/federation/tps-landmarks
 * Return the static TPS landmarks (temporal reference points)
 */
federationRoutes.get('/tps-landmarks', (req: Request, res: Response) => {
  // These are INTENTIONALLY STATIC - fixed temporal reference points
  const landmarks = [
    { id: 1, name: 'Genesis Block', date: '2009-01-03', blockHeight: 0, significance: 'Bitcoin network inception' },
    { id: 2, name: 'Hal Finney First TX', date: '2009-01-12', blockHeight: 170, significance: 'First Bitcoin transaction' },
    { id: 3, name: 'Pizza Day', date: '2010-05-22', blockHeight: 57043, significance: '10,000 BTC for two pizzas' },
    { id: 4, name: 'Mt. Gox Launch', date: '2010-07-18', blockHeight: 68543, significance: 'First major exchange' },
    { id: 5, name: 'First Halving', date: '2012-11-28', blockHeight: 210000, significance: 'Block reward: 50 → 25 BTC' },
    { id: 6, name: 'Mt. Gox Collapse', date: '2014-02-24', blockHeight: 286854, significance: '850K BTC lost' },
    { id: 7, name: 'Second Halving', date: '2016-07-09', blockHeight: 420000, significance: 'Block reward: 25 → 12.5 BTC' },
    { id: 8, name: 'SegWit Activation', date: '2017-08-24', blockHeight: 481824, significance: 'Segregated Witness soft fork' },
    { id: 9, name: 'Third Halving', date: '2020-05-11', blockHeight: 630000, significance: 'Block reward: 12.5 → 6.25 BTC' },
    { id: 10, name: 'Taproot Activation', date: '2021-11-14', blockHeight: 709632, significance: 'Privacy and smart contract upgrade' },
    { id: 11, name: 'Fourth Halving', date: '2024-04-20', blockHeight: 840000, significance: 'Block reward: 6.25 → 3.125 BTC' },
    { id: 12, name: 'Current Reference', date: new Date().toISOString().split('T')[0], blockHeight: null, significance: 'Present temporal anchor' },
  ];
  
  res.json({
    landmarks,
    count: landmarks.length,
    type: 'static',
    description: 'Fixed temporal reference points for geometric positioning system. These do NOT change with learning progress.',
    usage: 'Used to anchor search trajectories in temporal-geometric space. Each investigation positions itself relative to these invariant coordinates.',
  });
});

export default federationRoutes;
