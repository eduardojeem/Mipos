import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import {
  mapCustomerTypeToDb,
  resolveCustomerOrganizationId,
  sanitizeNullableText,
  transformCustomerRecord,
} from '@/app/api/customers/_lib';

/**
 * Individual Customer API - Phase 5 Optimization
 * 
 * Handles individual customer operations: GET, PUT, DELETE
 * Optimized for performance with proper validation and business logic.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { id } = await params;
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);

    if (!id || !orgId) {
      return NextResponse.json(
        { success: false, error: !id ? 'Customer ID is required' : 'Organization header missing' },
        { status: 400 }
      );
    }

    // Get customer with purchase history
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

    // Get purchase history
    const { data: purchaseHistory } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        created_at,
        status,
        sale_items (
          quantity,
          unit_price,
          products (
            id,
            name
          )
        )
      `)
      .eq('customer_id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    // Transform customer data
    const transformedCustomer = transformCustomerRecord(customer, { purchaseHistory: purchaseHistory || [] });

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);

    if (!id || !orgId) {
      return NextResponse.json(
        { success: false, error: !id ? 'Customer ID is required' : 'Organization header missing' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { name, email, phone } = body;
    const normalizedName = name === undefined ? undefined : sanitizeNullableText(name);
    const normalizedEmail = email === undefined ? undefined : sanitizeNullableText(email);
    const normalizedPhone = phone === undefined ? undefined : sanitizeNullableText(phone);

    if (name !== undefined && !normalizedName) {
      return NextResponse.json(
        { success: false, error: 'Customer name cannot be empty' },
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

    // Check for duplicate email (excluding current customer)
    if (normalizedEmail) {
      const { data: existingEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('organization_id', orgId)
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'A customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate phone (excluding current customer)
    if (normalizedPhone) {
      const { data: existingPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', normalizedPhone)
        .eq('organization_id', orgId)
        .neq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: 'A customer with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only update provided fields
    if (body.name !== undefined) updateData.name = normalizedName;
    if (body.email !== undefined) updateData.email = normalizedEmail ?? null;
    if (body.phone !== undefined) updateData.phone = normalizedPhone ?? null;
    if (body.address !== undefined) updateData.address = sanitizeNullableText(body.address);
    if (body.tax_id !== undefined) updateData.tax_id = sanitizeNullableText(body.tax_id);
    if (body.ruc !== undefined) updateData.ruc = sanitizeNullableText(body.ruc);
    if (body.customerType !== undefined) updateData.customer_type = mapCustomerTypeToDb(body.customerType);
    if (body.birthDate !== undefined) updateData.birth_date = body.birthDate || null;
    if (body.notes !== undefined) updateData.notes = sanitizeNullableText(body.notes);
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
      updateData.status = body.is_active ? 'active' : 'inactive';
    }

    // Update customer
    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update customer', details: error.message },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Transform response data
    const transformedCustomer = transformCustomerRecord(customer);

    return NextResponse.json({
      success: true,
      data: transformedCustomer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { id } = await params;
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);

    if (!id || !orgId) {
      return NextResponse.json(
        { success: false, error: !id ? 'Customer ID is required' : 'Organization header missing' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name, total_orders')
      .eq('id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single();

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer has sales history
    const { count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', id)
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (salesCount && salesCount > 0) {
      // Soft delete: mark as inactive instead of hard delete
      const { error } = await supabase
        .from('customers')
        .update({ 
          is_active: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Customer deactivated successfully (has sales history)',
        action: 'deactivated'
      });
    } else {
      // Hard delete: customer has no sales history
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        message: 'Customer deleted successfully',
        action: 'deleted'
      });
    }

  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete customer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
