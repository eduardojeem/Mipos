/**
 * Script para arreglar permisos de las tablas de ofertas y mostrar datos
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  console.log('Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixPermissions() {
  console.log('🔧 Arreglando permisos de tablas de ofertas...\n')

  try {
    // 1. Verificar y crear políticas RLS para promotions_products
    console.log('📋 Configurando políticas RLS para promotions_products...')
    
    const policies = [
      // Permitir lectura pública
      `
      DROP POLICY IF EXISTS "Public read promotions_products" ON promotions_products;
      CREATE POLICY "Public read promotions_products" 
        ON promotions_products FOR SELECT 
        TO anon, authenticated 
        USING (true);
      `,
      // Permitir escritura a usuarios autenticados
      `
      DROP POLICY IF EXISTS "Authenticated write promotions_products" ON promotions_products;
      CREATE POLICY "Authenticated write promotions_products" 
        ON promotions_products FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
      `
    ]

    for (const policy of policies) {
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      if (error) {
        console.log(`⚠️  Error aplicando política: ${error.message}`)
      } else {
        console.log('✅ Política aplicada correctamente')
      }
    }

    // 2. Verificar estructura de tablas
    console.log('\n📊 Verificando estructura de tablas...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['promotions', 'promotions_products', 'products'])

    if (tablesError) {
      console.error('Error verificando tablas:', tablesError)
    } else {
      console.log('Tablas encontradas:', tables?.map(t => t.table_name).join(', '))
    }

    // 3. Mostrar datos de promociones
    console.log('\n📊 PROMOCIONES EN LA BASE DE DATOS:')
    console.log('=' .repeat(80))
    
    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })

    if (promoError) {
      console.error('Error obteniendo promociones:', promoError)
    } else if (!promotions || promotions.length === 0) {
      console.log('⚠️  No hay promociones en la base de datos')
      console.log('💡 Ejecuta el script de seed para crear datos de ejemplo')
    } else {
      console.log(`Total: ${promotions.length} promociones\n`)
      promotions.forEach((promo: any, idx: number) => {
        console.log(`${idx + 1}. ${promo.name}`)
        console.log(`   ID: ${promo.id}`)
        console.log(`   Tipo: ${promo.discount_type} - Valor: ${promo.discount_value}`)
        console.log(`   Activa: ${promo.is_active ? '✅' : '❌'}`)
        console.log(`   Período: ${promo.start_date} → ${promo.end_date || 'Sin fin'}`)
        console.log()
      })
    }

    // 4. Mostrar relaciones promociones-productos
    console.log('\n📦 PRODUCTOS EN PROMOCIÓN:')
    console.log('=' .repeat(80))

    const { data: promoProducts, error: linkError } = await supabase
      .from('promotions_products')
      .select('promotion_id, product_id')

    if (linkError) {
      console.error('Error obteniendo relaciones:', linkError)
    } else if (!promoProducts || promoProducts.length === 0) {
      console.log('⚠️  No hay productos asociados a promociones')
    } else {
      console.log(`Total: ${promoProducts.length} relaciones\n`)
      
      // Obtener detalles de productos
      const productIds = [...new Set(promoProducts.map(p => p.product_id))]
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sale_price, images')
        .in('id', productIds)

      const productMap = new Map(products?.map(p => [p.id, p]) || [])

      // Agrupar por promoción
      const byPromo = promoProducts.reduce((acc: any, link: any) => {
        if (!acc[link.promotion_id]) acc[link.promotion_id] = []
        acc[link.promotion_id].push(link.product_id)
        return acc
      }, {})

      for (const [promoId, productIds] of Object.entries(byPromo)) {
        const promo = promotions?.find(p => p.id === promoId)
        if (!promo) continue

        console.log(`📌 ${promo.name}`)
        console.log(`   Descuento: ${promo.discount_value}${promo.discount_type === 'PERCENTAGE' ? '%' : ' (fijo)'}`)
        console.log(`   Productos (${(productIds as string[]).length}):`)
        
        for (const pid of productIds as string[]) {
          const product = productMap.get(pid)
          if (!product) continue

          const basePrice = product.sale_price || 0
          let offerPrice = basePrice

          if (promo.discount_type === 'PERCENTAGE') {
            offerPrice = basePrice * (1 - promo.discount_value / 100)
          } else if (promo.discount_type === 'FIXED_AMOUNT') {
            offerPrice = Math.max(0, basePrice - promo.discount_value)
          }

          const savings = basePrice - offerPrice
          const savingsPercent = basePrice > 0 ? (savings / basePrice * 100) : 0

          console.log(`      • ${product.name}`)
          console.log(`        Precio original: $${basePrice.toFixed(2)}`)
          console.log(`        Precio oferta: $${offerPrice.toFixed(2)}`)
          console.log(`        Ahorro: $${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%)`)
        }
        console.log()
      }
    }

    // 5. Tabla resumen de precios de oferta
    console.log('\n💰 TABLA DE PRECIOS DE OFERTA:')
    console.log('=' .repeat(100))
    console.log(
      'Producto'.padEnd(30) + 
      'Precio Base'.padEnd(15) + 
      'Descuento'.padEnd(20) + 
      'Precio Oferta'.padEnd(15) + 
      'Ahorro'
    )
    console.log('=' .repeat(100))

    if (promoProducts && promoProducts.length > 0) {
      const productIds = [...new Set(promoProducts.map(p => p.product_id))]
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sale_price')
        .in('id', productIds)

      for (const link of promoProducts) {
        const product = products?.find(p => p.id === link.product_id)
        const promo = promotions?.find(p => p.id === link.promotion_id)
        
        if (!product || !promo) continue

        const basePrice = product.sale_price || 0
        let offerPrice = basePrice

        if (promo.discount_type === 'PERCENTAGE') {
          offerPrice = basePrice * (1 - promo.discount_value / 100)
        } else if (promo.discount_type === 'FIXED_AMOUNT') {
          offerPrice = Math.max(0, basePrice - promo.discount_value)
        }

        const savings = basePrice - offerPrice
        const discountLabel = promo.discount_type === 'PERCENTAGE' 
          ? `${promo.discount_value}%`
          : `$${promo.discount_value}`

        console.log(
          product.name.substring(0, 28).padEnd(30) +
          `$${basePrice.toFixed(2)}`.padEnd(15) +
          discountLabel.padEnd(20) +
          `$${offerPrice.toFixed(2)}`.padEnd(15) +
          `$${savings.toFixed(2)}`
        )
      }
    } else {
      console.log('No hay productos en oferta')
    }
    console.log('=' .repeat(100))

    console.log('\n✅ Proceso completado')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixPermissions()
