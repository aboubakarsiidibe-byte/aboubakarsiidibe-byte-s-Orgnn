import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    const allUsers = await db.select().from(users).limit(1);
    const isFirstUser = allUsers.length === 0;
    const isOwner = email === 'aboubakarsiidibe@gmail.com' || email.toLowerCase().startsWith('admin');
    const role = isFirstUser || isOwner ? 'admin' : 'storekeeper';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || email.split('@')[0],
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Impossible de synchroniser le profil utilisateur.', { cause: error });
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw new Error('Impossible de charger les utilisateurs.', { cause: error });
  }
}

export async function updateUserRole(userId: number, role: 'admin' | 'storekeeper') {
  try {
    const result = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    throw new Error('Impossible de modifier le rôle utilisateur.', { cause: error });
  }
}
