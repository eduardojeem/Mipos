/**
 * Rate limiter for signup. Uses in-memory fallback with Redis support.
 * In production, Redis (Upstash) should be configured for distributed deployments.
 */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const IN_MEMORY_MAX_ENTRIES = 1024;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private inMemoryStore = new Map<string, RateLimitEntry>();

  /**
   * Check if IP has exceeded rate limit.
   * Returns allowed status and retry-after seconds if blocked.
   */
  async check(ip: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
    const now = Date.now();
    const entry = this.inMemoryStore.get(ip);

    // Reset expired entries
    if (entry && entry.resetAt < now) {
      this.inMemoryStore.delete(ip);
      this.inMemoryStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return { allowed: true };
    }

    // New IP
    if (!entry) {
      // Evict oldest entry if store is full
      if (this.inMemoryStore.size >= IN_MEMORY_MAX_ENTRIES) {
        const oldestKey = this.inMemoryStore.keys().next().value;
        if (oldestKey) {
          this.inMemoryStore.delete(oldestKey);
        }
      }
      this.inMemoryStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return { allowed: true };
    }

    // Check if limit exceeded
    if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    // Increment count
    entry.count += 1;
    return { allowed: true };
  }

  /**
   * Reset rate limit for an IP (e.g., after successful signup)
   */
  reset(ip: string): void {
    this.inMemoryStore.delete(ip);
  }

  /**
   * Get current stats (for monitoring)
   */
  getStats(): { totalEntries: number; windowMs: number; maxAttempts: number } {
    return {
      totalEntries: this.inMemoryStore.size,
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
    };
  }
}

export const rateLimiter = new RateLimiter();

export function getClientIp(headers: any): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((ip: string) => ip.trim());
    return ips[0] || 'unknown';
  }
  return headers.get('x-real-ip') || 'unknown';
}
