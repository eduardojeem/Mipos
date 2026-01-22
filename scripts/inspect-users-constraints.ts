import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const sql = `SELECT conname, contype, pg_get_constraintdef(c.oid) AS def
               FROM pg_constraint c
               JOIN pg_class cl ON c.conrelid = cl.oid
               JOIN pg_namespace n ON cl.relnamespace = n.oid
               WHERE n.nspname='public' AND cl.relname='users';`
  console.log('🔍 Inspecting constraints for public.users...')
  const { data, error } = await admin.rpc('exec_sql', { sql })
  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
  console.log(JSON.stringify(data, null, 2))
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })