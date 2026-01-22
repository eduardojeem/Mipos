import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Optimized parallel queries with timeout
    const queryTimeout = 5000; // 5 seconds timeout
    
    const [
      todaySalesResult,
      monthSalesResult,
      customersCountResult,
      productsCountResult,
      lowStockResult,
      recentSalesResult
    ] = await Promise.allSettled([
      // Today's sales with count and total - optimized query
      Promise.race([
        supabase
          .from('sales')
          .select('total')
          .gte('created_at', today.toISOString()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),

      // Month's sales total - optimized query
      Promise.race([
        supabase
          .from('sales')
          .select('total')
          .gte('created_at', monthStart.toISOString()),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),

      // Total customers count - fast count
      Promise.race([
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),

      // Total products count - fast count
      Promise.race([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),

      // Low stock products - optimized with limit
      Promise.race([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .lte('stock', 10),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ]),

      // Recent sales - simplified query
      Promise.race([
        supabase
          .from('sales')
          .select('id, total, created_at, payment_method, customer_id')
          .order('created_at', { ascending: false })
          .limit(5),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), queryTimeout))
      ])
    ]);

    // Process results with fallbacks for failed queries
    const todaySalesData = todaySalesResult.status === 'fulfilled' ? (todaySalesResult.value as any)?.data || [] : [];
    const todaySales = todaySalesData.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
    const todaySalesCount = todaySalesData.length;

    const monthSalesData = monthSalesResult.status === 'fulfilled' ? (monthSalesResult.value as any)?.data || [] : [];
    const monthSales = monthSalesData.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);

    const averageTicket = todaySalesCount > 0 ? todaySales / todaySalesCount : 0;

    // Get customer names for recent sales (simplified approach)
    const recentSalesData = recentSalesResult.status === 'fulfilled' ? (recentSalesResult.value as any)?.data || [] : [];
    const recentSales = recentSalesData.map((sale: any) => ({
      id: sale.id,
      customer_name: 'Cliente General', // Simplified for performance
      total: sale.total || 0,
      created_at: sale.created_at,
      payment_method: sale.payment_method || 'efectivo'
    }));

    const summary = {
      // Main metrics
      todaySales,
      todaySalesCount,
      monthSales,
      averageTicket,
      
      // Counts with fallbacks
      totalCustomers: customersCountResult.status === 'fulfilled' ? (customersCountResult.value as any)?.count || 0 : 0,
      totalProducts: productsCountResult.status === 'fulfilled' ? (productsCountResult.value as any)?.count || 0 : 0,
      lowStockCount: lowStockResult.status === 'fulfilled' ? (lowStockResult.value as any)?.count || 0 : 0,
      activeOrders: 0, // Placeholder for future implementation
      
      // Recent activity
      recentSales,
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      
      // Performance info
      queryErrors: [
        todaySalesResult.status === 'rejected' ? 'todaySales' : null,
        monthSalesResult.status === 'rejected' ? 'monthSales' : null,
        customersCountResult.status === 'rejected' ? 'customers' : null,
        productsCountResult.status === 'rejected' ? 'products' : null,
        lowStockResult.status === 'rejected' ? 'lowStock' : null,
        recentSalesResult.status === 'rejected' ? 'recentSales' : null
      ].filter(Boolean)
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Main dashboard summary error:', error);
    
    // Return fallback data to prevent dashboard crashes
    return NextResponse.json({
      todaySales: 0,
      todaySalesCount: 0,
      monthSales: 0,
      averageTicket: 0,
      totalCustomers: 0,
      totalProducts: 0,
      lowStockCount: 0,
      activeOrders: 0,
      recentSales: [],
      lastUpdated: new Date().toISOString(),
      error: 'Fallback data - could not fetch real metrics'
    });
  }
}