require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function upsertRoles() {
  // Usar solo columnas mínimas para compatibilidad amplia
  const roles = [{ name: 'ADMIN' }, { name: 'CASHIER' }];
  const { error } = await supabase.from('roles').upsert(roles, { onConflict: 'name' });
  if (error) throw new Error(`Error upsert roles: ${error.message}`);

  const { data, error: selErr } = await supabase
    .from('roles')
    .select('id, name')
    .in('name', ['ADMIN', 'CASHIER']);
  if (selErr) throw new Error(`Error obteniendo roles: ${selErr.message}`);

  const map = Object.fromEntries((data || []).map(r => [r.name, r.id]));
  if (!map.ADMIN || !map.CASHIER) throw new Error('No se pudieron obtener IDs de roles ADMIN/CASHIER');
  return map;
}

async function upsertPermissions() {
  // Usar solo columnas mínimas para compatibilidad: name, resource, action
  const perms = [
    { name: 'cash:read', resource: 'cash', action: 'read' },
    { name: 'cash:open', resource: 'cash', action: 'open' },
    { name: 'cash:close', resource: 'cash', action: 'close' },
    { name: 'cash:move', resource: 'cash', action: 'move' }
  ];

  // Intentar upsert por columna name
  let { error } = await supabase.from('permissions').upsert(perms, { onConflict: 'name' });
  if (error) {
    // Si falla por constraints diferentes, intentar por (resource,action)
    const { error: altError } = await supabase.from('permissions').upsert(perms, { onConflict: 'resource,action' });
    if (altError) throw new Error(`Error upsert permissions: ${altError.message}`);
  }

  const { data, error: selErr } = await supabase
    .from('permissions')
    .select('id, name')
    .in('name', perms.map(p => p.name));
  if (selErr) throw new Error(`Error obteniendo permisos: ${selErr.message}`);

  const map = Object.fromEntries((data || []).map(p => [p.name, p.id]));
  for (const n of perms.map(p => p.name)) if (!map[n]) throw new Error(`No se obtuvo id de permiso ${n}`);
  return map;
}

async function assignPermissions(roleIds, permIds) {
  const adminRoleId = roleIds.ADMIN;
  const cashierRoleId = roleIds.CASHIER;
  const permIdList = ['cash:read', 'cash:open', 'cash:close', 'cash:move'].map(n => permIds[n]);

  const rows = [];
  for (const pid of permIdList) {
    rows.push({ role_id: adminRoleId, permission_id: pid });
    rows.push({ role_id: cashierRoleId, permission_id: pid });
  }

  // upsert sobre llave única (role_id, permission_id)
  const { error } = await supabase
    .from('role_permissions')
    .upsert(rows, { onConflict: 'role_id,permission_id' });
  if (error) throw new Error(`Error asignando permisos a roles: ${error.message}`);
}

async function main() {
  console.log('🔐 Conectando a Supabase y preparando permisos de caja...');
  try {
    const roles = await upsertRoles();
    console.log('✅ Roles verificados:', roles);

    const perms = await upsertPermissions();
    console.log('✅ Permisos verificados:', perms);

    await assignPermissions(roles, perms);
    console.log('🎉 Permisos de caja asignados a ADMIN y CASHIER');

    // Breve verificación: contar asignaciones nuevas
    const { data, error } = await supabase
      .from('role_permissions')
      .select('role_id, permission_id')
      .in('permission_id', Object.values(perms))
      .in('role_id', Object.values(roles));
    if (!error) {
      console.log(`📊 Total asignaciones cash: ${data?.length || 0}`);
    }
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

main();