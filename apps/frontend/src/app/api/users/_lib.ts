import { createAdminClient } from '@/lib/supabase-admin'

export const COMPANY_USER_ROLES = ['OWNER', 'ADMIN', 'SELLER', 'WAREHOUSE'] as const
export const COMPANY_USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const

export type CompanyUserRole = typeof COMPANY_USER_ROLES[number]
export type CompanyUserStatus = typeof COMPANY_USER_STATUSES[number]

type MembershipUserRecord = {
  id?: string | null
  email?: string | null
  full_name?: string | null
  name?: string | null
  phone?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_login?: string | null
}

type MembershipRoleRecord = {
  name?: string | null
  display_name?: string | null
}

type MembershipOrganizationRecord = {
  id?: string | null
  name?: string | null
}

type MembershipRecord = {
  organization_id?: string | null
  user_id?: string | null
  role_id?: string | null
  is_owner?: boolean | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
  user?: MembershipUserRecord | MembershipUserRecord[] | null
  role?: MembershipRoleRecord | MembershipRoleRecord[] | null
  organization?: MembershipOrganizationRecord | MembershipOrganizationRecord[] | null
}

function firstRelation<T>(value?: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

export function normalizeCompanyUserRole(role?: string | null): CompanyUserRole {
  const normalized = String(role || '').toUpperCase().trim()
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'ADMIN' || normalized === 'MANAGER') return 'ADMIN'
  if (normalized === 'SELLER' || normalized === 'VENDEDOR' || normalized === 'CASHIER') return 'SELLER'
  if (normalized === 'WAREHOUSE' || normalized === 'DEPOSITO') return 'WAREHOUSE'
  return 'SELLER'
}

export function normalizeCompanyUserStatus(status?: string | null): CompanyUserStatus {
  const normalized = String(status || '').toUpperCase().trim()
  if (normalized === 'INACTIVE') return 'INACTIVE'
  if (normalized === 'SUSPENDED') return 'SUSPENDED'
  return 'ACTIVE'
}

export async function getRoleRecord(roleName: CompanyUserRole) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('roles')
    .select('id,name,display_name')
    .eq('name', roleName)
    .maybeSingle()

  if (error || !data) {
    throw new Error(`Role ${roleName} not found`)
  }

  return data
}

export async function syncMembershipRole(options: {
  organizationId: string
  userId: string
  roleName: CompanyUserRole
  isOwner?: boolean
  activate?: boolean
  membershipStatus?: CompanyUserStatus
}) {
  const admin = createAdminClient()
  const roleRecord = await getRoleRecord(options.roleName)
  const nextIsOwner = Boolean(options.isOwner || options.roleName === 'OWNER')
  const nextStatus = options.membershipStatus || 'ACTIVE'
  const nextIsActive = options.activate !== false
  const { data: previousMembership } = await admin
    .from('organization_members')
    .select('organization_id,user_id,role_id,is_owner')
    .eq('organization_id', options.organizationId)
    .eq('user_id', options.userId)
    .maybeSingle()

  const previousRoleId = previousMembership?.role_id || null
  const previousWasOwner = Boolean(previousMembership?.is_owner)
  const previousStatus = 'ACTIVE'

  let { error: membershipError } = await admin
    .from('organization_members')
    .upsert(
      {
        organization_id: options.organizationId,
        user_id: options.userId,
        role_id: roleRecord.id,
        is_owner: nextIsOwner,
        status: nextStatus,
      },
      { onConflict: 'organization_id,user_id' }
    )

  if (membershipError?.code === '42703') {
    const retry = await admin
      .from('organization_members')
      .upsert(
        {
          organization_id: options.organizationId,
          user_id: options.userId,
          role_id: roleRecord.id,
          is_owner: nextIsOwner,
        },
        { onConflict: 'organization_id,user_id' }
      )
    membershipError = retry.error
  }

  if (membershipError) {
    throw membershipError
  }

  let previousRoleDeactivated = false
  if (previousRoleId && previousRoleId !== roleRecord.id) {
    const { error: previousRoleError } = await admin
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', options.userId)
      .eq('organization_id', options.organizationId)
      .eq('role_id', previousRoleId)

    if (previousRoleError) {
      await admin
        .from('organization_members')
        .upsert(
          {
            organization_id: options.organizationId,
            user_id: options.userId,
            role_id: previousRoleId,
            is_owner: previousWasOwner,
            status: previousStatus,
          },
          { onConflict: 'organization_id,user_id' }
        )
      throw previousRoleError
    }

    previousRoleDeactivated = true
  }

  const { error: roleError } = await admin
    .from('user_roles')
    .upsert(
      {
        user_id: options.userId,
        role_id: roleRecord.id,
        organization_id: options.organizationId,
        is_active: nextIsActive,
      },
      { onConflict: 'user_id,role_id,organization_id' }
    )

  if (roleError) {
    if (previousMembership?.role_id) {
      await admin
        .from('organization_members')
        .upsert(
          {
            organization_id: options.organizationId,
            user_id: options.userId,
            role_id: previousMembership.role_id,
            is_owner: previousWasOwner,
            status: previousStatus,
          },
          { onConflict: 'organization_id,user_id' }
        )
    } else {
      await admin
        .from('organization_members')
        .delete()
        .eq('organization_id', options.organizationId)
        .eq('user_id', options.userId)
    }

    if (previousRoleDeactivated && previousRoleId) {
      await admin
        .from('user_roles')
        .update({ is_active: true })
        .eq('user_id', options.userId)
        .eq('organization_id', options.organizationId)
        .eq('role_id', previousRoleId)
    }

    throw roleError
  }

  return roleRecord
}

export async function deactivateMembershipRole(options: {
  organizationId: string
  userId: string
}) {
  const admin = createAdminClient()

  const { data: membership } = await admin
    .from('organization_members')
    .select('role_id')
    .eq('organization_id', options.organizationId)
    .eq('user_id', options.userId)
    .maybeSingle()

  if (membership?.role_id) {
    const { error: userRoleError } = await admin
      .from('user_roles')
      .update({ is_active: false })
      .eq('user_id', options.userId)
      .eq('organization_id', options.organizationId)
      .eq('role_id', membership.role_id)

    if (userRoleError) {
      throw userRoleError
    }
  }

  const { error: membershipDeleteError } = await admin
    .from('organization_members')
    .delete()
    .eq('organization_id', options.organizationId)
    .eq('user_id', options.userId)

  if (membershipDeleteError) {
    if (membership?.role_id) {
      await admin
        .from('user_roles')
        .update({ is_active: true })
        .eq('user_id', options.userId)
        .eq('organization_id', options.organizationId)
        .eq('role_id', membership.role_id)
    }

    throw membershipDeleteError
  }
}

export function buildUserResponse(member: MembershipRecord | null | undefined) {
  const user = firstRelation(member?.user)
  const role = firstRelation(member?.role)
  const organization = firstRelation(member?.organization)
  const roleName = normalizeCompanyUserRole(role?.name || (member?.is_owner ? 'ADMIN' : undefined))
  const userStatus = normalizeCompanyUserStatus(member?.status)

  return {
    id: String(member?.user_id || user?.id || ''),
    email: user?.email || null,
    name: user?.full_name || user?.name || user?.email?.split('@')[0] || 'Usuario',
    role: roleName,
    status: userStatus.toLowerCase(),
    createdAt: user?.created_at || member?.created_at || new Date().toISOString(),
    lastLogin: user?.last_login || null,
    organizationId: member?.organization_id || organization?.id || null,
    organizationName: organization?.name || null,
    isOwner: Boolean(member?.is_owner),
    phone: user?.phone || null,
  }
}
