/**
 * Script de diagnóstico para ofertas
 * Verifica por qué no se muestran productos en oferta
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 Diagnóstico de Ofertas\n');
  console.log('='.repeat(60));

  // 1. Verificar promociones activas
  console.log('\n1️⃣ Verificando promociones activas...');
  const { data: promotions, error: promoError } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true);

  if (promoError) {
    console.error('❌ Error al obtener promociones:', promoError);
    return;
  }

  console.log(`✅ Promociones activas encontradas: ${promotions?.length || 0}`);
  if (promotions && promotions.length > 0) {
    promotions.forEach(p => {
      console.log(`   - ${p.name} (${p.discount_type}: ${p.discount_value})`);
      console.log(`     Inicio: ${p.start_date || 'N/A'}, Fin: ${p.end_date || 'N/A'}`);
    });
  }

  // 2. Verificar relaciones promotions_products
  console.log('\n2️⃣ Verificando relaciones promotions_products...');
  const { data: promoProducts, error: ppError } = await supabase
    .from('promotions_products')
    .select('*');

  if (ppError) {
    console.error('❌ Error al obtener promotions_products:', ppError);
    return;
  }

  console.log(`✅ Relaciones encontradas: ${promoProducts?.length || 0}`);
  
  // Agrupar por promoción
  const byPromo = new Map<string, number>();
  promoProducts?.forEach(pp => {
    const count = byPromo.get(pp.promotion_id) || 0;
    byPromo.set(pp.promotion_id, count + 1);
  });

  console.log('\n   Productos por promoción:');
  for (const [promoId, count] of byPromo.entries()) {
    const promo = promotions?.find(p => p.id === promoId);
    console.log(`   - ${promo?.name || promoId}: ${count} productos`);
  }

  // 3. Verificar productos activos
  console.log('\n3️⃣ Verificando productos activos...');
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, is_active')
    .eq('is_active', true);

  if (prodError) {
    console.error('❌ Error al obtener productos:', prodError);
    return;
  }

  console.log(`✅ Productos activos encontrados: ${products?.length || 0}`);

  // 4. Verificar productos con promociones (query simple)
  console.log('\n4️⃣ Verificando productos con promociones (query simple)...');
  const productIds = promoProducts?.map(pp => pp.product_id) || [];
  
  if (productIds.length > 0) {
    const { data: productsWithPromos, error: pwpError } = await supabase
      .from('products')
      .select('id, name, sale_price, is_active')
      .in('id', productIds)
      .eq('is_active', true);

    if (pwpError) {
      console.error('❌ Error:', pwpError);
    } else {
      console.log(`✅ Productos activos con promociones: ${productsWithPromos?.length || 0}`);
      if (productsWithPromos && productsWithPromos.length > 0) {
        productsWithPromos.slice(0, 5).forEach(p => {
          console.log(`   - ${p.name} ($${p.sale_price})`);
        });
        if (productsWithPromos.length > 5) {
          console.log(`   ... y ${productsWithPromos.length - 5} más`);
        }
      }
    }
  } else {
    console.log('⚠️  No hay productos asociados a promociones');
  }

  // 5. Probar query complejo del API
  console.log('\n5️⃣ Probando query complejo del API...');
  const now = new Date().toISOString();
  
  const { data: apiData, error: apiError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sale_price,
      is_active,
      promotions_products!inner(
        promotion_id,
        promotions!inner(
          id,
          name,
          discount_type,
          discount_value,
          is_active
        )
      )
    `)
    .eq('is_active', true)
    .eq('promotions_products.promotions.is_active', true)
    .not('promotions_products.promotion_id', 'is', null);

  if (apiError) {
    console.error('❌ Error en query complejo:', apiError);
    console.log('\n🔍 Detalles del error:');
    console.log(JSON.stringify(apiError, null, 2));
  } else {
    console.log(`✅ Query complejo exitoso: ${apiData?.length || 0} resultados`);
    if (apiData && apiData.length > 0) {
      console.log('\n   Primeros resultados:');
      apiData.slice(0, 3).forEach((item: any) => {
        console.log(`   - ${item.name}`);
        console.log(`     Promoción: ${item.promotions_products?.[0]?.promotions?.name || 'N/A'}`);
      });
    }
  }

  // 6. Verificar permisos RLS
  console.log('\n6️⃣ Verificando permisos RLS...');
  const { data: policies, error: polError } = await supabase
    .rpc('pg_policies')
    .select('*')
    .eq('tablename', 'promotions_products');

  if (polError) {
    console.log('⚠️  No se pudieron verificar políticas RLS (requiere permisos admin)');
  } else {
    console.log(`✅ Políticas RLS encontradas: ${policies?.length || 0}`);
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`Promociones activas: ${promotions?.length || 0}`);
  console.log(`Relaciones promotions_products: ${promoProducts?.length || 0}`);
  console.log(`Productos activos: ${products?.length || 0}`);
  console.log(`Productos con promociones activas: ${apiData?.length || 0}`);
  
  if ((promotions?.length || 0) > 0 && (promoProducts?.length || 0) > 0 && (apiData?.length || 0) === 0) {
    console.log('\n⚠️  PROBLEMA DETECTADO:');
    console.log('   Hay promociones y relaciones, pero el query complejo no retorna datos.');
    console.log('   Posibles causas:');
    console.log('   1. Problema con inner joins en Supabase');
    console.log('   2. Permisos RLS bloqueando el acceso');
    console.log('   3. Fechas de promociones fuera de rango');
  }

  console.log('\n✅ Diagnóstico completado\n');
}

diagnose().catch(console.error);
