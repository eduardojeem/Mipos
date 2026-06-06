import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { assertCsrf } from '@/app/api/_utils/csrf';

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

function normalizeOptionalBoolean(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return Boolean(value);
}

function isSchemaMismatchError(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string } | null;
  const message = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();

  return (
    err?.code === 'PGRST204' ||
    err?.code === '42703' ||
    message.includes('schema cache') ||
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('malformed array literal') ||
    message.includes('could not find')
  );
}

function pickLegacyProductUpdateData(updateData: Record<string, unknown>) {
  const legacyColumns = new Set([
    'name',
    'sku',
    'description',
    'cost_price',
    'sale_price',
    'stock_quantity',
    'min_stock',
    'category_id',
    'updated_at',
  ]);

  return Object.fromEntries(
    Object.entries(updateData).filter(([key]) => legacyColumns.has(key))
  );
}

function isForeignKeyViolation(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string } | null;
  const message = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();

  return err?.code === '23503' || message.includes('foreign key constraint');
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

    const res = await fetch(`${origin}/api/external-sync/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [payload] }),
    });
    if (!res.ok) {
      console.warn(`[syncProductToExternal] External sync returned status ${res.status}`);
    }
  } catch (err) {
    console.warn('[syncProductToExternal] Error calling external sync API:', err);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = await requireOrganization(request);
    const supabase = await createClient();

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
    const csrf = assertCsrf(request);
    if (!csrf.ok) return csrf.response;

    const auth = await requirePOSPermissions(request, [
      'products.update',
      'products.edit',
      'products.write',
      'products.manage',
    ]);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

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

    if (body.supplier_id !== undefined && body.supplier_id !== null && body.supplier_id !== '' && body.supplier_id !== 'none') {
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('id', body.supplier_id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (supplierError) {
        throw supplierError;
      }

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 400 });
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
    if (body.supplier_id !== undefined) {
      updateData.supplier_id = body.supplier_id === 'none' ? null : normalizeOptionalString(body.supplier_id);
    }
    if (body.image_url !== undefined) updateData.image_url = normalizeOptionalString(body.image_url);
    if (body.images !== undefined) {
      updateData.images = Array.isArray(body.images)
        ? body.images.filter((url: unknown) => typeof url === 'string' && url.trim()).map((url: string) => url.trim())
        : [];
    }
    if (body.discount_percentage !== undefined) {
      updateData.discount_percentage = normalizeOptionalNumber(body.discount_percentage);
    }
    if (body.barcode !== undefined) updateData.barcode = normalizeOptionalString(body.barcode);
    if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);
    if (body.is_public !== undefined) updateData.is_public = Boolean(body.is_public);
    if (body.iva_included !== undefined) updateData.iva_included = normalizeOptionalBoolean(body.iva_included);
    if (body.iva_rate !== undefined) updateData.iva_rate = normalizeOptionalNumber(body.iva_rate);
    if (body.brand !== undefined) updateData.brand = normalizeOptionalString(body.brand);
    if (body.shade !== undefined) updateData.shade = normalizeOptionalString(body.shade);
    if (body.skin_type !== undefined) updateData.skin_type = normalizeOptionalString(body.skin_type);
    if (body.ingredients !== undefined) updateData.ingredients = normalizeOptionalString(body.ingredients);
    if (body.volume !== undefined) updateData.volume = normalizeOptionalString(body.volume);
    if (body.spf !== undefined) updateData.spf = normalizeOptionalNumber(body.spf);
    if (body.finish !== undefined) updateData.finish = normalizeOptionalString(body.finish);
    if (body.coverage !== undefined) updateData.coverage = normalizeOptionalString(body.coverage);
    if (body.waterproof !== undefined) updateData.waterproof = normalizeOptionalBoolean(body.waterproof);
    if (body.vegan !== undefined) updateData.vegan = normalizeOptionalBoolean(body.vegan);
    if (body.cruelty_free !== undefined) updateData.cruelty_free = normalizeOptionalBoolean(body.cruelty_free);
    if (body.expiration_date !== undefined) updateData.expiration_date = normalizeOptionalString(body.expiration_date);

    let usedSchemaFallback = false;
    let { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('*')
      .single();

    if (error && isSchemaMismatchError(error)) {
      usedSchemaFallback = true;
      console.warn('[products/update] Full update failed because the products schema is missing optional columns; retrying legacy update:', {
        code: error.code,
        message: error.message,
      });

      const legacyUpdateData = pickLegacyProductUpdateData(updateData);
      const fallbackResult = await supabase
        .from('products')
        .update(legacyUpdateData)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select('*')
        .single();

      product = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      throw error;
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found after update' }, { status: 404 });
    }

    try {
      await syncProductToExternal(new URL(request.url).origin, product, orgId);
    } catch (syncErr) {
      console.warn('[syncProductToExternal] Failed best-effort sync:', syncErr);
    }

    return NextResponse.json({
      success: true,
      product,
      schemaFallback: usedSchemaFallback,
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
      const { data: updatedRows, error: updateError } = await supabase
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select('id,is_active');

      if (updateError) {
        throw updateError;
      }

      if (Array.isArray(updatedRows) && updatedRows.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Product marked as inactive (has sales history)',
          action: 'deactivated',
        });
      }

      const { data: verify, error: verifyError } = await supabase
        .from('products')
        .select('id,is_active')
        .eq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (verifyError) {
        throw verifyError;
      }

      if (!verify) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }

      if (verify.is_active === false) {
        return NextResponse.json({
          success: true,
          message: 'Product marked as inactive (has sales history)',
          action: 'deactivated',
        });
      }

      const adminSupabase = await createAdminClient();
      const { data: adminUpdated, error: adminUpdateError } = await adminSupabase
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select('id,is_active');

      if (adminUpdateError) {
        throw adminUpdateError;
      }

      if (Array.isArray(adminUpdated) && adminUpdated.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Product marked as inactive (has sales history)',
          action: 'deactivated',
        });
      }

      return NextResponse.json(
        { message: 'No se pudo desactivar el producto. Actualiza y vuelve a intentar.', code: 'PRODUCT_DEACTIVATE_NOOP' },
        { status: 409 }
      );
    }

    const { data: deletedRows, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id');

    if (error) {
      if (isForeignKeyViolation(error)) {
        const { data: fallbackRows, error: deactivateError } = await supabase
          .from('products')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('organization_id', orgId)
          .select('id,is_active');

        if (deactivateError) {
          throw deactivateError;
        }

        if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Product marked as inactive (has related history)',
            action: 'deactivated',
          });
        }

        const { data: verify, error: verifyError } = await supabase
          .from('products')
          .select('id,is_active')
          .eq('id', id)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (verifyError) {
          throw verifyError;
        }

        if (!verify) {
          return NextResponse.json({ message: 'Product not found' }, { status: 404 });
        }

        if (verify.is_active === false) {
          return NextResponse.json({
            success: true,
            message: 'Product marked as inactive (has related history)',
            action: 'deactivated',
          });
        }

        const adminSupabase = await createAdminClient();
        const { data: adminUpdated, error: adminUpdateError } = await adminSupabase
          .from('products')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('organization_id', orgId)
          .select('id,is_active');

        if (adminUpdateError) {
          throw adminUpdateError;
        }

        if (Array.isArray(adminUpdated) && adminUpdated.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Product marked as inactive (has related history)',
            action: 'deactivated',
          });
        }

        return NextResponse.json(
          { message: 'No se pudo desactivar el producto. Actualiza y vuelve a intentar.', code: 'PRODUCT_DEACTIVATE_NOOP' },
          { status: 409 }
        );
      }

      throw error;
    }

    if (Array.isArray(deletedRows) && deletedRows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
        action: 'deleted',
      });
    }

    const { data: verify, error: verifyError } = await supabase
      .from('products')
      .select('id,is_active,deleted_at')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (verifyError) {
      throw verifyError;
    }

    if (!verify) {
      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
        action: 'deleted',
      });
    }

    if (verify.deleted_at) {
      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
        action: 'deleted',
      });
    }

    if (verify.is_active === false) {
      return NextResponse.json({
        success: true,
        message: 'Product marked as inactive (delete converted to soft delete)',
        action: 'deactivated',
      });
    }

    const adminSupabase = await createAdminClient();
    const { data: adminDeleted, error: adminDeleteError } = await adminSupabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id');

    if (adminDeleteError) {
      throw adminDeleteError;
    }

    if (Array.isArray(adminDeleted) && adminDeleted.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
        action: 'deleted',
      });
    }

    const { data: adminVerify, error: adminVerifyError } = await adminSupabase
      .from('products')
      .select('id,is_active,deleted_at')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (adminVerifyError) {
      throw adminVerifyError;
    }

    if (!adminVerify) {
      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
        action: 'deleted',
      });
    }

    if (adminVerify.deleted_at) {
      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully',
        action: 'deleted',
      });
    }

    if (adminVerify.is_active === false) {
      return NextResponse.json({
        success: true,
        message: 'Product marked as inactive (delete converted to soft delete)',
        action: 'deactivated',
      });
    }

    const debug =
      process.env.NODE_ENV !== 'production'
        ? {
            orgId,
            id,
            verifyIsActive: verify?.is_active ?? null,
            verifyDeletedAt: verify?.deleted_at ?? null,
            adminVerifyIsActive: adminVerify?.is_active ?? null,
            adminVerifyDeletedAt: adminVerify?.deleted_at ?? null,
          }
        : undefined;

    return NextResponse.json(
      {
        message: 'No se pudo eliminar el producto. Actualiza y vuelve a intentar.',
        code: 'PRODUCT_DELETE_NOOP',
        ...(debug ? { debug } : {}),
      },
      { status: 409 }
    );
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      {
        message: 'Failed to delete product',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
