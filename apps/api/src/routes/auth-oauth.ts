import type { FastifyPluginAsync } from 'fastify';
import { env } from '../lib/env.js';

/**
 * OAuth start-endpoints for VK ID + Telegram. They return a 501 with a
 * helpful message until the founder provisions the provider credentials.
 *
 * Later, when VK_CLIENT_ID / TELEGRAM_BOT_TOKEN are filled in, this file
 * will be expanded to return an authorize URL and handle the callback.
 */
export const oauthStubRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/auth/vk/start', async (_req, reply) => {
    if (!env.VK_CLIENT_ID) {
      return reply.status(501).send({
        error: 'VK ID не настроен (добавьте VK_CLIENT_ID + VK_REDIRECT_URI в .env)',
        code: 'INTERNAL',
      });
    }
    const redirect = env.VK_REDIRECT_URI || `${env.PUBLIC_WEB_URL}/api/auth/vk/callback`;
    const url = new URL('https://id.vk.com/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', env.VK_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirect);
    url.searchParams.set('scope', 'email');
    url.searchParams.set('state', 'resumai-' + Date.now());
    return reply.send({ url: url.toString() });
  });

  app.get('/api/auth/telegram/start', async (_req, reply) => {
    if (!env.TELEGRAM_BOT_USERNAME) {
      return reply.status(501).send({
        error:
          'Telegram не настроен (добавьте TELEGRAM_BOT_USERNAME, привяжите домен через BotFather → /setdomain)',
        code: 'INTERNAL',
      });
    }
    // The Telegram Login Widget is typically embedded as a script; the
    // /start endpoint here returns a hosted page URL for now.
    const redirect = `${env.PUBLIC_WEB_URL}/api/auth/telegram/callback`;
    const url = new URL(`https://oauth.telegram.org/auth`);
    url.searchParams.set('bot_id', env.TELEGRAM_BOT_USERNAME);
    url.searchParams.set('origin', env.PUBLIC_WEB_URL);
    url.searchParams.set('request_access', 'write');
    url.searchParams.set('return_to', redirect);
    return reply.send({ url: url.toString() });
  });

  app.get('/api/auth/vk/callback', async (_req, reply) => {
    return reply.status(501).send({
      error: 'VK callback ещё не реализован',
      code: 'INTERNAL',
    });
  });

  app.get('/api/auth/telegram/callback', async (_req, reply) => {
    return reply.status(501).send({
      error: 'Telegram callback ещё не реализован',
      code: 'INTERNAL',
    });
  });
};
