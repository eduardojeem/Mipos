import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'
import { getAllowedUserIds } from '@/app/api/admin/_utils/orgCache'
import {
  CurrentSessionContext,
  DeviceType,
  LoginMethod,
  listSessions,
  RiskLevel,
  resolveSessionKey,
  SessionListFilters,
  syncCurrentSession,
} from '@/app/api/admin/_services/sessions'
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

  const { companyId, isSuperAdmin } = access.context
  let allowedUserIds: string[] | undefined

  if (companyId) {
    allowedUserIds = await getAllowedUserIds(companyId)
    if (!isSuperAdmin && allowedUserIds.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        pageCount: 1,
        summary: { active: 0, expired: 0, highRisk: 0, uniqueUsers: 0 },
      })
    }
  }

  const { searchParams } = new URL(req.url)
  const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
  const limitRaw = parseInt(searchParams.get('limit') ?? '10', 10)
  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw)
  const limit = Number.isNaN(limitRaw) ? 10 : Math.max(1, Math.min(100, limitRaw))

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

  if (session?.user?.id) {
    await syncCurrentSession({
      userId: session.user.id,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      ipAddress: currentSession.ipAddress,
      userAgent: currentSession.userAgent,
    })
  }

  try {
    const result = await listSessions(filters, { page, limit }, currentSession)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las sesiones'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
