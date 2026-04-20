'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, Sparkles, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecommendationCard } from '@/components/results/recommendation-card';
import { MatchRow } from '@/components/results/match-row';
import { CoverLetter } from '@/components/results/cover-letter';
import { PaywallModal } from '@/components/paywall/paywall-modal';
import { DEMO_RESULT } from '@/lib/demo';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ResultPage({ params }: Props) {
  const { id } = use(params);
  // TODO(api): fetch `/api/result/${id}` once backend is wired (Phase 5).
  const result = DEMO_RESULT;
  const isLocked = result.kind === 'preview';
  const visibleGaps = isLocked ? result.gaps.slice(0, 1) : result.gaps;
  const hiddenGaps = isLocked ? result.gaps.length - visibleGaps.length : 0;
  const visibleMatches = isLocked ? result.matches.slice(0, 1) : result.matches;
  const hiddenMatches = isLocked ? result.matches.length - visibleMatches.length : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Новый отклик
          </Link>
        </Button>
        <Badge variant={isLocked ? 'muted' : 'success'}>
          {isLocked ? 'Превью' : 'Полный результат'} · id: {id}
        </Badge>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-3"
      >
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Ваш отклик готов</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {isLocked
            ? 'Мы показываем превью. Разблокируйте полный анализ, чтобы увидеть все рекомендации и письмо целиком.'
            : 'Ниже — рекомендации по резюме, совпадения с вакансией и готовое сопроводительное. Копируйте или скачивайте.'}
        </p>
      </motion.header>

      <section className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles className="size-5 text-primary" />
              Рекомендации по резюме
            </h2>
            <Badge variant="primary">{result.gaps.length} штук</Badge>
          </div>
          <div className="space-y-3">
            {visibleGaps.map((gap, i) => (
              <RecommendationCard key={gap.title} gap={gap} index={i} />
            ))}
            {hiddenGaps > 0 && (
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm" aria-hidden />
                <CardContent className="relative flex flex-col items-center gap-3 p-6 text-center">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Lock className="size-5" />
                  </span>
                  <p className="text-sm font-medium">
                    Ещё {hiddenGaps}{' '}
                    {hiddenGaps === 1 ? 'рекомендация' : 'рекомендаций'} скрыто
                  </p>
                  <PaywallModal
                    trigger={
                      <Button size="sm" variant="primary">
                        Разблокировать полный отчёт
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Target className="size-5 text-[color:var(--success)]" />
              Что совпадает
            </h2>
            <Badge variant="success">{result.matches.length}</Badge>
          </div>
          <Card>
            <CardContent className="p-4">
              <ul className="space-y-2">
                {visibleMatches.map((m) => (
                  <MatchRow key={m.title} match={m} />
                ))}
                {hiddenMatches > 0 && (
                  <li className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                    Ещё {hiddenMatches}{' '}
                    {hiddenMatches === 1 ? 'совпадение' : 'совпадений'} доступно после
                    разблокировки
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8 relative">
        <CoverLetter
          text={result.coverLetter}
          previewText={result.previewCoverLetter}
          locked={isLocked}
        />
        {isLocked && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 rounded-b-2xl bg-gradient-to-t from-background to-transparent" />
        )}
      </section>

      {isLocked && (
        <aside className="sticky bottom-4 mt-8 mx-auto max-w-3xl">
          <Card className="glass">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold">Разблокируйте полностью</p>
                  <p className="text-xs text-muted-foreground">
                    Все рекомендации, все совпадения и письмо целиком за один клик
                  </p>
                </div>
              </div>
              <PaywallModal
                trigger={
                  <Button size="lg">
                    <Lock className="size-4" />
                    Получить полный отчёт
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </aside>
      )}
    </div>
  );
}
