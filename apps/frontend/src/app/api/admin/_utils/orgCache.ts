import { createClient } from '@/lib/supabase/server'

type CacheEntry = { ids: string[]; exp: number }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 120000

export async function getAllowedUserIds(organizationId: string): Promise<string[]> {
  const now = Date.now()
  const entry = cache.get(organizationId)
  if (entry && entry.exp > now) return entry.ids
  const supabase = await createClient()
  const { data } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
  const ids = (data || []).map((m: any) => m.user_id)
  cache.set(organizationId, { ids, exp: now + TTL_MS })
  return ids
}
