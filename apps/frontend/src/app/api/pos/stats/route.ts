import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

const COMPLETED_SALE_STATUS = 'COMPLETED' as const;

type DateRanges = {
  today: Date;
  thisWeek: Date;
  thisMonth: Date;
  topProductsStart: Date;
};

type TopProduct = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
};

type LowStockProduct = {
  id: string;
  name: string | null;
  stock_quantity: number;
  min_stock: number;
  urgency: 'critical' | 'high' | 'medium';
};

type PosStatsResponse = {
  todaySales: number;
  todayTransactions: number;
  weekSales: number;
  weekTransactions: number;
  monthSales: number;
  monthTransactions: number;
  averageTicket: number;
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
  lowStockCount: number;
  criticalStockCount: number;
  salesGrowth: number;
  lastUpdated: string;
  dataRange: {
    today: string;
    thisWeek: string;
    thisMonth: string;
  };
  error?: string;
};

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return null;
  }

  return trimmed;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildDateRanges(now = new Date()): DateRanges {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() - today.getDay());

  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const topProductsStart = new Date(today);
  topProductsStart.setDate(topProductsStart.getDate() - 30);

  return {
    today,
    thisWeek,
    thisMonth,
    topProductsStart,
  };
}

function buildEmptyStats(ranges: DateRanges, error?: string): PosStatsResponse {
  return {
    todaySales: 0,
    todayTransactions: 0,
    weekSales: 0,
    weekTransactions: 0,
    monthSales: 0,
    monthTransactions: 0,
    averageTicket: 0,
    topProducts: [],
    lowStockProducts: [],
    lowStockCount: 0,
    criticalStockCount: 0,
    salesGrowth: 0,
    lastUpdated: new Date().toISOString(),
    dataRange: {
      today: ranges.today.toISOString(),
      thisWeek: ranges.thisWeek.toISOString(),
      thisMonth: ranges.thisMonth.toISOString(),
    },
    ...(error ? { error } : {}),
  };
}

function normalizeTopProducts(raw: unknown): TopProduct[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const item = entry as Record<string, unknown>;
      const id = normalizeString(String(item.id ?? ''));
      if (!id) {
        return null;
      }

      return {
        id,
        name: String(item.name || 'Unknown Product'),
        sku: String(item.sku || ''),
        quantity: toNumber(item.quantity),
      };
    })
    .filter((item): item is TopProduct => Boolean(item));
}

function normalizeLowStockProducts(raw: unknown): LowStockProduct[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const item = entry as Record<string, unknown>;
      const id = normalizeString(String(item.id ?? ''));
      if (!id) {
        return null;
      }

      const urgencyRaw = String(item.urgency || 'medium').toLowerCase();
      const urgency: LowStockProduct['urgency'] =
        urgencyRaw === 'critical' || urgencyRaw === 'high' ? urgencyRaw : 'medium';

      return {
        id,
        name: typeof item.name === 'string' ? item.name : null,
        stock_quantity: toNumber(item.stock_quantity),
        min_stock: toNumber(item.min_stock, 5),
        urgency,
      };
    })
    .filter((item): item is LowStockProduct => Boolean(item));
}

async function loadPosStatsWithRpc(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  ranges: DateRanges,
): Promise<PosStatsResponse> {
  const { data, error } = await supabase.rpc('get_pos_stats_v1', {
    org_id: organizationId,
    day_start: ranges.today.toISOString(),
    week_start: ranges.thisWeek.toISOString(),
    month_start: ranges.thisMonth.toISOString(),
    top_products_start: ranges.topProductsStart.toISOString(),
  });

  if (error) {
    throw error;
  }

  const payload =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const lowStockProducts = normalizeLowStockProducts(payload.lowStockProducts);
  const criticalStockCountFromList = lowStockProducts.filter(
    (product) => product.urgency === 'critical',
  ).length;

  return {
    todaySales: toNumber(payload.todaySales),
    todayTransactions: toNumber(payload.todayTransactions),
    weekSales: toNumber(payload.weekSales),
    weekTransactions: toNumber(payload.weekTransactions),
    monthSales: toNumber(payload.monthSales),
    monthTransactions: toNumber(payload.monthTransactions),
    averageTicket: toNumber(payload.averageTicket),
    topProducts: normalizeTopProducts(payload.topProducts),
    lowStockProducts,
    lowStockCount: toNumber(payload.lowStockCount, lowStockProducts.length),
    criticalStockCount: toNumber(
      payload.criticalStockCount,
      criticalStockCountFromList,
    ),
    salesGrowth: toNumber(payload.salesGrowth),
    lastUpdated:
      typeof payload.lastUpdated === 'string'
        ? payload.lastUpdated
        : new Date().toISOString(),
    dataRange: {
      today: ranges.today.toISOString(),
      thisWeek: ranges.thisWeek.toISOString(),
      thisMonth: ranges.thisMonth.toISOString(),
    },
  };
}

