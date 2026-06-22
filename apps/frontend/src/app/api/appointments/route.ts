import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPlanEntitlements, hasPlanFeature, isPlanLimitReached } from '@/app/api/_utils/plan-entitlements'
import { APPT_COLUMNS, VALID_STATUSES, ensureAppointmentCustomer, hasOverlap } from '@/lib/barbershop/appointment-helpers'
import { authorizeAppointments } from '@/lib/barbershop/authorize-appointments'

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAppointments(request)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') // ISO
    const to = searchParams.get('to')     // ISO
    const staffId = searchParams.get('staff_profile_id')
    // Filtro opcional por estado (CSV), validado contra VALID_STATUSES.
    const statusParam = searchParams.get('status')
    const statuses = statusParam
      ? statusParam.split(',').map((s) => s.trim().toUpperCase()).filter((s) => VALID_STATUSES.includes(s as any))
      : null
    const limitParam = parseInt(searchParams.get('limit') || '', 10)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : null

    const admin = await createAdminClient()
    let query = (admin as any)
      .from('appointments')
      .select(APPT_COLUMNS)
      .eq('organization_id', auth.orgId)
      .order('start_at', { ascending: true })

    if (from) query = query.gte('start_at', from)
    if (to) query = query.lt('start_at', to)
    if (staffId) query = query.eq('staff_profile_id', staffId)
    if (statuses && statuses.length > 0) query = query.in('status', statuses)
    if (limit) query = query.limit(limit)

    const { data: appts, error } = await query
    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json({ error: 'No se pudieron obtener los turnos', details: error.message }, { status: 500 })
    }

    const rows = (appts || []) as Array<Record<string, any>>

    // Enriquecer con nombre de servicio, profesional y cliente
    const serviceIds = Array.from(new Set(rows.map((r) => r.service_id).filter(Boolean)))
    const staffIds = Array.from(new Set(rows.map((r) => r.staff_profile_id).filter(Boolean)))
    const customerIds = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean)))

    const serviceMap = new Map<string, { name: string; color: string | null }>()
    if (serviceIds.length) {
      const { data } = await (admin as any).from('services').select('id, name, color').in('id', serviceIds)
      for (const s of (data || []) as any[]) serviceMap.set(s.id, { name: s.name, color: s.color })
    }

    const staffMap = new Map<string, { name: string; color: string | null }>()
    if (staffIds.length) {
      const { data: staff } = await (admin as any).from('staff_profiles').select('id, user_id, display_name, color').in('id', staffIds)
      const staffRows = (staff || []) as any[]
      const userIds = staffRows.map((s) => s.user_id).filter(Boolean)
      const userMap = new Map<string, string>()
      if (userIds.length) {
        const { data: users } = await (admin as any).from('users').select('id, full_name').in('id', userIds)
        for (const u of (users || []) as any[]) userMap.set(u.id, u.full_name)
      }
      for (const s of staffRows) {
        staffMap.set(s.id, { name: s.display_name || userMap.get(s.user_id) || 'Profesional', color: s.color })
      }
    }

    const customerMap = new Map<string, { name: string; phone: string | null }>()
    if (customerIds.length) {
      const { data } = await (admin as any).from('customers').select('id, name, phone').in('id', customerIds)
      for (const c of (data || []) as any[]) customerMap.set(c.id, { name: c.name, phone: c.phone ?? null })
    }

    const enriched = rows.map((r) => {
      const cust = r.customer_id ? customerMap.get(r.customer_id) : null
      return {
        ...r,
        service: serviceMap.get(r.service_id) || null,
        staff: staffMap.get(r.staff_profile_id) || null,
        customer_label: cust ? cust.name : (r.customer_name || null),
        // Teléfono para contacto/WhatsApp: el del turno (reserva/walk-in) o el del cliente registrado.
        customer_phone: r.customer_phone || cust?.phone || null,
      }
    })

    return NextResponse.json({ success: true, appointments: enriched })
  } catch (error) {
    console.error('Unexpected error in appointments GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAppointments(request)
    if (!auth.ok) return auth.response

    const raw = await request.json()
    const staffProfileId = String(raw?.staff_profile_id || '').trim()
    const serviceId = String(raw?.service_id || '').trim()
    const startAt = String(raw?.start_at || '').trim()
    const endAt = String(raw?.end_at || '').trim()

    if (!staffProfileId || !serviceId) return NextResponse.json({ error: 'Profesional y servicio son requeridos' }, { status: 400 })
    const start = new Date(startAt)
    const end = new Date(endAt)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
    }
    if (end <= start) return NextResponse.json({ error: 'El fin debe ser posterior al inicio' }, { status: 400 })

    const status = VALID_STATUSES.includes(raw?.status) ? raw.status : 'BOOKED'

    const admin = await createAdminClient()
    const entitlements = await getPlanEntitlements(auth.orgId)
    if (!hasPlanFeature(entitlements, 'appointments')) {
      return NextResponse.json({ error: 'La agenda de turnos no esta incluida en tu plan' }, { status: 403 })
    }

    const monthStart = new Date(start)
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const { count: appointmentCount, error: countError } = await (admin as any)
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.orgId)
      .gte('start_at', monthStart.toISOString())
      .lt('start_at', monthEnd.toISOString())

    if (countError) {
      console.error('Error checking appointment plan limit:', countError)
      return NextResponse.json({ error: 'No se pudo validar el limite de turnos' }, { status: 500 })
    }

    if (isPlanLimitReached(Number(appointmentCount || 0), entitlements.limits.maxAppointmentsPerMonth)) {
      return NextResponse.json({
        error: `Tu plan permite hasta ${entitlements.limits.maxAppointmentsPerMonth} turnos por mes. Actualiza el plan para agendar mas.`,
      }, { status: 403 })
    }

    // Validar que profesional y servicio pertenecen a la org y están activos
    const [{ data: staff }, { data: service }] = await Promise.all([
      (admin as any).from('staff_profiles').select('id, is_active').eq('id', staffProfileId).eq('organization_id', auth.orgId).maybeSingle(),
      (admin as any).from('services').select('id, price, is_active').eq('id', serviceId).eq('organization_id', auth.orgId).maybeSingle(),
    ])
    if (!staff) return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 400 })
    if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 400 })
    if (!staff.is_active) return NextResponse.json({ error: 'El profesional seleccionado está inactivo' }, { status: 400 })
    if (!service.is_active) return NextResponse.json({ error: 'El servicio seleccionado está inactivo' }, { status: 400 })

    // Chequeo de solapamiento
    if (await hasOverlap(admin, auth.orgId, staffProfileId, start.toISOString(), end.toISOString())) {
      return NextResponse.json({ error: 'El profesional ya tiene un turno en ese horario' }, { status: 409 })
    }

    const customerId = typeof raw?.customer_id === 'string' && raw.customer_id.trim() ? raw.customer_id.trim() : null
    const customerName = typeof raw?.customer_name === 'string' && raw.customer_name.trim() ? raw.customer_name.trim() : null
    const customerPhone = typeof raw?.customer_phone === 'string' && raw.customer_phone.trim() ? raw.customer_phone.trim() : null
    const customerEmail = typeof raw?.customer_email === 'string' && raw.customer_email.trim() ? raw.customer_email.trim() : null
    const price = Number.isFinite(Number(raw?.price)) ? Number(raw.price) : Number(service.price) || 0
    const notes = typeof raw?.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null
    const resolvedCustomerId = await ensureAppointmentCustomer(admin, {
      orgId: auth.orgId,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
    })

    const { data, error } = await (admin as any)
      .from('appointments')
      .insert([{
        organization_id: auth.orgId,
        staff_profile_id: staffProfileId,
        service_id: serviceId,
        customer_id: resolvedCustomerId,
        customer_name: customerName,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status,
        price,
        notes,
      }])
      .select(APPT_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: 'No se pudo crear el turno', details: error.message }, { status: 500 })

    return NextResponse.json({ success: true, appointment: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in appointments POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
