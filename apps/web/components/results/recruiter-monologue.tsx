'use client';

import { Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * The virality section. Large pull-quote of what the recruiter would think
 * silently while opening this resume for this vacancy.
 */
export function RecruiterMonologue({ text }: { text: string }) {
  return (
    <Card className="relative overflow-hidden border-primary/25 bg-primary/5">
      <CardContent className="flex gap-4 p-6 sm:p-8">
        <Quote
          aria-hidden
          className="size-10 shrink-0 text-primary/60"
          strokeWidth={1.5}
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Что думает рекрутёр, открывая ваше резюме
          </p>
          <p className="mt-3 font-display text-lg leading-relaxed sm:text-xl">
            «{text}»
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
