import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),

  PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  COOKIE_SECRET: z.string().min(32),

  OPENAI_API_KEY: z.string().min(1),
  OPENAI_PROXY_URL: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_FALLBACK_MODEL: z.string().default('gpt-4o-mini'),

  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5-20251001'),

  YOOKASSA_SHOP_ID: z.string().optional().default(''),
  YOOKASSA_SECRET_KEY: z.string().optional().default(''),
  YOOKASSA_WEBHOOK_SECRET: z.string().optional().default(''),

  PLAYWRIGHT_SERVICE_URL: z.string().optional().default(''),

  /**
   * Comma-separated emails auto-promoted to admin on registration.
   * E.g. ADMIN_EMAILS=densemenov386@gmail.com,founder@resumai.ru
   */
  ADMIN_EMAILS: z.string().optional().default(''),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  RATE_LIMIT_GENERATE_PER_HOUR: z.coerce.number().int().positive().default(20),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
