'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { Signal, SignalType } from '@resumai/shared';

const TYPE_LABEL: Record<SignalType, string> = {
  must_have: 'необходимо',
  should_have: 'желательно',
  nice_to_have: 'плюс',
};

const TYPE_VARIANT: Record<SignalType, 'destructive' | 'primary' | 'muted'> = {
  must_have: 'destructive',
  should_have: 'primary',
  nice_to_have: 'muted',
};

function typeLabel(t: SignalType | undefined): string {
  return TYPE_LABEL[t as SignalType] ?? 'сигнал';
}

function typeVariant(t: SignalType | undefined) {
  return TYPE_VARIANT[t as SignalType] ?? 'muted';
}

function barTone(coverage: number): string {
  if (coverage >= 70) return 'bg-[color:var(--success)]';
  if (coverage >= 40) return 'bg-primary';
  return 'bg-destructive';
}

export function SignalsCoverage({ signals }: { signals: Signal[] }) {
  if (!signals.length) return null;
  // Show must_have first, then should_have, then nice_to_have.
  const order: Record<SignalType, number> = { must_have: 0, should_have: 1, nice_to_have: 2 };
  const sorted = [...signals].sort((a, b) => {
    const t = (order[a.type] ?? 9) - (order[b.type] ?? 9);
    if (t !== 0) return t;
    return a.coverage - b.coverage;
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        {sorted.map((s, i) => {
          const pct = Math.max(0, Math.min(100, Math.round(s.coverage)));
          return (
            <div key={i} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={typeVariant(s.type)}>{typeLabel(s.type)}</Badge>
                  <span className="font-medium">{s.keyword}</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full transition-all', barTone(pct))}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
