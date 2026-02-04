import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const body = await request.json() as Record<string, unknown>
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }
    const { error } = await adminClient.from('users').update(body).eq('id', params.id)
    if (error) {
      return NextResponse.json({ error: 'Error al actualizar usuario', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }
    const { error } = await adminClient.from('users').delete().eq('id', params.id)
    if (error) {
      return NextResponse.json({ error: 'Error al eliminar usuario', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
