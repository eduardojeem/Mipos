import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserOrganizationId } from '@/app/api/_utils/organization'

/**
 * GET /api/sales-stats/today
 *
 * Returns aggregated sales for *the authenticated user's organization* for
 * the current calendar day, computed in SQL.
 *
 * Security note: this route previously used the service-role admin client
 * without any auth check and without an organization filter, which leaked
 * every tenant's revenue to anonymous callers. The current implementation
 * requires an authenticated session and scopes the query to the user's org.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await getUserOrganizationId(user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    const today = new Date().toISOString().split('T')[0]
    const from = `${today}T00:00:00`
    const to = `${today}T23:59:59.999`

    // Use the admin client only AFTER resolving the org — purely to bypass
    // potentially restrictive RLS aggregation perms. Filter is enforced here.
    const admin = createAdminClient()
    const { data: sales, error: salesError } = await admin
      .from('sales')
      .select('id, total, payment_method')
      .eq('organization_id', organizationId)
      .gte('created_at', from)
      .lt('created_at', to)

    if (salesError) {
      console.error('sales-stats/today: query error', salesError)
      return NextResponse.json(
        { error: 'Failed to fetch sales statistics' },
        { status: 500 }
      )
    }

    const rows = sales ?? []
    const totalSales = rows.reduce((s: number, r: any) => s + Number(r.total ?? 0), 0)
    const transactionCount = rows.length
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0

    // Payment method breakdown — real, not hardcoded.
    const byMethod = { cash: 0, card: 0, transfer: 0, other: 0 }
    for (const r of rows as Array<{ total?: number; payment_method?: string }>) {
      const method = String(r.payment_method || '').toLowerCase()
      const amount = Number(r.total ?? 0)
      if (method === 'cash' || method === 'efectivo') byMethod.cash += amount
      else if (method === 'card' || method === 'tarjeta') byMethod.card += amount
      else if (method === 'transfer' || method === 'transferencia' || method === 'bank_transfer') byMethod.transfer += amount
      else byMethod.other += amount
    }

    const stats = {
      total_sales: totalSales,
      transaction_count: transactionCount,
      average_ticket: averageTicket,
      sales_by_payment_method: byMethod,
      period: 'today',
      date: today,
    }

    return NextResponse.json({ success: true, stats, data: stats })
  } catch (error) {
    console.error('sales-stats/today: unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
