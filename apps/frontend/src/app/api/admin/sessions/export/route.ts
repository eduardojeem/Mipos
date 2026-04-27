import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { exportSessions, exportSessionsStreamCsv, SessionListFilters } from '@/app/api/admin/_services/sessions'
import { getAllowedUserIds } from '@/app/api/admin/_utils/orgCache'

export async function GET(req: NextRequest) {
  const access = await requireAdminApiAccess(req, ADMIN_API_ACCESS.adminPanel)
  if (!access.ok) {
    return access.response
  }

  const { searchParams } = new URL(req.url)
  const format = (searchParams.get('format') || 'json').toLowerCase() === 'csv' ? 'csv' : 'json'

  let allowedUserIds: string[] | undefined
  if (access.context.companyId) {
    allowedUserIds = await getAllowedUserIds(access.context.companyId)
  }

  const filters: SessionListFilters = {
    search: searchParams.get('search') || undefined,
    status: ['active', 'expired', 'all'].includes(searchParams.get('status') ?? '')
      ? (searchParams.get('status') as any)
      : 'all',
    userRole: searchParams.get('userRole') || undefined,
    deviceType: ['desktop', 'mobile', 'tablet', 'unknown', 'all'].includes(searchParams.get('deviceType') ?? '')
      ? (searchParams.get('deviceType') as any)
      : 'all',
    riskLevel: ['low', 'medium', 'high', 'all'].includes(searchParams.get('riskLevel') ?? '')
      ? (searchParams.get('riskLevel') as any)
      : 'all',
    loginMethod: ['email', 'google', 'github', 'sso', 'all'].includes(searchParams.get('loginMethod') ?? '')
      ? (searchParams.get('loginMethod') as any)
      : 'all',
    isActive: searchParams.get('isActive') === null
      ? undefined
      : searchParams.get('isActive') === 'true'
        ? true
        : searchParams.get('isActive') === 'false'
          ? false
          : undefined,
    isCurrent: searchParams.get('isCurrent') === null
      ? undefined
      : searchParams.get('isCurrent') === 'true'
        ? true
        : searchParams.get('isCurrent') === 'false'
          ? false
          : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    sortBy: (searchParams.get('sortBy') as any) || undefined,
    sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
    allowedUserIds,
  }

  if (format === 'csv') {
    const stream = await exportSessionsStreamCsv(filters)
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="sessions.csv"',
      },
    })
  }

  const data = await exportSessions(filters, 'json')
  return new NextResponse(data.body, {
    headers: { 'Content-Type': data.contentType },
  })
}
