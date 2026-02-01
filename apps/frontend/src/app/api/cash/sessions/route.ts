import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { createClient as createSBClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase'
import { isMockAuthEnabled } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    // Autenticación: preferir cookie; fallback a Authorization: Bearer
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let effectiveUser: any = user
    const envMode = (request.headers.get('x-env-mode') || request.headers.get('X-Env-Mode') || '').toLowerCase()
    const mockEnabledEarly = isMockAuthEnabled() || envMode === 'mock'
    if (authError || !user) {
      const authHeader = (request.headers.get('authorization') || '').trim()
      const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : ''
      if (token) {
        const sb = createSBClient(supabaseConfig.url, supabaseConfig.anonKey)
        const { data: tokenUser } = await sb.auth.getUser(token)
        effectiveUser = tokenUser?.user || null
      }
      if (!effectiveUser && !mockEnabledEarly) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }

    // Filtros y paginación
    const { searchParams } = request.nextUrl
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10))
    const status = searchParams.get('status') || undefined
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined
    const userId = searchParams.get('userId') || undefined
    const orderBy = (searchParams.get('orderBy') || 'openedAt') as 'openedAt' | 'closedAt' | 'status'
    const orderDir = (searchParams.get('orderDir') || 'desc') as 'asc' | 'desc'

    let client: any = supabase as any
    const mockEnabled = mockEnabledEarly
    if (mockEnabled) {
      try {
        client = createAdminClient()
      } catch { }
    }

    const orderColumn = orderBy === 'closedAt' ? 'closing_time' : (orderBy === 'status' ? 'status' : 'opening_time')

    let query = client
      .from('cash_sessions')
      .select(`
        id,status,opening_time,closing_time,opening_amount,closing_amount,notes,opened_by,closed_by,
        opened_by_user:opened_by(id, email, full_name),
        closed_by_user:closed_by(id, email, full_name)
      `, { count: 'exact' })
      .eq('organization_id', orgId)
      .order(orderColumn, { ascending: orderDir === 'asc' })

    if (status && status !== 'all') {
      query = query.or(`status.eq.${status},session_status.eq.${String(status).toLowerCase()}`)
    }
    if (from) {
      query = query.gte('opening_time', from)
    }
    if (to) {
      const dt = new Date(to)
      dt.setHours(23, 59, 59, 999)
      query = query.lte('opening_time', dt.toISOString())
    }
    if (userId && userId !== 'all') {
      query = query.or(`opened_by.eq.${userId},closed_by.eq.${userId},user_id.eq.${userId}`)
    }

    const start = (page - 1) * limit
    const end = start + limit - 1
    query = query.range(start, end)

    const { data: sessions, error, count } = await query
    if (error) {
      if (mockEnabled) {
        return NextResponse.json({ sessions: [], pagination: { page, limit, total: 0, pages: 1 } })
      }
      return NextResponse.json({ error: 'Failed to fetch sessions', details: error.message }, { status: 500 })
    }

    const base = (sessions || []).map((s: any) => ({
      id: s.id,
      status: s.status || 'UNKNOWN',
      openingAmount: Number(s.opening_amount) || 0,
      closingAmount: s.closing_amount != null ? Number(s.closing_amount) : null,
      systemExpected: null,
      discrepancyAmount: null,
      openedAt: s.opening_time,
      closedAt: s.closing_time ?? null,
      notes: s.notes ?? null,
      openedByUser: s.opened_by_user ? {
        id: s.opened_by_user.id,
        email: s.opened_by_user.email,
        fullName: s.opened_by_user.full_name || null
      } : null,
      closedByUser: s.closed_by_user ? {
        id: s.closed_by_user.id,
        email: s.closed_by_user.email,
        fullName: s.closed_by_user.full_name || null
      } : null,
    }))

    const ids = base.map((s: { id: string }) => s.id)
    let mvts: any[] = []
    let countsRows: any[] = []
    if (ids.length > 0) {
      const { data: m } = await client
        .from('cash_movements')
        .select('session_id,type,amount')
        .in('session_id', ids)
      mvts = m || []
      const { data: cnt } = await client
        .from('cash_counts')
        .select('session_id,denomination,quantity,total')
        .in('session_id', ids)
      countsRows = cnt || []
    }

    const netBySession: Record<string, number> = {}
    ids.forEach((id: string) => { netBySession[id] = 0 })
    mvts.forEach((m: any) => {
      const sid = m.session_id as string
      const amt = Number(m.amount) || 0
      const t = String(m.type || '').toUpperCase()
      if (!(sid in netBySession)) return
      if (t === 'IN') netBySession[sid] += Math.abs(amt)
      else if (t === 'OUT') netBySession[sid] -= Math.abs(amt)
      else if (t === 'SALE') netBySession[sid] += Math.abs(amt)
      else if (t === 'RETURN') netBySession[sid] -= Math.abs(amt)
      else if (t === 'ADJUSTMENT') netBySession[sid] += amt
    })

    const countsBySession: Record<string, any[]> = {}
    countsRows.forEach((c: any) => {
      const sid = c.session_id as string
      if (!countsBySession[sid]) countsBySession[sid] = []
      countsBySession[sid].push({
        denomination: Number(c.denomination),
        quantity: Number(c.quantity),
        total: Number(c.total)
      })
    })

    const formatted = base.map((s: { id: string; openingAmount: number; closingAmount: number | null }) => {
      const net = netBySession[s.id] || 0
      const expected = s.openingAmount + net
      const discrepancy = s.closingAmount != null ? (s.closingAmount - expected) : null
      return { ...s, systemExpected: expected, discrepancyAmount: discrepancy, counts: countsBySession[s.id] || [] }
    })

    const total = typeof count === 'number' ? count : (formatted.length)
    const pages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({ sessions: formatted, pagination: { page, limit, total, pages } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
