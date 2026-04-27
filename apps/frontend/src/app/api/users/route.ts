import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS, resolveCompanyAccess } from '@/app/api/_utils/company-authorization'
import { buildUserResponse, COMPANY_USER_ROLES, normalizeCompanyUserRole, normalizeCompanyUserStatus, syncMembershipRole } from './_lib'

function getRequestedOrganizationId(request: NextRequest): string | undefined {
  const headerOrgId = request.headers.get('x-organization-id')?.trim()
  const queryOrgId = request.nextUrl.searchParams.get('organizationId')?.trim()
  return headerOrgId || queryOrgId || undefined
}

async function requireUsersAccess(request: NextRequest) {
  return resolveCompanyAccess({
    companyId: getRequestedOrganizationId(request),
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.TEAM_MANAGEMENT,
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })
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

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(200, parseInt(request.nextUrl.searchParams.get('limit') || '25', 10)))
    const search = (request.nextUrl.searchParams.get('search') || '').toLowerCase().trim()
    const roleFilter = (request.nextUrl.searchParams.get('role') || '').toUpperCase().trim()
    const statusFilter = (request.nextUrl.searchParams.get('status') || '').toUpperCase().trim()

    if (!companyId && access.context.isSuperAdmin) {
      return NextResponse.json({ success: true, data: [], total: 0, warning: 'Selecciona una organizacion para gestionar usuarios.' })
    }

    const admin = createAdminClient()
    const { data: memberships, error } = await admin
      .from('organization_members')
      .select(`
        organization_id,
        user_id,
        role_id,
        is_owner,
        created_at,
        updated_at,
        user:users(id,email,full_name,phone,status,created_at,updated_at,last_login),
        role:roles(name,display_name),
        organization:organizations(id,name)
      `)
      .eq('organization_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }

    let users = (memberships || []).map(buildUserResponse)

    if (search) {
      users = users.filter((user) =>
        String(user.name || '').toLowerCase().includes(search) ||
        String(user.email || '').toLowerCase().includes(search)
      )
    }

    if (roleFilter && roleFilter !== 'ALL') {
      users = users.filter((user) => String(user.role).toUpperCase() === roleFilter)
    }

    if (statusFilter && statusFilter !== 'ALL') {
      users = users.filter((user) => String(user.status).toUpperCase() === statusFilter.toUpperCase())
    }

    const total = users.length
    const start = (page - 1) * limit
    const data = users.slice(start, start + limit)

    return NextResponse.json({ success: true, data, total })
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

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contrasena debe tener al menos 8 caracteres' }, { status: 400 })
    }

    if (!COMPANY_USER_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol invalido' }, { status: 400 })
    }

    if (role === 'OWNER' && !access.context.isSuperAdmin) {
      return NextResponse.json({ error: 'Solo super admin puede asignar rol OWNER desde esta interfaz' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: existingMemberships, error: countError } = await admin
      .from('organization_members')
      .select('user_id', { count: 'exact' })
      .eq('organization_id', companyId)

    if (!countError && !access.context.features.includes(COMPANY_FEATURE_KEYS.UNLIMITED_USERS) && (existingMemberships?.length || 0) >= 10) {
      return NextResponse.json({ error: 'Tu plan actual alcanzo el limite operativo de usuarios para esta seccion.' }, { status: 403 })
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
          status,
        },
        { onConflict: 'id' }
      )

    if (userUpsertError) {
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'No se pudo sincronizar el perfil del usuario' }, { status: 500 })
    }

    await syncMembershipRole({
      organizationId: companyId,
      userId,
      roleName: role,
      isOwner: role === 'OWNER',
      activate: status === 'ACTIVE',
    })

    const { data: createdMembership } = await admin
      .from('organization_members')
      .select(`
        organization_id,
        user_id,
        role_id,
        is_owner,
        created_at,
        updated_at,
        user:users(id,email,full_name,phone,status,created_at,updated_at,last_login),
        role:roles(name,display_name),
        organization:organizations(id,name)
      `)
      .eq('organization_id', companyId)
      .eq('user_id', userId)
      .maybeSingle()

    return NextResponse.json({ success: true, user: buildUserResponse(createdMembership) }, { status: 201 })
  } catch (error) {
    console.error('Error in users POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
