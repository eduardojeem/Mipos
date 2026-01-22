import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const sql1 = `SELECT relrowsecurity
                FROM pg_class c
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname='public' AND c.relname='users';`
  const sql2 = `SELECT polname, permissive, roles, cmd, qual, with_check
                FROM pg_policies
                WHERE schemaname='public' AND tablename='users';`
  console.log('🔍 Checking RLS enabled on public.users...')
  const rls = await admin.rpc('exec_sql', { sql: sql1 })
  if (rls.error) { console.error('❌ RLS check error:', rls.error.message); process.exit(1) }
  console.log('RLS enabled:', JSON.stringify(rls.data, null, 2))

  console.log('🔍 Listing RLS policies on public.users...')
  const pol = await admin.rpc('exec_sql', { sql: sql2 })
  if (pol.error) { console.error('❌ Policies error:', pol.error.message); process.exit(1) }
  console.log(JSON.stringify(pol.data, null, 2))
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })