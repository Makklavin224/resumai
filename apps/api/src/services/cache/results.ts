import type { GenerateResult } from '@resumai/shared';
import { and, desc, eq } from 'drizzle-orm';
import { getRedis } from './redis.js';
import { logger } from '../../lib/logger.js';
import { db } from '../../db/client.js';
import { generations } from '../../db/schema.js';

const TTL_SECONDS = 60 * 60; // 1 hour

function key(sessionId: string, resultId: string) {
  return `result:${sessionId}:${resultId}`;
}

export async function storeResult(
  sessionId: string,
  result: GenerateResult,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key(sessionId, result.resultId), JSON.stringify(result), 'EX', TTL_SECONDS);
    // Track latest resultId for session
    await redis.set(`result-latest:${sessionId}`, result.resultId, 'EX', TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, sessionId, resultId: result.resultId }, 'failed to cache result');
  }
}

/**
 * Fetch a result: Redis first (fast path), then fall back to
 * generations.result_json in Postgres (durable store). The DB path is
 * what keeps user history alive after the 1-hour Redis TTL.
 */
export async function fetchResult(
  sessionId: string,
  resultId: string,
): Promise<GenerateResult | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(key(sessionId, resultId));
    if (raw) return JSON.parse(raw) as GenerateResult;
  } catch (err) {
    logger.warn({ err }, 'failed to read cached result — falling back to DB');
  }

  try {
    const [row] = await db
      .select({ json: generations.resultJson })
      .from(generations)
      .where(and(eq(generations.sessionId, sessionId), eq(generations.resultId, resultId)))
      .limit(1);
    if (row?.json) return row.json as unknown as GenerateResult;
  } catch (err) {
    logger.warn({ err, sessionId, resultId }, 'DB fallback for result failed');
  }
  return null;
}

export async function unlockLatestResult(sessionId: string): Promise<GenerateResult | null> {
  // Prefer Redis pointer; fall back to the newest row in `generations`.
  try {
    const redis = getRedis();
    const latestId = await redis.get(`result-latest:${sessionId}`);
    if (latestId) {
      const cached = await fetchResult(sessionId, latestId);
      if (cached) {
        if (cached.kind === 'full') return cached;
        const unlocked: GenerateResult = { ...cached, kind: 'full' };
        await storeResult(sessionId, unlocked);
        return unlocked;
      }
    }
  } catch (err) {
    logger.warn({ err }, 'redis latest lookup failed — trying DB');
  }

  const [row] = await db
    .select()
    .from(generations)
    .where(eq(generations.sessionId, sessionId))
    .orderBy(desc(generations.createdAt))
    .limit(1);
  if (!row?.resultJson) return null;
  const cached = row.resultJson as unknown as GenerateResult;
  if (cached.kind === 'full') return cached;
  const unlocked: GenerateResult = { ...cached, kind: 'full' };
  await storeResult(sessionId, unlocked);
  return unlocked;
}
