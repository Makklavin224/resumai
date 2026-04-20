'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-client';
import { cn } from '@/lib/cn';

/**
 * Auth-aware "Buy" CTA.
 *
 *  - Anonymous → /register (they need an account to receive credits)
 *  - Logged in → POST /api/payments/create, then redirect to
 *    YooKassa confirmationUrl so they pay immediately.
 *
 * Blocked users see a toast instead of being charged.
 */
export function BuyButton({
  packageId,
  variant = 'primary',
  className,
  children = 'Купить',
}: {
  packageId: string;
  variant?: 'primary' | 'outline';
  className?: string;
  children?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (loading || pending) return;
    if (!user) {
      router.push(`/register?next=${encodeURIComponent(`/#pricing`)}&buy=${packageId}`);
      return;
    }
    if (user.isBlocked) {
      toast.error('Аккаунт заблокирован. Напишите в поддержку — разблокируем.');
      return;
    }
    setPending(true);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      const data = (await res.json()) as {
        confirmationUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.confirmationUrl) {
        toast.error(data.error ?? 'Не удалось открыть оплату');
        return;
      }
      window.location.assign(data.confirmationUrl);
    } catch {
      toast.error('Сеть недоступна. Попробуйте ещё раз.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      variant={variant}
      disabled={pending || loading}
      onClick={onClick}
      className={cn('w-full', className)}
    >
      {pending ? 'Открываем оплату…' : children}
    </Button>
  );
}
