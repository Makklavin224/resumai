import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { env } from '../lib/env.js';
import { db } from '../db/client.js';
import { transactions, sessions, users } from '../db/schema.js';
import { ensureSession, addCredits } from '../services/session/credits.js';
import {
  createPayment,
  getPackage,
  listPackages,
  verifyWebhookSignature,
} from '../services/payments/yookassa.js';
import { unlockLatestResult } from '../services/cache/results.js';
import { logger } from '../lib/logger.js';

const CreateBody = z.object({ packageId: z.string() });

interface YkWebhookEvent {
  event: string;
  object: {
    id: string;
    status: string;
    amount?: { value: string };
    metadata?: { session_id?: string; package_id?: string; credits?: string };
  };
}

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/payments/create', async (req, reply) => {
    const session = await ensureSession(req, reply);
    const [sessRow] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.id, session.sessionId));

    let customerEmail: string | null = null;
    if (sessRow?.userId) {
      const [u] = await db
        .select({ isBlocked: users.isBlocked, email: users.email })
        .from(users)
        .where(eq(users.id, sessRow.userId));
      if (u?.isBlocked) {
        return reply
          .status(403)
          .send({ error: 'Аккаунт заблокирован', code: 'BLOCKED' });
      }
      customerEmail = u?.email ?? null;
    }

    const { packageId } = CreateBody.parse(req.body);
    const pkg = await getPackage(packageId);
    if (!pkg) return reply.status(400).send({ error: 'unknown package', code: 'INVALID_INPUT' });

    try {
      const payment = await createPayment({
        pkg,
        sessionId: session.sessionId,
        // After YooKassa user lands in the cabinet — credits already
        // landed via webhook by the time they arrive; the query param is
        // just for a success toast.
        returnUrl: `${env.PUBLIC_WEB_URL}/profile?paid=1`,
        customerEmail,
      });
      await db.insert(transactions).values({
        sessionId: session.sessionId,
        yookassaPaymentId: payment.id,
        packageId: pkg.id,
        credits: pkg.credits,
        amountRub: pkg.priceRub,
        status: payment.status,
      });
      const confirmationUrl = payment.confirmation?.confirmation_url;
      if (!confirmationUrl) {
        throw new Error('YooKassa response missing confirmation_url');
      }
      return reply.send({ paymentId: payment.id, confirmationUrl });
    } catch (err) {
      logger.error({ err }, 'payment create failed');
      return reply.status(502).send({ error: 'YooKassa недоступна', code: 'PAYMENT_ERROR' });
    }
  });

  app.post(
    '/api/payments/webhook',
    {
      // Collect raw body for HMAC verification
      config: { rateLimit: false },
    },
    async (req, reply) => {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const signature = req.headers['content-hmac'] as string | undefined;
      if (!(await verifyWebhookSignature(rawBody, signature))) {
        return reply.status(400).send({ error: 'bad signature', code: 'PAYMENT_ERROR' });
      }

      const event = (typeof req.body === 'object' ? req.body : JSON.parse(rawBody)) as YkWebhookEvent;
      if (event.event !== 'payment.succeeded' || event.object.status !== 'succeeded') {
        return reply.send({ ok: true, skipped: true });
      }

      const txId = event.object.id;
      const [existing] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.yookassaPaymentId, txId));
      if (!existing) {
        return reply.status(404).send({ error: 'tx not found', code: 'PAYMENT_ERROR' });
      }
      if (existing.status === 'succeeded') {
        return reply.send({ ok: true, idempotent: true });
      }

      await db
        .update(transactions)
        .set({ status: 'succeeded' })
        .where(eq(transactions.id, existing.id));

      const credits = Number(event.object.metadata?.credits ?? existing.credits);
      await addCredits(existing.sessionId, credits);
      await unlockLatestResult(existing.sessionId).catch((err) =>
        logger.warn({ err }, 'unlock latest result failed'),
      );

      return reply.send({ ok: true });
    },
  );

  /**
   * Public pricing endpoint — returns the effective credit-package list
   * (respecting admin overrides stored in `app_settings`). The frontend
   * uses this instead of the compile-time constant so price changes go
   * live without rebuilding the web app.
   */
  app.get('/api/config/pricing', async (_req, reply) => {
    const packages = await listPackages();
    return reply.send({ packages });
  });
};
