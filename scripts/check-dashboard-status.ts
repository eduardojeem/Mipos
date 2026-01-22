#!/usr/bin/env tsx
/**
 * 🔍 Verificación Completa del Dashboard de Promociones
 * 
 * Este script verifica todos los aspectos del dashboard:
 * - Conexión a Supabase
 * - Políticas RLS
 * - Datos disponibles
 * - Estado de las promociones
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function printHeader(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

function printSection(emoji: string, title: string) {
  console.log(`\n${emoji} ${title}\n`);
}

async function checkEnvironment() {
  printSection('🔧', 'Verificando Variables de Entorno');

  const checks = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_KEY },
  ];

  let allOk = true;

  checks.forEach(check => {
    if (check.value) {
      console.log(`✅ ${check.name}: Configurada`);
    } else {
      console.log(`❌ ${check.name}: NO CONFIGURADA`);
      allOk = false;
    }
  });

  if (!allOk) {
    console.log('\n⚠️  Algunas variables de entorno no están configuradas.');
    console.log('   Verifica que .env.local existe y contiene todas las variables.');
    return false;
  }

  return true;
}

async function checkSupabaseConnection() {
  printSection('🔌', 'Verificando Conexión a Supabase');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('❌ No se puede conectar: Variables de entorno faltantes');
    return false;
  }

  try {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await client.from('promotions').select('id').limit(1);

    if (error) {
      console.log(`❌ Error de conexión: ${error.message}`);
      return false;
    }

    console.log('✅ Conexión exitosa a Supabase');
    return true;
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function checkRLS() {
  printSection('🔒', 'Verificando Políticas RLS');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.log('⚠️  No se puede verificar RLS: Variables faltantes');
    return;
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Verificar acceso anónimo
  const { count: anonCount } = await anonClient
    .from('promotions')
    .select('*', { count: 'exact', head: true });

  // Verificar acceso con service role
  const { count: serviceCount } = await serviceClient
    .from('promotions')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Acceso ANON: ${anonCount || 0} promociones`);
  console.log(`📊 Acceso SERVICE: ${serviceCount || 0} promociones`);

  if (serviceCount && serviceCount > 0 && anonCount === 0) {
    console.log('\n⚠️  RLS está bloqueando el acceso público');
    console.log('   Solución: Ejecutar scripts/sql/fix-promotions-rls-simple.sql');
    return false;
  }

  if (anonCount && anonCount > 0) {
    console.log('\n✅ RLS configurado correctamente');
    return true;
  }

  console.log('\n⚠️  No hay promociones en la base de datos');
  return false;
}

async function checkPromotions() {
  printSection('📋', 'Analizando Promociones');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('⚠️  No se puede verificar: Variables faltantes');
    return;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: promos, error } = await client.from('promotions').select('*');

  if (error) {
    console.log(`❌ Error: ${error.message}`);
    return;
  }

  if (!promos || promos.length === 0) {
    console.log('⚠️  No hay promociones visibles');
    console.log('\nPosibles causas:');
    console.log('  1. RLS está bloqueando el acceso');
    console.log('  2. No hay promociones activas y vigentes');
    console.log('  3. Las promociones están fuera del período de vigencia');
    return;
  }

  const now = new Date();
  const stats = {
    active: 0,
    scheduled: 0,
    expired: 0,
    inactive: 0,
  };

  promos.forEach(promo => {
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);
    
    if (!promo.is_active) {
      stats.inactive++;
    } else if (now < start) {
      stats.scheduled++;
    } else if (now > end) {
      stats.expired++;
    } else {
      stats.active++;
    }
  });

  console.log('📊 Estadísticas de Promociones:');
  console.log(`   🟢 Activas (vigentes): ${stats.active}`);
  console.log(`   🟡 Programadas: ${stats.scheduled}`);
  console.log(`   🟠 Expiradas: ${stats.expired}`);
  console.log(`   🔴 Inactivas: ${stats.inactive}`);
  console.log(`   📦 Total: ${promos.length}`);

  if (stats.active === 0) {
    console.log('\n⚠️  No hay promociones activas y vigentes');
    console.log('   El dashboard puede aparecer vacío');
  } else {
    console.log(`\n✅ Hay ${stats.active} promociones listas para mostrar`);
  }

  // Mostrar primeras 3 promociones
  console.log('\n📝 Primeras 3 promociones:');
  promos.slice(0, 3).forEach((promo, i) => {
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);
    const status = !promo.is_active ? '🔴' :
                   now < start ? '🟡' :
                   now > end ? '🟠' : '🟢';
    
    console.log(`   ${i + 1}. ${status} ${promo.name}`);
    console.log(`      ${promo.discount_value}${promo.discount_type === 'PERCENTAGE' ? '%' : ' USD'} | ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
  });
}

async function checkDashboardFiles() {
  printSection('📁', 'Verificando Archivos del Dashboard');

  const files = [
    'apps/frontend/src/app/dashboard/promotions/page.tsx',
    'apps/frontend/src/app/api/promotions/route.ts',
    'apps/frontend/src/store/index.ts',
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - NO ENCONTRADO`);
    }
  });
}

async function printSummary(envOk: boolean, connOk: boolean, rlsOk: boolean) {
  printSection('📊', 'Resumen Final');

  const allOk = envOk && connOk && rlsOk;

  if (allOk) {
    console.log('🎉 ¡TODO ESTÁ FUNCIONANDO CORRECTAMENTE!');
    console.log('\nPróximos pasos:');
    console.log('  1. Iniciar el servidor: npm run dev');
    console.log('  2. Abrir: http://localhost:3000/dashboard/promotions');
    console.log('  3. Deberías ver las promociones activas');
  } else {
    console.log('⚠️  Se encontraron algunos problemas:');
    if (!envOk) console.log('  ❌ Variables de entorno no configuradas');
    if (!connOk) console.log('  ❌ No se puede conectar a Supabase');
    if (!rlsOk) console.log('  ❌ RLS bloqueando acceso o sin datos');
    
    console.log('\nSoluciones:');
    if (!envOk) {
      console.log('  1. Verifica que .env.local existe');
      console.log('  2. Copia .env.local.example a .env.local');
      console.log('  3. Configura las variables de Supabase');
    }
    if (!connOk) {
      console.log('  1. Verifica que las URLs de Supabase son correctas');
      console.log('  2. Verifica que el proyecto de Supabase está activo');
    }
    if (!rlsOk) {
      console.log('  1. Ejecuta: scripts/sql/fix-promotions-rls-simple.sql en Supabase');
      console.log('  2. O ejecuta: npx tsx scripts/seed-promotions-without-description.ts');
    }
  }
}

async function main() {
  printHeader('🔍 VERIFICACIÓN COMPLETA DEL DASHBOARD DE PROMOCIONES');

  const envOk = await checkEnvironment();
  const connOk = envOk ? await checkSupabaseConnection() : false;
  const rlsOk = connOk ? await checkRLS() : false;

  if (connOk) {
    await checkPromotions();
    await checkDashboardFiles();
  }

  await printSummary(envOk, connOk, rlsOk);

  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
