import { createAdminClient } from '@/lib/supabase/server'
import { getCanonicalPlanAliases, getCanonicalPlanDisplayName, normalizePlanCode, normalizePlanSlug } from '@/lib/plan-catalog'
import { logAudit } from '@/app/api/admin/_utils/audit'

type BillingCycle = 'monthly' | 'yearly'

type PlanRecord = {
  id: string
  name: string
  slug: string
  features?: string[] | null
  price_monthly?: number | null
  price_yearly?: number | null
  max_users?: number | null
  max_products?: number | null
  max_transactions_per_month?: number | null
  max_locations?: number | null
  description?: string | null
  currency?: string | null
  trial_days?: number | null
}

type OrganizationRecord = {
  id: string
  name: string
  slug: string
  subscription_plan?: string | null
  subscription_status?: string | null
  settings?: Record<string, unknown> | null
  created_at: string
  updated_at?: string
}

type SaasSubscriptionRecord = {
  id: string
  organization_id: string
  status?: string | null
  billing_cycle?: string | null
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

type PlanSubscriptionRecord = {
  id: string
  company_id: string
  plan_type?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean | null
}

export type SubscriptionResponse = {
  id: string
  organizationId: string
  plan: {
    id: string
    name: string
    slug: string
    priceMonthly: number
    priceYearly: number
    features: string[]
    limits: {
      maxUsers: number
      maxProducts: number
      maxTransactionsPerMonth: number
      maxLocations: number
    }
    description?: string | null
    currency: string
    trialDays: number
  }
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'suspended'
  billingCycle: BillingCycle
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  daysUntilRenewal: number
  createdAt: string
  isOrgAdmin: boolean
}

export type SubscriptionSnapshot = {
  organization: OrganizationRecord
  plan: PlanRecord
  billingCycle: BillingCycle
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  subscriptionStatus: string | null
  planSubscriptionId: string | null
}

export type SubscriptionReconcileResult = {
  reconciled: boolean
  branchPolicy: {
    primaryBranchId: string | null
    deactivatedBranchIds: string[]
  } | null
}

const USAGE_FEATURES = [
  { key: 'users', planColumn: 'max_users' },
  { key: 'products', planColumn: 'max_products' },
  { key: 'monthly_transactions', planColumn: 'max_transactions_per_month' },
  { key: 'locations', planColumn: 'max_locations' },
] as const

function getBillingCycle(settings?: Record<string, unknown> | null): BillingCycle {
  return settings?.billingCycle === 'yearly' ? 'yearly' : 'monthly'
}

function addBillingPeriod(startAt: Date, cycle: BillingCycle) {
  const end = new Date(startAt)
  if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1)
  else end.setMonth(end.getMonth() + 1)
  return end
}

function normalizeIsoDate(value?: string | null, fallback?: string | null) {
  const candidate = value || fallback
  if (!candidate) {
    return new Date().toISOString()
  }

  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) {
    return fallback || new Date().toISOString()
  }

  return parsed.toISOString()
}

function normalizeStatus(status?: string | null): SubscriptionResponse['status'] {
  const value = String(status || '').toUpperCase()
  if (value === 'CANCELLED' || value === 'CANCELED') return 'cancelled'
  if (value === 'PAST_DUE') return 'past_due'
  if (value === 'TRIAL' || value === 'TRIALING') return 'trialing'
  if (value === 'SUSPENDED') return 'suspended'
  return 'active'
}

function normalizePlanTypeForRestrictions(planSlug: string) {
  return normalizePlanSlug(planSlug)
}

export async function getPlanRecord(planIdOrSlug?: string | null) {
  const adminClient = await createAdminClient()
  const raw = String(planIdOrSlug || '').trim()
  if (!raw) {
    const { data } = await adminClient
      .from('saas_plans')
      .select('*')
      .eq('slug', 'free')
      .single()
    return data as PlanRecord | null
  }

  let query = adminClient.from('saas_plans').select('*')
  if (/^[0-9a-f-]{36}$/i.test(raw)) {
    query = query.eq('id', raw)
  } else {
    query = query.in('slug', getCanonicalPlanAliases(raw))
  }

  const { data } = await query
  const plans = (data || []) as PlanRecord[]
  const preferred = plans.sort((a, b) => {
    const aliases = getCanonicalPlanAliases(raw)
    return aliases.indexOf(a.slug) - aliases.indexOf(b.slug)
  })[0]
  return (preferred || null) as PlanRecord | null
}

