import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, sessions, transactions, generations } from '../db/schema.js';
import { ensureSession } from '../services/session/credits.js';
import { findUserById } from '../services/auth/users.js';

async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  const session = await ensureSession(req, reply);
  const [row] = await db.select().from(sessions).where(eq(sessions.id, session.sessionId));
  if (!row?.userId) {
    reply.status(401).send({ error: 'Требуется вход', code: 'INVALID_INPUT' });
    return null;
  }
  const user = await findUserById(row.userId);
  if (!user?.isAdmin) {
    reply.status(403).send({ error: 'Только для администраторов', code: 'INVALID_INPUT' });
    return null;
  }
  return user;
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/admin/stats', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const [
      [{ userCount = 0 } = {}],
      [{ sessionCount = 0 } = {}],
      [{ txCount = 0 } = {}],
      [{ txRevenue = 0 } = {}],
      [{ genCount = 0 } = {}],
    ] = await Promise.all([
      db.select({ userCount: sql<number>`count(*)::int` }).from(users),
      db.select({ sessionCount: sql<number>`count(*)::int` }).from(sessions),
      db
        .select({ txCount: sql<number>`count(*)::int` })
        .from(transactions)
        .where(eq(transactions.status, 'succeeded')),
      db
        .select({ txRevenue: sql<number>`coalesce(sum(amount_rub), 0)::int` })
        .from(transactions)
        .where(eq(transactions.status, 'succeeded')),
      db.select({ genCount: sql<number>`count(*)::int` }).from(generations),
    ]);
    return reply.send({ userCount, sessionCount, txCount, txRevenue, genCount });
  });

  app.get('/api/admin/users', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(200);
    return reply.send(
      rows.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
      })),
    );
  });

  app.get('/api/admin/transactions', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const rows = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(200);
    return reply.send(rows);
  });

  app.get('/api/admin/generations', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const rows = await db
      .select()
      .from(generations)
      .orderBy(desc(generations.createdAt))
      .limit(200);
    return reply.send(rows);
  });
};
