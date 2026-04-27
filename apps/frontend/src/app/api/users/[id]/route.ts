import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS, resolveCompanyAccess } from '@/app/api/_utils/company-authorization'
import { buildUserResponse, deactivateMembershipRole, normalizeCompanyUserRole, normalizeCompanyUserStatus, syncMembershipRole } from '../_lib'

type ActiveRoleRow = {
  role?: { name?: string | null } | Array<{ name?: string | null }> | null
}

function isSuperAdminRole(rows: ActiveRoleRow[] | null | undefined) {
  return (rows || []).some((row) => {
    const role = Array.isArray(row.role) ? row.role[0] : row.role
    return String(role?.name || '').toUpperCase() === 'SUPER_ADMIN'
  })
}

function getRequestedOrganizationId(request: NextRequest, body?: Record<string, unknown>): string | undefined {
  const headerOrgId = request.headers.get('x-organization-id')?.trim()
  const queryOrgId = request.nextUrl.searchParams.get('organizationId')?.trim()
  const bodyOrgId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : ''
  return headerOrgId || queryOrgId || bodyOrgId || undefined
}

async function resolveAccessForUserMutation(request: NextRequest, body?: Record<string, unknown>) {
  return resolveCompanyAccess({
    companyId: getRequestedOrganizationId(request, body),
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.TEAM_MANAGEMENT,
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const access = await resolveAccessForUserMutation(request, body)
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id: userId } = await params
    const companyId = access.context.isSuperAdmin
      ? String(getRequestedOrganizationId(request, body) || access.context.companyId || '').trim()
      : String(access.context.companyId || '')

    if (!companyId) {
      return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 })
    }

    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const role = normalizeCompanyUserRole(body?.role as string)
    const status = normalizeCompanyUserStatus(body?.status as string)
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 })
    }

    if (role === 'OWNER' && !access.context.isSuperAdmin) {
      return NextResponse.json({ error: 'Solo super admin puede asignar rol OWNER desde esta interfaz' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('organization_members')
      .select('organization_id,user_id,is_owner,role_id')
      .eq('organization_id', companyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Usuario no encontrado en la organizacion actual' }, { status: 404 })
    }

    const { data: activeSuperRole } = await admin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', userId)
      .eq('is_active', true)

    const targetIsSuperAdmin = isSuperAdminRole(activeSuperRole as ActiveRoleRow[] | null | undefined)
    if (targetIsSuperAdmin && !access.context.isSuperAdmin) {
      return NextResponse.json({ error: 'No puedes modificar un super admin desde este panel' }, { status: 403 })
    }

    await admin
      .from('users')
      .upsert(
        {
          id: userId,
          email,
          full_name: name,
          role,
          organization_id: companyId,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    await syncMembershipRole({
      organizationId: companyId,
      userId,
      roleName: role,
      isOwner: role === 'OWNER',
      activate: status === 'ACTIVE',
    })

    if (password && password.length >= 8) {
      await admin.auth.admin.updateUserById(userId, { password })
    }

    await admin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: {
        full_name: name,
        role,
        organization_id: companyId,
      },
    })

    const { data: updatedMembership } = await admin
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

    return NextResponse.json({ success: true, user: buildUserResponse(updatedMembership) })
  } catch (error) {
    console.error('Error in update user API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await resolveAccessForUserMutation(request)
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id: userId } = await params
    const companyId = getRequestedOrganizationId(request) || access.context.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 })
    }

    if (userId === access.context.userId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia membresia desde esta pantalla' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: activeSuperRole } = await admin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', userId)
      .eq('is_active', true)

    const targetIsSuperAdmin = isSuperAdminRole(activeSuperRole as ActiveRoleRow[] | null | undefined)
    if (targetIsSuperAdmin && !access.context.isSuperAdmin) {
      return NextResponse.json({ error: 'No puedes eliminar un super admin desde este panel' }, { status: 403 })
    }

    await deactivateMembershipRole({ organizationId: companyId, userId })

    const { data: remainingMemberships } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    if (!remainingMemberships || remainingMemberships.length === 0) {
      await admin
        .from('users')
        .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
        .eq('id', userId)
    }

    return NextResponse.json({ success: true, message: 'Usuario removido de la organizacion' })
  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
