import { db, withDbRetry } from "./db";
import {
  blocks,
  transactions,
  addresses,
  recoveryPriorities,
  recoveryWorkflows,
  type Block,
  type Transaction,
  type Address,
  type RecoveryPriority,
  type RecoveryWorkflow
} from "@shared/schema";
import { eq, and, or, gte, lte, desc, asc, sql } from "drizzle-orm";

export interface IObserverStorage {
  // Block operations
  saveBlock(block: Omit<Block, "createdAt">): Promise<Block>;
  getBlock(height: number): Promise<Block | null>;
  getBlocks(startHeight: number, endHeight: number): Promise<Block[]>;
  getLatestBlockHeight(): Promise<number | null>;
  
  // Transaction operations
  saveTransaction(tx: Omit<Transaction, "createdAt">): Promise<Transaction>;
  getTransaction(txid: string): Promise<Transaction | null>;
  getTransactionsForBlock(blockHeight: number): Promise<Transaction[]>;
  
  // Address operations
  saveAddress(address: Omit<Address, "createdAt" | "updatedAt">): Promise<Address>;
  updateAddress(addressStr: string, updates: Partial<Address>): Promise<void>;
  getAddress(addressStr: string): Promise<Address | null>;
  getDormantAddresses(filters?: {
    minBalance?: number;
    minInactivityDays?: number;
    limit?: number;
    offset?: number;
  }): Promise<Address[]>;
  getAllAddresses(limit?: number, offset?: number): Promise<Address[]>;
  
