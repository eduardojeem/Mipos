import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { exportSessions, SessionListFilters } from '@/app/api/admin/_services/sessions'

export async function GET(req: NextRequest) {
  const auth = await assertAdmin(req)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const formatParam = (searchParams.get('format') || 'json').toLowerCase()
  const format = formatParam === 'csv' ? 'csv' : 'json'

  const filters: SessionListFilters = {
    search: (searchParams.get('search') || undefined),
    status: (['active', 'expired', 'all'].includes(searchParams.get('status') ?? '') ? (searchParams.get('status') as any) : 'all'),
    userRole: searchParams.get('userRole') || undefined,
    deviceType: (['desktop', 'mobile', 'tablet', 'unknown', 'all'].includes(searchParams.get('deviceType') ?? '') ? (searchParams.get('deviceType') as any) : 'all'),
    riskLevel: (['low', 'medium', 'high', 'all'].includes(searchParams.get('riskLevel') ?? '') ? (searchParams.get('riskLevel') as any) : 'all'),
    loginMethod: (['email', 'google', 'github', 'sso', 'all'].includes(searchParams.get('loginMethod') ?? '') ? (searchParams.get('loginMethod') as any) : 'all'),
    isActive: searchParams.get('isActive') === null ? undefined : searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
    isCurrent: searchParams.get('isCurrent') === null ? undefined : searchParams.get('isCurrent') === 'true' ? true : searchParams.get('isCurrent') === 'false' ? false : undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    sortBy: (searchParams.get('sortBy') as any) || undefined,
    sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'
  }

  const data = await exportSessions(filters, format)
  const headers = new Headers({ 'Content-Type': data.contentType })
  if (format === 'csv') {
    headers.set('Content-Disposition', 'attachment; filename="sessions.csv"')
  }
  return new NextResponse(data.body, { headers })
}