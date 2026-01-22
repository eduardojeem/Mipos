import { NextResponse } from 'next/server';

// Lightweight polling endpoint
// Provides a simple heartbeat payload for clients that rely on /api/sync/poll
// Note: Real data synchronization is managed by the PollingFallbackService and realtime subscriptions

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    message: 'Polling endpoint active. Fallback service manages entity polling.',
  });
}