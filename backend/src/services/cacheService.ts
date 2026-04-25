import { createHash } from 'crypto';
import { getRedisClient } from '../config/redisClient';
import { logger } from '../utils/logger';

const DEFAULT_TTL_SECONDS = 120;

const sortObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObject((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

export const buildCacheKey = (
  namespace: string,
  identifier: string,
  payload: Record<string, unknown>
): string => {
  const normalized = JSON.stringify(sortObject(payload));
  const hash = createHash('md5').update(normalized).digest('hex');
  return `${namespace}:${identifier}:${hash}`;
};

export const getCachedValue = async <T = unknown>(key: string): Promise<T | null> => {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const cached = await client.get(key);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached) as T;
  } catch (error) {
    logger.warn('No fue posible recuperar el valor en cache', { key, error });
    return null;
  }
};

export const setCachedValue = async (
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> => {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.set(key, JSON.stringify(value), {
      EX: ttlSeconds
    });
  } catch (error) {
    logger.warn('No fue posible almacenar el valor en cache', { key, error });
  }
};

export const deleteCachedValue = async (key: string): Promise<void> => {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.del(key);
  } catch (error) {
    logger.warn('No fue posible eliminar la clave del cache', { key, error });
  }
};

export const invalidateCacheByPattern = async (pattern: string): Promise<void> => {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const keysToDelete: string[] = [];
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keysToDelete.push(key as string);
    }

    if (keysToDelete.length > 0) {
      await client.del(keysToDelete);
      logger.debug('Cache invalidated by pattern', {
        pattern,
        removedKeys: keysToDelete.length
      });
    }
  } catch (error) {
    logger.warn('Fallo al invalidar claves por patrón', { pattern, error });
  }
};

export const CACHE_NAMESPACES = {
  MEDICAL_HISTORIES: 'medicalHistories',
  MEDICAL_HISTORY: 'medicalHistory',
  MEDICAL_HISTORY_STATS: 'medicalHistoryStats',
  MEDICAL_HISTORY_DIAGNOSES: 'medicalHistoryDiagnoses',
  MEDICAL_HISTORY_AGE_STATS: 'medicalHistoryAgeStats',
  ALERTS: 'alerts',
  ALERT_SUMMARY: 'alertSummary'
} as const;

export const TEN_MINUTES = 600;
export const FIVE_MINUTES = 300;

