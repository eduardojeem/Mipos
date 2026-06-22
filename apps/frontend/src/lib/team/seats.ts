import type { createAdminClient } from '@/lib/supabase/server'

const UNLIMITED_SENTINEL = 999999

export type SeatUsage = {
  used: number
  limit: number
  unlimited: boolean
  available: number
  activeMembers: number
  pendingInvites: number
}

/**
 * Asientos del plan: miembros ACTIVE + invitaciones PENDING, contra el límite
 * `maxUsers` del plan de la organización. `limit` >= 999999 (o <= 0) = ilimitado.
 *
 * Optimización: en vez de cargar el snapshot completo de suscripción (3-4 queries),
 * resolvemos el límite de usuarios con una sola query ligera a organizations + saas_plans.
 */
export async function getSeatUsage(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  orgId: string,
): Promise<SeatUsage> {
  // Todas las queries en paralelo para minimizar latencia
  const [{ count: activeMembers }, { count: pendingInvites }, planLimit] = await Promise.all([
    (admin as any).from('organization_members').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'ACTIVE'),
    (admin as any).from('invitations').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('status', 'PENDING'),
    resolveMaxUsers(admin, orgId),
  ])

  const used = (activeMembers || 0) + (pendingInvites || 0)
  const limit = planLimit
  const unlimited = !Number.isFinite(limit) || limit >= UNLIMITED_SENTINEL || limit <= 0

  return {
    used,
    limit,
    unlimited,
    available: unlimited ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
    activeMembers: activeMembers || 0,
    pendingInvites: pendingInvites || 0,
  }
}

/**
 * Resuelve maxUsers del plan de la org en 1-2 queries ligeras (vs 5+ del snapshot completo).
 */
async function resolveMaxUsers(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  orgId: string,
): Promise<number> {
  try {
    // Intento rápido: saas_subscriptions → saas_plans.limits
    const { data: sub } = await (admin as any)
      .from('saas_subscriptions')
      .select('plan:saas_plans(limits)')
      .eq('organization_id', orgId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (sub?.plan?.limits) {
      const limits = sub.plan.limits as Record<string, unknown>
      const maxUsers = Number(limits.maxUsers || limits.max_users || 0)
      if (maxUsers > 0) return maxUsers
    }

    // Fallback: organizations.subscription_plan → buscar plan por slug
    const { data: org } = await (admin as any)
      .from('organizations')
      .select('subscription_plan')
      .eq('id', orgId)
      .maybeSingle()

    if (org?.subscription_plan) {
      const { data: plan } = await (admin as any)
        .from('saas_plans')
        .select('limits')
        .or(`slug.eq.${org.subscription_plan.toLowerCase()},name.ilike.${org.subscription_plan}`)
        .maybeSingle()

      if (plan?.limits) {
        const limits = plan.limits as Record<string, unknown>
        const maxUsers = Number(limits.maxUsers || limits.max_users || 0)
        if (maxUsers > 0) return maxUsers
      }
    }

    return UNLIMITED_SENTINEL
  } catch {
    return UNLIMITED_SENTINEL
  }
}
