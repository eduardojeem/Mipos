import { randomBytes } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/server'
import { normalizeRole } from '@/lib/roles'

export const INVITE_TTL_DAYS = 7

export function generateInviteToken(): string {
  return randomBytes(24).toString('hex')
}

export function inviteExpiry(): string {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Valida que un rol se pueda asignar por invitación dentro de la org:
 *  - existe y pertenece a la org (o es un rol de sistema, organization_id null);
 *  - el invitador no puede otorgar un rol por encima del suyo:
 *      · SUPER_ADMIN → solo super admin;
 *      · OWNER → solo owner o super admin.
 */
export async function resolveInviteRole(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  orgId: string,
  roleId: unknown,
  ctx: { isSuperAdmin: boolean; isOwner: boolean },
): Promise<{ ok: true; roleId: string; roleName: string } | { ok: false; error: string }> {
  const id = typeof roleId === 'string' ? roleId.trim() : String(roleId ?? '').trim()
  if (!id) return { ok: false, error: 'Rol inválido' }

  const { data: role } = await (admin as any)
    .from('roles')
    .select('id, name, organization_id, is_active')
    .eq('id', id)
    .maybeSingle()

  if (!role) return { ok: false, error: 'Rol no encontrado' }
  if (role.organization_id && role.organization_id !== orgId) {
    return { ok: false, error: 'Ese rol no pertenece a esta empresa' }
  }
  if (role.is_active === false) return { ok: false, error: 'Ese rol está inactivo' }

  const name = normalizeRole(role.name)
  if (name === 'SUPER_ADMIN' && !ctx.isSuperAdmin) {
    return { ok: false, error: 'No podés invitar con rol Super Admin' }
  }
  if (name === 'OWNER' && !(ctx.isOwner || ctx.isSuperAdmin)) {
    return { ok: false, error: 'Solo el dueño puede invitar con rol Propietario' }
  }

  return { ok: true, roleId: id, roleName: String(role.name) }
}

/** URL absoluta para aceptar la invitación (sin proveedor de email: se comparte el link). */
export function buildInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/invite?token=${encodeURIComponent(token)}`
}
