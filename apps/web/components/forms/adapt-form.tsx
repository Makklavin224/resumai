'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { motion } from 'motion/react';
import { Sparkles, RefreshCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ResumeInput, type ResumeValue } from './resume-input';
import { VacancyInput, type VacancyValue } from './vacancy-input';
import { HH_URL_REGEX, LIMITS } from '@resumai/shared';

const DEFAULT_RESUME: ResumeValue = { mode: 'url', url: '' };
const DEFAULT_VACANCY: VacancyValue = { mode: 'url', url: '' };

function validate(resume: ResumeValue, vacancy: VacancyValue) {
  if (resume.mode === 'url') {
    if (!HH_URL_REGEX.test(resume.url)) return 'Некорректная ссылка на резюме hh.ru';
  } else if (resume.mode === 'text') {
    if (resume.text.trim().length < LIMITS.resumeTextMin)
      return `Текст резюме — минимум ${LIMITS.resumeTextMin} символов`;
  } else if (resume.mode === 'pdf') {
    if (!resume.file) return 'Загрузите PDF или DOCX резюме';
  }
  if (vacancy.mode === 'url') {
    if (!HH_URL_REGEX.test(vacancy.url)) return 'Некорректная ссылка на вакансию hh.ru';
  } else if (vacancy.text.trim().length < LIMITS.vacancyTextMin) {
    return `Текст вакансии — минимум ${LIMITS.vacancyTextMin} символов`;
  }
  return null;
}

export function AdaptForm() {
  const router = useRouter();
  const [resume, setResume] = useState<ResumeValue>(DEFAULT_RESUME);
  const [vacancy, setVacancy] = useState<VacancyValue>(DEFAULT_VACANCY);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setResume(DEFAULT_RESUME);
    setVacancy(DEFAULT_VACANCY);
    setError(null);
  }

  function submit() {
    const err = validate(resume, vacancy);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    startTransition(() => {
      const payload = {
        resume: serialize(resume),
        vacancy: serialize(vacancy),
      };
      try {
        sessionStorage.setItem('resumai:pending', JSON.stringify(payload));
      } catch {
        toast.error('Не удалось сохранить черновик в браузере. Попробуйте ещё раз.');
      }
      router.push('/generate');
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="glass grid w-full gap-6 rounded-3xl p-6 shadow-[var(--shadow-elevated)] sm:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-3">
          <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Шаг 1
            </p>
            <h2 className="font-display text-xl font-semibold">Ваше резюме</h2>
          </header>
          <ResumeInput value={resume} onChange={setResume} onError={(m) => toast.error(m)} />
        </section>

        <section className="space-y-3">
          <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              Шаг 2
            </p>
            <h2 className="font-display text-xl font-semibold">Вакансия</h2>
          </header>
          <VacancyInput value={vacancy} onChange={setVacancy} />
        </section>
      </div>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="size-4" />
          {error}
        </motion.p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Никаких регистраций. 1 бесплатная генерация на старте.
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={reset} disabled={isPending}>
            <RefreshCcw className="size-4" />
            Сбросить
          </Button>
          <Button type="button" size="lg" onClick={submit} disabled={isPending}>
            <Sparkles className="size-4" />
            {isPending ? 'Открываем анализ…' : 'Адаптировать резюме'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

type Serialized =
  | { type: 'url'; value: string }
  | { type: 'text'; value: string }
  | { type: 'pdf'; filename: string; size: number };

function serialize(v: ResumeValue | VacancyValue): Serialized {
  if (v.mode === 'url') return { type: 'url', value: v.url };
  if (v.mode === 'text') return { type: 'text', value: v.text };
  return { type: 'pdf', filename: v.file?.name ?? '', size: v.file?.size ?? 0 };
}
