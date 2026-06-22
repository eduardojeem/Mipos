import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request)
  if (!('ok' in auth) || !auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  const configured = Boolean(process.env.RESEND_API_KEY)

  let totalSent = 0
  let totalFailed = 0
  let lastSentAt: string | null = null

  try {
    const admin = await createAdminClient()
    const { count: sent } = await admin
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
    const { count: failed } = await admin
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
    const { data: lastRow } = await admin
      .from('email_logs')
      .select('sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    totalSent = sent || 0
    totalFailed = failed || 0
    lastSentAt = lastRow?.sent_at || null
  } catch {
    // Table might not exist yet — return defaults
  }

  return NextResponse.json({ configured, totalSent, totalFailed, lastSentAt })
}
