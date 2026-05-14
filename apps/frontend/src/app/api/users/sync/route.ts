import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'

async function ensureCallerIsSuperAdmin(): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  // SECURITY: do NOT read role from user_metadata — it is user-modifiable.
  // Read from authoritative users.role only.
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Supabase admin client no configurado' }, { status: 500 }) }
  }

  const { data: userRow } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = String((userRow as { role?: string } | null)?.role || '').toUpperCase()
  if (role !== 'SUPER_ADMIN') {
    return { ok: false, response: NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 }) }
  }

  return { ok: true }
}

async function sync() {
  const authCheck = await ensureCallerIsSuperAdmin()
  if (!authCheck.ok) {
    return authCheck.response
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: 'Supabase admin client no configurado' }, { status: 500 })
  }

  let page = 1
  const perPage = 200
  let total = 0
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      return NextResponse.json({ error: 'Error listando usuarios', detail: error.message }, { status: 500 })
    }
    const users = (data as any)?.users || []
    if (!users.length) break
    for (const u of users) {
      const email = String(u.email || '').trim()
      const full_name = String(u.user_metadata?.full_name || u.user_metadata?.name || (email.split('@')[0] || 'Usuario'))

      // SECURITY: never read role from user_metadata. For NEW rows insert
      // CASHIER as a safe default; for EXISTING rows leave users.role
      // untouched so role administration stays in the authoritative table.
      const { data: existing } = await admin
        .from('users')
        .select('id, role')
        .eq('id', u.id)
        .maybeSingle()

      if (existing) {
        await admin.from('users').update({ email, full_name }).eq('id', u.id)
      } else {
        await admin.from('users').insert({ id: u.id, email, full_name, role: 'CASHIER' })
      }
      total++
    }
    if (users.length < perPage) break
    page++
  }

  return NextResponse.json({ ok: true, synced: total })
}

export async function POST() {
  return sync()
}

export async function GET() {
  return sync()
}
