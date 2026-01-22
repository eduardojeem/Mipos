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
  console.log('🔎 Getting constraints for public.users...');
  const { data, error } = await supabase.rpc('get_table_constraints', { p_schema_name: 'public', p_table_name: 'users' });
  if (error) {
    console.error('❌ RPC error:', error);
    process.exit(1);
  }
  console.log('✅ Constraints:', JSON.stringify(data, null, 2));
})();