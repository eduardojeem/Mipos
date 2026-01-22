#!/usr/bin/env tsx
/**
 * Diagnóstico Completo del Dashboard de Promociones
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL DASHBOARD\n');
  console.log('='.repeat(60));

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Verificar datos en Supabase
  console.log('\n1️⃣ DATOS EN SUPABASE\n');
  
  const { data: serviceData, count: serviceCount } = await serviceClient
    .from('promotions')
    .select('*', { count: 'exact' });

  console.log(`   Total en DB: ${serviceCount} promociones`);

  // 2. Verificar RLS
  console.log('\n2️⃣ ROW LEVEL SECURITY (RLS)\n');
  
  const { data: anonData, count: anonCount } = await anonClient
    .from('promotions')
    .select('*', { count: 'exact' });

  console.log(`   Acceso ANON: ${anonCount} promociones`);
  
  if (serviceCount && serviceCount > 0 && anonCount === 0) {
    console.log('   ❌ RLS está bloqueando el acceso');
  } else if (anonCount && anonCount > 0) {
    console.log('   ✅ RLS permite acceso');
  }

  // 3. Verificar permisos
  console.log('\n3️⃣ PERMISOS\n');
  
  const { data: perms } = await serviceClient
    .from('permissions')
    .select('*')
    .eq('resource', 'promotions');

  console.log(`   Permisos de promociones: ${perms?.length || 0}`);
  
  if (perms && perms.length > 0) {
    perms.forEach(p => {
      console.log(`   - ${p.resource}.${p.action}`);
    });
  }

  // 4. Verificar asignación de permisos a roles
  console.log('\n4️⃣ ASIGNACIÓN DE PERMISOS A ROLES\n');
  
  try {
    const { data: rolePerms } = await serviceClient
      .from('role_permissions')
      .select('role_id, permission_id')
      .in('permission_id', perms?.map(p => p.id) || []);

    if (rolePerms && rolePerms.length > 0) {
      console.log(`   ✅ ${rolePerms.length} asignaciones encontradas`);
      
      // Obtener nombres de roles
      const roleIds = [...new Set(rolePerms.map(rp => rp.role_id))];
      const { data: roles } = await serviceClient
        .from('roles')
        .select('id, name')
        .in('id', roleIds);

      if (roles) {
        roles.forEach(role => {
          const count = rolePerms.filter(rp => rp.role_id === role.id).length;
          console.log(`   - ${role.name}: ${count} permisos`);
        });
      }
    } else {
      console.log('   ❌ No hay permisos asignados a roles');
      console.log('   Solución: Ejecutar scripts/sql/fix-user-access.sql');
    }
  } catch (error: any) {
    console.log(`   ⚠️  Error: ${error.message}`);
  }

  // 5. Verificar API
  console.log('\n5️⃣ API DE PROMOCIONES\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/promotions');
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API responde correctamente`);
      console.log(`   Promociones retornadas: ${data.count || data.data?.length || 0}`);
      console.log(`   Source: ${response.headers.get('x-source') || 'unknown'}`);
    } else {
      console.log(`   ❌ API error: ${response.status} ${response.statusText}`);
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Servidor no está corriendo');
      console.log('   Solución: Ejecuta "npm run dev"');
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // 6. Resumen
  console.log('\n6️⃣ RESUMEN\n');
  
  const hasData = serviceCount && serviceCount > 0;
  const rlsWorks = anonCount && anonCount > 0;
  const hasPerms = perms && perms.length > 0;

  if (hasData && rlsWorks && hasPerms) {
    console.log('   ✅ Todo parece estar bien');
    console.log('\n   Si aún no ves datos en el dashboard:');
    console.log('   1. Verifica que el servidor esté corriendo (npm run dev)');
    console.log('   2. Verifica que hayas iniciado sesión');
    console.log('   3. Verifica que tu usuario tenga rol ADMIN');
    console.log('   4. Abre la consola del navegador (F12) y busca errores');
    console.log('   5. Cierra sesión y vuelve a iniciar');
  } else {
    console.log('   ❌ Problemas encontrados:\n');
    if (!hasData) console.log('   - No hay datos en la base de datos');
    if (!rlsWorks) console.log('   - RLS está bloqueando el acceso');
    if (!hasPerms) console.log('   - No hay permisos configurados');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

diagnose().catch(console.error);
