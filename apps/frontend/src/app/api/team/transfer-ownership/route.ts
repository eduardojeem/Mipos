import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { getMembership } from '@/lib/team/member-guards'
import { logAudit } from '@/app/api/admin/_utils/audit'

function pickRole(roles: any[], name: string): string | null {
  const matches = roles.filter((r) => String(r.name).toUpperCase() === name)
  // Preferir el rol global de sistema (organization_id null)
  const global = matches.find((r) => !r.organization_id)
  return (global || matches[0])?.id ?? null
}

/**
 * POST /api/team/transfer-ownership
 * Transfiere la propiedad de la empresa a otro miembro activo.
 * Solo el dueño actual (o super admin) puede hacerlo. El dueño saliente pasa a ADMIN.
 * Body: { user_id }
 */
export async function POST(request: NextRequest) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!

  // Acción reservada al dueño actual (o super admin de la plataforma).
  if (!access.context.isOwner && !access.context.isSuperAdmin) {
    return NextResponse.json({ message: 'Solo el dueño puede transferir la propiedad' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const targetUserId = String(body?.user_id || '').trim()
  if (!targetUserId) return NextResponse.json({ message: 'Falta el miembro destino' }, { status: 400 })
  if (targetUserId === access.context.userId) {
    return NextResponse.json({ message: 'Ya sos el dueño' }, { status: 400 })
  }

  const admin = await createAdminClient()
  const target = await getMembership(admin, orgId, targetUserId)
  if (!target) return NextResponse.json({ message: 'Miembro no encontrado' }, { status: 404 })
  if (target.status !== 'ACTIVE') return NextResponse.json({ message: 'El nuevo dueño debe ser un miembro activo' }, { status: 400 })

  const { data: roles } = await (admin as any).from('roles').select('id, name, organization_id').in('name', ['OWNER', 'ADMIN'])
  const ownerRoleId = pickRole(roles || [], 'OWNER')
  const adminRoleId = pickRole(roles || [], 'ADMIN')
  if (!ownerRoleId) return NextResponse.json({ message: 'No se encontró el rol de Propietario' }, { status: 500 })

  // Promover al nuevo dueño
  await (admin as any).from('organization_members')
    .update({ is_owner: true, role_id: ownerRoleId, status: 'ACTIVE' })
    .eq('organization_id', orgId).eq('user_id', targetUserId)
  await (admin as any).from('user_roles').upsert(
    { user_id: targetUserId, role_id: ownerRoleId, organization_id: orgId, is_active: true },
    { onConflict: 'user_id,role_id' },
  )

  // Degradar al dueño saliente (solo si quien transfiere es el dueño-miembro)
  if (access.context.isOwner && adminRoleId) {
    await (admin as any).from('organization_members')
      .update({ is_owner: false, role_id: adminRoleId })
      .eq('organization_id', orgId).eq('user_id', access.context.userId)
    await (admin as any).from('user_roles').upsert(
      { user_id: access.context.userId, role_id: adminRoleId, organization_id: orgId, is_active: true },
      { onConflict: 'user_id,role_id' },
    )
  }

  logAudit('team.ownership_transferred', { organizationId: orgId, toUserId: targetUserId }, {
    id: access.context.userId, email: access.context.email, role: access.context.role,
  })

  return NextResponse.json({ success: true })
}
