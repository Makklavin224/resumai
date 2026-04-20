import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { SIGNUP_BONUS_CREDITS } from '@resumai/shared';
import { ensureSession } from '../services/session/credits.js';
import {
  authenticate,
  createUser,
  findUserByEmail,
  findUserById,
  grantSignupBonus,
  linkSessionToUser,
} from '../services/auth/users.js';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(0).max(80).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function publicUser(u: { id: string; email: string; displayName: string | null; isAdmin: boolean }) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    isAdmin: u.isAdmin,
  };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/auth/register', async (req, reply) => {
    const body = RegisterSchema.parse(req.body);
    const existing = await findUserByEmail(body.email);
    if (existing) {
      return reply.status(409).send({ error: 'Пользователь с таким email уже есть', code: 'INVALID_INPUT' });
    }
    const user = await createUser(body);
    const session = await ensureSession(req, reply);
    await linkSessionToUser(session.sessionId, user.id);
    await grantSignupBonus(session.sessionId, SIGNUP_BONUS_CREDITS);
    return reply.status(201).send({
      user: publicUser(user),
      bonusCredits: SIGNUP_BONUS_CREDITS,
    });
  });

  app.post('/api/auth/login', async (req, reply) => {
    const body = LoginSchema.parse(req.body);
    const user = await authenticate(body.email, body.password);
    if (!user) {
      return reply.status(401).send({ error: 'Неверный email или пароль', code: 'INVALID_INPUT' });
    }
    const session = await ensureSession(req, reply);
    await linkSessionToUser(session.sessionId, user.id);
    return reply.send({ user: publicUser(user) });
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const session = await ensureSession(req, reply);
    // Detach user from session (don't destroy the session so credits can still live anonymously)
    const { db } = await import('../db/client.js');
    const { sessions } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    await db
      .update(sessions)
      .set({ userId: null, updatedAt: new Date() })
      .where(eq(sessions.id, session.sessionId));
    return reply.send({ ok: true });
  });

  app.get('/api/auth/me', async (req, reply) => {
    const session = await ensureSession(req, reply);
    const { db } = await import('../db/client.js');
    const { sessions } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    const [row] = await db.select().from(sessions).where(eq(sessions.id, session.sessionId));
    if (!row?.userId) return reply.send({ user: null });
    const user = await findUserById(row.userId);
    return reply.send({ user: user ? publicUser(user) : null });
  });
};
