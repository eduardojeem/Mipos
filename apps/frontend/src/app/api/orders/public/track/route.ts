import { NextRequest, NextResponse } from 'next/server';

// GET - Buscar pedido por número o email (público)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const orderNumber = url.searchParams.get('orderNumber');
    const customerEmail = url.searchParams.get('customerEmail');

    if (!orderNumber && !customerEmail) {
      return NextResponse.json({ 
        error: 'Se requiere número de pedido o email del cliente' 
      }, { status: 400 });
    }

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    // Verificar si las tablas existen
    const { data: tableCheck } = await supabase
      .from('orders')
      .select('id')
      .limit(1)
      .maybeSingle();

    // Si no existen las tablas, devolver mensaje informativo
    if (tableCheck === null) {
      return NextResponse.json({ 
        error: 'El sistema de pedidos aún no está completamente configurado. Por favor, ejecuta el script SQL en Supabase para crear las tablas necesarias.',
        instructions: {
          step1: 'Ve a tu proyecto de Supabase',
          step2: 'Abre el SQL Editor',
          step3: 'Ejecuta el contenido del archivo scripts/setup-orders-tables.sql',
          step4: 'Vuelve a probar esta funcionalidad'
        }
      }, { status: 503 });
    }
    
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        subtotal,
        shipping_cost,
        total,
        payment_method,
        payment_status,
        status,
        notes,
        created_at,
        estimated_delivery_date,
        shipped_at,
        delivered_at,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal
        ),
        order_status_history (
          id,
          status,
          notes,
          changed_at
        )
      `);

    if (orderNumber) {
      query = query.eq('order_number', orderNumber.toUpperCase());
    } else if (customerEmail) {
      query = query
        .eq('customer_email', customerEmail.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(1);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: 'Error al buscar pedido' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const order = orders[0];

    // Ordenar historial por fecha
    if (order.order_status_history && Array.isArray(order.order_status_history)) {
      order.order_status_history.sort((a: any, b: any) => 
        new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
      );
    }

    return NextResponse.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Error in GET /api/orders/public/track:', error);
    return NextResponse.json({ 
      error: 'El sistema de pedidos necesita ser configurado. Por favor, ejecuta las migraciones SQL en Supabase.',
      details: 'Consulta el archivo CONFIGURACION_PEDIDOS.md para instrucciones completas.'
    }, { status: 503 });
  }
}