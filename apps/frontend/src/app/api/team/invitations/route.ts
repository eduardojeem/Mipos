import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { getSeatUsage } from '@/lib/team/seats'
import {
  buildInviteUrl, generateInviteToken, inviteExpiry, isValidEmail, resolveInviteRole,
} from '@/lib/team/invitations'
import { logAudit } from '@/app/api/admin/_utils/audit'
import { sendEmail, buildInvitationEmail } from '@/lib/email'

const COLUMNS = 'id, email, role_id, status, invited_by, expires_at, created_at'

/**
 * GET /api/team/invitations
 * Lista las invitaciones PENDIENTES de la organización + uso de asientos.
 */
export async function GET(request: NextRequest) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!

  const admin = await createAdminClient()
  const [{ data: invites, error }, seats] = await Promise.all([
    (admin as any).from('invitations').select(COLUMNS).eq('organization_id', orgId).eq('status', 'PENDING').order('created_at', { ascending: false }),
    getSeatUsage(admin, orgId),
  ])
  if (error) return NextResponse.json({ message: 'No se pudieron obtener las invitaciones' }, { status: 500 })

  // Enriquecer con el nombre del rol
  const roleIds = Array.from(new Set((invites || []).map((i: any) => i.role_id).filter((x: any) => x != null)))
  const roleMap = new Map<string, string>()
  if (roleIds.length) {
    const { data: roles } = await (admin as any).from('roles').select('id, display_name, name').in('id', roleIds)
    for (const r of (roles || []) as any[]) roleMap.set(r.id, r.display_name || r.name)
  }

  const invitations = (invites || []).map((i: any) => ({ ...i, role_name: i.role_id != null ? roleMap.get(i.role_id) || null : null }))
  return NextResponse.json({ invitations, seats })
}

/**
 * POST /api/team/invitations
 * Crea una invitación. Respeta el límite de asientos del plan.
 * Body: { email, role_id }
 */
export async function POST(request: NextRequest) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!

  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || '').trim().toLowerCase()
    if (!isValidEmail(email)) return NextResponse.json({ message: 'Email inválido' }, { status: 400 })

    const admin = await createAdminClient()

    const roleCheck = await resolveInviteRole(admin, orgId, body?.role_id, {
      isSuperAdmin: access.context.isSuperAdmin,
      isOwner: access.context.isOwner,
    })
    if (!roleCheck.ok) return NextResponse.json({ message: roleCheck.error }, { status: 400 })

    // ¿Ya es miembro activo de la org? (vía users → organization_members)
    const { data: existingUser } = await (admin as any).from('users').select('id').ilike('email', email).maybeSingle()
    if (existingUser) {
      const { data: membership } = await (admin as any)
        .from('organization_members').select('id').eq('organization_id', orgId).eq('user_id', existingUser.id).maybeSingle()
      if (membership) return NextResponse.json({ message: 'Esa persona ya es miembro de la empresa' }, { status: 409 })
    }

    // ¿Ya hay una invitación pendiente para ese email?
    const { data: pending } = await (admin as any)
      .from('invitations').select('id').eq('organization_id', orgId).eq('status', 'PENDING').ilike('email', email).maybeSingle()
    if (pending) return NextResponse.json({ message: 'Ya hay una invitación pendiente para ese email' }, { status: 409 })

    // Enforcement de asientos del plan
    const seats = await getSeatUsage(admin, orgId)
    if (!seats.unlimited && seats.available <= 0) {
      return NextResponse.json(
        { message: `Llegaste al límite de asientos de tu plan (${seats.limit}). Mejorá tu plan para sumar más personas.`, code: 'SEAT_LIMIT_REACHED', seats },
        { status: 409 },
      )
    }

    const token = generateInviteToken()
    const { data: created, error } = await (admin as any)
      .from('invitations')
      .insert([{
        organization_id: orgId,
        email,
        role_id: roleCheck.roleId,
        token,
        status: 'PENDING',
        invited_by: access.context.userId,
        expires_at: inviteExpiry(),
      }])
      .select(COLUMNS)
      .single()

    if (error) return NextResponse.json({ message: 'No se pudo crear la invitación', details: error.message }, { status: 500 })

    logAudit('team.invited', { organizationId: orgId, email, role: roleCheck.roleName }, {
      id: access.context.userId, email: access.context.email, role: access.context.role,
    })

    const inviteUrl = buildInviteUrl(request.nextUrl.origin, token)

    // Enviar email de invitación (fire-and-forget — no bloquea la respuesta)
    const { data: orgRow } = await (admin as any).from('organizations').select('name').eq('id', orgId).maybeSingle()
    const inviteEmailData = buildInvitationEmail({
      inviteeName: email.split('@')[0],
      organizationName: orgRow?.name || 'la empresa',
      inviterName: access.context.email || 'Un administrador',
      roleName: roleCheck.roleName,
      inviteUrl,
    })
    void sendEmail({ to: email, ...inviteEmailData, template: 'invitation' }).catch(() => { /* non-critical */ })

    return NextResponse.json({ invitation: { ...created, role_name: roleCheck.roleName }, inviteUrl }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Error al invitar' }, { status: 400 })
  }
}
