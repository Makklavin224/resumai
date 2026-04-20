import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Правовая информация',
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20 prose prose-slate dark:prose-invert">
      {children}
    </article>
  );
}
