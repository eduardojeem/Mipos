import { NextRequest, NextResponse } from 'next/server'
import {
  requireCompanyAccess,
} from '@/app/api/_utils/company-authorization'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { createAdminClient } from '@/lib/supabase/server'
import { buildSubscriptionResponse, getSubscriptionSnapshot, reconcileExpiredSubscription } from '@/app/api/subscription/_lib'

export async function GET(request: NextRequest) {
  const requestedCompanyId = request.headers.get('x-organization-id') || new URL(request.url).searchParams.get('organizationId') || undefined
  const access = await requireCompanyAccess(request, {
    companyId: requestedCompanyId,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }

  if (!access.context.companyId) {
    return NextResponse.json({ error: 'No hay empresa seleccionada' }, { status: 400 })
  }

  try {
    const adminClient = await createAdminClient()
    const { data: membership, error } = await adminClient
      .from('organization_members')
      .select(`
        organization_id,
        is_owner
      `)
      .eq('user_id', access.context.userId)
      .eq('organization_id', access.context.companyId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'No se pudo validar la empresa seleccionada' }, { status: 500 })
    }

    const snapshot = await getSubscriptionSnapshot(access.context.companyId)

    const preferredBranchId = request.headers.get('x-branch-id') || null
    const reconcile = await reconcileExpiredSubscription({
      organizationId: access.context.companyId,
      preferredPrimaryBranchId: preferredBranchId,
    }).catch(() => ({ reconciled: false, branchPolicy: null }))

    const effectiveSnapshot = reconcile.reconciled
      ? await getSubscriptionSnapshot(access.context.companyId)
      : snapshot

    return NextResponse.json({
      subscription: buildSubscriptionResponse({
        organization: {
          ...effectiveSnapshot.organization,
          subscription_status: effectiveSnapshot.subscriptionStatus,
        },
        plan: effectiveSnapshot.plan,
        billingCycle: effectiveSnapshot.billingCycle,
        currentPeriodStart: effectiveSnapshot.currentPeriodStart,
        currentPeriodEnd: effectiveSnapshot.currentPeriodEnd,
        isOrgAdmin: Boolean(
          membership?.is_owner ||
          access.context.role === 'SUPER_ADMIN' ||
          access.context.role === 'OWNER' ||
          access.context.role === 'ADMIN'
        ),
        cancelAtPeriodEnd: effectiveSnapshot.cancelAtPeriodEnd,
        statusOverride: effectiveSnapshot.subscriptionStatus,
      }),
      meta: reconcile.reconciled ? { reconciled: true, branchPolicy: reconcile.branchPolicy } : undefined,
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
