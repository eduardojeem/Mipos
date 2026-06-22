/**
 * Redis-based rate limiter for distributed deployments.
 * Use this in production with Upstash Redis or similar.
 * Fallback to in-memory if Redis unavailable.
 */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

interface RedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { ex?: number }) => Promise<void>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<void>;
  del: (key: string) => Promise<void>;
}

/**
 * Get Redis client from environment or return null if not configured
 */
function getRedisClient(): RedisClient | null {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (!redisUrl) {
    console.warn('[rate-limiter] Redis not configured, using in-memory fallback');
    return null;
  }

  // For Upstash REST API
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!token) {
    console.warn('[rate-limiter] Upstash token missing, using in-memory fallback');
    return null;
  }

  return {
    get: async (key: string) => {
      const response = await fetch(`${redisUrl}/get/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.result;
    },

    set: async (key: string, value: string, options?: { ex?: number }) => {
      const path = options?.ex
        ? `/set/${key}/${value}/EX/${options.ex}`
        : `/set/${key}/${value}`;

      const response = await fetch(`${redisUrl}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Redis set failed: ${response.statusText}`);
      }
    },

    incr: async (key: string) => {
      const response = await fetch(`${redisUrl}/incr/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Redis incr failed: ${response.statusText}`);
      }

      const data = await response.json();
      return parseInt(data.result, 10);
    },

    expire: async (key: string, seconds: number) => {
      const response = await fetch(`${redisUrl}/expire/${key}/${seconds}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Redis expire failed: ${response.statusText}`);
      }
    },

    del: async (key: string) => {
      const response = await fetch(`${redisUrl}/del/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Redis del failed: ${response.statusText}`);
      }
    },
  };
}

class RedisRateLimiter {
  private redis: RedisClient | null;
  private inMemoryFallback = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    this.redis = getRedisClient();
  }

  async check(ip: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
    // Try Redis first
    if (this.redis) {
      try {
        const key = `signup_ratelimit:${ip}`;
        const current = await this.redis.incr(key);

        if (current === 1) {
          // First request, set expiration
          await this.redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
        }

        if (current > RATE_LIMIT_MAX_ATTEMPTS) {
          // Get TTL to return retry-after
          const ttlResponse = await (this.redis as any).ttl?.(key);
          const retryAfterSeconds = ttlResponse ? Math.ceil(ttlResponse / 1000) : 60;
          return { allowed: false, retryAfterSeconds };
        }

        return { allowed: true };
      } catch (redisError) {
        console.error('[rate-limiter] Redis error, falling back to in-memory:', redisError);
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    return this.checkInMemory(ip);
  }

  private checkInMemory(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const entry = this.inMemoryFallback.get(ip);

    if (!entry || entry.resetAt < now) {
      this.inMemoryFallback.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return { allowed: true };
    }

    if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    entry.count += 1;
    return { allowed: true };
  }

  async reset(ip: string): Promise<void> {
    // Redis
    if (this.redis) {
      try {
        await this.redis.del(`signup_ratelimit:${ip}`);
        return;
      } catch (redisError) {
        console.error('[rate-limiter] Redis reset error:', redisError);
      }
    }

    // In-memory fallback
    this.inMemoryFallback.delete(ip);
  }

  getStats(): {
    backend: 'redis' | 'in-memory';
    inMemoryEntries: number;
  } {
    return {
      backend: this.redis ? 'redis' : 'in-memory',
      inMemoryEntries: this.inMemoryFallback.size,
    };
  }
}

export const redisRateLimiter = new RedisRateLimiter();
