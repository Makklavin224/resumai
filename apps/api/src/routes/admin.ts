import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, sessions, transactions, generations } from '../db/schema.js';
import { ensureSession } from '../services/session/credits.js';
import { findUserById } from '../services/auth/users.js';
import { fetchResult } from '../services/cache/results.js';
import {
  SYSTEM_ANALYST_DEFAULT,
  SYSTEM_WRITER_DEFAULT,
} from '../services/ai/prompts.js';
import {
  getSetting,
  setSetting,
  deleteSetting,
  SETTING_KEYS,
} from '../services/settings/app-settings.js';
import { env } from '../lib/env.js';

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

const CreditDeltaSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, { message: 'delta must be non-zero' }),
  reason: z.string().trim().max(200).optional(),
});

const BlockSchema = z.object({
  blocked: z.boolean(),
});

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
      [{ blockedCount = 0 } = {}],
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
      db
        .select({ blockedCount: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.isBlocked, true)),
    ]);
    return reply.send({ userCount, sessionCount, txCount, txRevenue, genCount, blockedCount });
  });

  /**
   * Users list. Credits are aggregated across all sessions linked to the user
   * so the admin sees the total balance (we don't merge sessions on login —
   * each device can have its own).
   */
  app.get('/api/admin/users', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isAdmin: users.isAdmin,
        isBlocked: users.isBlocked,
        provider: users.provider,
        createdAt: users.createdAt,
        credits: sql<number>`coalesce(sum(${sessions.credits}), 0)::int`,
        sessionCount: sql<number>`count(${sessions.id})::int`,
      })
      .from(users)
      .leftJoin(sessions, eq(sessions.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(500);
    return reply.send(rows);
  });

  /**
   * Adjust credits for a user. Positive delta tops up the newest session
   * linked to the user (creating one if none exists is out of scope — user
   * must have logged in at least once). Negative delta consumes from the
   * most-credited session first so we never go below zero.
   */
  app.post('/api/admin/users/:id/credits', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const userId = (req.params as { id: string }).id;
    const { delta } = CreditDeltaSchema.parse(req.body);

    // Order by recent activity first — that's the session the user is
    // currently logged into. The previous "order by credits DESC" put the
    // bonus into a stale session that the live cabinet wasn't reading.
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.updatedAt));
    if (userSessions.length === 0) {
      return reply
        .status(404)
        .send({ error: 'У пользователя нет активных сессий', code: 'INVALID_INPUT' });
    }

    if (delta > 0) {
      // Always top up the most-recent session; user sees it immediately.
      const target = userSessions[0]!;
      await db
        .update(sessions)
        .set({ credits: target.credits + delta, updatedAt: new Date() })
        .where(eq(sessions.id, target.id));
    } else {
      // Drain from the most-recent session first, cascade to older ones.
      let remaining = -delta;
      for (const s of userSessions) {
        if (remaining === 0) break;
        const take = Math.min(s.credits, remaining);
        if (take === 0) continue;
        await db
          .update(sessions)
          .set({ credits: s.credits - take, updatedAt: new Date() })
          .where(eq(sessions.id, s.id));
        remaining -= take;
      }
      if (remaining > 0) {
        return reply.send({
          ok: true,
          warning: `У пользователя было меньше кредитов, списано только ${-delta - remaining}`,
        });
      }
    }

    const [{ total = 0 } = {}] = await db
      .select({ total: sql<number>`coalesce(sum(credits), 0)::int` })
      .from(sessions)
      .where(eq(sessions.userId, userId));
    return reply.send({ ok: true, credits: total });
  });

  app.post('/api/admin/users/:id/block', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const userId = (req.params as { id: string }).id;
    const { blocked } = BlockSchema.parse(req.body);
    if (userId === me.id && blocked) {
      return reply
        .status(400)
        .send({ error: 'Нельзя заблокировать себя', code: 'INVALID_INPUT' });
    }
    const [row] = await db
      .update(users)
      .set({ isBlocked: blocked })
      .where(eq(users.id, userId))
      .returning();
    if (!row) return reply.status(404).send({ error: 'user not found', code: 'INVALID_INPUT' });
    return reply.send({ ok: true, isBlocked: row.isBlocked });
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

  /**
   * Full detail of a single generation. The generated letter + gaps + matches
   * live in Redis (1h TTL) keyed by resultId. After the TTL expires we return
   * just the DB row — the admin can still see when/what was generated, just
   * not the actual text.
   */
  app.get('/api/admin/generations/:id', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const id = (req.params as { id: string }).id;
    const [row] = await db.select().from(generations).where(eq(generations.id, id));
    if (!row) return reply.status(404).send({ error: 'not found', code: 'INVALID_INPUT' });
    const cached = await fetchResult(row.sessionId, row.resultId).catch(() => null);
    return reply.send({ generation: row, result: cached });
  });

  // ---------- Settings: prompts + OpenAI key override ----------

  /**
   * GET /api/admin/settings — returns the currently active prompts and
   * whether an OpenAI key override is set (the key value itself is never
   * returned — only a "set|unset" indicator + last-4 of the active one).
   */
  app.get('/api/admin/settings', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const [
      analyst,
      writer,
      openaiKey,
      openaiProxy,
      ykShopId,
      ykSecret,
      ykWebhook,
      pricingRaw,
    ] = await Promise.all([
      getSetting(SETTING_KEYS.promptAnalyst),
      getSetting(SETTING_KEYS.promptWriter),
      getSetting(SETTING_KEYS.openaiApiKey),
      getSetting(SETTING_KEYS.openaiProxyUrl),
      getSetting(SETTING_KEYS.yookassaShopId),
      getSetting(SETTING_KEYS.yookassaSecretKey),
      getSetting(SETTING_KEYS.yookassaWebhookSecret),
      getSetting(SETTING_KEYS.pricingOverrides),
    ]);
    const telegramChatId = await getSetting(SETTING_KEYS.telegramAdminChatId).catch(() => null);
    const activeKey = openaiKey || env.OPENAI_API_KEY;
    const keyMask = activeKey
      ? `${activeKey.slice(0, 3)}…${activeKey.slice(-4)}`
      : null;
    const activeProxy = openaiProxy || env.OPENAI_PROXY_URL || '';
    const packages = await (await import('../services/settings/pricing.js')).getEffectivePackages();
    let pricingOverrides: Record<string, unknown> = {};
    try {
      pricingOverrides = pricingRaw ? JSON.parse(pricingRaw) : {};
    } catch {
      pricingOverrides = {};
    }
    return reply.send({
      prompts: {
        analyst: {
          current: analyst ?? SYSTEM_ANALYST_DEFAULT,
          isCustom: !!analyst,
          default: SYSTEM_ANALYST_DEFAULT,
        },
        writer: {
          current: writer ?? SYSTEM_WRITER_DEFAULT,
          isCustom: !!writer,
          default: SYSTEM_WRITER_DEFAULT,
        },
      },
      openai: {
        isOverridden: !!openaiKey,
        activeKeyMask: keyMask,
        source: openaiKey ? 'db' : 'env',
        proxyUrl: activeProxy,
        proxySource: openaiProxy ? 'db' : activeProxy ? 'env' : 'none',
      },
      yookassa: {
        shopId: ykShopId || env.YOOKASSA_SHOP_ID || '',
        shopIdSource: ykShopId ? 'db' : env.YOOKASSA_SHOP_ID ? 'env' : 'none',
        secretKeyMask: (ykSecret || env.YOOKASSA_SECRET_KEY)
          ? `${(ykSecret || env.YOOKASSA_SECRET_KEY).slice(0, 5)}…${(ykSecret || env.YOOKASSA_SECRET_KEY).slice(-4)}`
          : null,
        secretSource: ykSecret ? 'db' : env.YOOKASSA_SECRET_KEY ? 'env' : 'none',
        webhookSet: !!(ykWebhook || env.YOOKASSA_WEBHOOK_SECRET),
        webhookSource: ykWebhook ? 'db' : env.YOOKASSA_WEBHOOK_SECRET ? 'env' : 'none',
      },
      pricing: {
        packages,
        overrides: pricingOverrides,
      },
      telegram: {
        botUsername: env.TELEGRAM_BOT_USERNAME || '',
        adminChatId: telegramChatId ?? '',
        tokenSet: !!env.TELEGRAM_BOT_TOKEN,
      },
    });
  });

  // ---------- Telegram admin chat id (for support notifications) ----------

  const TgChatBody = z.object({ chatId: z.string().trim() });

  app.post('/api/admin/settings/telegram-chat-id', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const { chatId } = TgChatBody.parse(req.body);
    if (chatId.length === 0) {
      await deleteSetting(SETTING_KEYS.telegramAdminChatId);
      return reply.send({ ok: true, cleared: true });
    }
    if (!/^-?\d{3,}$/.test(chatId)) {
      return reply
        .status(400)
        .send({ error: 'Chat ID должен быть числом', code: 'INVALID_INPUT' });
    }
    await setSetting(SETTING_KEYS.telegramAdminChatId, chatId);
    return reply.send({ ok: true });
  });

  /**
   * Helper: poll Telegram getUpdates and return the chat_id of the most
   * recent private-chat message sent to the bot. The admin pings the bot
   * with /start first, then clicks "Detect" in the UI.
   */
  app.post('/api/admin/settings/telegram-chat-id/detect', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    if (!env.TELEGRAM_BOT_TOKEN) {
      return reply.status(400).send({ error: 'TELEGRAM_BOT_TOKEN не задан', code: 'INVALID_INPUT' });
    }
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates?limit=20`,
      );
      const data = (await res.json()) as {
        ok?: boolean;
        result?: Array<{
          message?: { chat?: { id?: number; type?: string; username?: string; first_name?: string } };
        }>;
      };
      if (!data.ok || !Array.isArray(data.result)) {
        return reply
          .status(502)
          .send({ error: 'Telegram getUpdates вернул не ok', code: 'INTERNAL' });
      }
      // Find the newest private-chat message.
      const candidate = [...data.result]
        .reverse()
        .find((u) => u.message?.chat?.type === 'private' && u.message.chat.id);
      if (!candidate || !candidate.message?.chat?.id) {
        return reply.status(404).send({
          error: 'Свежих сообщений не найдено. Отправьте боту /start и попробуйте снова.',
          code: 'INVALID_INPUT',
        });
      }
      const chat = candidate.message.chat;
      await setSetting(SETTING_KEYS.telegramAdminChatId, String(chat.id));
      return reply.send({
        ok: true,
        chatId: String(chat.id),
        username: chat.username ?? null,
        firstName: chat.first_name ?? null,
      });
    } catch (err) {
      app.log.error({ err }, 'telegram getUpdates failed');
      return reply.status(502).send({ error: 'Сеть/Telegram недоступны', code: 'INTERNAL' });
    }
  });

  const PromptsBody = z.object({
    analyst: z.string().trim().optional(),
    writer: z.string().trim().optional(),
  });

  /** Save prompt overrides. Empty string resets to default (row deleted). */
  app.post('/api/admin/settings/prompts', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const body = PromptsBody.parse(req.body);
    if (typeof body.analyst === 'string') {
      if (body.analyst.length === 0) {
        await deleteSetting(SETTING_KEYS.promptAnalyst);
      } else if (body.analyst.length < 200) {
        return reply
          .status(400)
          .send({ error: 'Промпт аналитика слишком короткий', code: 'INVALID_INPUT' });
      } else {
        await setSetting(SETTING_KEYS.promptAnalyst, body.analyst);
      }
    }
    if (typeof body.writer === 'string') {
      if (body.writer.length === 0) {
        await deleteSetting(SETTING_KEYS.promptWriter);
      } else if (body.writer.length < 200) {
        return reply
          .status(400)
          .send({ error: 'Промпт writer слишком короткий', code: 'INVALID_INPUT' });
      } else {
        await setSetting(SETTING_KEYS.promptWriter, body.writer);
      }
    }
    return reply.send({ ok: true });
  });

  const OpenAiKeyBody = z.object({
    apiKey: z.string().trim(),
  });

  /**
   * Set or clear the OpenAI key override. Empty string deletes the override
   * so the app falls back to env.OPENAI_API_KEY.
   */
  app.post('/api/admin/settings/openai-key', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const { apiKey } = OpenAiKeyBody.parse(req.body);
    if (apiKey.length === 0) {
      await deleteSetting(SETTING_KEYS.openaiApiKey);
      return reply.send({ ok: true, cleared: true });
    }
    if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
      return reply
        .status(400)
        .send({ error: 'Ключ не похож на OpenAI API key (должен начинаться с sk-)', code: 'INVALID_INPUT' });
    }
    await setSetting(SETTING_KEYS.openaiApiKey, apiKey);
    return reply.send({ ok: true });
  });

  // ---------- OpenAI proxy URL ----------

  const ProxyBody = z.object({ url: z.string().trim() });

  app.post('/api/admin/settings/openai-proxy', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const { url } = ProxyBody.parse(req.body);
    if (url.length === 0) {
      await deleteSetting(SETTING_KEYS.openaiProxyUrl);
      return reply.send({ ok: true, cleared: true });
    }
    try {
      // Basic sanity check — must parse as a URL.
      new URL(url);
    } catch {
      return reply
        .status(400)
        .send({ error: 'Некорректный URL прокси', code: 'INVALID_INPUT' });
    }
    await setSetting(SETTING_KEYS.openaiProxyUrl, url);
    return reply.send({ ok: true });
  });

  // ---------- YooKassa shop_id / secret_key / webhook secret ----------

  const YooKassaBody = z.object({
    shopId: z.string().trim().optional(),
    secretKey: z.string().trim().optional(),
    webhookSecret: z.string().trim().optional(),
  });

  app.post('/api/admin/settings/yookassa', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const body = YooKassaBody.parse(req.body);

    if (typeof body.shopId === 'string') {
      if (body.shopId.length === 0) await deleteSetting(SETTING_KEYS.yookassaShopId);
      else await setSetting(SETTING_KEYS.yookassaShopId, body.shopId);
    }
    if (typeof body.secretKey === 'string') {
      if (body.secretKey.length === 0) await deleteSetting(SETTING_KEYS.yookassaSecretKey);
      else await setSetting(SETTING_KEYS.yookassaSecretKey, body.secretKey);
    }
    if (typeof body.webhookSecret === 'string') {
      if (body.webhookSecret.length === 0)
        await deleteSetting(SETTING_KEYS.yookassaWebhookSecret);
      else await setSetting(SETTING_KEYS.yookassaWebhookSecret, body.webhookSecret);
    }
    return reply.send({ ok: true });
  });

  // ---------- Pricing overrides ----------

  const PricingBody = z.object({
    overrides: z.record(
      z.string(),
      z.object({
        priceRub: z.number().int().min(0).optional(),
        credits: z.number().int().positive().optional(),
        label: z.string().max(80).optional(),
        badge: z.string().max(40).nullable().optional(),
        popular: z.boolean().optional(),
      }),
    ),
  });

  app.post('/api/admin/settings/pricing', async (req, reply) => {
    const me = await requireAdmin(req, reply);
    if (!me) return;
    const { overrides } = PricingBody.parse(req.body);
    await setSetting(SETTING_KEYS.pricingOverrides, JSON.stringify(overrides));
    return reply.send({ ok: true, overrides });
  });
};
