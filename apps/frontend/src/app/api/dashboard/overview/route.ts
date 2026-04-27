import { NextRequest, NextResponse } from 'next/server';
import { fetchDashboardOverview } from '@/lib/dashboard/dashboard-data';
import { cookies } from 'next/headers';
import { getValidatedOrganizationId } from '@/lib/organization';

export async function GET(request: NextRequest) {
  try {
    // 1. Header explícito (enviado por el cliente)
    let organizationId = request.headers.get('x-organization-id')?.trim() || null;

    // 2. Cookie fallback
    if (!organizationId) {
      const cookieStore = await cookies();
      organizationId = cookieStore.get('x-organization-id')?.value?.trim() || null;
    }

    // 3. Validación via Supabase auth como último recurso
    if (!organizationId) {
      organizationId = await getValidatedOrganizationId(request);
    }

    if (!organizationId) {
      console.warn('[dashboard/overview] No organizationId resolved from header, cookie, or auth');
      // Sin organización, devolver datos vacíos en vez de error 400
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
      { error: 'Failed to fetch dashboard overview', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
