/*
  configure-role-permission-sets.js
  Configura conjuntos restringidos de permisos por rol siguiendo reglas comunes:
  - ADMIN: todos excepto 'system.maintenance' y 'users.delete'
  - MANAGER: recursos en ['products','sales','customers','suppliers','reports','purchases'] con action != 'delete'
  - INVENTORY_MANAGER: recursos en ['products','suppliers','purchases'] o (reports, action='inventory')
  - CASHIER: (sales en ['create','read','refund']) o (products 'read') o (customers en ['create','read','update'])
  - SALES_REP: recursos en ['sales','customers'] o (products 'read') o (reports 'sales')
  - VIEWER: solo action='read'

  Nota:
  - Usa supabase-js con Service Role para escribir en tablas: roles, permissions, role_permissions
  - Idempotente: inserta faltantes y limpia permisos no permitidos para cada rol
*/

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps', 'frontend', '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function log(msg, obj) {
  if (obj !== undefined) {
    console.log(`[configure-role-permission-sets] ${msg}`, obj);
  } else {
    console.log(`[configure-role-permission-sets] ${msg}`);
  }
}

async function ensureRole(name, description = null) {
  const { data: existing, error: selErr } = await supabase.from('roles').select('id, name').eq('name', name).maybeSingle();
  if (selErr) throw new Error(`Error buscando rol ${name}: ${selErr.message}`);
  if (existing) return existing;
  const { data: inserted, error: insErr } = await supabase.from('roles').insert({ name, description }).select('id, name').single();
  if (insErr) throw new Error(`Error creando rol ${name}: ${insErr.message}`);
  log(`Rol creado: ${name}`);
  return inserted;
}

async function getAllPermissions() {
  const { data, error } = await supabase
    .from('permissions')
    .select('id, name, resource, action')
    .order('resource', { ascending: true })
    .order('action', { ascending: true });
  if (error) throw new Error(`Error obteniendo permisos: ${error.message}`);
  return data || [];
}

function buildAllowedSetByRole(permissions) {
  const byName = new Map(permissions.map(p => [p.name, p]));
  const byResourceAction = (resource, action) => permissions.filter(p => p.resource === resource && p.action === action);

  const allIds = permissions.map(p => p.id);

  // ADMIN: todo excepto 'system.maintenance' y 'users.delete'
  const adminExcludeNames = ['system.maintenance', 'users.delete'];
  const adminAllowed = permissions.filter(p => !adminExcludeNames.includes(p.name)).map(p => p.id);

  // MANAGER: recursos en list, action != 'delete'
  const managerResources = new Set(['products', 'sales', 'customers', 'suppliers', 'reports', 'purchases']);
  const managerAllowed = permissions
    .filter(p => managerResources.has(p.resource) && p.action !== 'delete')
    .map(p => p.id);

  // INVENTORY_MANAGER: recursos en list, o (reports, action='inventory')
  const invResources = new Set(['products', 'suppliers', 'purchases']);
  const inventoryAllowed = permissions
    .filter(p => invResources.has(p.resource) || (p.resource === 'reports' && p.action === 'inventory'))
    .map(p => p.id);

  // CASHIER: (sales en ['create','read','refund']) o (products 'read') o (customers en ['create','read','update'])
  const cashierAllowed = permissions
    .filter(p =>
      (p.resource === 'sales' && ['create', 'read', 'refund'].includes(p.action)) ||
      (p.resource === 'products' && p.action === 'read') ||
      (p.resource === 'customers' && ['create', 'read', 'update'].includes(p.action))
    )
    .map(p => p.id);

  // SALES_REP: recursos en ['sales','customers'] o (products 'read') o (reports 'sales')
  const salesRepAllowed = permissions
    .filter(p =>
      ['sales', 'customers'].includes(p.resource) ||
      (p.resource === 'products' && p.action === 'read') ||
      (p.resource === 'reports' && p.action === 'sales')
    )
    .map(p => p.id);

  // VIEWER: solo action='read'
  const viewerAllowed = permissions.filter(p => p.action === 'read').map(p => p.id);

  return {
    ADMIN: new Set(adminAllowed),
    MANAGER: new Set(managerAllowed),
    INVENTORY_MANAGER: new Set(inventoryAllowed),
    CASHIER: new Set(cashierAllowed),
    SALES_REP: new Set(salesRepAllowed),
    VIEWER: new Set(viewerAllowed),
  };
}

