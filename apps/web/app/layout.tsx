import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { fontDisplay, fontSans, fontMono } from '@/lib/fonts';
import { cn } from '@/lib/cn';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000'),
  title: {
    default: 'ResumAI — AI-адаптация резюме под вакансии hh.ru',
    template: '%s — ResumAI',
  },
  description:
    'Вставляешь ссылку или PDF резюме + ссылку вакансии на hh.ru — получаешь за 2 минуты адаптированное резюме и сопроводительное письмо.',
  openGraph: {
    type: 'website',
    title: 'ResumAI — AI-адаптация резюме под вакансии hh.ru',
    description:
      'Получи адаптированное резюме и сопроводительное письмо за 2 минуты. Повышай отклики на hh.ru.',
    locale: 'ru_RU',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090f' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={cn(
        fontDisplay.variable,
        fontSans.variable,
        fontMono.variable,
        'h-full antialiased',
      )}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
