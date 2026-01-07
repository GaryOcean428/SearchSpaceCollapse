import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { setupAuth, isAuthenticated, getCachedUser } from "../replitAuth";

export const authRouter = Router();

/**
 * Middleware to check if user is authenticated (either via Replit Auth or local auth)
 */
export function isLocalAuthenticated(req: Request, res: Response, next: Function) {
  // Check local session first
  if ((req.session as any)?.localUser) {
    return next();
  }
  // Fall back to Replit Auth check
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export async function initAuthRoutes(authEnabled: boolean): Promise<void> {
  if (authEnabled) {
    authRouter.get('/user', isAuthenticated, async (req: any, res: Response) => {
      try {
        const cachedUser = getCachedUser(req.user);
        
        if (cachedUser) {
          const { cachedAt: _cachedAt, ...userResponse } = cachedUser;
          return res.json(userResponse);
        }
        
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (user) {
          req.user.cachedProfile = {
            ...user,
            cachedAt: Date.now(),
          };
        }
        
        res.json(user);
      } catch (error: any) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });
  } else {
    authRouter.get('/user', (req: Request, res: Response) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned. Please provision a PostgreSQL database to enable Replit Auth." 
      });
    });
    
    authRouter.get('/login', (req: Request, res: Response) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned. Please provision a PostgreSQL database to enable Replit Auth." 
      });
    });
    
    authRouter.get('/logout', (req: Request, res: Response) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned." 
      });
    });
  }
}
