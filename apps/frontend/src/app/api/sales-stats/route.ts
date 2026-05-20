import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserOrganizationId } from '@/app/api/_utils/organization'

/**
 * GET /api/sales-stats
 *
 * Lifetime sales aggregate scoped to the authenticated user's organization.
 * Previously returned cross-org data because it never filtered by
 * organization_id.
 *
 * Note: this endpoint scans the full sales table for the org. For tenants
 * with large history, replace with a SUM() RPC / materialized view.
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

    const admin = await createAdminClient()
    const { data: sales, error } = await admin
      .from('sales')
      .select('id, total, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) {
      console.error('sales-stats: query error', error)
      return NextResponse.json(
        { error: 'Failed to fetch sales statistics' },
        { status: 500 }
      )
    }

    const rows = sales ?? []
    const totalSales = rows.reduce(
      (s: number, r: { total?: number }) => s + Number(r.total ?? 0),
      0
    )
    const transactionCount = rows.length
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0

    const stats = {
      total_sales: totalSales,
      transaction_count: transactionCount,
      average_ticket: averageTicket,
    }

    return NextResponse.json({
      success: true,
      stats,
      data: rows,
      count: transactionCount,
    })
  } catch (error) {
    console.error('sales-stats: unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
