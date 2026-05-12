/**
 * supabase-singleton.ts
 *
 * Singleton del cliente Supabase para el frontend.
 *
 * PROBLEMA QUE RESUELVE:
 * `createClient()` es llamado en cada render de hooks como `useSupabase`,
 * `useDashboardData`, `use-products`, etc. — lo que crea múltiples instancias
 * de `createBrowserClient` con overhead de memoria y potenciales conexiones
 * WebSocket duplicadas.
 *
 * USO:
 *   import { getSupabaseClient } from '@/lib/supabase-singleton';
 *   const supabase = getSupabaseClient();
 *
 * La instancia se crea la primera vez y se reutiliza en toda la sesión.
 */

import { createClient } from './supabase';

type SupabaseClient = ReturnType<typeof createClient>;

let _instance: SupabaseClient | null = null;

/**
 * Retorna el singleton del cliente Supabase.
 * Crea la instancia en la primera llamada y la reutiliza en las siguientes.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!_instance) {
    _instance = createClient();
  }
  return _instance;
}

/**
 * Limpia el singleton (útil en tests o al cerrar sesión).
 * Después de llamar esto, la próxima llamada a `getSupabaseClient()`
 * creará una nueva instancia.
 */
export function resetSupabaseClient(): void {
  _instance = null;
}
