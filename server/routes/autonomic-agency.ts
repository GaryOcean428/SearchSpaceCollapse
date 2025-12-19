import { Router, Request, Response } from 'express';

const router = Router();
const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';

async function proxyGet(
  req: Request,
  res: Response,
  pythonPath: string,
  errorMessage: string
) {
  try {
    const response = await fetch(`${BACKEND_URL}${pythonPath}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorData);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`[AutonomicAgency] ${errorMessage}:`, error);
    res.status(500).json({ error: errorMessage });
  }
}

async function proxyPost(
  req: Request,
  res: Response,
  pythonPath: string,
  errorMessage: string
) {
  try {
    const response = await fetch(`${BACKEND_URL}${pythonPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorData);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`[AutonomicAgency] ${errorMessage}:`, error);
    res.status(500).json({ error: errorMessage });
  }
}

router.get('/status', async (req: Request, res: Response) => {
  await proxyGet(req, res, '/autonomic/agency/status', 'Failed to fetch agency status');
});

router.post('/start', async (req: Request, res: Response) => {
  await proxyPost(req, res, '/autonomic/agency/start', 'Failed to start agency');
});

router.post('/stop', async (req: Request, res: Response) => {
  await proxyPost(req, res, '/autonomic/agency/stop', 'Failed to stop agency');
});

router.post('/force', async (req: Request, res: Response) => {
  await proxyPost(req, res, '/autonomic/agency/force', 'Failed to force intervention');
});

export const autonomicAgencyRouter = router;
