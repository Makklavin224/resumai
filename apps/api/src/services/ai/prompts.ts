import { LIMITS } from '@resumai/shared';
import type { ParsedResume, ParsedVacancy } from '../parser/hh-scraper.js';

const SYSTEM_ANALYST = `Ты — русскоязычный HR-аналитик и редактор резюме. Ты внимательно читаешь описание вакансии и резюме кандидата, затем пишешь чёткие, конкретные, измеримые рекомендации. Никаких общих слов «развивайся», «учись» — только конкретные правки с цифрами и глаголами в прошедшем времени. Отвечай строго в формате JSON по требуемой схеме. Не выдумывай факты, которых нет в резюме.`;

const SYSTEM_WRITER = `Ты — русскоязычный копирайтер, который пишет сопроводительные письма для откликов на hh.ru. Пиши живо, уверенно, без канцелярита и шаблонных фраз типа «я — целеустремлённый». Включи 2–3 конкретных совпадения с вакансией, один измеримый результат из опыта и один вопрос или предложение к работодателю, показывающее вовлечённость.`;

export interface GapAnalysisPayload {
  gaps: {
    title: string;
    rationale: string;
    suggestedBullet: string;
  }[];
  matches: {
    title: string;
    detail: string;
    score: number;
  }[];
}

export function buildAnalystMessages(resume: ParsedResume, vacancy: ParsedVacancy) {
  return [
    { role: 'system' as const, content: SYSTEM_ANALYST },
    {
      role: 'user' as const,
      content: `Вакансия «${vacancy.title}» в компании «${vacancy.company}»${
        vacancy.location ? `, ${vacancy.location}` : ''
      }${vacancy.salary ? `, зарплата ${vacancy.salary}` : ''}.

Описание вакансии:
${vacancy.description}

Ключевые навыки из вакансии: ${vacancy.skills.join(', ') || '(не указаны)'}

Резюме кандидата${resume.title ? ` «${resume.title}»` : ''}${
        resume.experienceYears ? `, опыт ${resume.experienceYears} лет` : ''
      }:
${resume.summary ? resume.summary + '\n' : ''}Навыки: ${resume.skills.join(', ') || '(не перечислены)'}

Полный текст резюме:
${resume.rawText.slice(0, 8000)}

Найди РОВНО 3 пробела (чего не хватает в резюме относительно вакансии). Для каждого:
- title: короткий заголовок (до 60 символов)
- rationale: 1–2 предложения, почему это важно для именно этой вакансии
- suggestedBullet: точная формулировка на русском, которую кандидат может добавить в резюме, с глаголом в прошедшем времени и измеримым результатом

Также найди 3 совпадения (сильные стороны, которые уже есть):
- title: короткий заголовок
- detail: 1 предложение, почему это попадание
- score: число 70–100 — сила совпадения

Верни JSON по схеме: {"gaps":[...],"matches":[...]}.`,
    },
  ];
}

export function buildWriterMessages(
  resume: ParsedResume,
  vacancy: ParsedVacancy,
  matches: GapAnalysisPayload['matches'],
) {
  return [
    { role: 'system' as const, content: SYSTEM_WRITER },
    {
      role: 'user' as const,
      content: `Напиши сопроводительное письмо от лица кандидата для вакансии «${vacancy.title}» в «${vacancy.company}».

Обязательные требования:
- Язык: русский, тон — профессиональный, но живой, на «вы».
- Длина: ${LIMITS.coverLetterMinWords}–${LIMITS.coverLetterMaxWords} слов.
- Начни с короткого приветствия, без «Уважаемый …» и без «Меня зовут …».
- Упомяни 2–3 конкретных совпадения из списка ниже своими словами (не копируй детали буквально).
- Включи ровно один измеримый результат из опыта кандидата (если в резюме есть цифры — используй их, иначе — придумай реалистичный диапазон и пометь серой фразой вроде «за счёт рефакторинга»).
- Заверши вопросом или предложением созвониться, показывая инициативу.

Сильные совпадения:
${matches.map((m, i) => `${i + 1}. ${m.title}: ${m.detail}`).join('\n')}

Опыт из резюме (первые 3000 символов):
${resume.rawText.slice(0, 3000)}

Выведи только текст письма. Без вступлений, без markdown, без имени в конце.`,
    },
  ];
}
