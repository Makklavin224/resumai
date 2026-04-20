import { and, eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from '../../db/client.js';
import { users, sessions, signupBonusIps } from '../../db/schema.js';
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

/**
 * Grant the signup bonus only if the caller's IP has never received it.
 * Prevents the "sign up via email + VK + Telegram from the same device" farm.
 * Returns whether the bonus was actually granted.
 */
export async function grantSignupBonusIfFirstIp(args: {
  sessionId: string;
  ipHash: string;
  userId: string;
  provider: 'email' | 'vk' | 'telegram';
  amount: number;
}): Promise<{ granted: boolean }> {
  const inserted = await db
    .insert(signupBonusIps)
    .values({
      ipHash: args.ipHash,
      firstUserId: args.userId,
      provider: args.provider,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) {
    // Same IP already claimed the bonus before.
    return { granted: false };
  }
  await grantSignupBonus(args.sessionId, args.amount);
  return { granted: true };
}

/**
 * Look up (provider, providerId) → user. Creates one if missing so OAuth
 * callers (VK, Telegram) can treat the call as upsert + "is this the first
 * login?" signal for the signup bonus.
 *
 * Email is unique+notNull in the schema, so OAuth users get a synthetic
 * address (e.g. "tg_7788@telegram.resumai.local") which the user can later
 * replace with a real one from the profile screen.
 */
export async function findOrCreateOAuthUser(input: {
  provider: 'vk' | 'telegram';
  providerId: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
}): Promise<{ user: User; created: boolean }> {
  const providerId = String(input.providerId);
  const normalizedPhone = input.phone?.replace(/[^\d+]/g, '') || null;

  // Try (provider, providerId) first — fastest.
  const [byProvider] = await db
    .select()
    .from(users)
    .where(and(eq(users.provider, input.provider), eq(users.providerId, providerId)));
  if (byProvider) {
    // Opportunistically backfill phone if we have it and the row doesn't.
    if (normalizedPhone && !byProvider.phone) {
      await db.update(users).set({ phone: normalizedPhone }).where(eq(users.id, byProvider.id));
    }
    return { user: byProvider, created: false };
  }

  // Then by phone — lets VK+TG collide if they belong to one person.
  if (normalizedPhone) {
    const [byPhone] = await db.select().from(users).where(eq(users.phone, normalizedPhone));
    if (byPhone) {
      // Link this provider onto the existing user so future logins hit
      // the provider branch above.
      await db
        .update(users)
        .set({
          provider: byPhone.provider ?? input.provider,
          providerId: byPhone.providerId ?? providerId,
        })
        .where(eq(users.id, byPhone.id));
      return { user: byPhone, created: false };
    }
  }

  const syntheticEmail =
    input.email?.trim().toLowerCase() ||
    `${input.provider}_${providerId}@${input.provider}.resumai.local`;
  const passwordHash = await hashPassword(randomBytes(24).toString('hex'));
  const [row] = await db
    .insert(users)
    .values({
      email: syntheticEmail,
      passwordHash,
      displayName: input.displayName?.trim() || null,
      provider: input.provider,
      providerId,
      phone: normalizedPhone,
      isAdmin: isSeedAdmin(syntheticEmail),
    })
    .returning();
  if (!row) throw new Error('failed to create oauth user');
  return { user: row, created: true };
}