  // Recovery priority operations
  saveRecoveryPriority(priority: Omit<RecoveryPriority, "createdAt" | "updatedAt">): Promise<RecoveryPriority>;
  updateRecoveryPriority(id: string, updates: Partial<RecoveryPriority>): Promise<void>;
  getRecoveryPriorities(filters?: {
    minKappa?: number;
    maxKappa?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RecoveryPriority[]>;
  getRecoveryPriority(address: string): Promise<RecoveryPriority | null>;
  
  // Recovery workflow operations
  saveRecoveryWorkflow(workflow: Omit<RecoveryWorkflow, "createdAt" | "updatedAt">): Promise<RecoveryWorkflow>;
  updateRecoveryWorkflow(id: string, updates: Partial<RecoveryWorkflow>): Promise<void>;
  getRecoveryWorkflows(filters?: {
    address?: string;
    vector?: string;
    status?: string;
  }): Promise<RecoveryWorkflow[]>;
  getRecoveryWorkflow(id: string): Promise<RecoveryWorkflow | null>;
  findWorkflowBySearchJobId(searchJobId: string): Promise<RecoveryWorkflow | null>;
}

export class ObserverStorage implements IObserverStorage {
  /**
   * Normalize legacy constraint field names to Task 7 schema
   * Returns new object with normalized fields (does not mutate original)
   * - linkedEntities → entityLinkage
   * - artifactCount → artifactDensity
   * - graphDegree → graphSignature
   */
  private normalizeConstraints(constraints: any): { normalized: any; hadLegacy: boolean } {
    if (!constraints) return { normalized: constraints, hadLegacy: false };
    
    let hadLegacy = false;
    const normalized = { ...constraints }; // Create new object
    
    // Migrate old field names to new ones
    if (normalized.linkedEntities !== undefined) {
      normalized.entityLinkage = normalized.linkedEntities;
      delete normalized.linkedEntities;
      hadLegacy = true;
    }
    if (normalized.artifactCount !== undefined) {
      normalized.artifactDensity = normalized.artifactCount;
      delete normalized.artifactCount;
      hadLegacy = true;
    }
    if (normalized.graphDegree !== undefined) {
      normalized.graphSignature = normalized.graphDegree;
      delete normalized.graphDegree;
      hadLegacy = true;
    }
    
    return { normalized, hadLegacy };
  }

  /**
   * Normalize workflow progress JSON for constrained_search workflows
   * Regenerates constraintsIdentified display strings from normalized constraints
   */
  private async normalizeWorkflowProgress(workflow: RecoveryWorkflow): Promise<boolean> {
    if (!workflow.progress || workflow.vector !== 'constrained_search') {
      return false; // Nothing to normalize
    }
    
    const progress = workflow.progress as any;
    const constrainedSearchProgress = progress?.constrainedSearchProgress;
    
    if (!constrainedSearchProgress?.constraintsIdentified) {
      return false; // No constraint strings to normalize
    }
    
    // Check if old terminology exists in constraint strings
    const hasLegacyStrings = constrainedSearchProgress.constraintsIdentified.some((str: string) =>
      str.includes('linked entities') ||
      str.includes('artifact density') && !str.includes('Artifact density:') ||
      str.includes('graph signature') && !str.includes('Graph signature:')
    );
    
    if (!hasLegacyStrings) {
      return false; // Already using new format
    }
    
    // Get the priority to access normalized constraints
    const priority = await this.getRecoveryPriority(workflow.address);
    if (!priority) {
      return false; // Can't regenerate without priority data
    }
    
    // Import formatter to regenerate display strings
    const { formatConstraintsForDisplay } = await import("./recovery-orchestrator");
    const newConstraints = formatConstraintsForDisplay(priority.constraints as any);
    
    // Update progress with regenerated strings
    progress.constrainedSearchProgress.constraintsIdentified = newConstraints;
    
    // Update notes that contain old terminology
    if (progress.notes) {
      progress.notes = progress.notes.map((note: string) =>
        note.replace(/(\d+) linked entities/g, 'Entity linkage: $1 linked entities')
           .replace(/(\d+\.\d+) artifact density/g, 'Artifact density: $1 vectors')
           .replace(/(\d+) graph signature/g, 'Graph signature: $1 nodes')
      );
    }
    
    return true; // Normalization performed
  }

  async saveBlock(block: Omit<Block, "createdAt">): Promise<Block> {
    if (!db) throw new Error("Database not initialized");
    const saved = await withDbRetry(
      async () => {
        const [result] = await db!.insert(blocks)
          .values(block)
          .onConflictDoNothing({ target: blocks.height })
          .returning();
        return result;
      },
      'insert-block'
    );
    // If conflict (block already exists), fetch and return it
    if (!saved) {
      const existing = await this.getBlock(block.height);
      if (!existing) throw new Error(`Failed to save or retrieve block ${block.height}`);
      return existing;
    }
    return saved;
  }

  async getBlock(height: number): Promise<Block | null> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        const [block] = await db!.select().from(blocks).where(eq(blocks.height, height)).limit(1);
        return block || null;
      },
      'select-block'
    );
    return result;
  }

  async getBlocks(startHeight: number, endHeight: number): Promise<Block[]> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        return await db!.select().from(blocks)
          .where(and(
            gte(blocks.height, startHeight),
            lte(blocks.height, endHeight)
          ))
          .orderBy(asc(blocks.height));
      },
      'select-blocks-range'
    );
    if (!result) {
      console.warn('[ObserverStorage] Failed to get blocks range after retries');
      return [];
    }
    return result;
  }

  async getLatestBlockHeight(): Promise<number | null> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        const [row] = await db!.select({ maxHeight: sql<number>`MAX(${blocks.height})` })
          .from(blocks)
          .limit(1);
        return row?.maxHeight ?? null;
      },
      'select-latest-block-height'
    );
    return result;
  }

  async saveTransaction(tx: Omit<Transaction, "createdAt">): Promise<Transaction> {
    if (!db) throw new Error("Database not initialized");
    const saved = await withDbRetry(
      async () => {
        const [result] = await db!.insert(transactions)
          .values(tx)
          .onConflictDoNothing({ target: transactions.txid })
          .returning();
        return result;
      },
      'insert-transaction'
    );
    // If conflict (transaction already exists), fetch and return it
    if (!saved) {
      const existing = await this.getTransaction(tx.txid);
      if (!existing) throw new Error(`Failed to save or retrieve transaction ${tx.txid}`);
      return existing;
    }
    return saved;
  }

  async getTransaction(txid: string): Promise<Transaction | null> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        const [tx] = await db!.select().from(transactions).where(eq(transactions.txid, txid)).limit(1);
        return tx || null;
      },
      'select-transaction'
    );
    return result;
  }

  async getTransactionsForBlock(blockHeight: number): Promise<Transaction[]> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        return await db!.select().from(transactions)
          .where(eq(transactions.blockHeight, blockHeight));
      },
      'select-transactions-for-block'
    );
    if (!result) {
      console.warn('[ObserverStorage] Failed to get transactions for block after retries');
      return [];
    }
    return result;
  }

  async saveAddress(address: Omit<Address, "createdAt" | "updatedAt">): Promise<Address> {
    if (!db) throw new Error("Database not initialized");
    
    // Use SQL to preserve first-seen data and intelligently merge signatures
    const saved = await withDbRetry(
      async () => {
        const [result] = await db!.insert(addresses)
          .values(address)
          .onConflictDoUpdate({
            target: addresses.address,
            set: {
              // Only update if new activity is MORE RECENT
              lastActivityHeight: sql`GREATEST(${addresses.lastActivityHeight}, ${address.lastActivityHeight})`,
              lastActivityTxid: sql`CASE WHEN ${address.lastActivityHeight} > ${addresses.lastActivityHeight} THEN ${address.lastActivityTxid} ELSE ${addresses.lastActivityTxid} END`,
              lastActivityTimestamp: sql`CASE WHEN ${address.lastActivityHeight} > ${addresses.lastActivityHeight} THEN ${address.lastActivityTimestamp} ELSE ${addresses.lastActivityTimestamp} END`,
              
              // Update balance ONLY if observation is more recent (or equal - to handle same-block updates)
              // Note: Proper UTXO tracking in Phase 2 will compute balance from full UTXO set
              currentBalance: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.currentBalance} ELSE ${addresses.currentBalance} END`,
              
              // Dormancy is calculated by dormancy-updater, preserve existing value
              dormancyBlocks: addresses.dormancyBlocks,
              isDormant: addresses.isDormant,
              
              // Update geometric signatures ONLY if observation is more recent
              // This prevents rescanning old blocks from corrupting modern signatures
              temporalSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.temporalSignature} ELSE ${addresses.temporalSignature} END`,
              
              valueSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.valueSignature} ELSE ${addresses.valueSignature} END`,
              
              graphSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.graphSignature} ELSE ${addresses.graphSignature} END`,
              
              scriptSignature: sql`CASE WHEN ${address.lastActivityHeight} >= ${addresses.lastActivityHeight} THEN ${address.scriptSignature} ELSE ${addresses.scriptSignature} END`,
              
              updatedAt: new Date(),
            }
          })
          .returning();
        return result;
      },
      'upsert-address'
    );
    if (!saved) throw new Error(`Failed to save address ${address.address}`);
    return saved;
  }

  async updateAddress(addressStr: string, updates: Partial<Address>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        await db!.update(addresses)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(addresses.address, addressStr));
        return true;
      },
      'update-address'
    );
    if (!result) {
      throw new Error(`[ObserverStorage] Failed to update address ${addressStr} after retries`);
    }
  }

  async getAddress(addressStr: string): Promise<Address | null> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        const [address] = await db!.select().from(addresses).where(eq(addresses.address, addressStr)).limit(1);
        return address || null;
      },
      'select-address'
    );
    return result;
  }

  async getDormantAddresses(filters?: {
    minBalance?: number;
    minInactivityDays?: number;
    limit?: number;
    offset?: number;
  }): Promise<Address[]> {
    if (!db) throw new Error("Database not initialized");
    
    const result = await withDbRetry(
      async () => {
        const conditions = [];
        
        // CRITICAL: Always filter for dormant addresses only
        conditions.push(eq(addresses.isDormant, true));
        
        if (filters?.minBalance !== undefined) {
          conditions.push(gte(addresses.currentBalance, BigInt(filters.minBalance)));
        }
        
        if (filters?.minInactivityDays !== undefined) {
          const inactivityThreshold = new Date();
          inactivityThreshold.setDate(inactivityThreshold.getDate() - filters.minInactivityDays);
          conditions.push(lte(addresses.lastActivityTimestamp, inactivityThreshold));
        }
        
        let query = db!.select().from(addresses).where(and(...conditions));
        
        query = query.orderBy(desc(addresses.currentBalance)) as any;
        
        if (filters?.limit !== undefined) {
          query = query.limit(filters.limit) as any;
        }
        
        if (filters?.offset !== undefined) {
          query = query.offset(filters.offset) as any;
        }
        
        return await query;
      },
      'select-dormant-addresses'
    );
    if (!result) {
      console.warn('[ObserverStorage] Failed to get dormant addresses after retries');
      return [];
    }
    return result;
  }

  async getAllAddresses(limit?: number, offset?: number): Promise<Address[]> {
    if (!db) throw new Error("Database not initialized");
    
    const result = await withDbRetry(
      async () => {
        let query = db!.select().from(addresses).orderBy(asc(addresses.firstSeenHeight));
        
        if (limit !== undefined) {
          query = query.limit(limit) as any;
        }
        
        if (offset !== undefined) {
          query = query.offset(offset) as any;
        }
        
        return await query;
      },
      'select-all-addresses'
    );
    if (!result) {
      console.warn('[ObserverStorage] Failed to get all addresses after retries');
      return [];
    }
    return result;
  }

  async saveRecoveryPriority(priority: Omit<RecoveryPriority, "createdAt" | "updatedAt">): Promise<RecoveryPriority> {
    if (!db) throw new Error("Database not initialized");
    const saved = await withDbRetry(
      async () => {
        const [result] = await db!.insert(recoveryPriorities).values(priority).returning();
        return result;
      },
      'insert-recovery-priority'
    );
    if (!saved) throw new Error(`Failed to save recovery priority ${priority.id}`);
    return saved;
  }

  async updateRecoveryPriority(id: string, updates: Partial<RecoveryPriority>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        await db!.update(recoveryPriorities)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(recoveryPriorities.id, id));
        return true;
      },
      'update-recovery-priority'
    );
    if (!result) {
      throw new Error(`[ObserverStorage] Failed to update recovery priority ${id} after retries`);
    }
  }

  async getRecoveryPriorities(filters?: {
    minKappa?: number;
    maxKappa?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<RecoveryPriority[]> {
    if (!db) throw new Error("Database not initialized");
    
    const priorities = await withDbRetry(
      async () => {
        const conditions = [];
        
        if (filters?.minKappa !== undefined) {
          conditions.push(gte(recoveryPriorities.kappaRecovery, filters.minKappa));
        }
        
        if (filters?.maxKappa !== undefined) {
          conditions.push(lte(recoveryPriorities.kappaRecovery, filters.maxKappa));
        }
        
        if (filters?.status) {
          conditions.push(eq(recoveryPriorities.recoveryStatus, filters.status));
        }
        
        let query = db!.select().from(recoveryPriorities);
        
        if (conditions.length > 0) {
          const whereClause = conditions.length === 1 
            ? conditions[0] 
            : and(...conditions);
          query = query.where(whereClause) as any;
        }
        
        query = query.orderBy(desc(recoveryPriorities.kappaRecovery)) as any;
        
        if (filters?.limit !== undefined) {
          query = query.limit(filters.limit) as any;
        }
        
        if (filters?.offset !== undefined) {
          query = query.offset(filters.offset) as any;
        }
        
        return await query;
      },
      'select-recovery-priorities'
    );
    
    if (!priorities) {
      console.warn('[ObserverStorage] Failed to get recovery priorities after retries');
      return [];
    }
    
    // Normalize old field names to new schema (Task 7 migration)
    for (const priority of priorities) {
      const { normalized, hadLegacy } = this.normalizeConstraints(priority.constraints as any);
      
      // Update priority object with normalized constraints
      priority.constraints = normalized;
      
      // Persist normalized constraints back to database (write-through migration)
      if (hadLegacy) {
        console.log(`[ObserverStorage] Write-through migration: priority ${priority.address}`);
        await withDbRetry(
          async () => {
            await db!.update(recoveryPriorities)
              .set({ constraints: normalized, updatedAt: new Date() })
              .where(eq(recoveryPriorities.address, priority.address));
          },
          'migrate-recovery-priority-constraints'
        );
      }
    }
    
    return priorities;
  }

  async getRecoveryPriority(address: string): Promise<RecoveryPriority | null> {
    if (!db) throw new Error("Database not initialized");
    const priority = await withDbRetry(
      async () => {
        const [row] = await db!.select().from(recoveryPriorities).where(eq(recoveryPriorities.address, address)).limit(1);
        return row || null;
      },
      'select-recovery-priority'
    );
    
    if (!priority) return null;
    
    // Normalize old field names to new schema (Task 7 migration)
    const { normalized, hadLegacy } = this.normalizeConstraints(priority.constraints as any);
    
    // Update priority object with normalized constraints
    priority.constraints = normalized;
    
    // Persist normalized constraints back to database (write-through migration)
    // TODO: Consider batch migration script for high-traffic scenarios
    if (hadLegacy) {
      console.log(`[ObserverStorage] Write-through migration: priority ${address}`);
      await withDbRetry(
        async () => {
          await db!.update(recoveryPriorities)
            .set({ constraints: normalized, updatedAt: new Date() })
            .where(eq(recoveryPriorities.address, address));
        },
        'migrate-recovery-priority-constraints'
      );
    }
    
    return priority;
  }

  async saveRecoveryWorkflow(workflow: Omit<RecoveryWorkflow, "createdAt" | "updatedAt">): Promise<RecoveryWorkflow> {
    if (!db) throw new Error("Database not initialized");
    const saved = await withDbRetry(
      async () => {
        const [result] = await db!.insert(recoveryWorkflows).values(workflow).returning();
        return result;
      },
      'insert-recovery-workflow'
    );
    if (!saved) throw new Error(`Failed to save recovery workflow ${workflow.id}`);
    return saved;
  }

  async updateRecoveryWorkflow(id: string, updates: Partial<RecoveryWorkflow>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    const result = await withDbRetry(
      async () => {
        await db!.update(recoveryWorkflows)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(recoveryWorkflows.id, id));
        return true;
      },
      'update-recovery-workflow'
    );
    if (!result) {
      throw new Error(`[ObserverStorage] Failed to update recovery workflow ${id} after retries`);
    }
  }

  async getRecoveryWorkflows(filters?: {
    address?: string;
    vector?: string;
    status?: string;
  }): Promise<RecoveryWorkflow[]> {
    if (!db) throw new Error("Database not initialized");
    
    const conditions = [];
    
    if (filters?.address) {
      conditions.push(eq(recoveryWorkflows.address, filters.address));
    }
    
    if (filters?.vector) {
      conditions.push(eq(recoveryWorkflows.vector, filters.vector));
    }
    
    if (filters?.status) {
      conditions.push(eq(recoveryWorkflows.status, filters.status));
    }
    
    const workflows = await withDbRetry(
      async () => {
        if (conditions.length > 0) {
          const whereClause = conditions.length === 1 
            ? conditions[0] 
            : and(...conditions);
          return await db!.select().from(recoveryWorkflows).where(whereClause);
        } else {
          return await db!.select().from(recoveryWorkflows);
        }
      },
      'select-recovery-workflows'
    );
    
    if (!workflows) {
      console.warn('[ObserverStorage] Failed to get recovery workflows after retries');
      return [];
    }
    
    // Normalize workflow progress for constrained_search workflows
    for (const workflow of workflows) {
      const wasNormalized = await this.normalizeWorkflowProgress(workflow);
      
      // Persist normalized progress back to database (write-through migration)
      if (wasNormalized) {
        console.log(`[ObserverStorage] Write-through migration: workflow ${workflow.id} progress`);
        await withDbRetry(
          async () => {
            await db!.update(recoveryWorkflows)
              .set({ progress: workflow.progress, updatedAt: new Date() })
              .where(eq(recoveryWorkflows.id, workflow.id));
          },
          'migrate-recovery-workflow-progress'
        );
      }
    }
    
    return workflows;
  }

  async getRecoveryWorkflow(id: string): Promise<RecoveryWorkflow | null> {
    if (!db) throw new Error("Database not initialized");
    const workflow = await withDbRetry(
      async () => {
        const [row] = await db!.select().from(recoveryWorkflows).where(eq(recoveryWorkflows.id, id)).limit(1);
        return row || null;
      },
      'select-recovery-workflow'
    );
    
    if (!workflow) return null;
    
    // Normalize workflow progress for constrained_search workflows
    const wasNormalized = await this.normalizeWorkflowProgress(workflow);
    
    // Persist normalized progress back to database (write-through migration)
    if (wasNormalized) {
      console.log(`[ObserverStorage] Write-through migration: workflow ${id} progress`);
      await withDbRetry(
        async () => {
          await db!.update(recoveryWorkflows)
            .set({ progress: workflow.progress, updatedAt: new Date() })
            .where(eq(recoveryWorkflows.id, id));
        },
        'migrate-recovery-workflow-progress'
      );
    }
    
    return workflow;
  }

  async findWorkflowBySearchJobId(searchJobId: string): Promise<RecoveryWorkflow | null> {
    if (!db) throw new Error("Database not initialized");
    
    const allWorkflows = await withDbRetry(
      async () => {
        return await db!.select().from(recoveryWorkflows);
      },
      'select-all-workflows-for-search'
    );
    
    if (!allWorkflows) {
      console.warn('[ObserverStorage] Failed to get workflows for search after retries');
      return null;
    }
    
    for (const workflow of allWorkflows) {
      const progress = workflow.progress as any;
      const searchProgress = progress?.constrainedSearchProgress;
      
      if (searchProgress?.searchJobId === searchJobId) {
        await this.normalizeWorkflowProgress(workflow);
        return workflow;
      }
    }
    
    return null;
  }
}

export const observerStorage = new ObserverStorage();
