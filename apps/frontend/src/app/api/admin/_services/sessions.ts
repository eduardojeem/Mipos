import { logAudit } from '@/app/api/admin/_utils/audit'
import { createAdminClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'
export type LoginMethod = 'email' | 'google' | 'github' | 'sso'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface UserSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  sessionToken: string
  ipAddress: string
  userAgent: string
  deviceType: DeviceType
  browser: string
  os: string
  location?: { country: string; city: string; region: string }
  isActive: boolean
  isCurrent: boolean
  createdAt: string
  lastActivityAt: string
  expiresAt: string
  loginMethod: LoginMethod
  riskLevel: RiskLevel
}

export interface SessionListFilters {
  search?: string
  status?: 'active' | 'expired' | 'all'
  userRole?: string | ''
  deviceType?: DeviceType | 'all' | ''
  riskLevel?: RiskLevel | 'all' | ''
  loginMethod?: LoginMethod | 'all' | ''
  isActive?: boolean
  isCurrent?: boolean
  dateFrom?: string
  dateTo?: string
  sortBy?: 'createdAt' | 'lastActivityAt' | 'expiresAt' | 'userName' | 'riskLevel'
  sortDir?: 'asc' | 'desc'
  allowedUserIds?: string[]
}

export interface PaginationOpts {
  page: number
  limit: number
}

export interface SessionListSummary {
  active: number
  expired: number
  highRisk: number
  uniqueUsers: number
}

export interface SessionListResult {
  items: UserSession[]
  total: number
  page: number
  limit: number
  pageCount: number
  summary: SessionListSummary
}

export interface CurrentSessionContext {
  userId: string
  ipAddress?: string
  userAgent?: string
  sessionKey?: string | null
}

export interface OwnSessionResult {
  items: UserSession[]
  summary: SessionListSummary
}

type SessionUserRow = {
  id?: string | null
  full_name?: string | null
  fullName?: string | null
  email?: string | null
  role?: string | null
}

type SessionRow = {
  id: string
  user_id: string
  supabase_session_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  is_active?: boolean | null
  last_activity?: string | null
  created_at?: string | null
  expires_at?: string | null
  user?: SessionUserRow | SessionUserRow[] | null
}

type SessionMutationResult =
  | { ok: true; affected: number }
  | { ok: false; status: number; error: string }

function firstRelation<T>(value?: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function normalizeIpAddress(value?: string | null): string {
  return String(value || '')
    .split(',')[0]
    .trim()
}

function normalizeUserAgent(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function normalizeDateBoundary(value: string, boundary: 'start' | 'end'): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return boundary === 'start'
      ? `${value}T00:00:00.000`
      : `${value}T23:59:59.999`
  }

  return value
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}

