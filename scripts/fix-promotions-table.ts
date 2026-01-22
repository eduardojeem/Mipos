import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixPromotionsTable() {
  console.log('🔧 Arreglando tabla promotions\n')
  console.log('=' .repeat(60))

  // Step 1: Add description column if missing
  console.log('\n1️⃣ Agregando columna description...')
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE promotions 
        ADD COLUMN IF NOT EXISTS description TEXT;
      `
    })
    
    if (error) {
      console.log('⚠️  No se pudo agregar columna via RPC:', error.message)
      console.log('   Intentando método alternativo...')
      
      // Try alternative: insert a test record to see what columns exist
      const testInsert = await supabase
        .from('promotions')
        .insert({
          name: 'TEST_COLUMN_CHECK',
          description: 'Test',
          discount_type: 'PERCENTAGE',
          discount_value: 10,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          is_active: false
        })
        .select()
      
      if (testInsert.error) {
        console.error('❌ Error al insertar test:', testInsert.error.message)
        console.log('\n⚠️  La columna description NO existe en la tabla.')
        console.log('   Necesitas ejecutar esta migración SQL manualmente en Supabase:')
        console.log('\n   ALTER TABLE promotions ADD COLUMN IF NOT EXISTS description TEXT;')
      } else {
        console.log('✅ La columna description existe')
        // Delete test record
        await supabase
          .from('promotions')
          .delete()
          .eq('name', 'TEST_COLUMN_CHECK')
      }
    } else {
      console.log('✅ Columna description agregada')
    }
  } catch (e: any) {
    console.error('❌ Error:', e.message)
  }

  // Step 2: Get some products to link
  console.log('\n2️⃣ Obteniendo productos para vincular...')
  const { data: products } = await supabase
    .from('products')
    .select('id,name,category_id')
    .limit(10)
  
  if (!products || products.length === 0) {
    console.error('❌ No hay productos en la base de datos')
    return
  }
  
  console.log(`✅ Encontrados ${products.length} productos`)

  // Step 3: Create sample promotions
  console.log('\n3️⃣ Creando promociones de ejemplo...')
  
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextYear = new Date(now)
  nextYear.setFullYear(nextYear.getFullYear() + 1)

  const samplePromotions = [
    {
      name: 'Descuento de Bienvenida',
      description: 'Obtén 15% de descuento en tu primera compra',
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
      description: 'Mega descuento del 30% en productos seleccionados',
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
      description: '$25 de descuento en compras mayores a $100',
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
      description: '20% de descuento en toda la tienda',
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
      description: '10% de descuento para estudiantes',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      start_date: now.toISOString().split('T')[0],
      end_date: nextYear.toISOString().split('T')[0],
      is_active: true,
      min_purchase_amount: 0,
      max_discount_amount: 30,
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
    return
  }
  
  console.log(`✅ Creadas ${createdPromotions?.length || 0} promociones`)

  // Step 4: Link products to promotions
  if (createdPromotions && createdPromotions.length > 0) {
    console.log('\n4️⃣ Vinculando productos a promociones...')
    
    const links = []
    for (let i = 0; i < createdPromotions.length; i++) {
      const promo = createdPromotions[i]
      // Link 3-5 random products to each promotion
      const numProducts = Math.min(3 + Math.floor(Math.random() * 3), products.length)
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

  // Step 5: Verify
  console.log('\n5️⃣ Verificando resultado...')
  const { data: finalPromotions, count } = await supabase
    .from('promotions')
    .select('id,name,is_active', { count: 'exact' })
  
  console.log(`✅ Total de promociones en la base de datos: ${count}`)
  if (finalPromotions && finalPromotions.length > 0) {
    console.log('\n📋 Promociones creadas:')
    finalPromotions.forEach((p: any, i: number) => {
      console.log(`  ${i + 1}. ${p.name} (${p.is_active ? 'Activa' : 'Inactiva'})`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✨ Proceso completado\n')
}

fixPromotionsTable().catch(console.error)
