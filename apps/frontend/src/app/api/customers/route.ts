import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import {
  generateCustomerCode,
  mapCustomerTypeToDb,
  resolveCustomerOrganizationId,
  sanitizeNullableText,
  transformCustomerRecord,
} from '@/app/api/customers/_lib';

/**
 * Customer CRUD API - Phase 5 Optimization
 * 
 * Handles customer creation with validation, duplicate checking, and business logic.
 * Optimized for performance and data integrity.
 */

export async function POST(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const body = await request.json();
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization header missing' }, { status: 400 });
    }

    // Validate required fields
    const { name, email, phone, address, customerType, birthDate, notes, ruc, is_active } = body;
    const normalizedName = sanitizeNullableText(name);
    const normalizedEmail = sanitizeNullableText(email);
    const normalizedPhone = sanitizeNullableText(phone);
    const normalizedAddress = sanitizeNullableText(address);
    const normalizedRUC = sanitizeNullableText(ruc);
    const normalizedNotes = sanitizeNullableText(notes);

    if (!normalizedName) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check for duplicate email
    if (normalizedEmail) {
      const { data: existingEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'A customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate phone
    if (normalizedPhone) {
      const { data: existingPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: 'A customer with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Generate customer code
    const customerCode = generateCustomerCode(normalizedName);

    // Prepare data for insertion
    const customerData = {
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      address: normalizedAddress,
      ruc: normalizedRUC,
      customer_code: customerCode,
      customer_type: mapCustomerTypeToDb(customerType || 'regular'),
      birth_date: birthDate || null,
      notes: normalizedNotes,
      status: typeof is_active === 'boolean' && !is_active ? 'inactive' : 'active',
      is_active: typeof is_active === 'boolean' ? is_active : true,
      total_purchases: 0,
      total_orders: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      organization_id: orgId
    };

    // Insert customer
    const { data: customer, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create customer', details: error.message },
        { status: 500 }
      );
    }

    // Transform response data
    const transformedCustomer = transformCustomerRecord(customer);

    try {
      const origin = new URL(request.url).origin;
      const payload = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        customer_code: customer.customer_code,
        customer_type: customer.customer_type,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        organization_id: orgId
      };
      await fetch(`${origin}/api/external-sync/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [payload] })
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: transformedCustomer,
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('Error in customer creation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
    
    const id = searchParams.get('id');
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);
    
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization header missing' }, { status: 400 });
    }
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
      throw new Error(error.message);
    }

    const transformedCustomer = transformCustomerRecord(customer);

    return NextResponse.json({
      success: true,
      data: transformedCustomer
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
