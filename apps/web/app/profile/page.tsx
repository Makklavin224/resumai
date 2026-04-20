'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Coins, FileText, LogOut, Shield, ShoppingBag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { authApi } from '@/lib/auth-client';
import { formatRub, pluralRu } from '@/lib/format';
import { PaywallModal } from '@/components/paywall/paywall-modal';
import { ContactSupport } from '@/components/profile/contact-support';
import { AlertTriangle } from 'lucide-react';

interface ProfileGeneration {
  id: string;
  resultId: string;
  vacancyTitle: string | null;
  vacancyCompany: string | null;
  kind: string;
  durationMs: number;
  createdAt: string;
}

interface ProfileTransaction {
  id: string;
  packageId: string;
  credits: number;
  amountRub: number;
  status: string;
  createdAt: string;
}

interface ProfileData {
  user:
    | {
        id: string;
        email: string;
        displayName: string | null;
        isAdmin: boolean;
        isBlocked?: boolean;
        isSuspicious?: boolean;
      }
    | null;
  credits: number;
  generations: ProfileGeneration[];
  transactions: ProfileTransaction[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        setData((await res.json()) as ProfileData);
      } catch {
        toast.error('Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Success toast after a successful YooKassa redirect back into the cabinet.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('paid') !== '1') return;
    toast.success('Оплата прошла успешно — кредиты зачислены');
    url.searchParams.delete('paid');
    window.history.replaceState({}, '', url.toString());
  }, []);

  async function logout() {
    try {
      await authApi.logout();
      toast.success('Вы вышли');
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Не получилось выйти');
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            {data.user?.displayName || data.user?.email?.split('@')[0] || 'Ваш профиль'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.user?.email ?? 'Анонимная сессия — зарегистрируйтесь, чтобы сохранить историю'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/#adapt">
              <Sparkles className="size-4" />
              Новый отклик
            </Link>
          </Button>
          {data.user?.isAdmin && (
            <Button variant="outline" asChild>
              <Link href="/admin">
                <Shield className="size-4" />
                Админка
              </Link>
            </Button>
          )}
          <ContactSupport
            defaultName={data.user?.displayName ?? ''}
            defaultEmail={data.user?.email ?? ''}
          />
          {data.user ? (
            <Button variant="ghost" onClick={logout}>
              <LogOut className="size-4" />
              Выйти
            </Button>
          ) : (
            <Button asChild>
              <Link href="/register">Регистрация</Link>
            </Button>
          )}
        </div>
      </header>

      {data.user?.isSuspicious && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold text-amber-500">Замечена подозрительная активность</p>
            <p className="mt-1 text-foreground/90">
              С вашего IP ранее уже регистрировался аккаунт. Бонусные кредиты не начислены.
              Если это ошибка — напишите в поддержку:{' '}
              <a
                href="mailto:makklavin@gmail.com"
                className="font-semibold text-amber-500 underline"
              >
                makklavin@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-2">
          <CardContent className="flex items-center gap-4 p-6">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
              <Coins className="size-6" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Баланс кредитов
              </p>
              <p className="font-display text-3xl font-bold">
                {data.credits}{' '}
                <span className="text-base font-medium text-muted-foreground">
                  {pluralRu(data.credits, ['отклик', 'отклика', 'откликов'])}
                </span>
              </p>
            </div>
            <PaywallModal
              trigger={
                <Button variant={data.credits === 0 ? 'primary' : 'outline'}>
                  <Sparkles className="size-4" />
                  Пополнить
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Откликов сделано
            </p>
            <p className="font-display text-3xl font-bold">{data.generations.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <FileText className="size-5 text-primary" />
              История откликов
            </h2>
            <Badge variant="muted">последние {data.generations.length}</Badge>
          </div>
          {data.generations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Отклики пока не создавались.{' '}
              <Link href="/" className="font-semibold text-primary hover:underline">
                Сделать первый →
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.generations.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {g.vacancyTitle || 'Вакансия'}
                      {g.vacancyCompany ? (
                        <span className="text-muted-foreground"> · {g.vacancyCompany}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(g.createdAt).toLocaleString('ru-RU', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}{' '}
                      · {Math.round(g.durationMs / 100) / 10}с ·{' '}
                      <Badge variant={g.kind === 'full' ? 'success' : 'muted'}>
                        {g.kind === 'full' ? 'полный' : 'превью'}
                      </Badge>
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/result/${g.resultId}`}>Открыть</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <ShoppingBag className="size-5 text-primary" />
              Платежи
            </h2>
            <Badge variant="muted">{data.transactions.length}</Badge>
          </div>
          {data.transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Оплат пока нет.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {t.packageId === 'pack_10'
                        ? 'Стандарт — 10 откликов'
                        : t.packageId === 'pack_25'
                          ? 'Профи — 25 откликов'
                          : t.packageId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString('ru-RU', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatRub(t.amountRub)}</p>
                    <Badge variant={t.status === 'succeeded' ? 'success' : 'muted'}>
                      {t.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
