import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

/**
 * GET /api/staff/me
 * Ficha de profesional (staff_profile) del usuario logueado en la org actual.
 * Sirve para que un barbero vea "su" agenda. Devuelve { staff: null } si el
 * usuario no es un profesional agendable (ej. recepción/dueño sin ficha).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const admin = await createAdminClient()
    const { data, error } = await (admin as any)
      .from('staff_profiles')
      .select('id, display_name, specialty, color, is_active')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching own staff profile:', error)
      return NextResponse.json({ error: 'No se pudo obtener la ficha' }, { status: 500 })
    }

    return NextResponse.json({ success: true, staff: data || null })
  } catch (error) {
    console.error('Unexpected error in staff/me GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
