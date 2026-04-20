import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '../../db/client.js';
import { sessions, anonTrialIps } from '../../db/schema.js';
import type { SessionInfo } from '@resumai/shared';
import { env } from '../../lib/env.js';

const SESSION_COOKIE = 'resumai_sid';
const SESSION_MAX_AGE_DAYS = 90;

function cookieOptions() {
  const isHttps = (env.PUBLIC_WEB_URL ?? '').startsWith('https://');
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttps,
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    signed: true,
  };
}

/** Hash an IP with the cookie secret so we can dedupe without storing raw IPs. */
function hashIp(ip: string): string {
  return createHash('sha256').update(`${env.COOKIE_SECRET}:${ip}`).digest('hex').slice(0, 32);
}

export async function ensureSession(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<SessionInfo> {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (raw) {
    const unsigned = req.unsignCookie(raw);
    if (unsigned.valid && unsigned.value) {
      const [row] = await db.select().from(sessions).where(eq(sessions.id, unsigned.value));
      if (row) {
        return { sessionId: row.id, credits: row.credits };
      }
    }
  }

  // Brand-new session. Grant the free trial credit only if this IP hasn't
  // already consumed one (stops incognito / cookie-wipe abuse).
  const ipHash = hashIp(req.ip);
  const [priorTrial] = await db
    .select()
    .from(anonTrialIps)
    .where(eq(anonTrialIps.ipHash, ipHash));
  const initialCredits = priorTrial ? 0 : 1;

  const [row] = await db.insert(sessions).values({ credits: initialCredits }).returning();
  if (!row) throw new Error('failed to create session');

  if (!priorTrial) {
    await db
      .insert(anonTrialIps)
      .values({ ipHash, firstSessionId: row.id })
      .onConflictDoNothing();
  }

  reply.setCookie(SESSION_COOKIE, row.id, cookieOptions());
  return { sessionId: row.id, credits: row.credits };
}

export async function getSessionById(id: string) {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
  return row;
}

export async function deductCredit(sessionId: string): Promise<number> {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!row || row.credits <= 0) return row?.credits ?? 0;
  const [updated] = await db
    .update(sessions)
    .set({ credits: row.credits - 1, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();
  return updated?.credits ?? 0;
}

export async function addCredits(sessionId: string, amount: number): Promise<number> {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!row) return 0;
  const [updated] = await db
    .update(sessions)
    .set({ credits: row.credits + amount, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();
  return updated?.credits ?? 0;
}
