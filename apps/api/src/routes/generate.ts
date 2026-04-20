import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { HH_URL_REGEX, LIMITS, type GenerateResult } from '@resumai/shared';
import { env } from '../lib/env.js';
import { ensureSession, deductCredit } from '../services/session/credits.js';
import {
  parseRawResumeText,
  parseRawVacancyText,
  parseResumeUrl,
  parseVacancyUrl,
  type ParsedResume,
  type ParsedVacancy,
} from '../services/parser/hh-scraper.js';
import { extractResumeDocument } from '../services/parser/pdf-extract.js';
import { generateAdaptation } from '../services/ai/generator.js';
import { storeResult, fetchResult, unlockLatestResult } from '../services/cache/results.js';
import { db } from '../db/client.js';
import { errorLogs, generations, sessions as sessionsTable, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * In-memory semaphore for concurrent AI generations. The proxy + OpenAI
 * account have shared RPM/TPM limits, and PDF parsing blocks the event loop,
 * so we never want more than ~30 generations flying at once per node. When
 * the waiting queue is full we fail fast with 503 instead of piling up
 * indefinite promises.
 */
const GEN_MAX_CONCURRENT = 30;
const GEN_MAX_QUEUE = 60;
let genActive = 0;
const genQueue: Array<() => void> = [];

async function withGenSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (genActive >= GEN_MAX_CONCURRENT) {
    if (genQueue.length >= GEN_MAX_QUEUE) {
      const err = new Error('Сервис перегружен — попробуйте через минуту') as Error & {
        statusCode?: number;
        code?: string;
      };
      err.statusCode = 503;
      err.code = 'OVERLOADED';
      throw err;
    }
    await new Promise<void>((resolve) => genQueue.push(resolve));
  }
  genActive++;
  try {
    return await fn();
  } finally {
    genActive--;
    genQueue.shift()?.();
  }
}

async function assertNotBlocked(sessionId: string) {
  const [row] = await db
    .select({ isBlocked: users.isBlocked })
    .from(sessionsTable)
    .leftJoin(users, eq(users.id, sessionsTable.userId))
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);
  if (row?.isBlocked) {
    const err = new Error('Ваш аккаунт заблокирован — обратитесь в поддержку') as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 403;
    err.code = 'BLOCKED';
    throw err;
  }
}

const TextPartSchema = z.object({
  type: z.literal('text'),
  value: z.string().min(LIMITS.resumeTextMin).max(LIMITS.resumeTextMax),
});

const UrlPartSchema = z.object({
  type: z.literal('url'),
  value: z.string().url().regex(HH_URL_REGEX, { message: 'Неверная ссылка hh.ru' }),
});

const ResumeJsonSchema = z.discriminatedUnion('type', [TextPartSchema, UrlPartSchema]);
const VacancyJsonSchema = z.discriminatedUnion('type', [TextPartSchema, UrlPartSchema]);

type ResumeKind = 'pdf' | 'text' | 'url';
type VacancyKind = 'text' | 'url';

function toPreview(full: GenerateResult): GenerateResult {
  // v3.0 preview: more to show, more to tease. Keep the recruiter
  // monologue and profile snapshot (high virality), 2 gaps + 2 matches,
  // and exactly one rejection risk. Everything else stripped so the UI
  // can show blur-teasers ("ещё 6 рисков скрыто…").
  return {
    ...full,
    kind: 'preview',
    gaps: full.gaps.slice(0, 2),
    matches: full.matches.slice(0, 2),
    coverLetter: full.previewCoverLetter,
    rejectionRisks: full.rejectionRisks?.slice(0, 1),
    // Wipe the strategy / flags / signals — keep the cost of unlock high.
    responseStrategy: undefined,
    redFlags: undefined,
    greenFlags: undefined,
    signals: undefined,
  };
}

async function logError(sessionId: string | null, code: string, meta: Record<string, unknown>) {
  try {
    await db.insert(errorLogs).values({
      sessionId: sessionId ?? null,
      type: 'AI',
      code,
      metadata: meta as never,
    });
  } catch {
    /* non-fatal */
  }
}

async function collectMultipart(req: FastifyRequest) {
  let resumeKind: ResumeKind | null = null;
  let resumeText = '';
  let resumeUrl = '';
  let resumeFile: Buffer | null = null;
  let vacancyKind: VacancyKind | null = null;
  let vacancyText = '';
  let vacancyUrl = '';

  for await (const part of req.parts()) {
    if (part.type === 'file' && part.fieldname === 'resumePdf') {
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of part.file) {
        total += (chunk as Buffer).length;
        if (total > LIMITS.pdfMaxBytes) {
          throw req.server.httpErrors.payloadTooLarge('PDF больше 10 МБ');
        }
        chunks.push(chunk as Buffer);
      }
      resumeFile = Buffer.concat(chunks);
      resumeKind ??= 'pdf';
    } else if (part.type === 'field') {
      switch (part.fieldname) {
        case 'resumeType':
          resumeKind = part.value as ResumeKind;
          break;
        case 'resumeText':
          resumeText = String(part.value ?? '');
          break;
        case 'resumeUrl':
          resumeUrl = String(part.value ?? '');
          break;
        case 'vacancyType':
          vacancyKind = part.value as VacancyKind;
          break;
        case 'vacancyText':
          vacancyText = String(part.value ?? '');
          break;
        case 'vacancyUrl':
          vacancyUrl = String(part.value ?? '');
          break;
      }
    }
  }

  return {
    resumeKind,
    resumeText,
    resumeUrl,
    resumeFile,
    vacancyKind,
    vacancyText,
    vacancyUrl,
  };
}

