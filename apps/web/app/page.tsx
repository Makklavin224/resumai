import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  Target,
  Wand2,
  MessageSquareOff,
  Cpu,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AdaptForm } from '@/components/forms/adapt-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PricingBlock } from '@/components/pricing/pricing-block';
import { AnimatedHeading } from '@/components/animated-heading';
import { CountUp } from '@/components/motion/count-up';
import { WordReveal } from '@/components/motion/word-reveal';
import { MagneticButton } from '@/components/motion/magnetic-button';
import { FloatingOrbs } from '@/components/motion/floating-orbs';

interface Stat {
  value: number;
  decimals?: number;
  suffix: string;
  label: string;
  hint: string;
}
const STAT_STRIP: Stat[] = [
  { value: 82, suffix: '%', label: 'откликов без ответа', hint: 'hh.ru, 2025' },
  { value: 11.4, decimals: 1, suffix: '', label: 'резюме на вакансию', hint: 'индекс hh, март 2026' },
  { value: 8, suffix: ' сек', label: 'на первое решение', hint: 'рекрутер + ATS' },
  { value: 78, suffix: '%', label: 'компаний фильтруют ATS', hint: 'исследование vc.ru' },
];

const PAINS = [
  {
    icon: MessageSquareOff,
    title: 'Тишина после 50 откликов',
    body: 'Вы отправили резюме — и ничего. Вы не хуже других. Просто ATS отсеивает вас раньше, чем резюме увидит живой человек.',
  },
  {
    icon: Cpu,
    title: '8 секунд и робот-фильтр',
    body: 'Рекрутеру хватает 7–8 секунд, ATS — ещё меньше. Без ключевых слов вакансии ваш опыт просто не «прочитают».',
  },
  {
    icon: Users,
    title: '11 кандидатов на место',
    body: 'Индекс hh.ru — 11,4. Быть «ещё одним подходящим» недостаточно. Нужно попадать прицельно в то, что ищет работодатель.',
  },
];

const STEPS = [
  {
    icon: Target,
    title: 'Разбираем вакансию',
    desc: 'Достаём ключевые слова, стоп-слова и скрытые требования, которые видит ATS.',
  },
  {
    icon: Wand2,
    title: 'Адаптируем резюме',
    desc: 'AI переписывает формулировки под эту конкретную вакансию. Конкретно, с глаголами и цифрами.',
  },
  {
    icon: Sparkles,
    title: 'Пишем сопроводительное',
    desc: 'Живое письмо 120–180 слов: ваши сильные стороны + один вопрос работодателю. Без канцелярита.',
  },
];

const VS_HH_PRO = {
  hhPro: [
    { ok: true, text: 'Поднимает резюме в топ списка' },
    { ok: false, text: 'Не переписывает содержимое' },
    { ok: false, text: 'Не адаптирует под вакансию' },
    { ok: false, text: 'Не пишет сопроводительное' },
  ],
  resumai: [
    { ok: true, text: 'Находит пробелы против требований' },
    { ok: true, text: 'Переписывает формулировки под ATS' },
    { ok: true, text: 'Подстраивает под конкретную вакансию' },
    { ok: true, text: 'Пишет сопроводительное письмо' },
  ],
};

