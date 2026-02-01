import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateBusinessConfig } from '@/app/api/admin/_utils/business-config';

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

// GET - Obtener pedidos (para admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar si las tablas existen
    const { data: tableCheck } = await supabase
      .from('orders')
      .select('id')
      .limit(1)
      .maybeSingle();

    // Si no existen las tablas, devolver respuesta vacía
    if (!tableCheck && tableCheck !== null) {
      return NextResponse.json({
        success: true,
        data: {
          orders: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
          }
        },
        message: 'Las tablas de pedidos no están configuradas aún'
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const customerEmail = url.searchParams.get('customerEmail');
    
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          product_name
        )
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (customerEmail) {
      query = query.eq('customer_email', customerEmail);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
    }

    // Contar total para paginación
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (status) countQuery = countQuery.eq('status', status);
    if (customerEmail) countQuery = countQuery.eq('customer_email', customerEmail);

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      data: {
        orders: orders || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json({ 
      success: true,
      data: {
        orders: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      },
      message: 'Las tablas de pedidos necesitan ser configuradas'
    }, { status: 200 });
  }
}

// POST - Crear nuevo pedido
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { items, customerInfo, paymentMethod, notes, shippingCost = 0, shippingRegion = 'General' } = body;

    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items requeridos' }, { status: 400 });
    }

    if (!customerInfo?.name || !customerInfo?.email || !customerInfo?.phone) {
      return NextResponse.json({ error: 'Información del cliente incompleta' }, { status: 400 });
    }

    if (!['CASH', 'CARD', 'TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 });
    }

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Validar productos y stock
    const productIds = items.map(item => item.productId);
    
    // Verificar si existe la tabla products
    let products: any[] = [];
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, sale_price, offer_price, stock_quantity, is_active')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        // Si no existe la tabla, crear productos mock para testing
        products = items.map(item => ({
          id: item.productId,
          name: `Producto ${item.productId}`,
          sale_price: item.unitPrice,
          offer_price: null,
          stock_quantity: 100,
          is_active: true
        }));
      } else {
        products = productsData || [];
      }
    } catch (error) {
      // Fallback para testing sin tabla products
      products = items.map(item => ({
        id: item.productId,
        name: `Producto ${item.productId}`,
        sale_price: item.unitPrice,
        offer_price: null,
        stock_quantity: 100,
        is_active: true
      }));
    }

    if (products.length !== items.length) {
      return NextResponse.json({ error: 'Algunos productos no existen' }, { status: 400 });
    }

    // Validar stock y precios
    let subtotal = 0;
    const validatedItems: Array<OrderItem & { productName: string; validatedPrice: number }> = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return NextResponse.json({ error: `Producto ${item.productId} no encontrado` }, { status: 400 });
      }

      if (!product.is_active) {
        return NextResponse.json({ error: `${product.name} no está disponible` }, { status: 400 });
      }

      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({ 
          error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock_quantity}` 
        }, { status: 400 });
      }

      const validatedPrice = product.offer_price || product.sale_price;
      const priceDifference = Math.abs(validatedPrice - item.unitPrice);
      
      if (priceDifference > 0.01) {
        return NextResponse.json({ 
          error: `Precio incorrecto para ${product.name}. Precio actual: ${validatedPrice}` 
        }, { status: 400 });
      }

      validatedItems.push({
        ...item,
        productName: product.name,
        validatedPrice,
        unitPrice: validatedPrice
      });

      subtotal += validatedPrice * item.quantity;
    }

    const total = subtotal + (shippingCost || 0);

    // 2. Crear pedido en transacción
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address || null,
        payment_method: paymentMethod,
        subtotal,
        shipping_cost: shippingCost || 0,
        shipping_region: shippingRegion,
        total,
        notes: notes || null,
        status: 'PENDING',
        order_source: 'WEB',
        organization_id: orgId
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 });
    }

    // 3. Crear items del pedido
    const orderItems = validatedItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: eliminar pedido
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Error al crear items del pedido' }, { status: 500 });
    }

    // 4. Actualizar stock de productos
    for (const item of validatedItems) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const newStock = product.stock_quantity - item.quantity;
        await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('id', item.productId);
      }
    }

    // 5. Enviar notificación por email (opcional)
    try {
      // Aquí puedes integrar con un servicio de email como Resend, SendGrid, etc.
      console.log('Order created successfully:', order.id);
    } catch (emailError) {
      console.warn('Email notification failed:', emailError);
      // No fallar el pedido por error de email
    }

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          total: order.total,
          createdAt: order.created_at
        }
      }
    });

  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}