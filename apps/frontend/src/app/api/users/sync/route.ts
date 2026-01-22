import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

async function sync() {
  let admin: any
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
      const roleMeta = String(u.user_metadata?.role || '').toUpperCase()
      const role = roleMeta === 'ADMIN' ? 'ADMIN' : 'CASHIER'
      await admin.from('users').upsert({ id: u.id, email, full_name, role }, { onConflict: 'id' })
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
