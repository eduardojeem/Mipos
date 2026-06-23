import { NextRequest, NextResponse } from 'next/server';
import { fetchDashboardOverview } from '@/lib/dashboard/dashboard-data';
import { getValidatedOrganizationId } from '@/lib/organization';
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

const rateLimiter = rateLimit(RATE_LIMITS.READ);

export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const organizationId = await getValidatedOrganizationId(request);

    if (!organizationId) {
      console.warn('[dashboard/overview] No organizationId resolved from auth context');
      const emptyData = await fetchDashboardOverview(null);
      return NextResponse.json(
        { success: true, data: emptyData },
        { headers: { 'Cache-Control': 'private, max-age=10' } }
      );
    }

    console.log('[dashboard/overview] Fetching data for org:', organizationId);
    const data = await fetchDashboardOverview(organizationId);

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard overview',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
