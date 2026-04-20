'use client';

import { AlertTriangle, ShieldAlert, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { RejectionRisk, RiskSeverity } from '@resumai/shared';

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  critical: 'критичный',
  high: 'высокий',
  medium: 'средний',
};

const SEVERITY_VARIANT: Record<RiskSeverity, 'destructive' | 'primary' | 'muted'> = {
  critical: 'destructive',
  high: 'primary',
  medium: 'muted',
};

function SeverityIcon({ severity }: { severity: RiskSeverity }) {
  if (severity === 'critical') return <ShieldX className="size-4 shrink-0" />;
  if (severity === 'high') return <ShieldAlert className="size-4 shrink-0" />;
  return <AlertTriangle className="size-4 shrink-0" />;
}

export function RisksList({ risks }: { risks: RejectionRisk[] }) {
  if (!risks.length) return null;
  return (
    <div className="space-y-2.5">
      {risks.map((r, i) => (
        <Card key={i} className="border-destructive/20">
          <CardContent className="flex gap-3 p-4">
            <span className="mt-0.5 text-destructive">
              <SeverityIcon severity={r.severity} />
            </span>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{r.risk}</p>
                <Badge variant={SEVERITY_VARIANT[r.severity]}>
                  {SEVERITY_LABEL[r.severity]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Как закрыть:</span>{' '}
                {r.mitigation}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
