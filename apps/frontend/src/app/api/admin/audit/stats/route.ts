import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { isSupabaseActive } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await requireAdminApiAccess(request, ADMIN_API_ACCESS.auditLogs)
  if (!access.ok) {
    return access.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, error: 'Supabase no esta activo.' }, { status: 503 })
    }

    const supabase = await createClient()
    let query = (supabase as any)
      .from('audit_logs')
      .select('action, entity_type, user_email, timestamp, created_at', { count: 'exact' })

    if (access.context.companyId) {
      query = query.eq('organization_id', access.context.companyId)
    }
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(0, 999)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const byActionMap: Record<string, number> = {}
    const byResourceMap: Record<string, number> = {}

    for (const row of data || []) {
      const action = String(row.action || '').trim()
      const resource = String(row.entity_type || '').trim()
      if (action) byActionMap[action] = (byActionMap[action] || 0) + 1
      if (resource) byResourceMap[resource] = (byResourceMap[resource] || 0) + 1
    }

    return NextResponse.json({
      total: count || (data || []).length,
      byAction: Object.entries(byActionMap).map(([action, total]) => ({ action, count: total })),
      byResource: Object.entries(byResourceMap).map(([resource, total]) => ({ resource, count: total })),
      recentActivity: (data || []).slice(0, 20).map((row: any) => ({
        action: String(row.action || ''),
        entityType: String(row.entity_type || ''),
        userEmail: String(row.user_email || ''),
        timestamp: row.timestamp || row.created_at,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
