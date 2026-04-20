'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  /** Append a pulsing question mark after the headline */
  withQuestion?: boolean;
}

/**
 * Section heading that fades up on scroll and can animate a pulsing `?` so
 * the "Why / How" blocks feel alive instead of static.
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
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
      )}
      <h2 className="font-display mt-2 inline-block text-3xl font-bold leading-tight sm:text-4xl">
        {children}
        {withQuestion && (
          <motion.span
            aria-hidden
            className="ml-2 inline-block text-primary"
            animate={{ rotate: [0, -10, 10, -6, 0], scale: [1, 1.05, 0.95, 1.02, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
          >
            ?
          </motion.span>
        )}
      </h2>
    </motion.div>
  );
}
