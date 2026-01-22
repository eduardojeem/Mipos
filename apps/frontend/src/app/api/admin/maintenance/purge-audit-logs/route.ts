import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { isSupabaseActive } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  if (!isSupabaseActive()) {
    return NextResponse.json({ success: true, deleted: 0 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const days = Math.max(parseInt(String(body?.days ?? '90'), 10), 1)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const admin = createAdminClient() as any
    const { count: before } = await admin
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .lt('timestamp', cutoff)
    await admin
      .from('audit_logs')
      .delete()
      .lt('timestamp', cutoff)
    return NextResponse.json({ success: true, deleted: before || 0, cutoff, days })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error' }, { status: 500 })
  }
}
