import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { listSessions, SessionListFilters } from '@/app/api/admin/_services/sessions'

// Migrado a servicio centralizado en _services/sessions.ts

export async function GET(req: NextRequest) {
  const auth = await assertAdmin(req)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
  const limitRaw = parseInt(searchParams.get('limit') ?? '10', 10)
  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw)
  const limit = Number.isNaN(limitRaw) ? 10 : Math.max(1, Math.min(100, limitRaw))

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

  const res = await listSessions(filters, { page, limit })
  return NextResponse.json(res)
}