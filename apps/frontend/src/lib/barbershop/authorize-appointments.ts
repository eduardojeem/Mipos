import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getValidatedOrganizationId } from '@/lib/organization'
import { normalizeRole, type AppRole } from '@/lib/roles'

// Roles que pueden gestionar turnos (crear/editar/cobrar). Piso: CASHIER (barbero).
const WRITE_ROLES: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'CASHIER']
// Acciones destructivas (eliminar turno) solo admin de la empresa.
const ADMIN_ROLES: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'ADMIN']

// Resuelve el rol del usuario dentro de la org, replicando las fuentes que usa
// la capa de autorización (organization_members → roles, super admin, perfil).
// Devuelve 'UNKNOWN' cuando no se puede determinar (ej. membresía legacy).
async function resolveMemberRole(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  orgId: string,
): Promise<AppRole | 'UNKNOWN'> {
  const [{ data: profile }, { data: userRoles }] = await Promise.all([
    (admin as any).from('users').select('role').eq('id', userId).maybeSingle(),
    (admin as any).from('user_roles').select('role:roles(name)').eq('user_id', userId).eq('is_active', true),
  ])

  const profileRole = normalizeRole((profile as any)?.role)
  const urRoles = (((userRoles as any[]) || []).map((row) => {
    const rel = Array.isArray(row.role) ? row.role[0] : row.role
    return normalizeRole(rel?.name)
  }))
  if (profileRole === 'SUPER_ADMIN' || urRoles.includes('SUPER_ADMIN')) return 'SUPER_ADMIN'

  const { data: member } = await (admin as any)
    .from('organization_members')
    .select('is_owner, role_id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (member) {
    if ((member as any).is_owner) return 'OWNER'
    if ((member as any).role_id) {
      const { data: roleRow } = await (admin as any).from('roles').select('name').eq('id', (member as any).role_id).maybeSingle()
      const r = normalizeRole((roleRow as any)?.name)
      if (r !== 'USER') return r
    }
  }

  if (profileRole !== 'USER') return profileRole
  return 'UNKNOWN'
}

export type AppointmentsAuth =
  | { ok: false; response: NextResponse }
  | { ok: true; orgId: string; userId: string; role: AppRole | 'UNKNOWN' }

/**
 * Autoriza una operación sobre turnos: sesión + membresía + piso de rol.
 * - Por defecto exige rol CASHIER o superior.
 * - `adminOnly: true` exige OWNER/ADMIN (para acciones destructivas).
 * Tolerancia legacy: si el rol no se puede determinar ('UNKNOWN') pero la
 * membresía es válida, se permite la escritura (no destructiva) para no romper
 * usuarios sin fila en organization_members; las acciones admin se deniegan.
 */
export async function authorizeAppointments(
  request: NextRequest,
  opts?: { adminOnly?: boolean },
): Promise<AppointmentsAuth> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
  if (!user || userError) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const orgId = (await getValidatedOrganizationId(request)) || ''
  if (!orgId) {
    return { ok: false, response: NextResponse.json({ error: 'Organization header missing' }, { status: 400 }) }
  }

  const admin = await createAdminClient()
  const role = await resolveMemberRole(admin, user.id, orgId)
  const allowed = opts?.adminOnly ? ADMIN_ROLES : WRITE_ROLES
  const isAllowed = role !== 'UNKNOWN' ? allowed.includes(role) : !opts?.adminOnly

  if (!isAllowed) {
    return { ok: false, response: NextResponse.json({ error: 'No tenés permiso para esta acción' }, { status: 403 }) }
  }

  return { ok: true, orgId, userId: user.id, role }
}
