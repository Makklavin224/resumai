import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  Sparkles,
  ShieldCheck,
  Target,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import { AdaptForm } from '@/components/forms/adapt-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const STEPS = [
  {
    icon: Target,
    title: 'Парсим вакансию',
    desc: 'Извлекаем ключевые требования, стоп-слова, уровень и стек.',
  },
  {
    icon: Wand2,
    title: 'Адаптируем резюме',
    desc: 'AI находит 3 пробела и подсказывает формулировки, которые попадут в фильтр HR.',
  },
  {
    icon: Sparkles,
    title: 'Пишем письмо',
    desc: 'Личное сопроводительное на 120–180 слов без шаблонных фраз.',
  },
];

const FEATURES = [
  { icon: Clock, label: '2 минуты вместо 30' },
  { icon: TrendingUp, label: '+65% откликов работодателей' },
  { icon: ShieldCheck, label: 'Данные остаются в РФ (152-ФЗ)' },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="gradient-mesh absolute inset-0 -z-10 opacity-80" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="primary" className="mx-auto mb-5">
              <Sparkles className="size-3.5" />
              AI для откликов на hh.ru
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Адаптируем резюме под вакансию за{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                2 минуты
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Вставь ссылку или PDF своего резюме и ссылку на вакансию hh.ru. AI найдёт пробелы,
              подскажет правки и напишет личное сопроводительное письмо, которое читают.
            </p>
            <div className="mx-auto mt-7 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 backdrop-blur"
                >
                  <Icon className="size-4 text-primary" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <AdaptForm />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Как это работает
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
            От пустой формы до отклика — три шага
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="relative overflow-hidden">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
            <div className="space-y-4">
              <Badge variant="muted">Обычный отклик</Badge>
              <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm italic text-muted-foreground">
                «Здравствуйте, меня зовут Иван. Я ищу работу Frontend-разработчиком. У меня есть
                опыт работы с React и JS. Готов учиться…»
              </p>
              <p className="text-xs text-muted-foreground">↓ Ответ — молчание</p>
            </div>
            <div className="space-y-4">
              <Badge variant="primary">
                <Sparkles className="size-3.5" />
                Адаптировал ResumAI
              </Badge>
              <p className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm font-medium leading-relaxed">
                «Здравствуйте! Мой опыт разработки на{' '}
                <mark className="bg-primary/25 px-1 rounded text-foreground">React (3 года)</mark>{' '}
                идеально подходит для вашей задачи{' '}
                <mark className="bg-primary/25 px-1 rounded text-foreground">оптимизации SPA</mark>
                . В прошлом проекте я ускорил загрузку на 40%…»
              </p>
              <p className="text-xs font-medium text-primary">↓ Ответ в среднем за 2 рабочих дня</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-10 text-center">
          <Link
            href="#top"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Попробовать бесплатно
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
