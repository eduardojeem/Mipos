import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getAuditLogs } from '@/app/api/admin/_utils/audit'
import { isSupabaseActive } from '@/lib/env'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth

  try {
    const { searchParams } = new URL(request.url)
    const formatParam = (searchParams.get('format') || 'json').toLowerCase()
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10)
    const limit = Math.min(Math.max(limitRaw, 1), 100)
    const offset = (page - 1) * limit
    const action = searchParams.get('action') || undefined
    const actionEq = searchParams.get('actionEq') || undefined
    const resource = searchParams.get('resource') || undefined
    const resourceEq = searchParams.get('resourceEq') || undefined
    const userId = searchParams.get('userId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const q = searchParams.get('q') || undefined

    // Validate date formats (expecting YYYY-MM-DD). Return 400 on invalid format or range.
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (startDate && !dateRegex.test(startDate)) {
      return NextResponse.json({ success: false, error: 'Invalid startDate format: expected YYYY-MM-DD' }, { status: 400 })
    }
    if (endDate && !dateRegex.test(endDate)) {
      return NextResponse.json({ success: false, error: 'Invalid endDate format: expected YYYY-MM-DD' }, { status: 400 })
    }
    if (startDate && endDate) {
      const s = new Date(startDate)
      const e = new Date(endDate)
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid date value for startDate or endDate' }, { status: 400 })
      }
      if (s.getTime() > e.getTime()) {
        return NextResponse.json({ success: false, error: 'startDate must be <= endDate' }, { status: 400 })
      }
    }

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, error: 'Supabase no está activo. No hay fuente de datos disponible.' }, { status: 503 })
    }

    const supabase = await createClient()
    let query = (supabase as any)
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // ✅ CRÍTICO: Filtrar por organización si no es super admin
    if (!isSuperAdmin && organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (actionEq && actionEq.trim()) {
      query = query.eq('action', actionEq)
    } else if (action && action !== 'all') {
      const ac = String(action).toUpperCase()
      if (ac === 'CREATE') {
        query = query.ilike('action', '%created%')
      } else if (ac === 'UPDATE') {
        query = query.ilike('action', '%updated%')
      } else if (ac === 'DELETE') {
        query = query.ilike('action', '%deleted%')
      } else {
        query = query.eq('action', action)
      }
    }
    if (resourceEq && resourceEq.trim()) {
      query = query.eq('entity_type', resourceEq)
    } else if (resource && resource !== 'all') {
      query = query.eq('entity_type', resource)
    }
    if (userId) query = query.eq('user_id', userId)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)
    if (q && q.trim()) {
      const term = q.trim()
      const like = `%${term}%`
      query = query.or(`action.ilike.${like},entity_type.ilike.${like},details::text.ilike.${like}`)
    }

    const meta = (searchParams.get('meta') || '').toLowerCase()
    if (meta === 'actions' || meta === 'resources') {
      const column = meta === 'actions' ? 'action' : 'entity_type'
      let metaQuery = (supabase as any)
        .from('audit_logs')
        .select(column)

      if (actionEq && actionEq.trim()) {
        metaQuery = metaQuery.eq('action', actionEq)
      } else if (action && action !== 'all') {
        const ac = String(action).toUpperCase()
        if (ac === 'CREATE') {
          metaQuery = metaQuery.ilike('action', '%created%')
        } else if (ac === 'UPDATE') {
          metaQuery = metaQuery.ilike('action', '%updated%')
        } else if (ac === 'DELETE') {
          metaQuery = metaQuery.ilike('action', '%deleted%')
        } else {
          metaQuery = metaQuery.eq('action', action)
        }
      }
      if (resourceEq && resourceEq.trim()) {
        metaQuery = metaQuery.eq('entity_type', resourceEq)
      } else if (resource && resource !== 'all') {
        metaQuery = metaQuery.eq('entity_type', resource)
      }
      if (userId) metaQuery = metaQuery.eq('user_id', userId)
      if (startDate) metaQuery = metaQuery.gte('created_at', startDate)
      if (endDate) metaQuery = metaQuery.lte('created_at', endDate)
      if (q && q.trim()) {
        const term = q.trim()
        const like = `%${term}%`
        metaQuery = metaQuery.or(`action.ilike.${like},resource.ilike.${like},details::text.ilike.${like}`)
      }

      const { data, error } = await metaQuery
        .range(0, Math.max(1, limit) - 1)
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      const counts = new Map<string, number>()
      for (const row of (data || [])) {
        const v = String(row[column] || '').trim()
        if (!v) continue
        counts.set(v, (counts.get(v) || 0) + 1)
      }
      const items = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k)
      return NextResponse.json({ success: true, items, counts: Object.fromEntries(counts) })
    }

    if (formatParam === 'csv') {
      const csvLimit = limit || 1000
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(0, csvLimit - 1)
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

      const headers = ['id', 'created_at', 'action', 'resource', 'user_id', 'details']
      const rows = (data || []).map((r: any) => {
        const detailsStr = JSON.stringify(r.details ?? {})
        const resourceVal = r.resource ?? r.entity_type ?? ''
        return [r.id, r.created_at, r.action, resourceVal, r.user_id, detailsStr]
      })
      const csv = [headers.join(','), ...rows.map((row: any[]) => row.map((cell: any) => {
        const s = String(cell ?? '')
        const needsQuote = s.includes(',') || s.includes('\n') || s.includes('"')
        const escaped = s.replace(/"/g, '""')
        return needsQuote ? `"${escaped}"` : escaped
      }).join(','))].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().slice(0,10)}.csv"`
        }
      })
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const normalized = (data || []).map((r: any) => ({ ...r, resource: r.resource ?? r.entity_type }))

    return NextResponse.json({ success: true, data: normalized, total: count || 0, page, limit })
  } catch (e: any) {
    const message = e?.message || 'Error interno'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
