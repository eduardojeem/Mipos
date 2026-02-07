import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * API Endpoint Público para Tracking de Pedidos
 * 
 * Este endpoint permite a los clientes rastrear sus pedidos sin autenticación
 * Requiere que el middleware haya inyectado el organization_id en las cookies
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener organización de las cookies (inyectado por middleware)
    const cookieStore = await cookies();
    const organizationId = cookieStore.get('x-organization-id')?.value;
    
    if (!organizationId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Organización no identificada. Verifica que estés accediendo desde el dominio correcto.' 
        },
        { status: 400 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const customerEmail = searchParams.get('customerEmail');
    
    // Validar que se proporcione al menos un parámetro de búsqueda
    if (!orderNumber && !customerEmail) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Se requiere número de pedido o email del cliente' 
        },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // ✅ Query con filtro de organización para aislamiento de datos
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
        status,
        notes,
        created_at,
        estimated_delivery_date,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          subtotal
        )
      `)
      .eq('organization_id', organizationId); // ← CRÍTICO: Filtrar por organización
    
    // Aplicar filtro de búsqueda
    if (orderNumber) {
      query = query.eq('order_number', orderNumber);
    } else if (customerEmail) {
      query = query.eq('customer_email', customerEmail.toLowerCase());
    }
    
    const { data: order, error } = await query.single();
    
    if (error) {
      console.error('Error fetching order:', error);
      
      // Si no se encuentra, devolver 404
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Pedido no encontrado. Verifica el número de pedido o email.' 
          },
          { status: 404 }
        );
      }
      
      throw error;
    }
    
    if (!order) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Pedido no encontrado' 
        },
        { status: 404 }
      );
    }
    
    // Log para auditoría (opcional)
    console.log(`✅ Order tracked: ${order.order_number} for org: ${organizationId}`);
    
    return NextResponse.json({
      success: true,
      data: { order }
    });
    
  } catch (error: any) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor. Por favor intenta nuevamente.' 
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint de salud para verificar que el API está funcionando
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
