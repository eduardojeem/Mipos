import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPlanEntitlements, hasPlanFeature, isPlanLimitReached } from '@/app/api/_utils/plan-entitlements'
import { getPublicOrgId } from '@/lib/barbershop/public'
import { ensureAppointmentCustomer, hasOverlap } from '@/lib/barbershop/appointment-helpers'

const MAX_DAYS_AHEAD = 90

/**
 * POST /api/appointments/public
 * Reserva pública (cliente sin cuenta). Crea el turno en estado BOOKED para que
 * el dueño lo confirme desde la agenda. Solo se aceptan reservas en orgs cuyo
 * vertical es BARBERSHOP.
 *
 * Body: { service_id, staff_profile_id, start_at, customer_name, customer_phone, customer_email?, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const orgId = getPublicOrgId(request)
    if (!orgId) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 400 })

    const raw = await request.json().catch(() => ({}))
    const serviceId = String(raw?.service_id || '').trim()
    const staffProfileId = String(raw?.staff_profile_id || '').trim()
    const startAt = String(raw?.start_at || '').trim()
    const customerName = String(raw?.customer_name || '').trim()
    const customerPhone = String(raw?.customer_phone || '').trim()
    const customerEmail = typeof raw?.customer_email === 'string' ? raw.customer_email.trim().toLowerCase() : ''

    if (!customerName) return NextResponse.json({ error: 'Ingresá tu nombre' }, { status: 400 })
    if (!customerPhone) return NextResponse.json({ error: 'Ingresá tu teléfono' }, { status: 400 })
    if (!serviceId || !staffProfileId) return NextResponse.json({ error: 'Elegí servicio y profesional' }, { status: 400 })

    const start = new Date(startAt)
    if (Number.isNaN(start.getTime())) return NextResponse.json({ error: 'Horario inválido' }, { status: 400 })

    const now = Date.now()
    if (start.getTime() < now) return NextResponse.json({ error: 'No se puede reservar en el pasado' }, { status: 400 })
    if (start.getTime() > now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'La fecha es demasiado lejana' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const entitlements = await getPlanEntitlements(orgId)
    if (!hasPlanFeature(entitlements, 'public_booking')) {
      return NextResponse.json({ error: 'Las reservas online no estan incluidas en este plan' }, { status: 403 })
    }

    // La org debe existir y ser una barbería (solo ese vertical acepta reservas públicas)
    const { data: org } = await (admin as any)
      .from('organizations')
      .select('id, vertical')
      .eq('id', orgId)
      .maybeSingle()
    if (!org) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 })
    if (org.vertical !== 'BARBERSHOP') {
      return NextResponse.json({ error: 'Esta empresa no acepta reservas online' }, { status: 400 })
    }

    // Servicio y profesional válidos y activos en esa org
    const [{ data: service }, { data: staff }] = await Promise.all([
      (admin as any).from('services').select('id, price, duration_min, is_active').eq('id', serviceId).eq('organization_id', orgId).maybeSingle(),
      (admin as any).from('staff_profiles').select('id, is_active').eq('id', staffProfileId).eq('organization_id', orgId).maybeSingle(),
    ])
    if (!service || !service.is_active) return NextResponse.json({ error: 'Servicio no disponible' }, { status: 400 })
    if (!staff || !staff.is_active) return NextResponse.json({ error: 'Profesional no disponible' }, { status: 400 })

    const duration = Number(service.duration_min) || 30
    const end = new Date(start.getTime() + duration * 60_000)

    const monthStart = new Date(start)
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const { count: appointmentCount, error: countError } = await (admin as any)
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('start_at', monthStart.toISOString())
      .lt('start_at', monthEnd.toISOString())

    if (countError) {
      console.error('Error checking public appointment plan limit:', countError)
      return NextResponse.json({ error: 'No se pudo validar el limite de reservas' }, { status: 500 })
    }

    if (isPlanLimitReached(Number(appointmentCount || 0), entitlements.limits.maxAppointmentsPerMonth)) {
      return NextResponse.json({ error: 'La agenda alcanzo el limite mensual del plan' }, { status: 403 })
    }

    // Re-chequeo de solape (defensa ante reservas concurrentes sobre el mismo hueco)
    if (await hasOverlap(admin, orgId, staffProfileId, start.toISOString(), end.toISOString())) {
      return NextResponse.json({ error: 'Ese horario ya fue tomado. Elegí otro.' }, { status: 409 })
    }

    const notes = typeof raw?.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : 'Reserva online'
    const resolvedCustomerId = await ensureAppointmentCustomer(admin, {
      orgId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
    })

    const { data: created, error } = await (admin as any)
      .from('appointments')
      .insert([{
        organization_id: orgId,
        staff_profile_id: staffProfileId,
        service_id: serviceId,
        customer_id: resolvedCustomerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: 'BOOKED',
        price: Number(service.price) || 0,
        notes,
      }])
      .select('id, start_at, end_at')
      .single()

    if (error) {
      console.error('Error creating public appointment:', error)
      return NextResponse.json({ error: 'No se pudo crear la reserva' }, { status: 500 })
    }

    // Respuesta mínima: confirmación, sin exponer datos internos
    return NextResponse.json({
      success: true,
      appointment: { id: created.id, start_at: created.start_at, end_at: created.end_at },
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in appointments/public POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
