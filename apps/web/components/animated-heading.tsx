'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  /** Append a pulsing question mark to the eyebrow line */
  withQuestion?: boolean;
}

/**
 * Section heading that fades up on scroll. When `withQuestion` is set the
 * pulsing "?" attaches to the eyebrow (top line) — that's where the
 * rhetorical hook belongs ("Why do applications vanish?"). The h2 below
 * delivers the *answer* without punctuation.
 */
export function AnimatedHeading({ eyebrow, children, className, withQuestion }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn('text-center', className)}
    >
      {eyebrow && (
        <p className="inline-flex items-baseline gap-1 text-xs font-semibold uppercase tracking-widest text-primary">
          <span>{eyebrow}</span>
          {withQuestion && (
            <motion.span
              aria-hidden
              className="inline-block text-accent"
              animate={{
                rotate: [0, -8, 8, -4, 0],
                scale: [1, 1.15, 0.95, 1.05, 1],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                repeatDelay: 1.2,
                ease: 'easeInOut',
              }}
            >
              ?
            </motion.span>
          )}
        </p>
      )}
      <h2 className="font-display mt-2 inline-block text-3xl font-bold leading-tight sm:text-4xl">
        {children}
      </h2>
    </motion.div>
  );
}
