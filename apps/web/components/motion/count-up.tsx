'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  to: number;
  decimals?: number;
  suffix?: string;
  from?: number;
  duration?: number;
  className?: string;
  /** Start the moment the component mounts instead of waiting for scroll */
  immediate?: boolean;
}

/**
 * Counts the number up from `from` to `to` the first time the element is
 * visible (or immediately if `immediate`). Respects prefers-reduced-motion.
 */
export function CountUp({
  to,
  decimals = 0,
  suffix = '',
  from = 0,
  duration = 1.6,
  className,
  immediate,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  // amount 0.1 triggers as soon as 10% of the element is visible — makes the
  // hero stat-strip fire on first paint instead of waiting for the user to
  // nudge-scroll.
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!immediate && !inView) return;
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
  }, [immediate, inView, reduced, from, to, duration]);

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
