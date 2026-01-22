import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function ensureInspectFunction() {
  const sql = `
    CREATE OR REPLACE FUNCTION public.inspect_users_types()
    RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable TEXT)
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT column_name::text, data_type::text, is_nullable::text
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position;
    $$;
    GRANT EXECUTE ON FUNCTION public.inspect_users_types() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.inspect_users_types() TO service_role;
    DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;
  `
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) throw error
}

async function run() {
  console.log('🔍 Creating inspect_users_types and fetching columns...')
  try {
    await ensureInspectFunction()
    const { data, error } = await supabase.rpc('inspect_users_types')
    if (error) {
      console.error('❌ RPC error:', error)
    } else {
      console.log('✅ users columns:')
      console.log(JSON.stringify(data, null, 2))
    }
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message || err)
  }
}

run()