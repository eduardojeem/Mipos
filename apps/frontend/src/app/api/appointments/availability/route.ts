import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { loadAvailability } from '@/lib/barbershop/availability'

/**
 * GET /api/appointments/availability?staff_profile_id&service_id&date=YYYY-MM-DD&tz=<offsetMin>
 * Devuelve los horarios disponibles del profesional para ese día y servicio.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

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
    console.error('Unexpected error in availability GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
