import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { sanitizeSearch } from '@/app/api/_utils/search'
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
      // Filtrar por organización
      const { data: memberships, error } = await admin
        .from('organization_members')
        .select(`
          organization_id,
          user_id,
          role_id,
          is_owner,
          created_at,
          updated_at,
          user:users(id,email,full_name,phone,is_active,created_at,updated_at),
          role:roles(name,display_name),
          organization:organizations(id,name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[superadmin/users] Organization members query error:', error)
        return NextResponse.json({ error: 'Error listando miembros de la organización', details: error.message }, { status: 500 })
      }

      // Enriquecer last_sign_in_at desde auth.admin.listUsers
      const memberUserIds = (memberships || []).map((m: any) => m.user_id).filter(Boolean)
      const lastSignInMap = new Map<string, string | null>()
      if (memberUserIds.length > 0) {
        try {
          const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: Math.min(200, memberUserIds.length) })
          const authUsers = (authList?.users as any[]) || []
          for (const au of authUsers) {
            if (memberUserIds.includes(au.id)) {
              lastSignInMap.set(au.id, au.last_sign_in_at || null)
            }
          }
        } catch {
          // optional enrichment
        }
      }

      let users = (memberships || []).map((member: any) => {
        const mapped = buildUserResponse(member)
        const userObj = Array.isArray(member.user) ? member.user[0] : member.user
        const isActive = typeof userObj?.is_active === 'boolean' ? userObj.is_active : (mapped.status === 'active')
        return {
          id: mapped.id,
          email: mapped.email || '',
          full_name: mapped.name || null,
          role: mapped.role,
          organization_id: mapped.organizationId,
          organization: mapped.organizationName ? { name: mapped.organizationName } : null,
          created_at: mapped.createdAt,
          last_sign_in_at: lastSignInMap.get(mapped.id) ?? mapped.lastLogin ?? null,
          is_active: isActive,
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

    // Query general — requiere migración 20260519_add_is_active_to_users.sql
    let query = admin
      .from('users')
      .select('id,email,full_name,role,is_active,organization_id,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      { const s = sanitizeSearch(search); query = query.or(`email.ilike.%${s}%,full_name.ilike.%${s}%`) }
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
    // y con el nombre de la organización + last_sign_in_at desde auth.users
    const userIds = data.map((u: any) => u.id).filter(Boolean)
    let membershipsByUserId: Record<string, { roleName: string; orgName: string | null }> = {}
    const lastSignInMap = new Map<string, string | null>()

    if (userIds.length > 0) {
      const [membershipsRes, authListRes] = await Promise.all([
        admin
          .from('organization_members')
          .select('user_id, is_owner, role:roles(name), organization:organizations(name)')
          .in('user_id', userIds),
        admin.auth.admin
          .listUsers({ page: 1, perPage: Math.min(200, userIds.length) })
          .catch(() => ({ data: { users: [] } } as any)),
      ])

      if (Array.isArray(membershipsRes?.data)) {
        for (const m of membershipsRes.data) {
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

      const authUsers = (authListRes?.data?.users as any[]) || []
      for (const au of authUsers) {
        if (userIds.includes(au.id)) {
          lastSignInMap.set(au.id, au.last_sign_in_at || null)
        }
      }
    }

    const users = data.map((u: any) => {
      const membership = membershipsByUserId[u.id]
      // Preferir el rol de organization_members sobre users.role (más actualizado)
      const effectiveRole = membership?.roleName || u.role || null
      return {
        ...u,
        role: effectiveRole,
        last_sign_in_at: lastSignInMap.get(u.id) ?? null,
        is_active: typeof u.is_active === 'boolean' ? u.is_active : true,
        organization: membership?.orgName ? { name: membership.orgName } : null,
      }
    })

    return NextResponse.json({ success: true, users, total: count || data.length, page, limit })
  } catch (err) {
    console.error('[superadmin/users] Unexpected error:', err)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV !== 'production' ? (err instanceof Error ? err.message : 'Unknown error') : undefined,
    }, { status: 500 })
  }
}
