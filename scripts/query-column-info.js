import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

(async function run() {
  dotenv.config();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or key');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  console.log('🔎 Getting column info for public.users.id...');
  const { data, error } = await supabase.rpc('get_column_info', { p_schema_name: 'public', p_table_name: 'users', p_column_name: 'id' });
  if (error) {
    console.error('❌ RPC error:', error);
    process.exit(1);
  }
  console.log('✅ Column info:', JSON.stringify(data, null, 2));
})();