import './lib/polyfills.js';
import Fastify, { type FastifyError } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { healthRoutes } from './routes/health.js';
import { sessionRoutes } from './routes/session.js';
import { generateRoutes } from './routes/generate.js';
import { paymentRoutes } from './routes/payments.js';
import { LIMITS } from '@resumai/shared';

export async function buildServer() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 12 * 1024 * 1024,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(sensible);
  await app.register(cors, {
    origin: [env.PUBLIC_WEB_URL],
    credentials: true,
  });
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(multipart, {
    limits: {
      fileSize: LIMITS.pdfMaxBytes,
      files: 1,
    },
  });
  await app.register(rateLimit, {
    global: false,
    timeWindow: '1 minute',
    max: 120,
  });

  await app.register(healthRoutes);
  await app.register(sessionRoutes);
  await app.register(generateRoutes);
  await app.register(paymentRoutes);

  app.setErrorHandler((rawErr, _req, reply) => {
    const err = rawErr as FastifyError;
    app.log.error({ err }, 'unhandled error');
    if (err.validation) {
      return reply.status(400).send({
        error: 'Invalid request',
        code: 'INVALID_INPUT',
        details: err.validation,
      });
    }
    const status = err.statusCode ?? 500;
    return reply.status(status).send({
      error: err.message || 'Internal server error',
      code: status === 429 ? 'RATE_LIMIT' : 'INTERNAL',
    });
  });

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error({ err }, 'failed to start server');
    process.exit(1);
  }
}

const isEntrypoint = import.meta.url === `file://${process.argv[1]}`;
if (isEntrypoint) {
  main();
}
