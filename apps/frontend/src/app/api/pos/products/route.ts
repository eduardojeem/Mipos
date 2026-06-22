import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { sanitizeSearch } from '@/app/api/_utils/search';
import { getUserOrganizationId, validateOrganizationAccess } from '@/app/api/_utils/organization';

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return null;
  }

  return trimmed;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access'])
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000); // Max 1000 for POS
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default true

    const supabase = await createAdminClient();

    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    )
    const organizationId = headerOrgId || (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }

    if (auth.userId && auth.userRole !== 'SUPER_ADMIN') {
      const hasOrganizationAccess = await validateOrganizationAccess(auth.userId, organizationId)
      if (!hasOrganizationAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 })
      }
    }

    // Two-tier select: primero intentamos el query "rico" con TODAS las
    // columnas POS-relevantes y el join a categories. Si Supabase responde
    // con "column does not exist" o "could not find a relationship", caemos
    // a un select mínimo con SOLO las columnas garantizadas. Así el POS
    // sigue funcionando aunque la migración de un campo (min_wholesale_quantity,
    // brand, wholesale_price, etc.) no se haya aplicado aún.
    const RICH_SELECT = `
      id,
      name,
      sku,
      sale_price,
      wholesale_price,
      stock_quantity,
      min_stock,
      min_wholesale_quantity,
      category_id,
      supplier_id,
      is_active,
      image_url,
      barcode,
      brand,
      categories!left (
        id,
        name
      )
    `;
    const MINIMAL_SELECT = `
      id,
      name,
      sku,
      sale_price,
      stock_quantity,
      category_id,
      is_active
    `;

    const buildQuery = (selectClause: string, withDeletedFilter = true) => {
      let q = supabase.from('products').select(selectClause).order('name');
      q = q.eq('organization_id', organizationId);
      // Nunca vender productos en la papelera (deleted_at != null).
      if (withDeletedFilter) q = q.is('deleted_at', null);
      if (activeOnly) q = q.eq('is_active', true);
      if (search) { const s = sanitizeSearch(search); q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`); }
      if (categoryId && categoryId !== 'all') q = q.eq('category_id', categoryId);
      return q.limit(limit);
    };

    let products: unknown[] | null = null;
    let usedMinimalFallback = false;

    const richResult = await buildQuery(RICH_SELECT);
    if (richResult.error) {
      const msg = String(richResult.error.message || '');
      // Schema-mismatch errors → caer a select mínimo y loggear cuál falló.
      if (
        /does not exist/i.test(msg) ||
        /could not find a relationship/i.test(msg) ||
        /column .* of relation/i.test(msg)
      ) {
        console.warn(
          '[POS products] rich select failed (schema mismatch), falling back to minimal:',
          msg
        );
        // Si la columna ausente es deleted_at, el minimal tampoco debe filtrar por ella.
        const deletedAtMissing = /deleted_at/i.test(msg);
        const minimalResult = await buildQuery(MINIMAL_SELECT, !deletedAtMissing);
        if (minimalResult.error) throw minimalResult.error;
        products = minimalResult.data as unknown[] | null;
        usedMinimalFallback = true;
      } else {
        // Otro tipo de error (RLS, timeout, etc.) → propagar.
        throw richResult.error;
      }
    } else {
      products = richResult.data as unknown[] | null;
    }

    type ProductRow = {
      id: string;
      name: string | null;
      sku: string | null;
      sale_price: number | null;
      wholesale_price: number | null;
      stock_quantity: number | null;
      min_stock: number | null;
      min_wholesale_quantity: number | null;
      category_id: string | null;
      supplier_id: string | null;
      is_active: boolean;
      image_url: string | null;
      barcode: string | null;
      brand: string | null;
      categories: { id: string; name: string | null } | null;
    };
    type PosProduct = {
      id: string;
      name: string | null;
      sku: string | null;
      sale_price: number;
      wholesale_price: number;
      stock_quantity: number;
      min_stock: number;
      min_wholesale_quantity: number;
      category_id: string | null;
      supplier_id: string | null;
      is_active: boolean;
      image_url: string | null;
      barcode: string | null;
      brand: string | null;
      category: { id: string; name: string } | null;
      in_stock: boolean;
      low_stock: boolean;
      has_wholesale: boolean;
    };
    const baseProducts = (products ?? []) as unknown as Partial<ProductRow>[];

    // Defensive mapping: cualquier columna puede estar ausente si caímos al
    // minimal select o si el schema cambió. Cada acceso es undefined-safe.
    const transformedProducts: PosProduct[] = baseProducts.map((product) => ({
      id: String(product.id),
      name: product.name ?? null,
      sku: product.sku ?? null,
      sale_price: Number(product.sale_price) || 0,
      wholesale_price: Number(product.wholesale_price) || 0,
      stock_quantity: Number(product.stock_quantity) || 0,
      min_stock: Number(product.min_stock) || 5,
      min_wholesale_quantity: Number(product.min_wholesale_quantity) || 0,
      category_id: product.category_id ?? null,
      supplier_id: product.supplier_id ?? null,
      is_active: product.is_active !== false,
      image_url: product.image_url ?? null,
      barcode: product.barcode ?? null,
      brand: product.brand ?? null,
      category: product.categories
        ? { id: product.categories.id, name: product.categories.name || 'Sin categoría' }
        : null,
      in_stock: (Number(product.stock_quantity) || 0) > 0,
      low_stock: (Number(product.stock_quantity) || 0) <= (Number(product.min_stock) || 5),
      has_wholesale: (Number(product.wholesale_price) || 0) > 0,
    }));

    const byCategory: Record<string, PosProduct[]> = transformedProducts.reduce(
      (acc, product) => {
        const catId = product.category_id || 'uncategorized';
        if (!acc[catId]) acc[catId] = [];
        acc[catId].push(product);
        return acc;
      },
      {} as Record<string, PosProduct[]>
    );

    return NextResponse.json({
      products: transformedProducts,
      byCategory,
      total: transformedProducts.length,
      metadata: {
        inStock: transformedProducts.filter((p) => p.in_stock).length,
        lowStock: transformedProducts.filter((p) => p.low_stock).length,
        withWholesale: transformedProducts.filter((p) => p.has_wholesale).length,
        lastUpdated: new Date().toISOString(),
        // Visible en el response para debug; el cliente puede mostrar un
        // banner si quiere advertir al user que faltan columnas en DB.
        usedMinimalFallback,
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      }
    });

  } catch (error) {
    // Devolver 500 con detalle real para que React Query lo capture como
    // error y la UI pueda mostrar un estado de "fallo cargar — reintentar".
    // Antes devolvíamos 200 con products:[] silenciando el problema → la
    // UI mostraba "Sin productos en esta categoría" sin distinguir.
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[POS products] query failed:', message);

    return NextResponse.json(
      {
        products: [],
        byCategory: {},
        total: 0,
        metadata: { inStock: 0, lowStock: 0, withWholesale: 0, lastUpdated: new Date().toISOString() },
        error: 'Could not fetch POS products',
        details: message,
      },
      { status: 500 }
    );
  }
}
