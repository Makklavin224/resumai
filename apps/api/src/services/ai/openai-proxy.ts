import OpenAI from 'openai';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { env } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const httpAgent = env.OPENAI_PROXY_URL ? new HttpsProxyAgent(env.OPENAI_PROXY_URL) : undefined;
    if (httpAgent) {
      logger.info({ proxy: maskProxy(env.OPENAI_PROXY_URL) }, 'OpenAI routed via proxy');
    }
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      httpAgent,
      timeout: 60_000,
      maxRetries: 0, // handled explicitly in generator
    });
  }
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
