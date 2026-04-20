import { Redis } from 'ioredis';
import { createHash } from 'node:crypto';
import { env } from '../../lib/env.js';
import { logger } from '../../lib/logger.js';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      // Queue commands while the initial connection is establishing so
      // an early request doesn't race with the TCP handshake.
      enableOfflineQueue: true,
      connectTimeout: 5_000,
    });
    client.on('error', (err) => logger.warn({ err }, 'redis error'));
  }
  return client;
}

export function hashKey(...parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

/**
 * Get-or-compute wrapper. Stores JSON-serialized values with the given TTL.
 * Gracefully bypasses the cache on redis failure.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (err) {
    logger.warn({ err, key }, 'redis read failed, bypassing cache');
  }
  const fresh = await compute();
  try {
    await redis.set(key, JSON.stringify(fresh), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'redis write failed, skipping store');
  }
  return fresh;
}