export async function syncOrganizationSubscriptionState(params: {
  organization: OrganizationRecord
  plan: PlanRecord
  billingCycle: BillingCycle
}) {
  const adminClient = await createAdminClient()
  const { organization, plan, billingCycle } = params
  const now = new Date()
  const startDateTime = now.toISOString()
  const endDateTime = addBillingPeriod(now, billingCycle).toISOString()
  const startDate = startDateTime.split('T')[0]
  const endDate = endDateTime.split('T')[0]
  const normalizedPlanCode = normalizePlanCode(plan.slug)
  const normalizedPlanSlug = normalizePlanSlug(plan.slug)

  const nextSettings = {
    ...(organization.settings || {}),
    billingCycle,
    lastPlanChange: now.toISOString(),
  }

  const { error: organizationError } = await adminClient
    .from('organizations')
    .update({
      subscription_plan: normalizedPlanCode,
      subscription_status: 'ACTIVE',
      settings: nextSettings,
      updated_at: now.toISOString(),
    })
    .eq('id', organization.id)

  if (organizationError) {
    throw new Error(organizationError.message)
  }

  const { data: saasSubscription, error: saasSubscriptionError } = await adminClient
    .from('saas_subscriptions')
    .upsert({
      organization_id: organization.id,
      plan_id: plan.id,
      status: 'ACTIVE',
      billing_cycle: billingCycle,
      current_period_start: startDateTime,
      current_period_end: endDateTime,
      cancel_at_period_end: false,
      updated_at: now.toISOString(),
    }, { onConflict: 'organization_id' })
    .select('id')
    .single()

  if (saasSubscriptionError) {
    throw new Error(saasSubscriptionError.message)
  }

  let planSubscriptionId: string | null = null
  try {
    const { data: companyRow, error: companyLookupError } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', organization.id)
      .maybeSingle()

    if (!companyLookupError && companyRow?.id) {
      const { data: activeSub, error: activeLookupError } = await adminClient
        .from('plan_subscriptions')
        .select('id')
        .eq('company_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!activeLookupError && activeSub?.id) {
        const { error: updateError } = await adminClient
          .from('plan_subscriptions')
          .update({
            plan_type: normalizePlanTypeForRestrictions(normalizedPlanSlug),
            start_date: startDate,
            end_date: endDate,
            is_active: true,
          })
          .eq('id', activeSub.id)

        if (!updateError) {
          planSubscriptionId = activeSub.id
        }
      }

      if (!planSubscriptionId) {
        const { data: inserted, error: insertError } = await adminClient
          .from('plan_subscriptions')
          .insert({
            company_id: organization.id,
            plan_type: normalizePlanTypeForRestrictions(normalizedPlanSlug),
            start_date: startDate,
            end_date: endDate,
            is_active: true,
          })
          .select('id')
          .single()

        if (!insertError && inserted?.id) {
          planSubscriptionId = inserted.id
        }
      }

      if (planSubscriptionId) {
        for (const feature of USAGE_FEATURES) {
          const limitValue = Number((plan as any)?.[feature.planColumn] ?? 0) || 0
          await adminClient
            .from('usage_limits')
            .upsert({
              subscription_id: planSubscriptionId,
              feature_type: feature.key,
              limit_value: limitValue <= 0 ? 999999 : limitValue,
              period: billingCycle,
              reset_date: endDate,
            }, { onConflict: 'subscription_id,feature_type' })
        }
      }
    }
  } catch {
    planSubscriptionId = null
  }

  return {
    saasSubscriptionId: saasSubscription?.id || null,
    planSubscriptionId,
    billingCycle,
    currentPeriodStart: startDateTime,
    currentPeriodEnd: endDateTime,
    settings: nextSettings,
  }
}

