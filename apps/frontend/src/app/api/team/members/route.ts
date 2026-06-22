import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'

/**
 * GET /api/team/members
 * Lista los miembros de la organización (email, nombre, rol, estado, dueño).
 */
export async function GET(request: NextRequest) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!

  const admin = await createAdminClient()
  const { data: members, error } = await (admin as any)
    .from('organization_members')
    .select('user_id, role_id, is_owner, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ message: 'No se pudieron obtener los miembros' }, { status: 500 })

  const rows = (members || []) as Array<Record<string, any>>
  const userIds = rows.map((r) => r.user_id).filter(Boolean)
  const roleIds = Array.from(new Set(rows.map((r) => r.role_id).filter((x) => x != null)))

  const userMap = new Map<string, { full_name: string; email: string }>()
  if (userIds.length) {
    const { data: users } = await (admin as any).from('users').select('id, full_name, email').in('id', userIds)
    for (const u of (users || []) as any[]) userMap.set(u.id, { full_name: u.full_name, email: u.email })
  }

  const roleMap = new Map<string, string>()
  if (roleIds.length) {
    const { data: roles } = await (admin as any).from('roles').select('id, display_name, name').in('id', roleIds)
    for (const r of (roles || []) as any[]) roleMap.set(r.id, r.display_name || r.name)
  }

  const members_out = rows.map((r) => ({
    user_id: r.user_id,
    full_name: userMap.get(r.user_id)?.full_name || null,
    email: userMap.get(r.user_id)?.email || null,
    role_id: r.role_id,
    role_name: r.role_id ? roleMap.get(r.role_id) || null : null,
    is_owner: !!r.is_owner,
    status: r.status,
  }))

  return NextResponse.json({ members: members_out })
}
