import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Customer List API - Phase 5 Optimization
 * 
 * Provides paginated customer list with server-side filtering, sorting, and search.
 * Optimized for performance with minimal data transfer and efficient queries.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100); // Max 100 items
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // all, active, inactive
    const type = searchParams.get('type') || 'all'; // all, regular, vip, wholesale
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build base query with optimized field selection
    let query = supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        address,
        customer_code,
        customer_type,
        is_active,
        total_purchases,
        total_orders,
        last_purchase,
        created_at,
        updated_at
      `);

    // Apply filters
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (type && type !== 'all') {
      query = query.eq('customer_type', type.toUpperCase());
    }

    // Apply search across multiple fields
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,customer_code.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply sorting
    const validSortFields = ['name', 'email', 'created_at', 'updated_at', 'total_purchases', 'total_orders'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const ascending = sortOrder === 'asc';
    
    query = query.order(sortField, { ascending });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: customers, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Transform data to UI format
    const transformedCustomers = customers?.map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      customer_code: customer.customer_code,
      customer_type: customer.customer_type,
      is_active: customer.is_active,
      customerCode: customer.customer_code,
      customerType: mapCustomerTypeToUI(customer.customer_type),
      totalSpent: customer.total_purchases || 0,
      totalOrders: customer.total_orders || 0,
      lastPurchase: customer.last_purchase,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      // Add computed fields
      segment: determineCustomerSegment(customer.total_orders || 0, customer.total_purchases || 0),
      riskScore: calculateRiskScore(customer.last_purchase, customer.total_orders || 0),
      lifetimeValue: calculateLifetimeValue(customer.total_purchases || 0, customer.total_orders || 0, customer.created_at)
    })) || [];

    // Get total count for pagination (if not already provided)
    let totalCount = count;
    if (totalCount === null) {
      const { count: totalCountQuery } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      totalCount = totalCountQuery || 0;
    }

    const response = {
      success: true,
      data: {
        customers: transformedCustomers,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil((totalCount || 0) / limit),
          hasNext: (page * limit) < (totalCount || 0),
          hasPrev: page > 1
        },
        filters: {
          search,
          status,
          type,
          sortBy: sortField,
          sortOrder
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching customer list:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customer list',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function mapCustomerTypeToUI(dbType: string): 'regular' | 'vip' | 'wholesale' {
  const normalized = dbType?.toUpperCase();
  if (normalized === 'WHOLESALE') return 'wholesale';
  if (normalized === 'VIP') return 'vip';
  return 'regular';
}

function determineCustomerSegment(totalOrders: number, totalSpent: number): 'new' | 'regular' | 'frequent' | 'vip' | 'at_risk' | 'dormant' {
  if (totalOrders <= 2) return 'new';
  if (totalOrders >= 25 || totalSpent > 50000) return 'vip';
  if (totalOrders >= 11) return 'frequent';
  return 'regular';
}

function calculateRiskScore(lastPurchase: string | null, totalOrders: number): number {
  let riskScore = 0;

  const daysSinceLastPurchase = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Risk by inactivity
  if (daysSinceLastPurchase > 180) riskScore += 50;
  else if (daysSinceLastPurchase > 90) riskScore += 30;
  else if (daysSinceLastPurchase > 30) riskScore += 15;

  // Risk by low purchase frequency
  if (totalOrders < 3) riskScore += 20;
  else if (totalOrders < 10) riskScore += 10;

  return Math.min(riskScore, 100);
}

function calculateLifetimeValue(totalSpent: number, totalOrders: number, createdAt: string): number {
  if (totalOrders === 0) return 0;

  const avgOrderValue = totalSpent / totalOrders;
  const daysSinceFirstPurchase = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const purchaseFrequency = daysSinceFirstPurchase > 0 ? totalOrders / (daysSinceFirstPurchase / 30) : 0;

  // CLV = Average Order Value × Purchase Frequency × Profit Margin × Expected Lifetime
  const profitMargin = 0.3; // 30% estimated margin
  const expectedLifetime = 24; // 24 months expected

  return Math.round(avgOrderValue * purchaseFrequency * profitMargin * expectedLifetime * 100) / 100;
}