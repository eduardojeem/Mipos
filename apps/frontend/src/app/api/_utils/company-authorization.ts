import { NextRequest } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { PLAN_FEATURES, PLANS, normalizePlan } from '@/config/plans'
import { getCanonicalPlanAliases, normalizePlanCode, normalizePlanSlug } from '@/lib/plan-catalog'
import {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  type CompanyFeatureKey,
  type CompanyPermissionKey,
} from '@/lib/company-access'

export {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  type CompanyFeatureKey,
  type CompanyPermissionKey,
} from '@/lib/company-access'

type RoleName = 'OWNER' | 'ADMIN' | 'SELLER' | 'WAREHOUSE' | 'SUPER_ADMIN' | 'UNKNOWN'

export interface CompanyAccessContext {
  userId: string
  email: string | null
  companyId: string | null
  plan: string
  role: RoleName
  isOwner: boolean
  isSuperAdmin: boolean
  permissions: string[]
  features: string[]
}

export interface CompanyAccessRequirement {
  companyId?: string | null
  permission?: CompanyPermissionKey
  feature?: CompanyFeatureKey
  allowedRoles?: RoleName[]
}

export type CompanyAccessResult =
  | { ok: true; context: CompanyAccessContext }
  | { ok: false; status: number; body: { error: string } }

function normalizeRoleName(role?: string | null, isOwner = false): RoleName {
  if (isOwner) return 'OWNER'

  const normalized = String(role || '').toUpperCase().trim()
  if (normalized === 'SUPER_ADMIN') return 'SUPER_ADMIN'
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'ADMIN' || normalized === 'MANAGER') return 'ADMIN'
  if (normalized === 'SELLER' || normalized === 'VENDEDOR' || normalized === 'CASHIER') return 'SELLER'
  if (normalized === 'WAREHOUSE' || normalized === 'DEPOSITO') return 'WAREHOUSE'
  return 'UNKNOWN'
}

function getFallbackFeatures(planName?: string | null): string[] {
  return PLANS[normalizePlanCode(planName || undefined)] || []
}

function mergeFeatureAliases(features: Iterable<string>): string[] {
  const merged = new Set<string>()

  for (const rawFeature of features) {
    const feature = String(rawFeature || '').trim()
    if (!feature) continue
    merged.add(feature)

    if (feature === 'analytics') merged.add(PLAN_FEATURES.BASIC_REPORTS)
    if (feature === PLAN_FEATURES.BASIC_REPORTS) merged.add('analytics')
    if (feature === 'multiple_branches') merged.add(PLAN_FEATURES.MULTI_BRANCH)
    if (feature === PLAN_FEATURES.MULTI_BRANCH) merged.add('multiple_branches')
  }

  return Array.from(merged)
}

async function getPlanFeatures(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  planName?: string | null
): Promise<string[]> {
  const normalizedPlan = normalizePlan(planName || undefined)
  const slugCandidates = getCanonicalPlanAliases(normalizePlanSlug(planName))

  const { data: plans } = await (adminClient as any)
    .from('saas_plans')
    .select('id,slug,features')
    .in('slug', slugCandidates)

  const planRecord = (plans || []).sort(
    (a: { slug: string }, b: { slug: string }) => slugCandidates.indexOf(a.slug) - slugCandidates.indexOf(b.slug)
  )[0]
  if (!planRecord?.id) {
    return mergeFeatureAliases(getFallbackFeatures(normalizedPlan))
  }

  const rawFeatures = new Set<string>()
  const jsonFeatures = Array.isArray(planRecord.features)
    ? planRecord.features
    : (typeof planRecord.features === 'object' && planRecord.features !== null
      ? Object.keys(planRecord.features).filter((key) => Boolean((planRecord.features as Record<string, unknown>)[key]))
      : [])

  for (const feature of jsonFeatures) {
    rawFeatures.add(String(feature))
  }

  const { data: linkedFeatures } = await (adminClient as any)
    .from('saas_plan_features')
    .select('feature:plan_features(key)')
    .eq('plan_id', planRecord.id)
    .eq('is_enabled', true)

  for (const row of linkedFeatures || []) {
    const key = (row as { feature?: { key?: string } | null }).feature?.key
    if (key) rawFeatures.add(key)
  }

  if (rawFeatures.size === 0) {
    return mergeFeatureAliases(getFallbackFeatures(normalizedPlan))
  }

  return mergeFeatureAliases(rawFeatures)
}

