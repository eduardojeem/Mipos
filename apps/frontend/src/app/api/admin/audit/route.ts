import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
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
    const format = (searchParams.get('format') || 'json').toLowerCase()
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
    const queryText = searchParams.get('q') || undefined
    const meta = (searchParams.get('meta') || '').toLowerCase()

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (startDate && !dateRegex.test(startDate)) {
      return NextResponse.json({ success: false, error: 'Invalid startDate format: expected YYYY-MM-DD' }, { status: 400 })
    }
    if (endDate && !dateRegex.test(endDate)) {
      return NextResponse.json({ success: false, error: 'Invalid endDate format: expected YYYY-MM-DD' }, { status: 400 })
    }
    if (startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()) {
      return NextResponse.json({ success: false, error: 'startDate must be <= endDate' }, { status: 400 })
    }

    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, error: 'Supabase no esta activo.' }, { status: 503 })
    }

    const supabase = await createAdminClient()
    const companyId = access.context.companyId

    const applyFilters = (query: any) => {
      let next = query

      if (companyId) {
        next = next.eq('organization_id', companyId)
      }
      if (actionEq?.trim()) {
        next = next.eq('action', actionEq)
      } else if (action && action !== 'all') {
        const normalized = action.toUpperCase()
        if (normalized === 'CREATE') next = next.ilike('action', '%created%')
        else if (normalized === 'UPDATE') next = next.ilike('action', '%updated%')
        else if (normalized === 'DELETE') next = next.ilike('action', '%deleted%')
        else next = next.eq('action', action)
      }
      if (resourceEq?.trim()) {
        next = next.eq('entity_type', resourceEq)
      } else if (resource && resource !== 'all') {
        next = next.eq('entity_type', resource)
      }
      if (userId) next = next.eq('user_id', userId)
      if (startDate) next = next.gte('created_at', startDate)
      if (endDate) next = next.lte('created_at', endDate)
      if (queryText?.trim()) {
        const like = `%${queryText.trim()}%`
        next = next.or(`action.ilike.${like},entity_type.ilike.${like},details::text.ilike.${like}`)
      }

      return next
    }

    if (meta === 'actions' || meta === 'resources') {
      const column = meta === 'actions' ? 'action' : 'entity_type'
      const { data, error } = await applyFilters(
        (supabase as any).from('audit_logs').select(column)
      ).range(0, limit - 1)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      const counts = new Map<string, number>()
      for (const row of data || []) {
        const value = String(row?.[column] || '').trim()
        if (!value) continue
        counts.set(value, (counts.get(value) || 0) + 1)
      }

      const items = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([item]) => item)

      return NextResponse.json({ success: true, items, counts: Object.fromEntries(counts) })
    }

    const baseQuery = applyFilters(
      (supabase as any).from('audit_logs').select('*', { count: 'exact' })
    )

    if (format === 'csv') {
      const { data, error } = await baseQuery
        .order('created_at', { ascending: false })
        .range(0, limit - 1)

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      const headers = ['id', 'created_at', 'action', 'resource', 'user_id', 'details']
      const rows = (data || []).map((row: any) => {
        const resourceValue = row.resource ?? row.entity_type ?? ''
        const details = JSON.stringify(row.details ?? {})
        return [row.id, row.created_at, row.action, resourceValue, row.user_id, details]
      })
      const csv = [headers.join(','), ...rows.map((row: any[]) => row.map((cell: unknown) => {
        const value = String(cell ?? '')
        const escaped = value.replace(/"/g, '""')
        return /[",\n]/.test(value) ? `"${escaped}"` : escaped
      }).join(','))].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    const { data, error, count } = await baseQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const normalized = (data || []).map((row: any) => ({
      ...row,
      resource: row.resource ?? row.entity_type,
    }))

    return NextResponse.json({
      success: true,
      data: normalized,
      total: count || 0,
      page,
      limit,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Error interno' },
      { status: 500 }
    )
  }
}
