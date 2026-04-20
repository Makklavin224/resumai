'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  text: string;
  className?: string;
  /** Delay before the word cascade starts */
  delay?: number;
  /** Render each word with an extra class (e.g. for gradient) */
  wordClassName?: (word: string, index: number) => string | undefined;
  /** Force children instead of splitting text (for custom markup) */
  children?: ReactNode;
}

/**
 * Hero-style word-by-word reveal. Words rise from below with a spring,
 * staggered ~60ms each. Respects prefers-reduced-motion (renders instantly).
 */
export function WordReveal({ text, className, delay = 0, wordClassName }: Props) {
  const reduced = useReducedMotion();
  const words = text.split(' ');

  if (reduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn('inline-block', className)} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block whitespace-pre">
          <motion.span
            initial={{ y: '0.6em', opacity: 0, filter: 'blur(6px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            transition={{
              delay: delay + i * 0.06,
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn('inline-block', wordClassName?.(word, i))}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
