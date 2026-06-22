import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

/**
 * GET /api/staff/available-users
 * Usuarios de la organización que todavía NO tienen ficha de profesional.
 * Se usa en el picker "Agregar profesional".
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const admin = await createAdminClient()

    const { data: members, error } = await (admin as any)
      .from('users')
      .select('id, full_name, email, role')
      .eq('organization_id', orgId)
      .order('full_name', { ascending: true })

    if (error) {
      console.error('Error fetching org members:', error)
      return NextResponse.json({ error: 'No se pudieron obtener los usuarios', details: error.message }, { status: 500 })
    }

    const { data: staff } = await (admin as any)
      .from('staff_profiles')
      .select('user_id')
      .eq('organization_id', orgId)

    const taken = new Set((staff || []).map((s: any) => s.user_id))
    const available = ((members || []) as Array<any>).filter((m) => !taken.has(m.id))

    return NextResponse.json({ success: true, users: available })
  } catch (error) {
    console.error('Unexpected error in available-users GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
