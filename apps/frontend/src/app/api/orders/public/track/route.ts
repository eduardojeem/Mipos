import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveTenantContextFromHeaders } from '@/lib/domain/request-tenant';

function isSchemaMissingError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('relation') && message.includes('does not exist')) ||
    message.includes('could not find the table')
  );
}

function normalizeOptionalText(value: unknown): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

function normalizeAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

async function fetchTrackedOrder(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  orderNumber: string | null,
  customerEmail: string | null
) {
  let query = supabase
    .from('sales')
    .select('*')
    .eq('organization_id', organizationId);

  if (orderNumber) {
    query = query.eq('order_number', orderNumber);
  } else if (customerEmail) {
    query = query
      .eq('customer_email', customerEmail.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1);
  }

  const orderResult = await query.maybeSingle();

  if (orderResult.error) {
    if (isSchemaMissingError(orderResult.error)) {
      return null;
    }

    throw orderResult.error;
  }

  if (!orderResult.data) {
    return null;
  }

  const orderRow = orderResult.data as Record<string, unknown>;
  const orderId = String(orderRow.id || '');

  const itemsResult = await supabase
    .from('sale_items')
    .select('*')
    .eq('sale_id', orderId);

  if (itemsResult.error && !isSchemaMissingError(itemsResult.error)) {
    throw itemsResult.error;
  }

  const orderItems = Array.isArray(itemsResult.data)
    ? itemsResult.data.map((item: Record<string, unknown>) => ({
        id: String(item.id || ''),
        product_name: String(item.product_name || item.product_id || 'Producto'),
        quantity: normalizeAmount(item.quantity),
        unit_price: normalizeAmount(item.unit_price),
        subtotal: normalizeAmount(item.subtotal),
      }))
    : [];

  return {
    id: orderId,
    order_number: String(orderRow.order_number || ''),
    customer_name: String(orderRow.customer_name || ''),
    customer_email: String(orderRow.customer_email || ''),
    customer_phone: String(orderRow.customer_phone || ''),
    customer_address: normalizeOptionalText(orderRow.customer_address),
    subtotal: normalizeAmount(orderRow.subtotal),
    shipping_cost: normalizeAmount(orderRow.shipping_cost),
    total: normalizeAmount(orderRow.total),
    payment_method: String(orderRow.payment_method || ''),
    status: String(orderRow.status || 'PENDING'),
    notes: normalizeOptionalText(orderRow.notes),
    created_at: String(orderRow.created_at || ''),
    estimated_delivery_date: normalizeOptionalText(orderRow.estimated_delivery_date),
    order_items: orderItems,
  };
}

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await resolveTenantContextFromHeaders(request.headers);

    if (tenantContext.kind !== 'tenant') {
      return NextResponse.json(
        {
          success: false,
          error: 'Organizacion no identificada. Verifica que estes accediendo desde el dominio correcto.',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderNumber = normalizeOptionalText(searchParams.get('orderNumber'));
    const customerEmail = normalizeOptionalText(searchParams.get('customerEmail'));

    if (!orderNumber && !customerEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere numero de pedido o email del cliente',
        },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();
    const order = await fetchTrackedOrder(
      supabase,
      tenantContext.organization.id,
      orderNumber,
      customerEmail
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: 'Pedido no encontrado. Verifica el numero de pedido o email.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor. Por favor intenta nuevamente.',
      },
      { status: 500 }
    );
  }
}

export async function HEAD(_request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
