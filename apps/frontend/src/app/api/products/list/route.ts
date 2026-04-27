import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveOrganizationId } from '@/lib/organization';

const RICH_PRODUCT_SELECT = `
  id,
  name,
  sku,
  description,
  cost_price,
  sale_price,
  offer_price,
  wholesale_price,
  min_wholesale_quantity,
  stock_quantity,
  min_stock,
  max_stock,
  is_active,
  created_at,
  updated_at,
  image_url,
  images,
  barcode,
  discount_percentage,
  category_id,
  supplier_id,
  categories!products_category_id_fkey (
    id,
    name
  ),
  suppliers!products_supplier_id_fkey (
    id,
    name
  )
`;

type ProductRow = Record<string, any>;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : (item as { url?: string })?.url || ''))
      .filter(Boolean);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const trimmed = value.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => (typeof item === 'string' ? item : item?.url || ''))
        .filter(Boolean);
    }
  } catch {
    // Some legacy rows store a single URL or comma-separated URLs.
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyProductFilters(query: any, params: URLSearchParams, orgId: string) {
  const search = params.get('search')?.trim();
  const categoryId = params.get('categoryId')?.trim();
  const supplierId = params.get('supplierId')?.trim();
  const minPrice = params.get('minPrice');
  const maxPrice = params.get('maxPrice');
  const minStock = params.get('minStock');
  const maxStock = params.get('maxStock');
  const isActive = params.get('isActive');
  const stockStatus = params.get('stockStatus');

  let scopedQuery = query.eq('organization_id', orgId);

  if (search) {
    scopedQuery = scopedQuery.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (categoryId) {
    scopedQuery = scopedQuery.eq('category_id', categoryId);
  }

  if (supplierId) {
    scopedQuery = scopedQuery.eq('supplier_id', supplierId);
  }

  if (minPrice) {
    scopedQuery = scopedQuery.gte('sale_price', Number.parseFloat(minPrice));
  }

  if (maxPrice) {
    scopedQuery = scopedQuery.lte('sale_price', Number.parseFloat(maxPrice));
  }

  if (minStock) {
    scopedQuery = scopedQuery.gte('stock_quantity', Number.parseInt(minStock, 10));
  }

  if (maxStock) {
    scopedQuery = scopedQuery.lte('stock_quantity', Number.parseInt(maxStock, 10));
  }

  if (isActive !== null) {
    scopedQuery = scopedQuery.eq('is_active', isActive === 'true');
  }

  if (stockStatus) {
    switch (stockStatus) {
      case 'out_of_stock':
        scopedQuery = scopedQuery.eq('stock_quantity', 0);
        break;
      case 'low_stock':
        scopedQuery = scopedQuery.gt('stock_quantity', 0).lte('stock_quantity', 5);
        break;
      case 'in_stock':
        scopedQuery = scopedQuery.gt('stock_quantity', 5);
        break;
      case 'critical':
        scopedQuery = scopedQuery.lte('stock_quantity', 2);
        break;
    }
  }

  return scopedQuery;
}

function normalizeProduct(
  product: ProductRow,
  categoryMap: Map<string, ProductRow>
) {
  const images = normalizeImages(product.images);
  const category = product.categories || product.category || categoryMap.get(product.category_id);
  const supplier = product.suppliers || product.supplier || null;

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    cost_price: Number(product.cost_price || 0),
    sale_price: Number(product.sale_price || 0),
    offer_price: product.offer_price ?? undefined,
    wholesale_price: product.wholesale_price ?? undefined,
    min_wholesale_quantity: product.min_wholesale_quantity ?? undefined,
    stock_quantity: Number(product.stock_quantity || 0),
    min_stock: Number(product.min_stock || 0),
    max_stock: product.max_stock ?? undefined,
    is_active: product.is_active !== false,
    created_at: product.created_at,
    updated_at: product.updated_at,
    image_url: product.image_url || images[0] || null,
    images,
    barcode: product.barcode ?? undefined,
    discount_percentage: product.discount_percentage || 0,
    category_id: product.category_id,
    supplier_id: product.supplier_id ?? undefined,
    category: category ? {
      id: category.id,
      name: category.name,
      description: category.description || '',
      is_active: category.is_active !== false,
      created_at: category.created_at || product.created_at,
      updated_at: category.updated_at || product.updated_at,
    } : null,
    supplier: supplier ? {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      is_active: supplier.is_active !== false,
      created_at: supplier.created_at || product.created_at,
      updated_at: supplier.updated_at || product.updated_at,
    } : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await resolveOrganizationId(request);
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization required', message: 'No organization selected' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get('limit'), 25), 100);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const validSortFields = ['name', 'sku', 'sale_price', 'stock_quantity', 'created_at', 'updated_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const supabase = await createAdminClient();

    const buildQuery = (select: string) => {
      let query = supabase
        .from('products')
        .select(select, { count: 'exact' });

      query = applyProductFilters(query, searchParams, orgId);
      return query
        .order(sortField, { ascending: sortOrder === 'asc' })
        .range(from, to);
    };

    let { data: products, error, count } = await buildQuery(RICH_PRODUCT_SELECT);

    if (error) {
      console.warn('[products/list] Rich select failed, retrying with legacy select:', {
        code: error.code,
        message: error.message,
      });

      const fallback = await buildQuery('*');
      products = fallback.data;
      error = fallback.error;
      count = fallback.count;
    }

    if (error) {
      throw error;
    }

    const rows = (products || []) as ProductRow[];
    const categoryIds = Array.from(new Set(
      rows
        .map((product) => product.category_id)
        .filter(Boolean)
    ));
    const categoryMap = new Map<string, ProductRow>();

    if (categoryIds.length > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id,name,description,created_at,updated_at')
        .eq('organization_id', orgId)
        .in('id', categoryIds);

      if (!categoriesError) {
        (categories || []).forEach((category: ProductRow) => {
          categoryMap.set(category.id, category);
        });
      }
    }

    const transformedProducts = rows.map((product) => normalizeProduct(product, categoryMap));
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
        hasPrev: page > 1,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Products list error:', error);
    return NextResponse.json(
      {
        products: [],
        pagination: {
          page: 1,
          limit: 25,
          total: 0,
          totalPages: 0,
          hasMore: false,
          hasPrev: false,
        },
        lastUpdated: new Date().toISOString(),
        error: 'Could not fetch products list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
