'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ResumeInput, type ResumeValue } from './resume-input';
import { VacancyInput, type VacancyValue } from './vacancy-input';
import { GenerateOverlay } from '@/components/generate/overlay';
import { HH_URL_REGEX, LIMITS, type GenerateStep } from '@resumai/shared';
import { ApiClientError } from '@/lib/api-client';

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

function buildFormData(resume: ResumeValue, vacancy: VacancyValue): FormData {
  const fd = new FormData();
  fd.append('resumeType', resume.mode);
  if (resume.mode === 'url') fd.append('resumeUrl', resume.url);
  else if (resume.mode === 'text') fd.append('resumeText', resume.text);
  else if (resume.mode === 'pdf' && resume.file) fd.append('resumePdf', resume.file);
  fd.append('vacancyType', vacancy.mode);
  if (vacancy.mode === 'url') fd.append('vacancyUrl', vacancy.url);
  else fd.append('vacancyText', vacancy.text);
  return fd;
}

export function AdaptForm() {
  const router = useRouter();
  const [resume, setResume] = useState<ResumeValue>(DEFAULT_RESUME);
  const [vacancy, setVacancy] = useState<VacancyValue>(DEFAULT_VACANCY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<GenerateStep>('queued');

  function reset() {
    setResume(DEFAULT_RESUME);
    setVacancy(DEFAULT_VACANCY);
    setError(null);
  }

  async function submit() {
    const err = validate(resume, vacancy);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPending(true);

    // Rough client-side step pacing so the overlay feels responsive even
    // before the server SSE endpoint exists.
    const pacer = schedule([
      { step: 'parsing-vacancy', delay: 200 },
      { step: 'parsing-resume', delay: 1400 },
      { step: 'matching', delay: 3800 },
      { step: 'writing-letter', delay: 7000 },
    ], setStep);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        body: buildFormData(resume, vacancy),
        credentials: 'include',
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        throw new ApiClientError(
          { error: payload.error ?? 'Ошибка генерации', code: (payload.code ?? 'INTERNAL') as never },
          res.status,
        );
      }
      const data = (await res.json()) as { resultId: string };
      setStep('done');
      router.push(`/result/${data.resultId}`);
    } catch (err) {
      pacer.cancel();
      setPending(false);
      const message = err instanceof ApiClientError ? err.message : 'Что-то пошло не так. Попробуйте ещё раз.';
      setError(message);
      toast.error(message);
    }
  }

  return (
    <>
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
            <Button type="button" variant="outline" onClick={reset} disabled={pending}>
              <RefreshCcw className="size-4" />
              Сбросить
            </Button>
            <Button type="button" size="lg" onClick={submit} disabled={pending}>
              <Sparkles className="size-4" />
              {pending ? 'Анализируем…' : 'Адаптировать резюме'}
            </Button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>{pending && <GenerateOverlay step={step} />}</AnimatePresence>
    </>
  );
}

function schedule(
  steps: { step: GenerateStep; delay: number }[],
  onTick: (s: GenerateStep) => void,
) {
  const timers = steps.map((s) => setTimeout(() => onTick(s.step), s.delay));
  return {
    cancel() {
      timers.forEach(clearTimeout);
    },
  };
}
