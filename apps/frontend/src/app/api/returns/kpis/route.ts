import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import {
  getUserOrganizationId,
  validateOrganizationAccess,
} from '@/app/api/_utils/organization';

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return null;
  return trimmed;
}

/**
 * GET /api/returns/kpis?period=30
 *
 * Returns the dashboard KPI bundle for /dashboard/returns:
 *   - counts + amounts by status
 *   - return rate vs sales in window
 *   - avg processing time (seconds)
 *   - top products, reasons, cashiers
 *   - fraud signals (self-returns)
 *
 * Computed server-side via the get_returns_kpis() Postgres RPC
 * (migration 20260515_returns_kpis_rpc.sql) — was previously aggregated
 * client-side from a paginated list, which only saw page 1.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['returns.view']);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    );
    const organizationId =
      headerOrgId ||
      (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 });
    }

    if (auth.userId && auth.userRole !== 'SUPER_ADMIN') {
      const hasAccess = await validateOrganizationAccess(auth.userId, organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 });
      }
    }

    const periodRaw = Number(request.nextUrl.searchParams.get('period') || 30);
    // Clamp to 1..365 to keep the RPC bounded.
    const periodDays = Math.min(365, Math.max(1, Number.isFinite(periodRaw) ? periodRaw : 30));

    const supabase = await createAdminClient();
    const { data, error } = await supabase.rpc('get_returns_kpis', {
      p_organization_id: organizationId,
      p_period_days: periodDays,
    });

    if (error) {
      console.error('[returns/kpis] RPC error:', error.message);
      return NextResponse.json(
        { error: 'No se pudieron calcular las métricas de devoluciones', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { kpis: data, period_days: periodDays },
      {
        // Métricas pueden tolerar 1-2 min de staleness y se piden en cada
        // visita al dashboard de returns; cache + SWR amortiza.
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[returns/kpis] unhandled:', message);
    return NextResponse.json({ error: 'Error interno', details: message }, { status: 500 });
  }
}
