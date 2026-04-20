'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Target number to count up to */
  to: number;
  /** Decimal places (e.g. 11.4 → 1). 0 for integers. */
  decimals?: number;
  /** Suffix after the number (e.g. "%", " сек") */
  suffix?: string;
  /** Seed value — what's displayed before inView fires. Defaults to 0. */
  from?: number;
  /** Duration in seconds. Default 1.6. */
  duration?: number;
  /** Class name on the span */
  className?: string;
}

/**
 * Counts the number up from `from` to `to` the first time the element is
 * visible. Respects prefers-reduced-motion — skips straight to the target.
 */
export function CountUp({
  to,
  decimals = 0,
  suffix = '',
  from = 0,
  duration = 1.6,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    const controls = animate(from, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, reduced, from, to, duration]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString('ru-RU', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
