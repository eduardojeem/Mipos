import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const supabase = await createAdminClient()

    // Get all roles with their relationships
    const { data: rolesData, error } = await supabase
      .from('roles')
      .select(`
        *,
        user_roles (count),
        parent_role:parent_role_id (
          id,
          name,
          display_name
        ),
        child_roles:roles!parent_role_id (
          id,
          name,
          display_name
        )
      `)
      .eq('is_active', true)

    if (error) throw error

    // Get permissions for all roles
    const { data: allPermissions } = await supabase.from('permissions').select('*')
    const { data: allRolePermissions } = await supabase.from('role_permissions').select('*')

    const permissionsMap = new Map(allPermissions?.map((p: any) => [p.id, p]) || [])

    // Build hierarchy structure
    const buildHierarchy = (roles: any[], parentId: string | null = null, level: number = 0): any[] => {
      return roles
        .filter((role: any) => role.parent_role_id === parentId)
        .map((role: any) => {
          const rolePerms = allRolePermissions?.filter((rp: any) => rp.role_id === role.id) || []
          const mappedPermissions = rolePerms.map((rp: any) => {
            const p: any = permissionsMap.get(rp.permission_id)
            if (!p) return null
            return {
              id: p.id,
              name: p.name,
              displayName: p.display_name,
              resource: p.resource,
              action: p.action,
              description: p.description,
              category: p.resource,
              isSystem: false,
              createdAt: p.created_at
            }
          }).filter(Boolean)

          return {
            role: {
              id: role.id,
              name: role.name,
              displayName: role.display_name,
              description: role.description,
              permissions: mappedPermissions,
              userCount: role.user_roles?.[0]?.count || 0,
              isActive: role.is_active,
              isSystem: role.name === 'ADMIN' || role.name === 'admin',
              priority: role.priority || 0,
              parentRoleId: role.parent_role_id,
              createdAt: role.created_at,
              updatedAt: role.updated_at
            },
            children: buildHierarchy(roles, role.id, level + 1),
            level
          }
        })
    }

    const hierarchy = buildHierarchy(rolesData)

    return NextResponse.json(hierarchy)
  } catch (error: any) {
    console.error('Error fetching role hierarchy:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}