import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { buildInvitationEmail } from '@/lib/email/templates/invitation'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request)
  if (!('ok' in auth) || !auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  const template = request.nextUrl.searchParams.get('template')

  if (template === 'invitation') {
    const { html } = buildInvitationEmail({
      inviteeName: 'Juan',
      organizationName: 'Mi Barbería',
      inviterName: 'admin@mitienda.app',
      roleName: 'Cajero',
      inviteUrl: 'https://app.mitienda.com/invite?token=demo-preview-token',
      expiresInDays: 7,
    })
    return NextResponse.json({ html })
  }

  if (template === 'welcome') {
    const { html } = buildWelcomeEmail({
      userName: 'Juan',
      organizationName: 'Mi Barbería',
      loginUrl: 'https://app.mitienda.com/onboarding',
    })
    return NextResponse.json({ html })
  }

  return NextResponse.json({ error: 'Template no válido' }, { status: 400 })
}
