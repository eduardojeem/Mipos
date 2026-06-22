import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { sendEmail } from '@/lib/email/send'
import { buildInvitationEmail } from '@/lib/email/templates/invitation'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'

// Rate limit por instancia: máx 10 envíos de prueba por super admin cada 10 min.
// Evita abuso/spam del endpoint de prueba (mejor esfuerzo en serverless).
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_MAX_ENTRIES = 256
const testRateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = testRateLimit.get(key)
  if (!entry || entry.resetAt < now) {
    if (testRateLimit.size >= RATE_LIMIT_MAX_ENTRIES) {
      const oldest = testRateLimit.keys().next().value
      if (oldest !== undefined) testRateLimit.delete(oldest)
    }
    testRateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count += 1
  return { allowed: true }
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request)
  if (!('ok' in auth) || !auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  const rate = checkRateLimit(auth.userId)
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, message: `Demasiados envíos de prueba. Probá de nuevo en ${Math.ceil((rate.retryAfterSeconds || 60) / 60)} min.` },
      { status: 429, headers: rate.retryAfterSeconds ? { 'Retry-After': String(rate.retryAfterSeconds) } : undefined },
    )
  }

  const body = await request.json().catch(() => ({}))
  const to = String(body.to || '').trim()
  const template = String(body.template || '')

  if (!to || !to.includes('@')) {
    return NextResponse.json({ success: false, message: 'Email inválido' })
  }

  let emailData: { subject: string; html: string; text: string }

  if (template === 'invitation') {
    emailData = buildInvitationEmail({
      inviteeName: to.split('@')[0],
      organizationName: 'Empresa de Prueba',
      inviterName: auth.email || 'Super Admin',
      roleName: 'Cajero',
      inviteUrl: `${request.nextUrl.origin}/invite?token=test-token-preview`,
      expiresInDays: 7,
    })
  } else if (template === 'welcome') {
    emailData = buildWelcomeEmail({
      userName: to.split('@')[0],
      organizationName: 'Empresa de Prueba',
      loginUrl: `${request.nextUrl.origin}/onboarding`,
    })
  } else {
    return NextResponse.json({ success: false, message: 'Template no válido' })
  }

  // sendEmail() ya registra el intento en email_logs (con template). No insertar
  // de nuevo acá para evitar filas duplicadas.
  const sent = await sendEmail({ to, ...emailData, template, metadata: { source: 'superadmin_test' } })

  if (sent) {
    return NextResponse.json({ success: true, message: `Email enviado a ${to}` })
  }

  return NextResponse.json({
    success: false,
    message: process.env.RESEND_API_KEY
      ? 'Error al enviar. Revisá los logs de Resend.'
      : 'RESEND_API_KEY no configurada. El email no se envió.',
  })
}
