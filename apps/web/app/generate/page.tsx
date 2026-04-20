'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertTriangle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GenerateSteps } from '@/components/generate/steps';
import type { GenerateStep } from '@resumai/shared';

const TIPS = [
  'Адаптированное резюме увеличивает вероятность приглашения в 3 раза.',
  'Рекрутеры тратят в среднем 7 секунд на первичный просмотр резюме.',
  'Фраза «готов учиться» работает против — HR читает её как «у меня нет опыта».',
];

export default function GeneratePage() {
  const router = useRouter();
  const [step, setStep] = useState<GenerateStep>('queued');
  const [tip, setTip] = useState(TIPS[0]!);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = sessionStorage.getItem('resumai:pending');
    if (!pending) {
      router.replace('/');
      return;
    }

    let cancelled = false;
    const demoTimings: { step: GenerateStep; delay: number }[] = [
      { step: 'parsing-vacancy', delay: 300 },
      { step: 'parsing-resume', delay: 1600 },
      { step: 'matching', delay: 2800 },
      { step: 'writing-letter', delay: 4200 },
    ];

    const timers = demoTimings.map(({ step: s, delay }) =>
      setTimeout(() => {
        if (!cancelled) setStep(s);
      }, delay),
    );

    const tipTimer = setInterval(() => {
      setTip((prev) => {
        const idx = TIPS.indexOf(prev);
        return TIPS[(idx + 1) % TIPS.length] ?? TIPS[0]!;
      });
    }, 2800);

    const finishTimer = setTimeout(() => {
      if (cancelled) return;
      // Once API is wired, this will hit /api/generate and redirect.
      // For now, the preview route displays a demo result.
      setStep('done');
      toast.success('Готово! Открываем результат.');
      router.push('/result/demo');
    }, 6000);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearInterval(tipTimer);
      clearTimeout(finishTimer);
    };
  }, [router]);

  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] max-w-xl place-items-center px-4 py-12 sm:px-6">
      <div className="gradient-mesh absolute inset-0 -z-10 opacity-60" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full"
      >
        <Card className="glass">
          <CardContent className="flex flex-col gap-6 p-7">
            <header className="space-y-2 text-center">
              <h1 className="font-display text-2xl font-semibold">Создаём ваш отклик</h1>
              <p className="text-sm text-muted-foreground">
                Занимает около 2 минут. AI анализирует данные, не закрывайте вкладку.
              </p>
            </header>

            <GenerateSteps current={step} />

            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                <Lightbulb className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Знаете ли вы?
                </p>
                <p className="mt-1 text-sm">{tip}</p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Что-то пошло не так</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setError(null);
                      router.push('/');
                    }}
                  >
                    Вернуться к форме
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
