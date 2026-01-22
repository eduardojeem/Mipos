/**
 * Script de Testing: API de Productos por Promoción
 * 
 * Este script verifica que los nuevos endpoints de gestión de productos funcionan correctamente.
 * 
 * Uso:
 *   npx tsx scripts/test-products-api.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testProductsAPI() {
  console.log('🧪 Testing API de Productos por Promoción\n')
  console.log('=' .repeat(60))

  try {
    // 1. Obtener promociones activas
    console.log('\n📋 Paso 1: Obtener promociones activas...')
    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('id, name, is_active')
      .eq('is_active', true)
      .limit(3)

    if (promoError) {
      console.error('❌ Error al obtener promociones:', promoError.message)
      return
    }

    if (!promotions || promotions.length === 0) {
      console.log('⚠️  No hay promociones activas')
      return
    }

    console.log(`✅ Encontradas ${promotions.length} promociones activas:`)
    promotions.forEach((p: any) => {
      console.log(`   - ${p.name} (ID: ${p.id})`)
    })

    // 2. Probar GET /api/promotions/:id/products para cada promoción
    console.log('\n📦 Paso 2: Obtener productos por promoción...')
    
    for (const promo of promotions) {
      console.log(`\n   Promoción: ${promo.name}`)
      
      const { data: links, error: linksError } = await supabase
        .from('promotions_products')
        .select('product_id')
        .eq('promotion_id', promo.id)

      if (linksError) {
        console.error(`   ❌ Error:`, linksError.message)
        continue
      }

      const productIds = (links || []).map((l: any) => l.product_id)
      console.log(`   ✅ ${productIds.length} producto(s) asociado(s)`)

      if (productIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, name, price')
          .in('id', productIds)
          .limit(3)

        if (productsError) {
          console.error(`   ❌ Error al obtener detalles:`, productsError.message)
        } else {
          console.log(`   📦 Productos:`)
          ;(products || []).forEach((p: any) => {
            console.log(`      - ${p.name} ($${p.price})`)
          })
        }
      }
    }

    // 3. Verificar estructura de tabla promotions_products
    console.log('\n🔍 Paso 3: Verificar estructura de tabla...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('promotions_products')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('❌ Error al verificar tabla:', tableError.message)
    } else {
      console.log('✅ Tabla promotions_products accesible')
      if (tableInfo && tableInfo.length > 0) {
        console.log('   Columnas:', Object.keys(tableInfo[0]).join(', '))
      }
    }

    // 4. Contar total de productos en promociones
    console.log('\n📊 Paso 4: Estadísticas generales...')
    const { data: allLinks, error: allLinksError } = await supabase
      .from('promotions_products')
      .select('promotion_id, product_id')

    if (allLinksError) {
      console.error('❌ Error:', allLinksError.message)
    } else {
      const totalLinks = allLinks?.length || 0
      const uniqueProducts = new Set((allLinks || []).map((l: any) => l.product_id)).size
      const uniquePromotions = new Set((allLinks || []).map((l: any) => l.promotion_id)).size

      console.log(`✅ Total de relaciones: ${totalLinks}`)
      console.log(`✅ Productos únicos en promociones: ${uniqueProducts}`)
      console.log(`✅ Promociones con productos: ${uniquePromotions}`)
    }

    // 5. Verificar productos disponibles para asociar
    console.log('\n🛍️  Paso 5: Productos disponibles...')
    const { data: allProducts, error: allProductsError } = await supabase
      .from('products')
      .select('id, name, price, category_id')
      .limit(5)

    if (allProductsError) {
      console.error('❌ Error:', allProductsError.message)
    } else {
      console.log(`✅ ${allProducts?.length || 0} productos disponibles (muestra):`)
      ;(allProducts || []).forEach((p: any) => {
        console.log(`   - ${p.name} ($${p.price})`)
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Testing completado exitosamente!')
    console.log('\n💡 Próximos pasos:')
    console.log('   1. Iniciar servidor: npm run dev')
    console.log('   2. Ir a: http://localhost:3000/dashboard/promotions')
    console.log('   3. Click en "Ver Detalles" en una promoción')
    console.log('   4. Ir a pestaña "Productos"')
    console.log('   5. Probar "Agregar Productos"')
    console.log('\n📚 Documentación:')
    console.log('   - Quick Start: .kiro/specs/offers-section-audit/QUICK_START.md')
    console.log('   - Testing Guide: .kiro/specs/offers-section-audit/TESTING_GUIDE_PHASE1.md')

  } catch (error: any) {
    console.error('\n❌ Error inesperado:', error.message)
    console.error(error)
  }
}

// Ejecutar
testProductsAPI()
  .then(() => {
    console.log('\n✅ Script finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })
