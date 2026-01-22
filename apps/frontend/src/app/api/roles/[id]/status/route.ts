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
    const { isActive } = body

    if (isActive === undefined) {
      return NextResponse.json({ message: 'isActive es requerido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Check if system role (prevent deactivation if needed, though usually allowed)
    // Optional: Prevent deactivating ADMIN
    const { data: roleCheck } = await supabase.from('roles').select('name').eq('id', id).single()
    if (roleCheck && (roleCheck.name === 'ADMIN' || roleCheck.name === 'admin')) {
        return NextResponse.json({ message: 'No se puede desactivar el rol de Administrador' }, { status: 400 })
    }

    const { data: roleData, error } = await supabase
      .from('roles')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    // Fetch permissions (needed for consistent return format)
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
    console.error('Error toggling role status:', e)
    return NextResponse.json({ message: e.message || 'Error al cambiar estado' }, { status: 500 })
  }
}
