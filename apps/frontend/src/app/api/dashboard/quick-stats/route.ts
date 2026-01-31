import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireOrganization } from '@/lib/organization';

/**
 * Quick Dashboard Stats API - Ultra Fast Version with Multitenancy
 * 
 * Provides essential dashboard metrics with minimal database queries
 * Optimized for speed over completeness
 * Filtered by organization for SaaS multitenancy
 */

export async function GET(request: NextRequest) {
  try {
    // Validate and get organization ID
    const orgId = await requireOrganization(request);
    const supabase = createClient();

    // Use simple, fast queries with minimal data
    // All queries filtered by organization for multitenancy
    const [
      salesCount,
      customersCount,
      productsCount
    ] = await Promise.allSettled([
      // Just count today's sales - fastest possible query (organization-filtered)
      supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', new Date().toISOString().split('T')[0]),

      // Count customers (organization-filtered)
      supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),

      // Count products (organization-filtered)
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
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
    
    // Return specific error if it's an organization validation error
    if (error instanceof Error && error.message.includes('No valid organization')) {
      return NextResponse.json(
        { error: 'Organization required', message: error.message },
        { status: 400 }
      );
    }
    
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