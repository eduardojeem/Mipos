import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import type {
  DashboardOverviewData,
  DashboardRecentSale,
  DashboardSummaryData,
  DashboardTimeRange,
} from '@/lib/dashboard/types';

// Track which "missing relation" errors we've already logged, so we warn
// once per process instead of on every dashboard render. The dashboard makes
// 6+ queries to potentially-missing tables (sales, sale_items, ...) and
// before this we logged each one on every request.
const loggedMissingRelations = new Set<string>();
const OVERVIEW_CACHE_TTL_MS = 15_000;
const SUMMARY_CACHE_TTL_MS = 30_000;

// Hard ceiling for fallback queries that compute aggregates client-side.
// Without this, queries like SELECT total FROM sales WHERE org=X could pull
// 50k+ rows on every dashboard load when the RPC functions aren't available
// — the single biggest source of Supabase egress / row-read cost. When a
// query hits this cap we warn so it's visible that the local aggregate is
// likely incomplete and the dashboard RPC should be deployed.
const MAX_FALLBACK_ROWS = 10000;
const loggedRowCaps = new Set<string>();
function warnIfCapHit(label: string, rows: unknown) {
  if (!Array.isArray(rows) || rows.length < MAX_FALLBACK_ROWS) return;
  if (loggedRowCaps.has(label)) return;
  loggedRowCaps.add(label);
  console.warn(`[dashboard] ${label} hit ${MAX_FALLBACK_ROWS}-row fallback cap — totals may be incomplete. Deploy get_dashboard_overview_v1 / get_dashboard_analytics_v1 RPCs for accurate aggregates.`);
}

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const overviewCache = new Map<string, CacheEntry<DashboardOverviewData>>();
const summaryCache = new Map<string, CacheEntry<DashboardSummaryData>>();

function isMissingRelationError(err: { message?: string } | null | undefined): boolean {
  return Boolean(err?.message && /relation .* does not exist/i.test(err.message));
}

function warnQueryError(label: string, err: { message?: string } | null | undefined) {
  if (!err) return;
  if (isMissingRelationError(err)) {
    if (loggedMissingRelations.has(label)) return;
    loggedMissingRelations.add(label);
    // The most common cause is NOT a missing table — it's an RPC function
    // defined with `SET search_path = ''` that references unqualified table
    // names (e.g. `FROM sales` instead of `FROM public.sales`). Run:
    //
    //   SELECT proname, proconfig, LEFT(prosrc, 500)
    //   FROM pg_proc WHERE proname = '<rpc_name>';
    //
    // If proconfig contains `search_path=` (empty) and prosrc references
    // unqualified tables, fix with:
    //   ALTER FUNCTION public.<name>(...) SET search_path = public, pg_catalog;
    console.warn(
      `[dashboard] ${label}: relation lookup failed — likely an RPC with empty search_path referencing unqualified tables. Falling back to direct queries (more expensive). See dashboard-data.ts warnQueryError for diagnostic SQL.`
    );
    return;
  }
  console.warn(`[dashboard] ${label}:`, err.message);
}

function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedValue<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  ttlMs: number
): T {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
  return data;
}

const EMPTY_OVERVIEW: DashboardOverviewData = {
  todaySales: 0,
  monthSales: 0,
  totalCustomers: 0,
  totalProducts: 0,
  activeOrders: 0,
  lowStockCount: 0,
  todaySalesCount: 0,
  averageTicket: 0,
  webOrders: {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    shipped: 0,
    delivered: 0,
    todayTotal: 0,
    todayRevenue: 0,
  },
  recentSales: [],
  lastUpdated: '',
  isQuickMode: true,
};

const EMPTY_SUMMARY: DashboardSummaryData = {
  daily: [],
  categories: [],
  topProducts: [],
  totals: {
    orders: 0,
    revenue: 0,
    previousOrders: 0,
    previousRevenue: 0,
  },
  lastUpdated: '',
};

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeRecentSales(value: unknown): DashboardRecentSale[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const sale = item as Record<string, unknown>;
      return {
        id: toStringValue(sale.id),
        customer_name: toStringValue(sale.customer_name, 'Cliente General'),
        total: toNumber(sale.total),
        created_at: toStringValue(sale.created_at),
        payment_method: toStringValue(sale.payment_method, 'cash'),
      };
    })
    .filter((item): item is DashboardRecentSale => Boolean(item?.id));
}

