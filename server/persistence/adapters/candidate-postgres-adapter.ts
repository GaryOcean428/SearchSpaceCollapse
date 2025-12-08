import { desc } from 'drizzle-orm';
import { db, withDbRetry } from '../../db';
import { type Candidate, recoveryCandidates, type RecoveryCandidateRecord } from '@shared/schema';
import type { ICandidateStorage } from '../interfaces';

function mapRecordToCandidate(record: RecoveryCandidateRecord): Candidate {
  return {
    id: record.id,
    phrase: record.phrase,
    address: record.address,
    score: record.score,
    qigScore: (record.qigScore as Candidate['qigScore']) ?? undefined,
    testedAt: record.testedAt?.toISOString() ?? new Date().toISOString(),
    type: record.type ?? undefined,
  };
}

export class CandidatePostgresAdapter implements ICandidateStorage {
  async getCandidates(): Promise<Candidate[]> {
    if (!db) {
      throw new Error('Database not available - cannot load candidates');
    }

    const results = await withDbRetry(
      () => db!.select().from(recoveryCandidates).orderBy(desc(recoveryCandidates.testedAt)),
      'getCandidates'
    );

    if (!results) return [];
    return results.map(mapRecordToCandidate);
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot persist candidate');
    }

    await withDbRetry(
      () =>
        db!
          .insert(recoveryCandidates)
          .values({
            id: candidate.id,
            phrase: candidate.phrase,
            address: candidate.address,
            score: candidate.score,
            qigScore: candidate.qigScore ?? null,
            testedAt: new Date(candidate.testedAt),
            type: candidate.type ?? null,
          })
          .onConflictDoUpdate({
            target: recoveryCandidates.id,
            set: {
              phrase: candidate.phrase,
              address: candidate.address,
              score: candidate.score,
              qigScore: candidate.qigScore ?? null,
              testedAt: new Date(candidate.testedAt),
              type: candidate.type ?? null,
            },
          }),
      'addCandidate'
    );
  }

  async clearCandidates(): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot clear candidates');
    }

    await withDbRetry(() => db!.delete(recoveryCandidates), 'clearCandidates');
  }
}
