// Otorga permisos necesarios sobre public.settings para service_role y lectura pública
// Uso: node apps/frontend/scripts/grant-settings-permissions.js

try { require('dotenv').config({ path: '.env.local' }); } catch {}
try { require('dotenv').config(); } catch {}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function exec(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw new Error(error.message || String(error));
  return data;
}

async function main() {
  try {
    console.log('🔧 Otorgando permisos sobre public.settings...');
    await exec('GRANT USAGE ON SCHEMA public TO service_role;');
    await exec('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.settings TO service_role;');
    await exec('GRANT SELECT ON TABLE public.settings TO authenticated;');
    await exec('GRANT SELECT ON TABLE public.settings TO anon;');
    console.log('✅ Permisos otorgados correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al otorgar permisos:', err.message || err);
    process.exit(1);
  }
}

main();