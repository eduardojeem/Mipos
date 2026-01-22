import type { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function initRedis(client: Redis) {
  redisClient = client;
}

function serialize(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function deserialize<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

// Simple distributed cache API with Redis fallback to in-memory Map
const memoryCache = new Map<string, { data: any; expiresAt: number }>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (redisClient) {
    const val = await redisClient.get(key);
    return deserialize<T>(val);
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  if (redisClient) {
    const seconds = Math.max(1, Math.floor(ttlMs / 1000));
    await redisClient.setex(key, seconds, serialize(value));
    return;
  }
  memoryCache.set(key, { data: value, expiresAt: Date.now() + ttlMs });
}

export async function cacheDel(key: string): Promise<void> {
  if (redisClient) {
    await redisClient.del(key);
    return;
  }
  memoryCache.delete(key);
}