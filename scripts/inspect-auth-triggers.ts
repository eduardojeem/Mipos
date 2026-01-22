import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) {
    console.error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  console.log('🔧 Creating inspect functions...')
  const createFnsSql = `
    CREATE OR REPLACE FUNCTION public.inspect_auth_users_triggers()
    RETURNS TABLE(tgname TEXT, tgenabled TEXT, table_name TEXT, table_schema TEXT, trigger_def TEXT)
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT t.tgname::text, t.tgenabled::text, c.relname::text AS table_name, n.nspname::text AS table_schema,
             pg_get_triggerdef(t.oid)::text AS trigger_def
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'auth' AND c.relname = 'users';
    $$;
    GRANT EXECUTE ON FUNCTION public.inspect_auth_users_triggers() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.inspect_auth_users_triggers() TO service_role;

    CREATE OR REPLACE FUNCTION public.inspect_handle_new_user_def()
    RETURNS TABLE(definition TEXT)
    LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT pg_get_functiondef(p.oid)::text AS definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'handle_new_user' AND n.nspname = 'public';
    $$;
    GRANT EXECUTE ON FUNCTION public.inspect_handle_new_user_def() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.inspect_handle_new_user_def() TO service_role;
    DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;
  `
  const { error: createErr } = await supabase.rpc('exec_sql', { sql: createFnsSql })
  if (createErr) {
    console.error('❌ Error creating inspect functions:', createErr.message)
    process.exit(1)
  }

  console.log('🔍 Inspecting triggers on auth.users...')
  const { data: triggers, error: trigErr } = await supabase.rpc('inspect_auth_users_triggers')
  if (trigErr) {
    console.error('❌ Trigger inspect error:', trigErr.message)
  } else {
    console.log('\n✅ Triggers:')
    console.log(JSON.stringify(triggers, null, 2))
  }

  console.log('\n🔍 Inspecting public.handle_new_user function...')
  const { data: funcs, error: funcErr } = await supabase.rpc('inspect_handle_new_user_def')
  if (funcErr) {
    console.error('❌ Function inspect error:', funcErr.message)
  } else {
    console.log('\n✅ Function definition:')
    console.log(JSON.stringify(funcs, null, 2))
  }
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })