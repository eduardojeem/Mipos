import { NextRequest, NextResponse } from 'next/server'
import {
  requireCompanyAccess,
} from '@/app/api/_utils/company-authorization'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { getUsageSnapshot, reconcileExpiredSubscription } from '@/app/api/subscription/_lib'

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
    const preferredBranchId = request.headers.get('x-branch-id') || null
    await reconcileExpiredSubscription({
      organizationId: access.context.companyId,
      preferredPrimaryBranchId: preferredBranchId,
    }).catch(() => ({ reconciled: false, branchPolicy: null }))

    const usage = await getUsageSnapshot(access.context.companyId)
    return NextResponse.json({ success: true, usage })
  } catch (error) {
    console.error('Error fetching subscription usage:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
