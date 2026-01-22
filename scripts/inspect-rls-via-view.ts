import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const createViewSql = `
    CREATE OR REPLACE VIEW public.users_rls_view AS
    SELECT 
      c.relrowsecurity AS rls_enabled,
      p.polname,
      p.cmd,
      p.roles,
      p.qual,
      p.with_check
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
    WHERE n.nspname = 'public' AND c.relname = 'users';
  `

  console.log('🔧 Creating RLS inspection view...')
  let res = await admin.rpc('exec_sql', { sql: createViewSql })
  if (res.error) {
    console.error('❌ Error creating view:', res.error.message)
    process.exit(1)
  }

  console.log('🔧 Granting SELECT on users_rls_view...')
  const grantSql = `GRANT SELECT ON public.users_rls_view TO authenticated, service_role;`
  res = await admin.rpc('exec_sql', { sql: grantSql })
  if (res.error) {
    console.error('❌ Grant error:', res.error.message)
    process.exit(1)
  }

  console.log('🔄 Reloading schema cache...')
  const reloadSql = `DO $$ BEGIN PERFORM pg_notify('pgrst','reload schema'); END $$;`
  res = await admin.rpc('exec_sql', { sql: reloadSql })
  if (res.error) {
    console.error('❌ Reload error:', res.error.message)
    process.exit(1)
  }

  console.log('🔍 Querying users_rls_view...')
  const { data, error } = await admin.from('users_rls_view').select('*')
  if (error) {
    console.error('❌ Query error:', error.message)
    process.exit(1)
  }
  console.log(JSON.stringify(data, null, 2))
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })