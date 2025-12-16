import { Router, type Request, type Response } from "express";
import { sweepApprovalService } from "../sweep-approval";
import { sweepApprovalServiceV2 } from "../sweep-approval-service";
import { isAuthenticated } from "../replitAuth";

export const sweepsRouter = Router();

sweepsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const sweeps = await sweepApprovalServiceV2.getPendingSweeps(status as any);
    res.json({ success: true, sweeps });
  } catch (error: any) {
    console.error("[API] Error getting sweeps:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await sweepApprovalServiceV2.getSweepStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error("[API] Error getting sweep stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.get("/:id/audit", async (req: Request, res: Response) => {
  try {
    const auditLog = await sweepApprovalServiceV2.getSweepAuditLog(req.params.id);
    res.json({ success: true, auditLog });
  } catch (error: any) {
    console.error("[API] Error getting audit log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.get("/audit/:sweepId?", async (req: Request, res: Response) => {
  try {
    if (req.params.sweepId) {
      const auditLog = await sweepApprovalServiceV2.getSweepAuditLog(req.params.sweepId);
      res.json({ success: true, auditLog });
    } else {
      res.status(400).json({ success: false, error: "sweepId is required" });
    }
  } catch (error: any) {
    console.error("[API] Error getting audit log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const sweep = await sweepApprovalServiceV2.getSweepById(req.params.id);
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
    const { notes } = req.body;
    const result = await sweepApprovalServiceV2.approveSweep(req.params.id, approvedBy, notes);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    console.error("[API] Error approving sweep:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

sweepsRouter.post("/:id/execute", isAuthenticated, async (req: any, res: Response) => {
  try {
    const { destinationAddress, txHash, networkFee } = req.body;
    
    if (!destinationAddress || !txHash || networkFee === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: destinationAddress, txHash, networkFee" 
      });
    }
    
    const result = await sweepApprovalServiceV2.executeSweep(
      req.params.id, 
      destinationAddress, 
      txHash, 
      Number(networkFee)
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    console.error("[API] Error executing sweep:", error);
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
    const rejectedBy = req.user?.email || req.user?.id || "operator";
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, error: "Reason is required" });
    }
    
    const result = await sweepApprovalServiceV2.rejectSweep(req.params.id, rejectedBy, reason);
    
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
