import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { type Candidate, type TargetAddress, type SearchJob, type User, type UpsertUser } from "@shared/schema";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JOBS_FILE = join(__dirname, "../data/search-jobs.json");
const CANDIDATES_FILE = join(__dirname, "../data/candidates.json");
const TARGET_ADDRESSES_FILE = join(__dirname, "../data/target-addresses.json");

export interface IStorage {
  getCandidates(): Promise<Candidate[]>;
  addCandidate(candidate: Candidate): Promise<void>;
  clearCandidates(): Promise<void>;
  getTargetAddresses(): Promise<TargetAddress[]>;
  addTargetAddress(address: TargetAddress): Promise<void>;
  removeTargetAddress(id: string): Promise<void>;
  getSearchJobs(): Promise<SearchJob[]>;
  getSearchJob(id: string): Promise<SearchJob | null>;
  addSearchJob(job: SearchJob): Promise<void>;
  updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void>;
  appendJobLog(id: string, log: { message: string; type: "info" | "success" | "error" }): Promise<void>;
  deleteSearchJob(id: string): Promise<void>;
  // Replit Auth: User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private candidates: Candidate[] = [];
  private targetAddresses: TargetAddress[] = [];
  private searchJobs: SearchJob[] = [];

  constructor() {
    this.loadJobs();
    this.loadCandidates();
    this.loadTargetAddresses();
  }

  private loadJobs(): void {
    try {
      if (existsSync(JOBS_FILE)) {
        const data = readFileSync(JOBS_FILE, "utf-8").trim();
        if (data.length > 0) {
          this.searchJobs = JSON.parse(data);
        } else {
          this.searchJobs = [];
        }
      }
    } catch (error) {
      console.error("Failed to load jobs:", error);
      this.searchJobs = [];
    }
  }