async function loadPosStatsWithQueries(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  now: Date,
  ranges: DateRanges,
): Promise<PosStatsResponse> {
  const [
    todaySalesResult,
    weekSalesResult,
    monthSalesResult,
    topProductsResult,
    lowStockResult,
  ] = await Promise.all([
    supabase
      .from('sales')
      .select('total_amount:total', { count: 'exact' })
      .gte('created_at', ranges.today.toISOString())
      .eq('status', COMPLETED_SALE_STATUS)
      .eq('organization_id', organizationId),

    supabase
      .from('sales')
      .select('total_amount:total', { count: 'exact' })
      .gte('created_at', ranges.thisWeek.toISOString())
      .eq('status', COMPLETED_SALE_STATUS)
      .eq('organization_id', organizationId),

    supabase
      .from('sales')
      .select('total_amount:total', { count: 'exact' })
      .gte('created_at', ranges.thisMonth.toISOString())
      .eq('status', COMPLETED_SALE_STATUS)
      .eq('organization_id', organizationId),

    supabase
      .from('sale_items')
      .select(`
        product_id,
        quantity,
        products!left (
          name,
          sku
        ),
        sales!inner (
          created_at,
          status
        )
      `)
      .gte('sales.created_at', ranges.topProductsStart.toISOString())
      .eq('sales.status', COMPLETED_SALE_STATUS)
      .eq('sales.organization_id', organizationId),

    supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock')
      .eq('is_active', true)
      .eq('organization_id', organizationId)
      .order('stock_quantity')
      .limit(50),
  ]);

  type SaleRow = { total_amount: number | null };
  const todaySalesData = (todaySalesResult.data ?? []) as SaleRow[];
  const todaySales = todaySalesData.reduce(
    (sum, sale) => sum + (sale.total_amount || 0),
    0,
  );
  const todayTransactions = todaySalesResult.count ?? todaySalesData.length;

  const weekSalesData = (weekSalesResult.data ?? []) as SaleRow[];
  const weekSales = weekSalesData.reduce(
    (sum, sale) => sum + (sale.total_amount || 0),
    0,
  );
  const weekTransactions = weekSalesResult.count ?? weekSalesData.length;

  const monthSalesData = (monthSalesResult.data ?? []) as SaleRow[];
  const monthSales = monthSalesData.reduce(
    (sum, sale) => sum + (sale.total_amount || 0),
    0,
  );
  const monthTransactions = monthSalesResult.count ?? monthSalesData.length;
  const averageTicket =
    todayTransactions > 0 ? todaySales / todayTransactions : 0;

  type SaleItemRow = {
    product_id: string;
    quantity: number | null;
    products?:
      | { name: string | null; sku: string | null }
      | Array<{ name: string | null; sku: string | null }>
      | null;
  };

  const productSales = new Map<
    string,
    { name: string; sku: string; quantity: number }
  >();
  const topItems = (topProductsResult.data ?? []) as unknown as SaleItemRow[];
  topItems.forEach((item) => {
    const productId = item.product_id;
    const productDetails = Array.isArray(item.products)
      ? item.products[0]
      : item.products;
    const existing = productSales.get(productId) || {
      name: productDetails?.name || 'Unknown Product',
      sku: productDetails?.sku || '',
      quantity: 0,
    };
    existing.quantity += item.quantity || 0;
    productSales.set(productId, existing);
  });

  const topProducts = Array.from(productSales.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 5);

  type LowStockRow = {
    id: string;
    name: string | null;
    stock_quantity: number | null;
    min_stock: number | null;
  };

  const lowStockRows = (lowStockResult.data ?? []) as LowStockRow[];
  const filteredLowStockRows = lowStockRows.filter((product) => {
    const stock = product.stock_quantity || 0;
    const minStock = product.min_stock || 5;
    return stock <= Math.max(minStock, 10);
  });

  const lowStockProducts = filteredLowStockRows
    .slice(0, 15)
    .map((product): LowStockProduct => {
      const stockQuantity = product.stock_quantity || 0;
      const urgency: LowStockProduct['urgency'] =
        stockQuantity === 0 ? 'critical' : stockQuantity <= 2 ? 'high' : 'medium';

      return {
        id: product.id,
        name: product.name,
        stock_quantity: stockQuantity,
        min_stock: product.min_stock || 5,
        urgency,
      };
    });

  const criticalStockCount = filteredLowStockRows.filter(
    (product) => (product.stock_quantity || 0) === 0,
  ).length;

  return {
    todaySales,
    todayTransactions,
    weekSales,
    weekTransactions,
    monthSales,
    monthTransactions,
    averageTicket,
    topProducts,
    lowStockProducts,
    lowStockCount: filteredLowStockRows.length,
    criticalStockCount,
    salesGrowth:
      weekTransactions > 0
        ? ((todayTransactions / (weekTransactions / 7)) - 1) * 100
        : 0,
    lastUpdated: now.toISOString(),
    dataRange: {
      today: ranges.today.toISOString(),
      thisWeek: ranges.thisWeek.toISOString(),
      thisMonth: ranges.thisMonth.toISOString(),
    },
  };
}

export async function GET(request: NextRequest) {
  const now = new Date();
  const ranges = buildDateRanges(now);

  try {
    const auth = await requirePOSPermissions(request, ['pos.access']);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createAdminClient();
    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') ||
        request.headers.get('X-Organization-Id'),
    );
    const organizationId =
      headerOrgId ||
      normalizeString(
        auth.userId ? await getUserOrganizationId(auth.userId) : null,
      );

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context is required' },
        { status: 400 },
      );
    }

    let stats: PosStatsResponse;

    try {
      stats = await loadPosStatsWithRpc(supabase, organizationId, ranges);
    } catch (rpcError) {
      console.warn(
        '[pos/stats] Falling back to legacy query path:',
        rpcError instanceof Error ? rpcError.message : rpcError,
      );
      stats = await loadPosStatsWithQueries(
        supabase,
        organizationId,
        now,
        ranges,
      );
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('POS stats error:', error);

    return NextResponse.json(
      buildEmptyStats(ranges, 'Could not fetch POS stats'),
    );
  }
}
