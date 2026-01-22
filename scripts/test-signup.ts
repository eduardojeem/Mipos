import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const client = createClient(url, anonKey)

async function main() {
  const email = `test.signup.${Date.now()}@example.com`
  const password = 'Aa123456!'
  console.log('Signing up user with anon key:', email)

  const { data, error } = await client.auth.signUp({ email, password })

  if (error) {
    console.error('signUp error:', {
      message: error.message,
      name: (error as any)?.name,
      status: (error as any)?.status,
      code: (error as any)?.code,
    })
    process.exit(1)
  }

  console.log('signUp success, user id:', data.user?.id)
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})