async function upsertRolePermissions(roleId, allowedIds) {
  if (allowedIds.size === 0) {
    // Limpia todo si no hay permitido
    const { error: delErr } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
    if (delErr) throw new Error(`Error limpiando role_permissions para rol ${roleId}: ${delErr.message}`);
    return { inserted: 0, deleted: 'all' };
  }

  const allowedArray = Array.from(allowedIds);

  // Inserta faltantes con upsert (on conflict role_id, permission_id)
  const rows = allowedArray.map(pid => ({ role_id: roleId, permission_id: pid }));
  const { error: upErr } = await supabase
    .from('role_permissions')
    .upsert(rows, { onConflict: 'role_id,permission_id', ignoreDuplicates: true });
  if (upErr) throw new Error(`Error upsert role_permissions para rol ${roleId}: ${upErr.message}`);

  // Obtiene actuales y elimina los no permitidos (borrado puntual por id)
  const { data: currentRows, error: curErr } = await supabase
    .from('role_permissions')
    .select('id, permission_id')
    .eq('role_id', roleId);
  if (curErr) throw new Error(`Error obteniendo permisos actuales para rol ${roleId}: ${curErr.message}`);

  const toDeleteIds = (currentRows || [])
    .filter(rp => !allowedIds.has(rp.permission_id))
    .map(rp => rp.id);

  if (toDeleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from('role_permissions')
      .delete()
      .in('id', toDeleteIds);
    if (delErr) throw new Error(`Error eliminando no permitidos para rol ${roleId}: ${delErr.message}`);
  }

  return { inserted: rows.length, deleted: toDeleteIds.length };
}

async function getRolePermissionCount(roleId) {
  const { count, error } = await supabase
    .from('role_permissions')
    .select('permission_id', { count: 'exact', head: true })
    .eq('role_id', roleId);
  if (error) throw new Error(`Error contando permisos para rol ${roleId}: ${error.message}`);
  return count || 0;
}

async function main() {
  log('Iniciando configuración de permisos por rol');
  const rolesNeeded = [
    { name: 'ADMIN', description: 'Administrador con permisos amplios, excepto mantenimiento y borrar usuarios' },
    { name: 'MANAGER', description: 'Gerente con permisos de gestión sin borrar' },
    { name: 'INVENTORY_MANAGER', description: 'Gestor de inventario y compras' },
    { name: 'CASHIER', description: 'Cajero con ventas, clientes y lectura de productos' },
    { name: 'SALES_REP', description: 'Vendedor con ventas y clientes' },
    { name: 'VIEWER', description: 'Solo lectura en el sistema' },
  ];

  // Asegurar roles
  const roleMap = {};
  for (const r of rolesNeeded) {
    roleMap[r.name] = await ensureRole(r.name, r.description);
  }
  log('Roles asegurados', Object.keys(roleMap));

  // Obtener todos los permisos
  const permissions = await getAllPermissions();
  log(`Total permisos encontrados: ${permissions.length}`);

  // Construir conjuntos permitidos
  const allowedByRole = buildAllowedSetByRole(permissions);

  // Aplicar por rol (upsert + cleanup)
  const result = {};
  for (const roleName of Object.keys(allowedByRole)) {
    const roleId = roleMap[roleName]?.id;
    if (!roleId) {
      throw new Error(`Rol ${roleName} no encontrado tras asegurarlo`);
    }
    const allowedIds = allowedByRole[roleName];
    const res = await upsertRolePermissions(roleId, allowedIds);
    const count = await getRolePermissionCount(roleId);
    result[roleName] = { inserted: res.inserted, count };
    log(`Rol ${roleName} asignado: permisos actuales = ${count}`);
  }

  // Resumen
  console.log('\nResumen por rol:');
  for (const [roleName, info] of Object.entries(result)) {
    console.log(`- ${roleName}: ${info.count} permisos (insertados/asegurados: ~${info.inserted})`);
  }

  log('Configuración completada');
}

main().catch(err => {
  console.error('Fallo en configuración de roles:', err);
  process.exit(1);
});