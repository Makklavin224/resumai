import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { SIGNUP_BONUS_CREDITS } from '@resumai/shared';
import { env } from '../lib/env.js';
import { ensureSession, hashIp } from '../services/session/credits.js';
import {
  findOrCreateOAuthUser,
  grantSignupBonusIfFirstIp,
  linkSessionToUser,
} from '../services/auth/users.js';
import { db } from '../db/client.js';
import { sessions, users } from '../db/schema.js';

/** Reset session credits to 0 — called right before granting the signup
 *  bonus on OAuth registration so the user doesn't inherit leftover credits
 *  from a previous anon/cabinet session on the same cookie. */
async function resetSessionCredits(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ credits: 0, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

/** Max age of a Telegram auth payload before we reject it as replay-able. */
const TG_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

/** Cookie used to carry the VK OAuth state + PKCE verifier across the redirect. */
const VK_STATE_COOKIE = 'vk_oauth_state';
const VK_STATE_TTL_SECONDS = 10 * 60;

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

/** RFC 7636 PKCE code_challenge = base64url(SHA256(verifier)), no padding. */
function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function vkCookieOptions() {
  const isHttps = env.PUBLIC_WEB_URL.startsWith('https://');
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttps,
    maxAge: VK_STATE_TTL_SECONDS,
    signed: true,
  };
}

