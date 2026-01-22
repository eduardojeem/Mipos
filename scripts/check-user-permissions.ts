#!/usr/bin/env tsx
/**
 * 🔐 Verificación de Permisos de Usuario
 * 
 * Este script verifica los permisos del usuario actual para acceder
 * al dashboard de promociones.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUserPermissions() {
  console.log('🔐 Verificando Permisos de Usuario para Dashboard de Promociones\n');
  console.log('='.repeat(60));

  // 1. Verificar usuarios en el sistema
  console.log('\n1️⃣ Usuarios en el Sistema\n');
  
  const { data: users, error: usersError } = await client
    .from('users')
    .select('id, email, name, role, status')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.log('⚠️  No se pudo obtener usuarios:', usersError.message);
    console.log('   Esto puede ser normal si la tabla no existe o no tiene datos');
  } else if (!users || users.length === 0) {
    console.log('⚠️  No hay usuarios en la tabla users');
    console.log('   Los usuarios pueden estar solo en auth.users');
  } else {
    console.log(`✅ Encontrados ${users.length} usuarios:\n`);
    users.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.email || 'Sin email'}`);
      console.log(`      Nombre: ${user.name || 'Sin nombre'}`);
      console.log(`      Rol: ${user.role || 'Sin rol'}`);
      console.log(`      Estado: ${user.status || 'Sin estado'}`);
      console.log('');
    });
  }

  // 2. Verificar roles disponibles
  console.log('\n2️⃣ Roles Disponibles\n');
  
  const { data: roles, error: rolesError } = await client
    .from('roles')
    .select('*')
    .order('name');

  if (rolesError) {
    console.log('⚠️  No se pudo obtener roles:', rolesError.message);
  } else if (!roles || roles.length === 0) {
    console.log('⚠️  No hay roles configurados');
  } else {
    console.log(`✅ Encontrados ${roles.length} roles:\n`);
    roles.forEach((role, i) => {
      console.log(`   ${i + 1}. ${role.name}`);
      console.log(`      ID: ${role.id}`);
      console.log(`      Sistema: ${role.is_system_role ? 'Sí' : 'No'}`);
      console.log(`      Activo: ${role.is_active ? 'Sí' : 'No'}`);
      console.log('');
    });
  }

  // 3. Verificar permisos disponibles
  console.log('\n3️⃣ Permisos Disponibles\n');
  
  const { data: permissions, error: permsError } = await client
    .from('permissions')
    .select('*')
    .order('resource, action');

  if (permsError) {
    console.log('⚠️  No se pudo obtener permisos:', permsError.message);
  } else if (!permissions || permissions.length === 0) {
    console.log('⚠️  No hay permisos configurados');
  } else {
    console.log(`✅ Encontrados ${permissions.length} permisos:\n`);
    
    // Agrupar por recurso
    const byResource: Record<string, any[]> = {};
    permissions.forEach(perm => {
      const resource = perm.resource || 'sin_recurso';
      if (!byResource[resource]) byResource[resource] = [];
      byResource[resource].push(perm);
    });

    Object.keys(byResource).sort().forEach(resource => {
      console.log(`   📦 ${resource}:`);
      byResource[resource].forEach(perm => {
        console.log(`      - ${perm.action} (${perm.name || 'sin nombre'})`);
      });
      console.log('');
    });

    // Buscar específicamente el permiso de promociones
    const promotionsPerms = permissions.filter(p => 
      p.resource === 'promotions' || p.resource === 'promotion'
    );

    if (promotionsPerms.length > 0) {
      console.log('   🎯 Permisos de Promociones:');
      promotionsPerms.forEach(perm => {
        console.log(`      ✅ ${perm.resource}.${perm.action}`);
      });
    } else {
      console.log('   ⚠️  No hay permisos específicos para "promotions"');
    }
  }

  // 4. Verificar asignación de roles a usuarios
  console.log('\n4️⃣ Asignación de Roles a Usuarios\n');
  
  const { data: userRoles, error: userRolesError } = await client
    .from('user_roles')
    .select(`
      user_id,
      role_id,
      users!inner(email, name),
      roles!inner(name)
    `);

  if (userRolesError) {
    console.log('⚠️  No se pudo obtener asignaciones:', userRolesError.message);
  } else if (!userRoles || userRoles.length === 0) {
    console.log('⚠️  No hay roles asignados a usuarios');
  } else {
    console.log(`✅ Encontradas ${userRoles.length} asignaciones:\n`);
    userRoles.forEach((ur: any, i) => {
      console.log(`   ${i + 1}. ${ur.users?.email || 'Usuario desconocido'}`);
      console.log(`      Rol: ${ur.roles?.name || 'Rol desconocido'}`);
      console.log('');
    });
  }

  // 5. Verificar permisos de roles
  console.log('\n5️⃣ Permisos Asignados a Roles\n');
  
  const { data: rolePerms, error: rolePermsError } = await client
    .from('role_permissions')
    .select(`
      role_id,
      permission_id,
      roles!inner(name),
      permissions!inner(resource, action, name)
    `);

  if (rolePermsError) {
    console.log('⚠️  No se pudo obtener permisos de roles:', rolePermsError.message);
  } else if (!rolePerms || rolePerms.length === 0) {
    console.log('⚠️  No hay permisos asignados a roles');
  } else {
    console.log(`✅ Encontradas ${rolePerms.length} asignaciones:\n`);
    
    // Agrupar por rol
    const byRole: Record<string, any[]> = {};
    rolePerms.forEach((rp: any) => {
      const roleName = rp.roles?.name || 'Rol desconocido';
      if (!byRole[roleName]) byRole[roleName] = [];
      byRole[roleName].push(rp);
    });

    Object.keys(byRole).sort().forEach(roleName => {
      console.log(`   👤 ${roleName}:`);
      byRole[roleName].forEach((rp: any) => {
        const perm = rp.permissions;
        console.log(`      - ${perm?.resource}.${perm?.action}`);
      });
      console.log('');
    });

    // Buscar específicamente permisos de promociones
    const promotionsRolePerms = rolePerms.filter((rp: any) => 
      rp.permissions?.resource === 'promotions' || rp.permissions?.resource === 'promotion'
    );

    if (promotionsRolePerms.length > 0) {
      console.log('   🎯 Roles con Permisos de Promociones:');
      promotionsRolePerms.forEach((rp: any) => {
        console.log(`      ✅ ${rp.roles?.name}: ${rp.permissions?.resource}.${rp.permissions?.action}`);
      });
    } else {
      console.log('   ⚠️  Ningún rol tiene permisos de "promotions"');
    }
  }

  // 6. Resumen y recomendaciones
  console.log('\n6️⃣ Resumen y Recomendaciones\n');

  const hasUsers = users && users.length > 0;
  const hasRoles = roles && roles.length > 0;
  const hasPermissions = permissions && permissions.length > 0;
  const hasUserRoles = userRoles && userRoles.length > 0;
  const hasRolePerms = rolePerms && rolePerms.length > 0;

  if (!hasUsers) {
    console.log('❌ No hay usuarios en la tabla users');
    console.log('   Solución: Los usuarios se crean automáticamente al registrarse');
    console.log('   O puedes crearlos manualmente en Supabase');
  }

  if (!hasRoles) {
    console.log('❌ No hay roles configurados');
    console.log('   Solución: Ejecutar script de inicialización de roles');
  }

  if (!hasPermissions) {
    console.log('❌ No hay permisos configurados');
    console.log('   Solución: Ejecutar script de inicialización de permisos');
  }

  if (!hasUserRoles) {
    console.log('❌ No hay roles asignados a usuarios');
    console.log('   Solución: Asignar roles a usuarios en la tabla user_roles');
  }

  if (!hasRolePerms) {
    console.log('❌ No hay permisos asignados a roles');
    console.log('   Solución: Asignar permisos a roles en la tabla role_permissions');
  }

  // Verificar específicamente el acceso a promociones
  const promotionsPerms = permissions?.filter(p => 
    p.resource === 'promotions' || p.resource === 'promotion'
  ) || [];

  const promotionsRolePerms = rolePerms?.filter((rp: any) => 
    rp.permissions?.resource === 'promotions' || rp.permissions?.resource === 'promotion'
  ) || [];

  console.log('\n📊 Estado del Acceso a Promociones:\n');

  if (promotionsPerms.length === 0) {
    console.log('❌ No existe el permiso "promotions.view"');
    console.log('   Solución: Crear el permiso en la tabla permissions');
    console.log('   SQL: INSERT INTO permissions (resource, action, name) VALUES (\'promotions\', \'view\', \'Ver Promociones\');');
  } else {
    console.log(`✅ Existen ${promotionsPerms.length} permisos de promociones`);
  }

  if (promotionsRolePerms.length === 0) {
    console.log('❌ Ningún rol tiene permisos de promociones');
    console.log('   Solución: Asignar el permiso a roles (admin, manager, etc.)');
  } else {
    console.log(`✅ ${promotionsRolePerms.length} roles tienen permisos de promociones`);
  }

  // Verificar si hay admins
  const adminRoles = roles?.filter(r => 
    r.name === 'admin' || r.name === 'ADMIN' || r.name === 'super_admin' || r.name === 'SUPER_ADMIN'
  ) || [];

  if (adminRoles.length > 0) {
    console.log('\n✅ Hay roles de administrador configurados');
    console.log('   Los admins tienen acceso automático a todo');
  } else {
    console.log('\n⚠️  No hay roles de administrador');
    console.log('   Solución: Crear roles admin y super_admin');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Solución Rápida para Acceso a Promociones:\n');
  console.log('Si eres ADMIN o SUPER_ADMIN, ya tienes acceso automático.');
  console.log('Si no, necesitas:');
  console.log('  1. Crear el permiso "promotions.view" si no existe');
  console.log('  2. Asignar ese permiso a tu rol');
  console.log('  3. O asignarte el rol de ADMIN/SUPER_ADMIN');
  console.log('\n' + '='.repeat(60) + '\n');
}

checkUserPermissions().catch(console.error);
