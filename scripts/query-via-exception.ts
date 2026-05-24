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

async function runQuery(query: string): Promise<any[]> {
  // We format the SQL as a DO block that raises an exception with the result
  const sql = `
    DO $$
    DECLARE
      ret text;
    BEGIN
      EXECUTE 'SELECT COALESCE(json_agg(t)::text, ''[]'') FROM (${query.replace(/'/g, "''")}) t' INTO ret;
      RAISE EXCEPTION 'QUERY_RESULT:%', ret;
    END;
    $$;
  `

  const { data, error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    throw new Error(`RPC call failed: ${error.message}`)
  }

  const res = data as { status: string; message: string; code?: string }
  if (res.status === 'error') {
    if (res.message.startsWith('QUERY_RESULT:')) {
      const jsonStr = res.message.substring('QUERY_RESULT:'.length)
      return JSON.parse(jsonStr)
    } else {
      throw new Error(`Database error: ${res.message} (code: ${res.code})`)
    }
  }

  return []
}

async function main() {
  const query = process.argv[2] || `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'`
  console.log(`🔍 Executing query:\n${query}\n`)
  try {
    const rows = await runQuery(query)
    console.log(`✅ Success! Received ${rows.length} rows:`)
    console.log(JSON.stringify(rows, null, 2))
  } catch (error: any) {
    console.error('❌ Query execution failed:', error.message)
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
