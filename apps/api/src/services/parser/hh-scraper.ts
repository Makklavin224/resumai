import { load } from 'cheerio';
import { fetch } from 'undici';
import { hashKey, cached } from '../cache/redis.js';
import { logger } from '../../lib/logger.js';

export interface ParsedVacancy {
  title: string;
  company: string;
  location?: string;
  salary?: string;
  description: string;
  skills: string[];
  rawText: string;
  source: 'cheerio' | 'playwright' | 'text';
}

export interface ParsedResume {
  title?: string;
  experienceYears?: number;
  skills: string[];
  summary?: string;
  rawText: string;
  source: 'cheerio' | 'playwright' | 'pdf' | 'text';
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'ru,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      logger.warn({ status: res.status, url }, 'hh fetch non-200');
      return null;
    }
    return await res.text();
  } catch (err) {
    logger.warn({ err, url }, 'hh fetch failed');
    return null;
  }
}

function clean(s: string | undefined): string {
  return (s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function normalizeSkill(s: string): string {
  return clean(s).toLowerCase();
}

function extractJsonLd($: ReturnType<typeof load>): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    try {
      const raw = $(el).contents().text();
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      /* skip malformed */
    }
  }
  return null;
}

export async function parseVacancyUrl(url: string): Promise<ParsedVacancy | null> {
  const key = `hh:vac:${hashKey(url)}`;
  return cached(key, 60 * 60, async () => {
    const html = await fetchHtml(url);
    if (!html) return null;
    const $ = load(html);

    const jsonLd = extractJsonLd($);
    const title =
      clean($('[data-qa="vacancy-title"]').first().text()) ||
      clean($('h1').first().text()) ||
      clean(jsonLd?.title as string);

    const company =
      clean($('[data-qa="vacancy-company-name"]').first().text()) ||
      clean(
        (jsonLd?.hiringOrganization as { name?: string } | undefined)?.name,
      );

    const location =
      clean($('[data-qa="vacancy-view-raw-address"]').first().text()) ||
      clean($('[data-qa="vacancy-view-location"]').first().text()) ||
      undefined;

    const salary =
      clean($('[data-qa="vacancy-salary"]').first().text()) ||
      clean($('[data-qa="vacancy-salary-compensation-type-net"]').first().text()) ||
      undefined;

    const description =
      clean($('[data-qa="vacancy-description"]').first().text()) ||
      clean($('div.vacancy-description').first().text()) ||
      clean(jsonLd?.description as string);

    const skills = $('[data-qa="bloko-tag__text"], [data-qa="skills-element"]')
      .map((_, el) => normalizeSkill($(el).text()))
      .get()
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    const rawText = [title, company, location, salary, description, skills.join(', ')]
      .filter(Boolean)
      .join('\n\n');

    if (!title && !description) return null;
    return {
      title: title || 'Вакансия',
      company: company || 'hh.ru',
      location,
      salary,
      description: description || 'Описание не удалось извлечь автоматически.',
      skills,
      rawText,
      source: 'cheerio',
    };
  });
}

export async function parseResumeUrl(url: string): Promise<ParsedResume | null> {
  const key = `hh:res:${hashKey(url)}`;
  return cached(key, 60 * 60, async () => {
    const html = await fetchHtml(url);
    if (!html) return null;
    const $ = load(html);

    const title =
      clean($('[data-qa="resume-block-title-position"]').first().text()) ||
      clean($('h1').first().text());

    const summary =
      clean($('[data-qa="resume-block-skills-text"]').first().text()) ||
      clean($('[data-qa="resume-block-skills"] p').first().text()) ||
      undefined;

    const skills = $('[data-qa="bloko-tag__text"], .bloko-tag__text')
      .map((_, el) => normalizeSkill($(el).text()))
      .get()
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    const experienceYears = (() => {
      const text = clean(
        $('[data-qa="resume-block-experience"] h3').first().text(),
      );
      const match = text.match(/(\d+)/);
      return match?.[1] ? parseInt(match[1], 10) : undefined;
    })();

    const rawText = $('main, [data-qa="resume-personal-name"] , [data-qa="resume-block-experience"], [data-qa="resume-block-skills"]')
      .text();

    if (!title && !rawText) return null;
    return {
      title,
      experienceYears,
      skills,
      summary,
      rawText: clean(rawText),
      source: 'cheerio',
    };
  });
}

export function parseRawResumeText(text: string): ParsedResume {
  const skillMatches =
    text
      .match(/(?:Навыки|Skills|Ключевые навыки)[:\s]+([\s\S]{0,400})/i)?.[1]
      ?.split(/[,;\n]/)
      .map(normalizeSkill)
      .filter((s) => s.length > 1 && s.length < 40) ?? [];
  return {
    skills: Array.from(new Set(skillMatches)),
    rawText: text.trim(),
    source: 'text',
  };
}

export function parseRawVacancyText(text: string): ParsedVacancy {
  const titleMatch = text.match(/^([^\n]{4,120})/);
  return {
    title: titleMatch?.[1]?.trim() ?? 'Вакансия',
    company: 'hh.ru',
    description: text.trim(),
    skills: [],
    rawText: text.trim(),
    source: 'text',
  };
}
