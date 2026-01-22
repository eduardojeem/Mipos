import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { permissions } = body

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ message: 'Lista de permisos requerida' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Get role's current permissions (including inherited ones)
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, name, parent_role_id')
      .eq('id', id)
      .single()

    if (roleError || !roleData) {
      return NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 })
    }

    // Get all permissions for this role and its parents
    const getAllRolePermissions = async (roleId: string, visited = new Set()): Promise<string[]> => {
      if (visited.has(roleId)) return [] // Avoid circular references
      visited.add(roleId)

      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId)

      let permissionIds: string[] = rolePerms?.map((rp: any) => String(rp.permission_id)) || []

      // Get parent role permissions
      const { data: role } = await supabase
        .from('roles')
        .select('parent_role_id')
        .eq('id', roleId)
        .single()

      if (role?.parent_role_id) {
        const parentPermissions: string[] = await getAllRolePermissions(role.parent_role_id, visited)
        permissionIds = [...permissionIds, ...parentPermissions]
      }

      return [...new Set(permissionIds)] as string[] // Remove duplicates
    }

    const rolePermissionIds = await getAllRolePermissions(id)

    // Validate each requested permission
    const validationResults: Record<string, boolean> = {}

    for (const permission of permissions) {
      // Check if permission exists in the system
      const { data: permissionExists } = await supabase
        .from('permissions')
        .select('id')
        .eq('name', permission)
        .single()

      if (!permissionExists) {
        validationResults[permission] = false
        continue
      }

      // Check if role has this permission (directly or inherited)
      const hasPermission = rolePermissionIds.includes(permissionExists.id)
      validationResults[permission] = hasPermission
    }

    return NextResponse.json(validationResults)
  } catch (error: any) {
    console.error('Error validating role permissions:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
