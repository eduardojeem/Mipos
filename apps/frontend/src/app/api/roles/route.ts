import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { assertGrantablePermissions } from '@/app/api/admin/_utils/grantable-permissions'

const SYSTEM_ROLE_NAMES = ['ADMIN', 'SUPER_ADMIN', 'OWNER', 'SELLER', 'WAREHOUSE']

type RoleScope = 'SYSTEM' | 'ORGANIZATION'

function normalizeRoleCode(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
}

function parseScopeFilter(rawValue: string | null): RoleScope | 'ALL' {
  const normalized = String(rawValue || 'ALL').trim().toUpperCase()
  if (normalized === 'SYSTEM') return 'SYSTEM'
  if (normalized === 'ORGANIZATION') return 'ORGANIZATION'
  return 'ALL'
}

function mapPermission(permission: any) {
  if (!permission) return null

  return {
    id: permission.id,
    name: permission.name,
    displayName: permission.display_name,
    resource: permission.resource,
    action: permission.action,
    description: permission.description,
    category: permission.resource,
    isSystem: false,
    createdAt: permission.created_at,
  }
}

export async function GET(request: NextRequest) {
  const access = await requireAdminApiAccess(request, {
    ...ADMIN_API_ACCESS.manageRoles,
    requireOrganization: true,
  })
  if (!access.ok) {
    return access.response
  }

  const organizationId = access.context.companyId
  if (!organizationId) {
    return NextResponse.json({ message: 'Selecciona una organizacion' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
  const scopeFilter = parseScopeFilter(request.nextUrl.searchParams.get('scope'))

  let rolesQuery = supabase
    .from('roles')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)

  if (!includeInactive) {
    rolesQuery = rolesQuery.eq('is_active', true)
  }

  if (scopeFilter === 'SYSTEM') {
    rolesQuery = rolesQuery.is('organization_id', null)
  }

  if (scopeFilter === 'ORGANIZATION') {
    rolesQuery = rolesQuery.eq('organization_id', organizationId)
  }

  const { data: rolesData, error } = await rolesQuery

  if (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  // Ocultar SUPER_ADMIN para usuarios que no sean super admin (es un rol de plataforma, no de org)
  const isSuperAdmin = access.context.isSuperAdmin
  const filteredRoles = (rolesData || []).filter((role: any) => {
    if (isSuperAdmin) return true
    return String(role.name).toUpperCase() !== 'SUPER_ADMIN'
  })

  const roleIds = filteredRoles.map((role: any) => role.id)
  const [{ data: allPermissions, error: permErr }, rolePermissionsResult, userRolesResult] = await Promise.all([
    supabase.from('permissions').select('*'),
    roleIds.length > 0
      ? supabase.from('role_permissions').select('*').in('role_id', roleIds)
      : Promise.resolve({ data: [], error: null }),
    roleIds.length > 0
      ? supabase
          .from('user_roles')
          .select('role_id')
          .in('role_id', roleIds)
          .eq('organization_id', organizationId)
      : Promise.resolve({ data: [], error: null }),
  ])

  const safePermissions = permErr ? [] : (allPermissions || [])
  const safeRolePerms = rolePermissionsResult.error ? [] : (rolePermissionsResult.data || [])
  const userRoles = userRolesResult.error ? [] : (userRolesResult.data || [])

  const userCountMap = new Map<string, number>()
  userRoles.forEach((userRole: any) => {
    const roleId = userRole.role_id as string
    userCountMap.set(roleId, (userCountMap.get(roleId) || 0) + 1)
  })

  const permissionsMap = new Map(safePermissions.map((permission: any) => [permission.id, permission]))
  const orgIds = [...new Set(filteredRoles.map((role: any) => role.organization_id).filter(Boolean))]
  const organizationsMap = new Map<string, string>()

  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds)

    orgs?.forEach((org: any) => {
      organizationsMap.set(org.id, org.name)
    })
  }

  const roles = filteredRoles.map((role: any) => {
    const rolePerms = safeRolePerms.filter((rolePermission: any) => rolePermission.role_id === role.id)
    const mappedPermissions = rolePerms
      .map((rolePermission: any) => mapPermission(permissionsMap.get(rolePermission.permission_id)))
      .filter(Boolean)

    const roleName = String(role.name || '').toUpperCase()
    const scope: RoleScope = role.organization_id ? 'ORGANIZATION' : 'SYSTEM'
    const isSystemRole = SYSTEM_ROLE_NAMES.includes(roleName)

    return {
      id: role.id,
      name: role.name,
      displayName: role.display_name,
      description: role.description,
      permissions: mappedPermissions,
      userCount: userCountMap.get(role.id) || 0,
      isActive: role.is_active,
      isSystem: isSystemRole,
      isSystemRole: isSystemRole,
      scope,
      isEditable: scope === 'ORGANIZATION' && !isSystemRole,
      isDeletable: scope === 'ORGANIZATION' && !isSystemRole && (userCountMap.get(role.id) || 0) === 0,
      isAssignable: role.is_active === true,
      priority: 0,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
      organizationId: role.organization_id || null,
      organizationName: role.organization_id ? organizationsMap.get(role.organization_id) || 'Desconocida' : null,
    }
  }).sort((a: any, b: any) => {
    if (a.scope !== b.scope) {
      return a.scope === 'SYSTEM' ? -1 : 1
    }

    return String(a.displayName || a.name).localeCompare(String(b.displayName || b.name), 'es')
  })

  return NextResponse.json(roles)
}

export async function POST(request: NextRequest) {
  const access = await requireAdminApiAccess(request, {
    ...ADMIN_API_ACCESS.manageRoles,
    requireOrganization: true,
  })
  if (!access.ok) {
    return access.response
  }

  const organizationId = access.context.companyId
  if (!organizationId) {
    return NextResponse.json({ message: 'Selecciona una organizacion' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { displayName, description, permissions, isActive } = body || {}
    const name = normalizeRoleCode(body?.name || body?.displayName)

    if (!name || !displayName) {
      return NextResponse.json({ message: 'Datos invalidos' }, { status: 400 })
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ message: 'Debes asignar al menos un permiso' }, { status: 400 })
    }

    if (SYSTEM_ROLE_NAMES.includes(name)) {
      return NextResponse.json({ message: 'Ese codigo de rol esta reservado por el sistema' }, { status: 409 })
    }

    const supabase = await createAdminClient()

    // Anti-escalada: no se pueden otorgar permisos que el actor no posee.
    const grantable = await assertGrantablePermissions(supabase, permissions, access.context)
    if (!grantable.ok) return grantable.response

    const { data: existingByName } = await supabase
      .from('roles')
      .select('id')
      .eq('name', name)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)

    if (existingByName && existingByName.length > 0) {
      return NextResponse.json({ message: 'Nombre de rol ya existe' }, { status: 409 })
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name,
        display_name: displayName,
        description,
        organization_id: organizationId,
        is_active: isActive !== undefined ? isActive : true,
      })
      .select()
      .single()

    if (roleError) throw roleError

    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const permissionInserts = permissions.map((permissionId: string) => ({
        role_id: role.id,
        permission_id: permissionId,
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
      .eq('organization_id', organizationId)
      .single()

    if (fetchError) throw fetchError

    let mappedPermissions: any[] = []
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const { data: perms } = await supabase
        .from('permissions')
        .select('*')
        .in('id', permissions)

      mappedPermissions = perms?.map(mapPermission).filter(Boolean) || []
    }

    const roleName = String(fullRole.name || '').toUpperCase()
    const mappedRole = {
      id: fullRole.id,
      name: fullRole.name,
      displayName: fullRole.display_name,
      description: fullRole.description,
      permissions: mappedPermissions,
      userCount: 0,
      isActive: fullRole.is_active,
      isSystem: SYSTEM_ROLE_NAMES.includes(roleName),
      isSystemRole: SYSTEM_ROLE_NAMES.includes(roleName),
      scope: 'ORGANIZATION',
      isEditable: true,
      isDeletable: true,
      isAssignable: fullRole.is_active === true,
      priority: 0,
      createdAt: fullRole.created_at,
      updatedAt: fullRole.updated_at,
      organizationId: fullRole.organization_id || null,
    }

    return NextResponse.json(mappedRole)
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Error al crear rol' }, { status: 400 })
  }
}
