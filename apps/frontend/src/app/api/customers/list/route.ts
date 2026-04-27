import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import {
  resolveCustomerOrganizationId,
  transformCustomerRecord,
} from '@/app/api/customers/_lib';

/**
 * Customer List API - Phase 5 Optimization
 *
 * Provides paginated customer list with server-side filtering, sorting, and search.
 * Optimized for performance with minimal data transfer and efficient queries.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);
    console.log('[Customers List API] Organization ID:', orgId);
    if (!orgId) {
      console.error('[Customers List API] ❌ Organization ID header missing');
      return NextResponse.json({ success: false, error: 'Organization header missing' }, { status: 400 });
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const hasRUC = searchParams.get('hasRUC') || 'all';
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
        ruc,
        customer_code,
        customer_type,
        is_active,
        total_purchases,
        total_orders,
        last_purchase,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .is('deleted_at', null);

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
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,customer_code.ilike.%${search}%,phone.ilike.%${search}%,ruc.ilike.%${search}%`);
    }

    // Filter by RUC presence
    if (hasRUC === 'yes') {
      query = query.not('ruc', 'is', null);
    } else if (hasRUC === 'no') {
      query = query.is('ruc', null);
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
      console.error('[Customers List API] ❌ Supabase error:', error);
      throw new Error(error.message);
    }

    // Transform data to UI format
    const transformedCustomers = customers?.map((customer: any) => transformCustomerRecord(customer)) || [];

    // Get total count for pagination (if not already provided)
    let totalCount = count;
    if (totalCount === null) {
      const { count: totalCountQuery } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null);
      totalCount = totalCountQuery || 0;
    }

    return NextResponse.json({
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
        filters: { search, status, type, sortBy: sortField, sortOrder }
      }
    });

  } catch (error) {
    console.error('Error fetching customer list:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener la lista de clientes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
