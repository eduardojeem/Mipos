import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { getSubscriptionSnapshot, getUsageSnapshot, resolveSubscriptionPlanLimits } from '@/app/api/subscription/_lib'

type FeatureUsageKey = 'users' | 'products' | 'monthly_transactions' | 'locations'

type UsageLimitRow = {
  id: string
  feature_type: string
  limit_value: number
  current_usage: number
  period: string
  reset_date: string | null
}

const CORE_LIMITS: FeatureUsageKey[] = ['users', 'products', 'monthly_transactions', 'locations']

function usagePercentage(currentUsage: number, limitValue: number) {
  if (limitValue === 999999) return 0
  if (limitValue <= 0) return 0
  return Math.min(100, Math.round((currentUsage / limitValue) * 100))
}

async function getAuthenticatedOrganizationId(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, organizationId: null }
  }

  const organizationId = await getValidatedOrganizationId(request)
  return { user, organizationId }
}

export async function GET(request: NextRequest) {
  try {
    const { user, organizationId } = await getAuthenticatedOrganizationId(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No se encontro organizacion asociada' },
        { status: 404 }
      )
    }

    const [snapshot, liveUsage, adminClient] = await Promise.all([
      getSubscriptionSnapshot(organizationId),
      getUsageSnapshot(organizationId),
      createAdminClient(),
    ])

    let storedUsageLimits: UsageLimitRow[] = []
    if (snapshot.planSubscriptionId) {
      const { data } = await adminClient
        .from('usage_limits')
        .select('id,feature_type,limit_value,current_usage,period,reset_date')
        .eq('subscription_id', snapshot.planSubscriptionId)

      storedUsageLimits = (data || []) as UsageLimitRow[]
    }

    const liveUsageByFeature: Record<FeatureUsageKey, number> = {
      users: Number(liveUsage.users || 0),
      products: Number(liveUsage.products || 0),
      monthly_transactions: Number(liveUsage.transactions || 0),
      locations: Number(liveUsage.locations || 0),
    }

    const resolvedLimits = resolveSubscriptionPlanLimits(snapshot.plan)
    const coreLimits = CORE_LIMITS.map((feature) => {
      const limitValue = (() => {
        switch (feature) {
          case 'users':
            return resolvedLimits.maxUsers
          case 'products':
            return resolvedLimits.maxProducts
          case 'monthly_transactions':
            return resolvedLimits.maxTransactionsPerMonth
          case 'locations':
            return resolvedLimits.maxLocations
          default:
            return 999999
        }
      })()
      const currentUsage = liveUsageByFeature[feature]

      return {
        feature_type: feature,
        limit_value: limitValue,
        current_usage: currentUsage,
        period: snapshot.billingCycle,
        reset_date: snapshot.currentPeriodEnd,
        usage_percentage: usagePercentage(currentUsage, limitValue),
        is_unlimited: limitValue === 999999,
      }
    })

    const coveredFeatures = new Set(coreLimits.map((limit) => limit.feature_type))
    const extraLimits = storedUsageLimits
      .filter((limit) => !coveredFeatures.has(limit.feature_type))
      .map((limit) => ({
        ...limit,
        usage_percentage: usagePercentage(Number(limit.current_usage || 0), Number(limit.limit_value || 999999)),
        is_unlimited: Number(limit.limit_value || 999999) === 999999,
      }))

    return NextResponse.json({
      success: true,
      data: {
        plan_type: snapshot.plan.slug,
        subscription_start: snapshot.currentPeriodStart,
        subscription_end: snapshot.currentPeriodEnd,
        limits: [...coreLimits, ...extraLimits],
      },
    })
  } catch (error) {
    console.error('Error in GET /api/plan/limits:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await getAuthenticatedOrganizationId(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No se encontro organizacion asociada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const featureType = String(body?.feature_type || '').trim()
    const quantity = Math.max(1, Number(body?.quantity || 1))
    const action = body?.action === 'decrement' ? 'decrement' : 'increment'

    if (!featureType) {
      return NextResponse.json(
        { success: false, error: 'Tipo de caracteristica es requerido' },
        { status: 400 }
      )
    }

    const adminClient = await createAdminClient()
    const snapshot = await getSubscriptionSnapshot(organizationId)

    if (!snapshot.planSubscriptionId) {
      return NextResponse.json(
        { success: false, error: 'La suscripcion actual no esta sincronizada' },
        { status: 409 }
      )
    }

    const { data: currentLimit, error: limitError } = await adminClient
      .from('usage_limits')
      .select('id,feature_type,current_usage,limit_value')
      .eq('subscription_id', snapshot.planSubscriptionId)
      .eq('feature_type', featureType)
      .maybeSingle()

    if (limitError || !currentLimit) {
      return NextResponse.json(
        { success: false, error: 'No se encontro limite para esta caracteristica' },
        { status: 404 }
      )
    }

    const currentUsage = Number(currentLimit.current_usage || 0)
    const limitValue = Number(currentLimit.limit_value || 999999)

    if (action === 'increment' && limitValue !== 999999 && currentUsage + quantity > limitValue) {
      return NextResponse.json(
        { success: false, error: 'Limite de plan excedido' },
        { status: 429 }
      )
    }

    const nextUsage = action === 'increment'
      ? currentUsage + quantity
      : Math.max(0, currentUsage - quantity)

    const { error: updateError } = await adminClient
      .from('usage_limits')
      .update({
        current_usage: nextUsage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentLimit.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Error al actualizar uso' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Uso actualizado exitosamente',
    })
  } catch (error) {
    console.error('Error in POST /api/plan/limits:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
