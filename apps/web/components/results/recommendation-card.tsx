'use client';

import { motion } from 'motion/react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Gap, Priority, ImpactLayer, GapCategory } from '@resumai/shared';

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'высокий',
  medium: 'средний',
  low: 'низкий',
};

const LAYER_LABEL: Record<ImpactLayer, string> = {
  ats: 'для ATS',
  recruiter: 'для рекрутёра',
  hiring_manager: 'для руководителя',
};

const CATEGORY_LABEL: Record<GapCategory, string> = {
  positioning: 'позиционирование',
  achievements: 'результаты',
  skills: 'навыки',
  industry: 'отрасль',
  format: 'формат',
  credibility: 'доверие',
  ats: 'ATS',
  risk: 'риск',
  code_word: 'кодовое слово',
};

function priorityVariant(p?: Priority): 'primary' | 'muted' | 'destructive' {
  if (p === 'high') return 'destructive';
  if (p === 'medium') return 'primary';
  return 'muted';
}

export function RecommendationCard({ gap, index }: { gap: Gap; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card>
        <CardContent className="flex gap-4 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
            <Lightbulb className="size-5" />
          </span>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {gap.priority && (
                <Badge variant={priorityVariant(gap.priority)}>
                  {PRIORITY_LABEL[gap.priority]}
                </Badge>
              )}
              {gap.impactLayer && (
                <Badge variant="muted">{LAYER_LABEL[gap.impactLayer]}</Badge>
              )}
              {gap.category && (
                <Badge variant="outline">{CATEGORY_LABEL[gap.category]}</Badge>
              )}
            </div>

            <h3 className="font-display text-base font-semibold">{gap.title}</h3>
            <p className="text-sm text-muted-foreground">{gap.rationale}</p>

            {gap.beforeAfter ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                    Было
                  </p>
                  <p className="text-sm leading-relaxed">{gap.beforeAfter.before}</p>
                </div>
                <div
                  aria-hidden
                  className="hidden items-center justify-center text-muted-foreground sm:flex"
                >
                  <ArrowRight className="size-4" />
                </div>
                <div className="rounded-lg border border-[color:var(--success)]/25 bg-[color:var(--success)]/5 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--success)]">
                    Стало
                  </p>
                  <p className="text-sm leading-relaxed">{gap.beforeAfter.after}</p>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm font-medium">
                Добавьте: {gap.suggestedBullet}
              </p>
            )}

            {gap.howToApply && (
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Куда вставить:</span> {gap.howToApply}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
