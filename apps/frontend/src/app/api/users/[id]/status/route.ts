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

    await admin
      .from('users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId)

    const { data: membership } = await admin
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

    if (!membership) {
      return NextResponse.json({ error: 'Usuario no encontrado en la organizacion actual' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: buildUserResponse(membership) })
  } catch (error) {
    console.error('Error in user status API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
