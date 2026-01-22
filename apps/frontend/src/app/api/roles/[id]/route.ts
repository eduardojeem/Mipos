import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }
  const { id } = await params
  const supabase = await createAdminClient()
  
  const { data: roleData, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !roleData) {
     return NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 })
  }

  // Fetch permissions manually
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

  const { count: userCount } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', id)

  const role = {
    id: roleData.id,
    name: roleData.name,
    displayName: roleData.display_name,
    description: roleData.description,
    permissions: mappedPermissions,
    userCount: userCount || 0,
    isActive: roleData.is_active,
    isSystem: roleData.name === 'ADMIN' || roleData.name === 'admin',
    priority: 0,
    createdAt: roleData.created_at,
    updatedAt: roleData.updated_at
  }

  return NextResponse.json(role)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { id } = await params
  try {
    const body = await request.json()
    const { name, displayName, description, permissions, isActive } = body || {}
    const supabase = await createAdminClient()

    // Update role fields
    const updateData: any = {}
    if (name) updateData.name = name
    if (displayName) updateData.display_name = displayName
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.is_active = isActive

    if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
            .from('roles')
            .update(updateData)
            .eq('id', id)
        if (updateError) throw updateError
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
        // Delete existing permissions
        const { error: deleteError } = await supabase
            .from('role_permissions')
            .delete()
            .eq('role_id', id)
        if (deleteError) throw deleteError

        // Insert new permissions
        if (permissions.length > 0) {
            const permissionInserts = permissions.map((pId: string) => ({
                role_id: id,
                permission_id: pId
            }))
            const { error: insertError } = await supabase
                .from('role_permissions')
                .insert(permissionInserts)
            if (insertError) throw insertError
        }
    }

    // Fetch updated role
    const { data: roleData, error: fetchError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single()
    
    if (fetchError) throw fetchError

    // Fetch permissions
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

    const { count: userCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', id)

    const role = {
        id: roleData.id,
        name: roleData.name,
        displayName: roleData.display_name,
        description: roleData.description,
        permissions: mappedPermissions,
        userCount: userCount || 0,
        isActive: roleData.is_active,
        isSystem: roleData.name === 'ADMIN' || roleData.name === 'admin',
        priority: 0,
        createdAt: roleData.created_at,
        updatedAt: roleData.updated_at
    }

    return NextResponse.json(role)
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error al actualizar rol' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }
  const { id } = await params
  try {
    const supabase = await createAdminClient()

    // Check if system role
    const { data: roleCheck } = await supabase.from('roles').select('name').eq('id', id).single()
    if (roleCheck && (roleCheck.name === 'ADMIN' || roleCheck.name === 'admin')) {
         return NextResponse.json({ message: 'No se pueden eliminar roles del sistema' }, { status: 400 })
    }

    // Check users
    const { count, error: countError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', id)
    
    if (countError) throw countError
    if (count && count > 0) {
        return NextResponse.json({ message: 'No se puede eliminar un rol que tiene usuarios asignados' }, { status: 400 })
    }

    // Delete role (permissions cascade usually)
    const { error: deleteError } = await supabase.from('roles').delete().eq('id', id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error al eliminar rol' }, { status: 400 })
  }
}
