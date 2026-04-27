import { logAudit } from '@/app/api/admin/_utils/audit'
import { createAdminClient } from '@/lib/supabase/server'

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


function parseUserAgent(ua: string) {
  const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Unknown'
  const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : ua.includes('Android') ? 'Android' : 'Linux'
  const deviceType: DeviceType = (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) ? 'mobile' : ua.includes('iPad') ? 'tablet' : 'desktop'
  return { browser, os, deviceType }
}

export async function listSessions(
  filters: SessionListFilters,
  pag: PaginationOpts
): Promise<SessionListResult> {
  const admin = await createAdminClient()
  
  let query = admin
    .from('user_sessions')
    .select(`
      id, user_id, supabase_session_id, ip_address, user_agent, is_active, last_activity, created_at, expires_at,
      user:users(id, fullName, email, role)
    `, { count: 'exact' })

  // Filtros de multitenancy
  if (filters.allowedUserIds && filters.allowedUserIds.length > 0) {
    query = query.in('user_id', filters.allowedUserIds)
  }

  // Filtros de estado
  if (filters.status === 'active') {
    query = query.eq('is_active', true)
  } else if (filters.status === 'expired') {
    query = query.eq('is_active', false)
  }

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }

  // Filtros de fechas
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  // Mantener deviceType en cliente para evitar múltiples .or en la consulta

  // Orden
  const sortCol = filters.sortBy === 'userName' ? 'user_id' : (filters.sortBy || 'created_at')
  query = query.order(sortCol, { ascending: filters.sortDir === 'asc' })

  // Paginación
  const start = (pag.page - 1) * pag.limit
  const end = start + pag.limit - 1
  query = query.range(start, end)

  // Búsqueda (Supabase no permite búsqueda en relaciones directamente con .or de forma sencilla)
  // así que si hay búsqueda, podríamos tener que filtrar después o usar una vista, 
  // pero por ahora lo mantenemos simple.

  if (filters.search) {
    const s = filters.search.replace(/%/g, '')
    const like = `%${s}%`
    let userIds: string[] = []
    const { data: matchedUsers } = await admin
      .from('users')
      .select('id')
      .or(`email.ilike.${like},fullName.ilike.${like}`)
      .limit(1000)
    userIds = (matchedUsers || []).map((u: any) => u.id)
    const ors: string[] = [`ip_address.ilike.${like}`]
    if (userIds.length > 0) {
      const inList = `(${userIds.map(id => `"${id}"`).join(',')})`
      ors.push(`user_id.in.${inList}`)
    }
    query = query.or(ors.join(','))
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetching sessions:', error)
    return { items: [], total: 0, page: pag.page, limit: pag.limit, pageCount: 0 }
  }

  const items: UserSession[] = (data || []).map((s: any) => {
    const { browser, os, deviceType } = parseUserAgent(s.user_agent || '')
    return {
      id: s.id,
      userId: s.user_id,
      userName: s.user?.fullName || 'Usuario',
      userEmail: s.user?.email || '',
      userRole: s.user?.role || 'USER',
      sessionToken: s.supabase_session_id || s.id,
      ipAddress: s.ip_address || '0.0.0.0',
      userAgent: s.user_agent || '',
      deviceType,
      browser,
      os,
      isActive: s.is_active,
      isCurrent: false, // Se determinaría comparando con el token actual en la request
      createdAt: s.created_at,
      lastActivityAt: s.last_activity || s.created_at,
      expiresAt: s.expires_at || '',
      loginMethod: 'email', // Por defecto
      riskLevel: 'low'
    }
  })

  // Autofiltro de búsqueda si existe (ya que Supabase .select con joins + .or es complejo)
  let filteredItems = items

  const total = count || 0
  
  logAudit('sessions.list', { filters, total })

  return {
    items: filteredItems,
    total,
    page: pag.page,
    limit: pag.limit,
    pageCount: Math.ceil(total / pag.limit)
  }
}

export async function terminateSession(
  id: string,
  allowedUserIds?: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await createAdminClient()

  let q = admin
    .from('user_sessions')
    .update({ is_active: false })
    .eq('id', id)

  if (allowedUserIds && allowedUserIds.length > 0) {
    q = q.in('user_id', allowedUserIds)
  }

  const { error } = await q

  if (error) {
    logAudit('sessions.terminate', { sessionId: id, result: 'error', error: error.message })
    return { ok: false, error: error.message }
  }

  logAudit('sessions.terminate', { sessionId: id, result: 'terminated' })
  return { ok: true }
}

