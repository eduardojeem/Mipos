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

    const supabase = await createClient();
    const headerOrgId = request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    const organizationId = headerOrgId || (auth.userId ? await getUserOrganizationId(auth.userId) : null)

    // Get current date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Optimized parallel queries for POS stats
    const [
      todaySalesResult,
      weekSalesResult,
      monthSalesResult,
      topProductsResult,
      lowStockResult
    ] = await Promise.all([
      // Today's sales
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', today.toISOString())
        .eq('status', 'completed')
        .eq('organization_id', organizationId || ''),

      // This week's sales
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', thisWeek.toISOString())
        .eq('status', 'completed')
        .eq('organization_id', organizationId || ''),

      // This month's sales
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', thisMonth.toISOString())
        .eq('status', 'completed')
        .eq('organization_id', organizationId || ''),

      // Top selling products (last 30 days)
      supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          products!inner (
            name,
            sku
          ),
          sales!inner (
            created_at,
            status
          )
        `)
        .gte('sales.created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('sales.status', 'completed')
        .eq('sales.organization_id', organizationId || '')
        .eq('products.organization_id', organizationId || '')
        .limit(100), // Limit for performance

      // Low stock products
      supabase
        .from('products')
        .select('id, name, stock_quantity, min_stock')
        .eq('is_active', true)
        .lte('stock_quantity', 10) // Products with 10 or fewer items
        .eq('organization_id', organizationId || '')
        .order('stock_quantity')
        .limit(20)
    ]);

    type SaleRow = { total_amount: number | null };
    const todaySalesData = (todaySalesResult.data ?? []) as SaleRow[];
    const todaySales = todaySalesData.reduce((sum: number, sale) => sum + (sale.total_amount || 0), 0);
    const todayTransactions = todaySalesData.length;

    const weekSalesData = (weekSalesResult.data ?? []) as SaleRow[];
    const weekSales = weekSalesData.reduce((sum: number, sale) => sum + (sale.total_amount || 0), 0);
    const weekTransactions = weekSalesData.length;

    const monthSalesData = (monthSalesResult.data ?? []) as SaleRow[];
    const monthSales = monthSalesData.reduce((sum: number, sale) => sum + (sale.total_amount || 0), 0);
    const monthTransactions = monthSalesData.length;

    // Calculate average ticket
    const averageTicket = todayTransactions > 0 ? todaySales / todayTransactions : 0;

    type SaleItemRow = {
      product_id: string;
      quantity: number | null;
      products?: { name: string | null; sku: string | null };
    };
    const productSales = new Map<string, { name: string; sku: string; quantity: number }>();
    const topItems = (topProductsResult.data ?? []) as SaleItemRow[];
    topItems.forEach((item) => {
      const productId = item.product_id;
      const existing =
        productSales.get(productId) ||
        {
          name: item.products?.name || 'Unknown Product',
          sku: item.products?.sku || '',
          quantity: 0
        };
      existing.quantity += item.quantity || 0;
      productSales.set(productId, existing);
    });

    const topProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    type LowStockRow = { id: string; name: string | null; stock_quantity: number | null; min_stock: number | null };
    type LowStockProduct = {
      id: string;
      name: string | null;
      stock_quantity: number;
      min_stock: number;
      urgency: 'critical' | 'high' | 'medium';
    };
    const lowStockData = (lowStockResult.data ?? []) as LowStockRow[];
    const lowStockProducts: LowStockProduct[] = lowStockData.map((product) => ({
      id: product.id,
      name: product.name,
      stock_quantity: product.stock_quantity || 0,
      min_stock: product.min_stock || 5,
      urgency: (product.stock_quantity || 0) === 0 ? 'critical' : (product.stock_quantity || 0) <= 2 ? 'high' : 'medium'
    }));

    const stats = {
      // Sales metrics
      todaySales,
      todayTransactions,
      weekSales,
      weekTransactions,
      monthSales,
      monthTransactions,
      averageTicket,
      
      // Product insights
      topProducts,
      lowStockProducts,
      lowStockCount: lowStockProducts.length,
      criticalStockCount: lowStockProducts.filter(p => p.urgency === 'critical').length,
      
      // Performance indicators
      salesGrowth: weekTransactions > 0 ? ((todayTransactions / (weekTransactions / 7)) - 1) * 100 : 0,
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      dataRange: {
        today: today.toISOString(),
        thisWeek: thisWeek.toISOString(),
        thisMonth: thisMonth.toISOString()
      }
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('POS stats error:', error);
    
    // Return fallback stats
    return NextResponse.json({
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
      error: 'Could not fetch POS stats'
    });
  }
}
