import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import api from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    const canUseSupabase = typeof (supabase as any).from === 'function'
    const canQuery = canUseSupabase && !!user && !userError

    // En modo mock o sin Supabase, usar el backend para obtener estadísticas
    if (!canQuery) {
      try {
        const response = await api.get('/dashboard/stats')
        const stats = response.data.stats || response.data.data || {}
        return NextResponse.json({ success: true, stats, data: stats, count: (stats.transaction_count || 0) })
      } catch (err) {
        // Fallback seguro: estadísticas vacías
        const empty = { total_sales: 0, transaction_count: 0, average_ticket: 0 }
        return NextResponse.json({ success: true, stats: empty, data: empty, count: 0 })
      }
    }

    // Supabase configurado: obtener ventas y calcular estadísticas
    const { data: sales, error } = await (supabase as any)
      .from('sales')
      .select(`
        id,
        total,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching sales stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sales statistics', details: error.message },
        { status: 500 }
      )
    }

    const totalSales = (sales ?? []).reduce(
      (sum: number, sale: { total?: number }) => sum + (sale.total ?? 0),
      0
    )
    const transactionCount = sales?.length || 0
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0

    return NextResponse.json({
      success: true,
      stats: {
        total_sales: totalSales,
        transaction_count: transactionCount,
        average_ticket: averageTicket
      },
      data: sales || [],
      count: transactionCount
    })

  } catch (error) {
    console.error('Unexpected error in sales-stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}