  private saveJobs(): void {
    try {
      const dir = dirname(JOBS_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(JOBS_FILE, JSON.stringify(this.searchJobs, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to save jobs:", error);
    }
  }

  private loadCandidates(): void {
    try {
      if (existsSync(CANDIDATES_FILE)) {
        const data = readFileSync(CANDIDATES_FILE, "utf-8");
        const parsed = JSON.parse(data);
        
        // Validate that we got an array
        if (!Array.isArray(parsed)) {
          throw new Error("Candidates file is corrupted: expected array");
        }
        
        // Validate each candidate has required fields
        const validCandidates: Candidate[] = [];
        for (const item of parsed) {
          if (
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.phrase === "string" &&
            typeof item.address === "string" &&
            typeof item.score === "number" &&
            typeof item.testedAt === "string"
          ) {
            validCandidates.push(item as Candidate);
          } else {
            console.warn(`[Storage] Skipping invalid candidate entry:`, item);
          }
        }
        
        this.candidates = validCandidates;
        console.log(`[Storage] Loaded ${this.candidates.length} candidates from disk`);
        
        if (validCandidates.length < parsed.length) {
          console.warn(`[Storage] ⚠️ Skipped ${parsed.length - validCandidates.length} invalid candidates`);
        }
        
        // Log if we have any matches saved
        const matches = this.candidates.filter(c => c.score === 100);
        if (matches.length > 0) {
          console.log(`[Storage] ⚠️ RECOVERED ${matches.length} MATCH(ES) FROM DISK!`);
          matches.forEach(m => {
            console.log(`[Storage]   - Address: ${m.address}, Type: ${m.type}`);
          });
        }
      }
    } catch (error) {
      console.error("❌ CRITICAL: Failed to load candidates from disk:", error);
      console.error("❌ Candidates file may be corrupted. Creating backup...");
      
      // Create backup of corrupted file if it exists
      if (existsSync(CANDIDATES_FILE)) {
        const backupFile = `${CANDIDATES_FILE}.backup-${Date.now()}`;
        try {
          const corruptedData = readFileSync(CANDIDATES_FILE, "utf-8");
          writeFileSync(backupFile, corruptedData, "utf-8");
          console.log(`❌ Corrupted file backed up to: ${backupFile}`);
          console.log(`❌ Please report this issue and provide the backup file`);
        } catch (backupError) {
          console.error("❌ Failed to create backup:", backupError);
        }
      }
      
      // Start with empty array but warn user
      this.candidates = [];
      console.error("❌ Starting with empty candidates list. Previous data may be in backup.");
    }
  }

  private saveCandidates(): void {
    try {
      const dir = dirname(CANDIDATES_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      // Double-write strategy: write to temp, verify, then rename
      // This ensures we always have at least one valid copy
      const tempFile = `${CANDIDATES_FILE}.tmp`;
      const jsonData = JSON.stringify(this.candidates, null, 2);
      
      // Write temp file
      writeFileSync(tempFile, jsonData, "utf-8");
      
      // Verify temp file is valid before proceeding
      try {
        const verifyData = readFileSync(tempFile, "utf-8");
        JSON.parse(verifyData); // Will throw if corrupt
      } catch (verifyError) {
        unlinkSync(tempFile); // Clean up bad temp file
        throw new Error(`Temp file verification failed: ${verifyError}`);
      }
      
      // Platform-specific atomic write strategy
      // Replit runs on Linux, so Unix path is primary
      if (process.platform === "win32" && existsSync(CANDIDATES_FILE)) {
        // Windows: Keep backup until new file confirmed valid
        const backupFile = `${CANDIDATES_FILE}.backup-safe`;
        try {
          // Step 1: Rename current to backup (don't delete yet)
          if (existsSync(backupFile)) unlinkSync(backupFile);
          renameSync(CANDIDATES_FILE, backupFile);
          
          // Step 2: Rename temp to live
          renameSync(tempFile, CANDIDATES_FILE);
          
          // Step 3: Verify new file is valid
          const verifyNewFile = readFileSync(CANDIDATES_FILE, "utf-8");
          JSON.parse(verifyNewFile);
          
          // Step 4: Only delete backup after verification
          if (existsSync(backupFile)) unlinkSync(backupFile);
        } catch (winError) {
          // Rollback: restore from backup
          console.error("Write failed, attempting rollback...");
          if (existsSync(backupFile)) {
            if (existsSync(CANDIDATES_FILE)) unlinkSync(CANDIDATES_FILE);
            renameSync(backupFile, CANDIDATES_FILE);
            console.log("Rollback successful - restored from backup");
          }
          throw winError;
        }
      } else {
        // Unix/Linux: atomic rename (Replit default)
        renameSync(tempFile, CANDIDATES_FILE);
      }
    } catch (error) {
      console.error("❌ CRITICAL: Failed to save candidates:", error);
      console.error("❌ This could result in data loss! Check disk space and permissions.");
      console.error("❌ OPERATOR ALERT: Persistence may be compromised!");
      
      // In production, this should trigger monitoring alerts
      // For now, log loudly so user sees the problem
      throw error; // Re-throw to make failure visible to caller
    }
  }

  private loadTargetAddresses(): void {
    const defaultAddress: TargetAddress = {
      id: "default",
      address: "15BKWJjL5YWXtaP449WAYqVYZQE1szicTn",
      label: "Original $52.6M Address",
      addedAt: new Date().toISOString(),
    };

    try {
      if (existsSync(TARGET_ADDRESSES_FILE)) {
        const data = readFileSync(TARGET_ADDRESSES_FILE, "utf-8").trim();
        if (data.length > 0) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            // Validate each address has required fields
            const validAddresses: TargetAddress[] = [];
            for (const item of parsed) {
              if (
                item &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.address === "string" &&
                typeof item.addedAt === "string"
              ) {
                validAddresses.push(item as TargetAddress);
              } else {
                console.warn(`[Storage] Skipping invalid target address entry:`, item);
              }
            }
            this.targetAddresses = validAddresses;
            console.log(`[Storage] Loaded ${this.targetAddresses.length} target addresses from disk`);
            
            // Ensure default address always exists
            if (!this.targetAddresses.find(a => a.id === "default")) {
              this.targetAddresses.unshift(defaultAddress);
              this.saveTargetAddresses();
            }
            return;
          }
        }
      }
    } catch (error) {
      console.error("Failed to load target addresses:", error);
    }
    
    // If no file exists or loading failed, start with default
    this.targetAddresses = [defaultAddress];
    this.saveTargetAddresses();
  }

  private saveTargetAddresses(): void {
    try {
      const dir = dirname(TARGET_ADDRESSES_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(TARGET_ADDRESSES_FILE, JSON.stringify(this.targetAddresses, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to save target addresses:", error);
    }
  }

  async getCandidates(): Promise<Candidate[]> {
    return [...this.candidates].sort((a, b) => b.score - a.score);
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    this.candidates.push(candidate);
    this.candidates.sort((a, b) => b.score - a.score);
    if (this.candidates.length > 100) {
      this.candidates = this.candidates.slice(0, 100);
    }
    
    // CRITICAL: Save immediately to disk, especially for matches (score=100)
    // This ensures matching keys are never lost, even on server crash
    try {
      this.saveCandidates();
      
      if (candidate.score === 100) {
        console.log(`[Storage] 🎉 MATCH SAVED TO DISK! Address: ${candidate.address}, Type: ${candidate.type}`);
      }
    } catch (error) {
      // Log failure but don't throw - keep system running
      console.error(`❌ CRITICAL: Failed to persist candidate (score=${candidate.score}):`, error);
      
      if (candidate.score === 100) {
        console.error(`❌❌❌ MATCH MAY NOT BE SAVED! Address: ${candidate.address}`);
        console.error(`❌❌❌ OPERATOR: Check disk immediately and export candidates manually!`);
      }
    }
  }

  async clearCandidates(): Promise<void> {
    this.candidates = [];
    try {
      this.saveCandidates();
    } catch (error) {
      console.error("Failed to persist cleared candidates:", error);
      // Non-critical - empty state can recover on restart
    }
  }

  async getTargetAddresses(): Promise<TargetAddress[]> {
    return [...this.targetAddresses];
  }

  async addTargetAddress(address: TargetAddress): Promise<void> {
    this.targetAddresses.push(address);
    this.saveTargetAddresses();
    console.log(`[Storage] Target address saved: ${address.address}`);
  }

  async removeTargetAddress(id: string): Promise<void> {
    this.targetAddresses = this.targetAddresses.filter(a => a.id !== id);
    this.saveTargetAddresses();
    console.log(`[Storage] Target address removed: ${id}`);
  }

  async getSearchJobs(): Promise<SearchJob[]> {
    return [...this.searchJobs].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSearchJob(id: string): Promise<SearchJob | null> {
    return this.searchJobs.find(j => j.id === id) || null;
  }

  async addSearchJob(job: SearchJob): Promise<void> {
    this.searchJobs.push(job);
    this.saveJobs();
  }

  async updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void> {
    const index = this.searchJobs.findIndex(j => j.id === id);
    if (index !== -1) {
      const current = this.searchJobs[index];
      this.searchJobs[index] = {
        ...current,
        ...updates,
        progress: updates.progress ? { ...current.progress, ...updates.progress } : current.progress,
        stats: updates.stats ? { ...current.stats, ...updates.stats } : current.stats,
        logs: updates.logs || current.logs,
        updatedAt: new Date().toISOString(),
      };
      this.saveJobs();
    }
  }

  async appendJobLog(id: string, log: { message: string; type: "info" | "success" | "error" }): Promise<void> {
    const index = this.searchJobs.findIndex(j => j.id === id);
    if (index !== -1) {
      this.searchJobs[index].logs.push({
        ...log,
        timestamp: new Date().toISOString(),
      });
      this.searchJobs[index].updatedAt = new Date().toISOString();
      this.saveJobs();
    }
  }

  async deleteSearchJob(id: string): Promise<void> {
    this.searchJobs = this.searchJobs.filter(j => j.id !== id);
    this.saveJobs();
  }

  // Replit Auth: User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    if (!db) {
      throw new Error("Database not available - please provision a database to use Replit Auth");
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!db) {
      throw new Error("Database not available - please provision a database to use Replit Auth");
    }
    
    // First check if user with this email already exists (handles test scenarios with different IDs)
    if (userData.email) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingUser && existingUser.id !== userData.id) {
        // Update existing user with new data (keep existing ID)
        const [updatedUser] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return updatedUser;
      }
    }
    
    // Normal upsert by ID
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const storage = new MemStorage();
