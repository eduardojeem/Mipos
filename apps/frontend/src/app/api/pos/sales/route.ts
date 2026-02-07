import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePOSPermissions } from '@/app/api/_utils/role-validation';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

// POST /api/pos/sales - Process a new sale
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access'])
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const body = await request.json();
    const {
      items,
      customer_id,
      discount_amount = 0,
      tax_amount = 0,
      discount_type = 'FIXED_AMOUNT',
      payment_method = 'CASH',
      sale_type = 'RETAIL',
      notes = '',
      total_amount,
      transfer_reference,
      cashReceived,
      change
    } = body;

    // Validate required fields
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!total_amount || total_amount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be greater than 0' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const headerOrgId = request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id');
    const organizationId = headerOrgId || (auth.userId ? await getUserOrganizationId(auth.userId) : null);
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 });
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'Backend session is required' }, { status: 401 });
    }

    const origin = new URL(request.url).origin;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001/api';

    const backendPayload = {
      customerId: customer_id || undefined,
      items: items.map((item: any) => ({
        productId: item.product_id,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
      })),
      paymentMethod: payment_method,
      discount: Number(discount_amount || 0),
      discountType: discount_type,
      tax: Number(tax_amount || 0),
      notes,
      cashReceived,
      change,
      transferReference: transfer_reference,
    };

    const backendResponse = await fetch(`${backendUrl}/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        'x-organization-id': organizationId,
      },
      body: JSON.stringify(backendPayload),
    });

    if (!backendResponse.ok) {
      const errorBody = await backendResponse.json().catch(() => ({}));
      return NextResponse.json({
        error: 'Failed to process sale in backend',
        details: errorBody,
      }, { status: backendResponse.status });
    }

    const backendSale = await backendResponse.json();

    return NextResponse.json({
      success: true,
      sale: backendSale?.sale || backendSale,
      message: 'Sale processed successfully',
    });

    console.error('Process sale error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process sale',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/pos/sales - Get recent sales for POS
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePOSPermissions(request, ['pos.access'])
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status') || 'completed';

    const supabase = await createClient();
    const headerOrgId = request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
    const organizationId = headerOrgId || (auth.userId ? await getUserOrganizationId(auth.userId) : null)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization context is required' }, { status: 400 })
    }

    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        payment_method,
        created_at,
        status,
        customers (
          name
        )
      `)
      .eq('status', status)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const transformedSales = (sales || []).map((sale: any) => ({
      id: sale.id,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      created_at: sale.created_at,
      status: sale.status,
      customer_name: sale.customers?.name || 'Cliente General',
      saleNumber: `POS-${sale.id.slice(-8).toUpperCase()}`
    }));

    return NextResponse.json({
      sales: transformedSales,
      total: transformedSales.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get POS sales error:', error);
    
    return NextResponse.json({
      sales: [],
      total: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch sales'
    });
  }
}