export async function cleanupExpired(
  allowedUserIds?: string[]
): Promise<{ ok: true; cleaned: number }> {
  const admin = await createAdminClient()

  let q = admin
    .from('user_sessions')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)

  if (allowedUserIds && allowedUserIds.length > 0) {
    q = q.in('user_id', allowedUserIds)
  }

  const { error, count } = await q

  if (error) {
    console.error('Error in cleanup:', error)
    return { ok: true, cleaned: 0 }
  }

  const cleanedCount = count || 0
  logAudit('sessions.cleanup', { cleanedCount })
  return { ok: true, cleaned: cleanedCount }
}

export async function exportSessions(
  filters: SessionListFilters,
  format: 'csv' | 'json'
): Promise<{ contentType: string; body: string }> {
  // Simplemente obtenemos una página grande
  const res = await listSessions(filters, { page: 1, limit: 1000 })
  const safeItems = res.items.map(({ sessionToken, ...rest }) => rest)
  
  if (format === 'csv') {
    const headers = Object.keys(safeItems[0] || {})
    const rows = safeItems.map((item) => headers.map(h => JSON.stringify((item as any)[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    return { contentType: 'text/csv', body: csv }
  } else {
    return { contentType: 'application/json', body: JSON.stringify({ items: safeItems }) }
  }
}

export async function terminateUserSessions(
  userId: string,
  allowedUserIds?: string[]
): Promise<{ ok: true; terminated: number } | { ok: false; error: string }> {
  const admin = await createAdminClient()
  let q = admin
    .from('user_sessions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
  if (allowedUserIds && allowedUserIds.length > 0) {
    q = q.in('user_id', allowedUserIds)
  }
  const { error, count } = await q
  if (error) {
    return { ok: false, error: error.message }
  }
  const terminated = count || 0
  logAudit('sessions.terminateUser', { userId, terminated })
  return { ok: true, terminated }
}

export async function exportSessionsStreamCsv(
  filters: SessionListFilters
): Promise<ReadableStream> {
  const admin = await createAdminClient()
  const encoder = new TextEncoder()
  const pageSize = 500

  async function fetchRange(start: number, end: number) {
    let q = admin
      .from('user_sessions')
      .select(`
        id, user_id, supabase_session_id, ip_address, user_agent, is_active, last_activity, created_at, expires_at,
        user:users(id, fullName, email, role)
      `)

    if (filters.allowedUserIds && filters.allowedUserIds.length > 0) {
      q = q.in('user_id', filters.allowedUserIds)
    }
    if (filters.status === 'active') q = q.eq('is_active', true)
    else if (filters.status === 'expired') q = q.eq('is_active', false)

    const sortCol = filters.sortBy === 'userName' ? 'user_id' : (filters.sortBy || 'created_at')
    q = q.order(sortCol as string, { ascending: filters.sortDir === 'asc' })

    if (filters.search) {
      const s = filters.search.replace(/%/g, '')
      const like = `%${s}%`
      q = q.or(`ip_address.ilike.${like},user.email.ilike.${like},user.fullName.ilike.${like}`)
    }

    q = q.range(start, end)
    const { data, error } = await q
    if (error) throw error
    return data || []
  }

  const stream = new ReadableStream({
    async start(controller) {
      let headerWritten = false
      let offset = 0
      while (true) {
        const batch: any[] = await fetchRange(offset, offset + pageSize - 1)
        if (batch.length === 0) break
        const rows = batch.map((s: any) => {
          const { browser, os, deviceType } = parseUserAgent(s.user_agent || '')
          const item = {
            id: s.id,
            userId: s.user_id,
            userName: s.user?.fullName || 'Usuario',
            userEmail: s.user?.email || '',
            userRole: s.user?.role || 'USER',
            ipAddress: s.ip_address || '0.0.0.0',
            userAgent: s.user_agent || '',
            deviceType,
            browser,
            os,
            isActive: s.is_active,
            isCurrent: false,
            createdAt: s.created_at,
            lastActivityAt: s.last_activity || s.created_at,
            expiresAt: s.expires_at || '',
            loginMethod: 'email',
            riskLevel: 'low'
          }
          return item
        })

        if (!headerWritten) {
          const headers = Object.keys(rows[0] || {})
          controller.enqueue(encoder.encode(headers.join(',') + '\n'))
          headerWritten = true
        }
        for (const item of rows) {
          const headers = Object.keys(item)
          const line = headers.map(h => JSON.stringify((item as any)[h] ?? '')).join(',') + '\n'
          controller.enqueue(encoder.encode(line))
        }
        offset += batch.length
        if (batch.length < pageSize) break
      }
      controller.close()
    }
  })

  return stream
}
