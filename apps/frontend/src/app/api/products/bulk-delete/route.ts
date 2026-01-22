import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/products/bulk-delete - Delete multiple products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
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

    // Check which products exist
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, name')
      .in('id', ids);

    if (!existingProducts || existingProducts.length === 0) {
      return NextResponse.json(
        { error: 'No products found with the provided IDs' },
        { status: 404 }
      );
    }

    const existingIds = existingProducts.map((p: { id: string }) => p.id);

    // Check which products have sales history
    const { data: productsWithSales } = await supabase
      .from('sale_items')
      .select('product_id')
      .in('product_id', existingIds);

    const idsWithSales = new Set((productsWithSales?.map((item: { product_id: string }) => item.product_id) || []));
    const idsToDeactivate = existingIds.filter((id: string) => idsWithSales.has(id));
    const idsToDelete = existingIds.filter((id: string) => !idsWithSales.has(id));

    const results = {
      deleted: 0,
      deactivated: 0,
      errors: [] as string[]
    };

    // Deactivate products with sales history
    if (idsToDeactivate.length > 0) {
      const { error: deactivateError } = await supabase
        .from('products')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', idsToDeactivate);

      if (deactivateError) {
        results.errors.push(`Failed to deactivate products: ${deactivateError.message}`);
      } else {
        results.deactivated = idsToDeactivate.length;
      }
    }

    // Delete products without sales history
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
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
      ...(hasErrors && { errors: results.errors })
    });

  } catch (error) {
    console.error('Bulk delete products error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
