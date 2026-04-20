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
import { storeResult, fetchResult } from '../services/cache/results.js';
import { db } from '../db/client.js';
import { errorLogs } from '../db/schema.js';

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
  return {
    ...full,
    kind: 'preview',
    gaps: full.gaps.slice(0, 1),
    matches: full.matches.slice(0, 1),
    coverLetter: full.previewCoverLetter,
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

        const result = await generateAdaptation({
          resume: payload.resume,
          vacancy: payload.vacancy,
          credits: session.credits,
        });

        if (result.kind === 'full' && session.credits > 0) {
          result.creditsRemaining = await deductCredit(session.sessionId);
        }
        await storeResult(session.sessionId, result);
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
    const result = await fetchResult(session.sessionId, req.params.id);
    if (!result) return reply.status(404).send({ error: 'not found', code: 'INTERNAL' });
    return reply.send(result.kind === 'full' ? result : toPreview(result));
  });
};
