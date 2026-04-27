import { NextRequest, NextResponse } from 'next/server'
import {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  resolveCompanyAccess,
} from '@/app/api/_utils/company-authorization'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const permission = searchParams.get('permission') || undefined
  const feature = searchParams.get('feature') || undefined
  const companyId = searchParams.get('companyId') || searchParams.get('organizationId') || undefined

  const access = await resolveCompanyAccess({
    companyId,
    permission: permission as (typeof COMPANY_PERMISSIONS)[keyof typeof COMPANY_PERMISSIONS] | undefined,
    feature: feature as (typeof COMPANY_FEATURE_KEYS)[keyof typeof COMPANY_FEATURE_KEYS] | undefined,
  })

  if (!access.ok) {
    return NextResponse.json({
      success: false,
      allowed: false,
      error: access.body.error,
    }, { status: access.status })
  }

  return NextResponse.json({
    success: true,
    allowed: true,
    context: access.context,
  })
}
