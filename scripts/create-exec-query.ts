import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🔧 Creating exec_query() RPC helper...')
  const createSql = `
    CREATE OR REPLACE FUNCTION public.exec_query(sql_query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      ret json;
    BEGIN
      EXECUTE 'SELECT COALESCE(json_agg(t), ''[]''::json) FROM (' || sql_query || ') t' INTO ret;
      RETURN ret;
    END;
    $$;
  `
  // We can use the existing exec_sql function to create the new function!
  const { data, error } = await supabase.rpc('exec_sql', { sql: createSql })
  if (error) {
    console.error('❌ Error executing sql to create exec_query:', error.message)
    process.exit(1)
  }
  console.log('✅ Created exec_query() successfully. Response:', data)

  // Test the new function
  console.log('🧪 Testing exec_query() with a simple query...')
  const testSql = `SELECT current_database(), current_user`
  const { data: testResult, error: testError } = await supabase.rpc('exec_query', { sql_query: testSql })
  if (testError) {
    console.error('❌ Test failed:', testError.message)
    process.exit(1)
  }
  console.log('✅ Test success. Result:', testResult)
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
