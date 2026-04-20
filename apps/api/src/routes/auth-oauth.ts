import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { SIGNUP_BONUS_CREDITS } from '@resumai/shared';
import { env } from '../lib/env.js';
import { ensureSession } from '../services/session/credits.js';
import {
  findOrCreateOAuthUser,
  grantSignupBonus,
  linkSessionToUser,
} from '../services/auth/users.js';

/** Max age of a Telegram auth payload before we reject it as replay-able. */
const TG_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

function redirectToLogin(reply: FastifyReply, error: string) {
  const url = new URL('/login', env.PUBLIC_WEB_URL);
  url.searchParams.set('error', error);
  return reply.redirect(url.toString(), 302);
}

function redirectToProfile(reply: FastifyReply, login: 'vk' | 'telegram') {
  const url = new URL('/profile', env.PUBLIC_WEB_URL);
  url.searchParams.set('login', login);
  return reply.redirect(url.toString(), 302);
}

/**
 * Verify Telegram Login Widget payload per
 * https://core.telegram.org/widgets/login#checking-authorization.
 *
 *   data_check_string = sorted("{key}={value}") joined by "\n"
 *   secret_key        = SHA-256(bot_token)
 *   expected_hash     = HMAC-SHA-256(data_check_string, secret_key)
 */
function verifyTelegramPayload(
  params: Record<string, string>,
  botToken: string,
): boolean {
  const { hash, ...rest } = params;
  if (!hash) return false;
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (expected.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'));
}

function tgDisplayName(params: Record<string, string>): string | null {
  const first = params.first_name?.trim();
  const last = params.last_name?.trim();
  const username = params.username?.trim();
  const full = [first, last].filter(Boolean).join(' ').trim();
  if (full) return full;
  if (username) return `@${username}`;
  return null;
}

export const oauthStubRoutes: FastifyPluginAsync = async (app) => {
  // ---------- VK ID ----------
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

  app.get('/api/auth/vk/callback', async (_req, reply) => {
    // TODO: exchange ?code= for access_token via id.vk.com/oauth2/auth,
    // fetch user info, then findOrCreateOAuthUser({ provider: 'vk', ... }).
    // Blocked until the founder provisions VK_CLIENT_SECRET.
    return redirectToLogin(reply, 'vk_not_configured');
  });

  // ---------- Telegram ----------
  app.get('/api/auth/telegram/start', async (_req, reply) => {
    if (!env.TELEGRAM_BOT_USERNAME) {
      return reply.status(501).send({
        error:
          'Telegram не настроен (добавьте TELEGRAM_BOT_USERNAME, привяжите домен через BotFather → /setdomain)',
        code: 'INTERNAL',
      });
    }
    // Telegram Login Widget is normally embedded as a <script>, but for
    // a minimal flow we hand the browser off to the hosted oauth page.
    // Telegram will POST the user back to `return_to` with the signed
    // payload as query params once the user confirms.
    const redirect = `${env.PUBLIC_WEB_URL}/api/auth/telegram/callback`;
    const url = new URL('https://oauth.telegram.org/auth');
    url.searchParams.set('bot_id', env.TELEGRAM_BOT_USERNAME);
    url.searchParams.set('origin', env.PUBLIC_WEB_URL);
    url.searchParams.set('request_access', 'write');
    url.searchParams.set('return_to', redirect);
    return reply.send({ url: url.toString() });
  });

  app.get('/api/auth/telegram/callback', async (req, reply) => {
    if (!env.TELEGRAM_BOT_TOKEN) {
      return redirectToLogin(reply, 'telegram_not_configured');
    }

    const q = (req.query ?? {}) as Record<string, unknown>;
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(q)) {
      if (typeof v === 'string') params[k] = v;
    }
    if (!params.id || !params.auth_date || !params.hash) {
      return redirectToLogin(reply, 'telegram_missing_fields');
    }

    // Verify signature before trusting any field.
    if (!verifyTelegramPayload(params, env.TELEGRAM_BOT_TOKEN)) {
      app.log.warn({ tgId: params.id }, 'telegram callback: hash mismatch');
      return redirectToLogin(reply, 'telegram_bad_signature');
    }

    const authDate = Number(params.auth_date);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(authDate) || nowSec - authDate > TG_AUTH_MAX_AGE_SECONDS) {
      return redirectToLogin(reply, 'telegram_expired');
    }

    const session = await ensureSession(req, reply);
    try {
      const { user, created } = await findOrCreateOAuthUser({
        provider: 'telegram',
        providerId: params.id,
        displayName: tgDisplayName(params),
      });
      await linkSessionToUser(session.sessionId, user.id);
      if (created) {
        await grantSignupBonus(session.sessionId, SIGNUP_BONUS_CREDITS);
      }
      return redirectToProfile(reply, 'telegram');
    } catch (err) {
      app.log.error({ err, tgId: params.id }, 'telegram callback: upsert failed');
      return redirectToLogin(reply, 'telegram_upsert_failed');
    }
  });
};
