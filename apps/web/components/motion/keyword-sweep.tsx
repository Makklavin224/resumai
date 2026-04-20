'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Animated highlight that "scans" across a keyword — the mark underline fills
 * from left to right once the element hits the viewport, then settles into a
 * soft persistent accent bg. Feels like a live ATS sweep rather than a static
 * highlight.
 */
export function KeywordSweep({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();

  return (
    <span
      ref={ref}
      className={cn('relative inline-block rounded px-1 font-semibold text-foreground', className)}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 -z-10 origin-left rounded bg-accent/50"
        initial={{ scaleX: 0 }}
        animate={inView || reduced ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: reduced ? 0 : 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      {children}
    </span>
  );
}
