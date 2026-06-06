import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { assertCsrf } from '@/app/api/_utils/csrf';

function isForeignKeyViolation(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string } | null;
  const message = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();

  return err?.code === '23503' || message.includes('foreign key constraint');
}

function isMissingRpcFunctionError(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  const message = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase();
  return (
    err?.code === 'PGRST202' ||
    message.includes('could not find the function') ||
    (message.includes('function') && message.includes('does not exist'))
  );
}

function shouldFallbackFromRpc(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string } | null;
  const message = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
  return isMissingRpcFunctionError(error) || err?.code === '22P02' || message.includes('invalid input syntax for type uuid');
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
      return NextResponse.json(
        { error: 'Product IDs array is required' },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: 'Cannot delete more than 100 products at once' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: existingProducts, error: existingProductsError } = await supabase
      .from('products')
      .select('id, name')
      .eq('organization_id', orgId)
      .in('id', ids);

    if (existingProductsError) {
      throw existingProductsError;
    }

    if (!existingProducts || existingProducts.length === 0) {
      return NextResponse.json(
        { error: 'No products found with the provided IDs' },
        { status: 404 }
      );
    }

    const existingIds = existingProducts.map((product: { id: string }) => product.id);

    let idsWithSales = new Set<string>();
    const rpc = await supabase.rpc('get_products_with_sales', { product_ids: existingIds as unknown as string[] });
    if (rpc.error) {
      if (!shouldFallbackFromRpc(rpc.error)) {
        throw rpc.error;
      }
      const fallback = await supabase
        .from('sale_items')
        .select('product_id')
        .in('product_id', existingIds);
      if (fallback.error) {
        throw fallback.error;
      }
      idsWithSales = new Set((fallback.data || []).map((item: { product_id: string }) => item.product_id));
    } else {
      idsWithSales = new Set((rpc.data || []).map((row: { product_id: string }) => row.product_id));
    }

    const idsToDeactivate = existingIds.filter((id: string) => idsWithSales.has(id));
    const idsToDelete = existingIds.filter((id: string) => !idsWithSales.has(id));

    const results = {
      deleted: 0,
      deactivated: 0,
      errors: [] as string[],
    };

    if (idsToDeactivate.length > 0) {
      const { count: deactivatedCount, error: deactivateError } = await supabase
        .from('products')
        .update(
          {
            is_active: false,
            updated_at: new Date().toISOString(),
          },
          { count: 'exact' }
        )
        .eq('organization_id', orgId)
        .in('id', idsToDeactivate)
        ;

      if (deactivateError) {
        results.errors.push(`Failed to deactivate products: ${deactivateError.message}`);
      } else {
        results.deactivated = deactivatedCount || 0;
      }
    }

    if (idsToDelete.length > 0) {
      const { count: deletedCount, error: deleteError } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .eq('organization_id', orgId)
        .in('id', idsToDelete)
        ;

      if (deleteError) {
        if (isForeignKeyViolation(deleteError)) {
          const { count: fallbackCount, error: fallbackDeactivateError } = await supabase
            .from('products')
            .update(
              {
                is_active: false,
                updated_at: new Date().toISOString(),
              },
              { count: 'exact' }
            )
            .eq('organization_id', orgId)
            .in('id', idsToDelete)
            ;

          if (fallbackDeactivateError) {
            results.errors.push(`Failed to deactivate products: ${fallbackDeactivateError.message}`);
          } else {
            results.deactivated += fallbackCount || 0;
          }
        } else {
          results.errors.push(`Failed to delete products: ${deleteError.message}`);
        }
      } else {
        results.deleted = deletedCount || 0;
      }
    }

    const totalProcessed = results.deleted + results.deactivated;
    const hasErrors = results.errors.length > 0;

    if (totalProcessed === 0) {
      const adminSupabase = await createAdminClient();

      if (idsToDeactivate.length > 0) {
        const { count, error } = await adminSupabase
          .from('products')
          .update(
            {
              is_active: false,
              updated_at: new Date().toISOString(),
            },
            { count: 'exact' }
          )
          .eq('organization_id', orgId)
          .in('id', idsToDeactivate);

        if (!error) {
          results.deactivated = count || 0;
        }
      }

      if (idsToDelete.length > 0) {
        const { count, error } = await adminSupabase
          .from('products')
          .delete({ count: 'exact' })
          .eq('organization_id', orgId)
          .in('id', idsToDelete);

        if (!error) {
          results.deleted = count || 0;
        }
      }

      const retryTotal = results.deleted + results.deactivated;
      if (retryTotal > 0) {
        return NextResponse.json({
          success: true,
          results,
          message: `Processed ${retryTotal} products. ${results.deleted} deleted, ${results.deactivated} deactivated.`,
          ...(hasErrors ? { errors: results.errors } : {}),
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo eliminar/desactivar ningún producto. Actualiza y vuelve a intentar.',
          code: 'PRODUCT_BULK_DELETE_NOOP',
          results,
          ...(hasErrors ? { errors: results.errors } : {}),
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${totalProcessed} products. ${results.deleted} deleted, ${results.deactivated} deactivated.`,
      ...(hasErrors ? { errors: results.errors } : {}),
    });
  } catch (error) {
    console.error('Bulk delete products error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
