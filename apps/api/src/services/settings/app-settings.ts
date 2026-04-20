import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { appSettings } from '../../db/schema.js';

/**
 * Runtime-editable settings keyed by well-known constants. The table is
 * authoritative but we cache values in-process for 30 seconds so the hot
 * path (every /generate call) doesn't hit the DB repeatedly.
 *
 * On write, the cache for the edited key is invalidated immediately.
 */
export const SETTING_KEYS = {
  promptAnalyst: 'prompt.analyst',
  promptWriter: 'prompt.writer',
  openaiApiKey: 'openai.api_key',
  openaiProxyUrl: 'openai.proxy_url',
  yookassaShopId: 'yookassa.shop_id',
  yookassaSecretKey: 'yookassa.secret_key',
  yookassaWebhookSecret: 'yookassa.webhook_secret',
  /** JSON: `{ [packageId]: { priceRub: number, label?: string, credits?: number, badge?: string|null, popular?: boolean } }` */
  pricingOverrides: 'pricing.overrides',
  telegramAdminChatId: 'telegram.admin_chat_id',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

export async function getSetting(key: SettingKey): Promise<string | null> {
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  const value = row?.value ?? null;
  cache.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
  cache.delete(key);
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, key));
  cache.delete(key);
}

/** Invalidate every cached setting — used after bulk updates. */
export function invalidateSettingsCache(): void {
  cache.clear();
}
