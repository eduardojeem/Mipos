#!/usr/bin/env tsx
/**
 * Script de depuración completo para el dashboard de promociones
 * Verifica: datos, permisos, roles, API, y estado del usuario
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL DASHBOARD DE PROMOCIONES\n');
  console.log('='.repeat(60));

  // 1. Verificar datos de promociones
  console.log('\n📊 1. DATOS DE PROMOCIONES');
  console.log('-'.repeat(60));
  
  const { data: allPromotions, error: promoError } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (promoError) {
    console.error('❌ Error al obtener promociones:', promoError.message);
  } else {
    console.log(`✅ Total de promociones: ${allPromotions?.length || 0}`);
    
    const active = allPromotions?.filter(p => p.is_active) || [];
    const now = new Date();
    const current = active.filter(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      return now >= start && now <= end;
    });
    
    console.log(`   - Activas: ${active.length}`);
    console.log(`   - Vigentes ahora: ${current.length}`);
    console.log(`   - Inactivas: ${(allPromotions?.length || 0) - active.length}`);
    
    if (current.length > 0) {
      console.log('\n   Promociones vigentes:');
      current.slice(0, 3).forEach(p => {
        console.log(`   • ${p.name} (${p.discount_type}: ${p.discount_value})`);
      });
    }
  }

  // 2. Verificar permisos de promociones
  console.log('\n🔐 2. PERMISOS DE PROMOCIONES');
  console.log('-'.repeat(60));
  
  const { data: permissions, error: permError } = await supabase
    .from('permissions')
    .select('*')
    .eq('resource', 'promotions');

  if (permError) {
    console.error('❌ Error al obtener permisos:', permError.message);
  } else {
    console.log(`✅ Permisos de promociones: ${permissions?.length || 0}`);
    permissions?.forEach(p => {
      console.log(`   • ${p.resource}.${p.action} (${p.name})`);
    });
  }

  // 3. Verificar asignación de permisos a roles
  console.log('\n👥 3. PERMISOS ASIGNADOS A ROLES');
  console.log('-'.repeat(60));
  
  const { data: rolePerms, error: rpError } = await supabase
    .from('role_permissions')
    .select(`
      role_id,
      permission_id,
      roles!inner(name),
      permissions!inner(resource, action)
    `)
    .eq('permissions.resource', 'promotions');

  if (rpError) {
    console.error('❌ Error al obtener role_permissions:', rpError.message);
  } else {
    const grouped = (rolePerms || []).reduce((acc: any, rp: any) => {
      const roleName = rp.roles?.name || 'unknown';
      if (!acc[roleName]) acc[roleName] = [];
      acc[roleName].push(`${rp.permissions?.resource}.${rp.permissions?.action}`);
      return acc;
    }, {});

    if (Object.keys(grouped).length === 0) {
      console.log('⚠️  NO HAY PERMISOS ASIGNADOS A ROLES');
      console.log('   Esto significa que ningún rol tiene acceso a promociones');
    } else {
      Object.entries(grouped).forEach(([role, perms]: [string, any]) => {
        console.log(`✅ ${role}: ${perms.length} permisos`);
        perms.forEach((p: string) => console.log(`   • ${p}`));
      });
    }
  }

  // 4. Verificar usuarios y sus roles
  console.log('\n👤 4. USUARIOS Y ROLES');
  console.log('-'.repeat(60));
  
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ Error al obtener usuarios:', usersError.message);
    console.log('   Nota: Necesitas SUPABASE_SERVICE_ROLE_KEY para ver usuarios');
  } else {
    console.log(`✅ Total de usuarios: ${users?.length || 0}\n`);
    
    users?.slice(0, 5).forEach(u => {
      const role = u.app_metadata?.role || u.user_metadata?.role || 'USER';
      const email = u.email || 'sin email';
      console.log(`   • ${email}`);
      console.log(`     Rol: ${role}`);
      console.log(`     ID: ${u.id}`);
      console.log('');
    });
  }

  // 5. Probar el API endpoint
  console.log('\n🌐 5. PRUEBA DEL API ENDPOINT');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch('http://localhost:3001/api/promotions');
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ API responde correctamente (${response.status})`);
      console.log(`   - Promociones devueltas: ${data.data?.length || 0}`);
      console.log(`   - Fuente: ${response.headers.get('x-source') || 'unknown'}`);
      console.log(`   - Cache: ${response.headers.get('x-cache') || 'unknown'}`);
      
      if (data.data?.length > 0) {
        console.log('\n   Primeras 3 promociones del API:');
        data.data.slice(0, 3).forEach((p: any) => {
          console.log(`   • ${p.name} (activa: ${p.isActive})`);
        });
      }
    } else {
      console.error(`❌ API error (${response.status}):`, data.message);
    }
  } catch (error: any) {
    console.error('❌ No se pudo conectar al API:', error.message);
    console.log('   Asegúrate de que el servidor esté corriendo en http://localhost:3001');
  }

  // 6. Verificar RLS policies
  console.log('\n🛡️  6. POLÍTICAS RLS');
  console.log('-'.repeat(60));
  
  const { data: policies, error: polError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'promotions');

  if (polError) {
    console.log('⚠️  No se pudieron verificar las políticas RLS');
    console.log('   (Esto es normal, requiere permisos especiales)');
  } else {
    console.log(`✅ Políticas RLS encontradas: ${policies?.length || 0}`);
    policies?.forEach(p => {
      console.log(`   • ${p.policyname} (${p.cmd})`);
    });
  }

  // RESUMEN Y RECOMENDACIONES
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMEN Y RECOMENDACIONES');
  console.log('='.repeat(60));

  const hasPromotions = (allPromotions?.length || 0) > 0;
  const hasPermissions = (permissions?.length || 0) > 0;
  const hasRolePerms = (rolePerms?.length || 0) > 0;

  if (!hasPromotions) {
    console.log('\n❌ PROBLEMA: No hay promociones en la base de datos');
    console.log('   Solución: Crea promociones desde el dashboard');
  }

  if (!hasPermissions) {
    console.log('\n❌ PROBLEMA: No existen permisos de promociones');
    console.log('   Solución: Ejecuta scripts/sql/add-promotions-permissions-simple.sql');
  }

  if (hasPermissions && !hasRolePerms) {
    console.log('\n❌ PROBLEMA CRÍTICO: Los permisos existen pero NO están asignados a roles');
    console.log('   Esto explica por qué no ves datos en el dashboard');
    console.log('\n   Solución: Ejecuta este SQL en Supabase Dashboard:');
    console.log('\n   INSERT INTO role_permissions (role_id, permission_id)');
    console.log('   SELECT r.id, p.id');
    console.log('   FROM roles r');
    console.log('   CROSS JOIN permissions p');
    console.log("   WHERE r.name IN ('ADMIN', 'SUPER_ADMIN', 'MANAGER')");
    console.log("     AND p.resource = 'promotions'");
    console.log('   ON CONFLICT DO NOTHING;');
  }

  if (hasPromotions && hasPermissions && hasRolePerms) {
    console.log('\n✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE');
    console.log('\n   Si aún no ves datos:');
    console.log('   1. Verifica tu rol de usuario (debe ser ADMIN o SUPER_ADMIN)');
    console.log('   2. Cierra sesión y vuelve a iniciar sesión');
    console.log('   3. Abre la consola del navegador (F12) y busca errores');
    console.log('   4. Verifica que el servidor esté en http://localhost:3001');
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
