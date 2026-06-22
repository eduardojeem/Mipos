import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPublicOrgId } from '@/lib/barbershop/public'
import { loadAvailability } from '@/lib/barbershop/availability'

/**
 * GET /api/appointments/availability/public?staff_profile_id&service_id&date&tz
 * Horarios disponibles para la reserva pública. Mismo cálculo que el endpoint
 * autenticado, pero la org se resuelve por el contexto del tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = getPublicOrgId(request)
    if (!orgId) return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const admin = await createAdminClient()
    const result = await loadAvailability(admin as any, {
      orgId,
      staffProfileId: String(searchParams.get('staff_profile_id') || '').trim(),
      serviceId: String(searchParams.get('service_id') || '').trim(),
      date: String(searchParams.get('date') || '').trim(),
      offsetMin: Number.parseInt(searchParams.get('tz') || '0', 10) || 0,
    })

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ success: true, slots: result.slots, duration_min: result.durationMin, reason: result.reason })
  } catch (error) {
    console.error('Unexpected error in availability/public GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
