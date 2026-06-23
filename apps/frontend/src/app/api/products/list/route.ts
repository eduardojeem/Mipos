import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';
import { sanitizeSearch } from '@/app/api/_utils/search';
import { rateLimit } from '@/lib/middleware/rate-limit';

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
  is_public,
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

type ProductRow = Record<string, unknown>;
const STOCK_STATUS_CANDIDATE_LIMIT = 10000;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

function applyProductFilters(
  query: unknown,
  params: URLSearchParams,
  orgId: string,
  options?: { applyDeletedFilter?: boolean }
) {
  const search = params.get('search')?.trim();
  const categoryId = params.get('categoryId')?.trim();
  const supplierId = params.get('supplierId')?.trim();
  const minPrice = params.get('minPrice');
  const maxPrice = params.get('maxPrice');
  const minStock = params.get('minStock');
  const maxStock = params.get('maxStock');
  const isActive = params.get('isActive');
  const stockStatus = params.get('stockStatus');
  const showDeleted = params.get('showDeleted') === 'true';

  let scopedQuery = (query as unknown as {
    eq: (column: string, value: unknown) => unknown;
  }).eq('organization_id', orgId) as unknown;

  // Siempre filtramos productos con deleted_at (soft-deleted) a menos que
  // la columna no exista en el esquema (el caller pasa applyDeletedFilter=false)
  if (options?.applyDeletedFilter !== false) {
    if (showDeleted) {
      scopedQuery = (scopedQuery as unknown as { not: (column: string, op: string, value: null) => unknown })
        .not('deleted_at', 'is', null);
    } else {
      scopedQuery = (scopedQuery as unknown as { is: (column: string, value: null) => unknown })
        .is('deleted_at', null);
    }
  }

  if (search) {
    const s = sanitizeSearch(search);
    scopedQuery = (scopedQuery as unknown as { or: (filters: string) => unknown })
      .or(`name.ilike.%${s}%,sku.ilike.%${s}%,description.ilike.%${s}%`);
  }

  if (categoryId) {
    scopedQuery = (scopedQuery as unknown as { eq: (column: string, value: unknown) => unknown })
      .eq('category_id', categoryId);
  }

  if (supplierId) {
    scopedQuery = (scopedQuery as unknown as { eq: (column: string, value: unknown) => unknown })
      .eq('supplier_id', supplierId);
  }

  if (minPrice) {
    scopedQuery = (scopedQuery as unknown as { gte: (column: string, value: number) => unknown })
      .gte('sale_price', Number.parseFloat(minPrice));
  }

  if (maxPrice) {
    scopedQuery = (scopedQuery as unknown as { lte: (column: string, value: number) => unknown })
      .lte('sale_price', Number.parseFloat(maxPrice));
  }

  if (minStock) {
    scopedQuery = (scopedQuery as unknown as { gte: (column: string, value: number) => unknown })
      .gte('stock_quantity', Number.parseInt(minStock, 10));
  }

  if (maxStock) {
    scopedQuery = (scopedQuery as unknown as { lte: (column: string, value: number) => unknown })
      .lte('stock_quantity', Number.parseInt(maxStock, 10));
  }

  // Filtro de estado activo/inactivo: simple eq sobre is_active.
  // Cuando isActive es null (no enviado) no aplicamos ningún filtro de estado.
  if (isActive !== null && !showDeleted) {
    scopedQuery = (scopedQuery as unknown as { eq: (column: string, value: unknown) => unknown })
      .eq('is_active', isActive === 'true');
  }

  if (stockStatus) {
    switch (stockStatus) {
      case 'out_of_stock':
        scopedQuery = (scopedQuery as unknown as { eq: (column: string, value: unknown) => unknown })
          .eq('stock_quantity', 0);
        break;
      case 'low_stock':
        scopedQuery = (scopedQuery as unknown as { gt: (column: string, value: number) => unknown })
          .gt('stock_quantity', 0);
        break;
      case 'in_stock':
        scopedQuery = (scopedQuery as unknown as { gt: (column: string, value: number) => unknown })
          .gt('stock_quantity', 0);
        break;
      case 'critical':
        scopedQuery = (scopedQuery as unknown as { gt: (column: string, value: number) => unknown })
          .gt('stock_quantity', 0);
        break;
    }
  }

  return scopedQuery;
}

