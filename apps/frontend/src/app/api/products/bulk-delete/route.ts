import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';

export async function POST(request: NextRequest) {
  try {
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

    const supabase = await createAdminClient();

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

    const { data: productsWithSales, error: productsWithSalesError } = await supabase
      .from('sale_items')
      .select('product_id')
      .in('product_id', existingIds);

    if (productsWithSalesError) {
      throw productsWithSalesError;
    }

    const idsWithSales = new Set(
      (productsWithSales || []).map((item: { product_id: string }) => item.product_id)
    );
    const idsToDeactivate = existingIds.filter((id: string) => idsWithSales.has(id));
    const idsToDelete = existingIds.filter((id: string) => !idsWithSales.has(id));

    const results = {
      deleted: 0,
      deactivated: 0,
      errors: [] as string[],
    };

    if (idsToDeactivate.length > 0) {
      const { error: deactivateError } = await supabase
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', orgId)
        .in('id', idsToDeactivate);

      if (deactivateError) {
        results.errors.push(`Failed to deactivate products: ${deactivateError.message}`);
      } else {
        results.deactivated = idsToDeactivate.length;
      }
    }

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('organization_id', orgId)
        .in('id', idsToDelete);

      if (deleteError) {
        results.errors.push(`Failed to delete products: ${deleteError.message}`);
      } else {
        results.deleted = idsToDelete.length;
      }
    }

    const totalProcessed = results.deleted + results.deactivated;
    const hasErrors = results.errors.length > 0;

    return NextResponse.json({
      success: !hasErrors || totalProcessed > 0,
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