async function getActiveRoleNames(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  companyId?: string | null
): Promise<string[]> {
  let query = adminClient
    .from('user_roles')
    .select('organization_id, role:roles(name)')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (companyId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${companyId}`)
  }

  const { data } = await query
  return (data || [])
    .map((item: any) => String(item?.role?.name || '').toUpperCase())
    .filter(Boolean)
}

async function getPermissionsForRoleNames(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  roleNames: string[]
): Promise<string[]> {
  if (roleNames.length === 0) return []

  const { data: roles } = await adminClient
    .from('roles')
    .select('id,name')
    .in('name', roleNames)

  const roleIds = (roles || []).map((role: { id: string }) => role.id)
  if (roleIds.length === 0) return []

  const { data: permissionRows } = await adminClient
    .from('role_permissions')
    .select('permission:permissions(name,is_active)')
    .in('role_id', roleIds)

  return Array.from(new Set(
    (permissionRows || [])
      .map((row: any) => row?.permission?.is_active === false ? null : row?.permission?.name)
      .filter(Boolean)
      .map(String)
  ))
}

export async function resolveCompanyAccess(
  requirement: CompanyAccessRequirement = {}
): Promise<CompanyAccessResult> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { ok: false, status: 401, body: { error: 'No autorizado' } }
    }

    const { data: profile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const activeRoleNames = await getActiveRoleNames(adminClient, user.id, requirement.companyId)
    const metadataRole = String((user.user_metadata as Record<string, unknown> | undefined)?.role || '').toUpperCase()
    const profileRole = String((profile as { role?: string | null } | null)?.role || '').toUpperCase()
    const isSuperAdmin = [metadataRole, profileRole, ...activeRoleNames].includes('SUPER_ADMIN')

    let membershipQuery = adminClient
      .from('organization_members')
      .select(`
        organization_id,
        role_id,
        is_owner,
        organization:organizations(
          id,
          subscription_plan,
          subscription_status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (requirement.companyId) {
      membershipQuery = membershipQuery.eq('organization_id', requirement.companyId)
    }

    const { data: membership } = await membershipQuery.maybeSingle()

    if (!membership && !isSuperAdmin) {
      return { ok: false, status: 403, body: { error: 'Usuario sin empresa asignada' } }
    }

    const companyId = requirement.companyId || membership?.organization_id || null
    const planName = (membership as any)?.organization?.subscription_plan || 'FREE'

    let membershipRoleName = ''
    if (membership?.role_id) {
      const { data: membershipRole } = await adminClient
        .from('roles')
        .select('name')
        .eq('id', membership.role_id)
        .maybeSingle()
      membershipRoleName = String(membershipRole?.name || '').toUpperCase()
    }

    const role = isSuperAdmin
      ? 'SUPER_ADMIN'
      : normalizeRoleName(membershipRoleName || profileRole || metadataRole, Boolean(membership?.is_owner))

    const permissionRoleNames = Array.from(new Set([
      membershipRoleName,
      profileRole,
      metadataRole,
      ...activeRoleNames,
      role,
      role === 'SELLER' ? 'CASHIER' : '',
      role === 'ADMIN' ? 'MANAGER' : '',
    ].filter(Boolean)))

    const permissions = (isSuperAdmin || role === 'OWNER')
      ? Object.values(COMPANY_PERMISSIONS)
      : await getPermissionsForRoleNames(adminClient, permissionRoleNames)
    const features = isSuperAdmin ? mergeFeatureAliases([
      ...Object.values(COMPANY_FEATURE_KEYS),
      ...Object.values(PLAN_FEATURES),
    ]) : await getPlanFeatures(adminClient, planName)

    const roleAllowed = !requirement.allowedRoles || isSuperAdmin || requirement.allowedRoles.includes(role)
    const permissionAllowed = !requirement.permission || isSuperAdmin || permissions.includes(requirement.permission)
    const featureAllowed = !requirement.feature || isSuperAdmin || features.includes(requirement.feature)

    if (!roleAllowed || !permissionAllowed || !featureAllowed) {
      return { ok: false, status: 403, body: { error: 'Acceso denegado' } }
    }

    return {
      ok: true,
      context: {
        userId: user.id,
        email: user.email ?? null,
        companyId,
        plan: normalizePlan(planName),
        role,
        isOwner: Boolean(membership?.is_owner),
        isSuperAdmin,
        permissions,
        features,
      },
    }
  } catch {
    return { ok: false, status: 500, body: { error: 'Error interno de autorizacion' } }
  }
}

export async function requireCompanyAccess(
  _request: NextRequest,
  requirement: CompanyAccessRequirement
): Promise<CompanyAccessResult> {
  return resolveCompanyAccess(requirement)
}
