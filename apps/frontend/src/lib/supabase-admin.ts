import { createClient } from '@supabase/supabase-js'
import { isMissingOrPlaceholder } from './env'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || isMissingOrPlaceholder(url) || isMissingOrPlaceholder(serviceKey)) {
    throw new Error('Missing or invalid Supabase configuration for admin client')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}