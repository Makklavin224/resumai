'use client';

import { Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { GenerateStep } from '@resumai/shared';

const ORDER: GenerateStep[] = [
  'parsing-vacancy',
  'parsing-resume',
  'matching',
  'writing-letter',
  'done',
];

const LABELS: Record<GenerateStep, string> = {
  queued: 'Встали в очередь',
  'parsing-vacancy': 'Читаем вакансию',
  'parsing-resume': 'Разбираем ваше резюме',
  matching: 'Сверяем совпадения',
  'writing-letter': 'Пишем сопроводительное',
  done: 'Готово!',
  error: 'Ошибка генерации',
};

interface Props {
  current: GenerateStep;
}

export function GenerateSteps({ current }: Props) {
  const currentIdx = ORDER.indexOf(current);

  return (
    <ol className="space-y-3">
      {ORDER.slice(0, -1).map((step, i) => {
        const done = currentIdx > i || current === 'done';
        const active = currentIdx === i && current !== 'done';
        return (
          <motion.li
            key={step}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: 'easeOut' }}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3 backdrop-blur',
              active && 'border-primary bg-primary/6 shadow-[var(--shadow-soft)]',
              done && 'border-[color:var(--success)]/40 bg-[color:var(--success)]/6',
            )}
          >
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full text-xs font-semibold',
                done && 'bg-[color:var(--success)] text-[color:var(--primary-foreground)]',
                active && 'bg-primary/15 text-primary',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
              aria-hidden
            >
              {done ? (
                <Check className="size-4" />
              ) : active ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {LABELS[step]}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
