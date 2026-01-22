import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load env
dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  const email = `test.admin.${Date.now()}@example.com`
  const password = 'Aa123456!'
  console.log('Creating user via admin.createUser:', email)

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Test Admin' }
  })

  if (error) {
    console.error('createUser error:', {
      message: error.message,
      name: (error as any)?.name,
      status: (error as any)?.status,
      code: (error as any)?.code,
    })
    process.exit(1)
  }

  console.log('User created:', data.user?.id)

  if (data.user?.id) {
    const { error: delError } = await admin.auth.admin.deleteUser(data.user.id)
    if (delError) {
      console.error('Cleanup deleteUser error:', delError)
    } else {
      console.log('Cleanup: deleted test user')
    }
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})