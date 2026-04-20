import { fetch } from 'undici';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';
import { CREDIT_PACKAGES, type CreditPackage } from '@resumai/shared';

const YK_API = 'https://api.yookassa.ru/v3';

export interface YkPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url: string };
  metadata?: Record<string, string>;
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${env.YOOKASSA_SHOP_ID}:${env.YOOKASSA_SECRET_KEY}`).toString('base64');
}

export function getPackage(id: string): CreditPackage | null {
  return CREDIT_PACKAGES.find((p) => p.id === id && p.priceRub > 0) ?? null;
}

export interface CreatePaymentArgs {
  pkg: CreditPackage;
  sessionId: string;
  returnUrl: string;
}

export async function createPayment({
  pkg,
  sessionId,
  returnUrl,
}: CreatePaymentArgs): Promise<YkPayment> {
  if (!env.YOOKASSA_SHOP_ID || !env.YOOKASSA_SECRET_KEY) {
    throw new Error('YooKassa credentials not configured');
  }

  const body = {
    amount: { value: pkg.priceRub.toFixed(2), currency: 'RUB' },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    description: `ResumAI · ${pkg.label} · ${pkg.credits} откликов`,
    metadata: {
      session_id: sessionId,
      package_id: pkg.id,
      credits: String(pkg.credits),
    },
  };

  const res = await fetch(`${YK_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': randomUUID(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, body: text }, 'YooKassa create payment failed');
    throw new Error(`YooKassa error ${res.status}`);
  }

  return (await res.json()) as YkPayment;
}

/**
 * Verify YooKassa webhook.
 * YooKassa uses IP allowlist + HTTPS; an extra HMAC shared-secret header
 * can be enabled in the merchant dashboard. We support both.
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | undefined,
): boolean {
  if (!env.YOOKASSA_WEBHOOK_SECRET) return true; // skip if not configured
  if (!signatureHeader) return false;
  // YooKassa signs payload with HMAC-SHA1 by default: "v1=<hex>"
  const match = /v1=([a-f0-9]+)/i.exec(signatureHeader);
  const provided = match?.[1];
  if (!provided) return false;
  const expected = createHmac('sha1', env.YOOKASSA_WEBHOOK_SECRET).update(payload).digest('hex');
  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
