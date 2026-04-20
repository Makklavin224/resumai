import { nanoid } from 'nanoid';
import { LIMITS } from '@resumai/shared';
import type { GenerateResult } from '@resumai/shared';
import { env } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';
import { getOpenAI } from './openai-proxy.js';
import {
  buildAnalystMessages,
  buildWriterMessages,
  SYSTEM_ANALYST_DEFAULT,
  SYSTEM_WRITER_DEFAULT,
  type GapAnalysisPayload,
  type MatchItem,
} from './prompts.js';
import { getSetting, SETTING_KEYS } from '../settings/app-settings.js';
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
  const [client, override] = await Promise.all([
    getOpenAI(),
    getSetting(SETTING_KEYS.promptAnalyst).catch(() => null),
  ]);
  const systemPrompt = override ?? SYSTEM_ANALYST_DEFAULT;
  return callWithRetry(async () => {
    const res = await client.chat.completions.create(
      {
        // Cost-vs-quality: analyst is a structured JSON task — gpt-4o-mini
        // is 8–10× cheaper than gpt-4o and handles this schema well.
        // Override via OPENAI_MODEL if you want full 4o quality.
        model: env.OPENAI_FALLBACK_MODEL,
        messages: buildAnalystMessages(resume, vacancy, systemPrompt),
        response_format: { type: 'json_object' },
        temperature: 0.35,
        max_tokens: 3500,
        top_p: 0.9,
        frequency_penalty: 0.1,
      },
      { timeout: 120_000 },
    );
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
  matches: MatchItem[],
  recruiterHook?: string,
  codeWord?: string | null,
  targetPositioning?: string,
): Promise<string> {
  const [client, override] = await Promise.all([
    getOpenAI(),
    getSetting(SETTING_KEYS.promptWriter).catch(() => null),
  ]);
  const systemPrompt = override ?? SYSTEM_WRITER_DEFAULT;
  return callWithRetry(async () => {
    const res = await client.chat.completions.create(
      {
        // Writer is a short creative task; gpt-4o-mini keeps the letter
        // grounded and costs ~10× less than full 4o.
        model: env.OPENAI_FALLBACK_MODEL,
        messages: buildWriterMessages(
          resume,
          vacancy,
          matches,
          recruiterHook,
          codeWord,
          targetPositioning,
          systemPrompt,
        ),
        temperature: 0.7,
        max_tokens: 700,
        top_p: 0.95,
        presence_penalty: 0.3,
      },
      { timeout: 60_000 },
    );
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
  const coverLetter = await runWriter(
    resume,
    vacancy,
    analyst.matches,
    analyst.recruiterHook,
    analyst.codeWord,
    analyst.targetPositioning,
  );

  const previewCoverLetter = coverLetter.split(/\n\n|\n/)[0] ?? coverLetter.slice(0, 280);

  const hasCredits = credits > 0;
  const resultId = nanoid(16);

  return {
    resultId,
    kind: hasCredits ? 'full' : 'preview',
    // v3.0: 14/10 ceilings — analyst is instructed to aim for 10–14 gaps, 8–10 matches.
    gaps: analyst.gaps.slice(0, 14),
    matches: analyst.matches.slice(0, 10),
    coverLetter,
    previewCoverLetter,
    creditsRemaining: Math.max(0, credits - (hasCredits ? 1 : 0)),
    model: env.OPENAI_MODEL,
    tokensUsed: 0,
    durationMs: Date.now() - startedAt,
    // v3.0 enrichment passthrough.
    profileSnapshot: analyst.profileSnapshot,
    recruiterInnerMonologue: analyst.recruiterInnerMonologue,
    targetPositioning: analyst.targetPositioning,
    recruiterHook: analyst.recruiterHook,
    codeWord: analyst.codeWord ?? null,
    coverageScore: analyst.coverageScore,
    interviewProbability: analyst.interviewProbability,
    signals: analyst.signals,
    redFlags: analyst.redFlags,
    greenFlags: analyst.greenFlags,
    rejectionRisks: analyst.rejectionRisks,
    responseStrategy: analyst.responseStrategy,
  };
}
