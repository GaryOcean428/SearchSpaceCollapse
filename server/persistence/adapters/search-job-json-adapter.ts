/**
 * SEARCH JOB JSON ADAPTER
 * 
 * Concrete implementation of ISearchJobStorage using FileJsonAdapter.
 */

import { FileJsonAdapter } from './file-json-adapter';
import type { ISearchJobStorage } from '../interfaces';
import type { SearchJob } from '@shared/schema';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const JOBS_FILE = join(__dirname, '../../../data/search-jobs.json');

export class SearchJobJsonAdapter implements ISearchJobStorage {
  private adapter: FileJsonAdapter<SearchJob[]>;

  constructor(options?: { filePath?: string }) {
    this.adapter = new FileJsonAdapter<SearchJob[]>({
      filePath: options?.filePath ?? JOBS_FILE,
      defaultValue: [],
    });
  }

  async getSearchJobs(): Promise<SearchJob[]> {
    return [...this.adapter.load()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getSearchJob(id: string): Promise<SearchJob | null> {
    const jobs = this.adapter.load();
    return jobs.find(j => j.id === id) || null;
  }

  async addSearchJob(job: SearchJob): Promise<void> {
    this.adapter.update(jobs => [...jobs, job]);
  }

  async updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void> {
    this.adapter.update(jobs => {
      const index = jobs.findIndex(j => j.id === id);
      if (index === -1) return jobs;
      
      const current = jobs[index];
      const updated = [...jobs];
      updated[index] = {
        ...current,
        ...updates,
        progress: updates.progress ? { ...current.progress, ...updates.progress } : current.progress,
        stats: updates.stats ? { ...current.stats, ...updates.stats } : current.stats,
        logs: updates.logs || current.logs,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
  }

  async appendJobLog(
    id: string,
    log: { message: string; type: 'info' | 'success' | 'error' }
  ): Promise<void> {
    this.adapter.update(jobs => {
      const index = jobs.findIndex(j => j.id === id);
      if (index === -1) return jobs;
      
      const updated = [...jobs];
      updated[index] = {
        ...updated[index],
        logs: [
          ...updated[index].logs,
          { ...log, timestamp: new Date().toISOString() },
        ],
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
  }

  async deleteSearchJob(id: string): Promise<void> {
    this.adapter.update(jobs => jobs.filter(j => j.id !== id));
  }
}
