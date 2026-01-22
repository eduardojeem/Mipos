/**
 * Script para revisar las ofertas de productos en la base de datos
 * Muestra promociones activas y productos asociados
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOffersData() {
  console.log('🔍 Revisando ofertas en la base de datos...\n')

  try {
    // 1. Obtener todas las promociones
    console.log('📊 PROMOCIONES:')
    console.log('=' .repeat(80))
    
    const { data: promotions, error: promoError } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })

    if (promoError) {
      console.error('Error al obtener promociones:', promoError)
      return
    }

    if (!promotions || promotions.length === 0) {
      console.log('⚠️  No hay promociones en la base de datos\n')
    } else {
      console.log(`Total de promociones: ${promotions.length}\n`)
      
      promotions.forEach((promo: any, index: number) => {
        const status = promo.is_active ? '✅ ACTIVA' : '❌ INACTIVA'
        const now = new Date()
        const startDate = new Date(promo.start_date)
        const endDate = promo.end_date ? new Date(promo.end_date) : null
        
        let timeStatus = ''
        if (startDate > now) {
          timeStatus = '⏰ Próxima'
        } else if (endDate && endDate < now) {
          timeStatus = '⏱️  Finalizada'
        } else {
          timeStatus = '🔥 En curso'
        }

        console.log(`${index + 1}. ${promo.name} [${status}] [${timeStatus}]`)
        console.log(`   ID: ${promo.id}`)
        console.log(`   Tipo: ${promo.discount_type}`)
        console.log(`   Valor: ${promo.discount_value}${promo.discount_type === 'PERCENTAGE' ? '%' : ' (monto fijo)'}`)
        console.log(`   Inicio: ${promo.start_date}`)
        console.log(`   Fin: ${promo.end_date || 'Sin fecha de fin'}`)
        console.log(`   Descripción: ${promo.description || 'Sin descripción'}`)
        console.log(`   Uso: ${promo.usage_count || 0}/${promo.usage_limit || '∞'}`)
        console.log()
      })
    }

    // 2. Obtener relaciones promociones-productos
    console.log('\n📦 PRODUCTOS EN PROMOCIÓN:')
    console.log('=' .repeat(80))

    const { data: promoProducts, error: linkError } = await supabase
      .from('promotions_products')
      .select(`
        promotion_id,
        product_id,
        promotions(id, name, discount_type, discount_value, is_active),
        products(id, name, sale_price, images, category_id)
      `)

    if (linkError) {
      console.error('Error al obtener relaciones:', linkError)
      return
    }

    if (!promoProducts || promoProducts.length === 0) {
      console.log('⚠️  No hay productos asociados a promociones\n')
    } else {
      console.log(`Total de productos en promoción: ${promoProducts.length}\n`)

      // Agrupar por promoción
      const byPromotion = promoProducts.reduce((acc: any, item: any) => {
        const promoId = item.promotion_id
        if (!acc[promoId]) {
          acc[promoId] = {
            promotion: item.promotions,
            products: []
          }
        }
        acc[promoId].products.push(item.products)
        return acc
      }, {})

      Object.entries(byPromotion).forEach(([promoId, data]: [string, any]) => {
        const promo = data.promotion
        const products = data.products
        const status = promo.is_active ? '✅' : '❌'

        console.log(`${status} ${promo.name}`)
        console.log(`   Descuento: ${promo.discount_value}${promo.discount_type === 'PERCENTAGE' ? '%' : ' (fijo)'}`)
        console.log(`   Productos (${products.length}):`)
        
        products.forEach((product: any, idx: number) => {
          const price = product.sale_price || 0
          let finalPrice = price
          
          if (promo.discount_type === 'PERCENTAGE') {
            finalPrice = price * (1 - promo.discount_value / 100)
          } else if (promo.discount_type === 'FIXED_AMOUNT') {
            finalPrice = Math.max(0, price - promo.discount_value)
          }

          console.log(`      ${idx + 1}. ${product.name}`)
          console.log(`         Precio original: $${price.toFixed(2)}`)
          console.log(`         Precio con oferta: $${finalPrice.toFixed(2)}`)
          console.log(`         Ahorro: $${(price - finalPrice).toFixed(2)}`)
          console.log(`         Imágenes: ${product.images ? JSON.stringify(product.images) : 'Sin imágenes'}`)
        })
        console.log()
      })
    }

    // 3. Estadísticas generales
    console.log('\n📈 ESTADÍSTICAS:')
    console.log('=' .repeat(80))
    
    const activePromotions = promotions?.filter((p: any) => p.is_active) || []
    const now = new Date()
    const currentPromotions = activePromotions.filter((p: any) => {
      const start = new Date(p.start_date)
      const end = p.end_date ? new Date(p.end_date) : null
      return start <= now && (!end || end >= now)
    })

    console.log(`Total de promociones: ${promotions?.length || 0}`)
    console.log(`Promociones activas: ${activePromotions.length}`)
    console.log(`Promociones en curso: ${currentPromotions.length}`)
    console.log(`Productos en promoción: ${promoProducts?.length || 0}`)
    console.log(`Productos únicos: ${new Set(promoProducts?.map((p: any) => p.product_id) || []).size}`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkOffersData()
