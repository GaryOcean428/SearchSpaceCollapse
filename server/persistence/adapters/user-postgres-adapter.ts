import { eq } from 'drizzle-orm';
import { db, withAuthPriority } from '../../db';
import { users } from '@shared/schema';
import type { IUserStorage } from '../interfaces';
import type { UpsertUser, User } from '@shared/schema';

/**
 * User storage adapter with HIGH-PRIORITY database access
 * Uses dedicated auth semaphore - never waits behind heavy operations
 * Critical for ensuring login is always responsive
 */
export class UserPostgresAdapter implements IUserStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) {
      throw new Error('Database not available - please provision a database to use Replit Auth');
    }

    // Use auth priority path - bypasses regular DB queue
    const result = await withAuthPriority(
      () => db!.select().from(users).where(eq(users.id, id)),
      'getUser'
    );

    return result?.[0] || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!db) {
      throw new Error('Database not available - please provision a database to use Replit Auth');
    }

    // Use auth priority path - bypasses regular DB queue
    if (userData.email) {
      const existingResult = await withAuthPriority(
        () => db!.select().from(users).where(eq(users.email, userData.email!)),
        'upsertUser.selectByEmail'
      );
      const existingUser = existingResult?.[0];

      if (existingUser && existingUser.id !== userData.id) {
        const updateResult = await withAuthPriority(
          () =>
            db!
              .update(users)
              .set({
                firstName: userData.firstName,
                lastName: userData.lastName,
                profileImageUrl: userData.profileImageUrl,
                updatedAt: new Date(),
              })
              .where(eq(users.email, userData.email!))
              .returning(),
          'upsertUser.updateExisting'
        );

        return updateResult![0];
      }
    }

    const insertResult = await withAuthPriority(
      () =>
        db!
          .insert(users)
          .values(userData)
          .onConflictDoUpdate({
            target: users.id,
            set: {
              ...userData,
              updatedAt: new Date(),
            },
          })
          .returning(),
      'upsertUser'
    );

    return insertResult![0];
  }
}