export default function LandingPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="gradient-mesh absolute inset-0 -z-10 opacity-70" aria-hidden />
        <FloatingOrbs />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              <WordReveal text="82% ваших откликов" className="block" />
              <WordReveal
                text="никто не читает"
                delay={0.3}
                className="mt-1 block text-primary/90"
              />
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              За одну вакансию на hh.ru бьётесь вы и ещё десять. У робота-фильтра — 8 секунд,
              чтобы решить, попадёте ли вы в руки живого рекрутера. Мы перепишем ваше резюме
              под каждую вакансию так, чтобы фильтр пропустил — а HR набрал ваш номер.
            </p>
            <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
              <MagneticButton>
                <Button size="lg" asChild>
                  <Link href="/register">
                    <Sparkles className="size-4" />
                    Получить 3 отклика
                  </Link>
                </Button>
              </MagneticButton>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">Как это работает</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              30 секунд на регистрацию — 3 бесплатных отклика сразу на счёт
            </p>
          </div>

          <div
            aria-label="Статистика рынка"
            className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {STAT_STRIP.map((s) => (
              <div
                key={s.label}
                className="glass rounded-2xl border-border/60 p-4 text-center"
              >
                <p className="font-display text-2xl font-bold text-primary sm:text-3xl">
                  <CountUp to={s.value} decimals={s.decimals} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-xs font-medium text-foreground">{s.label}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {s.hint}
                </p>
              </div>
            ))}
          </div>

          <div id="adapt" className="mx-auto mt-12 max-w-4xl scroll-mt-20">
            <AdaptForm />
          </div>
        </div>
        {/* soft vertical fade from hero mesh into the next section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent via-background/60 to-background"
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6" id="pains">
        <AnimatedHeading
          eyebrow="Почему отклики «уходят в молчание»"
          withQuestion
          className="mb-10"
        >
          Дело не в вас. Дело в фильтре
        </AnimatedHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PAINS.map((p) => (
            <Card key={p.title} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
                  <p.icon className="size-5" />
                </span>
                <h3 className="font-display text-lg font-semibold leading-snug">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <AnimatedHeading eyebrow="Как это работает" withQuestion className="mb-10">
          От ссылки до готового отклика — 30 секунд
        </AnimatedHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="relative h-full overflow-hidden">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
                    <s.icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid items-stretch gap-6 p-6 md:grid-cols-2 md:p-10">
            <div className="flex h-full flex-col rounded-2xl border border-dashed border-border bg-muted/20 p-6">
              <Badge variant="muted" className="self-start">
                Обычный отклик
              </Badge>
              <p className="mt-4 flex-1 rounded-2xl border border-dashed border-border bg-background/60 p-5 text-sm italic text-muted-foreground">
                «Здравствуйте, меня зовут Иван. Ищу работу Frontend-разработчиком. Есть опыт с
                React и JS. Готов учиться…»
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                ↓ Рекрутер даже не открыл ваше резюме — ATS срезал его по стоп-словам «готов
                учиться» и отсутствию ключевых навыков вакансии.
              </p>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-primary/25 bg-primary/5 p-6">
              <Badge variant="primary" className="self-start">
                <Sparkles className="size-3.5" />
                Адаптировал ResumAI
              </Badge>
              <p className="mt-4 flex-1 rounded-2xl border border-primary/20 bg-background/70 p-5 text-sm font-medium leading-relaxed">
                «Здравствуйте! Мой опыт разработки на{' '}
                <mark className="rounded bg-accent/40 px-1 text-foreground">React (3 года)</mark>{' '}
                совпадает с задачей{' '}
                <mark className="rounded bg-accent/40 px-1 text-foreground">
                  оптимизации SPA
                </mark>
                . В последнем проекте снизил LCP с 4,2 с до 1,6 с…»
              </p>
              <p className="mt-4 text-xs font-medium text-primary">
                ↓ Ключевые слова вакансии + результаты → рекрутер уже набирает ваш номер.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Card className="glass overflow-hidden">
          <CardContent className="grid items-stretch gap-6 p-6 md:grid-cols-2 md:p-10">
            <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-muted/10 p-6 md:p-8">
              <Badge variant="muted" className="mb-3 self-start">
                hh.ru PRO · от 390 ₽/неделю
              </Badge>
              <h3 className="font-display text-2xl font-bold">Поднимает в топ списка</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Но не меняет содержимое резюме. Если резюме не попадает в ключи — вы просто
                быстрее оказываетесь в топе мусорной кучи.
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {VS_HH_PRO.hhPro.map((i) => (
                  <li key={i.text} className="flex items-start gap-2.5 text-sm">
                    {i.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                    )}
                    <span className={i.ok ? '' : 'text-muted-foreground line-through'}>
                      {i.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex h-full flex-col rounded-2xl bg-primary/5 p-6 ring-1 ring-primary/25 md:p-8">
              <Badge variant="primary" className="mb-3 self-start">
                <Sparkles className="size-3.5" />
                ResumAI · от 10 ₽/отклик
              </Badge>
              <h3 className="font-display text-2xl font-bold">Делает так, чтобы топ имел смысл</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Мы переписываем содержимое так, чтобы ATS-фильтр пропустил резюме, а рекрутер
                сразу увидел совпадение с вакансией.
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {VS_HH_PRO.resumai.map((i) => (
                  <li key={i.text} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]" />
                    <span className="font-medium">{i.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6">
        <PricingBlock />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Пока вы копипастите резюме под очередную вакансию,
          <br />
          кто-то уже сходил на собеседование.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Вставьте ссылку — получите адаптированное резюме и сопроводительное за полминуты.
          Первый отклик — бесплатно, без карты.
        </p>
        <div className="mt-6">
          <MagneticButton>
            <Button size="lg" asChild>
              <Link href="#adapt">
                Сделать первый отклик
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </MagneticButton>
        </div>
      </section>
    </>
  );
}
