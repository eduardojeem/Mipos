require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE URL or service role key');
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('🔎 Inspecting public.users.id type via exec_sql...');
  const { data: colData, error: colError } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name = 'id';
    `
  });

  if (colError) {
    console.error('❌ Column info error:', colError);
  } else {
    console.log('✅ Column info:', colData);
  }

  const { data: consData, error: consError } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'users';
    `
  });

  if (consError) {
    console.error('❌ Constraints info error:', consError);
  } else {
    console.log('✅ Constraints:', consData);
  }
})();