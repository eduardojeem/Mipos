import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { countActiveOwners, getMembership, MEMBER_STATUSES } from '@/lib/team/member-guards'
import { resolveInviteRole } from '@/lib/team/invitations'
import { logAudit } from '@/app/api/admin/_utils/audit'

/**
 * PATCH /api/team/members/[userId]
 * Cambia el rol y/o el estado de un miembro, con guardas de integridad:
 *  - no podés modificar tu propio acceso de forma destructiva;
 *  - no se puede suspender/dejar sin rol al último dueño activo;
 *  - el rol del dueño se gestiona con transferencia (no acá);
 *  - no se puede otorgar un rol por encima del propio (anti-escalada).
 * Body: { role_id?, status? }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!
  const { userId } = await params

  const admin = await createAdminClient()
  const target = await getMembership(admin, orgId, userId)
  if (!target) return NextResponse.json({ message: 'Miembro no encontrado' }, { status: 404 })

  const isSelf = userId === access.context.userId
  const body = await request.json().catch(() => ({}))
  const patch: Record<string, any> = {}

  // --- Estado (suspender / reactivar) ---
  if (body?.status !== undefined) {
    const status = String(body.status).toUpperCase()
    if (!MEMBER_STATUSES.includes(status)) return NextResponse.json({ message: 'Estado inválido' }, { status: 400 })
    if (isSelf && status !== 'ACTIVE') {
      return NextResponse.json({ message: 'No podés suspender tu propio acceso' }, { status: 400 })
    }
    if (status !== 'ACTIVE' && target.is_owner && (await countActiveOwners(admin, orgId)) <= 1) {
      return NextResponse.json({ message: 'No podés suspender al último dueño de la empresa' }, { status: 400 })
    }
    patch.status = status
  }

  // --- Rol ---
  if (body?.role_id !== undefined) {
    if (isSelf) return NextResponse.json({ message: 'No podés cambiar tu propio rol' }, { status: 400 })
    if (target.is_owner) {
      return NextResponse.json({ message: 'El rol del dueño se cambia con la transferencia de propiedad' }, { status: 400 })
    }
    const roleCheck = await resolveInviteRole(admin, orgId, body.role_id, {
      isSuperAdmin: access.context.isSuperAdmin,
      isOwner: access.context.isOwner,
    })
    if (!roleCheck.ok) return NextResponse.json({ message: roleCheck.error }, { status: 400 })
    patch.role_id = roleCheck.roleId
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: 'Nada que actualizar' }, { status: 400 })
  }

  const { error } = await (admin as any)
    .from('organization_members').update(patch).eq('organization_id', orgId).eq('user_id', userId)
  if (error) return NextResponse.json({ message: 'No se pudo actualizar el miembro', details: error.message }, { status: 500 })

  // Sincronizar el rol también en user_roles (vocabulario de permisos)
  if (patch.role_id) {
    await (admin as any).from('user_roles').update({ is_active: false }).eq('user_id', userId).eq('organization_id', orgId)
    await (admin as any).from('user_roles').upsert(
      { user_id: userId, role_id: patch.role_id, organization_id: orgId, is_active: true },
      { onConflict: 'user_id,role_id' },
    )
  }

  logAudit('team.member_updated', { organizationId: orgId, userId, changes: patch }, {
    id: access.context.userId, email: access.context.email, role: access.context.role,
  })

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/team/members/[userId]
 * Quita al miembro de la organización (no borra su cuenta global).
 * Guardas: no podés quitarte a vos mismo ni al último dueño activo.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!
  const { userId } = await params

  if (userId === access.context.userId) {
    return NextResponse.json({ message: 'No podés quitarte a vos mismo de la empresa' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const target = await getMembership(admin, orgId, userId)
  if (!target) return NextResponse.json({ message: 'Miembro no encontrado' }, { status: 404 })

  if (target.is_owner && (await countActiveOwners(admin, orgId)) <= 1) {
    return NextResponse.json({ message: 'No podés quitar al último dueño de la empresa' }, { status: 400 })
  }

  const { error } = await (admin as any)
    .from('organization_members').delete().eq('organization_id', orgId).eq('user_id', userId)
  if (error) return NextResponse.json({ message: 'No se pudo quitar al miembro', details: error.message }, { status: 500 })

  // Desactivar sus roles en esta org (no se toca la cuenta global)
  await (admin as any).from('user_roles').update({ is_active: false }).eq('user_id', userId).eq('organization_id', orgId)

  logAudit('team.member_removed', { organizationId: orgId, userId }, {
    id: access.context.userId, email: access.context.email, role: access.context.role,
  })

  return NextResponse.json({ success: true })
}