function normalizeProduct(
  product: ProductRow,
  categoryMap: Map<string, ProductRow>
) {
  const id = String(product['id'] ?? '');
  const categoryId = String(product['category_id'] ?? '');
  const images = normalizeImages(product['images']);
  const categoryCandidate =
    product['categories'] ||
    product['category'] ||
    (categoryId ? categoryMap.get(categoryId) : null);
  const supplierCandidate = product['suppliers'] || product['supplier'] || null;
  const category =
    categoryCandidate && typeof categoryCandidate === 'object'
      ? (categoryCandidate as Record<string, unknown>)
      : null;
  const supplier =
    supplierCandidate && typeof supplierCandidate === 'object'
      ? (supplierCandidate as Record<string, unknown>)
      : null;

  return {
    id,
    name: String(product['name'] ?? ''),
    sku: String(product['sku'] ?? ''),
    description: String(product['description'] ?? ''),
    cost_price: Number(product['cost_price'] || 0),
    sale_price: Number(product['sale_price'] || 0),
    offer_price: (product['offer_price'] as unknown) ?? undefined,
    wholesale_price: (product['wholesale_price'] as unknown) ?? undefined,
    min_wholesale_quantity: (product['min_wholesale_quantity'] as unknown) ?? undefined,
    stock_quantity: Number(product['stock_quantity'] || 0),
    min_stock: Number(product['min_stock'] || 0),
    max_stock: (product['max_stock'] as unknown) ?? undefined,
    is_active: product['is_active'] !== false,
    is_public: product['is_public'] !== false,
    created_at: String(product['created_at'] ?? ''),
    updated_at: String(product['updated_at'] ?? ''),
    image_url: (product['image_url'] as unknown as string | null) || images[0] || null,
    images,
    barcode: (product['barcode'] as unknown) ?? undefined,
    discount_percentage: Number(product['discount_percentage'] || 0),
    category_id: categoryId,
    supplier_id: (product['supplier_id'] as unknown) ?? undefined,
    category: category ? {
      id: String(category['id'] ?? ''),
      name: String(category['name'] ?? ''),
      description: String(category['description'] ?? ''),
      is_active: category['is_active'] !== false,
      created_at: String(category['created_at'] ?? product['created_at'] ?? ''),
      updated_at: String(category['updated_at'] ?? product['updated_at'] ?? ''),
    } : null,
    supplier: supplier ? {
      id: String(supplier['id'] ?? ''),
      name: String(supplier['name'] ?? ''),
      email: String(supplier['email'] ?? ''),
      phone: String(supplier['phone'] ?? ''),
      address: String(supplier['address'] ?? ''),
      is_active: supplier['is_active'] !== false,
      created_at: String(supplier['created_at'] ?? product['created_at'] ?? ''),
      updated_at: String(supplier['updated_at'] ?? product['updated_at'] ?? ''),
    } : null,
  };
}

const rateLimiter = rateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many requests. Please wait before making more requests.',
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

    const stockStatus = searchParams.get('stockStatus');
    // Siempre filtramos los registros con deleted_at para no mostrar productos
    // eliminados. Cuando isActive=false solo mostramos is_active=false.
    const applyDeletedFilter = true;

    const buildQuery = (
      select: string,
      options?: { applyDeletedFilter?: boolean }
    ) => {
      let query = supabase
        .from('products')
        .select(select, { count: 'exact' });

      query = applyProductFilters(query, searchParams, orgId, options) as typeof query;
      const orderedQuery = query.order(sortField, { ascending: sortOrder === 'asc' });

      if (stockStatus) {
        return orderedQuery.range(0, STOCK_STATUS_CANDIDATE_LIMIT - 1);
      }

      return orderedQuery.range(from, to);
    };

    let { data: products, error, count } = await buildQuery(RICH_PRODUCT_SELECT, {
      applyDeletedFilter,
    });

    if (error && isMissingColumnError(error, 'deleted_at')) {
      // La columna deleted_at no existe — reintentamos sin ese filtro
      const retry = await buildQuery(RICH_PRODUCT_SELECT, {
        applyDeletedFilter: false,
      });
      products = retry.data;
      error = retry.error;
      count = retry.count;
    }

    if (error) {
      console.warn('[products/list] Rich select failed, retrying with legacy select:', {
        code: error.code,
        message: error.message,
      });

      const fallback = await buildQuery('*', {
        applyDeletedFilter,
      });
      products = fallback.data;
      error = fallback.error;
      count = fallback.count;
    }

    if (error) {
      throw error;
    }

    const rows = (products || []) as unknown as ProductRow[];
    const categoryIds = Array.from(new Set(
      rows
        .map((product) => String(product['category_id'] ?? '').trim())
        .filter((id) => Boolean(id))
    )) as string[];
    const categoryMap = new Map<string, ProductRow>();

    if (categoryIds.length > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id,name,description,created_at,updated_at')
        .eq('organization_id', orgId)
        .in('id', categoryIds);

      if (!categoriesError) {
        (categories || []).forEach((category: ProductRow) => {
          const id = String(category['id'] ?? '').trim();
          if (id) categoryMap.set(id, category);
        });
      }
    }

    const transformedProducts = rows.map((product) => normalizeProduct(product, categoryMap));

    // Post-procesamiento de stockStatus usando min_stock real del producto.
    // La DB no soporta comparación entre columnas con Supabase JS client,
    // por eso filtramos aquí con los datos ya cargados.
    const stockFilteredProducts = stockStatus
      ? transformedProducts.filter((p) => {
          const stock = p.stock_quantity;
          const min = p.min_stock;
          switch (stockStatus) {
            case 'out_of_stock':
              return stock === 0;
            case 'low_stock':
              return stock > 0 && stock <= min;
            case 'in_stock':
              return stock > min;
            case 'critical':
              return stock > 0 && stock <= Math.ceil(min / 2);
            default:
              return true;
          }
        })
      : transformedProducts;

    const finalProducts = stockStatus
      ? stockFilteredProducts.slice(from, to + 1)
      : stockFilteredProducts;
    const total = stockStatus ? stockFilteredProducts.length : (count || 0);
    const totalPages = Math.ceil(total / limit);

    const response = NextResponse.json({
      products: finalProducts,
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

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
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
