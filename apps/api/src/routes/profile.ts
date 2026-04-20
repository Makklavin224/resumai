import type { FastifyPluginAsync } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { generations, transactions, sessions } from '../db/schema.js';
import { ensureSession } from '../services/session/credits.js';
import { findUserById } from '../services/auth/users.js';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/profile', async (req, reply) => {
    const session = await ensureSession(req, reply);
    const [sessionRow] = await db.select().from(sessions).where(eq(sessions.id, session.sessionId));
    if (!sessionRow) return reply.status(404).send({ error: 'session missing', code: 'INTERNAL' });

    const user = sessionRow.userId ? await findUserById(sessionRow.userId) : null;

    // Pull history by user_id when authenticated, else by session_id.
    const genWhere = user
      ? eq(generations.userId, user.id)
      : eq(generations.sessionId, session.sessionId);
    const txWhere = user
      ? eq(transactions.userId, user.id)
      : eq(transactions.sessionId, session.sessionId);

    const [gens, txs] = await Promise.all([
      db.select().from(generations).where(genWhere).orderBy(desc(generations.createdAt)).limit(50),
      db.select().from(transactions).where(txWhere).orderBy(desc(transactions.createdAt)).limit(50),
    ]);

    return reply.send({
      user: user
        ? {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            isAdmin: user.isAdmin,
            isBlocked: user.isBlocked ?? false,
            isSuspicious: user.isSuspicious ?? false,
          }
        : null,
      credits: sessionRow.credits,
      generations: gens.map((g) => ({
        id: g.id,
        resultId: g.resultId,
        vacancyTitle: g.vacancyTitle,
        vacancyCompany: g.vacancyCompany,
        kind: g.kind,
        durationMs: g.durationMs,
        createdAt: g.createdAt,
      })),
      transactions: txs.map((t) => ({
        id: t.id,
        packageId: t.packageId,
        credits: t.credits,
        amountRub: t.amountRub,
        status: t.status,
        createdAt: t.createdAt,
      })),
    });
  });
};
