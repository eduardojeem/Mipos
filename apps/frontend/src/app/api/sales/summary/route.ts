import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current date ranges
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // Optimized parallel queries
    const [
      todayResult,
      weekResult,
      monthResult,
      lastMonthResult,
      paymentMethodsResult
    ] = await Promise.all([
      // Today's sales
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', today)
        .eq('status', 'completed'),

      // This week's sales
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', startOfWeek)
        .eq('status', 'completed'),

      // This month's sales
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', startOfMonth)
        .eq('status', 'completed'),

      // Last month's sales for comparison
      supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', lastMonthStart)
        .lte('created_at', lastMonthEnd)
        .eq('status', 'completed'),

      // Payment methods analysis
      supabase
        .from('sales')
        .select('payment_method')
        .gte('created_at', startOfMonth)
        .eq('status', 'completed')
    ]);

    // Calculate metrics
    const todaySales = (todayResult.data || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const todayCount = todayResult.data?.length || 0;

    const weekSales = (weekResult.data || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const weekCount = weekResult.data?.length || 0;

    const monthSales = (monthResult.data || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const monthCount = monthResult.data?.length || 0;

    const lastMonthSales = (lastMonthResult.data || []).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const lastMonthCount = lastMonthResult.data?.length || 0;

    // Calculate average ticket
    const avgTicket = monthCount > 0 ? monthSales / monthCount : 0;

    // Find top payment method
    const paymentMethods = paymentMethodsResult.data || [];
    const methodCounts = paymentMethods.reduce((acc: Record<string, number>, sale: any) => {
      const method = sale.payment_method || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPaymentMethod = Object.entries(methodCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';

    // Calculate growth percentage (month over month)
    const growthPercentage = lastMonthSales > 0 
      ? ((monthSales - lastMonthSales) / lastMonthSales * 100)
      : monthSales > 0 ? 100 : 0;

    const summary = {
      todaySales,
      todayCount,
      weekSales,
      weekCount,
      monthSales,
      monthCount,
      avgTicket,
      topPaymentMethod,
      growthPercentage: Math.round(growthPercentage * 10) / 10,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Sales summary error:', error);
    
    // Return fallback data
    return NextResponse.json({
      todaySales: 0,
      todayCount: 0,
      weekSales: 0,
      weekCount: 0,
      monthSales: 0,
      monthCount: 0,
      avgTicket: 0,
      topPaymentMethod: 'N/A',
      growthPercentage: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Fallback data - could not fetch real metrics'
    });
  }
}