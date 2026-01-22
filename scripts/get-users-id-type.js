require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

(async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE URL or service role key');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log('🔎 Inspecting public.users.id column type and constraints...');
  const { data: colData, error: colError } = await supabase
    .from('information_schema.columns')
    .select('table_schema, table_name, column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .eq('table_name', 'users')
    .eq('column_name', 'id');

  if (colError) {
    console.error('❌ Column info error:', colError);
  } else {
    console.log('✅ Column info:', colData);
  }

  const { data: constraints, error: consError } = await supabase
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_schema', 'public')
    .eq('table_name', 'users');

  if (consError) {
    console.error('❌ Constraints info error:', consError);
  } else {
    console.log('✅ Constraints:', constraints);
  }
})();