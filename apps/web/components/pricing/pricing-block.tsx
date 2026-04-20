'use client';

import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatRub, pluralRu } from '@/lib/format';
import { CREDIT_PACKAGES } from '@resumai/shared';

interface Tier {
  id: string;
  label: string;
  credits: number;
  priceRub: number;
  hint: string;
  badge?: string;
  popular?: boolean;
  features: string[];
}

const PAID = CREDIT_PACKAGES.filter((p) => p.priceRub > 0);
const SINGLE = PAID.find((p) => p.id === 'pack_10');
const BULK = PAID.find((p) => p.id === 'pack_25');

const TIERS: Tier[] = [
  {
    id: 'trial',
    label: 'Триал',
    credits: 1,
    priceRub: 0,
    hint: 'Для первого отклика',
    features: [
      'Адаптация 1 резюме под 1 вакансию',
      'Полный отчёт: 3 правки + 3 совпадения',
      'Персональное сопроводительное',
      'Без регистрации',
    ],
  },
  {
    id: SINGLE?.id ?? 'pack_10',
    label: SINGLE?.label ?? 'Стандарт',
    credits: SINGLE?.credits ?? 10,
    priceRub: SINGLE?.priceRub ?? 490,
    hint: '49 ₽ за отклик',
    badge: 'ХИТ',
    popular: true,
    features: [
      '10 адаптаций резюме под разные вакансии',
      'PDF, DOCX и ссылки hh.ru',
      'История откликов в профиле',
      'Экспорт в .txt и копирование',
    ],
  },
  {
    id: BULK?.id ?? 'pack_25',
    label: BULK?.label ?? 'Профи',
    credits: BULK?.credits ?? 25,
    priceRub: BULK?.priceRub ?? 990,
    hint: '39 ₽ за отклик',
    features: [
      '25 адаптаций — хватит на месяц активного поиска',
      'Всё из «Стандарт»',
      'Приоритетная поддержка в чате',
      'Советы по прохождению интервью',
    ],
  },
];

export function PricingBlock() {
  return (
    <div>
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Цены</p>
        <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
          Платите за отклики, а не за подписки
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Без автосписаний и скрытых тарифов. Кредиты не сгорают, пока есть сессия. Оплата через
          YooKassa — VISA, МИР, СБП, Mastercard.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {TIERS.map((t) => (
          <Card
            key={t.id}
            className={cn(
              'relative overflow-hidden',
              t.popular && 'border-primary ring-1 ring-primary/30 shadow-[var(--shadow-glow-primary)]',
            )}
          >
            {t.badge && (
              <Badge
                variant="accent"
                className="absolute left-1/2 top-0 -translate-x-1/2 translate-y-[-50%]"
              >
                {t.badge}
              </Badge>
            )}
            <CardContent className="flex flex-col gap-5 p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">
                    {t.priceRub === 0 ? 'Бесплатно' : formatRub(t.priceRub)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.credits} {pluralRu(t.credits, ['отклик', 'отклика', 'откликов'])} · {t.hint}
                </p>
              </div>

              <ul className="space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                size="lg"
                variant={t.popular ? 'primary' : 'outline'}
                className="w-full"
              >
                <Link href="#adapt">
                  {t.priceRub === 0 ? (
                    <>
                      <Sparkles className="size-4" />
                      Попробовать сейчас
                    </>
                  ) : (
                    'Выбрать тариф'
                  )}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Оплачивая, вы принимаете{' '}
        <Link href="/legal/terms" className="underline hover:text-foreground">
          оферту
        </Link>{' '}
        и{' '}
        <Link href="/legal/privacy" className="underline hover:text-foreground">
          политику конфиденциальности
        </Link>
        . Чек приходит на вашу почту. Возврат — по статье 32 Закона «О защите прав потребителей».
      </p>
    </div>
  );
}
