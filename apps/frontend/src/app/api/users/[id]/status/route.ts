import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS, resolveCompanyAccess } from '@/app/api/_utils/company-authorization'
import { buildUserResponse, normalizeCompanyUserStatus } from '../../_lib'

function getRequestedOrganizationId(request: NextRequest): string | undefined {
  const headerOrgId = request.headers.get('x-organization-id')?.trim()
  const queryOrgId = request.nextUrl.searchParams.get('organizationId')?.trim()
  return headerOrgId || queryOrgId || undefined
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const access = await resolveCompanyAccess({
      companyId: getRequestedOrganizationId(request),
      permission: COMPANY_PERMISSIONS.MANAGE_USERS,
      feature: COMPANY_FEATURE_KEYS.TEAM_MANAGEMENT,
      allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
    })

    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const { id: userId } = await params
    const companyId = getRequestedOrganizationId(request) || access.context.companyId
    const status = normalizeCompanyUserStatus(body?.status)

    if (!companyId) {
      return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: membership } = await admin
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

    if (!membership) {
      return NextResponse.json({ error: 'Usuario no encontrado en la organizacion actual' }, { status: 404 })
    }

    const previousStatus = 'ACTIVE'
    const { data: currentUserRole } = await admin
      .from('user_roles')
      .select('is_active')
      .eq('user_id', userId)
      .eq('organization_id', companyId)
      .eq('role_id', membership.role_id)
      .maybeSingle()

    const previousRoleActive = currentUserRole?.is_active !== false

    const { error: roleStatusError } = await admin
      .from('user_roles')
      .update({ is_active: status === 'ACTIVE' })
      .eq('user_id', userId)
      .eq('organization_id', companyId)
      .eq('role_id', membership.role_id)

    if (roleStatusError) {
      return NextResponse.json({ error: 'No se pudo actualizar el rol activo de la organizacion' }, { status: 500 })
    }

    let { error: membershipStatusError } = await admin
      .from('organization_members')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('organization_id', companyId)
      .eq('user_id', userId)

    const membershipStatusUnsupported = membershipStatusError?.code === '42703'
    if (membershipStatusUnsupported) {
      membershipStatusError = null
    }

    if (membershipStatusError) {
      await admin
        .from('user_roles')
        .update({ is_active: previousRoleActive })
        .eq('user_id', userId)
        .eq('organization_id', companyId)
        .eq('role_id', membership.role_id)

      return NextResponse.json({ error: 'No se pudo actualizar el estado de la membresia' }, { status: 500 })
    }

    const { data: updatedMembership } = await admin
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

    if (!updatedMembership) {
      if (!membershipStatusUnsupported) {
        await admin
          .from('organization_members')
          .update({ status: previousStatus, updated_at: new Date().toISOString() })
          .eq('organization_id', companyId)
          .eq('user_id', userId)
      }
      await admin
        .from('user_roles')
        .update({ is_active: previousRoleActive })
        .eq('user_id', userId)
        .eq('organization_id', companyId)
        .eq('role_id', membership.role_id)

      return NextResponse.json({ error: 'No se pudo confirmar el estado actualizado de la membresia' }, { status: 500 })
    }

    const responseUser = buildUserResponse(updatedMembership)
    responseUser.status = status.toLowerCase()

    return NextResponse.json({ success: true, user: responseUser })
  } catch (error) {
    console.error('Error in user status API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
