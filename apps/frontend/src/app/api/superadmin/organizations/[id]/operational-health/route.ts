import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { getSubscriptionSnapshot, getUsageSnapshot } from '@/app/api/subscription/_lib'

type HealthStatus = 'ok' | 'warn' | 'critical' | 'na'

function clampDays(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 30
  return Math.min(90, Math.max(1, Math.round(n)))
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000))
}

function normalizeBillingStatus(status: string | null | undefined): 'active' | 'trialing' | 'past_due' | 'suspended' | 'canceled' | 'unknown' {
  const value = String(status || '').toLowerCase()
  if (value === 'active') return 'active'
  if (value === 'trialing') return 'trialing'
  if (value === 'past_due') return 'past_due'
  if (value === 'suspended') return 'suspended'
  if (value === 'cancelled' || value === 'canceled') return 'canceled'
  if (value === 'expired') return 'canceled'
  return 'unknown'
}

function billingTone(status: ReturnType<typeof normalizeBillingStatus>): HealthStatus {
  if (status === 'active' || status === 'trialing') return 'ok'
  if (status === 'past_due') return 'warn'
  if (status === 'suspended' || status === 'canceled') return 'critical'
  return 'na'
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
    const url = new URL(request.url)
    const windowDays = clampDays(url.searchParams.get('windowDays'))

    const admin = await createAdminClient()
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() - windowDays)

    const [orgRow, subRow, usage, snapshot] = await Promise.all([
      admin
        .from('organizations')
        .select('id,created_at,subscription_plan,subscription_status')
        .eq('id', id)
        .single(),
      admin
        .from('saas_subscriptions')
        .select('status,cancel_at_period_end,current_period_end')
        .eq('organization_id', id)
        .maybeSingle(),
      getUsageSnapshot(id),
      getSubscriptionSnapshot(id),
    ])

    if (orgRow.error || !orgRow.data) {
      return NextResponse.json({ error: orgRow.error?.message || 'Organización no encontrada' }, { status: 404 })
    }

    const billingStatus = normalizeBillingStatus(subRow.data?.status || snapshot.subscriptionStatus || orgRow.data.subscription_status)
    const currentPeriodEnd = subRow.data?.current_period_end || snapshot.currentPeriodEnd || null
    const cancelAtPeriodEnd = Boolean(subRow.data?.cancel_at_period_end || snapshot.cancelAtPeriodEnd)

    const lastSaleResult = await admin
      .from('sales')
      .select('created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastAuditResult = await admin
      .from('audit_logs')
      .select('created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const auditCountResult = await admin
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', id)
      .gte('created_at', windowStart.toISOString())

    const lastSaleAt = lastSaleResult.data?.created_at ? new Date(lastSaleResult.data.created_at) : null
    const lastAuditAt = lastAuditResult.data?.created_at ? new Date(lastAuditResult.data.created_at) : null
    const lastActivityAt =
      lastSaleAt && lastAuditAt
        ? (lastSaleAt.getTime() >= lastAuditAt.getTime() ? lastSaleAt : lastAuditAt)
        : (lastSaleAt || lastAuditAt)

    const orgCreatedAt = orgRow.data.created_at ? new Date(orgRow.data.created_at) : null
    const inactivityDays = lastActivityAt ? daysBetween(now, lastActivityAt) : null
    const orgAgeDays = orgCreatedAt ? daysBetween(now, orgCreatedAt) : null

    let activityStatus: HealthStatus = 'na'
    let activityValue = 'Sin actividad'
    if (inactivityDays !== null) {
      activityValue = `Última actividad hace ${inactivityDays} día(s)`
      activityStatus = inactivityDays > 30 ? 'critical' : inactivityDays > 7 ? 'warn' : 'ok'
    } else if (orgAgeDays !== null) {
      activityValue = `Sin actividad registrada (${orgAgeDays} día(s) desde alta)`
      activityStatus = orgAgeDays > 30 ? 'critical' : orgAgeDays > 14 ? 'warn' : 'ok'
    }

    const cashOpenResult = await admin
      .from('cash_sessions')
      .select('opened_at,status')
      .eq('organization_id', id)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: true })

    const openSessions = (cashOpenResult.data || []) as Array<{ opened_at: string; status: string }>
    const oldestOpen = openSessions[0]?.opened_at ? new Date(openSessions[0].opened_at) : null
    const oldestOpenDays = oldestOpen ? daysBetween(now, oldestOpen) : null
    const cashStatus: HealthStatus =
      oldestOpenDays === null
        ? 'ok'
        : oldestOpenDays > 3
          ? 'critical'
          : oldestOpenDays > 1
            ? 'warn'
            : 'ok'
    const cashValue =
      openSessions.length === 0
        ? 'Sin cajas abiertas'
        : `Cajas abiertas: ${openSessions.length} (más antigua: ${oldestOpenDays ?? 0} día(s))`

    const limitUsers = normalizeLimitValue(snapshot.plan.limits.maxUsers)
    const limitProducts = normalizeLimitValue(snapshot.plan.limits.maxProducts)
    const limitLocations = normalizeLimitValue(snapshot.plan.limits.maxLocations)
    const limitTransactions = normalizeLimitValue(snapshot.plan.limits.maxTransactionsPerMonth)

    const usageMetrics = [
      { key: 'users', label: 'Usuarios', used: Number(usage.users || 0), limit: limitUsers },
      { key: 'products', label: 'Productos', used: Number(usage.products || 0), limit: limitProducts },
      { key: 'locations', label: 'Sucursales', used: Number(usage.locations || 0), limit: limitLocations },
      { key: 'monthly_transactions', label: 'Transacciones', used: Number(usage.transactions || 0), limit: limitTransactions },
    ].map((m) => {
      const isUnlimited = m.limit >= 999999
      const percentage = isUnlimited ? 0 : Math.min(100, Math.round((m.used / Math.max(m.limit, 1)) * 100))
      return { ...m, isUnlimited, percentage }
    })

    const constrained = usageMetrics.filter((m) => !m.isUnlimited)
    const maxMetric = constrained.sort((a, b) => b.percentage - a.percentage)[0] || null
    const pressureStatus: HealthStatus =
      !maxMetric ? 'na' : maxMetric.percentage >= 90 ? 'critical' : maxMetric.percentage >= 70 ? 'warn' : 'ok'
    const pressureValue =
      !maxMetric ? 'Sin límites definidos' : `Máximo ${maxMetric.percentage}% (${maxMetric.label})`

    return NextResponse.json({
      success: true,
      data: {
        organizationId: id,
        updatedAt: new Date().toISOString(),
        indicators: [
          {
            key: 'billing_status',
            label: 'Estado de facturación',
            status: billingTone(billingStatus),
            valueText: `${billingStatus}${cancelAtPeriodEnd ? ' (cancelación fin de período)' : ''}${currentPeriodEnd ? ` · fin: ${currentPeriodEnd}` : ''}`,
            source: {
              tableOrView: 'saas_subscriptions / organizations',
              filters: [`organization_id = ${id}`],
              calculation: 'status + cancel_at_period_end + current_period_end (fallbacks)',
            },
          },
          {
            key: 'last_activity',
            label: 'Actividad reciente',
            status: activityStatus,
            valueText: activityValue,
            source: {
              tableOrView: 'sales + audit_logs',
              filters: [`organization_id = ${id}`],
              calculation: 'MAX(sales.created_at, audit_logs.created_at)',
            },
          },
          {
            key: 'cash_sessions',
            label: 'Caja',
            status: cashStatus,
            valueText: cashValue,
            source: {
              tableOrView: 'cash_sessions',
              filters: [`organization_id = ${id}`, "status = 'OPEN'"],
              calculation: 'COUNT(open sessions) + MIN(opened_at)',
            },
          },
          {
            key: 'usage_pressure',
            label: 'Presión de límites',
            status: pressureStatus,
            valueText: pressureValue,
            source: {
              tableOrView: 'subscription plan limits + live usage',
              filters: [`organization_id = ${id}`],
              calculation: 'MAX(used/limit) sobre métricas con límite',
            },
          },
          {
            key: 'audit_activity',
            label: `Auditoría (${windowDays}d)`,
            status: 'ok',
            valueText: `${auditCountResult.count || 0} evento(s)`,
            source: {
              tableOrView: 'audit_logs',
              filters: [`organization_id = ${id}`, `created_at >= ${windowStart.toISOString()}`],
              calculation: 'COUNT(*)',
            },
          },
        ],
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

