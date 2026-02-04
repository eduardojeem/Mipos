import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const body = await request.json() as { ids?: string[]; updates?: Record<string, unknown>; operation?: 'update' | 'delete' }
    const { ids, updates, operation } = body
    if (!operation) {
      return NextResponse.json({ error: 'Operación requerida' }, { status: 400 })
    }

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }

    if (operation === 'update') {
      if (!ids || !Array.isArray(ids) || !updates) {
        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
      }
      const { error } = await adminClient.from('users').update(updates).in('id', ids)
      if (error) {
        return NextResponse.json({ error: 'Error en actualización masiva', details: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (operation === 'delete') {
      if (!ids || !Array.isArray(ids)) {
        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
      }
      const { error } = await adminClient.from('users').delete().in('id', ids)
      if (error) {
        return NextResponse.json({ error: 'Error en eliminación masiva', details: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Operación no soportada' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