export async function getSubscriptionSnapshot(organizationId: string): Promise<SubscriptionSnapshot> {
  const adminClient = await createAdminClient()

  const [organizationResult, saasSubscriptionResult, planSubscriptionResult] = await Promise.all([
    adminClient
      .from('organizations')
      .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at')
      .eq('id', organizationId)
      .single(),
    adminClient
      .from('saas_subscriptions')
      .select('id,organization_id,status,billing_cycle,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at')
      .eq('organization_id', organizationId)
      .maybeSingle(),
    adminClient
      .from('plan_subscriptions')
      .select('id,company_id,plan_type,start_date,end_date,is_active')
      .eq('company_id', organizationId)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  if (organizationResult.error || !organizationResult.data) {
    throw new Error(organizationResult.error?.message || 'Organizacion no encontrada')
  }

  const organization = organizationResult.data as OrganizationRecord
  const saasSubscription = (saasSubscriptionResult.data || null) as SaasSubscriptionRecord | null
  const planSubscription = (planSubscriptionResult.data || null) as PlanSubscriptionRecord | null
  const plan = await getPlanRecord(
    organization.subscription_plan ||
    planSubscription?.plan_type ||
    'free'
  )

  if (!plan) {
    throw new Error('Plan no encontrado')
  }

  const billingCycle = saasSubscription?.billing_cycle === 'yearly'
    ? 'yearly'
    : planSubscription && saasSubscription?.billing_cycle !== 'yearly' && getBillingCycle(organization.settings) === 'yearly'
      ? 'yearly'
      : getBillingCycle(organization.settings)

  const fallbackStart = normalizeIsoDate(
    saasSubscription?.created_at ||
    planSubscription?.start_date ||
    organization.created_at,
    organization.created_at
  )
  const fallbackEnd = addBillingPeriod(new Date(fallbackStart), billingCycle).toISOString()

  return {
    organization,
    plan,
    billingCycle,
    currentPeriodStart: normalizeIsoDate(
      saasSubscription?.current_period_start || planSubscription?.start_date,
      fallbackStart
    ),
    currentPeriodEnd: normalizeIsoDate(
      saasSubscription?.current_period_end || planSubscription?.end_date,
      fallbackEnd
    ),
    cancelAtPeriodEnd: Boolean(saasSubscription?.cancel_at_period_end),
    subscriptionStatus: saasSubscription?.status || organization.subscription_status || null,
    planSubscriptionId: planSubscription?.id || null,
  }
}

async function enforceActiveBranchLimit(params: {
  adminClient: Awaited<ReturnType<typeof createAdminClient>>
  organizationId: string
  allowedActiveBranches: number
  preferredPrimaryBranchId?: string | null
}): Promise<{ primaryBranchId: string | null; deactivatedBranchIds: string[] }> {
  const { adminClient, organizationId, allowedActiveBranches, preferredPrimaryBranchId } = params

  const { data, error } = await adminClient
    .from('branches')
    .select('id,is_active,created_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  const active = (data || []) as Array<{ id: string; created_at: string | null }>
  if (active.length <= allowedActiveBranches) {
    return { primaryBranchId: active[0]?.id ?? null, deactivatedBranchIds: [] }
  }

  const preferred = preferredPrimaryBranchId
    ? active.find((row) => row.id === preferredPrimaryBranchId)?.id ?? null
    : null
  const primaryBranchId = preferred ?? active[0]?.id ?? null
  const toDeactivate = active.filter((row) => row.id !== primaryBranchId).map((row) => row.id)

  if (!toDeactivate.length) {
    return { primaryBranchId, deactivatedBranchIds: [] }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await adminClient
    .from('branches')
    .update({ is_active: false, updated_at: now })
    .in('id', toDeactivate)
    .eq('organization_id', organizationId)

  if (updateError) throw new Error(updateError.message)

  return { primaryBranchId, deactivatedBranchIds: toDeactivate }
}

export async function reconcileExpiredSubscription(params: {
  organizationId: string
  preferredPrimaryBranchId?: string | null
}): Promise<SubscriptionReconcileResult> {
  const { organizationId, preferredPrimaryBranchId } = params
  const adminClient = await createAdminClient()

  const { data: organization, error: orgError } = await adminClient
    .from('organizations')
    .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at')
    .eq('id', organizationId)
    .single()

  if (orgError || !organization) {
    throw new Error(orgError?.message || 'Organizacion no encontrada')
  }

  const { data: sub } = await adminClient
    .from('saas_subscriptions')
    .select('id,organization_id,status,billing_cycle,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const currentPlanSlug = normalizePlanSlug(String(organization.subscription_plan || 'free'))
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null
  const periodEnded = periodEnd ? periodEnd.getTime() <= Date.now() : false
  const status = String(sub?.status || organization.subscription_status || '').toUpperCase()
  const cancelAtEnd = Boolean(sub?.cancel_at_period_end)
  const nonActive = ['PAST_DUE', 'SUSPENDED', 'CANCELLED', 'CANCELED', 'EXPIRED'].includes(status)

  if (currentPlanSlug === 'free') {
    return { reconciled: false, branchPolicy: null }
  }

  if (!periodEnded) {
    return { reconciled: false, branchPolicy: null }
  }

  if (!cancelAtEnd && !nonActive) {
    return { reconciled: false, branchPolicy: null }
  }

  const freePlan = await getPlanRecord('free')
  if (!freePlan) {
    throw new Error('Plan free no encontrado')
  }

  const billingCycle = sub?.billing_cycle === 'yearly' ? 'yearly' : getBillingCycle(organization.settings as any)

  await syncOrganizationSubscriptionState({
    organization: organization as any,
    plan: freePlan,
    billingCycle,
  })

  const branchPolicy = await enforceActiveBranchLimit({
    adminClient,
    organizationId,
    allowedActiveBranches: 1,
    preferredPrimaryBranchId,
  })

  logAudit('subscription.auto_downgraded_to_free', {
    entityType: 'SUBSCRIPTION',
    entityId: organizationId,
    organizationId,
    previousPlan: organization.subscription_plan,
    previousStatus: organization.subscription_status,
    saasStatus: sub?.status || null,
    cancelAtPeriodEnd: cancelAtEnd,
    currentPeriodEnd: sub?.current_period_end || null,
    deactivatedBranches: branchPolicy.deactivatedBranchIds.length,
    primaryBranchId: branchPolicy.primaryBranchId,
  })

  return { reconciled: true, branchPolicy }
}

export function buildSubscriptionResponse(params: {
  organization: OrganizationRecord
  plan: PlanRecord
  billingCycle: BillingCycle
  currentPeriodStart: string
  currentPeriodEnd: string
  isOrgAdmin: boolean
  cancelAtPeriodEnd?: boolean
  statusOverride?: string | null
}) {
  const {
    organization,
    plan,
    billingCycle,
    currentPeriodStart,
    currentPeriodEnd,
    isOrgAdmin,
    cancelAtPeriodEnd = false,
    statusOverride,
  } = params
  const endDate = new Date(currentPeriodEnd)
  const daysUntilRenewal = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return {
    id: organization.id,
    organizationId: organization.id,
    plan: {
      id: plan.id,
      name: getCanonicalPlanDisplayName(plan.slug),
      slug: normalizePlanSlug(plan.slug),
      priceMonthly: Number(plan.price_monthly || 0),
      priceYearly: Number(plan.price_yearly || 0),
      features: Array.isArray(plan.features) ? plan.features.map(String) : [],
      limits: {
        maxUsers: Number(plan.max_users || 0) || 1,
        maxProducts: Number(plan.max_products || 0) || 20,
        maxTransactionsPerMonth: Number(plan.max_transactions_per_month || 0) || 50,
        maxLocations: Number(plan.max_locations || 0) || 1,
      },
      description: plan.description || null,
      currency: plan.currency || 'PYG',
      trialDays: Number(plan.trial_days || 0),
    },
    status: normalizeStatus(statusOverride || organization.subscription_status),
    billingCycle,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    daysUntilRenewal,
    createdAt: organization.created_at,
    isOrgAdmin,
  } satisfies SubscriptionResponse
}

export async function getUsageSnapshot(organizationId: string) {
  const adminClient = await createAdminClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const safeCount = async (table: string, builder: (query: any) => any) => {
    try {
      const query = builder(
        adminClient.from(table).select('id', { count: 'exact', head: true })
      )
      const { count } = await query
      return count || 0
    } catch {
      return 0
    }
  }

  const [users, products, locations, transactions] = await Promise.all([
    safeCount('organization_members', (query) => query.eq('organization_id', organizationId)),
    safeCount('products', (query) => query.eq('organization_id', organizationId)),
    safeCount('branches', (query) => query.eq('organization_id', organizationId)),
    safeCount('sales', (query) => query.eq('organization_id', organizationId).gte('created_at', startOfMonth.toISOString())),
  ])

  return { users, products, locations: locations || 1, transactions }
}
