import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { assertCsrf } from '@/app/api/_utils/csrf';

/**
 * POST /api/products/:id/restore
 * Restaura un producto de la papelera: deleted_at = null, is_active = true.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrf = assertCsrf(request);
    if (!csrf.ok) return csrf.response;

    const auth = await requirePOSPermissions(request, [
      'products.update',
      'products.edit',
      'products.write',
      'products.manage',
    ]);
    if (!auth.ok && auth.status !== 500) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const { id } = await params;
    const orgId = await requireOrganization(request);
    const supabase = await createAdminClient();
    const now = new Date().toISOString();

    const { data: restored, error } = await supabase
      .from('products')
      .update({ deleted_at: null, is_active: true, updated_at: now })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, name')
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: 'No se pudo restaurar el producto', details: error.message },
        { status: 500 }
      );
    }
    if (!restored) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: restored,
      message: 'Producto restaurado correctamente.',
    });
  } catch (error) {
    console.error('Restore product error:', error);
    return NextResponse.json(
      {
        error: 'Failed to restore product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
