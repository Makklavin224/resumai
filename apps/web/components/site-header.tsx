'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { LogIn, Moon, Sun, SparklesIcon, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-client';

export function SiteHeader() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === 'dark';
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow-primary)]">
            <SparklesIcon className="size-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl">ResumAI</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/#how-it-works"
            className="hidden rounded-md px-3 py-2 text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            Как работает
          </Link>
          <Link
            href="/#pricing"
            className="hidden rounded-md px-3 py-2 text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            Цены
          </Link>

          {mounted && !loading ? (
            user ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile" className="inline-flex items-center gap-1.5">
                  <UserCircle2 className="size-4" />
                  <span className="hidden sm:inline">
                    {user.displayName || user.email.split('@')[0]}
                  </span>
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">
                    <LogIn className="size-4" />
                    Войти
                  </Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link href="/register">Регистрация</Link>
                </Button>
              </>
            )
          ) : (
            <span className="h-9 w-24" aria-hidden />
          )}

          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          ) : (
            <span className="size-11" aria-hidden />
          )}
        </nav>
      </div>
    </header>
  );
}
