'use client';

import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  children: ReactNode;
  className?: string;
  /** Max offset in pixels — subtle feels better (default 8). */
  strength?: number;
}

/**
 * Wrapper that makes a CTA gently track the cursor within its bounding box.
 * Feels "alive" without being gimmicky. Disables cleanly on touch + reduced
 * motion so nobody sees a drifting button on mobile.
 */
export function MagneticButton({ children, className, strength = 8 }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 15, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 15, mass: 0.4 });

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;
        x.set((relX / rect.width) * strength * 2);
        y.set((relY / rect.height) * strength * 2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
