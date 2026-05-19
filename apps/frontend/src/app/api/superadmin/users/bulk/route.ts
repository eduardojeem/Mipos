import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

const MAX_BATCH_SIZE = 100

// is_active requiere la migración 20260519_add_is_active_to_users.sql.
const ALLOWED_UPDATE_FIELDS = new Set([
  'full_name',
  'role',
  'phone',
  'is_active',
])

function pickAllowedFields(body: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_UPDATE_FIELDS.has(key)) {
      safe[key] = value
    }
  }
  return safe
}

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

    const body = await request.json() as { ids?: string[]; updates?: Record<string, unknown>; operation?: 'update' | 'delete' }
    const { ids, updates, operation } = body
    if (!operation) {
      return NextResponse.json({ error: 'Operación requerida' }, { status: 400 })
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere una lista de ids' }, { status: 400 })
    }

    if (ids.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BATCH_SIZE} usuarios por operación. Recibidos: ${ids.length}` },
        { status: 400 },
      )
    }

    if (ids.includes(auth.userId)) {
      return NextResponse.json(
        { error: 'No puedes incluir tu propia cuenta en la operación masiva' },
        { status: 400 },
      )
    }

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }

    if (operation === 'update') {
      if (!updates) {
        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
      }

      const safeUpdates = pickAllowedFields(updates)
      if (Object.keys(safeUpdates).length === 0) {
        return NextResponse.json({ error: 'Ningún campo válido para actualizar' }, { status: 400 })
      }

      // Si la operación degrada o desactiva super admins, validar que queden activos
      const removingSuperRole = 'role' in safeUpdates && String(safeUpdates.role || '').toUpperCase() !== 'SUPER_ADMIN'
      const deactivating = 'is_active' in safeUpdates && safeUpdates.is_active === false

      if (removingSuperRole || deactivating) {
        const { data: targeted } = await adminClient
          .from('users')
          .select('id, role')
          .in('id', ids)

        const affectedSuperAdminIds = (targeted || [])
          .filter((u: any) => String(u.role || '').toUpperCase() === 'SUPER_ADMIN')
          .map((u: any) => u.id)

        if (affectedSuperAdminIds.length > 0) {
          const { count } = await adminClient
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'SUPER_ADMIN')
          const remaining = (count ?? 0) - affectedSuperAdminIds.length
          if (remaining < 1) {
            return NextResponse.json(
              { error: 'La operación dejaría al sistema sin super administradores activos' },
              { status: 400 },
            )
          }
        }
      }

      const { error } = await adminClient.from('users').update(safeUpdates).in('id', ids)
      if (error) {
        return NextResponse.json({ error: 'Error en actualización masiva', details: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (operation === 'delete') {
      // No permitir borrar super admins en lote — protege contra lockout total
      const { data: targeted } = await adminClient
        .from('users')
        .select('id, role')
        .in('id', ids)

      const superAdminIds = (targeted || [])
        .filter((u: any) => String(u.role || '').toUpperCase() === 'SUPER_ADMIN')
        .map((u: any) => u.id)

      if (superAdminIds.length > 0) {
        return NextResponse.json(
          { error: `La lista incluye ${superAdminIds.length} super administrador(es). Elimínalos individualmente.` },
          { status: 400 },
        )
      }

      const { error } = await adminClient.from('users').delete().in('id', ids)
      if (error) {
        return NextResponse.json({ error: 'Error en eliminación masiva', details: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Operación no soportada' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
