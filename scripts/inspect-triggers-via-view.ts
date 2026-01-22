import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  console.log('🔧 Creating view for triggers on auth.users...')
  const createViewSql = `
    CREATE OR REPLACE VIEW public.auth_users_triggers_view AS
    SELECT t.tgname::text AS tgname, t.tgenabled::text AS tgenabled,
           c.relname::text AS table_name, n.nspname::text AS table_schema,
           pg_get_triggerdef(t.oid)::text AS trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users';
  `
  const { error: viewErr } = await admin.rpc('exec_sql', { sql: createViewSql })
  if (viewErr) {
    console.error('❌ Error creating view:', viewErr.message)
  } else {
    console.log('✅ View created')
  }

  console.log('🔍 Querying view...')
  const { data, error } = await admin.from('auth_users_triggers_view').select('*')
  if (error) {
    console.error('❌ Query error:', error.message)
  } else {
    console.log('✅ Triggers:')
    console.log(JSON.stringify(data, null, 2))
  }
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })