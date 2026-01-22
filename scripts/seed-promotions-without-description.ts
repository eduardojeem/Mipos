import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedPromotions() {
  console.log('🌱 Poblando tabla promotions (sin columna description)\n')
  console.log('=' .repeat(60))

  // Step 1: Get products
  console.log('\n1️⃣ Obteniendo productos...')
  const { data: products } = await supabase
    .from('products')
    .select('id,name')
    .limit(15)
  
  if (!products || products.length === 0) {
    console.error('❌ No hay productos en la base de datos')
    return
  }
  
  console.log(`✅ Encontrados ${products.length} productos`)

  // Step 2: Create promotions WITHOUT description field
  console.log('\n2️⃣ Creando promociones...')
  
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextYear = new Date(now)
  nextYear.setFullYear(nextYear.getFullYear() + 1)

  const samplePromotions = [
    {
      name: 'Descuento de Bienvenida',
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      start_date: now.toISOString().split('T')[0],
      end_date: nextMonth.toISOString().split('T')[0],
      is_active: true,
      min_purchase_amount: 0,
      max_discount_amount: 50,
      usage_limit: 100,
      usage_count: 0
    },
    {
      name: 'Black Friday 2025',
      discount_type: 'PERCENTAGE',
      discount_value: 30,
      start_date: '2025-11-28',
      end_date: '2025-11-30',
      is_active: false,
      min_purchase_amount: 100,
      max_discount_amount: 200,
      usage_limit: 500,
      usage_count: 0
    },
    {
      name: 'Cyber Monday',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 25,
      start_date: '2025-12-01',
      end_date: '2025-12-02',
      is_active: false,
      min_purchase_amount: 100,
      max_discount_amount: 25,
      usage_limit: 200,
      usage_count: 0
    },
    {
      name: 'Promoción de Verano',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      start_date: tomorrow.toISOString().split('T')[0],
      end_date: nextYear.toISOString().split('T')[0],
      is_active: true,
      min_purchase_amount: 50,
      max_discount_amount: 100,
      usage_limit: 0,
      usage_count: 0
    },
    {
      name: 'Descuento Estudiantes',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      start_date: now.toISOString().split('T')[0],
      end_date: nextYear.toISOString().split('T')[0],
      is_active: true,
      min_purchase_amount: 0,
      max_discount_amount: 30,
      usage_limit: 0,
      usage_count: 0
    },
    {
      name: 'Oferta Relámpago',
      discount_type: 'PERCENTAGE',
      discount_value: 25,
      start_date: now.toISOString().split('T')[0],
      end_date: nextWeek.toISOString().split('T')[0],
      is_active: true,
      min_purchase_amount: 30,
      max_discount_amount: 75,
      usage_limit: 50,
      usage_count: 0
    },
    {
      name: 'Descuento Fin de Temporada',
      discount_type: 'PERCENTAGE',
      discount_value: 40,
      start_date: now.toISOString().split('T')[0],
      end_date: nextMonth.toISOString().split('T')[0],
      is_active: true,
      min_purchase_amount: 75,
      max_discount_amount: 150,
      usage_limit: 0,
      usage_count: 0
    },
    {
      name: 'Compra 2 Lleva 3',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 20,
      start_date: now.toISOString().split('T')[0],
      end_date: nextMonth.toISOString().split('T')[0],
      is_active: true,
      min_purchase_amount: 60,
      max_discount_amount: 20,
      usage_limit: 0,
      usage_count: 0
    }
  ]

  const { data: createdPromotions, error: createError } = await supabase
    .from('promotions')
    .insert(samplePromotions)
    .select()
  
  if (createError) {
    console.error('❌ Error al crear promociones:', createError.message)
    console.error('   Detalles:', createError)
    return
  }
  
  console.log(`✅ Creadas ${createdPromotions?.length || 0} promociones`)

  // Step 3: Link products to promotions
  if (createdPromotions && createdPromotions.length > 0) {
    console.log('\n3️⃣ Vinculando productos a promociones...')
    
    const links = []
    for (let i = 0; i < createdPromotions.length; i++) {
      const promo = createdPromotions[i]
      // Link 3-6 random products to each promotion
      const numProducts = Math.min(3 + Math.floor(Math.random() * 4), products.length)
      const shuffled = [...products].sort(() => Math.random() - 0.5)
      
      for (let j = 0; j < numProducts; j++) {
        links.push({
          promotion_id: promo.id,
          product_id: shuffled[j].id
        })
      }
    }
    
    const { error: linkError } = await supabase
      .from('promotions_products')
      .insert(links)
    
    if (linkError) {
      console.error('❌ Error al vincular productos:', linkError.message)
    } else {
      console.log(`✅ Vinculados ${links.length} productos a promociones`)
    }
  }

  // Step 4: Verify
  console.log('\n4️⃣ Verificando resultado...')
  const { data: finalPromotions, count } = await supabase
    .from('promotions')
    .select('id,name,is_active,discount_type,discount_value', { count: 'exact' })
  
  console.log(`✅ Total de promociones: ${count}`)
  if (finalPromotions && finalPromotions.length > 0) {
    console.log('\n📋 Promociones creadas:')
    finalPromotions.forEach((p: any, i: number) => {
      const status = p.is_active ? '🟢 Activa' : '🔴 Inactiva'
      const discount = p.discount_type === 'PERCENTAGE' 
        ? `${p.discount_value}%` 
        : `$${p.discount_value}`
      console.log(`  ${i + 1}. ${p.name} - ${discount} ${status}`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✨ Proceso completado')
  console.log('\n⚠️  NOTA: La columna "description" no existe en la tabla.')
  console.log('   Para agregarla, ejecuta esta migración en Supabase:')
  console.log('   ALTER TABLE promotions ADD COLUMN IF NOT EXISTS description TEXT;\n')
}

seedPromotions().catch(console.error)
