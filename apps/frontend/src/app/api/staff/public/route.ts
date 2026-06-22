import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getPublicOrgId } from '@/lib/barbershop/public'

/**
 * GET /api/staff/public
 * Profesionales ACTIVOS de la barbería (para la página pública de reservas).
 * Devuelve solo lo necesario para mostrar y elegir: id, nombre, especialidad, color.
 */
export async function GET(request: NextRequest) {
  try {
    const orgId = getPublicOrgId(request)
    if (!orgId) return NextResponse.json({ success: true, staff: [] })

    const admin = await createAdminClient()
    const { data: staff, error } = await (admin as any)
      .from('staff_profiles')
      .select('id, user_id, display_name, specialty, color, walkin_only')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching public staff:', error)
      return NextResponse.json({ error: 'No se pudieron obtener los profesionales' }, { status: 500 })
    }

    const rows = (staff || []) as Array<Record<string, any>>
    const userIds = rows.map((r) => r.user_id).filter(Boolean)
    const nameMap = new Map<string, string>()
    if (userIds.length) {
      const { data: users } = await (admin as any).from('users').select('id, full_name').in('id', userIds)
      for (const u of (users || []) as any[]) nameMap.set(u.id, u.full_name)
    }

    // No exponemos user_id ni email al público
    const publicStaff = rows.map((r) => ({
      id: r.id,
      name: r.display_name || nameMap.get(r.user_id) || 'Profesional',
      specialty: r.specialty,
      color: r.color,
      walkin_only: r.walkin_only === true,
    }))

    return NextResponse.json({ success: true, staff: publicStaff })
  } catch (error) {
    console.error('Unexpected error in staff/public GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
