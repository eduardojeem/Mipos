import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { SERVICE_COLUMNS, parseServiceBody } from '@/lib/barbershop/service-validation'

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorize(request)
    if (!auth.ok) return auth.response
    const { id } = await params

    const admin = await createAdminClient()
    const { data, error } = await (admin as any)
      .from('services')
      .select(SERVICE_COLUMNS)
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Error al obtener el servicio', details: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

    return NextResponse.json({ success: true, service: data })
  } catch (error) {
    console.error('Unexpected error in service GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorize(request)
    if (!auth.ok) return auth.response
    const { id } = await params

    const parsed = parseServiceBody(await request.json())
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const admin = await createAdminClient()

    // El servicio debe pertenecer a la org
    const { data: current } = await (admin as any)
      .from('services')
      .select('id')
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .maybeSingle()

    if (!current) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

    // Nombre único por organización, excluyendo el propio registro
    const { data: dup } = await (admin as any)
      .from('services')
      .select('id')
      .eq('organization_id', auth.orgId)
      .ilike('name', parsed.value.name)
      .neq('id', id)
      .maybeSingle()

    if (dup) return NextResponse.json({ error: 'Ya existe otro servicio con ese nombre' }, { status: 409 })

    const { data, error } = await (admin as any)
      .from('services')
      .update(parsed.value)
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select(SERVICE_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: 'No se pudo actualizar el servicio', details: error.message }, { status: 500 })

    return NextResponse.json({ success: true, service: data })
  } catch (error) {
    console.error('Unexpected error in service PUT:', error)
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
      .from('services')
      .delete()
      .eq('id', id)
      .eq('organization_id', auth.orgId)
      .select('id')
      .maybeSingle()

    if (error) {
      // FK RESTRICT: el servicio está referenciado por turnos (appointments.service_id).
      // No se puede borrar sin perder el historial; sugerimos desactivarlo.
      if (error.code === '23503' || /foreign key|violates|referenced/i.test(String(error.message || ''))) {
        return NextResponse.json(
          {
            error: 'Este servicio tiene turnos asociados, por eso no se puede eliminar. Desactivalo para dejar de ofrecerlo sin perder el historial.',
            code: 'HAS_APPOINTMENTS',
          },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: 'No se pudo eliminar el servicio', details: error.message }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in service DELETE:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
