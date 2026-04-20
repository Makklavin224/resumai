'use client';

import { motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GenerateSteps } from './steps';
import type { GenerateStep } from '@resumai/shared';

const TIPS = [
  'Адаптированное резюме повышает приглашение на собеседование в 3 раза.',
  'Рекрутеры тратят 7 секунд на первичный просмотр резюме.',
  'Фраза «готов учиться» работает против — HR читает её как «у меня нет опыта».',
];

export function GenerateOverlay({ step }: { step: GenerateStep }) {
  const [tip, setTip] = useState(TIPS[0]!);
  useEffect(() => {
    const id = setInterval(() => {
      setTip((prev) => {
        const idx = TIPS.indexOf(prev);
        return TIPS[(idx + 1) % TIPS.length] ?? TIPS[0]!;
      });
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Генерация отклика"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="glass w-full max-w-md space-y-6 rounded-3xl p-7 shadow-[var(--shadow-elevated)]"
      >
        <header className="space-y-1 text-center">
          <h2 className="font-display text-2xl font-semibold">Создаём ваш отклик</h2>
          <p className="text-sm text-muted-foreground">
            AI анализирует данные. Пожалуйста, не закрывайте вкладку.
          </p>
        </header>

        <GenerateSteps current={step} />

        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
            <Lightbulb className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Пока ждём:
            </p>
            <p className="mt-1 text-sm">{tip}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
