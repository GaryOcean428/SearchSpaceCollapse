import { desc, eq } from 'drizzle-orm';
import { db, withDbRetry } from '../../db';
import { userTargetAddresses } from '@shared/schema';
import type { ITargetAddressStorage } from '../interfaces';
import type { TargetAddress } from '@shared/schema';

export class TargetAddressPostgresAdapter implements ITargetAddressStorage {
  async getTargetAddresses(): Promise<TargetAddress[]> {
    if (!db) {
      throw new Error('Database not available - cannot load target addresses');
    }

    const rows = await withDbRetry(
      () => db!.select().from(userTargetAddresses).orderBy(desc(userTargetAddresses.addedAt)),
      'getTargetAddresses'
    );

    if (!rows) return [];
    return rows.map(row => ({
      id: row.id,
      address: row.address,
      label: row.label ?? undefined,
      addedAt: row.addedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  async addTargetAddress(address: TargetAddress): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot persist target address');
    }

    await withDbRetry(
      () =>
        db!
          .insert(userTargetAddresses)
          .values({
            id: address.id,
            address: address.address,
            label: address.label ?? null,
            addedAt: new Date(address.addedAt),
          })
          .onConflictDoNothing({ target: userTargetAddresses.id }),
      'addTargetAddress'
    );
  }

  async removeTargetAddress(id: string): Promise<void> {
    if (!db) {
      throw new Error('Database not available - cannot remove target address');
    }

    await withDbRetry(
      () => db!.delete(userTargetAddresses).where(eq(userTargetAddresses.id, id)),
      'removeTargetAddress'
    );
  }
}
