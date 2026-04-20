'use client';

import { motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Gap } from '@resumai/shared';

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
          <div className="min-w-0 space-y-2">
            <h3 className="font-display text-base font-semibold">{gap.title}</h3>
            <p className="text-sm text-muted-foreground">{gap.rationale}</p>
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm font-medium">
              Добавьте: {gap.suggestedBullet}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
