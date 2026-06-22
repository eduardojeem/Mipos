import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request)
  if (!('ok' in auth) || !auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  try {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('email_logs')
      .select('id, to_email, subject, template, status, error, sent_at')
      .order('sent_at', { ascending: false })
      .limit(50)

    if (error) {
      // Table might not exist
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ logs: [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const logs = (data || []).map((row: any) => ({
      id: row.id,
      to: row.to_email,
      subject: row.subject,
      template: row.template,
      status: row.status,
      error: row.error,
      sentAt: row.sent_at,
    }))

    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ logs: [] })
  }
}
