import { nanoid } from 'nanoid';
import { LIMITS } from '@resumai/shared';
import type { GenerateResult } from '@resumai/shared';
import { env } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';
import { getOpenAI } from './openai-proxy.js';
import {
  buildAnalystMessages,
  buildWriterMessages,
  type GapAnalysisPayload,
} from './prompts.js';
import type { ParsedResume, ParsedVacancy } from '../parser/hh-scraper.js';

async function callWithRetry<T>(fn: () => Promise<T>, retries = LIMITS.aiRetryCount): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = 300 * 2 ** attempt;
      logger.warn({ err, attempt, delay }, 'AI call failed, retrying');
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

async function runAnalyst(
  resume: ParsedResume,
  vacancy: ParsedVacancy,
): Promise<GapAnalysisPayload> {
  const client = getOpenAI();
  return callWithRetry(async () => {
    const res = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: buildAnalystMessages(resume, vacancy),
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1400,
    });
    const text = res.choices[0]?.message.content ?? '{}';
    const parsed = JSON.parse(text) as GapAnalysisPayload;
    if (!Array.isArray(parsed.gaps) || !Array.isArray(parsed.matches)) {
      throw new Error('Analyst returned malformed JSON');
    }
    return parsed;
  });
}

async function runWriter(
  resume: ParsedResume,
  vacancy: ParsedVacancy,
  matches: GapAnalysisPayload['matches'],
): Promise<string> {
  const client = getOpenAI();
  return callWithRetry(async () => {
    const res = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: buildWriterMessages(resume, vacancy, matches),
      temperature: 0.7,
      max_tokens: 600,
    });
    const text = (res.choices[0]?.message.content ?? '').trim();
    if (!text) throw new Error('Writer returned empty letter');
    return text;
  });
}

export type ProgressReporter = (step: import('@resumai/shared').GenerateStep) => void;

export interface GenerateArgs {
  resume: ParsedResume;
  vacancy: ParsedVacancy;
  credits: number;
  onStep?: ProgressReporter;
}

export async function generateAdaptation({
  resume,
  vacancy,
  credits,
  onStep,
}: GenerateArgs): Promise<GenerateResult> {
  const startedAt = Date.now();
  onStep?.('matching');
  const analyst = await runAnalyst(resume, vacancy);
  onStep?.('writing-letter');
  const coverLetter = await runWriter(resume, vacancy, analyst.matches);

  const previewCoverLetter = coverLetter.split(/\n\n|\n/)[0] ?? coverLetter.slice(0, 280);

  const hasCredits = credits > 0;
  const resultId = nanoid(16);

  return {
    resultId,
    kind: hasCredits ? 'full' : 'preview',
    gaps: analyst.gaps.slice(0, 3),
    matches: analyst.matches.slice(0, 3),
    coverLetter,
    previewCoverLetter,
    creditsRemaining: Math.max(0, credits - (hasCredits ? 1 : 0)),
    model: env.OPENAI_MODEL,
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
  };
}
