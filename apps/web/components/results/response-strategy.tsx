'use client';

import { Shield, Swords, Rocket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ResponseStrategy as StrategyType, StrategyKey } from '@resumai/shared';

const META: Record<
  StrategyKey,
  { label: string; icon: typeof Shield; tint: string }
> = {
  safe: { label: 'Осторожно', icon: Shield, tint: 'muted' },
  bold: { label: 'Уверенно', icon: Swords, tint: 'primary' },
  stretch: { label: 'На вырост', icon: Rocket, tint: 'success' },
};

export function ResponseStrategySection({
  strategies,
}: {
  strategies: Record<StrategyKey, StrategyType>;
}) {
  const order: StrategyKey[] = ['safe', 'bold', 'stretch'];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {order.map((key) => {
        const s = strategies[key];
        if (!s) return null;
        const { label, icon: Icon, tint } = META[key];
        return (
          <Card key={key}>
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4" />
                  {label}
                </span>
                <Badge
                  variant={
                    tint === 'success' ? 'success' : tint === 'primary' ? 'primary' : 'muted'
                  }
                >
                  {s.interviewProbability}% интервью
                </Badge>
              </div>
              <p className="text-sm">{s.description}</p>
              <p className="mt-auto text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Когда выбирать:</span>{' '}
                {s.whenToUse}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
