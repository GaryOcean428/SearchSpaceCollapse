import { eq } from 'drizzle-orm';
import { db, withDbRetry } from '../../db';
import { users } from '@shared/schema';
import type { IUserStorage } from '../interfaces';
import type { UpsertUser, User } from '@shared/schema';

export class UserPostgresAdapter implements IUserStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) {
      throw new Error('Database not available - please provision a database to use Replit Auth');
    }

    const [user] = await withDbRetry(
      () => db!.select().from(users).where(eq(users.id, id)),
      'getUser'
    );

    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!db) {
      throw new Error('Database not available - please provision a database to use Replit Auth');
    }

    if (userData.email) {
      const [existingUser] = await withDbRetry(
        () => db!.select().from(users).where(eq(users.email, userData.email!)),
        'upsertUser.selectByEmail'
      );

      if (existingUser && existingUser.id !== userData.id) {
        const [updatedUser] = await withDbRetry(
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

        return updatedUser;
      }
    }

    const [user] = await withDbRetry(
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

    return user;
  }
}
