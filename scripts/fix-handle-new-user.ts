import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

  const fnSql = `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CASHIER')
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$;
  `

  console.log('🔧 Updating public.handle_new_user to SECURITY DEFINER...')
  const res = await admin.rpc('exec_sql', { sql: fnSql })
  if (res.error) {
    console.error('❌ Update function error:', res.error.message)
    process.exit(1)
  }

  console.log('🔄 Reloading schema cache...')
  const reloadSql = `DO $$ BEGIN PERFORM pg_notify('pgrst','reload schema'); END $$;`
  const reload = await admin.rpc('exec_sql', { sql: reloadSql })
  if (reload.error) {
    console.error('❌ Reload error:', reload.error.message)
    process.exit(1)
  }

  console.log('✅ handle_new_user updated successfully')
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })