import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

/**
 * POST /api/team/invitations/accept
 * Acepta una invitación. El usuario debe estar logueado y su email debe
 * coincidir con el de la invitación. Crea la membresía (ACTIVE) con el rol.
 * Body: { token }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'Iniciá sesión para aceptar la invitación', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const token = String(body?.token || '').trim()
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    const admin = await createAdminClient()
    const { data: invite } = await (admin as any)
      .from('invitations')
      .select('id, organization_id, email, role_id, status, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (!invite || invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitación inválida o ya utilizada' }, { status: 404 })
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'La invitación expiró. Pedí una nueva.' }, { status: 410 })
    }

    // El email logueado debe coincidir con el de la invitación.
    const userEmail = String(user.email || '').toLowerCase()
    if (userEmail !== String(invite.email || '').toLowerCase()) {
      return NextResponse.json(
        { error: `Esta invitación es para ${invite.email}. Iniciá sesión con ese email.`, code: 'EMAIL_MISMATCH' },
        { status: 403 },
      )
    }

    const orgId = invite.organization_id as string

    // Crear/asegurar membresía ACTIVE con el rol
    await (admin as any).from('organization_members').upsert(
      { organization_id: orgId, user_id: user.id, role_id: invite.role_id, status: 'ACTIVE' },
      { onConflict: 'organization_id,user_id' },
    )

    // Asegurar el rol también en user_roles (vocabulario que usa la capa de permisos)
    if (invite.role_id != null) {
      await (admin as any).from('user_roles').upsert(
        { user_id: user.id, role_id: invite.role_id, organization_id: orgId, is_active: true },
        { onConflict: 'user_id,role_id' },
      )
    }

    // Si el usuario no tenía org primaria, dejarla seteada (compat. legacy)
    const { data: profile } = await (admin as any).from('users').select('organization_id').eq('id', user.id).maybeSingle()
    if (profile && !profile.organization_id) {
      await (admin as any).from('users').update({ organization_id: orgId }).eq('id', user.id)
    }

    await (admin as any)
      .from('invitations')
      .update({ status: 'ACCEPTED', accepted_at: new Date().toISOString(), accepted_user_id: user.id })
      .eq('id', invite.id)

    const { data: org } = await (admin as any).from('organizations').select('id, name, slug').eq('id', orgId).maybeSingle()

    return NextResponse.json({ success: true, organization: org || { id: orgId } })
  } catch (error) {
    console.error('Unexpected error accepting invitation:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
