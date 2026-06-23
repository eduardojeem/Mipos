import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';
import { rateLimit } from '@/lib/middleware/rate-limit';

function isMissingColumnError(error: unknown, column: string): boolean {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  const normalized = String(column || '').trim().toLowerCase();
  if (!message || !normalized) return false;
  if (message.includes(`column "${normalized}"`) && message.includes('does not exist')) return true;
  if (message.includes(`could not find`) && message.includes(normalized) && message.includes('schema cache')) return true;
  if (message.includes(`could not find the '${normalized}' column`)) return true;
  if (message.includes('pgrst204') && message.includes(normalized)) return true;
  return false;
}


const FALLBACK_SUMMARY = {
  totalProducts: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  totalValue: 0,
  recentlyAdded: 0,
  topCategory: 'N/A',
  lastUpdated: new Date().toISOString(),
};

const rateLimiter = rateLimit({
  maxRequests: 200,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many summary requests. Please wait before making more requests.',
});

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimiter(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const orgId = await getValidatedOrganizationId(request);
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization required', message: 'No organization selected' },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    // Use optimized RPC to avoid loading all products
    // This returns aggregated statistics from the database
    const rpc = await supabase.rpc('get_product_statistics', {
      org_id: orgId,
    });

    if (!rpc.error && rpc.data) {
      const d = rpc.data as Record<string, unknown>;
      const response = NextResponse.json({
        totalProducts: Number(d.total_products) || 0,
        lowStockProducts: Number(d.low_stock_products) || 0,
        outOfStockProducts: Number(d.out_of_stock_products) || 0,
        totalValue: Number(d.total_inventory_value) || 0,
        recentlyAdded: Number(d.recently_added_count) || 0,
        topCategory: (d.top_category_name as string) || 'N/A',
        lastUpdated: new Date().toISOString(),
      });

      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return response;
    }
    // Fallback (RPC aún no aplicado): cálculo en JS heredado.

    // Siempre excluimos soft-deleted. Cuando isActive=false, solo contamos
    // productos con is_active=false (no mezclamos con deleted_at).
    const runQuery = async (applyDeletedFilter: boolean) => {
      let query = supabase
        .from('products')
        .select('id, stock_quantity, min_stock, sale_price, cost_price, category_id, created_at')
        .eq('organization_id', orgId);

      if (applyDeletedFilter) {
        query = query.is('deleted_at', null);
      }

      if (normalizedIsActive !== null) {
        query = query.eq('is_active', normalizedIsActive);
      }

      return query;
    };

    let { data: scopedProducts, error: scopedError } = await runQuery(true);

    if (scopedError && isMissingColumnError(scopedError, 'deleted_at')) {
      // La columna deleted_at no existe — reintentamos sin ese filtro
      const retry = await runQuery(false);
      scopedProducts = retry.data;
      scopedError = retry.error;
    }

    if (scopedError) throw scopedError;

    const allProducts = scopedProducts || [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const stats = allProducts.reduce(
      (
        acc: {
          totalValue: number;
          outOfStock: number;
          lowStock: number;
          recentlyAdded: number;
          categoryCounts: Record<string, number>;
        },
        product: Record<string, unknown>,
      ) => {
        const stock = Number(product['stock_quantity'] || 0);
        const minStock = Number(product['min_stock'] ?? 0);
        const price = Number(product['cost_price'] || product['sale_price'] || 0);
        const createdAt = new Date(String(product['created_at'] || 0)).getTime();

        acc.totalValue += stock * price;

        if (stock === 0) {
          acc.outOfStock++;
        } else if (stock <= minStock) {
          acc.lowStock++;
        }

        if (createdAt >= weekAgo) {
          acc.recentlyAdded++;
        }

        const categoryId = typeof product['category_id'] === 'string' ? product['category_id'] : null;
        if (categoryId) {
          acc.categoryCounts[categoryId] = (acc.categoryCounts[categoryId] || 0) + 1;
        }

        return acc;
      },
      {
        totalValue: 0,
        outOfStock: 0,
        lowStock: 0,
        recentlyAdded: 0,
        categoryCounts: {} as Record<string, number>,
      },
    );

    // Categoría con más productos
    const topCategoryId = Object.entries(stats.categoryCounts).sort(
      ([, a], [, b]) => (b as number) - (a as number),
    )[0]?.[0];

    let topCategory = 'N/A';
    if (topCategoryId) {
      const { data: cat } = await supabase
        .from('categories')
        .select('name')
        .eq('id', topCategoryId)
        .eq('organization_id', orgId)
        .single();
      if (cat) topCategory = cat.name;
    }

    const summary = {
      totalProducts: allProducts.length,
      lowStockProducts: stats.lowStock,
      outOfStockProducts: stats.outOfStock,
      totalValue: Math.round(stats.totalValue),
      recentlyAdded: stats.recentlyAdded,
      topCategory,
      lastUpdated: new Date().toISOString(),
    };

    const response = NextResponse.json(summary);
    response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (error) {
    console.error('Products summary error:', {
      errorCode: (error as any)?.code,
      organizationId: 'masked',
      timestamp: new Date().toISOString(),
    });

    const errorResponse = NextResponse.json(
      {
        ...FALLBACK_SUMMARY,
        lastUpdated: new Date().toISOString(),
        error: 'Could not fetch products summary',
      },
      { status: 500 },
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return errorResponse;
  }
}
