'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PromptPayload {
  current: string;
  isCustom: boolean;
  default: string;
}

interface CreditPackageDto {
  id: string;
  label: string;
  credits: number;
  priceRub: number;
  badge?: string | null;
  popular?: boolean;
}

interface SettingsPayload {
  prompts: { analyst: PromptPayload; writer: PromptPayload };
  openai: {
    isOverridden: boolean;
    activeKeyMask: string | null;
    source: 'db' | 'env';
    proxyUrl: string;
    proxySource: 'db' | 'env' | 'none';
  };
  yookassa: {
    shopId: string;
    shopIdSource: 'db' | 'env' | 'none';
    secretKeyMask: string | null;
    secretSource: 'db' | 'env' | 'none';
    webhookSet: boolean;
    webhookSource: 'db' | 'env' | 'none';
  };
  pricing: {
    packages: CreditPackageDto[];
    overrides: Record<string, Partial<CreditPackageDto>>;
  };
  telegram: {
    botUsername: string;
    adminChatId: string;
    tokenSet: boolean;
  };
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

function sourceBadge(source: 'db' | 'env' | 'none') {
  if (source === 'db') return <Badge variant="primary">override (БД)</Badge>;
  if (source === 'env') return <Badge variant="muted">.env</Badge>;
  return <Badge variant="destructive">не задано</Badge>;
}

export function AdminSettingsSection() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [analyst, setAnalyst] = useState('');
  const [writer, setWriter] = useState('');
  const [newKey, setNewKey] = useState('');
  const [proxy, setProxy] = useState('');
  const [ykShopId, setYkShopId] = useState('');
  const [ykSecret, setYkSecret] = useState('');
  const [ykWebhook, setYkWebhook] = useState('');
  const [pricingEdits, setPricingEdits] = useState<Record<string, { priceRub: string; credits: string }>>({});
  const [tgChatId, setTgChatId] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  async function refresh() {
    const d = await http<SettingsPayload>('/api/admin/settings');
    setData(d);
    setAnalyst(d.prompts.analyst.current);
    setWriter(d.prompts.writer.current);
    setProxy(d.openai.proxyUrl ?? '');
    setYkShopId(d.yookassa.shopId ?? '');
    setTgChatId(d.telegram.adminChatId ?? '');
    const init: Record<string, { priceRub: string; credits: string }> = {};
    for (const p of d.pricing.packages) {
      init[p.id] = { priceRub: String(p.priceRub), credits: String(p.credits) };
    }
    setPricingEdits(init);
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  async function savePrompt(kind: 'analyst' | 'writer') {
    setSaving(kind);
    try {
      const body: Record<string, string> = {};
      body[kind] = kind === 'analyst' ? analyst : writer;
      await http('/api/admin/settings/prompts', { method: 'POST', body: JSON.stringify(body) });
      toast.success(kind === 'analyst' ? 'Промпт аналитика обновлён' : 'Промпт writer обновлён');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  async function resetPrompt(kind: 'analyst' | 'writer') {
    setSaving(kind);
    try {
      const body: Record<string, string> = {};
      body[kind] = '';
      await http('/api/admin/settings/prompts', { method: 'POST', body: JSON.stringify(body) });
      toast.success('Сброшено на дефолт');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  async function saveKey() {
    setSaving('key');
    try {
      await http('/api/admin/settings/openai-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: newKey.trim() }),
      });
      toast.success('OpenAI ключ сохранён');
      setNewKey('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  async function clearKey() {
    setSaving('key');
    try {
      await http('/api/admin/settings/openai-key', {
        method: 'POST',
        body: JSON.stringify({ apiKey: '' }),
      });
      toast.success('Override очищен, используется ключ из .env');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  async function saveProxy() {
    setSaving('proxy');
    try {
      await http('/api/admin/settings/openai-proxy', {
        method: 'POST',
        body: JSON.stringify({ url: proxy.trim() }),
      });
      toast.success(proxy.trim() ? 'Прокси сохранён' : 'Override очищен');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  async function saveYooKassa() {
    setSaving('yookassa');
    try {
      const body: Record<string, string> = {};
      if (ykShopId !== data?.yookassa.shopId) body.shopId = ykShopId.trim();
      if (ykSecret.trim().length > 0) body.secretKey = ykSecret.trim();
      if (ykWebhook.trim().length > 0) body.webhookSecret = ykWebhook.trim();
      if (Object.keys(body).length === 0) {
        toast.info('Нечего сохранять');
        return;
      }
      await http('/api/admin/settings/yookassa', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      toast.success('YooKassa обновлена');
      setYkSecret('');
      setYkWebhook('');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  async function saveTgChat() {
    setSaving('tg');
    try {
      await http('/api/admin/settings/telegram-chat-id', {
        method: 'POST',
        body: JSON.stringify({ chatId: tgChatId.trim() }),
      });
      toast.success(tgChatId.trim() ? 'Chat ID сохранён' : 'Chat ID очищен');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  async function detectTgChat() {
    setSaving('tg');
    try {
      const res = await http<{ chatId: string; username?: string | null; firstName?: string | null }>(
        '/api/admin/settings/telegram-chat-id/detect',
        { method: 'POST', body: JSON.stringify({}) },
      );
      setTgChatId(res.chatId);
      toast.success(`Найден chat_id ${res.chatId}${res.username ? ' (@' + res.username + ')' : ''}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось определить');
    } finally {
      setSaving(null);
    }
  }

  async function savePricing() {
    setSaving('pricing');
    try {
      const overrides: Record<string, { priceRub?: number; credits?: number }> = {};
      for (const [id, edit] of Object.entries(pricingEdits)) {
        const price = Number(edit.priceRub);
        const credits = Number(edit.credits);
        const original = data?.pricing.packages.find((p) => p.id === id);
        if (!original) continue;
        const diff: { priceRub?: number; credits?: number } = {};
        if (Number.isFinite(price) && price !== original.priceRub) diff.priceRub = price;
        if (Number.isFinite(credits) && credits !== original.credits) diff.credits = credits;
        if (Object.keys(diff).length > 0) overrides[id] = diff;
      }
      await http('/api/admin/settings/pricing', {
        method: 'POST',
        body: JSON.stringify({ overrides }),
      });
      toast.success('Цены обновлены');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(null);
    }
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">Загружаем настройки…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* OpenAI key */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">OpenAI API key</h3>
            {sourceBadge(data.openai.source)}
          </div>
          <p className="text-xs text-muted-foreground">
            Активный ключ: <span className="font-mono">{data.openai.activeKeyMask ?? '—'}</span>.
            Новый ключ заменит .env и применится к ближайшей генерации.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              placeholder="sk-..."
              autoComplete="off"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <Button onClick={saveKey} disabled={saving === 'key' || newKey.trim().length === 0}>
              {saving === 'key' ? 'Сохраняем…' : 'Сохранить'}
            </Button>
            {data.openai.isOverridden && (
              <Button variant="outline" onClick={clearKey} disabled={saving === 'key'}>
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OpenAI proxy */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">OpenAI proxy</h3>
            {sourceBadge(data.openai.proxySource)}
          </div>
          <p className="text-xs text-muted-foreground">
            Формат: <code>http://user:pass@host:port</code>. Пусто — без прокси.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="http://user:pass@138.249.91.183:64030"
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <Button onClick={saveProxy} disabled={saving === 'proxy'}>
              {saving === 'proxy' ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* YooKassa */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">YooKassa</h3>
            <div className="flex gap-1">
              {sourceBadge(data.yookassa.shopIdSource)}
              {sourceBadge(data.yookassa.secretSource)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Shop ID:{' '}
            <span className="font-mono">{data.yookassa.shopId || '—'}</span>. Secret:{' '}
            <span className="font-mono">{data.yookassa.secretKeyMask ?? '—'}</span>. Webhook{' '}
            {data.yookassa.webhookSet ? '✓ настроен' : '— не настроен'}.
          </p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Shop ID"
              value={ykShopId}
              onChange={(e) => setYkShopId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <input
              type="password"
              placeholder="Новый Secret key (оставьте пустым, чтобы не менять)"
              autoComplete="off"
              value={ykSecret}
              onChange={(e) => setYkSecret(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <input
              type="password"
              placeholder="Новый Webhook secret (оставьте пустым, чтобы не менять)"
              autoComplete="off"
              value={ykWebhook}
              onChange={(e) => setYkWebhook(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <Button onClick={saveYooKassa} disabled={saving === 'yookassa'}>
              {saving === 'yookassa' ? 'Сохраняем…' : 'Сохранить YooKassa'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Telegram admin chat id */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Telegram — чат админа</h3>
            {data.telegram.adminChatId ? (
              <Badge variant="primary">настроен</Badge>
            ) : (
              <Badge variant="muted">не настроен</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Сюда бот <span className="font-mono">@{data.telegram.botUsername || '…'}</span>{' '}
            пришлёт уведомления о новых тикетах поддержки. Откройте диалог с ботом и отправьте ему{' '}
            <span className="font-mono">/start</span>, затем нажмите «Определить автоматически» —
            мы вытянем ваш chat_id через getUpdates.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="например 123456789"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
            <Button onClick={saveTgChat} disabled={saving === 'tg'}>
              {saving === 'tg' ? '…' : 'Сохранить'}
            </Button>
            <Button variant="outline" onClick={detectTgChat} disabled={saving === 'tg'}>
              Определить автоматически
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-display text-base font-semibold">Пакеты и цены</h3>
          <p className="text-xs text-muted-foreground">
            Изменения применяются сразу на главной и при оплате. Бесплатный пакет «trial» скрыт
            на landing при цене 0.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Название</th>
                  <th className="px-3 py-2">Кредитов</th>
                  <th className="px-3 py-2">Цена, ₽</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.pricing.packages.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                    <td className="px-3 py-2">{p.label}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={pricingEdits[p.id]?.credits ?? String(p.credits)}
                        onChange={(e) =>
                          setPricingEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              priceRub: prev[p.id]?.priceRub ?? String(p.priceRub),
                              credits: e.target.value,
                            },
                          }))
                        }
                        className="w-24 rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={pricingEdits[p.id]?.priceRub ?? String(p.priceRub)}
                        onChange={(e) =>
                          setPricingEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              credits: prev[p.id]?.credits ?? String(p.credits),
                              priceRub: e.target.value,
                            },
                          }))
                        }
                        className="w-28 rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={savePricing} disabled={saving === 'pricing'}>
            {saving === 'pricing' ? 'Сохраняем…' : 'Сохранить цены'}
          </Button>
        </CardContent>
      </Card>

      {/* Prompts */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Промпт аналитика</h3>
            <Badge variant={data.prompts.analyst.isCustom ? 'primary' : 'muted'}>
              {data.prompts.analyst.isCustom ? 'кастомный' : 'по дефолту'}
            </Badge>
          </div>
          <textarea
            value={analyst}
            onChange={(e) => setAnalyst(e.target.value)}
            className="h-64 w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => savePrompt('analyst')} disabled={saving === 'analyst' || analyst.trim().length === 0}>
              {saving === 'analyst' ? 'Сохраняем…' : 'Сохранить аналитика'}
            </Button>
            {data.prompts.analyst.isCustom && (
              <Button variant="outline" onClick={() => resetPrompt('analyst')} disabled={saving === 'analyst'}>
                Вернуть дефолт
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Промпт сопроводительного</h3>
            <Badge variant={data.prompts.writer.isCustom ? 'primary' : 'muted'}>
              {data.prompts.writer.isCustom ? 'кастомный' : 'по дефолту'}
            </Badge>
          </div>
          <textarea
            value={writer}
            onChange={(e) => setWriter(e.target.value)}
            className="h-64 w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => savePrompt('writer')} disabled={saving === 'writer' || writer.trim().length === 0}>
              {saving === 'writer' ? 'Сохраняем…' : 'Сохранить writer'}
            </Button>
            {data.prompts.writer.isCustom && (
              <Button variant="outline" onClick={() => resetPrompt('writer')} disabled={saving === 'writer'}>
                Вернуть дефолт
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