function mapOverviewPayload(value: unknown): DashboardOverviewData | null {
  if (Array.isArray(value) && value.length === 1) {
    return mapOverviewPayload(value[0]);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const webOrdersRaw =
    raw.web_orders && typeof raw.web_orders === 'object'
      ? (raw.web_orders as Record<string, unknown>)
      : raw.webOrders && typeof raw.webOrders === 'object'
        ? (raw.webOrders as Record<string, unknown>)
        : {};

  return {
    todaySales: toNumber(raw.today_sales ?? raw.todaySales),
    monthSales: toNumber(raw.month_sales ?? raw.monthSales),
    totalCustomers: toNumber(raw.total_customers ?? raw.totalCustomers),
    totalProducts: toNumber(raw.total_products ?? raw.totalProducts),
    activeOrders: toNumber(raw.active_orders ?? raw.activeOrders),
    lowStockCount: toNumber(raw.low_stock_count ?? raw.lowStockCount),
    todaySalesCount: toNumber(raw.today_sales_count ?? raw.todaySalesCount),
    averageTicket: toNumber(raw.average_ticket ?? raw.averageTicket),
    webOrders: {
      pending: toNumber(webOrdersRaw.pending),
      confirmed: toNumber(webOrdersRaw.confirmed),
      preparing: toNumber(webOrdersRaw.preparing),
      shipped: toNumber(webOrdersRaw.shipped),
      delivered: toNumber(webOrdersRaw.delivered),
      todayTotal: toNumber(webOrdersRaw.today_total ?? webOrdersRaw.todayTotal),
      todayRevenue: toNumber(webOrdersRaw.today_revenue ?? webOrdersRaw.todayRevenue),
    },
    recentSales: normalizeRecentSales(raw.recent_sales ?? raw.recentSales),
    lastUpdated: toStringValue(raw.last_updated ?? raw.lastUpdated, new Date().toISOString()),
    isQuickMode: true,
  };
}

function mapSummaryPayload(value: unknown): DashboardSummaryData | null {
  if (Array.isArray(value) && value.length === 1) {
    return mapSummaryPayload(value[0]);
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const daily = Array.isArray(raw.daily) ? raw.daily : [];
  const categories = Array.isArray(raw.categories) ? raw.categories : [];
  const topProducts = Array.isArray(raw.topProducts)
    ? raw.topProducts
    : Array.isArray(raw.top_products)
      ? raw.top_products
      : [];
  const totalsRaw =
    raw.totals && typeof raw.totals === 'object'
      ? (raw.totals as Record<string, unknown>)
      : {};

  return {
    daily: daily.map((entry) => {
      const item = (entry || {}) as Record<string, unknown>;
      return {
        day: toStringValue(item.day),
        orders: toNumber(item.orders),
        revenue: toNumber(item.revenue),
      };
    }),
    categories: categories.map((entry) => {
      const item = (entry || {}) as Record<string, unknown>;
      return {
        name: toStringValue(item.name, 'Sin categoria'),
        value: toNumber(item.value),
        items: toNumber(item.items),
      };
    }),
    topProducts: topProducts.map((entry) => {
      const item = (entry || {}) as Record<string, unknown>;
      return {
        id: toStringValue(item.id),
        name: toStringValue(item.name, 'Producto'),
        category: toStringValue(item.category, 'Sin categoria'),
        sales: toNumber(item.sales),
        revenue: toNumber(item.revenue),
        stock: toNumber(item.stock),
      };
    }),
    totals: {
      orders: toNumber(totalsRaw.orders),
      revenue: toNumber(totalsRaw.revenue),
      previousOrders: toNumber(totalsRaw.previousOrders ?? totalsRaw.previous_orders),
      previousRevenue: toNumber(totalsRaw.previousRevenue ?? totalsRaw.previous_revenue),
    },
    lastUpdated: toStringValue(raw.lastUpdated ?? raw.last_updated, new Date().toISOString()),
  };
}

function getRangeWindow(range: DashboardTimeRange) {
  const now = new Date();

  switch (range) {
    case '24h': {
      const currentStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      return { currentStart, previousStart };
    }
    case '7d': {
      const currentStart = new Date(now);
      currentStart.setHours(0, 0, 0, 0);
      currentStart.setDate(currentStart.getDate() - 6);
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      return { currentStart, previousStart };
    }
    case '90d': {
      const currentStart = new Date(now);
      currentStart.setHours(0, 0, 0, 0);
      currentStart.setDate(currentStart.getDate() - 89);
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 90);
      return { currentStart, previousStart };
    }
    case '1y': {
      const currentStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const previousStart = new Date(now.getFullYear(), now.getMonth() - 23, 1);
      return { currentStart, previousStart };
    }
    case '30d':
    default: {
      const currentStart = new Date(now);
      currentStart.setHours(0, 0, 0, 0);
      currentStart.setDate(currentStart.getDate() - 29);
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 30);
      return { currentStart, previousStart };
    }
  }
}

