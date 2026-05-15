import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
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

    // Optimized query for POS - join categories directly to avoid N+1
    let query = supabase
      .from('products')
      .select(`
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
      `)
      .order('name');

    // Apply filters
    query = query.eq('organization_id', organizationId)
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    // Apply limit
    query = query.limit(limit);

    const { data: products, error } = await query;

    if (error) throw error;

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
    const baseProducts = (products ?? []) as unknown as ProductRow[];

    const transformedProducts: PosProduct[] = baseProducts.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      sale_price: product.sale_price || 0,
      wholesale_price: product.wholesale_price || 0,
      stock_quantity: product.stock_quantity || 0,
      min_stock: product.min_stock || 5,
      min_wholesale_quantity: product.min_wholesale_quantity || 0,
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      is_active: product.is_active,
      image_url: product.image_url,
      barcode: product.barcode,
      brand: product.brand,
      category: product.categories
        ? { id: product.categories.id, name: product.categories.name || 'Sin categoría' }
        : null,
      in_stock: (product.stock_quantity || 0) > 0,
      low_stock: (product.stock_quantity || 0) <= (product.min_stock || 5),
      has_wholesale: (product.wholesale_price || 0) > 0
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
        lastUpdated: new Date().toISOString()
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
