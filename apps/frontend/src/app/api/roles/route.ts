import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const supabase = await createAdminClient()
  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

  let query = supabase.from('roles').select('*')

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data: rolesData, error } = await query

  if (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  // Fetch permissions and role_permissions manually
  const { data: allPermissions, error: permErr } = await supabase.from('permissions').select('*')
  const { data: allRolePermissions, error: rolePermErr } = await supabase.from('role_permissions').select('*')
  const safePermissions = permErr ? [] : (allPermissions || [])
  const safeRolePerms = rolePermErr ? [] : (allRolePermissions || [])

  // Fetch user_roles for counts
  const roleIds = (rolesData || []).map((r: any) => r.id)
  let userRoles: any[] = []
  if (roleIds.length > 0) {
    const { data: userRolesData, error: userRolesErr } = await supabase
      .from('user_roles')
      .select('role_id')
      .in('role_id', roleIds)
    userRoles = userRolesErr ? [] : (userRolesData || [])
  }

  const userCountMap = new Map<string, number>()
  userRoles.forEach((ur: any) => {
    const k = ur.role_id as string
    userCountMap.set(k, (userCountMap.get(k) || 0) + 1)
  })

  const permissionsMap = new Map(safePermissions.map((p: any) => [p.id, p]))
  
  // Map to expected format
  const roles = rolesData.map((r: any) => {
    const rolePerms = safeRolePerms.filter((rp: any) => rp.role_id === r.id)
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
        id: r.id,
        name: r.name,
        displayName: r.display_name,
        description: r.description,
        permissions: mappedPermissions,
        userCount: userCountMap.get(r.id) || 0,
        isActive: r.is_active,
        isSystem: r.name === 'ADMIN' || r.name === 'admin',
        priority: 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at
    }
  })

  return NextResponse.json(roles)
}

export async function POST(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { name, displayName, description, permissions, isActive } = body || {}

    if (!name || !displayName) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: existingByName } = await supabase
      .from('roles')
      .select('id')
      .eq('name', name)

    if (existingByName && existingByName.length > 0) {
      return NextResponse.json({ message: 'Nombre de rol ya existe' }, { status: 409 })
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name,
        display_name: displayName,
        description,
        is_active: isActive !== undefined ? isActive : true
      })
      .select()
      .single()

    if (roleError) throw roleError

    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        const permissionInserts = permissions.map((pId: string) => ({
            role_id: role.id,
            permission_id: pId
        }))

        const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permissionInserts)
        
        if (permError) throw permError
    }

    const { data: fullRole, error: fetchError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role.id)
        .single()
        
    if (fetchError) throw fetchError

    let mappedPermissions: any[] = []
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
         const { data: perms } = await supabase
            .from('permissions')
            .select('*')
            .in('id', permissions)
        
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

    const mappedRole = {
        id: fullRole.id,
        name: fullRole.name,
        displayName: fullRole.display_name,
        description: fullRole.description,
        permissions: mappedPermissions,
        userCount: 0,
        isActive: fullRole.is_active,
        isSystem: fullRole.name === 'ADMIN',
        priority: 0,
        createdAt: fullRole.created_at,
        updatedAt: fullRole.updated_at
    }

    return NextResponse.json(mappedRole)

  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error al crear rol' }, { status: 400 })
  }
}
