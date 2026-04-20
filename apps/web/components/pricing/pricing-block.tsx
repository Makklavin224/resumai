'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Check, Gift, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatRub, pluralRu } from '@/lib/format';
import { CREDIT_PACKAGES, SIGNUP_BONUS_CREDITS } from '@resumai/shared';

const PAID = CREDIT_PACKAGES.filter((p) => p.priceRub > 0);

export function PricingBlock() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 text-center"
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Платите за отклики, а не за подписки
        </h2>
        <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Badge variant="success" className="gap-1.5 px-3 py-1">
            <Gift className="size-3.5" />1 отклик бесплатно
          </Badge>
          <Badge variant="primary" className="gap-1.5 px-3 py-1">
            <Sparkles className="size-3.5" />+{SIGNUP_BONUS_CREDITS} бонусных за регистрацию
          </Badge>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PAID.map((p, i) => {
          const perCredit = Math.round((p.priceRub / p.credits) * 10) / 10;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card
                className={cn(
                  'relative h-full overflow-visible',
                  p.popular &&
                    'border-primary shadow-[var(--shadow-glow-primary)] ring-1 ring-primary/30',
                )}
              >
                {p.badge && (
                  <Badge
                    variant="accent"
                    className="absolute left-1/2 top-0 -translate-x-1/2 translate-y-[-50%]"
                  >
                    {p.badge}
                  </Badge>
                )}
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {p.label}
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                      {formatRub(p.priceRub)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.credits}{' '}
                      {pluralRu(p.credits, ['отклик', 'отклика', 'откликов'])} · от{' '}
                      {formatRub(perCredit)} за отклик
                    </p>
                  </div>

                  <ul className="flex-1 space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                      <span>Полный отчёт: 3 правки + 3 совпадения</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                      <span>Сопроводительное под каждую вакансию</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                      <span>История в профиле и экспорт в .txt</span>
                    </li>
                    {p.credits >= 50 && (
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                        <span>Приоритетная поддержка в чате</span>
                      </li>
                    )}
                  </ul>

                  <Button
                    asChild
                    size="lg"
                    variant={p.popular ? 'primary' : 'outline'}
                    className="w-full"
                  >
                    <Link href="#adapt">Купить</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
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
        .
      </p>
    </div>
  );
}
