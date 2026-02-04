import { logAudit } from '@/app/api/admin/_utils/audit'

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
  allowedUserIds?: string[] // ✅ NUEVO: Filtrar por usuarios permitidos
}

export interface PaginationOpts { page: number; limit: number }

export interface SessionListResult {
  items: UserSession[]
  total: number
  page: number
  limit: number
  pageCount: number
}

// Simple cache con TTL para listados
type CacheEntry = { at: number; result: SessionListResult }
const CACHE_TTL_MS = 30_000
const cache = new Map<string, CacheEntry>()

function cacheKey(filters: SessionListFilters, pag: PaginationOpts): string {
  return JSON.stringify({ f: filters, p: pag })
}

export function invalidateSessionsCache() {
  cache.clear()
}

// Datos mock (migrados desde el handler)
const mockSessions: UserSession[] = [
  {
    id: 'session-1',
    userId: 'user-1',
    userName: 'Administrador Principal',
    userEmail: 'admin@example.com',
    userRole: 'ADMIN',
    sessionToken: 'token-1',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    deviceType: 'desktop',
    browser: 'Chrome 120',
    os: 'Windows 10',
    location: { country: 'Colombia', city: 'Bogotá', region: 'Cundinamarca' },
    isActive: true,
    isCurrent: true,
    createdAt: '2024-01-15T08:30:00Z',
    lastActivityAt: '2024-01-15T10:45:00Z',
    expiresAt: '2024-01-16T08:30:00Z',
    loginMethod: 'email',
    riskLevel: 'low'
  },
  {
    id: 'session-2',
    userId: 'user-2',
    userName: 'Cajero Principal',
    userEmail: 'cashier@example.com',
    userRole: 'CASHIER',
    sessionToken: 'token-2',
    ipAddress: '192.168.1.150',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    deviceType: 'mobile',
    browser: 'Safari Mobile',
    os: 'iOS 17',
    location: { country: 'Colombia', city: 'Medellín', region: 'Antioquia' },
    isActive: true,
    isCurrent: false,
    createdAt: '2024-01-15T09:00:00Z',
    lastActivityAt: '2024-01-15T10:30:00Z',
    expiresAt: '2024-01-16T09:00:00Z',
    loginMethod: 'email',
    riskLevel: 'low'
  },
  {
    id: 'session-3',
    userId: 'user-3',
    userName: 'Gerente General',
    userEmail: 'manager@example.com',
    userRole: 'MANAGER',
    sessionToken: 'token-3',
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0 (Macintosh) Chrome/119',
    deviceType: 'desktop',
    browser: 'Chrome 119',
    os: 'macOS Sonoma',
    location: { country: 'Estados Unidos', city: 'Miami', region: 'Florida' },
    isActive: true,
    isCurrent: false,
    createdAt: '2024-01-15T07:15:00Z',
    lastActivityAt: '2024-01-15T10:20:00Z',
    expiresAt: '2024-01-16T07:15:00Z',
    loginMethod: 'google',
    riskLevel: 'medium'
  },
  {
    id: 'session-4',
    userId: 'user-4',
    userName: 'Usuario Desconocido',
    userEmail: 'unknown@suspicious.com',
    userRole: 'USER',
    sessionToken: 'token-4',
    ipAddress: '198.51.100.123',
    userAgent: 'curl/7.68.0',
    deviceType: 'unknown',
    browser: 'Unknown',
    os: 'Unknown',
    location: { country: 'Desconocido', city: 'Desconocido', region: 'Desconocido' },
    isActive: false,
    isCurrent: false,
    createdAt: '2024-01-15T06:45:00Z',
    lastActivityAt: '2024-01-15T06:50:00Z',
    expiresAt: '2024-01-15T18:45:00Z',
    loginMethod: 'email',
    riskLevel: 'high'
  },
  {
    id: 'session-5',
    userId: 'user-2',
    userName: 'Cajero Principal',
    userEmail: 'cashier@example.com',
    userRole: 'CASHIER',
    sessionToken: 'token-5',
    ipAddress: '192.168.1.151',
    userAgent: 'Mozilla/5.0 (iPad)',
    deviceType: 'tablet',
    browser: 'Safari',
    os: 'iPadOS 17',
    location: { country: 'Colombia', city: 'Medellín', region: 'Antioquia' },
    isActive: false,
    isCurrent: false,
    createdAt: '2024-01-14T14:20:00Z',
    lastActivityAt: '2024-01-14T18:30:00Z',
    expiresAt: '2024-01-15T14:20:00Z',
    loginMethod: 'email',
    riskLevel: 'low'
  }
]

