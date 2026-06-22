import { NextResponse } from 'next/server'
import type { createAdminClient } from '@/lib/supabase/server'

type AccessCtx = {
  isSuperAdmin: boolean
  isOwner: boolean
  permissions: string[]
}

/**
 * Evita la escalada de privilegios al asignar permisos a un rol.
 *
 * Regla:
 *  - SUPER_ADMIN y OWNER pueden otorgar cualquier permiso (gestionan toda la
 *    plataforma / la empresa).
 *  - Cualquier otro (ej. ADMIN) solo puede otorgar permisos que ÉL MISMO posee:
 *    los nombres de los permisos pedidos deben ser un subconjunto de
 *    `ctx.permissions` (nombres granulares de la tabla `permissions`).
 *
 * Devuelve `{ ok: true }` o una respuesta 403 lista para retornar.
 */
export async function assertGrantablePermissions(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  permissionIds: unknown,
  ctx: AccessCtx,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (ctx.isSuperAdmin || ctx.isOwner) return { ok: true }
  if (!Array.isArray(permissionIds) || permissionIds.length === 0) return { ok: true }

  const ids = permissionIds.filter((p) => typeof p === 'string' && p.trim()) as string[]
  if (ids.length === 0) return { ok: true }

  const { data: reqPerms } = await (supabase as any)
    .from('permissions')
    .select('name')
    .in('id', ids)

  const requestedNames = ((reqPerms || []) as Array<{ name?: string | null }>)
    .map((p) => String(p.name || ''))
    .filter(Boolean)

  const held = new Set(ctx.permissions || [])
  const notAllowed = requestedNames.filter((name) => !held.has(name))

  if (notAllowed.length > 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: 'No podés otorgar permisos que vos no tenés', permissions: notAllowed },
        { status: 403 },
      ),
    }
  }

  return { ok: true }
}
