import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

type Org = { id: string; name: string; slug: string }
type OrgMember = { organization_id: string; user_id: string; role_id: string | null; is_owner: boolean }
type User = { id: string; email: string }
type Role = { id: string; name: string }
type Permission = { id: string; name: string; resource?: string; action?: string }
type RolePermission = { role_id: string; permission_id: string }

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createAdminClient()
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Admin client no configurado' }, { status: 500 })
    }

    const [{ data: orgs, error: orgsErr }, { data: members, error: memErr }, { data: users, error: usersErr }, { data: roles, error: rolesErr }, { data: perms, error: permsErr }, { data: rolePerms, error: rpErr }] = await Promise.all([
      supabase.from('organizations').select('id,name,slug'),
      supabase.from('organization_members').select('organization_id,user_id,role_id,is_owner'),
      supabase.from('users').select('id,email'),
      supabase.from('roles').select('id,name'),
      supabase.from('permissions').select('id,name,resource,action'),
      supabase.from('role_permissions').select('role_id,permission_id')
    ])

    const errors = [orgsErr, memErr, usersErr, rolesErr, permsErr, rpErr].filter(Boolean)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: 'Error al obtener datos', errors: errors.map(e => (e as any)?.message) }, { status: 500 })
    }

    const orgById = new Map<string, Org>((orgs as Org[]).map(o => [o.id, o]))
    const userById = new Map<string, User>((users as User[]).map(u => [u.id, u]))
    const roleById = new Map<string, Role>((roles as Role[]).map(r => [r.id, r]))
    const permById = new Map<string, Permission>((perms as Permission[]).map(p => [p.id, p]))
    const rolePermMap = new Map<string, Permission[]>()
    (rolePerms as RolePermission[]).forEach(rp => {
      const list = rolePermMap.get(rp.role_id) || []
      const perm = permById.get(rp.permission_id)
      if (perm) list.push(perm)
      rolePermMap.set(rp.role_id, list)
    })

    const result = (members as OrgMember[]).map(m => {
      const org = orgById.get(m.organization_id)
      const user = userById.get(m.user_id)
      const role = m.role_id ? roleById.get(m.role_id) : undefined
      const permissions = m.role_id ? (rolePermMap.get(m.role_id) || []) : []
      return {
        organization: org ? { id: org.id, slug: org.slug, name: org.name } : { id: m.organization_id },
        user: user ? { id: user.id, email: user.email } : { id: m.user_id },
        is_owner: !!m.is_owner,
        role: role ? { id: role.id, name: role.name } : null,
        permissions: permissions.map(p => ({ id: p.id, name: p.name, resource: p.resource, action: p.action }))
      }
    })

    return NextResponse.json({ success: true, count: result.length, data: result })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

