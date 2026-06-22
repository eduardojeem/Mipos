import type { createAdminClient } from '@/lib/supabase/server'

export type MemberRow = {
  id: string
  user_id: string
  role_id: string | null
  is_owner: boolean
  status: string
}

/** Carga la membresía de un usuario en la org (o null). */
export async function getMembership(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  orgId: string,
  userId: string,
): Promise<MemberRow | null> {
  const { data } = await (admin as any)
    .from('organization_members')
    .select('id, user_id, role_id, is_owner, status')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as MemberRow) || null
}

/** Cuenta los dueños ACTIVOS de la org (para no dejarla sin dueño). */
export async function countActiveOwners(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  orgId: string,
): Promise<number> {
  const { count } = await (admin as any)
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_owner', true)
    .eq('status', 'ACTIVE')
  return count || 0
}

export const MEMBER_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE']
