import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../types/supabase';
import { getSupabaseConfig } from '../env';

// Module-level singleton: createBrowserClient registers auth listeners and
// cookie handlers. Calling it from every component duplicates those listeners
// and can trigger redundant token refreshes. Reuse a single instance per tab.
let cachedClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error('Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  cachedClient = createBrowserClient<Database>(cfg.url, cfg.anonKey);
  return cachedClient;
}
