import { NextRequest, NextResponse } from 'next/server'
import {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  type CompanyFeatureKey,
  type CompanyPermissionKey,
  requireCompanyAccess,
} from '@/app/api/_utils/company-authorization'

type AllowedRole = 'OWNER' | 'ADMIN' | 'SELLER' | 'WAREHOUSE' | 'SUPER_ADMIN'

interface AdminApiAccessOptions {
  permission: CompanyPermissionKey
  feature: CompanyFeatureKey
  allowedRoles?: AllowedRole[]
}

function getRequestedCompanyId(request: NextRequest): string | null {
  const searchParams = new URL(request.url).searchParams
  return (
    request.headers.get('x-organization-id') ||
    searchParams.get('organizationId') ||
    searchParams.get('companyId') ||
    null
  )
}

export async function requireAdminApiAccess(
  request: NextRequest,
  options: AdminApiAccessOptions
) {
  const companyId = getRequestedCompanyId(request)
  const access = await requireCompanyAccess(request, {
    companyId,
    permission: options.permission,
    feature: options.feature,
    allowedRoles: options.allowedRoles || ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })

  if (!access.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(access.body, { status: access.status }),
    }
  }

  return {
    ok: true as const,
    context: access.context,
  }
}

export const ADMIN_API_ACCESS = {
  manageUsers: {
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.TEAM_MANAGEMENT,
  },
  adminPanel: {
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
  },
  auditLogs: {
    permission: COMPANY_PERMISSIONS.VIEW_REPORTS,
    feature: COMPANY_FEATURE_KEYS.AUDIT_LOGS,
  },
  reports: {
    permission: COMPANY_PERMISSIONS.VIEW_REPORTS,
    feature: COMPANY_FEATURE_KEYS.BASIC_REPORTS,
  },
} as const
