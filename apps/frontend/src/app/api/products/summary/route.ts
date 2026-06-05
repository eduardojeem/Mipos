import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';

// TTL en segundos para Cache-Control (60 s).
// Funciona correctamente en multi-instancia / serverless porque el caché
// vive en el cliente HTTP, no en memoria del proceso del servidor.
const CACHE_TTL_SECONDS = 60;

const FALLBACK_SUMMARY = {
  totalProducts: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  totalValue: 0,
  recentlyAdded: 0,
  topCategory: 'N/A',
  lastUpdated: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  try {
    const orgId = await getValidatedOrganizationId(request);
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization required', message: 'No organization selected' },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const isActiveParam = searchParams.get('isActive');
    const normalizedIsActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : null;

    // Fetch solo los campos necesarios para las métricas
    let query = supabase
      .from('products')
      .select('id, stock_quantity, min_stock, sale_price, cost_price, category_id, created_at')
      .eq('organization_id', orgId);

    if (normalizedIsActive !== null) {
      query = query.eq('is_active', normalizedIsActive);
    }

    const { data: scopedProducts, error: scopedError } = await query;
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
        product: any,
      ) => {
        const stock = Number(product.stock_quantity || 0);
        // Usar min_stock real del producto, sin threshold hardcodeado
        const minStock = Number(product.min_stock ?? 0);
        const price = Number(product.cost_price || product.sale_price || 0);
        const createdAt = new Date(product.created_at || 0).getTime();

        acc.totalValue += stock * price;

        if (stock === 0) {
          acc.outOfStock++;
        } else if (stock <= minStock) {
          // Bajo stock = stock positivo pero <= min_stock del producto
          acc.lowStock++;
        }

        if (createdAt >= weekAgo) {
          acc.recentlyAdded++;
        }

        if (product.category_id) {
          acc.categoryCounts[product.category_id] =
            (acc.categoryCounts[product.category_id] || 0) + 1;
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

    // Cache-Control funciona correctamente en entornos multi-instancia y
    // serverless, a diferencia de un Map en memoria del proceso del servidor.
    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': `private, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`,
      },
    });
  } catch (error) {
    console.error('Products summary error:', error);

    return NextResponse.json(
      {
        ...FALLBACK_SUMMARY,
        lastUpdated: new Date().toISOString(),
        error: 'Could not fetch products summary',
      },
      { status: 500 },
    );
  }
}
