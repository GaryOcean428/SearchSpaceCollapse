/**
 * Olympus Routes - Zeus Chat and Pantheon API
 * 
 * Proxy routes to Python Olympus backend for:
 * - Zeus Chat (conversational interface)
 * - Pantheon polling
 * - God assessments
 * - War mode declarations
 */

import { Router } from 'express';
import { OlympusClient } from '../olympus-client';

const router = Router();
const olympusClient = new OlympusClient(
  process.env.PYTHON_BACKEND_URL || 'http://localhost:5001'
);

/**
 * Zeus Chat endpoint
 */
router.post('/zeus/chat', async (req, res) => {
  try {
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    
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
 */
router.post('/zeus/search', async (req, res) => {
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
 */
router.get('/zeus/memory/stats', async (req, res) => {
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
 */
router.post('/poll', async (req, res) => {
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
 */
router.post('/assess', async (req, res) => {
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
 */
router.get('/status', async (req, res) => {
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

/**
 * Get specific god status
 */
router.get('/god/:godName/status', async (req, res) => {
  try {
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
 */
router.post('/god/:godName/assess', async (req, res) => {
  try {
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

/**
 * Declare blitzkrieg mode
 */
router.post('/war/blitzkrieg', async (req, res) => {
  try {
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
 */
router.post('/war/siege', async (req, res) => {
  try {
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
 */
router.post('/war/hunt', async (req, res) => {
  try {
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
 */
router.post('/war/end', async (req, res) => {
  try {
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
