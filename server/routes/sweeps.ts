import { Router, type Request, type Response } from "express";
import { sweepApprovalService } from "../sweep-approval";
import { isAuthenticated } from "../replitAuth";

export const sweepsRouter = Router();

sweepsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const sweeps = await sweepApprovalService.getPendingSweeps(status as any);
    res.json({ success: true, sweeps });
  } catch (error: any) {
    console.error("[API] Error getting sweeps:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await sweepApprovalService.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error("[API] Error getting sweep stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.get("/audit/:sweepId?", async (req: Request, res: Response) => {
  try {
    const auditLog = await sweepApprovalService.getAuditLog(req.params.sweepId);
    res.json({ success: true, auditLog });
  } catch (error: any) {
    console.error("[API] Error getting audit log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const sweep = await sweepApprovalService.getSweepById(req.params.id);
    if (!sweep) {
      return res.status(404).json({ success: false, error: "Sweep not found" });
    }
    res.json({ success: true, sweep });
  } catch (error: any) {
    console.error("[API] Error getting sweep:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.post("/:id/approve", isAuthenticated, async (req: any, res: Response) => {
  try {
    const approvedBy = req.user?.email || req.user?.id || "operator";
    const result = await sweepApprovalService.approveSweep(req.params.id, approvedBy);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    console.error("[API] Error approving sweep:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.post("/:id/broadcast", isAuthenticated, async (req: any, res: Response) => {
  try {
    const result = await sweepApprovalService.broadcastSweep(req.params.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    console.error("[API] Error broadcasting sweep:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.post("/:id/reject", isAuthenticated, async (req: any, res: Response) => {
  try {
    const { reason } = req.body;
    const result = await sweepApprovalService.rejectSweep(req.params.id, reason || "Manual rejection");
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    console.error("[API] Error rejecting sweep:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.post("/:id/refresh", async (req: Request, res: Response) => {
  try {
    const result = await sweepApprovalService.refreshBalance(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error("[API] Error refreshing sweep balance:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
