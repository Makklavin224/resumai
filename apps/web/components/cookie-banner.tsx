'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'resumai_cookie_consent_v1';

/**
 * GDPR/152-FZ-style cookie notice. Purely client-side: stores the user's
 * choice in localStorage so the bar never appears again until they clear
 * site data. Sticky to the bottom, z-[90] so the generate overlay
 * (portal, max z-index) still covers it.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      /* private mode etc — ignore */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, `accepted:${Date.now()}`);
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Уведомление об использовании cookie"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 shadow-[var(--shadow-elevated)] backdrop-blur sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground sm:pr-4">
          Мы используем файлы cookie, чтобы сервис работал корректно: запоминаем вход в
          аккаунт и защищаем сессию. Рекламных cookie нет. Подробнее — в{' '}
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            Политике конфиденциальности
          </Link>
          .
        </p>
        <Button onClick={accept} size="sm" variant="primary" className="self-start sm:self-auto">
          Принимаю
        </Button>
      </div>
    </div>
  );
}
