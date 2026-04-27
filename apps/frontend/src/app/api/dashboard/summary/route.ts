import { NextRequest, NextResponse } from 'next/server';
import { fetchDashboardSummary } from '@/lib/dashboard/dashboard-data';
import { cookies } from 'next/headers';
import { getValidatedOrganizationId } from '@/lib/organization';

type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y';

function normalizeRange(value: string | null): TimeRange {
  if (value === '24h' || value === '7d' || value === '30d' || value === '90d' || value === '1y') {
    return value;
  }
  return '30d';
}

async function resolveOrganizationId(request: NextRequest): Promise<string | null> {
  const headerOrgId = request.headers.get('x-organization-id')?.trim();
  if (headerOrgId) {
    return headerOrgId;
  }

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get('x-organization-id')?.value?.trim();
  return cookieOrgId || null;
}

export async function GET(request: NextRequest) {
  try {
    let organizationId = await resolveOrganizationId(request);
    if (!organizationId) {
      organizationId = await getValidatedOrganizationId(request);
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization header missing' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const range = normalizeRange(url.searchParams.get('range'));
    const data = await fetchDashboardSummary(organizationId, range);

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
