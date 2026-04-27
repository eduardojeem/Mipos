import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrganization } from '@/lib/organization';

/**
 * Quick Dashboard Stats API - Ultra Fast Version with Multitenancy
 * Uses server-side Supabase client for proper auth context
 */

export async function GET(request: NextRequest) {
  try {
    const orgId = await requireOrganization(request);
    const supabase = await createClient();

    const [salesCount, customersCount, productsCount] = await Promise.allSettled([
      supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_active', true),
    ]);

    return NextResponse.json({
      todaySalesCount: salesCount.status === 'fulfilled' ? (salesCount.value as any)?.count || 0 : 0,
      totalCustomers: customersCount.status === 'fulfilled' ? (customersCount.value as any)?.count || 0 : 0,
      totalProducts: productsCount.status === 'fulfilled' ? (productsCount.value as any)?.count || 0 : 0,
      todaySales: 0,
      monthSales: 0,
      averageTicket: 0,
      lowStockCount: 0,
      activeOrders: 0,
      recentSales: [],
      lastUpdated: new Date().toISOString(),
      isQuickMode: true,
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    if (error instanceof Error && error.message.includes('No valid organization')) {
      return NextResponse.json({
        todaySalesCount: 0, totalCustomers: 0, totalProducts: 0,
        todaySales: 0, monthSales: 0, averageTicket: 0, lowStockCount: 0,
        activeOrders: 0, recentSales: [],
        lastUpdated: new Date().toISOString(), isQuickMode: true,
      });
    }
    return NextResponse.json({
      todaySalesCount: 0, totalCustomers: 0, totalProducts: 0,
      todaySales: 0, monthSales: 0, averageTicket: 0, lowStockCount: 0,
      activeOrders: 0, recentSales: [],
      lastUpdated: new Date().toISOString(), isQuickMode: true,
    });
  }
}