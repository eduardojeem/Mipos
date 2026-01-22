#!/usr/bin/env tsx
/**
 * Probar API de Promociones
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testAPI() {
  console.log('🔌 Probando API de Promociones\n');
  console.log('='.repeat(60));

  const baseURL = 'http://localhost:3000';

  console.log('\n1️⃣ Probando GET /api/promotions\n');

  try {
    const response = await fetch(`${baseURL}/api/promotions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const text = await response.text();
      console.log('\n❌ Error Response:');
      console.log(text);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Response Data:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Count: ${data.count}`);
    console.log(`   Data length: ${data.data?.length || 0}`);
    console.log(`   Source: ${response.headers.get('x-source')}`);

    if (data.data && data.data.length > 0) {
      console.log('\n📋 Primeras 3 promociones:');
      data.data.slice(0, 3).forEach((promo: any, i: number) => {
        console.log(`\n   ${i + 1}. ${promo.name}`);
        console.log(`      ID: ${promo.id}`);
        console.log(`      Descuento: ${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : ' USD'}`);
        console.log(`      Activa: ${promo.isActive ? 'Sí' : 'No'}`);
      });
    } else {
      console.log('\n⚠️  El API retorna 0 promociones');
      console.log('   Esto puede ser por:');
      console.log('   1. RLS bloqueando el acceso');
      console.log('   2. El API está usando memoria en lugar de Supabase');
      console.log('   3. Error en la consulta de Supabase');
    }

  } catch (error: any) {
    console.log('\n❌ Error al llamar al API:');
    console.log(`   ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  El servidor no está corriendo');
      console.log('   Solución: Ejecuta "npm run dev" en otra terminal');
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

testAPI().catch(console.error);
