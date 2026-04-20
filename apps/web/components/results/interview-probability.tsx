'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { InterviewProbability as InterviewProbabilityType } from '@resumai/shared';

/**
 * Circle indicator with the interview probability and a 1-sentence
 * explanation of what's dragging the % down.
 */
export function InterviewProbability({
  data,
}: {
  data: InterviewProbabilityType;
}) {
  const value = Math.max(0, Math.min(100, Math.round(data.value)));
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const toneClass =
    value >= 60
      ? 'text-[color:var(--success)]'
      : value >= 35
        ? 'text-primary'
        : 'text-destructive';

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="relative grid size-32 shrink-0 place-items-center">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={radius}
              strokeWidth="8"
              fill="none"
              className="stroke-border"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              stroke="currentColor"
              className={cn(toneClass)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                'font-display font-bold tabular-nums leading-none',
                value === 100 ? 'text-2xl' : 'text-3xl',
              )}
            >
              {value}
              <span className="ml-0.5 text-base font-semibold text-muted-foreground">%</span>
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Шанс пригласить на интервью
          </p>
          <p className={cn('font-display text-xl font-semibold', toneClass)}>
            {value >= 60
              ? 'Высокий — есть что показать'
              : value >= 35
                ? 'Средний — нужна калибровка'
                : 'Низкий — сильная переупаковка'}
          </p>
          <p className="text-sm text-muted-foreground">{data.explanation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
