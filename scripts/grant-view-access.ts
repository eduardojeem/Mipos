import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const sql = `
    GRANT SELECT ON public.auth_users_triggers_view TO authenticated;
    GRANT SELECT ON public.auth_users_triggers_view TO service_role;
    DO $$ BEGIN PERFORM pg_notify('pgrst','reload schema'); END $$;
  `
  console.log('🔧 Granting select and reloading schema...')
  const { error } = await admin.rpc('exec_sql', { sql })
  if (error) {
    console.error('❌ Grant error:', error.message)
    process.exit(1)
  } else {
    console.log('✅ Granted and reloaded')
  }
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })