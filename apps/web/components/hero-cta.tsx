'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/motion/magnetic-button';
import { useAuth } from '@/lib/auth-client';

/**
 * Landing primary CTAs. Switches targets depending on auth state:
 * - anonymous → "Получить 3 отклика" → /register + secondary "Как работает"
 * - logged in → single "Адаптировать резюме" → #adapt
 */
export function HeroCta({ variant = 'top' }: { variant?: 'top' | 'final' }) {
  const { user, loading } = useAuth();
  const isFinal = variant === 'final';

  if (loading) {
    return <div className="mx-auto mt-6 h-14" aria-hidden />;
  }

  if (user) {
    return (
      <div
        className={
          isFinal ? 'mt-6' : 'mx-auto mt-6 flex flex-wrap items-center justify-center gap-3'
        }
      >
        <MagneticButton>
          <Button size="lg" asChild>
            <Link href="/#adapt">
              <Sparkles className="size-4" />
              Адаптировать резюме
              {isFinal && <ArrowRight className="size-4" />}
            </Link>
          </Button>
        </MagneticButton>
      </div>
    );
  }

  if (isFinal) {
    return (
      <div className="mt-6">
        <MagneticButton>
          <Button size="lg" asChild>
            <Link href="/register">
              Сделать первый отклик
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </MagneticButton>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
      <MagneticButton>
        <Button size="lg" asChild>
          <Link href="/register">
            <Sparkles className="size-4" />
            Получить 3 отклика
          </Link>
        </Button>
      </MagneticButton>
      <Button size="lg" variant="outline" asChild>
        <Link href="#how-it-works">Как это работает</Link>
      </Button>
    </div>
  );
}
