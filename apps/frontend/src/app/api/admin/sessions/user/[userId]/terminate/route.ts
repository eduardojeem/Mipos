import { NextRequest, NextResponse } from 'next/server'
import { assertCsrf } from '@/app/api/_utils/csrf'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { terminateUserSessions } from '@/app/api/admin/_services/sessions'
import { getAllowedUserIds } from '@/app/api/admin/_utils/orgCache'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const access = await requireAdminApiAccess(req, ADMIN_API_ACCESS.adminPanel)
  if (!access.ok) {
    return access.response
  }

  const csrf = assertCsrf(req)
  if (!csrf.ok) return csrf.response

  const { userId } = await params

  let allowedUserIds: string[] | undefined
  if (access.context.companyId) {
    allowedUserIds = await getAllowedUserIds(access.context.companyId)
  }

  const result = await terminateUserSessions(userId, allowedUserIds)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 })
  }

  return NextResponse.json({ ok: true, terminated: result.terminated })
}
