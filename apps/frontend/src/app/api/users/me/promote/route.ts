import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'

async function promote() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const email = (user as any).email || 'user@example.com'
  const fullName = ((user as any).user_metadata?.full_name || (user as any).user_metadata?.name || email.split('@')[0] || 'Usuario').toString()

  const { data: existing } = await (supabase as any)
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existing) {
    await (supabase as any)
      .from('users')
      .upsert({ id: user.id, email, full_name: fullName, role: 'ADMIN' }, { onConflict: 'id' })
  } else {
    await (supabase as any)
      .from('users')
      .update({ role: 'ADMIN' })
      .eq('id', user.id)
  }

  const admin = createAdminClient()
  await admin.auth.admin.updateUserById(user.id, { user_metadata: { role: 'ADMIN' } })

  return NextResponse.json({ ok: true })
}

export async function POST() {
  return promote()
}

export async function GET() {
  return promote()
}
