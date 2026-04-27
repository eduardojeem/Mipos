import { NextRequest, NextResponse } from 'next/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const orgId = await getValidatedOrganizationId(request)
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not resolved' }, { status: 400 })
    }

    const admin = await createAdminClient()

    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [customers, products, todayRpc, monthSales] = await Promise.all([
      admin.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      admin.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      admin
        .rpc('get_today_sales_summary', {
          date_start: startOfDay.toISOString(),
          org_id: orgId,
        })
        .single(),
      admin
        .from('sales')
        .select('total')
        .eq('organization_id', orgId)
        .gte('created_at', startOfMonth.toISOString()),
    ])

    let todaySalesTotal = 0
    let todaySalesCount = 0
    if (!todayRpc.error && todayRpc.data) {
      const d = todayRpc.data as Record<string, unknown>
      todaySalesTotal = Number(d.total_sales || 0)
      todaySalesCount = Number(d.sales_count || 0)
    }

    const monthRows = Array.isArray(monthSales.data) ? (monthSales.data as Array<{ total?: number }>) : []
    const monthTotal = monthRows.reduce((sum, r) => sum + Number(r.total || 0), 0)

    return NextResponse.json({
      success: true,
      organizationId: orgId,
      counts: {
        customers: customers.count ?? 0,
        products: products.count ?? 0,
      },
      sales: {
        today: { total: todaySalesTotal, count: todaySalesCount },
        month: { total: monthTotal },
      },
      warnings: {
        customersQueryError: customers.error?.message || null,
        productsQueryError: products.error?.message || null,
        todayRpcError: todayRpc.error?.message || null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}

