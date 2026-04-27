import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { getSubscriptionSnapshot, reconcileExpiredSubscription } from '@/app/api/subscription/_lib'

export async function GET(request: NextRequest) {
  const requestedCompanyId =
    request.headers.get('x-organization-id') ||
    new URL(request.url).searchParams.get('organizationId') ||
    undefined

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
    const preferredBranchId = request.headers.get('x-branch-id') || null
    await reconcileExpiredSubscription({
      organizationId: access.context.companyId,
      preferredPrimaryBranchId: preferredBranchId,
    }).catch(() => ({ reconciled: false, branchPolicy: null }))

    const snapshot = await getSubscriptionSnapshot(access.context.companyId)

    return NextResponse.json({
      success: true,
      subscription: {
        organizationId: access.context.companyId,
        plan_type: snapshot.plan.slug,
        renewal_status: snapshot.subscriptionStatus,
        current_period_end: snapshot.currentPeriodEnd,
        cancel_at_period_end: snapshot.cancelAtPeriodEnd,
        billing_cycle: snapshot.billingCycle,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
