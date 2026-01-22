import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../types/supabase';
import { getSupabaseConfig } from '../env';
import { createClient as createFallbackClient } from '../supabase'

// Verificación de configuración centralizada en '@/lib/env'

export function createClient() {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    // Usa el cliente seguro en modo mock cuando faltan variables
    return createFallbackClient()
  }
  return createBrowserClient<Database>(cfg.url, cfg.anonKey);
}