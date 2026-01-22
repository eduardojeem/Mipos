import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getAuditLogs } from '@/app/api/admin/_utils/audit'
import { isSupabaseActive } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, error: 'Supabase no está activo. No hay fuente de datos disponible.' }, { status: 503 })
    }

    const supabase = await createClient()
    let query = (supabase as any)
      .from('audit_logs')
      .select('action, entity_type, user_email, timestamp, created_at', { count: 'exact' })

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(0, 999)

    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

    const byActionMap: Record<string, number> = {}
    const byResourceMap: Record<string, number> = {}
    const recentActivity = (data || []).slice(0, 20).map((r: any) => ({
      action: String(r.action || ''),
      entityType: String(r.entity_type || ''),
      userEmail: String(r.user_email || ''),
      timestamp: r.timestamp || r.created_at,
    }))

    (data || []).forEach((r: any) => {
      const a = String(r.action || '').trim()
      const res = String(r.entity_type || '').trim()
      if (a) byActionMap[a] = (byActionMap[a] || 0) + 1
      if (res) byResourceMap[res] = (byResourceMap[res] || 0) + 1
    })

    const byAction = Object.entries(byActionMap).map(([action, count]) => ({ action, count }))
    const byResource = Object.entries(byResourceMap).map(([resource, count]) => ({ resource, count }))

    return NextResponse.json({
      total: count || (data || []).length,
      byAction,
      byResource,
      recentActivity,
    })
  } catch (e: any) {
    const message = e?.message || 'Error interno'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
