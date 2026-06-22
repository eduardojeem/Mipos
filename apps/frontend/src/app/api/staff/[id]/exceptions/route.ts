import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgId = await getValidatedOrganizationId(request)
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const staffProfileId = (await params).id
    const supabase = await createClient()

    const { data: exceptions, error } = await supabase
      .from('staff_schedule_exceptions')
      .select('id, date, reason')
      .eq('staff_profile_id', staffProfileId)
      .eq('organization_id', orgId)
      .order('date', { ascending: true })

    if (error) throw error

    return NextResponse.json({ exceptions: exceptions || [] })
  } catch (error: any) {
    console.error('Error fetching exceptions:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgId = await getValidatedOrganizationId(request)
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const staffProfileId = (await params).id
    const body = await request.json()
    const { date, reason } = body

    if (!date || !reason) {
      return NextResponse.json({ error: 'Faltan campos requeridos (date, reason)' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: exception, error } = await supabase
      .from('staff_schedule_exceptions')
      .insert({
        organization_id: orgId,
        staff_profile_id: staffProfileId,
        date,
        reason
      })
      .select('id, date, reason')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe una excepción para esta fecha' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ exception })
  } catch (error: any) {
    console.error('Error creating exception:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgId = await getValidatedOrganizationId(request)
    if (!orgId) return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })

    const staffProfileId = (await params).id
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Falta el id de la excepción' }, { status: 400 })

    const supabase = await createClient()

    const { error } = await supabase
      .from('staff_schedule_exceptions')
      .delete()
      .eq('id', id)
      .eq('staff_profile_id', staffProfileId)
      .eq('organization_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting exception:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
