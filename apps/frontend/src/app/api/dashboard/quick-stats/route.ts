import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Quick Dashboard Stats API - Ultra Fast Version
 * 
 * Provides essential dashboard metrics with minimal database queries
 * Optimized for speed over completeness
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Use simple, fast queries with minimal data
    const [
      salesCount,
      customersCount,
      productsCount
    ] = await Promise.allSettled([
      // Just count today's sales - fastest possible query
      supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),

      // Count customers
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true }),

      // Count products
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
    ]);

    // Provide minimal but useful data
    const quickStats = {
      todaySalesCount: salesCount.status === 'fulfilled' ? (salesCount.value as any)?.count || 0 : 0,
      totalCustomers: customersCount.status === 'fulfilled' ? (customersCount.value as any)?.count || 0 : 0,
      totalProducts: productsCount.status === 'fulfilled' ? (productsCount.value as any)?.count || 0 : 0,
      
      // Placeholder values for UI consistency
      todaySales: 0,
      monthSales: 0,
      averageTicket: 0,
      lowStockCount: 0,
      activeOrders: 0,
      recentSales: [],
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      isQuickMode: true,
      message: 'Datos básicos cargados rápidamente'
    };

    return NextResponse.json(quickStats);

  } catch (error) {
    console.error('Quick stats error:', error);
    
    // Ultra-minimal fallback
    return NextResponse.json({
      todaySalesCount: 0,
      totalCustomers: 0,
      totalProducts: 0,
      todaySales: 0,
      monthSales: 0,
      averageTicket: 0,
      lowStockCount: 0,
      activeOrders: 0,
      recentSales: [],
      lastUpdated: new Date().toISOString(),
      isQuickMode: true,
      error: 'Modo de emergencia - datos no disponibles'
    });
  }
}