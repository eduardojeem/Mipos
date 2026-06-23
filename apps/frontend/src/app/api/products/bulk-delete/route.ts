import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { assertCsrf } from '@/app/api/_utils/csrf';

// La columna deleted_at puede no existir todavía (42703)
function isMissingDeletedAt(error: { code?: string; message?: string } | null) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42703' || (message.includes('deleted_at') && message.includes('column'));
}


export async function POST(request: NextRequest) {
  try {
    const csrf = assertCsrf(request);
    if (!csrf.ok) return csrf.response;

    const auth = await requirePOSPermissions(request, [
      'products.delete',
      'products.remove',
      'products.write',
      'products.manage',
    ]);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const orgId = await requireOrganization(request);
    const body = await request.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((id: unknown) => String(id || '').trim()).filter(Boolean)
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: 'Product IDs array is required' }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: 'Cannot delete more than 100 products at once' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    // ── SOFT-DELETE (papelera): mover todos los seleccionados a la papelera ──
    // deleted_at = now, is_active = false. Reversible vía restore.
    const { data: trashed, error } = await supabase
      .from('products')
      .update({ deleted_at: now, is_active: false, updated_at: now })
      .eq('organization_id', orgId)
      .in('id', ids)
      .is('deleted_at', null) // no re-procesar los ya eliminados
      .select('id');

    // Fallback: si deleted_at no existe aún, desactivar
    if (error && isMissingDeletedAt(error)) {
      const { data: deactivated, error: deactErr } = await supabase
        .from('products')
        .update({ is_active: false, updated_at: now })
        .eq('organization_id', orgId)
        .in('id', ids)
        .select('id');
      if (deactErr) throw deactErr;
      const count = deactivated?.length || 0;
      const response = NextResponse.json({
        success: true,
        results: { deleted: 0, deactivated: count, errors: [] },
        message: `${count} producto(s) desactivado(s). Migra deleted_at para habilitar la papelera.`,
      });
      response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
      return response;
    }
    if (error) throw error;

    const count = trashed?.length || 0;
    const response = NextResponse.json({
      success: true,
      results: { deleted: 0, deactivated: 0, trashed: count, errors: [] },
      message: `${count} producto(s) movido(s) a la papelera.`,
    });
    response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    return response;
  } catch (error) {
    console.error('Bulk delete products error:', {
      errorCode: (error as any)?.code,
      timestamp: new Date().toISOString(),
    });
    const errorResponse = NextResponse.json(
      {
        error: 'Failed to delete products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    return errorResponse;
  }
}
