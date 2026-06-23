import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory rate limiter using sliding window algorithm
 * For production, replace with Redis-backed solution (Upstash, etc)
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
  statusCode?: number;
}

interface RequestLog {
  timestamps: number[];
}

// In-memory store (should be replaced with Redis in production)
const requestLogs = new Map<string, RequestLog>();

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

/**
 * Rate limit middleware using sliding window algorithm
 * @param config Configuration for rate limiting
 * @returns Middleware function that returns a response if rate limit exceeded, or null if allowed
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    maxRequests,
    windowMs,
    message = 'Too many requests, please try again later',
    statusCode = 429,
  } = config;

  return (request: NextRequest) => {
    const clientId = getClientId(request);
    const now = Date.now();

    // Get or create request log for this client
    let log = requestLogs.get(clientId);
    if (!log) {
      log = { timestamps: [] };
      requestLogs.set(clientId, log);
    }

    // Remove old timestamps outside the window
    log.timestamps = log.timestamps.filter((timestamp) => now - timestamp < windowMs);

    // Check if limit exceeded
    if (log.timestamps.length >= maxRequests) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
          },
        },
        {
          status: statusCode,
          headers: {
            'Retry-After': String(Math.ceil((log.timestamps[0] + windowMs - now) / 1000)),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(new Date(log.timestamps[0] + windowMs).toISOString()),
          },
        }
      );
    }

    // Add current request timestamp
    log.timestamps.push(now);

    // Return null if allowed (not rate limited)
    return null;
  };
}

/**
 * Create a response with rate limit headers
 */
export function addRateLimitHeaders(response: NextResponse, config: RateLimitConfig, remaining: number): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  response.headers.set(
    'X-RateLimit-Reset',
    String(new Date(Date.now() + config.windowMs).toISOString())
  );
  return response;
}

/**
 * Predefined rate limit configs by operation type
 */
export const RATE_LIMITS = {
  // Read operations (loose)
  READ: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000,
    message: 'Too many read requests. Please wait.',
  },
  // Write operations (moderate)
  WRITE: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
    message: 'Too many write requests. Please wait.',
  },
  // Bulk operations (strict)
  BULK: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000,
    message: 'Too many bulk operations. Please wait.',
  },
  // Export operations (very strict)
  EXPORT: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    message: 'Too many export requests. Please wait 15 minutes.',
  },
  // Admin operations (strict)
  ADMIN: {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000,
    message: 'Too many admin operations. Please wait.',
  },
  // Search operations (moderate)
  SEARCH: {
    maxRequests: 500,
    windowMs: 15 * 60 * 1000,
    message: 'Too many search requests. Please wait.',
  },
  // Auth operations (very strict)
  AUTH: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    message: 'Too many authentication attempts. Please wait 15 minutes.',
  },
};

/**
 * Clean up old entries periodically (run in background)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  const maxWindow = 60 * 60 * 1000; // 1 hour

  for (const [clientId, log] of requestLogs.entries()) {
    // Keep only recent timestamps
    log.timestamps = log.timestamps.filter((timestamp) => now - timestamp < maxWindow);

    // Remove empty entries
    if (log.timestamps.length === 0) {
      requestLogs.delete(clientId);
    }
  }
}

// Clean up every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 10 * 60 * 1000);
}
