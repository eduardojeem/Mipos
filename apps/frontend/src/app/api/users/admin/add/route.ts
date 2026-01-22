import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const email = (url.searchParams.get('email') || '').trim()
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

    const admin = createAdminClient()

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = (list as any)?.users?.find((u: any) => String(u.email).toLowerCase() === email.toLowerCase())

    let userId: string
    if (existing?.id) {
      userId = existing.id
    } else {
      const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email)
      if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })
      userId = (invite as any)?.user?.id || ''
      if (!userId) return NextResponse.json({ error: 'No se pudo invitar al usuario' }, { status: 500 })
    }

    await admin.auth.admin.updateUserById(userId, { user_metadata: { role: 'ADMIN' } })

    const fullName = existing?.user_metadata?.full_name || existing?.user_metadata?.name || email.split('@')[0]
    await admin
      .from('users')
      .upsert({ id: userId, email, full_name: fullName, role: 'ADMIN' }, { onConflict: 'id' })

    return NextResponse.json({ ok: true, id: userId, email, role: 'ADMIN' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
