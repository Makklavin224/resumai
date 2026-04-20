'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Inline support form rendered from the cabinet. Opens a modal with
 * required name/email/body inputs, POSTs to /api/support/contact.
 * Backend stores the message in DB and (if configured) pings the admin
 * Telegram channel.
 */
export function ContactSupport({
  defaultName = '',
  defaultEmail = '',
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || body.trim().length < 10) {
      toast.error('Заполните имя, email и сообщение не короче 10 символов');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), body: body.trim() }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(p.error || 'Не удалось отправить');
      }
      toast.success('Сообщение отправлено — ответим на указанный email');
      setBody('');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <LifeBuoy className="size-4" />
        Написать в поддержку
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !sending && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-elevated)]"
          >
            <header>
              <h3 className="font-display text-xl font-semibold">Написать в поддержку</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Ответ придёт на указанный email обычно в течение рабочего дня.
              </p>
            </header>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Имя
              </span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Сообщение
              </span>
              <textarea
                required
                minLength={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-32 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Опишите вопрос подробнее"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={sending}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? 'Отправляем…' : 'Отправить'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
