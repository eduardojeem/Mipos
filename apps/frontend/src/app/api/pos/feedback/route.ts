import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { getUserOrganizationId, validateOrganizationAccess } from '@/app/api/_utils/organization';

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') return null;
  return trimmed;
}

/**
 * POST /api/pos/feedback
 *
 * Persists a CSAT score for a completed sale. Replaces the old
 * localStorage-only flow so reviews are visible across cashiers and
 * persist beyond the device.
 *
 * Body: { saleId: string, score: 1-5 }
 *
 * Idempotent on saleId via UPSERT — if the cashier submits twice the
 * later score wins.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access']);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const saleId = normalizeString(body?.saleId);
    const scoreRaw = Number(body?.score);

    if (!saleId) {
      return NextResponse.json({ error: 'saleId requerido' }, { status: 400 });
    }
    if (!Number.isInteger(scoreRaw) || scoreRaw < 1 || scoreRaw > 5) {
      return NextResponse.json({ error: 'score debe ser un entero entre 1 y 5' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    );
    const organizationId =
      headerOrgId || (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 });
    }

    // Anti-cross-tenant: el SUPER_ADMIN puede dejar feedback en cualquier
    // org; el resto debe ser miembro de la org en cuestión.
    if (auth.userId && auth.userRole !== 'SUPER_ADMIN') {
      const hasAccess = await validateOrganizationAccess(auth.userId, organizationId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 });
      }
    }

    // Verify the sale exists and belongs to this organization. Without this
    // check, a malicious caller could write feedback for a sale of another
    // tenant by guessing IDs.
    const { data: saleRow, error: saleErr } = await supabase
      .from('sales')
      .select('id, organization_id')
      .eq('id', saleId)
      .maybeSingle();

    if (saleErr) {
      console.error('[POS feedback] sale lookup failed:', saleErr.message);
      return NextResponse.json({ error: 'No se pudo validar la venta' }, { status: 500 });
    }
    if (!saleRow) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }
    if (String(saleRow.organization_id) !== String(organizationId)) {
      return NextResponse.json({ error: 'La venta no pertenece a la organización indicada' }, { status: 403 });
    }

    const { error: upsertErr } = await supabase
      .from('sale_feedback')
      .upsert(
        {
          sale_id: saleId,
          organization_id: organizationId,
          score: scoreRaw,
          created_by: auth.userId || null,
        },
        { onConflict: 'sale_id' }
      );

    if (upsertErr) {
      console.error('[POS feedback] upsert failed:', upsertErr.message);
      return NextResponse.json(
        { error: 'No se pudo guardar la evaluación', details: upsertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, saleId, score: scoreRaw });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[POS feedback] unhandled:', message);
    return NextResponse.json({ error: 'Error interno', details: message }, { status: 500 });
  }
}
