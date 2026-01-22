import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null
    try {
      supabase = createAdminClient()
    } catch (e) {
      // Fallback seguro: estadísticas vacías cuando Supabase no está configurado
      const today = new Date().toISOString().split('T')[0]
      const stats = {
        total_sales: 0,
        transaction_count: 0,
        average_ticket: 0,
        top_selling_product: null,
        total_tax: 0,
        total_discount: 0,
        total_subtotal: 0,
        sales_by_payment_method: {
          cash: 0,
          card: 0,
          transfer: 0
        },
        period: 'today',
        date: today
      }
      return NextResponse.json({ success: true, stats, data: stats, raw_sales: [] })
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's sales statistics
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        created_at
      `)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)

    if (salesError) {
      console.error('Error fetching today sales stats:', salesError)
      return NextResponse.json(
        { error: 'Failed to fetch sales statistics', details: salesError.message },
        { status: 500 }
      )
    }

    // Calculate statistics
    const totalSales = (sales ?? []).reduce(
      (sum: number, sale: { total?: number }) => sum + (sale.total ?? 0),
      0
    )
    const transactionCount = sales?.length || 0
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0

    // For now, we'll provide basic stats since we don't have detailed sales data
    const stats = {
      total_sales: totalSales,
      transaction_count: transactionCount,
      average_ticket: averageTicket,
      top_selling_product: null, // Would need sales_items table to calculate
      total_tax: 0, // Would need detailed tax calculations
      total_discount: 0, // Would need discount information
      total_subtotal: totalSales, // Assuming total includes everything for now
      sales_by_payment_method: {
        cash: totalSales, // Default to cash for now
        card: 0,
        transfer: 0
      },
      period: 'today',
      date: today
    }

    return NextResponse.json({
      success: true,
      stats,
      data: stats,
      raw_sales: sales || []
    })

  } catch (error) {
    console.error('Unexpected error in sales-stats/today API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}