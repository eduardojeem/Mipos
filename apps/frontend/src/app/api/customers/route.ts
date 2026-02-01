import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Customer CRUD API - Phase 5 Optimization
 * 
 * Handles customer creation with validation, duplicate checking, and business logic.
 * Optimized for performance and data integrity.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization header missing' }, { status: 400 });
    }

    // Validate required fields
    const { name, email, phone, address, customerType, birthDate, notes } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
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

    // Check for duplicate email
    if (email) {
      const { data: existingEmail } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .eq('organization_id', orgId)
        .single();

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'A customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate phone
    if (phone) {
      const { data: existingPhone } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .eq('organization_id', orgId)
        .single();

      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: 'A customer with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Generate customer code
    const customerCode = generateCustomerCode(name);

    // Prepare data for insertion
    const customerData = {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      address: address?.trim() || null,
      customer_code: customerCode,
      customer_type: mapCustomerTypeToDb(customerType || 'regular'),
      birth_date: birthDate || null,
      notes: notes?.trim() || null,
      is_active: true,
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
    const transformedCustomer = transformCustomerData(customer);

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
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const id = searchParams.get('id');
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    
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

    const transformedCustomer = transformCustomerData(customer);

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

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateCustomerCode(name: string): string {
  const prefix = 'CL';
  const nameCode = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${nameCode}${timestamp}`;
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

function transformCustomerData(customer: any) {
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
    lifetimeValue: calculateLifetimeValue(customer.total_purchases || 0, customer.total_orders || 0, customer.created_at)
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