import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const admin = await createAdminClient()

    // COUNT queries — escalan a cualquier número de usuarios sin traer filas
    const [
      totalRes,
      withOrgsRes,
      activeRes,
      byRoleRes,
    ] = await Promise.all([
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('users').select('*', { count: 'exact', head: true }).not('organization_id', 'is', null),
      // is_active requiere la migración 20260519_add_is_active_to_users.sql
      admin.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      // Distribución de roles — limitado a 10000 filas para agregación
      admin.from('users').select('role').limit(10000),
    ])

    if (totalRes.error) {
      return NextResponse.json({ error: 'Error obteniendo estadísticas', details: totalRes.error.message }, { status: 500 })
    }

    const total = totalRes.count ?? 0
    const withOrgs = withOrgsRes.count ?? 0
    const withoutOrgs = total - withOrgs
    // Si la query de is_active falló (e.g. migración no aplicada), asumir todos activos
    const activeUsers = activeRes.error ? total : (activeRes.count ?? total)
    const inactiveUsers = total - activeUsers

    const byRole: Record<string, number> = {}
    if (Array.isArray(byRoleRes.data)) {
      for (const row of byRoleRes.data as { role: string | null }[]) {
        const r = row.role ?? 'UNKNOWN'
        byRole[r] = (byRole[r] || 0) + 1
      }
    }

    return NextResponse.json({ success: true, stats: { total, withOrgs, withoutOrgs, byRole, activeUsers, inactiveUsers } })
  } catch (e: any) {
    console.error('[superadmin/user-stats][GET] internal error:', e?.message || e, e?.stack)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV !== 'production' ? (e?.message || String(e)) : undefined,
      },
      { status: 500 },
    )
  }
}
