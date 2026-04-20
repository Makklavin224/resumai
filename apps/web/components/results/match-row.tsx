'use client';

import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Match } from '@resumai/shared';

export function MatchRow({ match }: { match: Match }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-[color:var(--success)]/6 px-3 py-2">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">{match.title}</span>
          <Badge variant="success">{match.score}% match</Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{match.detail}</p>
      </div>
    </li>
  );
}
