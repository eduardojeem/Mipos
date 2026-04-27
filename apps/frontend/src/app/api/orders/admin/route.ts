import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';
import { defaultBusinessConfig } from '@/types/business-config';
import { logAudit } from '@/lib/audit-log';
import {
  fetchOrderProductsForOrganization,
  getEffectiveOrderProductPrice,
} from '@/lib/public-site/order-products';

const MAX_QTY_PER_PRODUCT = 1000;
const MAX_TOTAL_ITEMS = 200;

interface DashboardOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface DashboardNewCustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface DashboardCreateOrderRequest {
  items: DashboardOrderItemInput[];
  selectedCustomerId?: string | null;
  newCustomer?: DashboardNewCustomerInput | null;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'DIGITAL_WALLET';
  notes?: string | null;
  shippingCost?: number | null;
}

interface ResolvedCustomer {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created: boolean;
}

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim();
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = normalizeText(value).toLowerCase();
  return normalized || null;
}

function normalizePhone(value: string | null | undefined): string | null {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  return normalized || null;
}

function isMissingRpcFunctionError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (error as { code?: string })?.code === '42883' || message.includes('function');
}

function buildOrderNumber(): string {
  return `ADM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;
}

async function restoreReservedStock(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  reservedItems: Array<{ productId: string; quantity: number }>
) {
  for (const item of reservedItems) {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', item.productId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    const current = Number(product?.stock_quantity || 0);
    await supabase
      .from('products')
      .update({ stock_quantity: current + item.quantity })
      .eq('id', item.productId)
      .eq('organization_id', organizationId);
  }
}

async function rollbackCreatedOrder(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  orderId: string
) {
  await supabase.from('sale_items').delete().eq('sale_id', orderId);
  await supabase.from('sales').delete().eq('id', orderId);
}

async function loadStoreSettings(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string
) {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('organization_id', organizationId)
    .eq('key', 'business_config')
    .maybeSingle();

  const rawStoreSettings =
    data && typeof data.value === 'object' && data.value !== null
      ? (data.value as { storeSettings?: Record<string, unknown> }).storeSettings
      : null;

  return {
    ...defaultBusinessConfig.storeSettings,
    ...(rawStoreSettings || {}),
  };
}

async function resolveCustomer(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  selectedCustomerId: string | null | undefined,
  newCustomer: DashboardNewCustomerInput | null | undefined
): Promise<ResolvedCustomer> {
  if (selectedCustomerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('id', selectedCustomerId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!customer) {
      throw new Error('El cliente seleccionado ya no existe para esta organizacion');
    }

    return {
      id: String(customer.id),
      name: String(customer.name || 'Cliente'),
      email: customer.email ? String(customer.email) : null,
      phone: customer.phone ? String(customer.phone) : null,
      address: customer.address ? String(customer.address) : null,
      created: false,
    };
  }

  if (!newCustomer) {
    throw new Error('Selecciona un cliente o crea uno nuevo');
  }

  const name = normalizeText(newCustomer.name);
  const email = normalizeEmail(newCustomer.email);
  const phone = normalizePhone(newCustomer.phone);
  const address = normalizeText(newCustomer.address) || null;

  if (!name || (!email && !phone)) {
    throw new Error('Completa al menos nombre y email o telefono');
  }

  if (email) {
    const { data: existingByEmail } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingByEmail) {
      return {
        id: String(existingByEmail.id),
        name: String(existingByEmail.name || name),
        email: existingByEmail.email ? String(existingByEmail.email) : email,
        phone: existingByEmail.phone ? String(existingByEmail.phone) : phone,
        address: existingByEmail.address ? String(existingByEmail.address) : address,
        created: false,
      };
    }
  }

  if (phone) {
    const { data: existingByPhone } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('organization_id', organizationId)
      .eq('phone', phone)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingByPhone) {
      return {
        id: String(existingByPhone.id),
        name: String(existingByPhone.name || name),
        email: existingByPhone.email ? String(existingByPhone.email) : email,
        phone: existingByPhone.phone ? String(existingByPhone.phone) : phone,
        address: existingByPhone.address ? String(existingByPhone.address) : address,
        created: false,
      };
    }
  }

  const { data: createdCustomer, error } = await supabase
    .from('customers')
    .insert({
      name,
      email,
      phone,
      address,
      organization_id: organizationId,
    })
    .select('id, name, email, phone, address')
    .single();

  if (error || !createdCustomer) {
    throw new Error('No se pudo crear el cliente');
  }

  return {
    id: String(createdCustomer.id),
    name: String(createdCustomer.name || name),
    email: createdCustomer.email ? String(createdCustomer.email) : email,
    phone: createdCustomer.phone ? String(createdCustomer.phone) : phone,
    address: createdCustomer.address ? String(createdCustomer.address) : address,
    created: true,
  };
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const organizationId = await getValidatedOrganizationId(request);
    if (!organizationId) {
      return NextResponse.json({ error: 'No se encontro una organizacion valida' }, { status: 400 });
    }

    const body = (await request.json()) as DashboardCreateOrderRequest;
    const requestedItems = (body.items || []).map((item) => ({
      productId: normalizeText(item.productId),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    }));
    const normalizedItems = Array.from(
      requestedItems.reduce((map, item) => {
        const existing = map.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.unitPrice = item.unitPrice;
          return map;
        }
        map.set(item.productId, { ...item });
        return map;
      }, new Map<string, DashboardOrderItemInput>()).values()
    );

    if (!normalizedItems.length) {
      return NextResponse.json({ error: 'Agrega al menos un producto' }, { status: 400 });
    }

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
        { error: `Cada producto debe tener una cantidad valida entre 1 y ${MAX_QTY_PER_PRODUCT}.` },
        { status: 400 }
      );
    }

    const totalItems = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > MAX_TOTAL_ITEMS) {
      return NextResponse.json(
        { error: `Cantidad maxima excedida. Maximo ${MAX_TOTAL_ITEMS} items por pedido.` },
        { status: 400 }
      );
    }

    const paymentMethod = String(body.paymentMethod || '').trim();
    if (!['CASH', 'CARD', 'TRANSFER', 'DIGITAL_WALLET'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Metodo de pago invalido' }, { status: 400 });
    }

    const shippingCost = Number(body.shippingCost || 0);
    if (!Number.isFinite(shippingCost) || shippingCost < 0) {
      return NextResponse.json({ error: 'Costo de envio invalido' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const customer = await resolveCustomer(
      supabase,
      organizationId,
      body.selectedCustomerId,
      body.newCustomer
    );

    const products = await fetchOrderProductsForOrganization(
      supabase,
      organizationId,
      normalizedItems.map((item) => item.productId)
    );

    const validatedItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];
    let subtotal = 0;

    for (const item of normalizedItems) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        return NextResponse.json({ error: `Producto ${item.productId} no encontrado` }, { status: 400 });
      }

      if (!product.is_active) {
        return NextResponse.json({ error: `${product.name} no esta disponible` }, { status: 400 });
      }

      if (product.stock_quantity < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock_quantity}` },
          { status: 409 }
        );
      }

      const validatedPrice = getEffectiveOrderProductPrice(product);
      const itemSubtotal = Number((validatedPrice * item.quantity).toFixed(2));
      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: validatedPrice,
        subtotal: itemSubtotal,
      });
      subtotal += itemSubtotal;
    }

    const storeSettings = await loadStoreSettings(supabase, organizationId);
    const taxEnabled = Boolean(storeSettings.taxEnabled ?? true);
    const taxRate = Number(storeSettings.taxRate ?? 0.1);
    const taxIncluded = Boolean(storeSettings.taxIncludedInPrices ?? true);
    const tax = taxEnabled
      ? Number(
          (taxIncluded ? subtotal - subtotal / (1 + taxRate) : Math.max(0, subtotal) * taxRate).toFixed(2)
        )
      : 0;
    const total = Number((taxIncluded ? subtotal + shippingCost : subtotal + tax + shippingCost).toFixed(2));
    const orderNumber = buildOrderNumber();

    let createdOrderId: string | null = null;
    const reservedItems: Array<{ productId: string; quantity: number }> = [];

    try {
      const { data: order, error: orderError } = await supabase
        .from('sales')
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          customer_id: customer.id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          customer_address: customer.address,
          subtotal,
          discount: 0,
          discount_type: 'PERCENTAGE',
          tax,
          shipping_cost: shippingCost,
          total,
          date: new Date().toISOString(),
          payment_method: paymentMethod,
          notes: normalizeText(body.notes) || null,
          status: 'PENDING',
          order_source: 'MANUAL',
          organization_id: organizationId,
        })
        .select('id, order_number, status, total, created_at')
        .single();

      if (orderError || !order) {
        throw new Error('No se pudo crear la orden');
      }

      createdOrderId = String(order.id);

      const { error: orderItemsError } = await supabase.from('sale_items').insert(
        validatedItems.map((item) => ({
          sale_id: createdOrderId,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))
      );

      if (orderItemsError) {
        throw new Error('No se pudieron crear los items de la orden');
      }

      for (const item of validatedItems) {
        const { error: rpcError } = await supabase.rpc('decrement_product_stock', {
          product_id: item.productId,
          quantity_to_subtract: item.quantity,
        });

        if (rpcError && isMissingRpcFunctionError(rpcError)) {
          const { data: updatedRows, error: updateError } = await supabase
            .from('products')
            .update({
              stock_quantity: Math.max(
                0,
                Number(products.find((product) => product.id === item.productId)?.stock_quantity || 0) - item.quantity
              ),
            })
            .eq('id', item.productId)
            .eq('organization_id', organizationId)
            .gte('stock_quantity', item.quantity)
            .select('id');

          if (updateError || !updatedRows || updatedRows.length === 0) {
            throw new Error(`No se pudo reservar stock para ${item.productName}`);
          }
        } else if (rpcError) {
          throw new Error(`No se pudo actualizar stock para ${item.productName}`);
        }

        reservedItems.push({ productId: item.productId, quantity: item.quantity });
      }

      await supabase.from('order_status_history').insert({
        order_id: createdOrderId,
        status: 'PENDING',
        notes: 'Pedido creado desde dashboard',
        changed_by: user.id,
        organization_id: organizationId,
      });

      try {
        await logAudit(
          {
            user_id: user.id,
            action: 'CREATE',
            table_name: 'sales',
            record_id: createdOrderId,
            new_data: {
              order_number: order.order_number,
              customer_name: customer.name,
              total,
              status: order.status,
              order_source: 'MANUAL',
            },
            organization_id: organizationId,
          },
          request
        );
      } catch (auditError) {
        console.warn('Order audit log failed:', auditError);
      }

      return NextResponse.json({
        success: true,
        data: {
          order: {
            id: createdOrderId,
            orderNumber: order.order_number,
            status: order.status,
            total: order.total,
            createdAt: order.created_at,
          },
        },
      });
    } catch (error) {
      if (reservedItems.length > 0) {
        await restoreReservedStock(supabase, organizationId, reservedItems);
      }
      if (createdOrderId) {
        await rollbackCreatedOrder(supabase, createdOrderId);
      }
      if (customer.created && customer.id) {
        await supabase.from('customers').delete().eq('id', customer.id).eq('organization_id', organizationId);
      }

      const message = error instanceof Error ? error.message : 'No se pudo crear la orden';
      const status = message.includes('stock') ? 409 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error('Error in POST /api/orders/admin:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
