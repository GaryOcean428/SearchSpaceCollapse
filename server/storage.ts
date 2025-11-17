import { type Candidate } from "@shared/schema";

export interface IStorage {
  getCandidates(): Promise<Candidate[]>;
  addCandidate(candidate: Candidate): Promise<void>;
  clearCandidates(): Promise<void>;
}

export class MemStorage implements IStorage {
  private candidates: Candidate[] = [];

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
}

export const storage = new MemStorage();
