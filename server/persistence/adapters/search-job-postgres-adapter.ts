import { desc, eq } from 'drizzle-orm';
import { db, withDbRetry } from '../../db';
import { recoverySearchJobs, type RecoverySearchJobRecord } from '@shared/schema';
import type { ISearchJobStorage } from '../interfaces';
import type { SearchJob } from '@shared/schema';

function mapRecordToSearchJob(record: RecoverySearchJobRecord): SearchJob {
  return {
    id: record.id,
    strategy: record.strategy as SearchJob['strategy'],
    status: record.status as SearchJob['status'],
    params: (record.params as SearchJob['params']) ?? { },
    progress: (record.progress as SearchJob['progress']) ?? { tested: 0, highPhiCount: 0, lastBatchIndex: 0 },
    stats: (record.stats as SearchJob['stats']) ?? { rate: 0 },
    logs: (record.logs as SearchJob['logs']) ?? [],
    createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: record.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export class SearchJobPostgresAdapter implements ISearchJobStorage {
  async getSearchJobs(): Promise<SearchJob[]> {
    if (!db) {
      throw new Error('Database not available - cannot load search jobs');
    }

    const result = await withDbRetry(
      () => db!.select().from(recoverySearchJobs).orderBy(desc(recoverySearchJobs.updatedAt)),
      'getSearchJobs'
    );

    if (!result) return [];
    return result.map(mapRecordToSearchJob);
  }

  async getSearchJob(id: string): Promise<SearchJob | null> {
    if (!db) {
      throw new Error('Database not available - cannot load search job');
    }

    const result = await withDbRetry(
      () => db!.select().from(recoverySearchJobs).where(eq(recoverySearchJobs.id, id)),
      'getSearchJob'
    );

    if (!result || result.length === 0) return null;
    return mapRecordToSearchJob(result[0]);
  }

  async addSearchJob(job: SearchJob): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot persist search job');
    }

    await withDbRetry(
      () =>
        db!
          .insert(recoverySearchJobs)
          .values({
            id: job.id,
            strategy: job.strategy,
            status: job.status,
            params: job.params,
            progress: job.progress,
            stats: job.stats,
            logs: job.logs,
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
          })
          .onConflictDoUpdate({
            target: recoverySearchJobs.id,
            set: {
              strategy: job.strategy,
              status: job.status,
              params: job.params,
              progress: job.progress,
              stats: job.stats,
              logs: job.logs,
              updatedAt: new Date(job.updatedAt),
            },
          }),
      'addSearchJob'
    );
  }

  async updateSearchJob(id: string, updates: Partial<SearchJob>): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot update search job');
    }

    const normalizedUpdates: Partial<RecoverySearchJobRecord> = {
      strategy: updates.strategy,
      status: updates.status,
      params: updates.params,
      progress: updates.progress,
      stats: updates.stats,
      logs: updates.logs,
      updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : new Date(),
    };

    await withDbRetry(
      () => db!.update(recoverySearchJobs).set(normalizedUpdates).where(eq(recoverySearchJobs.id, id)),
      'updateSearchJob'
    );
  }

  async appendJobLog(id: string, log: { message: string; type: "info" | "success" | "error" }): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot append search job log');
    }

    await withDbRetry(
      async () => {
        const existing = await db!.select().from(recoverySearchJobs).where(eq(recoverySearchJobs.id, id));
        if (!existing.length) return;
        const job = existing[0];
        const logs = (job.logs as SearchJob['logs']) ?? [];
        logs.push({ ...log, timestamp: new Date().toISOString() });
        await db!
          .update(recoverySearchJobs)
          .set({ logs, updatedAt: new Date() })
          .where(eq(recoverySearchJobs.id, id));
      },
      'appendJobLog'
    );
  }

  async deleteSearchJob(id: string): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot delete search job');
    }

    await withDbRetry(() => db!.delete(recoverySearchJobs).where(eq(recoverySearchJobs.id, id)), 'deleteSearchJob');
  }
}
