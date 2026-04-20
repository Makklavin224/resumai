import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { fetch, ProxyAgent } from 'undici';
import { db } from '../db/client.js';
import { sessions, supportMessages } from '../db/schema.js';
import { ensureSession } from '../services/session/credits.js';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { getSetting, SETTING_KEYS } from '../services/settings/app-settings.js';

const ContactBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  body: z.string().trim().min(10).max(4000),
});

/**
 * Notify admin about a new support ticket via Telegram if we have the bot
 * token + admin chat id. Never throws — logging only.
 */
async function notifyAdminTelegram(row: {
  id: string;
  name: string;
  email: string;
  body: string;
}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = await getSetting(SETTING_KEYS.telegramAdminChatId).catch(() => null);
  if (!token || !chatId) return;
  const proxyUrl =
    (await getSetting(SETTING_KEYS.openaiProxyUrl).catch(() => null)) ||
    env.OPENAI_PROXY_URL ||
    '';
  const dispatcher = proxyUrl ? new ProxyAgent({ uri: proxyUrl }) : undefined;
  const text = `📨 Новое обращение в поддержку\n\nОт: ${row.name} <${row.email}>\nID: ${row.id.slice(0, 8)}\n\n${row.body.slice(0, 2000)}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      dispatcher,
    });
    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body }, 'telegram notify non-2xx');
    }
  } catch (err) {
    logger.warn({ err }, 'telegram notify failed');
  }
}

export const supportRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/support/contact', async (req, reply) => {
    const session = await ensureSession(req, reply);
    const body = ContactBody.parse(req.body);

    const [sess] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(eq(sessions.id, session.sessionId));

    const [row] = await db
      .insert(supportMessages)
      .values({
        userId: sess?.userId ?? null,
        name: body.name,
        email: body.email,
        body: body.body,
      })
      .returning();
    if (!row) throw new Error('failed to save support message');

    await notifyAdminTelegram(row);
    return reply.send({ ok: true, id: row.id });
  });
};
