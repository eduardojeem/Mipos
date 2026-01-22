import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Customer Summary API - Phase 5 Optimization
 * 
 * Provides lightweight customer statistics and metrics for dashboard display.
 * Optimized for performance with server-side calculations and minimal data transfer.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get basic customer counts with parallel queries
    const [
      { count: totalCount },
      { count: activeCount },
      { count: inactiveCount },
      { count: vipCount },
      { count: wholesaleCount },
      { count: regularCount }
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', false),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('customer_type', 'VIP'),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('customer_type', 'WHOLESALE'),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('customer_type', 'REGULAR')
    ]);

    // Get recent customer activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: newCustomersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get customer value metrics
    const { data: valueMetrics } = await supabase
      .from('customers')
      .select('total_purchases, total_orders')
      .not('total_purchases', 'is', null);

    // Calculate aggregated metrics
    const totalRevenue = valueMetrics?.reduce((sum: number, customer: any) => sum + (customer.total_purchases || 0), 0) || 0;
    const totalOrders = valueMetrics?.reduce((sum: number, customer: any) => sum + (customer.total_orders || 0), 0) || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Customer segmentation based on purchase behavior
    const highValueCustomers = valueMetrics?.filter((c: any) => (c.total_purchases || 0) > 10000).length || 0;
    const frequentCustomers = valueMetrics?.filter((c: any) => (c.total_orders || 0) > 10).length || 0;

    const summary = {
      // Basic counts
      total: totalCount || 0,
      active: activeCount || 0,
      inactive: inactiveCount || 0,
      
      // Customer types
      vip: vipCount || 0,
      wholesale: wholesaleCount || 0,
      regular: regularCount || 0,
      
      // Activity metrics
      newThisMonth: newCustomersCount || 0,
      
      // Value metrics
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: totalOrders,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      
      // Segmentation
      highValue: highValueCustomers,
      frequent: frequentCustomers,
      
      // Growth metrics
      growthRate: totalCount ? Math.round(((newCustomersCount || 0) / totalCount) * 100 * 100) / 100 : 0,
      
      // Engagement metrics
      activeRate: totalCount ? Math.round(((activeCount || 0) / totalCount) * 100 * 100) / 100 : 0,
      
      // Generated timestamp
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching customer summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customer summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
