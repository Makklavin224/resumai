import type { CreditPackage } from './types';

export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  { id: 'trial', label: 'Пробный', credits: 1, priceRub: 0 },
  { id: 'pack_10', label: 'Стандарт', credits: 10, priceRub: 490, badge: 'ХИТ', popular: true },
  { id: 'pack_25', label: 'Профи', credits: 25, priceRub: 990 },
] as const;

export const LIMITS = {
  resumeTextMin: 200,
  resumeTextMax: 50_000,
  vacancyTextMin: 200,
  vacancyTextMax: 50_000,
  pdfMaxBytes: 10 * 1024 * 1024,
  pdfMaxPages: 20,
  coverLetterMinWords: 120,
  coverLetterMaxWords: 180,
  generateTimeoutMs: 120_000,
  aiRetryCount: 2,
} as const;

export const HH_URL_REGEX =
  /^https?:\/\/(?:(?:[a-z]{2,4}\.)?hh\.ru|rabota\.yandex\.ru)\/(?:vacancy|resume)\/[A-Za-z0-9_-]+/i;
