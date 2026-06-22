import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { buildInviteUrl, generateInviteToken, inviteExpiry } from '@/lib/team/invitations'

async function loadPendingInvite(admin: any, id: string, orgId: string) {
  const { data } = await admin
    .from('invitations')
    .select('id, status')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle()
  return data || null
}

/**
 * DELETE /api/team/invitations/[id]  → revoca una invitación pendiente.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!
  const { id } = await params

  const admin = await createAdminClient()
  const invite = await loadPendingInvite(admin, id, orgId)
  if (!invite) return NextResponse.json({ message: 'Invitación no encontrada' }, { status: 404 })
  if (invite.status !== 'PENDING') return NextResponse.json({ message: 'La invitación ya no está pendiente' }, { status: 400 })

  const { error } = await (admin as any)
    .from('invitations').update({ status: 'REVOKED' }).eq('id', id).eq('organization_id', orgId)
  if (error) return NextResponse.json({ message: 'No se pudo revocar' }, { status: 500 })

  return NextResponse.json({ success: true })
}

/**
 * POST /api/team/invitations/[id]  → reenvía (regenera token + vencimiento).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdminApiAccess(request, { ...ADMIN_API_ACCESS.manageTeamAccess, requireOrganization: true })
  if (!access.ok) return access.response
  const orgId = access.context.companyId!
  const { id } = await params

  const admin = await createAdminClient()
  const invite = await loadPendingInvite(admin, id, orgId)
  if (!invite) return NextResponse.json({ message: 'Invitación no encontrada' }, { status: 404 })
  if (invite.status !== 'PENDING') return NextResponse.json({ message: 'La invitación ya no está pendiente' }, { status: 400 })

  const token = generateInviteToken()
  const { error } = await (admin as any)
    .from('invitations').update({ token, expires_at: inviteExpiry() }).eq('id', id).eq('organization_id', orgId)
  if (error) return NextResponse.json({ message: 'No se pudo reenviar' }, { status: 500 })

  return NextResponse.json({ success: true, inviteUrl: buildInviteUrl(request.nextUrl.origin, token) })
}
