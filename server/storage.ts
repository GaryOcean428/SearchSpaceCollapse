import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { type Candidate, type TargetAddress, type SearchJob } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JOBS_FILE = join(__dirname, "../data/search-jobs.json");

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
  deleteSearchJob(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private candidates: Candidate[] = [];
  private targetAddresses: TargetAddress[] = [
    {
      id: "default",
      address: "15BKWJjL5YWXtaP449WAYqVYZQE1szicTn",
      label: "Original $52.6M Address",
      addedAt: new Date().toISOString(),
    }
  ];
  private searchJobs: SearchJob[] = [];

  constructor() {
    this.loadJobs();
  }

  private loadJobs(): void {
    try {
      if (existsSync(JOBS_FILE)) {
        const data = readFileSync(JOBS_FILE, "utf-8");
        this.searchJobs = JSON.parse(data);
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

  async getCandidates(): Promise<Candidate[]> {
    return [...this.candidates].sort((a, b) => b.score - a.score);
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    this.candidates.push(candidate);
    this.candidates.sort((a, b) => b.score - a.score);
    if (this.candidates.length > 100) {
      this.candidates = this.candidates.slice(0, 100);
    }
  }

  async clearCandidates(): Promise<void> {
    this.candidates = [];
  }

  async getTargetAddresses(): Promise<TargetAddress[]> {
    return [...this.targetAddresses];
  }

  async addTargetAddress(address: TargetAddress): Promise<void> {
    this.targetAddresses.push(address);
  }

  async removeTargetAddress(id: string): Promise<void> {
    this.targetAddresses = this.targetAddresses.filter(a => a.id !== id);
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
      this.searchJobs[index] = { ...this.searchJobs[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveJobs();
    }
  }

  async deleteSearchJob(id: string): Promise<void> {
    this.searchJobs = this.searchJobs.filter(j => j.id !== id);
    this.saveJobs();
  }
}

export const storage = new MemStorage();
