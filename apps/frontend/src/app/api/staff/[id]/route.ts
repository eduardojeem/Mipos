import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { STAFF_COLUMNS, parseStaffBody, parseWorkingHours } from '@/lib/barbershop/staff-validation'

async function authorize(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
  if (!user || userError) {
    return { ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const orgId = (await getValidatedOrganizationId(request)) || ''
  if (!orgId) {
    return { ok: false as const, response: NextResponse.json({ error: 'Organization header missing' }, { status: 400 }) }
  }
  return { ok: true as const, orgId }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorize(request)
    if (!auth.ok) return auth.response
    const { id } = await params

    const raw = await request.json()
    const parsed = parseStaffBody(raw)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const hours = parseWorkingHours(raw?.working_hours)
    if (!hours.ok) return NextResponse.json({ error: hours.error }, { status: 400 })

    const admin = await createAdminClient()

    const { data: current } = await (admin as any)
      .from('staff_profiles')
      .select('id')
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .maybeSingle()

    if (!current) return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })

    const { data: updated, error } = await (admin as any)
      .from('staff_profiles')
      .update(parsed.value)
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select(STAFF_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: 'No se pudo actualizar el profesional', details: error.message }, { status: 500 })

    // Reemplazar horarios: borrar y reinsertar (simple y consistente)
    if (raw?.working_hours !== undefined) {
      await (admin as any).from('staff_working_hours').delete().eq('staff_profile_id', id)
      if (hours.value.length) {
        const rows = hours.value.map((h) => ({ ...h, staff_profile_id: id, organization_id: auth.orgId }))
        const { error: hoursError } = await (admin as any).from('staff_working_hours').insert(rows)
        if (hoursError) return NextResponse.json({ error: 'No se pudieron guardar los horarios', details: hoursError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, staff: updated })
  } catch (error) {
    console.error('Unexpected error in staff PUT:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorize(request)
    if (!auth.ok) return auth.response
    const { id } = await params

    const admin = await createAdminClient()
    const { data, error } = await (admin as any)
      .from('staff_profiles')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select('id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'No se pudo eliminar el profesional', details: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in staff DELETE:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
