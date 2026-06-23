import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'MITIENDA <noreply@mitienda.app>'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  /** Identificador de plantilla para trazabilidad en email_logs (ej: 'welcome'). */
  template?: string
  /** Metadata opcional a guardar en el log. */
  metadata?: Record<string, unknown>
}

/**
 * Envía un email via Resend y logea el resultado en email_logs (una sola vez).
 * Retorna `true` si se envió correctamente, `false` si falló (no lanza).
 * En desarrollo sin RESEND_API_KEY, solo logea al console.
 *
 * NOTA: este es el único punto que escribe en email_logs. Los callers NO deben
 * insertar logs por su cuenta (evita filas duplicadas).
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, text, template, metadata } = options

  if (!process.env.RESEND_API_KEY) {
    console.info('[email] RESEND_API_KEY not set — skipping email send:', { to, subject })
    void logEmailSend(to, subject, 'failed', 'RESEND_API_KEY no configurada', template, metadata)
    return false
  }

  try {
    const resend = getResend()
    if (!resend) {
      console.info('[email] RESEND_API_KEY not available at runtime — skipping:', { to, subject })
      return false
    }

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('[email] Resend error:', error)
      void logEmailSend(to, subject, 'failed', error.message, template, metadata)
      return false
    }

    void logEmailSend(to, subject, 'sent', undefined, template, metadata)
    return true
  } catch (err) {
    console.error('[email] Failed to send:', err)
    void logEmailSend(to, subject, 'failed', err instanceof Error ? err.message : 'Unknown error', template, metadata)
    return false
  }
}

/** Fire-and-forget log to email_logs table */
async function logEmailSend(
  to: string,
  subject: string,
  status: 'sent' | 'failed',
  error?: string,
  template?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    // Dynamic import to avoid circular deps and keep this module lightweight
    const { createAdminClient } = await import('@/lib/supabase/server')
    const admin = await createAdminClient()
    await admin.from('email_logs').insert({
      to_email: to,
      subject,
      template: template || null,
      status,
      error: error || null,
      metadata: metadata || null,
      sent_at: new Date().toISOString(),
    })
  } catch {
    // Non-critical: table might not exist yet
  }
}
