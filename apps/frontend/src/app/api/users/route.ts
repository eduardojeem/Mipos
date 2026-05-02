import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  resolveCompanyAccess,
} from '@/app/api/_utils/company-authorization'
import { getSubscriptionSnapshot, resolveSubscriptionPlanLimits } from '@/app/api/subscription/_lib'
import {
  buildUserResponse,
  COMPANY_USER_ROLES,
  normalizeCompanyUserRole,
  normalizeCompanyUserStatus,
  syncMembershipRole,
} from './_lib'

const VALID_ROLE_FILTERS = new Set(['ALL', 'OWNER', 'ADMIN', 'SELLER', 'WAREHOUSE'])
const VALID_STATUS_FILTERS = new Set(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'])

function getRequestedOrganizationId(request: NextRequest): string | undefined {
  const headerOrgId = request.headers.get('x-organization-id')?.trim()
  const queryOrgId = request.nextUrl.searchParams.get('organizationId')?.trim()
  return headerOrgId || queryOrgId || undefined
}

function parsePositiveInt(rawValue: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(rawValue || '', 10)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.max(min, Math.min(max, parsed))
}

function normalizeSearchTerm(rawValue: string | null) {
  return String(rawValue || '').trim().replace(/,/g, ' ')
}

async function requireUsersAccess(request: NextRequest) {
  return resolveCompanyAccess({
    companyId: getRequestedOrganizationId(request),
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })
}

async function resolveRoleIdForFilter(admin: ReturnType<typeof createAdminClient>, roleFilter: string) {
  const normalizedRole = normalizeCompanyUserRole(roleFilter)
  const { data: roleRecord, error } = await admin
    .from('roles')
    .select('id')
    .eq('name', normalizedRole)
    .maybeSingle()

  if (error) {
    throw error
  }

  return roleRecord?.id || null
}

async function resolveOrganizationUserSeatLimit(organizationId: string) {
  try {
    const snapshot = await getSubscriptionSnapshot(organizationId)
    return resolveSubscriptionPlanLimits(snapshot.plan).maxUsers
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireUsersAccess(request)
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const companyId = getRequestedOrganizationId(request) || access.context.companyId
    if (!companyId && !access.context.isSuperAdmin) {
      return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 })
    }

    const page = parsePositiveInt(request.nextUrl.searchParams.get('page'), 1, 1, 100000)
    const limit = parsePositiveInt(request.nextUrl.searchParams.get('limit'), 25, 1, 200)
    const search = normalizeSearchTerm(request.nextUrl.searchParams.get('search'))
    const roleFilter = String(request.nextUrl.searchParams.get('role') || 'ALL').toUpperCase().trim()
    const statusFilter = String(request.nextUrl.searchParams.get('status') || 'ALL').toUpperCase().trim()

    if (!VALID_ROLE_FILTERS.has(roleFilter)) {
      return NextResponse.json({ error: 'Filtro de rol invalido' }, { status: 400 })
    }

    if (!VALID_STATUS_FILTERS.has(statusFilter)) {
      return NextResponse.json({ error: 'Filtro de estado invalido' }, { status: 400 })
    }

    if (!companyId && access.context.isSuperAdmin) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        teamTotal: 0,
        warning: 'Selecciona una organizacion para gestionar usuarios.',
      })
    }

    const admin = createAdminClient()
    const { count: teamTotal, error: teamCountError } = await admin
      .from('organization_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', companyId)

    if (teamCountError) {
      return NextResponse.json({ error: 'No se pudo calcular el total de miembros' }, { status: 500 })
    }



    let filteredRoleId: string | null = null
    if (roleFilter !== 'ALL' && roleFilter !== 'OWNER') {
      try {
        filteredRoleId = await resolveRoleIdForFilter(admin, roleFilter)
      } catch {
        return NextResponse.json({ error: 'No se pudo resolver el rol solicitado' }, { status: 500 })
      }

      if (!filteredRoleId) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          teamTotal: teamTotal || 0,
        })
      }
    }

    let membershipQuery = admin
      .from('organization_members')
      .select(
        `
        organization_id,
        user_id,
        role_id,
        is_owner,
        created_at,
        updated_at,
        user:users!inner(id,email,full_name,created_at,updated_at),
        role:roles(name,display_name),
        organization:organizations(id,name)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', companyId)

    if (search) {
      const searchPattern = `%${search}%`
      membershipQuery = membershipQuery.or(
        `full_name.ilike.${searchPattern},email.ilike.${searchPattern}`,
        { foreignTable: 'user' }
      )
    }

    if (roleFilter === 'OWNER') {
      membershipQuery = membershipQuery.eq('is_owner', true)
    } else if (filteredRoleId) {
      membershipQuery = membershipQuery.eq('is_owner', false).eq('role_id', filteredRoleId)
    }

    const start = (page - 1) * limit
    const end = start + limit - 1
    const { data: memberships, error, count } = await membershipQuery
      .order('created_at', { ascending: false })
      .range(start, end)



    if (error) {
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: (memberships || []).map(buildUserResponse),
      total: count || 0,
      teamTotal: teamTotal || 0,
    })
  } catch (error) {
    console.error('Error in users GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await resolveCompanyAccess({
      companyId: getRequestedOrganizationId(request),
      permission: COMPANY_PERMISSIONS.MANAGE_USERS,
      feature: COMPANY_FEATURE_KEYS.TEAM_MANAGEMENT,
      allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
    })

    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const body = await request.json()
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')
    const role = normalizeCompanyUserRole(body?.role)
    const status = normalizeCompanyUserStatus(body?.status)
    const companyId = access.context.isSuperAdmin
      ? String(body?.organizationId || getRequestedOrganizationId(request) || access.context.companyId || '').trim()
      : String(access.context.companyId || '')

    if (!companyId) {
      return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 })
    }

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, email y contrasena son requeridos' }, { status: 400 })
    }

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El formato del email no es valido' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contrasena debe tener al menos 8 caracteres' }, { status: 400 })
    }

    if (!COMPANY_USER_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
    }

    if (role === 'OWNER' && !access.context.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Solo super admin puede asignar rol OWNER desde esta interfaz' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()
    const { data: existingMemberships, error: countError } = await admin
      .from('organization_members')
      .select('user_id', { count: 'exact' })
      .eq('organization_id', companyId)

    const resolvedUserSeatLimit = await resolveOrganizationUserSeatLimit(companyId)
    const effectiveUserSeatLimit = resolvedUserSeatLimit === 999999
      ? null
      : (typeof resolvedUserSeatLimit === 'number' && Number.isFinite(resolvedUserSeatLimit) && resolvedUserSeatLimit > 0
        ? resolvedUserSeatLimit
        : null)

    if (
      !countError &&
      effectiveUserSeatLimit !== null &&
      (existingMemberships?.length || 0) >= effectiveUserSeatLimit
    ) {
      return NextResponse.json(
        { error: `Tu plan actual alcanzo el limite de ${effectiveUserSeatLimit} usuarios para esta organizacion.` },
        { status: 403 }
      )
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role,
        organization_id: companyId,
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'No se pudo crear el usuario' }, { status: 400 })
    }

    const userId = authData.user.id
    const { error: userUpsertError } = await admin
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          full_name: name,
          role,
          organization_id: companyId,
        },
        { onConflict: 'id' }
      )

    if (userUpsertError) {
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'No se pudo sincronizar el perfil del usuario' }, { status: 500 })
    }

    try {
      await syncMembershipRole({
        organizationId: companyId,
        userId,
        roleName: role,
        isOwner: role === 'OWNER',
        activate: status === 'ACTIVE',
        membershipStatus: status,
      })
    } catch (membershipSyncError) {
      await admin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', companyId)
      await admin
        .from('organization_members')
        .delete()
        .eq('organization_id', companyId)
        .eq('user_id', userId)
      await admin
        .from('users')
        .delete()
        .eq('id', userId)
      await admin.auth.admin.deleteUser(userId)

      return NextResponse.json(
        {
          error:
            membershipSyncError instanceof Error
              ? membershipSyncError.message
              : 'No se pudo crear la membresia del usuario',
        },
        { status: 500 }
      )
    }

    const { data: createdMembership, error: createdMembershipError } = await admin
      .from('organization_members')
      .select(`
        organization_id,
        user_id,
        role_id,
        is_owner,
        created_at,
        updated_at,
        user:users(id,email,full_name,created_at,updated_at),
        role:roles(name,display_name),
        organization:organizations(id,name)
      `)
      .eq('organization_id', companyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (createdMembershipError || !createdMembership) {
      return NextResponse.json(
        { error: createdMembershipError?.message || 'No se pudo confirmar la membresia creada' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, user: buildUserResponse(createdMembership) }, { status: 201 })
  } catch (error) {
    console.error('Error in users POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
