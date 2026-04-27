import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserOrganizationId } from '@/app/api/_utils/organization'
import { isMockAuthEnabled } from '@/lib/env'
import { logAudit } from '@/app/api/admin/_utils/audit'

export interface RoleRequirement {
  roles: string[]
  permissions?: string[]
  requireAllPermissions?: boolean
}

export interface RoleValidationResult {
  ok: boolean
  status: number
  body: { error: string }
  userId?: string
  userRole?: string
  permissions?: string[]
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const lowered = trimmed.toLowerCase()
  if (lowered === 'undefined' || lowered === 'null') {
    return null
  }

  return trimmed
}

/**
 * Valida que el usuario tenga uno de los roles especificados
 */
export async function validateRole(
  request: NextRequest,
  requirement: RoleRequirement
): Promise<RoleValidationResult> {
  const forceMock = (request.headers.get('x-env-mode') || request.headers.get('X-Env-Mode') || '').toLowerCase() === 'mock'

  if (forceMock || isMockAuthEnabled()) {
    const role = request.headers.get('x-user-role') || request.headers.get('X-User-Role')
    const userId = request.headers.get('x-user-id') || request.headers.get('X-User-Id') || 'mock-user-id'

    if (!role) {
      logAudit('auth.denied', { mode: 'mock', reason: 'no_role_header', url: request.url })
      return {
        ok: false,
        status: 401,
        body: { error: 'No autorizado (mock)' }
      }
    }

    const normalizedRole = role.toUpperCase().replace('-', '_')
    const allowedRoles = requirement.roles.map(r => r.toUpperCase().replace('-', '_'))

    if (!allowedRoles.includes(normalizedRole)) {
      logAudit('auth.denied', {
        mode: 'mock',
        reason: 'role_not_allowed',
        role: normalizedRole,
        allowed: allowedRoles,
        url: request.url
      })
      return {
        ok: false,
        status: 403,
        body: { error: 'Acceso denegado: rol no autorizado (mock)' }
      }
    }

    // En modo mock, asumimos que tiene todos los permisos necesarios
    logAudit('auth.ok', { mode: 'mock', role: normalizedRole, userId, url: request.url })
    return {
      ok: true,
      status: 200,
      body: { error: '' },
      userId,
      userRole: normalizedRole,
      permissions: requirement.permissions || []
    }
  }

  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logAudit('auth.denied', { mode: 'prod', reason: authError ? 'auth_error' : 'no_user', url: request.url, error: authError?.message })
      return {
        ok: false,
        status: 401,
        body: { error: 'No autorizado' }
      }
    }

    // Obtener el rol del usuario
    const { data: profile, error: profileError } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      logAudit('auth.error', { mode: 'prod', reason: 'profile_query_error', url: request.url, error: profileError?.message })
      return {
        ok: false,
        status: 500,
        body: { error: 'Error consultando perfil de usuario' }
      }
    }

    let userRole = (profile as any)?.role ?? (user.user_metadata as any)?.role
    if (!userRole) {
      const headerOrgId = normalizeString(
        request.headers.get('x-organization-id') || request.headers.get('X-Organization-Id')
      )
      let orgId = headerOrgId || ''
      if (!orgId) {
        orgId = await getUserOrganizationId(user.id) || ''
      }
      if (orgId) {
        const { data: omRow } = await adminSupabase
          .from('organization_members')
          .select('role_id, role:roles(name, is_active)')
          .eq('user_id', user.id)
          .eq('organization_id', orgId)
          .maybeSingle()
        userRole = (omRow as any)?.role?.name || null
      }
      if (!userRole) {
        logAudit('auth.denied', { mode: 'prod', reason: 'no_role', userId: user.id, url: request.url })
        return {
          ok: false,
          status: 403,
          body: { error: 'Usuario sin rol asignado' }
        }
      }
    }

    const normalizedUserRole = userRole.toUpperCase().replace('-', '_')
    const allowedRoles = requirement.roles.map(r => r.toUpperCase().replace('-', '_'))

    if (!allowedRoles.includes(normalizedUserRole)) {
      logAudit('auth.denied', {
        mode: 'prod',
        reason: 'role_not_allowed',
        role: normalizedUserRole,
        allowed: allowedRoles,
        userId: user.id,
        url: request.url
      })
      return {
        ok: false,
        status: 403,
        body: { error: 'Acceso denegado: rol no autorizado' }
      }
    }

    // Validar permisos adicionales si se requieren
    if (requirement.permissions && requirement.permissions.length > 0) {
      // ADMIN y SUPER_ADMIN tienen todos los permisos implícitamente
      if (['ADMIN', 'SUPER_ADMIN'].includes(normalizedUserRole)) {
        return {
          ok: true,
          status: 200,
          body: { error: '' },
          userId: user.id,
          userRole: normalizedUserRole,
          permissions: requirement.permissions // Asumimos que tiene todos
        }
      }

      const { data: roleRec, error: roleLookupError } = await adminSupabase
        .from('roles')
        .select('id, is_active')
        .eq('name', normalizedUserRole)
        .single()

      if (roleLookupError || !roleRec || roleRec.is_active === false) {
        logAudit('auth.error', { mode: 'prod', reason: 'role_lookup_error', url: request.url, error: roleLookupError?.message })
        return {
          ok: false,
          status: 500,
          body: { error: 'Error consultando rol del usuario' }
        }
      }

      const { data: rpRows, error: permissionsError } = await adminSupabase
        .from('role_permissions')
        .select('permission_id, permissions:permissions(name, is_active)')
        .eq('role_id', (roleRec as any).id)

      if (permissionsError) {
        logAudit('auth.error', { mode: 'prod', reason: 'permissions_query_error', url: request.url, error: permissionsError?.message })
        return {
          ok: false,
          status: 500,
          body: { error: 'Error consultando permisos del rol' }
        }
      }

      const rawPerms = (rpRows || [])
        .map((row: any) => row.permissions?.is_active ? row.permissions?.name : null)
        .filter((name: string | null) => !!name)
      const userPermissions = rawPerms
        .flatMap((name: string) => {
          const n = String(name).trim()
          const variants = [n]
          if (n.includes(':')) variants.push(n.replace(/:/g, '.'))
          if (n.includes('.')) variants.push(n.replace(/\./g, ':'))
          return variants
        })
      const requiredPermissions = requirement.permissions

      if (requirement.requireAllPermissions) {
        // Requiere TODOS los permisos
        const hasAllPermissions = requiredPermissions.every(perm => {
          const p = String(perm).trim()
          const variants = [p]
          if (p.includes(':')) variants.push(p.replace(/:/g, '.'))
          if (p.includes('.')) variants.push(p.replace(/\./g, ':'))
          return variants.some(v => userPermissions.includes(v))
        })
        if (!hasAllPermissions) {
          logAudit('auth.denied', {
            mode: 'prod',
            reason: 'insufficient_permissions',
            role: normalizedUserRole,
            required: requiredPermissions,
            userId: user.id,
            url: request.url
          })
          return {
            ok: false,
            status: 403,
            body: { error: 'Acceso denegado: permisos insuficientes' }
          }
        }
      } else {
        // Requiere AL MENOS UN permiso
        const hasAnyPermission = requiredPermissions.some(perm => {
          const p = String(perm).trim()
          const variants = [p]
          if (p.includes(':')) variants.push(p.replace(/:/g, '.'))
          if (p.includes('.')) variants.push(p.replace(/\./g, ':'))
          return variants.some(v => userPermissions.includes(v))
        })
        if (!hasAnyPermission) {
          logAudit('auth.denied', {
            mode: 'prod',
            reason: 'no_required_permission',
            role: normalizedUserRole,
            required: requiredPermissions,
            userId: user.id,
            url: request.url
          })
          return {
            ok: false,
            status: 403,
            body: { error: 'Acceso denegado: se requiere al menos un permiso específico' }
          }
        }
      }
    }

    logAudit('auth.ok', { mode: 'prod', role: normalizedUserRole, userId: user.id, url: request.url })
    return {
      ok: true,
      status: 200,
      body: { error: '' },
      userId: user.id,
      userRole: normalizedUserRole,
      permissions: requirement.permissions || []
    }
  } catch (error) {
    logAudit('auth.error', { mode: 'prod', reason: 'internal_error', url: request.url, error: String(error) })
    return {
      ok: false,
      status: 500,
      body: { error: 'Error interno de autenticación' }
    }
  }
}

/**
 * Requiere rol de administrador (ADMIN o SUPER_ADMIN)
 */
export async function requireAdmin(request: NextRequest): Promise<RoleValidationResult> {
  return validateRole(request, {
    roles: ['ADMIN', 'SUPER_ADMIN']
  })
}

/**
 * Requiere rol de cajero o superior
 */
export async function requireCashier(request: NextRequest): Promise<RoleValidationResult> {
  return validateRole(request, {
    roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'CASHIER']
  })
}

/**
 * Requiere rol de gerente o superior
 */
export async function requireManager(request: NextRequest): Promise<RoleValidationResult> {
  return validateRole(request, {
    roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER']
  })
}

/**
 * Requiere permisos específicos para operaciones del POS
 */
export async function requirePOSPermissions(
  request: NextRequest,
  permissions: string[]
): Promise<RoleValidationResult> {
  return validateRole(request, {
    roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'CASHIER', 'SELLER'],
    permissions,
    requireAllPermissions: false
  })
}
