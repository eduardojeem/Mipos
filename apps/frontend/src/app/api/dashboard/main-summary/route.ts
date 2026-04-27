import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getValidatedOrganizationId(request);
    if (!orgId) {
      // Sin organización, devolver datos vacíos para evitar error 400 en el cliente
      return NextResponse.json({
        todaySales: 0, todaySalesCount: 0, monthSales: 0, averageTicket: 0,
        totalCustomers: 0, totalProducts: 0, lowStockCount: 0, activeOrders: 0,
        recentSales: [], lastUpdated: new Date().toISOString(),
      });
    }

    const supabase = await createClient();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todaySalesResult,
      monthSalesResult,
      customersCountResult,
      productsCountResult,
      lowStockResult,
      recentSalesResult,
    ] = await Promise.allSettled([
      supabase
        .from('sales')
        .select('total')
        .eq('organization_id', orgId)
        .gte('created_at', today.toISOString()),
      supabase
        .from('sales')
        .select('total')
        .eq('organization_id', orgId)
        .gte('created_at', monthStart.toISOString()),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_active', true),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .lte('stock_quantity', 10),
      supabase
        .from('sales')
        .select('id, total, created_at, payment_method, customer:customers(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const todaySalesData = todaySalesResult.status === 'fulfilled' ? (todaySalesResult.value as any)?.data || [] : [];
    const todaySales = todaySalesData.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const todaySalesCount = todaySalesData.length;

    const monthSalesData = monthSalesResult.status === 'fulfilled' ? (monthSalesResult.value as any)?.data || [] : [];
    const monthSales = monthSalesData.reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const recentSalesData = recentSalesResult.status === 'fulfilled' ? (recentSalesResult.value as any)?.data || [] : [];
    const recentSales = recentSalesData.map((sale: any) => {
      const customer = Array.isArray(sale.customer) ? sale.customer[0] : sale.customer;
      return {
        id: sale.id,
        customer_name: customer?.name || 'Cliente General',
        total: sale.total || 0,
        created_at: sale.created_at,
        payment_method: (sale.payment_method || 'cash').toLowerCase(),
      };
    });

    return NextResponse.json({
      todaySales,
      todaySalesCount,
      monthSales,
      averageTicket: todaySalesCount > 0 ? todaySales / todaySalesCount : 0,
      totalCustomers: customersCountResult.status === 'fulfilled' ? (customersCountResult.value as any)?.count || 0 : 0,
      totalProducts: productsCountResult.status === 'fulfilled' ? (productsCountResult.value as any)?.count || 0 : 0,
      lowStockCount: lowStockResult.status === 'fulfilled' ? (lowStockResult.value as any)?.count || 0 : 0,
      activeOrders: 0,
      recentSales,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Main dashboard summary error:', error);
    return NextResponse.json({
      todaySales: 0, todaySalesCount: 0, monthSales: 0, averageTicket: 0,
      totalCustomers: 0, totalProducts: 0, lowStockCount: 0, activeOrders: 0,
      recentSales: [], lastUpdated: new Date().toISOString(),
    });
  }
}
