import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { awardAppointmentLoyaltyPoints } from '@/lib/loyalty/award-points'
import { authorizeAppointments } from '@/lib/barbershop/authorize-appointments'

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER']

/**
 * POST /api/appointments/[id]/charge
 * Cobra un turno: crea una venta (Sale cabecera) con el precio del servicio y
 * enlaza appointment.sale_id, dejando el turno en COMPLETED.
 *
 * Un servicio no es un producto, por eso NO se crean sale_items ni se toca stock:
 * la venta cabecera alcanza para que el ingreso entre en ventas/caja/reportes.
 *
 * Idempotente: si el turno ya tiene sale_id, devuelve esa venta sin duplicar.
 *
 * Body: { payment_method?: 'CASH'|'CARD'|'TRANSFER'|'OTHER', customer_id?: string|null }
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeAppointments(request)
    if (!auth.ok) return auth.response
    const { orgId, userId } = auth

    const { id } = await params
    const raw = await request.json().catch(() => ({}))
    const paymentMethod = PAYMENT_METHODS.includes(raw?.payment_method) ? raw.payment_method : 'CASH'

    const admin = await createAdminClient()

    const { data: appt } = await (admin as any)
      .from('appointments')
      .select('id, service_id, customer_id, price, status, sale_id, notes')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!appt) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
      return NextResponse.json({ error: 'No se puede cobrar un turno cancelado o sin asistencia' }, { status: 400 })
    }

    // Idempotencia: ya cobrado → devolver la venta existente
    if (appt.sale_id) {
      const { data: existingSale } = await (admin as any).from('sales').select('*').eq('id', appt.sale_id).maybeSingle()
      return NextResponse.json({ success: true, alreadyCharged: true, sale: existingSale || null })
    }

    // Nombre del servicio para la nota de la venta
    const { data: service } = await (admin as any).from('services').select('name').eq('id', appt.service_id).maybeSingle()
    const serviceName = service?.name || 'Servicio'

    const price = Number(appt.price) || 0
    const customerId = typeof raw?.customer_id === 'string' && raw.customer_id.trim()
      ? raw.customer_id.trim()
      : appt.customer_id || null

    const { data: sale, error: saleError } = await (admin as any)
      .from('sales')
      .insert([{
        organization_id: orgId,
        user_id: userId,
        customer_id: customerId,
        subtotal: price,
        discount: 0,
        tax: 0,
        total: price,
        payment_method: paymentMethod,
        notes: `Servicio: ${serviceName} (turno)`,
      }])
      .select('*')
      .single()

    if (saleError || !sale) {
      console.error('Error creating sale for appointment:', saleError)
      return NextResponse.json({ error: 'No se pudo registrar la venta', details: saleError?.message }, { status: 500 })
    }

    // Enlazar y cerrar el turno
    const { error: updateError } = await (admin as any)
      .from('appointments')
      .update({ sale_id: sale.id, status: 'COMPLETED' })
      .eq('id', id)
      .eq('organization_id', orgId)

    if (updateError) {
      // La venta quedó creada; reportamos el problema de enlace para reconciliar.
      console.error('Sale created but failed to link appointment:', updateError)
      return NextResponse.json(
        { error: 'La venta se creó pero no se pudo cerrar el turno', sale, details: updateError.message },
        { status: 500 },
      )
    }

    let loyalty: Awaited<ReturnType<typeof awardAppointmentLoyaltyPoints>> | null = null
    if (customerId) {
      try {
        loyalty = await awardAppointmentLoyaltyPoints({
          admin,
          orgId,
          customerId,
          saleId: sale.id,
          appointmentId: id,
          serviceName,
          paymentMethod,
          purchaseAmount: price,
          userId: userId,
        })
      } catch (loyaltyError) {
        console.error('Appointment charged but loyalty points could not be synced:', loyaltyError)
      }
    }

    return NextResponse.json({ success: true, sale, loyalty })
  } catch (error) {
    console.error('Unexpected error in appointment charge:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
