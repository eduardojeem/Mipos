import { NextRequest, NextResponse } from 'next/server';
import { redisRateLimiter } from '../rate-limiter-redis';

/**
 * DEBUG ENDPOINT - Rate limiter statistics
 *
 * Returns information about the rate limiter backend and in-memory store
 *
 * WARNING: This endpoint exposes internal state. Only use in development or protect with auth.
 */

// This endpoint should only be accessible in development or with proper auth
function isAuthorized(request: NextRequest): boolean {
  // In production, add proper auth check here
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.DEBUG_TOKEN;
    return !!(expectedToken && authHeader === `Bearer ${expectedToken}`);
  }
  return true; // Allow in development
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const stats = redisRateLimiter.getStats();

    return NextResponse.json({
      success: true,
      message: 'Rate limiter statistics',
      data: {
        backend: stats.backend,
        inMemoryEntries: stats.inMemoryEntries,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        redisConfigured: !!(
          process.env.UPSTASH_REDIS_REST_URL &&
          process.env.UPSTASH_REDIS_REST_TOKEN
        ),
      },
      notes: {
        backend: 'Which backend is being used (redis or in-memory)',
        inMemoryEntries: 'Number of entries in in-memory store (max 1024)',
        redisConfigured: 'Whether Redis environment variables are present',
      },
    });
  } catch (error) {
    console.error('[stats] Error getting rate limiter stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get statistics',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Manual rate limit reset
 *
 * Reset rate limit for a specific IP (useful for testing)
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { ip } = body;

    if (!ip) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      );
    }

    await redisRateLimiter.reset(ip);

    return NextResponse.json({
      success: true,
      message: `Rate limit reset for IP: ${ip}`,
      ip,
    });
  } catch (error) {
    console.error('[stats] Error resetting rate limit:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset rate limit',
      },
      { status: 500 }
    );
  }
}
