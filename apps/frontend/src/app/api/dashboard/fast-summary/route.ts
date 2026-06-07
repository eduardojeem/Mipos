import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';

/**
 * Fast Dashboard Summary API — ultra-fast parallel queries con multi-tenant.
 *
 * Cambios:
 * - totalProducts ahora filtra is_active=true para coincidir con la sección
 *   de productos del dashboard (que también filtra activos por defecto).
 * - El handler POST que exponía exec_sql (ejecución de SQL arbitrario) fue
 *   eliminado por ser una vulnerabilidad crítica de seguridad.
 */

function isMissingColumnError(error: unknown, column: string): boolean {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  const normalized = column.trim().toLowerCase();
  if (!message || !normalized) return false;
  if (message.includes(`column "${normalized}"`) && message.includes('does not exist')) return true;
  if (message.includes(`could not find`) && message.includes(normalized) && message.includes('schema cache')) return true;
  if (message.includes(`could not find the '${normalized}' column`)) return true;
  if (String((error as { code?: unknown })?.code || '').toLowerCase() === 'pgrst204' && message.includes(normalized)) return true;
  return false;
}

async function countVisibleActiveProducts(orgId: string): Promise<number | null> {
  const admin = await createAdminClient();
  const baseQuery = () =>
    admin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_active', true);

  let result = await baseQuery().is('deleted_at', null);

  if (result.error && isMissingColumnError(result.error, 'deleted_at')) {
    result = await baseQuery();
  }

  if (result.error) {
    console.warn('[dashboard/fast-summary] Could not count visible active products:', result.error.message);
    return null;
  }

  return Number(result.count ?? 0);
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await requireOrganization(request);
    const supabase = await createClient();

    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).toISOString();
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    ).toISOString();

    // Queries paralelas — RPC para ventas y pedidos, query directa para
    // productos activos (el RPC get_dashboard_counts no filtra is_active).
    const [todayStats, basicCounts, ordersStats, activeProductsCount, monthSalesRows] =
      await Promise.all([
        supabase
          .rpc('get_today_sales_summary', {
            date_start: todayStart,
            org_id: orgId,
          })
          .single(),

        supabase.rpc('get_dashboard_counts', { org_id: orgId }).single(),

        supabase.rpc('get_orders_dashboard_stats', { org_id: orgId }).single(),

        // Conteo de productos visibles activos: misma regla que /api/products/list.
        countVisibleActiveProducts(orgId),

        createAdminClient().then((admin) =>
          admin
            .from('sales')
            .select('total')
            .eq('organization_id', orgId)
            .gte('created_at', monthStart)
            .limit(10000),
        ),
      ]);

    const todayData = (todayStats.data || {
      total_sales: 0,
      sales_count: 0,
    }) as { total_sales: number; sales_count: number };

    const countsData = (basicCounts.data || {
      customers_count: 0,
      products_count: 0,
      low_stock_count: 0,
    }) as {
      customers_count: number;
      products_count: number;
      low_stock_count: number;
    };

    const ordersData = (ordersStats.data || {
      pending_orders: 0,
      confirmed_orders: 0,
      preparing_orders: 0,
      shipped_orders: 0,
      delivered_orders: 0,
      total_orders_today: 0,
      orders_revenue_today: 0,
    }) as {
      pending_orders: number;
      confirmed_orders: number;
      preparing_orders: number;
      shipped_orders: number;
      delivered_orders: number;
      total_orders_today: number;
      orders_revenue_today: number;
    };

    // Preferir el conteo directo de activos; caer en el del RPC como último
    // recurso (puede incluir inactivos, pero es mejor que mostrar 0).
    const totalProducts =
      activeProductsCount !== null && activeProductsCount !== undefined
        ? activeProductsCount
        : countsData.products_count || 0;

    const averageTicket =
      todayData.sales_count > 0
        ? todayData.total_sales / todayData.sales_count
        : 0;
    const monthSales = Array.isArray(monthSalesRows.data)
      ? monthSalesRows.data.reduce((sum, row: { total?: number | string | null }) => {
          const total = Number(row.total ?? 0);
          return Number.isFinite(total) ? sum + total : sum;
        }, 0)
      : todayData.total_sales || 0;
    const activeOrders =
      (ordersData.pending_orders || 0) +
      (ordersData.confirmed_orders || 0) +
      (ordersData.preparing_orders || 0);

    const summary = {
      todaySales: todayData.total_sales || 0,
      todaySalesCount: todayData.sales_count || 0,
      averageTicket,
      totalCustomers: countsData.customers_count || 0,
      totalProducts,
      lowStockCount: countsData.low_stock_count || 0,
      monthSales,
      activeOrders,
      recentSales: [],
      webOrders: {
        pending: ordersData.pending_orders || 0,
        confirmed: ordersData.confirmed_orders || 0,
        preparing: ordersData.preparing_orders || 0,
        shipped: ordersData.shipped_orders || 0,
        delivered: ordersData.delivered_orders || 0,
        todayTotal: ordersData.total_orders_today || 0,
        todayRevenue: ordersData.orders_revenue_today || 0,
      },
      lastUpdated: new Date().toISOString(),
      isFastMode: true,
    };

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Fast dashboard summary error:', error);

    const empty = {
      todaySales: 0,
      todaySalesCount: 0,
      averageTicket: 0,
      totalCustomers: 0,
      totalProducts: 0,
      lowStockCount: 0,
      monthSales: 0,
      activeOrders: 0,
      recentSales: [],
      webOrders: {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        shipped: 0,
        delivered: 0,
        todayTotal: 0,
        todayRevenue: 0,
      },
      lastUpdated: new Date().toISOString(),
      isFastMode: true,
    };

    if (
      error instanceof Error &&
      error.message.includes('No valid organization')
    ) {
      return NextResponse.json(empty);
    }

    return NextResponse.json(
      { ...empty, error: 'Fallback mode - using cached data' },
      { status: 500 },
    );
  }
}
