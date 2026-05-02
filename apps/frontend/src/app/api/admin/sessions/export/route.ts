import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import {
  CurrentSessionContext,
  DeviceType,
  exportSessions,
  exportSessionsStreamCsv,
  LoginMethod,
  RiskLevel,
  resolveSessionKey,
  SessionListFilters,
} from '@/app/api/admin/_services/sessions'
import { getAllowedUserIds } from '@/app/api/admin/_utils/orgCache'
import { createClient } from '@/lib/supabase/server'

function readStatus(value: string | null): SessionListFilters['status'] {
  return value === 'active' || value === 'expired' || value === 'all' ? value : 'all'
}

function readDeviceType(value: string | null): DeviceType | 'all' {
  return value === 'desktop' || value === 'mobile' || value === 'tablet' || value === 'unknown' || value === 'all'
    ? value
    : 'all'
}

function readRiskLevel(value: string | null): RiskLevel | 'all' {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'all' ? value : 'all'
}

function readLoginMethod(value: string | null): LoginMethod | 'all' {
  return value === 'email' || value === 'google' || value === 'github' || value === 'sso' || value === 'all'
    ? value
    : 'all'
}

function readSortBy(value: string | null): SessionListFilters['sortBy'] | undefined {
  return value === 'createdAt' || value === 'lastActivityAt' || value === 'expiresAt' || value === 'userName' || value === 'riskLevel'
    ? value
    : undefined
}

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
    status: readStatus(searchParams.get('status')),
    userRole: searchParams.get('userRole') || undefined,
    deviceType: readDeviceType(searchParams.get('deviceType')),
    riskLevel: readRiskLevel(searchParams.get('riskLevel')),
    loginMethod: readLoginMethod(searchParams.get('loginMethod')),
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
    sortBy: readSortBy(searchParams.get('sortBy')),
    sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
    allowedUserIds,
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const currentSession: CurrentSessionContext = {
    userId: access.context.userId,
    userAgent: req.headers.get('user-agent') || '',
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
    sessionKey: resolveSessionKey(session?.access_token, session?.refresh_token),
  }

  try {
    if (format === 'csv') {
      const stream = await exportSessionsStreamCsv(filters, currentSession)
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="sessions.csv"',
        },
      })
    }

    const data = await exportSessions(filters, 'json', currentSession)
    return new NextResponse(data.body, {
      headers: { 'Content-Type': data.contentType },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo exportar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
