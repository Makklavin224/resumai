import type { FastifyPluginAsync } from 'fastify';
import { ensureSession, getSessionById } from '../services/session/credits.js';
import type { SessionInfo } from '@resumai/shared';

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: SessionInfo }>('/api/credits', async (req, reply) => {
    const { sessionId, credits } = await ensureSession(req, reply);
    const current = await getSessionById(sessionId);
    return { sessionId, credits: current?.credits ?? credits };
  });
};
