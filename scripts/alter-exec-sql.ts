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
  console.log('Attempting to set SECURITY DEFINER on public.exec_sql...')
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER FUNCTION public.exec_sql(text) SECURITY DEFINER'
  })
  if (error) {
    console.error('RPC Error:', error)
  } else {
    console.log('Result:', data)
  }
}

main()
