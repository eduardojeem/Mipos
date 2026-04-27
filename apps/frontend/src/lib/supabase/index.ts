/**
 * Barrel export for @/lib/supabase
 * 
 * Re-exports the browser client by default.
 * For server-side (API routes, Server Components), use:
 *   import { createClient } from '@/lib/supabase/server'
 */
export { createClient } from './client';
