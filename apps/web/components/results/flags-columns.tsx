'use client';

import { Flag, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function FlagsColumns({
  redFlags = [],
  greenFlags = [],
}: {
  redFlags?: string[];
  greenFlags?: string[];
}) {
  if (redFlags.length === 0 && greenFlags.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-destructive/25">
        <CardContent className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-destructive">
            <Flag className="size-4" />
            Красные флаги
          </h3>
          {redFlags.length ? (
            <ul className="space-y-1.5 text-sm">
              {redFlags.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-destructive/70" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Не найдено — хороший знак.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-[color:var(--success)]/25">
        <CardContent className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[color:var(--success)]">
            <Sparkles className="size-4" />
            Зелёные флаги
          </h3>
          {greenFlags.length ? (
            <ul className="space-y-1.5 text-sm">
              {greenFlags.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-[color:var(--success)]"
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Нужно усилить — см. рекомендации.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
