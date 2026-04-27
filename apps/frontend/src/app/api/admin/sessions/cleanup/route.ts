import { NextRequest, NextResponse } from 'next/server'
import { assertCsrf } from '@/app/api/_utils/csrf'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { cleanupExpired } from '@/app/api/admin/_services/sessions'
import { getAllowedUserIds } from '@/app/api/admin/_utils/orgCache'

export async function POST(request: NextRequest) {
  const access = await requireAdminApiAccess(request, ADMIN_API_ACCESS.adminPanel)
  if (!access.ok) {
    return access.response
  }

  const csrf = assertCsrf(request)
  if (!csrf.ok) return csrf.response

  let allowedUserIds: string[] | undefined
  if (access.context.companyId) {
    allowedUserIds = await getAllowedUserIds(access.context.companyId)
  }

  const result = await cleanupExpired(allowedUserIds)
  return NextResponse.json(result)
}
