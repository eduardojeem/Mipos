require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('inspect_roles_types');
  if (error) {
    console.error('RPC error:', error.message);
    process.exit(1);
  }
  console.log('Tipos de columnas (roles/permissions/role_permissions/user_roles):');
  for (const row of data) {
    console.log(`${row.table_name}.${row.column_name} => ${row.data_type}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });