'use client';

import { motion } from 'motion/react';

/**
 * Decorative teal + apricot blur orbs that drift lazily behind the hero.
 * Adds depth and movement without fighting the content for attention.
 * `aria-hidden` + pointer-events-none so it never breaks a11y or clicks.
 */
export function FloatingOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -top-32 -left-20 size-[28rem] rounded-full bg-primary/25 blur-3xl"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, 40, -20, 0],
          scale: [1, 1.12, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -top-10 right-[-5rem] size-[24rem] rounded-full bg-accent/30 blur-3xl"
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 30, 50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-10rem] left-1/3 size-[22rem] rounded-full bg-primary/18 blur-3xl"
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -30, 10, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
