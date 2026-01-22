import { NextRequest, NextResponse } from 'next/server'
import { api, getErrorMessage } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { isMockAuthEnabled } from '@/lib/env'

// GET /api/reports/compare -> proxy to backend `/api/reports/compare`
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Basic auth check: require authenticated user unless mock auth is enabled
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } catch {
      if (!isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    // Validate and normalize expected params
    const params = Object.fromEntries(searchParams.entries())

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const startA = params['start_date_a']
    const endA = params['end_date_a']
    const startB = params['start_date_b']
    const endB = params['end_date_b']
    if (startA && !dateRegex.test(String(startA))) {
      return NextResponse.json({ error: 'Formato inválido en "start_date_a" (YYYY-MM-DD)' }, { status: 400 })
    }
    if (endA && !dateRegex.test(String(endA))) {
      return NextResponse.json({ error: 'Formato inválido en "end_date_a" (YYYY-MM-DD)' }, { status: 400 })
    }
    if (startB && !dateRegex.test(String(startB))) {
      return NextResponse.json({ error: 'Formato inválido en "start_date_b" (YYYY-MM-DD)' }, { status: 400 })
    }
    if (endB && !dateRegex.test(String(endB))) {
      return NextResponse.json({ error: 'Formato inválido en "end_date_b" (YYYY-MM-DD)' }, { status: 400 })
    }

    const allowedDimensions = new Set(['overall', 'product', 'category'])
    const allowedGroupBy = new Set(['day', 'month'])
    const dimension = params['dimension'] || 'overall'
    const groupBy = params['groupBy'] || 'day'
    const details = params['details']
    if (dimension && !allowedDimensions.has(String(dimension))) {
      return NextResponse.json({ error: 'Parámetro "dimension" inválido' }, { status: 400 })
    }
    if (groupBy && !allowedGroupBy.has(String(groupBy))) {
      return NextResponse.json({ error: 'Parámetro "groupBy" inválido' }, { status: 400 })
    }
    if (details && !['true', 'false', '1', '0'].includes(String(details))) {
      return NextResponse.json({ error: 'Parámetro "details" inválido (true/false)' }, { status: 400 })
    }

    // Forward query params as-is; backend expects the same names
    const { data } = await api.get('/reports/compare', { params })
    return NextResponse.json(data)
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)

    // Safe dev fallback: empty comparison structures
    const isDev = process.env.NODE_ENV !== 'production'
    if (isDev && (status === 500 || status === 0)) {
      const payload = {
        periodA: {
          summary: { totalOrders: 0, totalRevenue: 0, totalProfit: 0, averageOrderValue: 0, profitMargin: 0 },
          byDate: [],
          byCategory: undefined,
          byProduct: undefined,
        },
        periodB: {
          summary: { totalOrders: 0, totalRevenue: 0, totalProfit: 0, averageOrderValue: 0, profitMargin: 0 },
          byDate: [],
          byCategory: undefined,
          byProduct: undefined,
        },
        deltas: {
          ordersChangePct: 0,
          revenueChangePct: 0,
          profitChangePct: 0,
        }
      }
      return NextResponse.json(
        { success: true, data: payload, message: 'Reporte comparativo vacío (fallback desarrollo)' },
        { status: 200, headers: { 'X-Data-Source': 'mock' } }
      )
    }

    return NextResponse.json(
      { error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details },
      { status }
    )
  }
}