function buildDailySeries(
  sales: Array<{ created_at: string; total: number }>,
  range: DashboardTimeRange
) {
  const bucketMap = new Map<string, { day: string; orders: number; revenue: number }>();

  for (const sale of sales) {
    const createdAt = new Date(sale.created_at);
    if (Number.isNaN(createdAt.getTime())) {
      continue;
    }

    let bucketDate = createdAt;

    if (range === '24h') {
      bucketDate = new Date(createdAt);
      bucketDate.setMinutes(0, 0, 0);
    } else if (range === '1y') {
      bucketDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
    } else if (range === '90d') {
      bucketDate = new Date(createdAt);
      bucketDate.setHours(0, 0, 0, 0);
      bucketDate.setDate(bucketDate.getDate() - bucketDate.getDay());
    } else {
      bucketDate = new Date(createdAt);
      bucketDate.setHours(0, 0, 0, 0);
    }

    const key = bucketDate.toISOString();
    const existing = bucketMap.get(key) ?? { day: key, orders: 0, revenue: 0 };
    existing.orders += 1;
    existing.revenue += toNumber(sale.total);
    bucketMap.set(key, existing);
  }

  return Array.from(bucketMap.values()).sort((left, right) => left.day.localeCompare(right.day));
}

export async function fetchDashboardOverview(
  organizationId: string | null | undefined
): Promise<DashboardOverviewData> {
  const nowIso = new Date().toISOString();

  if (!organizationId) {
    return {
      ...EMPTY_OVERVIEW,
      lastUpdated: nowIso,
    };
  }

  const cachedOverview = getCachedValue(overviewCache, organizationId);
  if (cachedOverview) {
    return cachedOverview;
  }

  const supabase = await createAdminClient();
  console.log('[dashboard] Using admin client for org:', organizationId);
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Try RPC first, but don't block on it
  const overviewRpc = await supabase
    .rpc('get_dashboard_overview_v1', {
      org_id: organizationId,
      date_start: startOfDay.toISOString(),
      month_start: startOfMonth.toISOString(),
    })
    .single();

  if (!overviewRpc.error) {
    const mapped = mapOverviewPayload(overviewRpc.data);
    if (mapped) {
      // El RPC puede devolver totalProducts sin filtrar is_active.
      // Sobreescribimos con una query directa de solo activos para
      // mantener consistencia con la sección de productos del dashboard.
      const { count: activeCount } = await supabase
        .from('products')
        .select('id', { count: 'estimated', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (activeCount !== null && activeCount !== undefined) {
        mapped.totalProducts = activeCount;
      }

      return setCachedValue(overviewCache, organizationId, mapped, OVERVIEW_CACHE_TTL_MS);
    }
  }

  // Fallback: direct queries (admin client bypasses RLS, we filter by org_id manually)
  const [
    todayStatsResult,
    monthSalesResult,
    customersResult,
    productsResult,
    lowStockProductsResult,
    recentSalesResult,
    orderStatusesResult,
  ] = await Promise.all([
    supabase
      .rpc('get_today_sales_summary', {
        date_start: startOfDay.toISOString(),
        org_id: organizationId,
      })
      .single()
      .then((r: { data: unknown; error: { message: string } | null }) => {
        warnQueryError('get_today_sales_summary RPC', r.error);
        return r;
      }),
    supabase
      .from('sales')
      .select('total')
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth.toISOString())
      .limit(MAX_FALLBACK_ROWS),
    supabase
      .from('customers')
      .select('id', { count: 'estimated', head: true })
      .eq('organization_id', organizationId),
    supabase
      .from('products')
      .select('id', { count: 'estimated', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('products')
      .select('stock_quantity, min_stock')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(MAX_FALLBACK_ROWS),
    supabase
      .from('sales')
      .select('id, total, created_at, payment_method, customer:customers(name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(6),
    // Antes leía TODOS los pedidos en estados activos sin filtro de fecha
    // (potencialmente miles). Lo restringimos a los últimos 30 días — para
    // contar pedidos "activos" y hoy alcanza, y limita el row count.
    supabase
      .from('sales')
      .select('status, total, created_at')
      .eq('organization_id', organizationId)
      .in('status', ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'])
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(MAX_FALLBACK_ROWS),
  ]);

  // Log errors at most once per missing-relation per process; avoids spamming
  // every dashboard render. Successful counts no longer logged at all.
  warnQueryError('customers count', customersResult.error);
  warnQueryError('products count', productsResult.error);
  warnQueryError('month sales', monthSalesResult.error);
  warnQueryError('low stock products', lowStockProductsResult.error);
  warnIfCapHit('month sales', monthSalesResult.data);
  warnIfCapHit('low stock products', lowStockProductsResult.data);
  warnIfCapHit('order statuses', orderStatusesResult.data);
  warnQueryError('recent sales', recentSalesResult.error);
  warnQueryError('order statuses', orderStatusesResult.error);

  const todayStats = (todayStatsResult.data || {}) as Record<string, unknown>;
  const monthSalesRows = (Array.isArray(monthSalesResult.data) ? monthSalesResult.data : []) as Array<{
    total?: number;
  }>;
  const lowStockProducts = (Array.isArray(lowStockProductsResult.data)
    ? lowStockProductsResult.data
    : []) as Array<{
    stock_quantity?: number;
    min_stock?: number;
  }>;
  const recentSalesRows = (Array.isArray(recentSalesResult.data) ? recentSalesResult.data : []) as Array<{
    id?: string;
    total?: number;
    created_at?: string;
    payment_method?: string;
    customer?: { name?: string } | Array<{ name?: string }> | null;
  }>;
  const orderStatuses = (Array.isArray(orderStatusesResult.data) ? orderStatusesResult.data : []) as Array<{
    status?: string;
    total?: number;
    created_at?: string;
  }>;

  let pendingOrders = 0;
  let confirmedOrders = 0;
  let preparingOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;
  let todayOrdersTotal = 0;
  let todayOrdersRevenue = 0;

  for (const row of orderStatuses) {
    const status = toStringValue((row as { status?: string }).status).toUpperCase();
    if (status === 'PENDING') pendingOrders += 1;
    if (status === 'CONFIRMED') confirmedOrders += 1;
    if (status === 'PREPARING') preparingOrders += 1;
    if (status === 'SHIPPED') shippedOrders += 1;
    if (status === 'DELIVERED') deliveredOrders += 1;

    const createdAt = toStringValue((row as { created_at?: string }).created_at);
    if (createdAt && createdAt >= startOfDay.toISOString()) {
      todayOrdersTotal += 1;
      todayOrdersRevenue += toNumber((row as { total?: number }).total);
    }
  }

  return setCachedValue(overviewCache, organizationId, {
    todaySales: toNumber(todayStats.total_sales),
    monthSales: monthSalesRows.reduce((sum, row) => sum + toNumber(row.total), 0),
    totalCustomers: toNumber(customersResult.count),
    totalProducts: toNumber(productsResult.count),
    activeOrders: pendingOrders + confirmedOrders + preparingOrders,
    lowStockCount: lowStockProducts.filter((product) => toNumber(product.stock_quantity) <= toNumber(product.min_stock)).length,
    todaySalesCount: toNumber(todayStats.sales_count),
    averageTicket:
      toNumber(todayStats.sales_count) > 0
        ? toNumber(todayStats.total_sales) / toNumber(todayStats.sales_count)
        : 0,
    webOrders: {
      pending: pendingOrders,
      confirmed: confirmedOrders,
      preparing: preparingOrders,
      shipped: shippedOrders,
      delivered: deliveredOrders,
      todayTotal: todayOrdersTotal,
      todayRevenue: todayOrdersRevenue,
    },
    recentSales: recentSalesRows.map((sale) => {
      const customer = Array.isArray(sale.customer) ? sale.customer[0] : sale.customer;
      return {
        id: toStringValue(sale.id),
        customer_name: toStringValue(customer?.name, 'Cliente General'),
        total: toNumber(sale.total),
        created_at: toStringValue(sale.created_at),
        payment_method: toStringValue(sale.payment_method, 'cash').toLowerCase(),
      };
    }),
    lastUpdated: nowIso,
    isQuickMode: true,
  }, OVERVIEW_CACHE_TTL_MS);
}

export async function fetchDashboardSummary(
  organizationId: string | null | undefined,
  range: DashboardTimeRange
): Promise<DashboardSummaryData> {
  const nowIso = new Date().toISOString();

  if (!organizationId) {
    return {
      ...EMPTY_SUMMARY,
      lastUpdated: nowIso,
    };
  }

  const summaryCacheKey = `${organizationId}:${range}`;
  const cachedSummary = getCachedValue(summaryCache, summaryCacheKey);
  if (cachedSummary) {
    return cachedSummary;
  }

  const supabase = await createAdminClient();
  const summaryRpc = await supabase.rpc('get_dashboard_analytics_v1', {
    org_id: organizationId,
    range_key: range,
  });

  if (!summaryRpc.error) {
    const mapped = mapSummaryPayload(summaryRpc.data);
    if (mapped) {
      return setCachedValue(summaryCache, summaryCacheKey, mapped, SUMMARY_CACHE_TTL_MS);
    }
  }

  const { currentStart, previousStart } = getRangeWindow(range);

  const [currentSalesResult, previousSalesResult] = await Promise.all([
    supabase
      .from('sales')
      .select('created_at, total')
      .eq('organization_id', organizationId)
      .gte('created_at', currentStart.toISOString())
      .order('created_at', { ascending: true })
      .limit(MAX_FALLBACK_ROWS),
    supabase
      .from('sales')
      .select('created_at, total')
      .eq('organization_id', organizationId)
      .gte('created_at', previousStart.toISOString())
      .lt('created_at', currentStart.toISOString())
      .limit(MAX_FALLBACK_ROWS),
  ]);
  warnIfCapHit('summary current sales', currentSalesResult.data);
  warnIfCapHit('summary previous sales', previousSalesResult.data);

  const currentSales = (Array.isArray(currentSalesResult.data) ? currentSalesResult.data : []) as Array<{
    created_at?: string;
    total?: number;
  }>;
  const previousSales = (Array.isArray(previousSalesResult.data) ? previousSalesResult.data : []) as Array<{
    created_at?: string;
    total?: number;
  }>;

  return setCachedValue(summaryCache, summaryCacheKey, {
    daily: buildDailySeries(
      currentSales.map((sale) => ({
        created_at: toStringValue(sale.created_at),
        total: toNumber(sale.total),
      })),
      range
    ),
    categories: [],
    topProducts: [],
    totals: {
      orders: currentSales.length,
      revenue: currentSales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
      previousOrders: previousSales.length,
      previousRevenue: previousSales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
    },
    lastUpdated: nowIso,
  }, SUMMARY_CACHE_TTL_MS);
}
