'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatRub } from '@/lib/format';
import { AdminSettingsSection } from '@/components/admin/settings-section';

interface Stats {
  userCount: number;
  sessionCount: number;
  txCount: number;
  txRevenue: number;
  genCount: number;
  blockedCount: number;
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  isBlocked: boolean;
  provider: string | null;
  createdAt: string;
  credits: number;
  sessionCount: number;
}

interface AdminTransaction {
  id: string;
  sessionId: string;
  userId: string | null;
  packageId: string;
  credits: number;
  amountRub: number;
  status: string;
  createdAt: string;
}

interface AdminGeneration {
  id: string;
  sessionId: string;
  userId: string | null;
  resultId: string;
  vacancyTitle: string | null;
  vacancyCompany: string | null;
  kind: string;
  model: string;
  durationMs: number;
  createdAt: string;
}

interface GenerationDetail {
  generation: AdminGeneration;
  result: {
    coverLetter?: string;
    gaps?: { title: string; rationale?: string; suggestedBullet?: string }[];
    matches?: { title: string; detail?: string; score?: number }[];
  } | null;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [generations, setGenerations] = useState<AdminGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [openGen, setOpenGen] = useState<GenerationDetail | null>(null);

  async function refresh() {
    const [s, u, t, g] = await Promise.all([
      http<Stats>('/api/admin/stats'),
      http<AdminUser[]>('/api/admin/users'),
      http<AdminTransaction[]>('/api/admin/transactions'),
      http<AdminGeneration[]>('/api/admin/generations'),
    ]);
    setStats(s);
    setUsers(u);
    setTransactions(t);
    setGenerations(g);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (err instanceof Error && err.message.includes('403')) setForbidden(true);
        else toast.error('Не удалось загрузить админку');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function adjustCredits(user: AdminUser, delta: number) {
    setBusyUser(user.id);
    try {
      const res = await http<{ ok: true; credits?: number; warning?: string }>(
        `/api/admin/users/${user.id}/credits`,
        { method: 'POST', body: JSON.stringify({ delta }) },
      );
      if (res.warning) toast.warning(res.warning);
      else
        toast.success(
          delta > 0
            ? `+${delta} → ${user.email} (теперь ${res.credits ?? '—'})`
            : `${delta} → ${user.email} (теперь ${res.credits ?? '—'})`,
        );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyUser(null);
    }
  }

  async function toggleBlock(user: AdminUser) {
    setBusyUser(user.id);
    try {
      await http(`/api/admin/users/${user.id}/block`, {
        method: 'POST',
        body: JSON.stringify({ blocked: !user.isBlocked }),
      });
      toast.success(
        user.isBlocked ? `Разблокирован: ${user.email}` : `Заблокирован: ${user.email}`,
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setBusyUser(null);
    }
  }

  async function openGeneration(g: AdminGeneration) {
    try {
      const res = await http<GenerationDetail>(`/api/admin/generations/${g.id}`);
      setOpenGen(res);
    } catch {
      toast.error('Детали недоступны (кеш мог истечь)');
    }
  }

  if (forbidden) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl font-bold">Только для администраторов</h1>
        <Link href="/" className="font-semibold text-primary hover:underline">
          На главную →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const kpis = [
    { label: 'Пользователи', value: stats?.userCount ?? 0 },
    { label: 'Заблокированы', value: stats?.blockedCount ?? 0 },
    { label: 'Сессии', value: stats?.sessionCount ?? 0 },
    { label: 'Оплат', value: stats?.txCount ?? 0 },
    { label: 'Выручка', value: formatRub(stats?.txRevenue ?? 0) },
    { label: 'Генераций', value: stats?.genCount ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Админка</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Генерации в БД постоянно, их содержимое — в Redis на 1 час.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {k.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Пользователи · {users.length}</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Email / провайдер</th>
                    <th className="px-3 py-2">Имя</th>
                    <th className="px-3 py-2">Кредиты</th>
                    <th className="px-3 py-2">Роль</th>
                    <th className="px-3 py-2">Дата</th>
                    <th className="px-3 py-2">Управление</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const busy = busyUser === u.id;
                    return (
                      <tr key={u.id} className={u.isBlocked ? 'opacity-60' : ''}>
                        <td className="px-3 py-2 font-medium">
                          <div>{u.email}</div>
                          {u.provider && (
                            <div className="text-[10px] uppercase text-muted-foreground">
                              via {u.provider}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{u.displayName ?? '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-base font-semibold">{u.credits}</span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => adjustCredits(u, -1)}
                              >
                                −1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => adjustCredits(u, 1)}
                              >
                                +1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => adjustCredits(u, 10)}
                              >
                                +10
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {u.isAdmin && <Badge variant="primary">admin</Badge>}
                            {u.isBlocked && <Badge variant="destructive">blocked</Badge>}
                            {!u.isAdmin && !u.isBlocked && <Badge variant="muted">user</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant={u.isBlocked ? 'outline' : 'destructive'}
                            disabled={busy}
                            onClick={() => toggleBlock(u)}
                          >
                            {u.isBlocked ? 'Разблок.' : 'Заблок.'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Платежи · {transactions.length}</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Пакет</th>
                    <th className="px-4 py-2">Сумма</th>
                    <th className="px-4 py-2">Статус</th>
                    <th className="px-4 py-2">Сессия</th>
                    <th className="px-4 py-2">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 font-medium">{t.packageId}</td>
                      <td className="px-4 py-2">{formatRub(t.amountRub)}</td>
                      <td className="px-4 py-2">
                        <Badge variant={t.status === 'succeeded' ? 'success' : 'muted'}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {t.sessionId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Настройки</h2>
        <AdminSettingsSection />
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold">Генерации · {generations.length}</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Вакансия</th>
                    <th className="px-4 py-2">Kind</th>
                    <th className="px-4 py-2">Модель</th>
                    <th className="px-4 py-2">Длит.</th>
                    <th className="px-4 py-2">Дата</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {generations.map((g) => (
                    <tr key={g.id}>
                      <td className="max-w-xs truncate px-4 py-2">
                        {g.vacancyTitle ?? '—'}
                        {g.vacancyCompany ? ` · ${g.vacancyCompany}` : ''}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={g.kind === 'full' ? 'success' : 'muted'}>{g.kind}</Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{g.model}</td>
                      <td className="px-4 py-2">{Math.round(g.durationMs / 100) / 10}с</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(g.createdAt).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-2">
                        <Button size="sm" variant="outline" onClick={() => openGeneration(g)}>
                          Открыть
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {openGen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpenGen(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-semibold">
                  {openGen.generation.vacancyTitle ?? 'Без заголовка'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {openGen.generation.vacancyCompany ?? '—'} ·{' '}
                  {new Date(openGen.generation.createdAt).toLocaleString('ru-RU')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenGen(null)}>
                Закрыть
              </Button>
            </header>

            {openGen.result ? (
              <div className="space-y-4 text-sm">
                {openGen.result.matches && openGen.result.matches.length > 0 && (
                  <div>
                    <h4 className="font-semibold">Совпадения</h4>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      {openGen.result.matches.map((m, i) => (
                        <li key={i}>
                          <strong>{m.title}</strong>
                          {typeof m.score === 'number' ? ` · ${m.score}` : ''}
                          {m.detail ? ` — ${m.detail}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {openGen.result.gaps && openGen.result.gaps.length > 0 && (
                  <div>
                    <h4 className="font-semibold">Рекомендации</h4>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      {openGen.result.gaps.map((g, i) => (
                        <li key={i}>
                          <strong>{g.title}</strong>
                          {g.rationale ? ` — ${g.rationale}` : ''}
                          {g.suggestedBullet ? (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {g.suggestedBullet}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {openGen.result.coverLetter && (
                  <div>
                    <h4 className="font-semibold">Сопроводительное</h4>
                    <pre className="mt-1 whitespace-pre-wrap rounded bg-muted/40 p-3 text-sm">
                      {openGen.result.coverLetter}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Содержимое вышло из кеша (Redis TTL 1 час). В БД остались только метаданные.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
