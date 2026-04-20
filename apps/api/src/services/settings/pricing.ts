import { CREDIT_PACKAGES, type CreditPackage } from '@resumai/shared';
import { getSetting, SETTING_KEYS } from './app-settings.js';

/**
 * Shape stored in app_settings(pricing.overrides). Each key is a package id.
 * Missing fields fall back to defaults from CREDIT_PACKAGES.
 */
export type PricingOverrides = Record<
  string,
  {
    priceRub?: number;
    label?: string;
    credits?: number;
    badge?: string | null;
    popular?: boolean;
  }
>;

function parseOverrides(raw: string | null): PricingOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PricingOverrides) : {};
  } catch {
    return {};
  }
}

/** Returns the effective package list with any DB overrides applied. */
export async function getEffectivePackages(): Promise<CreditPackage[]> {
  const overrides = parseOverrides(await getSetting(SETTING_KEYS.pricingOverrides));
  return CREDIT_PACKAGES.map((p) => {
    const o = overrides[p.id];
    if (!o) return p;
    return {
      ...p,
      ...(typeof o.priceRub === 'number' ? { priceRub: o.priceRub } : {}),
      ...(typeof o.credits === 'number' ? { credits: o.credits } : {}),
      ...(typeof o.label === 'string' && o.label ? { label: o.label } : {}),
      ...(typeof o.popular === 'boolean' ? { popular: o.popular } : {}),
      ...(o.badge === null || typeof o.badge === 'string' ? { badge: o.badge ?? undefined } : {}),
    };
  });
}

/** Look up a single package by id, respecting overrides. */
export async function getEffectivePackage(id: string): Promise<CreditPackage | null> {
  const list = await getEffectivePackages();
  return list.find((p) => p.id === id) ?? null;
}
