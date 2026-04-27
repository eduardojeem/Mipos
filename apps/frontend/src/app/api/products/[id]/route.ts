import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';

function normalizeOptionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

async function syncProductToExternal(origin: string, product: Record<string, unknown>, orgId: string) {
  try {
    const payload = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sale_price: product.sale_price,
      cost_price: product.cost_price,
      wholesale_price: product.wholesale_price,
      stock_quantity: product.stock_quantity,
      barcode: product.barcode,
      brand: product.brand,
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      is_active: product.is_active,
      updated_at: product.updated_at,
      organization_id: orgId,
    };

    await fetch(`${origin}/api/external-sync/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [payload] }),
    });
  } catch {
    // Best effort sync; local update should not fail if the mirror is unavailable.
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await requireOrganization(request);
    const supabase = await createAdminClient();

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories!products_category_id_fkey (
          id,
          name,
          description
        ),
        suppliers!products_supplier_id_fkey (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await requireOrganization(request);
    const body = await request.json();
    const supabase = await createAdminClient();

    const { data: existingProduct, error: existingProductError } = await supabase
      .from('products')
      .select('id, sku, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (existingProductError) {
      throw existingProductError;
    }

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const normalizedSku = normalizeOptionalString(body.sku);
    if (normalizedSku && normalizedSku !== existingProduct.sku) {
      const { data: duplicateProduct, error: duplicateProductError } = await supabase
        .from('products')
        .select('id')
        .eq('sku', normalizedSku)
        .eq('organization_id', orgId)
        .neq('id', id)
        .maybeSingle();

      if (duplicateProductError) {
        throw duplicateProductError;
      }

      if (duplicateProduct) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    if (body.category_id !== undefined && body.category_id !== null && body.category_id !== '') {
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', body.category_id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (categoryError) {
        throw categoryError;
      }

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = normalizeOptionalString(body.name);
    if (body.sku !== undefined) updateData.sku = normalizedSku;
    if (body.description !== undefined) updateData.description = normalizeOptionalString(body.description);
    if (body.cost_price !== undefined) updateData.cost_price = normalizeOptionalNumber(body.cost_price);
    if (body.sale_price !== undefined) updateData.sale_price = normalizeOptionalNumber(body.sale_price);
    if (body.offer_price !== undefined) updateData.offer_price = normalizeOptionalNumber(body.offer_price);
    if (body.wholesale_price !== undefined) updateData.wholesale_price = normalizeOptionalNumber(body.wholesale_price);
    if (body.min_wholesale_quantity !== undefined) {
      updateData.min_wholesale_quantity = normalizeOptionalNumber(body.min_wholesale_quantity);
    }
    if (body.stock_quantity !== undefined) updateData.stock_quantity = normalizeOptionalNumber(body.stock_quantity);
    if (body.min_stock !== undefined) updateData.min_stock = normalizeOptionalNumber(body.min_stock);
    if (body.max_stock !== undefined) updateData.max_stock = normalizeOptionalNumber(body.max_stock);
    if (body.category_id !== undefined) updateData.category_id = normalizeOptionalString(body.category_id);
    if (body.supplier_id !== undefined) updateData.supplier_id = normalizeOptionalString(body.supplier_id);
    if (body.image_url !== undefined) updateData.image_url = normalizeOptionalString(body.image_url);
    if (body.discount_percentage !== undefined) {
      updateData.discount_percentage = normalizeOptionalNumber(body.discount_percentage);
    }
    if (body.barcode !== undefined) updateData.barcode = normalizeOptionalString(body.barcode);
    if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    await syncProductToExternal(new URL(request.url).origin, product, orgId);

    return NextResponse.json({
      success: true,
      product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await requireOrganization(request);
    const supabase = await createAdminClient();

    const { data: existingProduct, error: existingProductError } = await supabase
      .from('products')
      .select('id, name, organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (existingProductError) {
      throw existingProductError;
    }

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { data: salesItems, error: salesItemsError } = await supabase
      .from('sale_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (salesItemsError) {
      throw salesItemsError;
    }

    if ((salesItems || []).length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Product marked as inactive (has sales history)',
        action: 'deactivated',
      });
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      action: 'deleted',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
