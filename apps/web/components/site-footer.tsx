import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} ResumAI · AI-адаптация резюме под вакансии hh.ru
        </p>
        <nav className="flex flex-wrap gap-5">
          <Link href="/legal/privacy" className="transition hover:text-foreground">
            Политика конфиденциальности
          </Link>
          <Link href="/legal/terms" className="transition hover:text-foreground">
            Оферта
          </Link>
          <Link href="/legal/data" className="transition hover:text-foreground">
            152-ФЗ
          </Link>
        </nav>
      </div>
    </footer>
  );
}
