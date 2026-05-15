import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

// SECURITY: this endpoint previously had ZERO auth checks. Any caller could
// hit GET /api/users/admin/add?email=foo@bar and the server would invite the
// user (or look them up) and unconditionally promote them to ADMIN both in
// users.role and user_metadata. Combined with the prior /users/me/promote
// hole and trust of user_metadata.role across the app, this was a complete
// privilege escalation. Now SUPER_ADMIN-only.
//
// Note: this endpoint also previously wrote user_metadata.role which we no
// longer trust anywhere. It now only writes the canonical users.role.

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const url = new URL(request.url)
    const email = (url.searchParams.get('email') || '').trim()
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

    const admin = createAdminClient()

    // listUsers no filtra por email; escaneamos una página de 200 y caemos
    // al invite si no aparece. Capa práctica — caller debería usar la API
    // dedicada de búsqueda si tenés más de 200 usuarios.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = (list as { users?: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> })?.users?.find(
      (u) => String(u.email || '').toLowerCase() === email.toLowerCase()
    )

    let userId: string
    let fullName = email.split('@')[0]
    if (existing?.id) {
      userId = existing.id
      const meta = (existing.user_metadata || {}) as Record<string, unknown>
      const metaName = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : ''
      if (metaName) fullName = metaName
    } else {
      const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email)
      if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 })
      userId = (invite as { user?: { id?: string } })?.user?.id || ''
      if (!userId) return NextResponse.json({ error: 'No se pudo invitar al usuario' }, { status: 500 })
    }

    // Only update the authoritative users.role. Never write user_metadata.role
    // (the rest of the codebase no longer trusts it, on purpose).
    const { error: upsertErr } = await admin
      .from('users')
      .upsert({ id: userId, email, full_name: fullName, role: 'ADMIN' }, { onConflict: 'id' })

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: userId, email, role: 'ADMIN' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
