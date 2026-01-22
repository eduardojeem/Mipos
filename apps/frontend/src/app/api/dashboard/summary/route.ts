import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current date ranges
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Optimized queries using Supabase aggregations
    const [
      todaySalesResult,
      monthlyStatsResult,
      lastMonthStatsResult
    ] = await Promise.all([
      // Today's sales
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', today)
        .lt('created_at', new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

      // Current month stats
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', currentMonth)
        .lt('created_at', today + 'T23:59:59'),

      // Last month stats for comparison
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', lastMonth)
        .lt('created_at', currentMonth)
    ]);

    // Calculate metrics
    const todaySales = (todaySalesResult.data as Array<{ total_amount: number }> | undefined)?.reduce((sum: number, sale) => sum + (sale.total_amount || 0), 0) || 0;
    
    const currentMonthSales = (monthlyStatsResult.data as Array<{ total_amount: number }> | null) || [];
    const monthlyTotal = currentMonthSales.reduce((sum: number, sale) => sum + (sale.total_amount || 0), 0);
    const totalOrders = currentMonthSales.length;
    const avgTicket = totalOrders > 0 ? monthlyTotal / totalOrders : 0;

    const lastMonthSales = (lastMonthStatsResult.data as Array<{ total_amount: number }> | null) || [];
    const lastMonthTotal = lastMonthSales.reduce((sum: number, sale) => sum + (sale.total_amount || 0), 0);
    
    // Calculate growth percentage
    const growthPercentage = lastMonthTotal > 0 
      ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal * 100)
      : monthlyTotal > 0 ? 100 : 0;

    const summary = {
      todaySales,
      totalOrders,
      avgTicket,
      monthlyTotal,
      growthPercentage: Math.round(growthPercentage * 10) / 10, // Round to 1 decimal
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Dashboard summary error:', error);
    
    // Return fallback data instead of error
    return NextResponse.json({
      todaySales: 0,
      totalOrders: 0,
      avgTicket: 0,
      monthlyTotal: 0,
      growthPercentage: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Fallback data - could not fetch real metrics'
    });
  }
}
