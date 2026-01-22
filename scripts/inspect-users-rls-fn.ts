import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const createFnSql = `
    CREATE OR REPLACE FUNCTION public.inspect_users_rls()
    RETURNS TABLE(rls_enabled boolean, polname text, cmd text, roles text, qual text, with_check text)
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT c.relrowsecurity,
             p.polname, p.cmd, p.roles, p.qual, p.with_check
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
      WHERE n.nspname = 'public' AND c.relname = 'users';
    $$;
  `

  console.log('🔧 Creating inspect_users_rls() function...')
  let res = await admin.rpc('exec_sql', { sql: createFnSql })
  if (res.error) {
    console.error('❌ Create function error:', res.error.message)
    process.exit(1)
  }

  console.log('🔧 Granting execute on function to roles...')
  const grantSql = `GRANT EXECUTE ON FUNCTION public.inspect_users_rls() TO authenticated, service_role;`
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

  console.log('🔍 Calling inspect_users_rls() via RPC...')
  const { data, error } = await admin.rpc('inspect_users_rls')
  if (error) {
    console.error('❌ RPC error:', error.message)
    process.exit(1)
  }
  console.log(JSON.stringify(data, null, 2))
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })