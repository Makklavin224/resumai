'use client';

import { useState } from 'react';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatRub, pluralRu } from '@/lib/format';
import { CREDIT_PACKAGES } from '@resumai/shared';
import { api, ApiClientError } from '@/lib/api-client';

interface Props {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

const PAID_PACKAGES = CREDIT_PACKAGES.filter((p) => p.priceRub > 0);

const FEATURES = [
  'Полный текст адаптированного резюме',
  'Персонализированное сопроводительное письмо',
  'Анализ ключевых навыков вакансии',
  'Советы по прохождению интервью',
];

export function PaywallModal({ trigger, defaultOpen }: Props) {
  const [selected, setSelected] = useState(PAID_PACKAGES[0]?.id ?? 'pack_10');
  const [loading, setLoading] = useState(false);

  async function onPay() {
    setLoading(true);
    try {
      const { confirmationUrl } = await api.createPayment(selected);
      window.location.assign(confirmationUrl);
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error('Не получилось открыть оплату. Попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog defaultOpen={defaultOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle className="text-center">Ваш отклик почти готов</DialogTitle>
          <DialogDescription className="text-center">
            Разблокируйте полный текст резюме и сопроводительное письмо. Без подписок —
            оплачиваете только отклики, которые используете.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {PAID_PACKAGES.map((pkg) => {
            const isSelected = pkg.id === selected;
            const perLetter = Math.round(pkg.priceRub / pkg.credits);
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelected(pkg.id)}
                className={cn(
                  'relative rounded-2xl border p-5 text-left transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-[var(--shadow-glow-primary)]'
                    : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40',
                )}
              >
                {pkg.badge && (
                  <Badge
                    variant="accent"
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    {pkg.badge}
                  </Badge>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {pkg.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold">
                  {pkg.credits}{' '}
                  <span className="text-sm font-medium text-muted-foreground">
                    {pluralRu(pkg.credits, ['отклик', 'отклика', 'откликов'])}
                  </span>
                </p>
                <p className="mt-3 font-display text-xl font-semibold text-primary">
                  {formatRub(pkg.priceRub)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatRub(perLetter)} за отклик
                </p>
              </button>
            );
          })}
        </div>

        <ul className="grid gap-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[color:var(--success)]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Button size="lg" onClick={onPay} disabled={loading} className="w-full">
          <Lock className="size-4" />
          {loading ? 'Открываем YooKassa…' : 'Оплатить и разблокировать'}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="rounded border border-border px-2 py-0.5 font-semibold">VISA</span>
          <span className="rounded border border-border px-2 py-0.5 font-semibold">
            MasterCard
          </span>
          <span className="rounded border border-border px-2 py-0.5 font-semibold">МИР</span>
          <span className="rounded border border-border px-2 py-0.5 font-semibold">СБП</span>
          <span>Оплата через защищённый шлюз YooKassa</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
