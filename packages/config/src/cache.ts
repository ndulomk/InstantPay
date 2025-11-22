import { redisClient } from "@/config/redis.js";
import { InstantPayLogger } from "@instantpay/utils/src/logger";
const redis = redisClient;

const logger = new InstantPayLogger("CacheService")

export const CacheService = {
  getOrSet: async <T>(
    key: string,
    ttl: number,
    factory: () => Promise<T>
  ): Promise<T> => {
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        logger.error(`JSON inválido para chave ${key}:`)
      }
    }

    const data = await factory();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  },

  get: async <T>(key: string): Promise<T | null> => {
    const cached = await redis.get(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  },

  set: async (key: string, value: any, ttl: number = 3600): Promise<void> => {
    await redis.setex(key, ttl, JSON.stringify(value));
  },

  delete: async (key: string): Promise<void> => {
    await redis.del(key);
  },

  deletePattern: async (pattern: string): Promise<void> => {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  invalidate: async (entity: string, id?: string): Promise<void> => {
    const patterns = [
      `${entity}:*`,
      `${entity}:list:*`,
      id ? `${entity}:${id}` : null,
      id ? `${entity}:${id}:*` : null,
    ].filter(Boolean) as string[];

    await Promise.all(patterns.map((p) => CacheService.deletePattern(p)));
  },

  flush: async (): Promise<void> => {
    await redis.flushdb();
  },
};