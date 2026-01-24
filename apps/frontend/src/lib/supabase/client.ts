import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../types/supabase';
import { getSupabaseConfig } from '../env';

// Verificación de configuración centralizada en '@/lib/env'

export function createClient() {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error('Supabase no configurado: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient<Database>(cfg.url, cfg.anonKey);
}
