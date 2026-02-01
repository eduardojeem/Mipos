import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
    const { id } = await params
    const { data: org, error } = await supabase.from('organizations').select('*').eq('id', id).single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, organization: org })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }
    const { id } = await params
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name : undefined
    const subscription_status = typeof body.subscription_status === 'string' ? body.subscription_status : undefined
    const settings = typeof body.settings === 'object' && body.settings != null ? body.settings : undefined
    const payload: any = {}
    if (name !== undefined) payload.name = name
    if (subscription_status !== undefined) payload.subscription_status = subscription_status
    if (settings !== undefined) payload.settings = settings
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
    }
    const { data: updated, error } = await supabase.from('organizations').update(payload).eq('id', id).select().single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, organization: updated })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
