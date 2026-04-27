import { NextRequest, NextResponse } from 'next/server'
import {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  requireCompanyAccess,
} from '@/app/api/_utils/company-authorization'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/app/api/admin/_utils/audit'
import {
  buildSubscriptionResponse,
  getPlanRecord,
  syncOrganizationSubscriptionState,
} from '@/app/api/subscription/_lib'

type BranchPolicyResult = {
  primaryBranchId: string | null
  deactivatedBranchIds: string[]
}

async function enforceBranchLimitOnDowngrade(params: {
  adminClient: Awaited<ReturnType<typeof createAdminClient>>
  organizationId: string
  allowedActiveBranches: number
  preferredPrimaryBranchId?: string | null
}): Promise<BranchPolicyResult> {
  const { adminClient, organizationId, allowedActiveBranches, preferredPrimaryBranchId } = params

  const { data, error } = await adminClient
    .from('branches')
    .select('id,is_active,created_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const active = (data || []) as Array<{ id: string; is_active: boolean; created_at: string | null }>
  if (active.length <= allowedActiveBranches) {
    return {
      primaryBranchId: active[0]?.id ?? null,
      deactivatedBranchIds: [],
    }
  }

  const primaryFromRequest = preferredPrimaryBranchId
    ? active.find((row) => row.id === preferredPrimaryBranchId)?.id ?? null
    : null
  const primaryBranchId = primaryFromRequest ?? active[0]?.id ?? null
  const toDeactivate = active
    .filter((row) => row.id !== primaryBranchId)
    .slice(Math.max(0, allowedActiveBranches - 1))
    .map((row) => row.id)
    .filter(Boolean)
  if (toDeactivate.length === 0) {
    return { primaryBranchId, deactivatedBranchIds: [] }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await adminClient
    .from('branches')
    .update({ is_active: false, updated_at: now })
    .in('id', toDeactivate)
    .eq('organization_id', organizationId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  return {
    primaryBranchId,
    deactivatedBranchIds: toDeactivate,
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const requestedCompanyId = request.headers.get('x-organization-id') || body.organizationId || undefined
  const access = await requireCompanyAccess(request, {
    companyId: requestedCompanyId,
    permission: COMPANY_PERMISSIONS.MANAGE_BILLING,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
    allowedRoles: ['OWNER', 'SUPER_ADMIN'],
  })

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }

  const { newPlanId, billingCycle: rawBillingCycle, primaryBranchId } = body
  const billingCycle = rawBillingCycle === 'yearly' ? 'yearly' : 'monthly'

  if (!newPlanId) {
    return NextResponse.json({ error: 'Plan requerido' }, { status: 400 })
  }

  if (!access.context.companyId) {
    return NextResponse.json({ error: 'No hay empresa seleccionada' }, { status: 400 })
  }

  try {
    const adminClient = await createAdminClient()
    const { data: organization, error: organizationError } = await adminClient
      .from('organizations')
      .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at')
      .eq('id', access.context.companyId)
      .single()

    if (organizationError || !organization) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const plan = await getPlanRecord(newPlanId)
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    const normalizedTargetSlug = String(plan.slug || '').toLowerCase()
    let branchPolicy: BranchPolicyResult | null = null

    if (normalizedTargetSlug === 'free') {
      branchPolicy = await enforceBranchLimitOnDowngrade({
        adminClient,
        organizationId: organization.id,
        allowedActiveBranches: 1,
        preferredPrimaryBranchId: typeof primaryBranchId === 'string' ? primaryBranchId : null,
      })

      if (branchPolicy.deactivatedBranchIds.length) {
        logAudit('branches.deactivated_due_to_plan_limit', {
          entityType: 'BRANCH',
          entityId: organization.id,
          organizationId: organization.id,
          targetPlan: 'free',
          primaryBranchId: branchPolicy.primaryBranchId,
          deactivatedBranchIds: branchPolicy.deactivatedBranchIds,
        })
      }
    }

    const sync = await syncOrganizationSubscriptionState({
      organization: organization as any,
      plan,
      billingCycle,
    })

    logAudit('subscription.plan_changed', {
      userId: access.context.userId,
      organizationId: organization.id,
      oldPlan: organization.subscription_plan,
      newPlan: plan.slug,
      billingCycle,
    })

    return NextResponse.json({
      success: true,
      subscription: buildSubscriptionResponse({
        organization: {
          ...(organization as any),
          subscription_plan: plan.slug,
          subscription_status: 'ACTIVE',
          settings: sync.settings,
        },
        plan,
        billingCycle,
        currentPeriodStart: sync.currentPeriodStart,
        currentPeriodEnd: sync.currentPeriodEnd,
        isOrgAdmin: true,
      }),
      message: `Plan cambiado exitosamente a ${plan.name}`,
      branchPolicy,
    })
  } catch (error) {
    console.error('Error changing plan:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