export function resolveSessionKey(accessToken?: string | null, refreshToken?: string | null): string | null {
  const rawAccessToken = String(accessToken || '').trim()
  if (rawAccessToken) {
    const payload = decodeJwtPayload(rawAccessToken)
    const candidate = payload?.session_id || payload?.sid || payload?.jti
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  const fallback = String(refreshToken || accessToken || '').trim()
  if (!fallback) return null

  return createHash('sha256').update(fallback).digest('hex')
}

function intersectIds(first: string[] | undefined, second: string[] | undefined): string[] | undefined {
  if (!first && !second) return undefined
  if (!first) return second ? [...second] : undefined
  if (!second) return [...first]

  const right = new Set(second)
  return first.filter((value) => right.has(value))
}

function parseUserAgent(ua: string) {
  const source = ua || ''
  const lower = source.toLowerCase()
  const browser = lower.includes('edg/')
    ? 'Edge'
    : lower.includes('firefox')
      ? 'Firefox'
      : lower.includes('chrome')
        ? 'Chrome'
        : lower.includes('safari')
          ? 'Safari'
          : 'Unknown'
  const os = lower.includes('windows')
    ? 'Windows'
    : lower.includes('android')
      ? 'Android'
      : lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')
        ? 'iOS'
        : lower.includes('mac')
          ? 'macOS'
          : lower.includes('linux')
            ? 'Linux'
            : 'Unknown'
  const deviceType: DeviceType = lower.includes('ipad') || lower.includes('tablet')
    ? 'tablet'
    : lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')
      ? 'mobile'
      : source
        ? 'desktop'
        : 'unknown'

  return { browser, os, deviceType }
}

function deriveLoginMethod(_row: SessionRow): LoginMethod {
  return 'email'
}

function deriveRiskLevel(row: SessionRow): RiskLevel {
  const now = Date.now()
  const createdAt = Date.parse(row.created_at || '')
  const lastActivityAt = Date.parse(row.last_activity || row.created_at || '')
  const expiresAt = Date.parse(row.expires_at || '')
  const hasUserAgent = normalizeUserAgent(row.user_agent).length > 10

  const inactivityMs = Number.isFinite(lastActivityAt) ? now - lastActivityAt : 0
  const ageMs = Number.isFinite(createdAt) ? now - createdAt : 0
  const expiredWhileActive = Boolean(row.is_active) && Number.isFinite(expiresAt) && expiresAt <= now

  if (expiredWhileActive || inactivityMs >= 1000 * 60 * 60 * 24 * 30) {
    return 'high'
  }

  if (!hasUserAgent || ageMs >= 1000 * 60 * 60 * 24 * 14 || inactivityMs >= 1000 * 60 * 60 * 24 * 7) {
    return 'medium'
  }

  return 'low'
}

function matchesCurrentSession(row: SessionRow, currentSession?: CurrentSessionContext): boolean {
  if (!currentSession || row.user_id !== currentSession.userId || !row.is_active) {
    return false
  }

  if (currentSession.sessionKey && row.supabase_session_id === currentSession.sessionKey) {
    return true
  }

  const currentUserAgent = normalizeUserAgent(currentSession.userAgent)
  const currentIpAddress = normalizeIpAddress(currentSession.ipAddress)

  return Boolean(
    currentUserAgent &&
    currentIpAddress &&
    normalizeUserAgent(row.user_agent) === currentUserAgent &&
    normalizeIpAddress(row.ip_address) === currentIpAddress
  )
}

export async function syncCurrentSession(params: {
  userId: string
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<{ ok: true; sessionKey: string | null } | { ok: false; error: string }> {
  const sessionKey = resolveSessionKey(params.accessToken, params.refreshToken)
  if (!sessionKey) {
    return { ok: false, error: 'No se pudo resolver la clave de sesion actual.' }
  }

  const admin = await createAdminClient()
  const now = new Date().toISOString()
  const expiresAt = params.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

  const { error } = await admin
    .from('user_sessions')
    .upsert({
      user_id: params.userId,
      supabase_session_id: sessionKey,
      ip_address: normalizeIpAddress(params.ipAddress) || null,
      user_agent: String(params.userAgent || ''),
      is_active: true,
      last_activity: now,
      expires_at: expiresAt,
    }, { onConflict: 'supabase_session_id' })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, sessionKey }
}

export async function deactivateCurrentSession(params: {
  userId: string
  accessToken?: string | null
  refreshToken?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sessionKey = resolveSessionKey(params.accessToken, params.refreshToken)
  if (!sessionKey) {
    return { ok: false, error: 'No se pudo resolver la sesion actual.' }
  }

  const admin = await createAdminClient()
  const { error } = await admin
    .from('user_sessions')
    .update({ is_active: false })
    .eq('user_id', params.userId)
    .eq('supabase_session_id', sessionKey)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

function mapSessionRow(row: SessionRow, currentSession?: CurrentSessionContext): UserSession {
  const { browser, os, deviceType } = parseUserAgent(row.user_agent || '')
  const user = firstRelation(row.user)

  return {
    id: row.id,
    userId: row.user_id,
    userName: user?.full_name || user?.fullName || 'Usuario',
    userEmail: user?.email || '',
    userRole: String(user?.role || 'USER').toUpperCase(),
    sessionToken: row.supabase_session_id || row.id,
    ipAddress: normalizeIpAddress(row.ip_address) || '0.0.0.0',
    userAgent: row.user_agent || '',
    deviceType,
    browser,
    os,
    isActive: Boolean(row.is_active),
    isCurrent: matchesCurrentSession(row, currentSession),
    createdAt: row.created_at || '',
    lastActivityAt: row.last_activity || row.created_at || '',
    expiresAt: row.expires_at || '',
    loginMethod: deriveLoginMethod(row),
    riskLevel: deriveRiskLevel(row),
  }
}

function buildSummary(items: UserSession[]): SessionListSummary {
  return {
    active: items.filter((item) => item.isActive).length,
    expired: items.filter((item) => !item.isActive).length,
    highRisk: items.filter((item) => item.riskLevel === 'high').length,
    uniqueUsers: new Set(items.map((item) => item.userId)).size,
  }
}

function sortSessions(items: UserSession[], filters: SessionListFilters): UserSession[] {
  const sortBy = filters.sortBy || 'createdAt'
  const direction = filters.sortDir === 'asc' ? 1 : -1

  return [...items].sort((left, right) => {
    switch (sortBy) {
      case 'userName':
        return direction * left.userName.localeCompare(right.userName, 'es', { sensitivity: 'base' })
      case 'riskLevel': {
        const weights: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 }
        return direction * (weights[left.riskLevel] - weights[right.riskLevel])
      }
      case 'expiresAt': {
        const leftValue = Date.parse(left.expiresAt || '') || 0
        const rightValue = Date.parse(right.expiresAt || '') || 0
        return direction * (leftValue - rightValue)
      }
      case 'lastActivityAt': {
        const leftValue = Date.parse(left.lastActivityAt || '') || 0
        const rightValue = Date.parse(right.lastActivityAt || '') || 0
        return direction * (leftValue - rightValue)
      }
      case 'createdAt':
      default: {
        const leftValue = Date.parse(left.createdAt || '') || 0
        const rightValue = Date.parse(right.createdAt || '') || 0
        return direction * (leftValue - rightValue)
      }
    }
  })
}

function applyClientFilters(items: UserSession[], filters: SessionListFilters): UserSession[] {
  const search = String(filters.search || '').trim().toLowerCase()

  return items.filter((item) => {
    if (filters.deviceType && filters.deviceType !== 'all' && item.deviceType !== filters.deviceType) {
      return false
    }

    if (filters.loginMethod && filters.loginMethod !== 'all' && item.loginMethod !== filters.loginMethod) {
      return false
    }

    if (filters.riskLevel && filters.riskLevel !== 'all' && item.riskLevel !== filters.riskLevel) {
      return false
    }

    if (filters.isCurrent !== undefined && item.isCurrent !== filters.isCurrent) {
      return false
    }

    if (!search) {
      return true
    }

    const haystack = [
      item.userName,
      item.userEmail,
      item.ipAddress,
      item.userRole,
      item.browser,
      item.os,
    ].join(' ').toLowerCase()

    return haystack.includes(search)
  })
}

async function resolveRoleUserIds(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  filters: SessionListFilters
): Promise<string[] | undefined> {
  if (!filters.userRole) {
    return undefined
  }

  let query = admin
    .from('users')
    .select('id')
    .eq('role', filters.userRole)
    .limit(5000)

  if (filters.allowedUserIds && filters.allowedUserIds.length > 0) {
    query = query.in('id', filters.allowedUserIds)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(`No se pudo resolver el rol de usuarios: ${error.message}`)
  }

  return (data || []).map((row: { id: string }) => row.id)
}

async function fetchSessionRows(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  filters: SessionListFilters
): Promise<SessionRow[]> {
  const roleUserIds = await resolveRoleUserIds(admin, filters)
  const effectiveUserIds = intersectIds(filters.allowedUserIds, roleUserIds)

  if (effectiveUserIds && effectiveUserIds.length === 0) {
    return []
  }

  const rows: SessionRow[] = []
  const pageSize = 500

  for (let from = 0; ; from += pageSize) {
    let query = admin
      .from('user_sessions')
      .select(`
        id,
        user_id,
        supabase_session_id,
        ip_address,
        user_agent,
        is_active,
        last_activity,
        created_at,
        expires_at,
        user:users(id, full_name, email, role)
      `)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (effectiveUserIds && effectiveUserIds.length > 0) {
      query = query.in('user_id', effectiveUserIds)
    } else if (filters.allowedUserIds && filters.allowedUserIds.length > 0) {
      query = query.in('user_id', filters.allowedUserIds)
    }

    if (filters.status === 'active') {
      query = query.eq('is_active', true)
    } else if (filters.status === 'expired') {
      query = query.eq('is_active', false)
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', normalizeDateBoundary(filters.dateFrom, 'start'))
    }

    if (filters.dateTo) {
      query = query.lte('created_at', normalizeDateBoundary(filters.dateTo, 'end'))
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`No se pudieron cargar las sesiones: ${error.message}`)
    }

    const batch = (data || []) as SessionRow[]
    rows.push(...batch)

    if (batch.length < pageSize) {
      break
    }
  }

  return rows
}

async function getFilteredSessions(
  filters: SessionListFilters,
  currentSession?: CurrentSessionContext
): Promise<UserSession[]> {
  const admin = await createAdminClient()
  const rows = await fetchSessionRows(admin, filters)
  const mapped = rows.map((row) => mapSessionRow(row, currentSession))
  return sortSessions(applyClientFilters(mapped, filters), filters)
}

export async function listUserSessions(
  userId: string,
  currentSession?: CurrentSessionContext
): Promise<OwnSessionResult> {
  const items = await getFilteredSessions({ allowedUserIds: [userId], sortBy: 'lastActivityAt', sortDir: 'desc' }, currentSession)
  return {
    items,
    summary: buildSummary(items),
  }
}

export async function terminateOwnSession(
  sessionId: string,
  userId: string,
  currentSession?: CurrentSessionContext
): Promise<SessionMutationResult> {
  const { items } = await listUserSessions(userId, currentSession)
  const target = items.find((item) => item.id === sessionId)

  if (!target) {
    return { ok: false, status: 404, error: 'La sesion indicada no existe.' }
  }

  if (target.isCurrent) {
    return { ok: false, status: 400, error: 'No puedes cerrar tu sesion actual desde aqui.' }
  }

  return terminateSession(sessionId, [userId])
}

export async function terminateOtherUserSessions(
  userId: string,
  currentSession?: CurrentSessionContext
): Promise<SessionMutationResult> {
  const { items } = await listUserSessions(userId, currentSession)
  const sessionsToTerminate = items.filter((item) => item.isActive && !item.isCurrent).map((item) => item.id)

  if (sessionsToTerminate.length === 0) {
    return { ok: false, status: 404, error: 'No hay otras sesiones activas para cerrar.' }
  }

  const admin = await createAdminClient()
  const { error, count } = await admin
    .from('user_sessions')
    .update({ is_active: false }, { count: 'exact' })
    .eq('user_id', userId)
    .in('id', sessionsToTerminate)
    .eq('is_active', true)
    .select('id')

  if (error) {
    return { ok: false, status: 500, error: error.message }
  }

  return { ok: true, affected: count || 0 }
}

export async function listSessions(
  filters: SessionListFilters,
  pag: PaginationOpts,
  currentSession?: CurrentSessionContext
): Promise<SessionListResult> {
  const items = await getFilteredSessions(filters, currentSession)
  const total = items.length
  const pageCount = total > 0 ? Math.ceil(total / pag.limit) : 1
  const page = Math.min(Math.max(1, pag.page), pageCount)
  const start = (page - 1) * pag.limit
  const pagedItems = items.slice(start, start + pag.limit)
  const summary = buildSummary(items)

  logAudit('sessions.list', { filters, total, page, pageCount })

  return {
    items: pagedItems,
    total,
    page,
    limit: pag.limit,
    pageCount,
    summary,
  }
}

export async function terminateSession(
  id: string,
  allowedUserIds?: string[]
): Promise<SessionMutationResult> {
  const admin = await createAdminClient()

  let query = admin
    .from('user_sessions')
    .update({ is_active: false }, { count: 'exact' })
    .eq('id', id)
    .eq('is_active', true)

  if (allowedUserIds && allowedUserIds.length > 0) {
    query = query.in('user_id', allowedUserIds)
  }

  const { data, error, count } = await query.select('id')

  if (error) {
    logAudit('sessions.terminate', { sessionId: id, result: 'error', error: error.message })
    return { ok: false, status: 500, error: error.message }
  }

  if (!count || !data || data.length === 0) {
    return { ok: false, status: 404, error: 'La sesion no existe o ya estaba cerrada.' }
  }

  logAudit('sessions.terminate', { sessionId: id, result: 'terminated' })
  return { ok: true, affected: count }
}

export async function cleanupExpired(
  allowedUserIds?: string[]
): Promise<{ ok: true; cleaned: number } | { ok: false; error: string }> {
  const admin = await createAdminClient()

  let query = admin
    .from('user_sessions')
    .update({ is_active: false }, { count: 'exact' })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)

  if (allowedUserIds && allowedUserIds.length > 0) {
    query = query.in('user_id', allowedUserIds)
  }

  const { error, count } = await query.select('id')

  if (error) {
    console.error('Error in cleanup:', error)
    return { ok: false, error: error.message }
  }

  const cleanedCount = count || 0
  logAudit('sessions.cleanup', { cleanedCount })
  return { ok: true, cleaned: cleanedCount }
}

export async function exportSessions(
  filters: SessionListFilters,
  format: 'csv' | 'json',
  currentSession?: CurrentSessionContext
): Promise<{ contentType: string; body: string }> {
  const safeItems = (await getFilteredSessions(filters, currentSession)).map(({ sessionToken: _sessionToken, ...rest }) => rest)

  if (format === 'csv') {
    const headers = Object.keys(safeItems[0] || {})
    const rows = safeItems.map((item) =>
      headers.map((header) => JSON.stringify((item as Record<string, unknown>)[header] ?? '')).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    return { contentType: 'text/csv', body: csv }
  }

  return { contentType: 'application/json', body: JSON.stringify({ items: safeItems }) }
}

export async function terminateUserSessions(
  userId: string,
  allowedUserIds?: string[]
): Promise<SessionMutationResult> {
  const admin = await createAdminClient()

  let query = admin
    .from('user_sessions')
    .update({ is_active: false }, { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (allowedUserIds && allowedUserIds.length > 0) {
    query = query.in('user_id', allowedUserIds)
  }

  const { error, count } = await query.select('id')

  if (error) {
    return { ok: false, status: 500, error: error.message }
  }

  if (!count) {
    return { ok: false, status: 404, error: 'No hay sesiones activas para cerrar en este usuario.' }
  }

  logAudit('sessions.terminateUser', { userId, terminated: count })
  return { ok: true, affected: count }
}

export async function exportSessionsStreamCsv(
  filters: SessionListFilters,
  currentSession?: CurrentSessionContext
): Promise<ReadableStream> {
  const safeItems = (await getFilteredSessions(filters, currentSession)).map(({ sessionToken: _sessionToken, ...rest }) => rest)
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      const headers = Object.keys(safeItems[0] || {})
      if (headers.length > 0) {
        controller.enqueue(encoder.encode(`${headers.join(',')}\n`))
      }

      for (const item of safeItems) {
        const line = headers
          .map((header) => JSON.stringify((item as Record<string, unknown>)[header] ?? ''))
          .join(',')
        controller.enqueue(encoder.encode(`${line}\n`))
      }

      controller.close()
    },
  })
}
