import { fetch } from 'undici';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';
import { type CreditPackage } from '@resumai/shared';
import { getSetting, SETTING_KEYS } from '../settings/app-settings.js';
import { getEffectivePackage, getEffectivePackages } from '../settings/pricing.js';

const YK_API = 'https://api.yookassa.ru/v3';

export interface YkPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url: string };
  metadata?: Record<string, string>;
}

async function effectiveYookassaCreds(): Promise<{ shopId: string; secretKey: string }> {
  const [shop, secret] = await Promise.all([
    getSetting(SETTING_KEYS.yookassaShopId).catch(() => null),
    getSetting(SETTING_KEYS.yookassaSecretKey).catch(() => null),
  ]);
  return {
    shopId: shop || env.YOOKASSA_SHOP_ID,
    secretKey: secret || env.YOOKASSA_SECRET_KEY,
  };
}

/** Find one package by id, honouring admin-supplied pricing overrides. */
export async function getPackage(id: string): Promise<CreditPackage | null> {
  const pkg = await getEffectivePackage(id);
  if (!pkg || pkg.priceRub <= 0) return null;
  return pkg;
}

/** Full package list for /api/config/pricing — used by the frontend. */
export async function listPackages(): Promise<CreditPackage[]> {
  return getEffectivePackages();
}

export interface CreatePaymentArgs {
  pkg: CreditPackage;
  sessionId: string;
  returnUrl: string;
  customerEmail?: string | null;
}

function normalizeReceiptEmail(raw: string | null | undefined): string {
  const email = (raw ?? '').trim().toLowerCase();
  if (!email || email.endsWith('.local')) return 'service@resumai.pro';
  return email;
}

export async function createPayment({
  pkg,
  sessionId,
  returnUrl,
  customerEmail,
}: CreatePaymentArgs): Promise<YkPayment> {
  const { shopId, secretKey } = await effectiveYookassaCreds();
  if (!shopId || !secretKey) {
    throw new Error('YooKassa credentials not configured');
  }

  const receiptEmail = normalizeReceiptEmail(customerEmail);
  const amountValue = pkg.priceRub.toFixed(2);

  const body = {
    amount: { value: amountValue, currency: 'RUB' },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    description: `ResumAI · ${pkg.label} · ${pkg.credits} откликов`,
    receipt: {
      customer: { email: receiptEmail },
      items: [
        {
          description: `Доступ к сервису ResumAI: пакет «${pkg.label}» (${pkg.credits} откликов)`,
          quantity: '1.00',
          amount: { value: amountValue, currency: 'RUB' },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'service',
        },
      ],
    },
    metadata: {
      session_id: sessionId,
      package_id: pkg.id,
      credits: String(pkg.credits),
    },
  };

  const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');

  const res = await fetch(`${YK_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
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
 * Verify YooKassa webhook. Honours an admin-supplied webhook secret override
 * if present; otherwise uses env.YOOKASSA_WEBHOOK_SECRET; if neither set,
 * verification is skipped (legacy behaviour).
 */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | undefined,
): Promise<boolean> {
  const override = await getSetting(SETTING_KEYS.yookassaWebhookSecret).catch(() => null);
  const secret = override || env.YOOKASSA_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;
  const match = /v1=([a-f0-9]+)/i.exec(signatureHeader);
  const provided = match?.[1];
  if (!provided) return false;
  const expected = createHmac('sha1', secret).update(payload).digest('hex');
  const a = Buffer.from(provided, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
