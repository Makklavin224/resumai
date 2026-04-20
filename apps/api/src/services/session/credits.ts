import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { sessions } from '../../db/schema.js';
import type { SessionInfo } from '@resumai/shared';

const SESSION_COOKIE = 'resumai_sid';
const SESSION_MAX_AGE_DAYS = 90;

function cookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    signed: true,
  };
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
  const [row] = await db.insert(sessions).values({ credits: 1 }).returning();
  if (!row) throw new Error('failed to create session');
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
