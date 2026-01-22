import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  console.log('🔧 Reloading PostgREST schema...')
  const { error } = await admin.rpc('exec_sql', { sql: "DO $$ BEGIN PERFORM pg_notify('pgrst','reload schema'); END $$;" })
  if (error) {
    console.error('❌ Reload error:', error.message)
    process.exit(1)
  } else {
    console.log('✅ Reload notified')
  }
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })