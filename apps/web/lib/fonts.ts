import { Unbounded, Onest, JetBrains_Mono } from 'next/font/google';

export const fontDisplay = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const fontSans = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const fontMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-jet-mono',
  display: 'swap',
  weight: ['400', '500'],
});
