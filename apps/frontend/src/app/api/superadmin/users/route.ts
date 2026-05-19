import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { buildUserResponse } from '@/app/api/users/_lib'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const searchParams = new URL(request.url).searchParams
    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
    const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const organizationId = (searchParams.get('organizationId') || '').trim()
    const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw)
    const limit = Number.isNaN(limitRaw) ? 20 : Math.max(1, Math.min(100, limitRaw))
    const start = (page - 1) * limit
    const end = start + limit - 1

    const admin = createAdminClient() as any

    if (organizationId) {
      // Filtrar por organización — status no existe en users, se omite del join
      const { data: memberships, error } = await admin
        .from('organization_members')
        .select(`
          organization_id,
          user_id,
          role_id,
          is_owner,
          created_at,
          updated_at,
          user:users(id,email,full_name,phone,created_at,updated_at,last_login),
          role:roles(name,display_name),
          organization:organizations(id,name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[superadmin/users] Organization members query error:', error)
        return NextResponse.json({ error: 'Error listando miembros de la organizacion', details: error.message }, { status: 500 })
      }

      let users = (memberships || []).map((member: any) => {
        const mapped = buildUserResponse(member)
        return {
          id: mapped.id,
          email: mapped.email || '',
          full_name: mapped.name || null,
          role: mapped.role,
          organization_id: mapped.organizationId,
          organization: mapped.organizationName ? { name: mapped.organizationName } : null,
          created_at: mapped.createdAt,
          last_sign_in_at: mapped.lastLogin || null,
          is_active: mapped.status === 'active',
        }
      })

      if (search) {
        users = users.filter((user: any) =>
          String(user.email || '').toLowerCase().includes(search) ||
          String(user.full_name || '').toLowerCase().includes(search) ||
          String(user.role || '').toLowerCase().includes(search)
        )
      }

      const total = users.length
      return NextResponse.json({
        success: true,
        users: users.slice(start, end + 1),
        total,
        page,
        limit,
      })
    }

    // Query general — sin columna status (no existe en la tabla)
    let query = admin
      .from('users')
      .select('id,email,full_name,role,organization_id,created_at,last_login', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    const { data, error, count } = await query.range(start, end)

    if (error || !Array.isArray(data)) {
      console.error('[superadmin/users] Query error:', error)
      // SECURITY: do NOT fall back to listing auth users with role read from
      // user_metadata — that field is user-modifiable and would let impostors
      // appear with elevated roles in the admin UI. Fail closed instead.
      return NextResponse.json({ error: 'Error listando usuarios', details: error?.message || 'consulta no disponible' }, { status: 500 })
    }

    // Enriquecer con el rol real de organization_members (fuente de verdad para el rol en org)
    // y con el nombre de la organización
    const userIds = data.map((u: any) => u.id).filter(Boolean)
    let membershipsByUserId: Record<string, { roleName: string; orgName: string | null }> = {}

    if (userIds.length > 0) {
      const { data: memberships } = await admin
        .from('organization_members')
        .select('user_id, is_owner, role:roles(name), organization:organizations(name)')
        .in('user_id', userIds)

      if (Array.isArray(memberships)) {
        for (const m of memberships) {
          const uid = m.user_id
          if (!uid || membershipsByUserId[uid]) continue // tomar solo la primera membresía por usuario
          const roleRaw = Array.isArray(m.role) ? m.role[0]?.name : m.role?.name
          const orgRaw = Array.isArray(m.organization) ? m.organization[0]?.name : m.organization?.name
          membershipsByUserId[uid] = {
            roleName: roleRaw || (m.is_owner ? 'ADMIN' : ''),
            orgName: orgRaw || null,
          }
        }
      }
    }

    // Normalize field names — la tabla no tiene status, todos se consideran activos
    const users = data.map((u: any) => {
      const membership = membershipsByUserId[u.id]
      // Preferir el rol de organization_members sobre users.role (más actualizado)
      const effectiveRole = membership?.roleName || u.role || null
      return {
        ...u,
        role: effectiveRole,
        last_sign_in_at: u.last_sign_in_at ?? u.last_login ?? null,
        is_active: true, // tabla users no tiene columna status
        organization: membership?.orgName ? { name: membership.orgName } : null,
      }
    })

    return NextResponse.json({ success: true, users, total: count || data.length, page, limit })
  } catch (err) {
    console.error('[superadmin/users] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor', details: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
