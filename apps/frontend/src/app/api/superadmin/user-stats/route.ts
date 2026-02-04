import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('users')
      .select('organization_id, role, is_active')
      .range(0, 9999)
    if (error) {
      return NextResponse.json({ error: 'Error obteniendo usuarios', details: error.message }, { status: 500 })
    }
    type UserRow = { organization_id: string | null; role: string | null; is_active: boolean | null }
    const users: UserRow[] = Array.isArray(data) ? (data as UserRow[]) : []

    const total = users.length
    const withOrgs = users.filter((u: UserRow) => u.organization_id !== null).length
    const withoutOrgs = total - withOrgs
    const activeUsers = users.filter((u: UserRow) => Boolean(u.is_active)).length
    const inactiveUsers = total - activeUsers
    const byRole: Record<string, number> = {}
    users.forEach((u: UserRow) => {
      const r = (u.role ?? 'UNKNOWN') as string
      byRole[r] = (byRole[r] || 0) + 1
    })

    return NextResponse.json({ success: true, stats: { total, withOrgs, withoutOrgs, byRole, activeUsers, inactiveUsers } })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
