import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users, sessions } from '../../db/schema.js';
import type { User } from '../../db/schema.js';
import { env } from '../../lib/env.js';
import { hashPassword, verifyPassword } from './password.js';

function isSeedAdmin(email: string): boolean {
  if (!env.ADMIN_EMAILS) return false;
  const list = env.ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await db.select().from(users).where(eq(users.email, normalized));
  return row ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      displayName: input.displayName?.trim() || null,
      isAdmin: isSeedAdmin(email),
    })
    .returning();
  if (!row) throw new Error('failed to create user');
  return row;
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

/** Attach user_id to an anonymous session — called on login or register. */
export async function linkSessionToUser(sessionId: string, userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ userId, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

/**
 * Grant signup bonus to the caller's current session. Called once right after
 * successful registration. The bonus is additive to whatever the anonymous
 * session already had (typically the 1 free trial credit), so a fresh visitor
 * who registers ends up with 1 + SIGNUP_BONUS = 3 credits total.
 */
export async function grantSignupBonus(sessionId: string, amount: number): Promise<void> {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!row) return;
  await db
    .update(sessions)
    .set({ credits: row.credits + amount, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}
