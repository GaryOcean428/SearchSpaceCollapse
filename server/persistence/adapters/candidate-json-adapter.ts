/**
 * CANDIDATE JSON ADAPTER
 * 
 * Concrete implementation of ICandidateStorage using FileJsonAdapter.
 * Demonstrates the pattern for migrating other domains.
 */

import { FileJsonAdapter } from './file-json-adapter';
import type { ICandidateStorage } from '../interfaces';
import type { Candidate } from '@shared/schema';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CANDIDATES_FILE = join(__dirname, '../../../data/candidates.json');

function isCandidate(item: unknown): item is Candidate {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof (item as Candidate).id === 'string' &&
    typeof (item as Candidate).phrase === 'string' &&
    typeof (item as Candidate).address === 'string' &&
    typeof (item as Candidate).score === 'number' &&
    typeof (item as Candidate).testedAt === 'string'
  );
}

export class CandidateJsonAdapter implements ICandidateStorage {
  private adapter: FileJsonAdapter<Candidate[]>;
  private maxCandidates: number;

  constructor(options?: { filePath?: string; maxCandidates?: number }) {
    this.maxCandidates = options?.maxCandidates ?? 100;
    
    this.adapter = new FileJsonAdapter<Candidate[]>({
      filePath: options?.filePath ?? CANDIDATES_FILE,
      defaultValue: [],
      validate: (data) => {
        if (!Array.isArray(data)) {
          throw new Error('Candidates file is corrupted: expected array');
        }
        const valid = data.filter(isCandidate);
        if (valid.length < data.length) {
          console.warn(`[CandidateJsonAdapter] Skipped ${data.length - valid.length} invalid candidates`);
        }
        return valid;
      },
      onCorruption: (error, backupPath) => {
        console.error(`[CandidateJsonAdapter] Corrupted file backed up to: ${backupPath}`);
      },
    });
    
    const candidates = this.adapter.load();
    console.log(`[CandidateJsonAdapter] Loaded ${candidates.length} candidates`);
    
    const matches = candidates.filter(c => c.score === 100);
    if (matches.length > 0) {
      console.log(`[CandidateJsonAdapter] RECOVERED ${matches.length} MATCH(ES) FROM DISK!`);
      matches.forEach(m => {
        console.log(`[CandidateJsonAdapter]   - Address: ${m.address}, Type: ${m.type}`);
      });
    }
  }

  async getCandidates(): Promise<Candidate[]> {
    return [...this.adapter.load()].sort((a, b) => b.score - a.score);
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    this.adapter.update(candidates => {
      const updated = [...candidates, candidate]
        .sort((a, b) => b.score - a.score)
        .slice(0, this.maxCandidates);
      return updated;
    });
    
    if (candidate.score === 100) {
      console.log(`[CandidateJsonAdapter] MATCH SAVED! Address: ${candidate.address}, Type: ${candidate.type}`);
    }
  }

  async clearCandidates(): Promise<void> {
    this.adapter.save([]);
  }
}
