import type { FastifyPluginAsync } from 'fastify';

// Payment creation + webhook are wired in Phase 6.
export const paymentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/payments/create', async (_req, reply) => {
    return reply.status(501).send({ error: 'not yet wired', code: 'INTERNAL' });
  });

  app.post('/api/payments/webhook', async (_req, reply) => {
    return reply.status(501).send({ error: 'not yet wired', code: 'INTERNAL' });
  });
};
