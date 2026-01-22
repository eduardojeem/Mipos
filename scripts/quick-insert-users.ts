import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const sql = `INSERT INTO public.users (id, email, full_name, role) VALUES (gen_random_uuid(), 'x${Date.now()}@example.com', 'X', 'ADMIN');`
  console.log('🔧 Inserting into public.users...')
  const { error } = await admin.rpc('exec_sql', { sql })
  if (error) {
    console.error('❌ Insert error:', error.message)
    process.exit(1)
  } else {
    console.log('✅ Insert succeeded')
  }
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })