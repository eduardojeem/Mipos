import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { parentRoleId } = body

    const supabase = await createAdminClient()

    // Validate that we're not creating a circular reference
    if (parentRoleId) {
      const { data: parentRole, error: parentError } = await supabase
        .from('roles')
        .select('id, parent_role_id, priority')
        .eq('id', parentRoleId)
        .single()

      if (parentError || !parentRole) {
        return NextResponse.json({ message: 'Rol padre no encontrado' }, { status: 404 })
      }

      // Check for circular reference
      let currentParentId = parentRole.parent_role_id
      const visited = new Set([parentRoleId])
      
      while (currentParentId) {
        if (currentParentId === id) {
          return NextResponse.json({ 
            message: 'No se puede crear una referencia circular en la jerarquía' 
          }, { status: 400 })
        }
        
        if (visited.has(currentParentId)) {
          break // Avoid infinite loop
        }
        
        visited.add(currentParentId)
        
        const { data: nextParent } = await supabase
          .from('roles')
          .select('parent_role_id')
          .eq('id', currentParentId)
          .single()
        
        currentParentId = nextParent?.parent_role_id
      }

      // Validate priority (child should have lower priority than parent)
      const { data: childRole } = await supabase
        .from('roles')
        .select('priority')
        .eq('id', id)
        .single()

      if (childRole && parentRole.priority <= (childRole.priority || 0)) {
        return NextResponse.json({ 
          message: 'El rol padre debe tener mayor prioridad que el rol hijo' 
        }, { status: 400 })
      }
    }

    // Update the parent role
    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update({ parent_role_id: parentRoleId })
      .eq('id', id)
      .select(`
        *,
        user_roles (count)
      `)
      .single()

    if (updateError) throw updateError

    // Fetch permissions for response
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', id)

    let mappedPermissions: any[] = []
    if (rolePerms && rolePerms.length > 0) {
      const pIds = rolePerms.map((rp: any) => rp.permission_id)
      const { data: perms } = await supabase
        .from('permissions')
        .select('*')
        .in('id', pIds)
      
      mappedPermissions = perms?.map((p: any) => ({
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        resource: p.resource,
        action: p.action,
        category: p.resource,
        isSystem: false,
        createdAt: p.created_at
      })) || []
    }

    const role = {
      id: updatedRole.id,
      name: updatedRole.name,
      displayName: updatedRole.display_name,
      description: updatedRole.description,
      permissions: mappedPermissions,
      userCount: updatedRole.user_roles?.[0]?.count || 0,
      isActive: updatedRole.is_active,
      isSystem: updatedRole.name === 'ADMIN' || updatedRole.name === 'admin',
      priority: updatedRole.priority || 0,
      parentRoleId: updatedRole.parent_role_id,
      createdAt: updatedRole.created_at,
      updatedAt: updatedRole.updated_at
    }

    return NextResponse.json(role)
  } catch (error: any) {
    console.error('Error setting parent role:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}