import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { env } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';
import { getSetting, SETTING_KEYS } from '../settings/app-settings.js';

let client: OpenAI | null = null;
let cachedKey: string | null = null;
let cachedProxy: string | null = null;

/**
 * Returns a cached OpenAI client. Admin-supplied overrides for the API key
 * (SETTING_KEYS.openaiApiKey) and proxy URL (SETTING_KEYS.openaiProxyUrl)
 * win over env. If any of these change, the client is rebuilt.
 */
export async function getOpenAI(): Promise<OpenAI> {
  const [keyOverride, proxyOverride] = await Promise.all([
    getSetting(SETTING_KEYS.openaiApiKey).catch(() => null),
    getSetting(SETTING_KEYS.openaiProxyUrl).catch(() => null),
  ]);
  const effectiveKey = keyOverride || env.OPENAI_API_KEY;
  const effectiveProxy = proxyOverride || env.OPENAI_PROXY_URL || '';

  if (client && cachedKey === effectiveKey && cachedProxy === effectiveProxy) {
    return client;
  }

  const httpAgent = effectiveProxy ? new HttpsProxyAgent(effectiveProxy) : undefined;
  if (httpAgent) {
    logger.info({ proxy: maskProxy(effectiveProxy) }, 'OpenAI routed via proxy');
  }
  client = new OpenAI({
    apiKey: effectiveKey,
    httpAgent,
    timeout: 180_000,
    maxRetries: 0,
  });
  cachedKey = effectiveKey;
  cachedProxy = effectiveProxy;
  return client;
}

function maskProxy(u: string): string {
  try {
    const parsed = new URL(u);
    return `${parsed.protocol}//***@${parsed.host}`;
  } catch {
    return '[invalid proxy url]';
  }
}
