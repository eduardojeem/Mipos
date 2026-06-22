import { NextResponse } from 'next/server'
import { getSubscriptionSnapshot, resolveSubscriptionPlanLimits } from '@/app/api/subscription/_lib'
import { getCanonicalFeatureLabel, sanitizePlanFeatures } from '@/lib/plan-catalog'

export type PlanEntitlements = {
  planName: string
  features: Set<string>
  limits: {
    maxUsers: number
    maxProducts: number
    maxTransactionsPerMonth: number
    maxLocations: number
    maxServices: number
    maxAppointmentsPerMonth: number
    maxStaff: number
  }
}

export async function getPlanEntitlements(organizationId: string): Promise<PlanEntitlements> {
  const snapshot = await getSubscriptionSnapshot(organizationId)
  const limits = resolveSubscriptionPlanLimits(snapshot.plan)

  return {
    planName: snapshot.plan.name || snapshot.plan.slug,
    features: new Set(sanitizePlanFeatures(snapshot.plan.features || [], snapshot.plan.slug)),
    limits: {
      maxUsers: limits.maxUsers,
      maxProducts: limits.maxProducts,
      maxTransactionsPerMonth: limits.maxTransactionsPerMonth,
      maxLocations: limits.maxLocations,
      maxServices: limits.maxServices,
      maxAppointmentsPerMonth: limits.maxAppointmentsPerMonth,
      maxStaff: limits.maxStaff,
    },
  }
}

export function hasPlanFeature(entitlements: PlanEntitlements, feature: string) {
  return entitlements.features.has(feature)
}

export function isPlanLimitReached(currentUsage: number, limit: number) {
  if (limit < 0 || limit >= 999999) return false
  return currentUsage >= limit
}

/**
 * Guard de feature server-side. Devuelve un NextResponse 403 si el plan de la
 * organización no incluye la feature, o `null` si está habilitada.
 *
 *   const denied = await requirePlanFeature(orgId, 'advanced_reports')
 *   if (denied) return denied
 */
export async function requirePlanFeature(
  organizationId: string,
  feature: string,
): Promise<NextResponse | null> {
  const entitlements = await getPlanEntitlements(organizationId)
  if (entitlements.features.has(feature)) return null
  return NextResponse.json(
    {
      error: `"${getCanonicalFeatureLabel(feature)}" no esta incluido en tu plan. Actualiza el plan para habilitarlo.`,
      code: 'PLAN_FEATURE_REQUIRED',
      feature,
    },
    { status: 403 },
  )
}
