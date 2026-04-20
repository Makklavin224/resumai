'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCcw, AlertTriangle, Gift, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResumeInput, type ResumeValue } from './resume-input';
import { VacancyInput, type VacancyValue } from './vacancy-input';
import { GenerateOverlay } from '@/components/generate/overlay';
import { HH_URL_REGEX, LIMITS, SIGNUP_BONUS_CREDITS, type GenerateStep } from '@resumai/shared';
import { ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-client';

const DEFAULT_RESUME: ResumeValue = { mode: 'pdf', file: null };
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
  const { user } = useAuth();
  const [resume, setResume] = useState<ResumeValue>(DEFAULT_RESUME);
  const [vacancy, setVacancy] = useState<VacancyValue>(DEFAULT_VACANCY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<GenerateStep>('queued');
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  function reset() {
    setResume(DEFAULT_RESUME);
    setVacancy(DEFAULT_VACANCY);
    setError(null);
  }

  /** Animate the full generator overlay client-side so anonymous visitors
   * see exactly what they're paying for before hitting the register wall. */
  async function runDemo() {
    setPending(true);
    setStep('parsing-vacancy');
    await new Promise((r) => setTimeout(r, 1200));
    setStep('parsing-resume');
    await new Promise((r) => setTimeout(r, 1400));
    setStep('matching');
    await new Promise((r) => setTimeout(r, 1800));
    setStep('writing-letter');
    await new Promise((r) => setTimeout(r, 2000));
    setStep('done');
    await new Promise((r) => setTimeout(r, 400));
    setPending(false);
    setShowRegisterPrompt(true);
  }

  async function submit() {
    const err = validate(resume, vacancy);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // Anonymous → run demo, prompt register. No server call, no credit burn.
    if (!user) {
      runDemo();
      return;
    }

    setPending(true);
    const pacer = schedule(
      [
        { step: 'parsing-vacancy', delay: 200 },
        { step: 'parsing-resume', delay: 1400 },
        { step: 'matching', delay: 3800 },
        { step: 'writing-letter', delay: 7000 },
      ],
      setStep,
    );

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
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Шаг 1</p>
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
            {user
              ? 'Нажмите «Адаптировать» — списываем 1 кредит со счёта'
              : 'Посмотрите, как работает сервис — потом зарегистрируйтесь и получите 3 отклика'}
          </p>
          <div className="flex gap-3">
            <Button type="button" size="lg" variant="outline" onClick={reset} disabled={pending}>
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

      <AnimatePresence>
        {showRegisterPrompt && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md"
            >
              <Card className="glass">
                <CardContent className="space-y-5 p-7 text-center">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-[var(--shadow-glow-primary)]">
                    <Gift className="size-7" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold">
                      Теперь ваша очередь — по-настоящему
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Это было демо. Зарегистрируйтесь за 30 секунд — получите{' '}
                      <span className="font-semibold text-foreground">
                        {SIGNUP_BONUS_CREDITS} бесплатных отклика
                      </span>{' '}
                      на свой счёт и адаптируйте резюме под свои реальные вакансии.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="lg" asChild>
                      <Link href="/register">
                        <Sparkles className="size-4" />
                        Получить {SIGNUP_BONUS_CREDITS} отклика
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/login">
                        <LogIn className="size-4" />
                        Уже есть аккаунт — войти
                      </Link>
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterPrompt(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Закрыть
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
