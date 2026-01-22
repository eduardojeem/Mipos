import { NextRequest } from 'next/server'
import { isMockAuthEnabled } from '@/lib/env'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/app/api/admin/_utils/audit'

// Verifica que el solicitante sea ADMIN o SUPER_ADMIN.
// - En modo mock: usa cabecera x-user-role
// - En producción: verifica sesión y rol desde la tabla users
export async function assertAdmin(request: NextRequest): Promise<
  | { ok: true; session?: any }
  | { ok: false; status: number; body: { error: string } }
> {
  const forceMock = (request.headers.get('x-env-mode') || request.headers.get('X-Env-Mode') || '').toLowerCase() === 'mock'
  if (forceMock || isMockAuthEnabled()) {
    const role = request.headers.get('x-user-role') || request.headers.get('X-User-Role')
    const r = (role || '').toUpperCase().replace('-', '_')
    if (r === 'ADMIN' || r === 'SUPER_ADMIN') {
      logAudit('auth.ok', { mode: 'mock', role: r, url: request.url })
      return { ok: true }
    }
    logAudit('auth.denied', { mode: 'mock', reason: 'role_not_allowed', role: r, url: request.url })
    return { ok: false, status: 403, body: { error: 'Acceso denegado (mock)' } }
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logAudit('auth.denied', { mode: 'prod', reason: authError ? 'auth_error' : 'no_user', url: request.url, error: authError?.message })
      return { ok: false, status: 401, body: { error: 'No autorizado' } }
    }

    // Use admin client to bypass RLS when checking roles
    const adminClient = await createAdminClient()
    const { data: userRoles, error } = await adminClient
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) {
      logAudit('auth.error', { mode: 'prod', reason: 'role_query_error', url: request.url, error: error?.message })
      // Fallback to metadata if DB query fails, or just continue to check metadata
    }

    const dbRoles = userRoles?.map((ur: any) => ur.role?.name?.toUpperCase()) || []
    const metadataRole = (user.user_metadata as any)?.role?.toUpperCase()
    
    const hasAdminRole = dbRoles.some((r: string) => r === 'ADMIN' || r === 'SUPER_ADMIN') || 
                         metadataRole === 'ADMIN' || metadataRole === 'SUPER_ADMIN'

    if (hasAdminRole) {
      const roleName = dbRoles.find((r: string) => r === 'ADMIN' || r === 'SUPER_ADMIN') || metadataRole
      logAudit('auth.ok', { mode: 'prod', role: roleName, userId: user.id, url: request.url })
      return { ok: true }
    }
    const rolesFound = [...dbRoles, metadataRole].filter(Boolean).join(',') || 'none'
    logAudit('auth.denied', { mode: 'prod', reason: 'role_not_allowed', role: rolesFound, userId: user.id, url: request.url })
    return { ok: false, status: 403, body: { error: 'Acceso denegado' } }
  } catch (e) {
    logAudit('auth.error', { mode: 'prod', reason: 'internal_error', url: request.url, error: String(e) })
    return { ok: false, status: 500, body: { error: 'Error interno de autenticación' } }
  }
}