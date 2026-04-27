import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import { logAudit } from '@/lib/audit-log';
import { getValidatedOrganizationId } from '@/lib/organization';
import { canTransitionOrderStatus } from '@/lib/orders/status-transitions';

interface UpdateOrderRequest {
  status?: string;
  payment_status?: string;
  notes?: string;
  estimated_delivery_date?: string;
}

const ORDER_DETAIL_SELECT = `
  *,
  order_items:sale_items (
    id,
    product_id,
    quantity,
    unit_price,
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
`;

async function restoreOrderStock(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  orderId: string,
  organizationId: string
) {
  const { data: orderItems } = await supabase
    .from('sale_items')
    .select('product_id, quantity')
    .eq('sale_id', orderId);

  for (const item of orderItems || []) {
    if (!item.product_id) {
      continue;
    }

    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', item.product_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!product) {
      continue;
    }

    const nextStock = Number(product.stock_quantity || 0) + Number(item.quantity || 0);
    await supabase
      .from('products')
      .update({ stock_quantity: nextStock })
      .eq('id', item.product_id)
      .eq('organization_id', organizationId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const supabase = await createAdminClient();
    const orderId = (await params).id;
    const { data: order, error } = await supabase
      .from('sales')
      .select(ORDER_DETAIL_SELECT)
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const normalizedOrder = {
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
    };

    return NextResponse.json({
      success: true,
      data: { order: normalizedOrder },
    });
  } catch (error) {
    console.error('Error in GET /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body: UpdateOrderRequest = await request.json();
    const { status, payment_status, notes, estimated_delivery_date } = body;

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

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado de pedido invalido' }, { status: 400 });
    }

    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return NextResponse.json({ error: 'Estado de pago invalido' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const orderId = (await params).id;
    const { data: existingOrder, error: existingOrderError } = await supabase
      .from('sales')
      .select('id, status')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single();

    if (existingOrderError || !existingOrder) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const currentStatus = String(existingOrder.status || '');
    const statusChanged = Boolean(status && status !== currentStatus);
    if (statusChanged && status && !canTransitionOrderStatus(currentStatus, status)) {
      return NextResponse.json(
        {
          error: `No se puede cambiar un pedido de ${currentStatus} a ${status}`,
        },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | null | undefined> = {
      updated_by: user.id,
    };

    if (statusChanged) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;
    if (notes !== undefined) updateData.notes = notes;
    if (estimated_delivery_date) updateData.estimated_delivery_date = estimated_delivery_date;
    if (statusChanged && status === 'SHIPPED') updateData.shipped_at = new Date().toISOString();
    if (statusChanged && status === 'DELIVERED') updateData.delivered_at = new Date().toISOString();
    if (statusChanged && status === 'CANCELLED') updateData.cancelled_at = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      console.error('Error updating order:', updateError);
      return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
    }

    if (statusChanged) {
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status,
        notes: `Estado cambiado a ${status}${notes ? ` - ${notes}` : ''}`,
        changed_by: user.id,
        organization_id: organizationId,
      });
    }

    if (statusChanged && status === 'CANCELLED' && existingOrder.status !== 'CANCELLED') {
      try {
        await restoreOrderStock(supabase, orderId, organizationId);
      } catch (stockError) {
        console.warn('Error restoring order stock:', stockError);
      }
    }

    try {
      await logAudit(
        {
          user_id: user.id,
          action: statusChanged ? 'STATUS_CHANGE' : 'UPDATE',
          table_name: 'sales',
          record_id: orderId,
          old_data: statusChanged ? { status: existingOrder.status } : undefined,
          new_data: updateData,
          organization_id: organizationId,
          metadata: { notes },
        },
        request
      );
    } catch (auditError) {
      console.warn('Order update audit log failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: { order: updatedOrder },
    });
  } catch (error) {
    console.error('Error in PATCH /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const organizationId = await getValidatedOrganizationId(request);
    if (!organizationId) {
      return NextResponse.json({ error: 'No se encontro una organizacion valida' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const orderId = (await params).id;
    const { data: order, error: fetchError } = await supabase
      .from('sales')
      .select('id, status')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (!['PENDING', 'CANCELLED'].includes(String(order.status || ''))) {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar pedidos pendientes o cancelados' },
        { status: 400 }
      );
    }

    if (order.status === 'PENDING') {
      try {
        await restoreOrderStock(supabase, orderId, organizationId);
      } catch (stockError) {
        console.warn('Error restoring stock during deletion:', stockError);
      }
    }

    const { error: deleteError } = await supabase
      .from('sales')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null,
      })
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .select('id')
      .single();

    if (deleteError) {
      console.error('Error deleting order:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar pedido' }, { status: 500 });
    }

    try {
      await logAudit(
        {
          user_id: user?.id,
          action: 'DELETE',
          table_name: 'sales',
          record_id: orderId,
          old_data: { status: order.status },
          organization_id: organizationId,
          metadata: { soft_delete: true },
        },
        request
      );
    } catch (auditError) {
      console.warn('Order delete audit log failed:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido eliminado correctamente',
    });
  } catch (error) {
    console.error('Error in DELETE /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
