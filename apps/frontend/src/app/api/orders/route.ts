import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit-log';
import { resolveTenantContextFromHeaders } from '@/lib/domain/request-tenant';
import { getValidatedOrganizationId } from '@/lib/organization';
import {
  fetchOrderProductsForOrganization,
  getEffectiveOrderProductPrice,
  isSchemaMissingError,
} from '@/lib/public-site/order-products';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});

const MAX_QTY_PER_PRODUCT = 10;
const MAX_TOTAL_ITEMS = 50;
const ORDER_LIST_SORT_FIELDS = new Set(['created_at', 'total', 'status'] as const);
const ORDER_LIST_SELECT = `
  id,
  order_number,
  customer_id,
  customer_name,
  customer_email,
  customer_phone,
  customer_address,
  subtotal,
  shipping_cost,
  total,
  payment_method,
  status,
  notes,
  order_source,
  created_at,
  updated_at,
  organization_id,
  order_items:sale_items (
    id,
    product_id,
    quantity,
    unit_price,
    products (
      name,
      image_url
    )
  )
`;

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  productName?: string;
}

interface CreateOrderRequest {
  items: OrderItem[];
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
  shippingCost?: number;
  shippingRegion?: string;
}

function isMissingRpcFunctionError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (error as { code?: string })?.code === '42883' || message.includes('function');
}

async function rollbackCreatedOrder(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  orderId: string
) {
  await supabase.from('sale_items').delete().eq('sale_id', orderId);
  await supabase.from('sales').delete().eq('id', orderId);
}

function getOrderStartDate(dateRange: string | null): string | null {
  if (!dateRange || dateRange === 'all') {
    return null;
  }

  const now = new Date();
  switch (dateRange) {
    case 'today':
      now.setHours(0, 0, 0, 0);
      break;
    case 'week':
      now.setDate(now.getDate() - 7);
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return null;
  }

  return now.toISOString();
}

