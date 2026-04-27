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
  status?: string | null
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
  created_at?: string | null
  updated_at?: string | null
  user?: MembershipUserRecord | null
  role?: MembershipRoleRecord | null
  organization?: MembershipOrganizationRecord | null
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
}) {
  const admin = createAdminClient()
  const roleRecord = await getRoleRecord(options.roleName)

  const { error: membershipError } = await admin
    .from('organization_members')
    .upsert(
      {
        organization_id: options.organizationId,
        user_id: options.userId,
        role_id: roleRecord.id,
        is_owner: Boolean(options.isOwner || options.roleName === 'OWNER'),
      },
      { onConflict: 'organization_id,user_id' }
    )

  if (membershipError) {
    throw membershipError
  }

  const { error: roleError } = await admin
    .from('user_roles')
    .upsert(
      {
        user_id: options.userId,
        role_id: roleRecord.id,
        organization_id: options.organizationId,
        is_active: options.activate !== false,
      },
      { onConflict: 'user_id,role_id' }
    )

  if (roleError) {
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

  const { error: membershipDeleteError } = await admin
    .from('organization_members')
    .delete()
    .eq('organization_id', options.organizationId)
    .eq('user_id', options.userId)

  if (membershipDeleteError) {
    throw membershipDeleteError
  }

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
}

export function buildUserResponse(member: MembershipRecord | null | undefined) {
  const roleName = normalizeCompanyUserRole(member?.role?.name || (member?.is_owner ? 'OWNER' : undefined))
  const userStatus = normalizeCompanyUserStatus(member?.user?.status)

  return {
    id: String(member?.user_id || member?.user?.id || ''),
    email: member?.user?.email || null,
    name: member?.user?.full_name || member?.user?.name || member?.user?.email?.split('@')[0] || 'Usuario',
    role: member?.is_owner ? 'OWNER' : roleName,
    status: userStatus.toLowerCase(),
    createdAt: member?.user?.created_at || member?.created_at || new Date().toISOString(),
    lastLogin: member?.user?.last_login || member?.user?.updated_at || member?.user?.created_at || member?.updated_at || member?.created_at || null,
    organizationId: member?.organization_id || member?.organization?.id || null,
    organizationName: member?.organization?.name || null,
    isOwner: Boolean(member?.is_owner),
    phone: member?.user?.phone || null,
  }
}
