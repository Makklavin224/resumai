'use client';

import { CheckCircle2, Megaphone, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Match } from '@resumai/shared';

export function MatchRow({ match }: { match: Match }) {
  return (
    <li className="rounded-lg bg-[color:var(--success)]/6 px-3 py-2.5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{match.title}</span>
            <Badge variant="success">{match.score}% match</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{match.detail}</p>
          {match.howToHighlight && (
            <p className="flex items-start gap-1.5 text-xs text-foreground/80">
              <Megaphone className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                <span className="font-semibold">В первой строке отклика:</span>{' '}
                {match.howToHighlight}
              </span>
            </p>
          )}
          {match.leverage && (
            <p className="flex items-start gap-1.5 text-xs text-foreground/80">
              <Zap className="mt-0.5 size-3.5 shrink-0 text-[color:var(--success)]" />
              <span>
                <span className="font-semibold">Как усилить:</span> {match.leverage}
              </span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
