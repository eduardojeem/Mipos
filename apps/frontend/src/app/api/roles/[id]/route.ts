import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { assertGrantablePermissions } from '@/app/api/admin/_utils/grantable-permissions'

const SYSTEM_ROLE_NAMES = ['ADMIN', 'SUPER_ADMIN', 'OWNER', 'SELLER', 'WAREHOUSE']

type RoleRow = { id: string; name: string | null; organization_id: string | null; is_active: boolean }

/**
 * Carga un rol verificando autorización multi-tenant:
 * - Un no-superadmin solo puede operar roles de SU organización.
 * - Los roles globales (organization_id = null, ej. system roles) y los de otras
 *   empresas se ocultan (404) para no filtrar su existencia ni permitir tocarlos.
 * Devuelve el rol o una respuesta de error lista para retornar.
 */
async function loadAuthorizedRole(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  id: string,
  ctx: { companyId: string | null; isSuperAdmin: boolean },
): Promise<{ ok: true; role: RoleRow } | { ok: false; response: NextResponse }> {
  const { data, error } = await (supabase as any)
    .from('roles')
    .select('id, name, organization_id, is_active')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, response: NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 }) }
  }

  const role = data as RoleRow
  if (!ctx.isSuperAdmin) {
    // Debe pertenecer a la org del actor; nunca roles globales ni de otra empresa.
    if (!role.organization_id || role.organization_id !== ctx.companyId) {
      return { ok: false, response: NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 }) }
    }
  }

  return { ok: true, role }
}

function isSystemRole(name: string | null): boolean {
  return SYSTEM_ROLE_NAMES.includes(String(name || '').toUpperCase())
}

async function buildRoleResponse(supabase: Awaited<ReturnType<typeof createAdminClient>>, id: string) {
  const { data: roleData, error } = await (supabase as any).from('roles').select('*').eq('id', id).single()
  if (error || !roleData) return null

  const { data: rolePerms } = await (supabase as any).from('role_permissions').select('permission_id').eq('role_id', id)
  let mappedPermissions: any[] = []
  if (rolePerms && rolePerms.length > 0) {
    const pIds = rolePerms.map((rp: any) => rp.permission_id)
    const { data: perms } = await (supabase as any).from('permissions').select('*').in('id', pIds)
    mappedPermissions = perms?.map((p: any) => ({
      id: p.id, name: p.name, displayName: p.display_name, resource: p.resource,
      action: p.action, category: p.resource, isSystem: false, createdAt: p.created_at,
    })) || []
  }

  const { count: userCount } = await (supabase as any)
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', id)

  return {
    id: roleData.id,
    name: roleData.name,
    displayName: roleData.display_name,
    description: roleData.description,
    permissions: mappedPermissions,
    userCount: userCount || 0,
    isActive: roleData.is_active,
    isSystem: isSystemRole(roleData.name),
    isSystemRole: isSystemRole(roleData.name),
    priority: 0,
    createdAt: roleData.created_at,
    updatedAt: roleData.updated_at,
    organizationId: roleData.organization_id || null,
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageRoles, requireOrganization: true })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = await createAdminClient()

  const authorized = await loadAuthorizedRole(supabase, id, access.context)
  if (!authorized.ok) return authorized.response

  const role = await buildRoleResponse(supabase, id)
  if (!role) return NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 })
  return NextResponse.json(role)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageRoles, requireOrganization: true })
  if (!access.ok) return access.response

  const { id } = await params
  try {
    const supabase = await createAdminClient()

    const authorized = await loadAuthorizedRole(supabase, id, access.context)
    if (!authorized.ok) return authorized.response
    const current = authorized.role

    // Los roles de sistema no se modifican (salvo super admin, p.ej. activarlos).
    if (isSystemRole(current.name) && !access.context.isSuperAdmin) {
      return NextResponse.json({ message: 'No se pueden modificar roles del sistema' }, { status: 403 })
    }

    const body = await request.json()
    const { name, displayName, description, permissions, isActive } = body || {}

    const updateData: any = {}
    if (name) {
      // No permitir renombrar a un nombre de rol de sistema.
      if (isSystemRole(name) && !isSystemRole(current.name)) {
        return NextResponse.json({ message: 'Ese nombre está reservado para roles del sistema' }, { status: 400 })
      }
      // Unicidad dentro del alcance (org del rol + globales).
      const { data: dup } = await (supabase as any)
        .from('roles')
        .select('id')
        .eq('name', name)
        .or(`organization_id.is.null,organization_id.eq.${current.organization_id || access.context.companyId}`)
        .neq('id', id)
        .maybeSingle()
      if (dup) return NextResponse.json({ message: 'Nombre de rol ya existe' }, { status: 409 })
      updateData.name = name
    }
    if (displayName) updateData.display_name = displayName
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.is_active = isActive

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await (supabase as any).from('roles').update(updateData).eq('id', id)
      if (updateError) throw updateError
    }

    if (permissions && Array.isArray(permissions)) {
      // Anti-escalada: no se pueden otorgar permisos que el actor no posee.
      const grantable = await assertGrantablePermissions(supabase, permissions, access.context)
      if (!grantable.ok) return grantable.response

      const { error: deleteError } = await (supabase as any).from('role_permissions').delete().eq('role_id', id)
      if (deleteError) throw deleteError

      if (permissions.length > 0) {
        const permissionInserts = permissions.map((pId: string) => ({ role_id: id, permission_id: pId }))
        const { error: insertError } = await (supabase as any).from('role_permissions').insert(permissionInserts)
        if (insertError) throw insertError
      }
    }

    const role = await buildRoleResponse(supabase, id)
    if (!role) return NextResponse.json({ message: 'Rol no encontrado' }, { status: 404 })
    return NextResponse.json(role)
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error al actualizar rol' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageRoles, requireOrganization: true })
  if (!access.ok) return access.response

  const { id } = await params
  try {
    const supabase = await createAdminClient()

    const authorized = await loadAuthorizedRole(supabase, id, access.context)
    if (!authorized.ok) return authorized.response

    if (isSystemRole(authorized.role.name)) {
      return NextResponse.json({ message: 'No se pueden eliminar roles del sistema' }, { status: 400 })
    }

    const { count, error: countError } = await (supabase as any)
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id)

    if (countError) throw countError
    if (count && count > 0) {
      return NextResponse.json({ message: 'No se puede eliminar un rol que tiene usuarios asignados' }, { status: 400 })
    }

    const { error: deleteError } = await (supabase as any).from('roles').delete().eq('id', id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error al eliminar rol' }, { status: 400 })
  }
}
