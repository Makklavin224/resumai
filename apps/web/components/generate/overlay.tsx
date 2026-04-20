'use client';

import { motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GenerateSteps } from './steps';
import type { GenerateStep } from '@resumai/shared';

const TIPS = [
  'Адаптированное резюме повышает приглашение на собеседование в 3 раза.',
  'Рекрутеры тратят 7 секунд на первичный просмотр резюме.',
  'Фраза «готов учиться» работает против — HR читает её как «у меня нет опыта».',
];

/**
 * Fullscreen progress overlay. Rendered via React Portal directly into
 * document.body so it escapes any parent stacking context (hero sections,
 * sticky nav, framer-motion wrappers) and always covers every other block.
 */
export function GenerateOverlay({ step }: { step: GenerateStep }) {
  const [mounted, setMounted] = useState(false);
  const [tip, setTip] = useState(TIPS[0]!);

  useEffect(() => setMounted(true), []);

  // Lock body scroll so the page beneath can't bleed into view.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTip((prev) => {
        const idx = TIPS.indexOf(prev);
        return TIPS[(idx + 1) % TIPS.length] ?? TIPS[0]!;
      });
    }, 2800);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  const node = (
    <motion.div
      // Max z-index to guarantee we're above every sticky header, paywall,
      // toaster, or portal in the app. Inline style wins over Tailwind.
      style={{ zIndex: 2147483647 }}
      className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-2xl p-4"
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
        className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-elevated)]"
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

  return createPortal(node, document.body);
}
