import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { sanitizeSearch } from '@/app/api/_utils/search';
import { getUserOrganizationId, validateOrganizationAccess } from '@/app/api/_utils/organization';

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null') {
    return null;
  }

  return trimmed;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access'])
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const supabase = await createAdminClient();

    // Optimized query for POS - only essential customer fields
    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    )
    const organizationId = headerOrgId || (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }
    if (auth.userId && auth.userRole !== 'SUPER_ADMIN') {
      const hasOrganizationAccess = await validateOrganizationAccess(auth.userId, organizationId)
      if (!hasOrganizationAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 })
      }
    }
    let query = supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        customer_type,
        wholesale_discount,
        min_wholesale_quantity,
        is_active,
        created_at
      `)
      .order('name');

    // Apply filters
    query = query.eq('organization_id', organizationId)
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (search) {
      { const s = sanitizeSearch(search); query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`); }
    }

    query = query.limit(limit);

    const { data: customers, error } = await query;

    if (error) throw error;

    type CustomerRow = {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      customer_type: 'RETAIL' | 'WHOLESALE' | string | null;
      wholesale_discount: number | null;
      min_wholesale_quantity: number | null;
      is_active: boolean;
      created_at: string;
    };
    type PosCustomer = {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      customer_type: 'RETAIL' | 'WHOLESALE';
      wholesale_discount: number;
      min_wholesale_quantity: number;
      is_active: boolean;
      created_at: string;
      is_wholesale: boolean;
      has_discount: boolean;
      display_name: string;
    };
    const baseCustomers = (customers ?? []) as CustomerRow[];
    const transformedCustomers: PosCustomer[] = baseCustomers.map((customer) => ({
      id: customer.id,
      name: customer.name || 'Cliente Sin Nombre',
      email: customer.email,
      phone: customer.phone,
      customer_type: (customer.customer_type || 'RETAIL') as 'RETAIL' | 'WHOLESALE',
      wholesale_discount: customer.wholesale_discount || 0,
      min_wholesale_quantity: customer.min_wholesale_quantity || 0,
      is_active: customer.is_active,
      created_at: customer.created_at,
      is_wholesale: customer.customer_type === 'WHOLESALE',
      has_discount: (customer.wholesale_discount || 0) > 0,
      display_name: customer.name || customer.email || 'Cliente Sin Nombre'
    }));

    const wholesaleCustomers = transformedCustomers.filter((c) => c.is_wholesale);
    const retailCustomers = transformedCustomers.filter((c) => !c.is_wholesale);

    return NextResponse.json({
      customers: transformedCustomers,
      wholesale: wholesaleCustomers,
      retail: retailCustomers,
      total: transformedCustomers.length,
      metadata: {
        wholesaleCount: wholesaleCustomers.length,
        retailCount: retailCustomers.length,
        withDiscounts: transformedCustomers.filter((c) => c.has_discount).length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('POS customers error:', error);
    
    return NextResponse.json({
      customers: [],
      wholesale: [],
      retail: [],
      total: 0,
      metadata: {
        wholesaleCount: 0,
        retailCount: 0,
        withDiscounts: 0,
        lastUpdated: new Date().toISOString()
      },
      error: 'Could not fetch customers'
    });
  }
}

// POST /api/pos/customers - Quick customer creation for POS
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access'])
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const body = await request.json();
    const { name, email, phone, customer_type = 'RETAIL' } = body;

    if (!name && !email && !phone) {
      return NextResponse.json(
        { error: 'At least name, email, or phone is required' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();
    const headerOrgId = normalizeString(
      request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    )
    const organizationId = headerOrgId || (auth.userId ? normalizeString(await getUserOrganizationId(auth.userId)) : null)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }

    if (auth.userId && auth.userRole !== 'SUPER_ADMIN') {
      const hasOrganizationAccess = await validateOrganizationAccess(auth.userId, organizationId)
      if (!hasOrganizationAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 })
      }
    }

    // Check for existing customer with same email or phone
    if (email || phone) {
      let duplicateQuery = supabase.from('customers').select('id');
      if (organizationId) {
        duplicateQuery = duplicateQuery.eq('organization_id', organizationId)
      }
      
      if (email && phone) {
        duplicateQuery = duplicateQuery.or(`email.eq.${email},phone.eq.${phone}`);
      } else if (email) {
        duplicateQuery = duplicateQuery.eq('email', email);
      } else if (phone) {
        duplicateQuery = duplicateQuery.eq('phone', phone);
      }

      const { data: existing } = await duplicateQuery.single();
      
      if (existing) {
        return NextResponse.json(
          { error: 'Customer with this email or phone already exists' },
          { status: 409 }
        );
      }
    }

    const customerData = {
      name: name || 'Cliente Sin Nombre',
      email: email || null,
      phone: phone || null,
      customer_type,
      is_active: true,
      created_at: new Date().toISOString(),
      ...(organizationId ? { organization_id: organizationId } : {})
    };

    const { data: customer, error } = await (supabase as any)
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (error) throw error;
    const createdCustomer = customer as {
      name?: string | null;
      email?: string | null;
      customer_type?: string | null;
    } & Record<string, unknown>;

    return NextResponse.json({
      success: true,
      customer: {
        ...createdCustomer,
        display_name: createdCustomer.name || createdCustomer.email || 'Cliente Sin Nombre',
        is_wholesale: createdCustomer.customer_type === 'WHOLESALE',
        has_discount: false
      },
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('Create POS customer error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
