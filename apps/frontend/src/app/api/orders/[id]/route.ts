import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/app/api/_utils/auth';

interface UpdateOrderRequest {
  status?: string;
  payment_status?: string;
  notes?: string;
  estimated_delivery_date?: string;
}

// GET - Obtener pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          subtotal,
          products (
            name,
            image_url
          )
        ),
        order_status_history (
          id,
          status,
          notes,
          changed_at,
          changed_by
        )
      `)
      .eq('id', (await params).id)
      .single();

    if (error) {
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH - Actualizar pedido
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar que el usuario sea admin
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const body: UpdateOrderRequest = await request.json();
    const { status, payment_status, notes, estimated_delivery_date } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Validar estados permitidos
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado de pedido inválido' }, { status: 400 });
    }

    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return NextResponse.json({ error: 'Estado de pago inválido' }, { status: 400 });
    }

    // Preparar datos de actualización
    const updateData: any = {
      updated_by: user?.id,
    };

    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;
    if (notes !== undefined) updateData.notes = notes;
    if (estimated_delivery_date) updateData.estimated_delivery_date = estimated_delivery_date;

    // Agregar timestamps específicos según el estado
    if (status === 'SHIPPED') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'DELIVERED') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'CANCELLED') {
      updateData.cancelled_at = new Date().toISOString();
    }

    // Actualizar pedido
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', (await params).id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
    }

    // Si se cambió el estado, agregar entrada al historial manualmente (por si el trigger no funciona)
    if (status) {
      await supabase
        .from('order_status_history')
        .insert({
          order_id: (await params).id,
          status,
          notes: `Estado cambiado a ${status}${notes ? ` - ${notes}` : ''}`,
          changed_by: user?.id,
        });
    }

    // Si el pedido se cancela, restaurar stock
    if (status === 'CANCELLED') {
      try {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', (await params).id);

        if (orderItems) {
          for (const item of orderItems) {
            if (item.product_id) {
              // Obtener stock actual
              const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();

              if (product) {
                const newStock = (product.stock_quantity || 0) + item.quantity;
                await supabase
                  .from('products')
                  .update({ stock_quantity: newStock })
                  .eq('id', item.product_id);
              }
            }
          }
        }
      } catch (stockError) {
        console.warn('Error restoring stock:', stockError);
        // No fallar la actualización por error de stock
      }
    }

    return NextResponse.json({
      success: true,
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar pedido (solo para admins)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar que el usuario sea admin
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();

    // Verificar que el pedido existe
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', (await params).id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Solo permitir eliminar pedidos pendientes o cancelados
    if (!['PENDING', 'CANCELLED'].includes(order.status)) {
      return NextResponse.json({ 
        error: 'Solo se pueden eliminar pedidos pendientes o cancelados' 
      }, { status: 400 });
    }

    // Restaurar stock si el pedido no estaba cancelado
    if (order.status === 'PENDING') {
      try {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', (await params).id);

        if (orderItems) {
          for (const item of orderItems) {
            if (item.product_id) {
              const { data: product } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single();

              if (product) {
                const newStock = (product.stock_quantity || 0) + item.quantity;
                await supabase
                  .from('products')
                  .update({ stock_quantity: newStock })
                  .eq('id', item.product_id);
              }
            }
          }
        }
      } catch (stockError) {
        console.warn('Error restoring stock during deletion:', stockError);
      }
    }

    // Eliminar pedido (cascade eliminará items y historial)
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', (await params).id);

    if (deleteError) {
      console.error('Error deleting order:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar pedido' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido eliminado correctamente'
    });

  } catch (error) {
    console.error('Error in DELETE /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
