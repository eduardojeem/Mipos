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
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const email = `test.user.${Date.now()}@example.com`
  const password = 'Temp1234!'
  const name = 'Test User'
  const role = 'ADMIN'

  console.log('🔧 Creating auth user via admin...')
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role }
  })
  if (authError || !authData?.user) {
    console.error('❌ Auth create error:', authError?.message)
    process.exit(1)
  }
  const userId = authData.user.id
  console.log('✅ Auth user created:', userId)

  console.log('🔧 Upserting users record...')
  const { data: userRow, error: upsertErr } = await admin
    .from('users')
    .upsert({ id: userId, email, full_name: name, role }, { onConflict: 'id' })
    .select('*')
    .single()
  if (upsertErr) {
    console.error('❌ Upsert error:', upsertErr.message)
    await admin.auth.admin.deleteUser(userId)
    process.exit(1)
  }
  console.log('✅ Users row:', userRow)

  console.log('🧹 Cleaning up: deleting auth user and users row')
  await admin.auth.admin.deleteUser(userId)
  await admin.from('users').delete().eq('id', userId)
  console.log('✅ Cleanup done')
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })