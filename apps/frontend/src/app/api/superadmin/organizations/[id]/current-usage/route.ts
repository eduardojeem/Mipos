import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { getSubscriptionSnapshot, getUsageSnapshot } from '@/app/api/subscription/_lib'

function monthWindow(now = new Date()) {
  const start = new Date(now)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return { start, end }
}

function normalizeLimitValue(value: unknown) {
  const parsed = Number(value || 0)
  if (!Number.isFinite(parsed) || parsed <= 0) return 999999
  return parsed
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertSuperAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const { id } = await params

    const snapshot = await getSubscriptionSnapshot(id)
    const usage = await getUsageSnapshot(id)
    const { start, end } = monthWindow()

    const limitUsers = normalizeLimitValue(snapshot.plan.limits.maxUsers)
    const limitProducts = normalizeLimitValue(snapshot.plan.limits.maxProducts)
    const limitLocations = normalizeLimitValue(snapshot.plan.limits.maxLocations)
    const limitTransactions = normalizeLimitValue(snapshot.plan.limits.maxTransactionsPerMonth)

    return NextResponse.json({
      success: true,
      data: {
        organizationId: id,
        plan: {
          slug: snapshot.plan.slug,
          name: snapshot.plan.name,
          billingCycle: snapshot.billingCycle,
        },
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        metrics: [
          {
            key: 'users',
            label: 'Usuarios',
            used: Number(usage.users || 0),
            limit: limitUsers,
            unit: 'count' as const,
            source: {
              tableOrView: 'organization_members',
              filters: [`organization_id = ${id}`],
              aggregation: 'COUNT(*)',
            },
          },
          {
            key: 'products',
            label: 'Productos',
            used: Number(usage.products || 0),
            limit: limitProducts,
            unit: 'count' as const,
            source: {
              tableOrView: 'products',
              filters: [`organization_id = ${id}`],
              aggregation: 'COUNT(*)',
            },
          },
          {
            key: 'locations',
            label: 'Sucursales',
            used: Number(usage.locations || 0),
            limit: limitLocations,
            unit: 'count' as const,
            source: {
              tableOrView: 'branches',
              filters: [`organization_id = ${id}`],
              aggregation: 'COUNT(*)',
            },
          },
          {
            key: 'monthly_transactions',
            label: 'Transacciones (mes actual)',
            used: Number(usage.transactions || 0),
            limit: limitTransactions,
            unit: 'count' as const,
            source: {
              tableOrView: 'sales',
              filters: [`organization_id = ${id}`, `created_at >= ${start.toISOString()}`],
              aggregation: 'COUNT(*)',
            },
          },
        ],
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}
