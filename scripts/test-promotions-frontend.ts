#!/usr/bin/env tsx
/**
 * Probar que el frontend puede obtener promociones
 */

async function test() {
  console.log('🧪 Probando API de Promociones desde Frontend\n');
  console.log('='.repeat(60));

  const baseURL = 'http://localhost:3001'; // Puerto del servidor Next.js

  console.log('\n1️⃣ GET /api/promotions\n');

  try {
    const response = await fetch(`${baseURL}/api/promotions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      console.log(`   ❌ Error: ${text}`);
      return;
    }

    const data = await response.json();
    
    console.log(`   ✅ Success: ${data.success}`);
    console.log(`   Count: ${data.count}`);
    console.log(`   Data length: ${data.data?.length || 0}`);
    console.log(`   Source: ${response.headers.get('x-source') || 'unknown'}`);

    if (data.data && data.data.length > 0) {
      console.log('\n📋 Primeras 3 promociones:\n');
      data.data.slice(0, 3).forEach((promo: any, i: number) => {
        console.log(`   ${i + 1}. ${promo.name}`);
        console.log(`      Descuento: ${promo.discountValue}${promo.discountType === 'PERCENTAGE' ? '%' : ' USD'}`);
        console.log(`      Activa: ${promo.isActive ? 'Sí' : 'No'}`);
        console.log('');
      });

      console.log('✅ EL API FUNCIONA CORRECTAMENTE');
      console.log('\nSi no ves datos en el dashboard, el problema es:');
      console.log('  1. Permisos del usuario (no tienes rol ADMIN)');
      console.log('  2. El componente UnifiedPermissionGuard está bloqueando');
      console.log('  3. Error en el frontend (revisa la consola del navegador)');
    } else {
      console.log('\n⚠️  El API retorna 0 promociones');
      console.log('   Verifica RLS y datos en Supabase');
    }

  } catch (error: any) {
    console.log(`\n❌ Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  El servidor no está corriendo en el puerto 3001');
      console.log('   Verifica que "npm run dev" esté ejecutándose');
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

test().catch(console.error);
