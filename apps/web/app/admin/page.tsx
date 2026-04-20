'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRub } from '@/lib/format';

interface Stats {
  userCount: number;
  sessionCount: number;
  txCount: number;
  txRevenue: number;
  genCount: number;
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: string;
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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [generations, setGenerations] = useState<AdminGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, u, t, g] = await Promise.all([
          get<Stats>('/api/admin/stats'),
          get<AdminUser[]>('/api/admin/users'),
          get<AdminTransaction[]>('/api/admin/transactions'),
          get<AdminGeneration[]>('/api/admin/generations'),
        ]);
        setStats(s);
        setUsers(u);
        setTransactions(t);
        setGenerations(g);
      } catch (err) {
        if (err instanceof Error && err.message === 'HTTP 403') {
          setForbidden(true);
        } else {
          toast.error('Не удалось загрузить админку');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (forbidden) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-display text-3xl font-bold">Только для администраторов</h1>
        <p className="text-sm text-muted-foreground">
          Если вы думаете, что это ошибка — попросите владельца выдать вам роль в БД.
        </p>
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
          Статистика по Постгресу. Данные генераций — в Redis (TTL 1 час).
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
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
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Имя</th>
                    <th className="px-4 py-2">Роль</th>
                    <th className="px-4 py-2">Зарегистрирован</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-2 font-medium">{u.email}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {u.displayName ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        {u.isAdmin ? <Badge variant="primary">admin</Badge> : <Badge variant="muted">user</Badge>}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleString('ru-RU')}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {generations.map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-2 max-w-xs truncate">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