function readVkStateCookie(req: FastifyRequest): { state: string; verifier: string } | null {
  const raw = req.cookies?.[VK_STATE_COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  const idx = unsigned.value.indexOf(':');
  if (idx <= 0) return null;
  return {
    state: unsigned.value.slice(0, idx),
    verifier: unsigned.value.slice(idx + 1),
  };
}

export const oauthStubRoutes: FastifyPluginAsync = async (app) => {
  // ---------- VK ID ----------
  app.get('/api/auth/vk/start', async (_req, reply) => {
    if (!env.VK_CLIENT_ID) {
      return reply.status(501).send({
        error: 'VK ID не настроен (добавьте VK_CLIENT_ID в .env)',
        code: 'INTERNAL',
      });
    }
    const redirect = env.VK_REDIRECT_URI || `${env.PUBLIC_WEB_URL}/api/auth/vk/callback`;
    const state = randomBytes(16).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = pkceChallenge(verifier);

    reply.setCookie(VK_STATE_COOKIE, `${state}:${verifier}`, vkCookieOptions());

    const url = new URL('https://id.vk.ru/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', env.VK_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirect);
    url.searchParams.set('scope', 'email phone');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 's256');
    return reply.send({ url: url.toString() });
  });

  app.get('/api/auth/vk/callback', async (req, reply) => {
    if (!env.VK_CLIENT_ID || !env.VK_CLIENT_SECRET) {
      return redirectToLogin(reply, 'vk_not_configured');
    }

    const q = (req.query ?? {}) as Record<string, unknown>;
    const code = typeof q.code === 'string' ? q.code : '';
    const state = typeof q.state === 'string' ? q.state : '';
    const deviceId = typeof q.device_id === 'string' ? q.device_id : '';
    const vkError = typeof q.error === 'string' ? q.error : '';
    if (vkError) {
      app.log.warn({ vkError }, 'vk callback: provider error');
      return redirectToLogin(reply, `vk_${vkError}`);
    }
    if (!code || !state) {
      return redirectToLogin(reply, 'vk_missing_fields');
    }

    const saved = readVkStateCookie(req);
    reply.clearCookie(VK_STATE_COOKIE, { path: '/' });
    if (!saved || saved.state !== state) {
      return redirectToLogin(reply, 'vk_state_mismatch');
    }

    const redirectUri =
      env.VK_REDIRECT_URI || `${env.PUBLIC_WEB_URL}/api/auth/vk/callback`;

    // Step 1: exchange ?code for access_token at id.vk.ru/oauth2/auth
    let tokenJson: {
      access_token?: string;
      user_id?: number | string;
      email?: string;
      error?: string;
      error_description?: string;
    };
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: saved.verifier,
        client_id: env.VK_CLIENT_ID,
        client_secret: env.VK_CLIENT_SECRET,
        redirect_uri: redirectUri,
        state,
      });
      if (deviceId) body.set('device_id', deviceId);
      const res = await fetch('https://id.vk.ru/oauth2/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      tokenJson = (await res.json()) as typeof tokenJson;
      if (!res.ok || !tokenJson.access_token) {
        app.log.warn({ status: res.status, tokenJson }, 'vk callback: token exchange failed');
        return redirectToLogin(reply, 'vk_token_exchange');
      }
    } catch (err) {
      app.log.error({ err }, 'vk callback: token request threw');
      return redirectToLogin(reply, 'vk_token_error');
    }

    // Step 2: fetch user_info
    let userJson: {
      user?: {
        user_id?: number | string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
      };
    };
    try {
      const body = new URLSearchParams({
        client_id: env.VK_CLIENT_ID,
        access_token: tokenJson.access_token as string,
      });
      const res = await fetch('https://id.vk.ru/oauth2/user_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      userJson = (await res.json()) as typeof userJson;
      if (!res.ok || !userJson.user?.user_id) {
        app.log.warn({ status: res.status, userJson }, 'vk callback: user_info failed');
        return redirectToLogin(reply, 'vk_user_info');
      }
    } catch (err) {
      app.log.error({ err }, 'vk callback: user_info request threw');
      return redirectToLogin(reply, 'vk_user_info_error');
    }

    const vkUser = userJson.user!;
    const providerId = String(vkUser.user_id);
    const displayName = [vkUser.first_name, vkUser.last_name]
      .map((s) => s?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
      .trim() || null;

    const session = await ensureSession(req, reply);
    try {
      const { user, created } = await findOrCreateOAuthUser({
        provider: 'vk',
        providerId,
        displayName,
        email: vkUser.email ?? null,
        phone: vkUser.phone ?? null,
      });
      await linkSessionToUser(session.sessionId, user.id);
      if (created) {
        await resetSessionCredits(session.sessionId);
        const { granted } = await grantSignupBonusIfFirstIp({
          sessionId: session.sessionId,
          ipHash: hashIp(req.ip),
          userId: user.id,
          provider: 'vk',
          amount: SIGNUP_BONUS_CREDITS,
        });
        if (!granted) {
          // Repeat signup from the same IP — no credits, mark suspicious.
          await db
            .update(users)
            .set({ isSuspicious: true })
            .where(eq(users.id, user.id));
        }
      }
      return redirectToProfile(reply, 'vk');
    } catch (err) {
      app.log.error({ err, providerId }, 'vk callback: upsert failed');
      return redirectToLogin(reply, 'vk_upsert_failed');
    }
  });

  // ---------- Telegram ----------
  /**
   * Returns the Telegram Login Widget config. The client embeds
   * telegram-widget.js with these attributes — Telegram handles the popup,
   * then 302s the browser back to `authUrl` with the signed query params
   * which /callback verifies below.
   */
  app.get('/api/auth/telegram/start', async (_req, reply) => {
    if (!env.TELEGRAM_BOT_USERNAME || !env.TELEGRAM_BOT_TOKEN) {
      return reply.status(501).send({
        error:
          'Telegram не настроен (нужны TELEGRAM_BOT_USERNAME + TELEGRAM_BOT_TOKEN, домен привязывается через BotFather → /setdomain)',
        code: 'INTERNAL',
      });
    }
    const botId = (env.TELEGRAM_BOT_TOKEN.split(':', 1)[0] ?? '').trim();
    return reply.send({
      mode: 'widget',
      botId,
      botUsername: env.TELEGRAM_BOT_USERNAME.replace(/^@/, ''),
      authUrl: `${env.PUBLIC_WEB_URL}/api/auth/telegram/callback`,
    });
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
        await resetSessionCredits(session.sessionId);
        const { granted } = await grantSignupBonusIfFirstIp({
          sessionId: session.sessionId,
          ipHash: hashIp(req.ip),
          userId: user.id,
          provider: 'telegram',
          amount: SIGNUP_BONUS_CREDITS,
        });
        if (!granted) {
          // Repeat signup from the same IP — no credits, mark suspicious.
          await db
            .update(users)
            .set({ isSuspicious: true })
            .where(eq(users.id, user.id));
        }
      }
      return redirectToProfile(reply, 'telegram');
    } catch (err) {
      app.log.error({ err, tgId: params.id }, 'telegram callback: upsert failed');
      return redirectToLogin(reply, 'telegram_upsert_failed');
    }
  });
};
