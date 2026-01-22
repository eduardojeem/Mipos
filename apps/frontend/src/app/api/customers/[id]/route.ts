import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

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
    const supabase = createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer with purchase history
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
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
      .order('created_at', { ascending: false })
      .limit(10);

    // Transform customer data
    const transformedCustomer = transformCustomerData(customer, purchaseHistory || []);

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
    const supabase = createClient();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const { name, email, phone } = body;

    if (name !== undefined && (!name || name.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Customer name cannot be empty' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check for duplicate email (excluding current customer)
    if (email) {
      const { data: existingEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single();

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'A customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate phone (excluding current customer)
    if (phone) {
      const { data: existingPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .neq('id', id)
        .single();

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
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.email !== undefined) updateData.email = body.email?.trim() || null;
    if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.tax_id !== undefined) updateData.tax_id = body.tax_id?.trim() || null;
    if (body.customerType !== undefined) updateData.customer_type = mapCustomerTypeToDb(body.customerType);
    if (body.birthDate !== undefined) updateData.birth_date = body.birthDate || null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    // Update customer
    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
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
    const transformedCustomer = transformCustomerData(customer);

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
    const supabase = createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name, total_orders')
      .eq('id', id)
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
      .eq('customer_id', id);

    if (salesCount && salesCount > 0) {
      // Soft delete: mark as inactive instead of hard delete
      const { error } = await supabase
        .from('customers')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

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
        .eq('id', id);

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

function mapCustomerTypeToDb(uiType: string): 'REGULAR' | 'VIP' | 'WHOLESALE' {
  const normalized = uiType?.toLowerCase();
  if (normalized === 'wholesale') return 'WHOLESALE';
  if (normalized === 'vip') return 'VIP';
  return 'REGULAR';
}

function mapCustomerTypeToUI(dbType: string): 'regular' | 'vip' | 'wholesale' {
  const normalized = dbType?.toUpperCase();
  if (normalized === 'WHOLESALE') return 'wholesale';
  if (normalized === 'VIP') return 'vip';
  return 'regular';
}

function transformCustomerData(customer: any, purchaseHistory?: any[]) {
  const transformedHistory = purchaseHistory?.map(sale => ({
    orderNumber: `#${sale.id.slice(0, 8).toUpperCase()}`,
    date: sale.created_at,
    total: sale.total,
    items: sale.sale_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
    status: sale.status || 'completed',
    products: sale.sale_items?.map((item: any) => ({
      id: item.products?.id || '',
      name: item.products?.name || 'Product',
      quantity: item.quantity,
      price: item.unit_price
    })) || []
  })) || [];

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    tax_id: customer.tax_id,
    customer_code: customer.customer_code,
    customer_type: customer.customer_type,
    status: customer.status || 'active',
    birth_date: customer.birth_date,
    notes: customer.notes,
    is_active: customer.is_active,
    // UI-friendly fields
    customerCode: customer.customer_code,
    customerType: mapCustomerTypeToUI(customer.customer_type),
    totalSpent: customer.total_purchases || 0,
    totalOrders: customer.total_orders || 0,
    lastPurchase: customer.last_purchase,
    birthDate: customer.birth_date,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
    // Computed fields
    segment: determineCustomerSegment(customer.total_orders || 0, customer.total_purchases || 0),
    riskScore: calculateRiskScore(customer.last_purchase, customer.total_orders || 0),
    lifetimeValue: calculateLifetimeValue(customer.total_purchases || 0, customer.total_orders || 0, customer.created_at),
    // Purchase history if provided
    ...(purchaseHistory && { purchaseHistory: transformedHistory })
  };
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

  const profitMargin = 0.3; // 30% estimated margin
  const expectedLifetime = 24; // 24 months expected

  return Math.round(avgOrderValue * purchaseFrequency * profitMargin * expectedLifetime * 100) / 100;
}
