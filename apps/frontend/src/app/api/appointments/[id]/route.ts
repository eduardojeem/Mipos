import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { APPT_COLUMNS, VALID_STATUSES, hasOverlap } from '@/lib/barbershop/appointment-helpers'
import { authorizeAppointments } from '@/lib/barbershop/authorize-appointments'

/**
 * PUT /api/appointments/[id]
 * Edita un turno. Acepta cambios parciales de estado y/o reprogramación.
 * Body: { status?, start_at?, end_at?, staff_profile_id?, notes?, customer_id?, customer_name?, price? }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeAppointments(request)
    if (!auth.ok) return auth.response
    const { id } = await params

    const admin = await createAdminClient()
    const { data: current } = await (admin as any)
      .from('appointments')
      .select('id, staff_profile_id, start_at, end_at')
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .maybeSingle()

    if (!current) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })

    const raw = await request.json()
    const patch: Record<string, any> = {}

    if (raw?.status !== undefined) {
      if (!VALID_STATUSES.includes(raw.status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
      patch.status = raw.status
    }
    if (raw?.notes !== undefined) patch.notes = typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null
    if (raw?.customer_id !== undefined) patch.customer_id = typeof raw.customer_id === 'string' && raw.customer_id.trim() ? raw.customer_id.trim() : null
    if (raw?.customer_name !== undefined) patch.customer_name = typeof raw.customer_name === 'string' && raw.customer_name.trim() ? raw.customer_name.trim() : null
    if (raw?.price !== undefined && Number.isFinite(Number(raw.price))) patch.price = Number(raw.price)

    // Reprogramación (cambio de horario y/o profesional)
    const nextStaff = raw?.staff_profile_id ? String(raw.staff_profile_id) : current.staff_profile_id
    const nextStart = raw?.start_at ? new Date(raw.start_at) : new Date(current.start_at)
    const nextEnd = raw?.end_at ? new Date(raw.end_at) : new Date(current.end_at)
    const reschedules = raw?.start_at !== undefined || raw?.end_at !== undefined || raw?.staff_profile_id !== undefined

    if (reschedules) {
      if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
        return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
      }
      if (nextEnd <= nextStart) return NextResponse.json({ error: 'El fin debe ser posterior al inicio' }, { status: 400 })
      if (await hasOverlap(admin, auth.orgId, nextStaff, nextStart.toISOString(), nextEnd.toISOString(), id)) {
        return NextResponse.json({ error: 'El profesional ya tiene un turno en ese horario' }, { status: 409 })
      }
      patch.staff_profile_id = nextStaff
      patch.start_at = nextStart.toISOString()
      patch.end_at = nextEnd.toISOString()
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { data, error } = await (admin as any)
      .from('appointments')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select(APPT_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: 'No se pudo actualizar el turno', details: error.message }, { status: 500 })

    return NextResponse.json({ success: true, appointment: data })
  } catch (error) {
    console.error('Unexpected error in appointment PUT:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Eliminar un turno es destructivo: solo OWNER/ADMIN.
    const auth = await authorizeAppointments(request, { adminOnly: true })
    if (!auth.ok) return auth.response
    const { id } = await params

    const admin = await createAdminClient()
    const { data, error } = await (admin as any)
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select('id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'No se pudo eliminar el turno', details: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in appointment DELETE:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
