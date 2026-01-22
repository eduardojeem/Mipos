/**
 * Script para insertar promociones de prueba en Supabase
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function seedPromotions() {
  console.log('🌱 Insertando promociones de prueba...\n')

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Error: Variables de entorno no configuradas')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Promociones de prueba
  const promotions = [
    {
      name: 'Navidad 20%',
      description: 'Descuento especial de Navidad en productos seleccionados',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
      is_active: true,
      min_purchase_amount: 0,
      max_discount_amount: 100000,
      usage_limit: 0,
      usage_count: 0,
    },
    {
      name: 'Semana de Belleza',
      description: 'Ofertas especiales en productos de belleza',
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 días
      is_active: true,
      min_purchase_amount: 100000,
      max_discount_amount: 50000,
      usage_limit: 0,
      usage_count: 0,
    },
    {
      name: 'Fin de Semana Glam',
      description: 'Descuento fijo para el fin de semana',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 10000,
      start_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // En 2 días
      end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 días
      is_active: true,
      min_purchase_amount: 50000,
      max_discount_amount: null,
      usage_limit: 0,
      usage_count: 0,
    },
    {
      name: 'Black Friday 50%',
      description: 'Mega descuento de Black Friday',
      discount_type: 'PERCENTAGE',
      discount_value: 50,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
      is_active: true,
      min_purchase_amount: 0,
      max_discount_amount: 200000,
      usage_limit: 100,
      usage_count: 45,
    },
    {
      name: 'Cyber Monday',
      description: 'Ofertas exclusivas online',
      discount_type: 'PERCENTAGE',
      discount_value: 30,
      start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Hace 5 días
      end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // En 2 días (expira pronto)
      is_active: true,
      min_purchase_amount: 75000,
      max_discount_amount: 150000,
      usage_limit: 50,
      usage_count: 42, // Cerca del límite
    },
    {
      name: 'Promoción Inactiva',
      description: 'Esta promoción está desactivada',
      discount_type: 'PERCENTAGE',
      discount_value: 25,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: false,
      min_purchase_amount: 0,
      max_discount_amount: 100000,
      usage_limit: 0,
      usage_count: 0,
    },
    {
      name: 'Promoción Expirada',
      description: 'Esta promoción ya expiró',
      discount_type: 'PERCENTAGE',
      discount_value: 40,
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Hace 30 días
      end_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Ayer
      is_active: true,
      min_purchase_amount: 0,
      max_discount_amount: 100000,
      usage_limit: 0,
      usage_count: 0,
    },
  ]

  console.log(`📝 Insertando ${promotions.length} promociones...\n`)

  for (const promo of promotions) {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .insert(promo)
        .select()
        .single()

      if (error) {
        console.log(`❌ Error al insertar "${promo.name}": ${error.message}`)
      } else {
        console.log(`✅ Insertada: ${promo.name} (ID: ${data.id})`)
      }
    } catch (e: any) {
      console.log(`❌ Error al insertar "${promo.name}": ${e.message}`)
    }
  }

  // Verificar total
  console.log('\n📊 Verificando total de promociones...')
  const { count, error } = await supabase
    .from('promotions')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.log(`❌ Error: ${error.message}`)
  } else {
    console.log(`✅ Total de promociones en la base de datos: ${count}`)
  }

  console.log('\n✅ Seed completado!\n')
}

seedPromotions().catch(console.error)