async function resolveResume(
  req: FastifyRequest,
  parts: Awaited<ReturnType<typeof collectMultipart>>,
): Promise<ParsedResume> {
  if (parts.resumeKind === 'pdf' && parts.resumeFile) {
    const doc = await extractResumeDocument(parts.resumeFile);
    if (doc.text.length < LIMITS.resumeTextMin) {
      throw req.server.httpErrors.badRequest('В документе слишком мало текста');
    }
    return { ...parseRawResumeText(doc.text), source: 'pdf' };
  }
  if (parts.resumeKind === 'text') return parseRawResumeText(parts.resumeText);
  if (parts.resumeKind === 'url') {
    const parsed = await parseResumeUrl(parts.resumeUrl);
    if (!parsed) throw req.server.httpErrors.badRequest('Не удалось прочитать резюме по ссылке');
    return parsed;
  }
  throw req.server.httpErrors.badRequest('Не передано резюме');
}

async function resolveVacancy(
  req: FastifyRequest,
  parts: Awaited<ReturnType<typeof collectMultipart>>,
): Promise<ParsedVacancy> {
  if (parts.vacancyKind === 'text') return parseRawVacancyText(parts.vacancyText);
  if (parts.vacancyKind === 'url') {
    const parsed = await parseVacancyUrl(parts.vacancyUrl);
    if (!parsed) throw req.server.httpErrors.badRequest('Не удалось прочитать вакансию по ссылке');
    return parsed;
  }
  throw req.server.httpErrors.badRequest('Не передана вакансия');
}

async function loadFromJson(
  req: FastifyRequest,
): Promise<{ resume: ParsedResume; vacancy: ParsedVacancy }> {
  const body = req.body as { resume?: unknown; vacancy?: unknown } | undefined;
  const resumeRaw = ResumeJsonSchema.parse(body?.resume);
  const vacancyRaw = VacancyJsonSchema.parse(body?.vacancy);

  const resume =
    resumeRaw.type === 'text'
      ? parseRawResumeText(resumeRaw.value)
      : await parseResumeUrl(resumeRaw.value).then((r) => {
          if (!r) throw req.server.httpErrors.badRequest('Не удалось прочитать резюме по ссылке');
          return r;
        });

  const vacancy =
    vacancyRaw.type === 'text'
      ? parseRawVacancyText(vacancyRaw.value)
      : await parseVacancyUrl(vacancyRaw.value).then((v) => {
          if (!v) throw req.server.httpErrors.badRequest('Не удалось прочитать вакансию по ссылке');
          return v;
        });

  return { resume, vacancy };
}

export const generateRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/api/generate',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_GENERATE_PER_HOUR,
          timeWindow: '1 hour',
          keyGenerator: (req) => req.cookies?.resumai_sid ?? req.ip,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const session = await ensureSession(req, reply);
      try {
        await assertNotBlocked(session.sessionId);
        const isMultipart = (req.headers['content-type'] ?? '').startsWith('multipart/');
        const payload = isMultipart
          ? await (async () => {
              const parts = await collectMultipart(req);
              const [resume, vacancy] = await Promise.all([
                resolveResume(req, parts),
                resolveVacancy(req, parts),
              ]);
              return { resume, vacancy };
            })()
          : await loadFromJson(req);

        const result = await withGenSlot(() =>
          generateAdaptation({
            resume: payload.resume,
            vacancy: payload.vacancy,
            credits: session.credits,
          }),
        );

        if (result.kind === 'full' && session.credits > 0) {
          result.creditsRemaining = await deductCredit(session.sessionId);
        }
        await storeResult(session.sessionId, result);

        // Persist generation metadata for profile + admin history.
        const [currentSession] = await db
          .select()
          .from(sessionsTable)
          .where(eq(sessionsTable.id, session.sessionId));
        await db
          .insert(generations)
          .values({
            sessionId: session.sessionId,
            userId: currentSession?.userId ?? null,
            resultId: result.resultId,
            vacancyTitle: payload.vacancy.title,
            vacancyCompany: payload.vacancy.company,
            resumeTitle: payload.resume.title ?? null,
            kind: result.kind,
            resultJson: result as never,
            model: result.model,
            durationMs: result.durationMs,
          })
          .catch(() => {
            // Non-fatal — history save must never kill the response.
          });

        return reply.send(result.kind === 'full' ? result : toPreview(result));
      } catch (err) {
        const code =
          err instanceof Error && 'code' in err && typeof (err as { code: unknown }).code === 'string'
            ? (err as { code: string }).code
            : 'INTERNAL';
        await logError(session.sessionId, code, { message: (err as Error).message });
        throw err;
      }
    },
  );

  app.get<{ Params: { id: string } }>('/api/result/:id', async (req, reply) => {
    const session = await ensureSession(req, reply);
    // "__LATEST__" is the placeholder YooKassa-return_url carries back to
    // the user after payment. Resolve it to the session's most recent
    // result so the cabinet shows something meaningful instead of 404.
    if (req.params.id === '__LATEST__') {
      const latest = await unlockLatestResult(session.sessionId);
      if (!latest) return reply.status(404).send({ error: 'not found', code: 'INTERNAL' });
      return reply.send(latest);
    }
    const result = await fetchResult(session.sessionId, req.params.id);
    if (!result) return reply.status(404).send({ error: 'not found', code: 'INTERNAL' });
    return reply.send(result.kind === 'full' ? result : toPreview(result));
  });
};
