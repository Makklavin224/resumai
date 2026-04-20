import type { GenerateResult } from '@resumai/shared';
import { getRedis } from './redis.js';
import { logger } from '../../lib/logger.js';

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

export async function fetchResult(
  sessionId: string,
  resultId: string,
): Promise<GenerateResult | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get(key(sessionId, resultId));
    if (!raw) return null;
    return JSON.parse(raw) as GenerateResult;
  } catch (err) {
    logger.warn({ err }, 'failed to read cached result');
    return null;
  }
}

export async function unlockLatestResult(sessionId: string): Promise<GenerateResult | null> {
  const redis = getRedis();
  const latestId = await redis.get(`result-latest:${sessionId}`);
  if (!latestId) return null;
  const cached = await fetchResult(sessionId, latestId);
  if (!cached) return null;
  if (cached.kind === 'full') return cached;
  const unlocked: GenerateResult = { ...cached, kind: 'full' };
  await storeResult(sessionId, unlocked);
  return unlocked;
}
