require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: perms, error: pErr } = await supabase
    .from('permissions')
    .select('id, name, resource, action')
    .eq('resource', 'cash');
  if (pErr) throw pErr;
  console.log('🔎 Permisos cash:', perms);

  const { data: roles, error: rErr } = await supabase
    .from('roles')
    .select('id, name')
    .in('name', ['ADMIN', 'CASHIER']);
  if (rErr) throw rErr;
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  const cashPermIds = (perms || []).map(p => p.id);
  const { data: rp, error: rpErr } = await supabase
    .from('role_permissions')
    .select('role_id, permission_id')
    .in('role_id', [roleMap.ADMIN, roleMap.CASHIER])
    .in('permission_id', cashPermIds);
  if (rpErr) throw rpErr;
  console.log('📊 Asignaciones (ADMIN/CASHIER x cash):', rp?.length || 0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });