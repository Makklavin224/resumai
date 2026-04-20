import type { FastifyPluginAsync } from 'fastify';
import { env } from '../lib/env.js';

// The full pipeline (parse -> AI -> credits -> SSE) is wired in Phase 4-5.
// This stub keeps the surface stable so the frontend can talk to /api/generate.
export const generateRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/generate',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_GENERATE_PER_HOUR,
          timeWindow: '1 hour',
        },
      },
    },
    async (_req, reply) => {
      return reply.status(501).send({
        error: 'Generate pipeline not yet wired',
        code: 'INTERNAL',
      });
    },
  );
};