function sanitizeOrderSearchTerm(value: string | null): string {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s@._\-#]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

// GET - Obtener pedidos (para admin)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await limiter(request);
    if (rateLimitResult) return rateLimitResult;

    const authClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = await getValidatedOrganizationId(request);
    if (!orgId) {
      return NextResponse.json({ error: 'No se encontro una organizacion valida' }, { status: 400 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
    const status = (url.searchParams.get('status') || '').trim();
    const customerEmail = (url.searchParams.get('customerEmail') || '').trim();
    const search = sanitizeOrderSearchTerm(url.searchParams.get('search'));
    const dateRange = url.searchParams.get('dateRange');
    const sortByParam = (url.searchParams.get('sortBy') || 'created_at').trim();
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const sortBy = ORDER_LIST_SORT_FIELDS.has(sortByParam as 'created_at' | 'total' | 'status')
      ? sortByParam
      : 'created_at';
    const startDate = getOrderStartDate(dateRange);

    const offset = (page - 1) * limit;
    const supabase = await createAdminClient();

    let query = supabase
      .from('sales')
      .select(ORDER_LIST_SELECT, { count: 'exact' })
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (customerEmail) {
      query = query.eq('customer_email', customerEmail);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,order_number.ilike.%${search}%,customer_email.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    const { data: orders, count, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }

    const normalizedOrders = (orders || []).map((order: Record<string, unknown>) => ({
      ...order,
      payment_status: (order as { payment_status?: string | null }).payment_status || 'PENDING',
      order_items: ((order as { order_items?: Array<Record<string, unknown>> }).order_items || []).map((item) => {
        const unitPrice = Number(item.unit_price || 0);
        const quantity = Number(item.quantity || 0);
        const productRef = item.products as { name?: string; image_url?: string } | null | undefined;

        return {
          ...item,
          product_name: String(item.product_name || productRef?.name || 'Producto'),
          subtotal: Number(item.subtotal || unitPrice * quantity),
          products: productRef ? { name: productRef.name || 'Producto', image_url: productRef.image_url } : undefined,
        };
      }),
    }));

    // 'count' viene directo de la query principal (select con { count: 'exact' }).
    // No se necesita una segunda query de conteo.
    const countResult = count ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        orders: normalizedOrders,
        pagination: {
          page,
          limit,
          total: countResult || 0,
          totalPages: Math.ceil((countResult || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al obtener pedidos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo pedido publico
export async function POST(request: NextRequest) {
  try {
    const strictLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      maxRequests: 20,
    });
    const rateLimitResult = await strictLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    const body: CreateOrderRequest = await request.json();
    const {
      items,
      customerInfo,
      paymentMethod,
      notes,
      shippingCost = 0,
      shippingRegion = 'General',
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
    }

    if (!customerInfo?.name || !customerInfo?.email || !customerInfo?.phone) {
      return NextResponse.json({ error: 'Informacion del cliente incompleta' }, { status: 400 });
    }

    if (!['CASH', 'CARD', 'TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Metodo de pago invalido' }, { status: 400 });
    }

    const normalizedShippingCost = Number(shippingCost ?? 0);
    if (!Number.isFinite(normalizedShippingCost) || normalizedShippingCost < 0) {
      return NextResponse.json({ error: 'Costo de envio invalido' }, { status: 400 });
    }

    const normalizedItems = items.map((item) => ({
      productId: String(item.productId || '').trim(),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }));

    const invalidItem = normalizedItems.find(
      (item) =>
        !item.productId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > MAX_QTY_PER_PRODUCT ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0
    );

    if (invalidItem) {
      return NextResponse.json(
        {
          error: `Cada producto debe tener una cantidad valida entre 1 y ${MAX_QTY_PER_PRODUCT}.`,
        },
        { status: 400 }
      );
    }

    const totalRequestedItems = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalRequestedItems > MAX_TOTAL_ITEMS) {
      return NextResponse.json(
        {
          error: `Cantidad maxima de items excedida. Maximo ${MAX_TOTAL_ITEMS} items por pedido.`,
        },
        { status: 400 }
      );
    }

    const tenantContext = await resolveTenantContextFromHeaders(request.headers);
    if (tenantContext.kind === 'tenant-not-found') {
      return NextResponse.json({ error: 'Tenant publico no encontrado' }, { status: 404 });
    }

    const headerOrgId = (request.headers.get('x-organization-id') || '').trim();
    const orgId = tenantContext.kind === 'tenant' ? tenantContext.organization.id : headerOrgId;

    if (!orgId) {
      return NextResponse.json({ error: 'Cabecera de organizacion no encontrada' }, { status: 400 });
    }

    if (tenantContext.kind === 'tenant' && headerOrgId && headerOrgId !== orgId) {
      return NextResponse.json({ error: 'Conflicto en la cabecera de organizacion' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    let products;
    try {
      products = await fetchOrderProductsForOrganization(
        supabase,
        orgId,
        normalizedItems.map((item) => item.productId)
      );
    } catch (error) {
      if (isSchemaMissingError(error)) {
        return NextResponse.json(
          { error: 'La configuracion del catalogo publico todavia no esta lista.' },
          { status: 503 }
        );
      }

      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Error al validar productos' }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos publicados para este tenant' },
        { status: 404 }
      );
    }

    let subtotal = 0;
    const validatedItems: Array<OrderItem & { productName: string; validatedPrice: number }> = [];

    for (const item of normalizedItems) {
      const product = products.find((current) => current.id === item.productId);
      if (!product) {
        return NextResponse.json({ error: `Producto ${item.productId} no encontrado` }, { status: 400 });
      }

      if (!product.is_active) {
        return NextResponse.json({ error: `${product.name} no esta disponible` }, { status: 400 });
      }

      if (product.stock_quantity < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock_quantity}` },
          { status: 400 }
        );
      }

      const validatedPrice = getEffectiveOrderProductPrice(product);
      if (!Number.isFinite(validatedPrice) || validatedPrice < 0) {
        return NextResponse.json({ error: `Precio invalido para ${product.name}` }, { status: 400 });
      }

      if (Math.abs(validatedPrice - item.unitPrice) > 0.01) {
        console.warn('Price tampering attempt detected:', {
          productId: item.productId,
          clientPrice: item.unitPrice,
          serverPrice: validatedPrice,
          difference: Math.abs(validatedPrice - item.unitPrice),
        });
      }

      validatedItems.push({
        ...item,
        productName: product.name,
        validatedPrice,
        unitPrice: validatedPrice,
      });

      subtotal += validatedPrice * item.quantity;
    }

    const total = subtotal + normalizedShippingCost;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const { data: order, error: orderError } = await supabase
      .from('sales')
      .insert({
        order_number: orderNumber,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address || null,
        payment_method: paymentMethod,
        subtotal,
        shipping_cost: normalizedShippingCost,
        shipping_region: shippingRegion,
        total,
        notes: notes?.trim() || null,
        status: 'PENDING',
        order_source: 'WEB',
        organization_id: orgId,
        user_id: user?.id || null,
        date: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
    }

    const orderItems = validatedItems.map((item) => ({
      sale_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
    }));

    const { error: itemsError } = await supabase.from('sale_items').insert(orderItems);
    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      await rollbackCreatedOrder(supabase, order.id);
      return NextResponse.json({ error: 'Error al crear items del pedido' }, { status: 500 });
    }

    for (const item of validatedItems) {
      const product = products.find((current) => current.id === item.productId);
      if (!product) {
        continue;
      }

      const { error: stockError } = await supabase.rpc('decrement_product_stock', {
        product_id: item.productId,
        quantity_to_subtract: item.quantity,
      });

      if (stockError && isMissingRpcFunctionError(stockError)) {
        const nextStock = Math.max(0, Number(product.stock_quantity ?? 0) - item.quantity);
        const { data: updatedRows, error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: nextStock })
          .eq('id', item.productId)
          .eq('organization_id', orgId)
          .gte('stock_quantity', item.quantity)
          .select('id');

        if (updateError || !updatedRows || updatedRows.length === 0) {
          console.error('Error updating stock:', updateError);
          await rollbackCreatedOrder(supabase, order.id);
          return NextResponse.json(
            {
              error: `No se pudo reservar stock para ${product.name}. Revisa el carrito e intenta de nuevo.`,
            },
            { status: 409 }
          );
        }
      } else if (stockError) {
        console.error('Error in stock RPC:', stockError);
        await rollbackCreatedOrder(supabase, order.id);
        return NextResponse.json({ error: 'Error al actualizar stock' }, { status: 500 });
      }
    }

    try {
      console.log('Order created successfully:', order.id);
    } catch (emailError) {
      console.warn('Email notification failed:', emailError);
    }

    try {
      await logAudit(
        {
          user_id: user?.id,
          action: 'CREATE',
          table_name: 'sales',
          record_id: order.id,
          new_data: {
            customer_name: customerInfo.name,
            customer_email: customerInfo.email,
            total,
            status: 'PENDING',
            items_count: normalizedItems.length,
          },
          organization_id: orgId,
        },
        request
      );
    } catch (auditError) {
      console.error('Error writing order audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          total: order.total,
          createdAt: order.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