function applyFilters(data: UserSession[], f: SessionListFilters): UserSession[] {
  let filtered = data
  
  // ✅ CRÍTICO: Filtrar por usuarios permitidos (multitenancy)
  if (f.allowedUserIds && f.allowedUserIds.length > 0) {
    filtered = filtered.filter(s => f.allowedUserIds!.includes(s.userId))
  }
  
  const search = (f.search || '').toLowerCase()
  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.userName.toLowerCase().includes(search) ||
        s.userEmail.toLowerCase().includes(search) ||
        s.ipAddress.includes(search)
    )
  }
  if (f.status && f.status !== 'all') {
    if (f.status === 'active') filtered = filtered.filter((s) => s.isActive)
    else if (f.status === 'expired') filtered = filtered.filter((s) => !s.isActive)
  }
  if (f.userRole && f.userRole !== 'all') {
    filtered = filtered.filter((s) => s.userRole === f.userRole)
  }
  if (f.deviceType && f.deviceType !== 'all') {
    filtered = filtered.filter((s) => s.deviceType === f.deviceType)
  }
  if (f.riskLevel && f.riskLevel !== 'all') {
    filtered = filtered.filter((s) => s.riskLevel === f.riskLevel)
  }
  if (f.loginMethod && f.loginMethod !== 'all') {
    filtered = filtered.filter((s) => s.loginMethod === f.loginMethod)
  }
  if (typeof f.isActive === 'boolean') {
    filtered = filtered.filter((s) => s.isActive === f.isActive)
  }
  if (typeof f.isCurrent === 'boolean') {
    filtered = filtered.filter((s) => s.isCurrent === f.isCurrent)
  }
  if (f.dateFrom) {
    filtered = filtered.filter((s) => new Date(s.createdAt).getTime() >= new Date(f.dateFrom!).getTime())
  }
  if (f.dateTo) {
    filtered = filtered.filter((s) => new Date(s.createdAt).getTime() <= new Date(f.dateTo!).getTime())
  }
  if (f.sortBy) {
    const dir = f.sortDir === 'asc' ? 1 : -1
    filtered = filtered.slice().sort((a, b) => {
      const av = a[f.sortBy!]
      const bv = b[f.sortBy!]
      if (f.sortBy === 'userName' || f.sortBy === 'riskLevel') {
        return String(av).localeCompare(String(bv)) * dir
      }
      return (new Date(av as string).getTime() - new Date(bv as string).getTime()) * dir
    })
  }
  return filtered
}

export async function listSessions(
  filters: SessionListFilters,
  pag: PaginationOpts
): Promise<SessionListResult> {
  const key = cacheKey(filters, pag)
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return hit.result
  }

  // En producción: aquí se consultarían sesiones desde BD (Prisma) con filtros y orden.
  // Por ahora usamos mockSessions.
  const filtered = applyFilters(mockSessions, filters)
  const total = filtered.length
  const page = Math.max(1, pag.page)
  const limit = Math.max(1, Math.min(100, pag.limit))
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const clampedPage = Math.min(page, pageCount)
  const start = (clampedPage - 1) * limit
  const items = filtered.slice(start, start + limit)

  const result: SessionListResult = { items, total, page: clampedPage, limit, pageCount }
  cache.set(key, { at: now, result })

  logAudit('sessions.list', { filters, page: clampedPage, limit, returned: items.length, total })
  return result
}

export async function terminateSession(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const found = mockSessions.find((s) => s.id === id)
  if (!found) {
    logAudit('sessions.terminate', { sessionId: id, result: 'not_found' })
    return { ok: false, error: 'Session not found' }
  }
  found.isActive = false
  found.isCurrent = false
  logAudit('sessions.terminate', { sessionId: id, result: 'terminated' })
  invalidateSessionsCache()
  return { ok: true }
}

export async function cleanupExpired(): Promise<{ ok: true; cleaned: number }>
{
  const before = mockSessions.filter(s => s.isActive).length
  for (const s of mockSessions) {
    const expired = new Date(s.expiresAt).getTime() < Date.now()
    if (expired) s.isActive = false
  }
  const after = mockSessions.filter(s => s.isActive).length
  const cleaned = before - after
  logAudit('sessions.cleanup', { cleaned })
  invalidateSessionsCache()
  return { ok: true, cleaned }
}

export async function exportSessions(
  filters: SessionListFilters,
  format: 'csv' | 'json'
): Promise<{ contentType: string; body: string }>
{
  const res = await listSessions(filters, { page: 1, limit: 1000 })
  const safeItems = res.items.map(({ sessionToken, ...rest }) => rest)
  if (format === 'csv') {
    const headers = Object.keys(safeItems[0] || {})
    const rows = safeItems.map((item) => headers.map(h => JSON.stringify((item as any)[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    logAudit('sessions.export', { format: 'csv', count: safeItems.length })
    return { contentType: 'text/csv', body: csv }
  } else {
    logAudit('sessions.export', { format: 'json', count: safeItems.length })
    return { contentType: 'application/json', body: JSON.stringify({ items: safeItems }) }
  }
}