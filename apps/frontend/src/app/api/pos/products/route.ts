import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

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

    const supabase = await createClient();

    const headerOrgId = request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    const organizationId = headerOrgId || (auth.userId ? await getUserOrganizationId(auth.userId) : null)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }

    // Optimized query for POS - only essential fields
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
        categories!products_category_id_fkey (
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
      categories?: { id: string; name: string } | null;
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
    const baseProducts = (products ?? []) as ProductRow[];
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
      category: product.categories ? { id: product.categories.id, name: product.categories.name } : null,
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
    });

  } catch (error) {
    console.error('POS products error:', error);
    
    return NextResponse.json({
      products: [],
      byCategory: {},
      total: 0,
      metadata: {
        inStock: 0,
        lowStock: 0,
        withWholesale: 0,
        lastUpdated: new Date().toISOString()
      },
      error: 'Could not fetch POS products'
    });
  }
}
