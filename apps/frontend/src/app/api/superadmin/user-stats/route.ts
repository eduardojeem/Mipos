import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const admin = await createAdminClient()

    // Use COUNT queries instead of fetching all rows — scales to any number of users
    const [
      totalRes,
      withOrgsRes,
      activeRes,
      byRoleRes,
    ] = await Promise.all([
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('users').select('*', { count: 'exact', head: true }).not('organization_id', 'is', null),
      admin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      // Fetch role distribution — limited to 1000 rows but sufficient for aggregation
      // since the number of distinct roles is small (< 10)
      admin.from('users').select('role').limit(10000),
    ])

    if (totalRes.error) {
      return NextResponse.json({ error: 'Error obteniendo estadísticas', details: totalRes.error.message }, { status: 500 })
    }

    const total = totalRes.count ?? 0
    const withOrgs = withOrgsRes.count ?? 0
    const withoutOrgs = total - withOrgs
    const activeUsers = activeRes.count ?? 0
    const inactiveUsers = total - activeUsers

    const byRole: Record<string, number> = {}
    if (Array.isArray(byRoleRes.data)) {
      for (const row of byRoleRes.data as { role: string | null }[]) {
        const r = row.role ?? 'UNKNOWN'
        byRole[r] = (byRole[r] || 0) + 1
      }
    }

    return NextResponse.json({ success: true, stats: { total, withOrgs, withoutOrgs, byRole, activeUsers, inactiveUsers } })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
