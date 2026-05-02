import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  resolveCompanyAccess,
} from '@/app/api/_utils/company-authorization'
import {
  buildUserResponse,
  deactivateMembershipRole,
  normalizeCompanyUserRole,
  normalizeCompanyUserStatus,
  syncMembershipRole,
} from '../_lib'

type ActiveRoleRow = {
  role?: { name?: string | null } | Array<{ name?: string | null }> | null
}

type MembershipRoleRow = {
  name?: string | null
}

type MembershipSnapshot = {
  organization_id?: string | null
  user_id?: string | null
  is_owner?: boolean | null
  role_id?: string | null
  status?: string | null
  role?: MembershipRoleRow | MembershipRoleRow[] | null
}

type UserProfileSnapshot = {
  id?: string | null
  email?: string | null
  full_name?: string | null
  role?: string | null
  organization_id?: string | null
}

function firstRelation<T>(value?: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function isSuperAdminRole(rows: ActiveRoleRow[] | null | undefined) {
  return (rows || []).some((row) => {
    const role = Array.isArray(row.role) ? row.role[0] : row.role
    return String(role?.name || '').toUpperCase() === 'SUPER_ADMIN'
  })
}

function getRequestedOrganizationId(
  request: NextRequest,
  body?: Record<string, unknown>
): string | undefined {
  const headerOrgId = request.headers.get('x-organization-id')?.trim()
  const queryOrgId = request.nextUrl.searchParams.get('organizationId')?.trim()
  const bodyOrgId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : ''
  return headerOrgId || queryOrgId || bodyOrgId || undefined
}

async function resolveAccessForUserMutation(
  request: NextRequest,
  body?: Record<string, unknown>
) {
  return resolveCompanyAccess({
    companyId: getRequestedOrganizationId(request, body),
    permission: COMPANY_PERMISSIONS.MANAGE_USERS,
    feature: COMPANY_FEATURE_KEYS.TEAM_MANAGEMENT,
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })
}

async function restoreUserProfileSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  snapshot: UserProfileSnapshot | null | undefined
) {
  if (!snapshot?.id) return

  await admin.from('users').upsert(
    {
      id: snapshot.id,
      email: snapshot.email || null,
      full_name: snapshot.full_name || null,
      role: snapshot.role || null,
      organization_id: snapshot.organization_id || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
}

async function restoreAuthSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  snapshot: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null | undefined
) {
  if (!snapshot?.email) return

  await admin.auth.admin.updateUserById(userId, {
    email: snapshot.email,
    user_metadata: snapshot.user_metadata || {},
  })
}

async function restoreMembershipSnapshot(
  userId: string,
  snapshot: MembershipSnapshot | null | undefined
) {
  const previousRole = normalizeCompanyUserRole(firstRelation(snapshot?.role)?.name)
  const previousStatus = normalizeCompanyUserStatus(snapshot?.status)

  await syncMembershipRole({
    organizationId: String(snapshot?.organization_id || ''),
    userId,
    roleName: previousRole,
    isOwner: Boolean(snapshot?.is_owner),
    activate: previousStatus === 'ACTIVE',
    membershipStatus: previousStatus,
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

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: 'La contrasena debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El formato del email no es valido' }, { status: 400 })
    }

    if (role === 'OWNER' && !access.context.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Solo super admin puede asignar rol OWNER desde esta interfaz' },
        { status: 403 }
      )
    }

    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('organization_members')
      .select('organization_id,user_id,is_owner,role_id,role:roles(name)')
      .eq('organization_id', companyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en la organizacion actual' },
        { status: 404 }
      )
    }

    const { data: activeSuperRole } = await admin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', userId)
      .eq('is_active', true)

    const targetIsSuperAdmin = isSuperAdminRole(
      activeSuperRole as ActiveRoleRow[] | null | undefined
    )
    if (targetIsSuperAdmin && !access.context.isSuperAdmin) {
      return NextResponse.json(
        { error: 'No puedes modificar un super admin desde este panel' },
        { status: 403 }
      )
    }

    const { data: currentProfile } = await admin
      .from('users')
      .select('id,email,full_name,role,organization_id')
      .eq('id', userId)
      .maybeSingle()

    const { data: authSnapshotData, error: authSnapshotError } = await admin.auth.admin.getUserById(userId)
    if (authSnapshotError || !authSnapshotData?.user) {
      return NextResponse.json(
        { error: authSnapshotError?.message || 'No se pudo leer el usuario autenticado actual' },
        { status: 500 }
      )
    }

    const authSnapshot = {
      email: authSnapshotData.user.email ?? null,
      user_metadata: ((authSnapshotData.user.user_metadata || {}) as Record<string, unknown>),
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: {
        full_name: name,
        role,
        organization_id: companyId,
      },
    })

    if (authUpdateError) {
      return NextResponse.json(
        { error: authUpdateError.message || 'No se pudo actualizar el usuario autenticado' },
        { status: 400 }
      )
    }

    const { error: userUpsertError } = await admin.from('users').upsert(
      {
        id: userId,
        email,
        full_name: name,
        role,
        organization_id: companyId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (userUpsertError) {
      await restoreAuthSnapshot(admin, userId, authSnapshot)
      return NextResponse.json(
        { error: 'No se pudo sincronizar el perfil del usuario' },
        { status: 500 }
      )
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
      await restoreUserProfileSnapshot(admin, currentProfile as UserProfileSnapshot | null | undefined)
      await restoreAuthSnapshot(admin, userId, authSnapshot)
      return NextResponse.json(
        {
          error:
            membershipSyncError instanceof Error
              ? membershipSyncError.message
              : 'No se pudo actualizar la membresia del usuario',
        },
        { status: 500 }
      )
    }

    if (password) {
      const { error: passwordError } = await admin.auth.admin.updateUserById(userId, { password })
      if (passwordError) {
        await restoreMembershipSnapshot(userId, membership as MembershipSnapshot | null | undefined)
        await restoreUserProfileSnapshot(admin, currentProfile as UserProfileSnapshot | null | undefined)
        await restoreAuthSnapshot(admin, userId, authSnapshot)
        return NextResponse.json(
          { error: passwordError.message || 'No se pudo actualizar la contrasena' },
          { status: 400 }
        )
      }
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
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia membresia desde esta pantalla' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('organization_members')
      .select('organization_id, user_id, is_owner')
      .eq('organization_id', companyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en esta organizacion' },
        { status: 404 }
      )
    }

    if (membership.is_owner && !access.context.isSuperAdmin) {
      return NextResponse.json(
        { error: 'No puedes eliminar al propietario de la organizacion' },
        { status: 403 }
      )
    }

    const { data: activeSuperRole } = await admin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', userId)
      .eq('is_active', true)

    const targetIsSuperAdmin = isSuperAdminRole(
      activeSuperRole as ActiveRoleRow[] | null | undefined
    )
    if (targetIsSuperAdmin && !access.context.isSuperAdmin) {
      return NextResponse.json(
        { error: 'No puedes eliminar un super admin desde este panel' },
        { status: 403 }
      )
    }

    await deactivateMembershipRole({ organizationId: companyId, userId })

    return NextResponse.json({
      success: true,
      message: 'Usuario removido de la organizacion',
    })
  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
