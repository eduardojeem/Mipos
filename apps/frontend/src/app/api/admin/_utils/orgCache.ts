import { createAdminClient } from '@/lib/supabase/server'

type CacheEntry = { ids: string[]; exp: number }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 120000

export async function getAllowedUserIds(organizationId: string): Promise<string[]> {
  const now = Date.now()
  const entry = cache.get(organizationId)
  if (entry && entry.exp > now) return entry.ids
  const supabase = await createAdminClient()
  let { data } = await supabase
    .from('organization_members')
    .select('user_id, status')
    .eq('organization_id', organizationId)

  if (!data) {
    const fallback = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
    data = fallback.data as Array<{ user_id?: string | null; status?: string | null }> | null
  }

  const ids = (data || [])
    .filter((member: { status?: string | null }) => {
      const status = String(member.status || 'ACTIVE').toUpperCase()
      return status === 'ACTIVE'
    })
    .map((member: { user_id?: string | null }) => member.user_id)
    .filter((value: string | null | undefined): value is string => typeof value === 'string' && value.length > 0)

  cache.set(organizationId, { ids, exp: now + TTL_MS })
  return ids
}
