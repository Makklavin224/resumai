'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Lock,
  Sparkles,
  Target,
  AlertOctagon,
  Compass,
  Flag as FlagIcon,
  Layers,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecommendationCard } from '@/components/results/recommendation-card';
import { MatchRow } from '@/components/results/match-row';
import { CoverLetter } from '@/components/results/cover-letter';
import { RecruiterMonologue } from '@/components/results/recruiter-monologue';
import { InterviewProbability as InterviewProbabilitySection } from '@/components/results/interview-probability';
import { RisksList } from '@/components/results/risks-list';
import { FlagsColumns } from '@/components/results/flags-columns';
import { ResponseStrategySection } from '@/components/results/response-strategy';
import { SignalsCoverage } from '@/components/results/signals-coverage';
import { PaywallModal } from '@/components/paywall/paywall-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_RESULT } from '@/lib/demo';
import type { GenerateResult } from '@resumai/shared';

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchResult(id: string): Promise<GenerateResult | null> {
  if (id === 'demo') return DEMO_RESULT;
  try {
    const res = await fetch(`/api/result/${id}`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as GenerateResult;
  } catch {
    return null;
  }
}

export default function ResultPage({ params }: Props) {
  const { id } = use(params);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchResult(id);
      if (cancelled) return;
      if (!data) setNotFound(true);
      setResult(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('paid') !== '1') return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const data = await fetchResult(id);
      if (data?.kind === 'full' || tries > 10) {
        clearInterval(timer);
        if (data) setResult(data);
        url.searchParams.delete('paid');
        window.history.replaceState({}, '', url.toString());
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [id]);

  if (loading) return <ResultSkeleton />;
  if (notFound || !result) return <ResultMissing id={id} />;

  const isLocked = result.kind === 'preview';
  const visibleGaps = isLocked ? result.gaps.slice(0, 2) : result.gaps;
  const hiddenGaps = isLocked ? Math.max(0, 8 - visibleGaps.length) : 0;
  const visibleMatches = isLocked ? result.matches.slice(0, 2) : result.matches;
  const hiddenMatches = isLocked ? Math.max(0, 6 - visibleMatches.length) : 0;

  const interviewPercent = result.interviewProbability?.value;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Новый отклик
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {typeof interviewPercent === 'number' && !isLocked && (
            <Badge variant="primary">Шанс интервью {interviewPercent}%</Badge>
          )}
          <Badge variant={isLocked ? 'muted' : 'success'}>
            {isLocked ? 'Превью' : 'Полный результат'} · id: {id.slice(0, 8)}
          </Badge>
        </div>
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
            ? 'Мы показываем превью. Разблокируйте полный анализ — 8+ рекомендаций, риски, 3 стратегии отклика, сигналы и письмо целиком.'
            : 'Ниже — разбор от 4 персон: ATS, рекрутёра, нанимающего менеджера и карьерного стратега. Копируйте готовые формулировки в резюме.'}
        </p>
      </motion.header>

      {result.profileSnapshot && (
        <p className="mt-6 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground/90">
          <span className="font-semibold">Вердикт рекрутёра: </span>
          {result.profileSnapshot}
        </p>
      )}

      {result.recruiterInnerMonologue && (
        <section className="mt-6">
          <RecruiterMonologue text={result.recruiterInnerMonologue} />
        </section>
      )}

      <section className="mt-6 grid gap-4 lg:grid-cols-5">
        {result.interviewProbability && (
          <div className="lg:col-span-3">
            <InterviewProbabilitySection data={result.interviewProbability} />
          </div>
        )}
        {result.targetPositioning && (
          <Card className="lg:col-span-2">
            <CardContent className="space-y-2 p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Compass className="size-4" />
                Как вам подавать себя
              </p>
              <p className="text-sm leading-relaxed">{result.targetPositioning}</p>
            </CardContent>
          </Card>
        )}
      </section>

      {(result.redFlags?.length || result.greenFlags?.length) && (
        <section className="mt-6">
          <FlagsColumns redFlags={result.redFlags} greenFlags={result.greenFlags} />
        </section>
      )}

      {result.rejectionRisks?.length ? (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
            <AlertOctagon className="size-5 text-destructive" />
            Риски отказа · {result.rejectionRisks.length}
          </h2>
          <RisksList risks={result.rejectionRisks} />
          {isLocked && (
            <p className="mt-3 text-xs text-muted-foreground">
              Показан 1 риск. В полном отчёте — все риски с планом закрытия.
            </p>
          )}
        </section>
      ) : null}

      {result.responseStrategy && !isLocked && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
            <FlagIcon className="size-5 text-primary" />
            Три стратегии отклика
          </h2>
          <ResponseStrategySection strategies={result.responseStrategy} />
        </section>
      )}

      {result.signals?.length && !isLocked ? (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
            <Layers className="size-5 text-primary" />
            Сигналы вакансии · {result.signals.length}
          </h2>
          <SignalsCoverage signals={result.signals} />
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles className="size-5 text-primary" />
              Рекомендации по резюме
            </h2>
            <Badge variant="primary">{result.gaps.length}</Badge>
          </div>
          <div className="space-y-3">
            {visibleGaps.map((gap, i) => (
              <RecommendationCard key={`${gap.title}-${i}`} gap={gap} index={i} />
            ))}
            {hiddenGaps > 0 && (
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm" aria-hidden />
                <CardContent className="relative flex flex-col items-center gap-3 p-6 text-center">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                    <Lock className="size-5" />
                  </span>
                  <p className="text-sm font-medium">
                    Ещё {hiddenGaps}+ рекомендаций скрыто
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
                {visibleMatches.map((m, i) => (
                  <MatchRow key={`${m.title}-${i}`} match={m} />
                ))}
                {hiddenMatches > 0 && (
                  <li className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                    Ещё {hiddenMatches}+ совпадений доступно после разблокировки
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="relative mt-8">
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
        <aside className="sticky bottom-4 mx-auto mt-8 max-w-3xl">
          <Card className="glass">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold">Разблокируйте всё</p>
                  <p className="text-xs text-muted-foreground">
                    8+ рекомендаций, стратегии отклика, карта сигналов, письмо целиком
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

function ResultSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
      <Skeleton className="h-10 w-60" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function ResultMissing({ id }: { id: string }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-bold">Результат {id} не найден</h1>
      <p className="text-sm text-muted-foreground">
        Возможно, результат устарел (живёт в кеше 1 час) или сессия сброшена. Создайте новый
        отклик — это займёт меньше двух минут.
      </p>
      <Button asChild>
        <Link href="/">
          <ArrowLeft className="size-4" />К форме
        </Link>
      </Button>
    </div>
  );
}
