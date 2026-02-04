import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    let admin: any
    try {
      admin = createAdminClient()
    } catch {
      return NextResponse.json({ error: 'Supabase admin client no configurado' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const countRaw = Number(body?.count ?? 5)
    const count = Number.isNaN(countRaw) ? 5 : Math.max(1, Math.min(50, countRaw))
    let orgId = typeof body?.organization_id === 'string' ? body.organization_id : ''

    if (!orgId) {
      const { data: existingOrg } = await admin.from('organizations').select('id').limit(1).maybeSingle()
      if (existingOrg?.id) {
        orgId = existingOrg.id
      } else {
        const name = 'Empresa Prueba'
        const slug = `${slugify(name)}-${Date.now()}`
        const { data: created } = await admin
          .from('organizations')
          .insert({ name, slug, subscription_status: 'ACTIVE', settings: { currency: 'PYG', timezone: 'America/Asuncion', limits: { maxUsers: 20 } } })
          .select()
          .single()
        orgId = created?.id || ''
      }
    }

    const { data: adminRole } = await admin.from('roles').select('id').eq('name', 'ADMIN').maybeSingle()
    const { data: cashierRole } = await admin.from('roles').select('id').eq('name', 'CASHIER').maybeSingle()
    const adminRoleId = adminRole?.id
    const cashierRoleId = cashierRole?.id

    const createdUsers: any[] = []
    for (let i = 0; i < count; i++) {
      const ts = Date.now()
      const email = `prueba+${ts}_${i}@example.com`
      const role = i === 0 ? 'ADMIN' : 'CASHIER'
      const full_name = i === 0 ? 'Admin Prueba' : `Usuario Prueba ${i}`

      const { data: createdAuth, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name, role }
      })
      if (createErr) continue

      const authUser = (createdAuth as any)?.user
      if (!authUser?.id) continue

      await admin
        .from('users')
        .upsert({ id: authUser.id, email, full_name, role }, { onConflict: 'id' })

      if (orgId) {
        const roleId = role === 'ADMIN' ? adminRoleId : cashierRoleId
        if (roleId) {
          await admin
            .from('organization_members')
            .insert({ organization_id: orgId, user_id: authUser.id, role_id: roleId, is_owner: role === 'ADMIN' })
        }
      }

      createdUsers.push({ id: authUser.id, email, full_name, role })
    }

    return NextResponse.json({ ok: true, created: createdUsers.length, users: createdUsers, organization_id: orgId })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
