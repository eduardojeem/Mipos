#!/usr/bin/env tsx
/**
 * Verificación rápida: ¿Por qué el dashboard no muestra datos?
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function verify() {
  console.log('🔍 Verificando datos del dashboard de promociones\n');
  console.log('='.repeat(60));

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Obtener todas las promociones (como lo hace el API)
  console.log('\n1️⃣ Obteniendo promociones (como el API)...\n');
  
  const { data: allPromos, error, count } = await client
    .from('promotions')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Total de promociones visibles: ${count}`);
  
  if (!allPromos || allPromos.length === 0) {
    console.log('\n⚠️  NO HAY PROMOCIONES VISIBLES');
    console.log('\nPosibles causas:');
    console.log('  1. RLS está bloqueando el acceso');
    console.log('  2. No hay promociones activas y vigentes');
    console.log('  3. Las políticas RLS no están aplicadas correctamente');
    return;
  }

  // 2. Analizar el estado de cada promoción
  console.log('\n2️⃣ Analizando estado de promociones...\n');
  
  const now = new Date();
  const stats = {
    active: 0,
    scheduled: 0,
    expired: 0,
    inactive: 0,
  };

  allPromos.forEach(promo => {
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

  console.log('📊 Estadísticas:');
  console.log(`   Activas (vigentes): ${stats.active}`);
  console.log(`   Programadas: ${stats.scheduled}`);
  console.log(`   Expiradas: ${stats.expired}`);
  console.log(`   Inactivas: ${stats.inactive}`);
  console.log(`   Total: ${allPromos.length}`);

  // 3. Mostrar primeras 5 promociones
  console.log('\n3️⃣ Primeras 5 promociones:\n');
  
  allPromos.slice(0, 5).forEach((promo, i) => {
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);
    const status = !promo.is_active ? '🔴 Inactiva' :
                   now < start ? '🟡 Programada' :
                   now > end ? '🟠 Expirada' :
                   '🟢 Activa';
    
    console.log(`${i + 1}. ${promo.name}`);
    console.log(`   Estado: ${status}`);
    console.log(`   Descuento: ${promo.discount_value}${promo.discount_type === 'PERCENTAGE' ? '%' : ' USD'}`);
    console.log(`   Período: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`);
    console.log('');
  });

  // 4. Verificar si el problema es de fechas
  if (stats.active === 0) {
    console.log('⚠️  PROBLEMA IDENTIFICADO: No hay promociones activas y vigentes');
    console.log('\nSoluciones:');
    console.log('  1. Actualizar las fechas de las promociones existentes');
    console.log('  2. Crear nuevas promociones con fechas actuales');
    console.log('  3. Activar promociones que están inactivas');
  } else {
    console.log(`✅ Hay ${stats.active} promociones activas y vigentes`);
    console.log('\nEl dashboard debería mostrar estos datos correctamente.');
  }

  console.log('\n' + '='.repeat(60));
}

verify().catch(console.error);
