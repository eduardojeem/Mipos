import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('🔍 Diagnóstico completo de /dashboard/promotions\n')
  console.log('=' .repeat(60))

  // 1. Check promotions table
  console.log('\n1️⃣ Verificando tabla promotions...')
  const { data: promotions, error: promoError, count } = await supabase
    .from('promotions')
    .select('*', { count: 'exact' })
  
  if (promoError) {
    console.error('❌ Error al consultar promotions:', promoError.message)
  } else {
    console.log(`✅ Tabla promotions: ${count} registros encontrados`)
    if (promotions && promotions.length > 0) {
      console.log('\n📋 Primeras 3 promociones:')
      promotions.slice(0, 3).forEach((p: any, i: number) => {
        console.log(`\n  ${i + 1}. ${p.name}`)
        console.log(`     ID: ${p.id}`)
        console.log(`     Tipo: ${p.discount_type}`)
        console.log(`     Valor: ${p.discount_value}`)
        console.log(`     Activa: ${p.is_active}`)
        console.log(`     Inicio: ${p.start_date}`)
        console.log(`     Fin: ${p.end_date}`)
      })
    }
  }

  // 2. Check promotions_products links
  console.log('\n\n2️⃣ Verificando tabla promotions_products...')
  const { data: links, error: linksError, count: linksCount } = await supabase
    .from('promotions_products')
    .select('*', { count: 'exact' })
  
  if (linksError) {
    console.error('❌ Error al consultar promotions_products:', linksError.message)
  } else {
    console.log(`✅ Tabla promotions_products: ${linksCount} registros encontrados`)
    if (links && links.length > 0) {
      console.log(`\n📋 Primeros 5 vínculos:`)
      links.slice(0, 5).forEach((l: any, i: number) => {
        console.log(`  ${i + 1}. Promoción ${l.promotion_id} → Producto ${l.product_id}`)
      })
    }
  }

  // 3. Simulate API call
  console.log('\n\n3️⃣ Simulando llamada a API /promotions...')
  const { data: apiData, error: apiError } = await supabase
    .from('promotions')
    .select(
      `id,name,description,discount_type,discount_value,start_date,end_date,is_active,min_purchase_amount,max_discount_amount,usage_limit,usage_count`,
      { count: 'exact' }
    )
    .range(0, 19)
  
  if (apiError) {
    console.error('❌ Error en simulación de API:', apiError.message)
  } else {
    console.log(`✅ API simulada: ${apiData?.length || 0} promociones retornadas`)
  }

  // 4. Check products table
  console.log('\n\n4️⃣ Verificando tabla products...')
  const { data: products, error: prodError, count: prodCount } = await supabase
    .from('products')
    .select('id,name,category_id', { count: 'exact' })
    .limit(5)
  
  if (prodError) {
    console.error('❌ Error al consultar products:', prodError.message)
  } else {
    console.log(`✅ Tabla products: ${prodCount} registros encontrados`)
    if (products && products.length > 0) {
      console.log(`\n📋 Primeros 5 productos:`)
      products.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.name} (ID: ${p.id}, Cat: ${p.category_id || 'N/A'})`)
      })
    }
  }

  // 5. Check categories table
  console.log('\n\n5️⃣ Verificando tabla categories...')
  const { data: categories, error: catError, count: catCount } = await supabase
    .from('categories')
    .select('id,name', { count: 'exact' })
  
  if (catError) {
    console.error('❌ Error al consultar categories:', catError.message)
  } else {
    console.log(`✅ Tabla categories: ${catCount} registros encontrados`)
    if (categories && categories.length > 0) {
      console.log(`\n📋 Categorías:`)
      categories.forEach((c: any, i: number) => {
        console.log(`  ${i + 1}. ${c.name} (ID: ${c.id})`)
      })
    }
  }

  // 6. Full join test
  console.log('\n\n6️⃣ Probando JOIN completo (promociones con productos)...')
  if (promotions && promotions.length > 0) {
    const firstPromoId = promotions[0].id
    const { data: promoLinks } = await supabase
      .from('promotions_products')
      .select('product_id')
      .eq('promotion_id', firstPromoId)
    
    if (promoLinks && promoLinks.length > 0) {
      const productIds = promoLinks.map(l => l.product_id)
      const { data: linkedProducts } = await supabase
        .from('products')
        .select('id,name')
        .in('id', productIds)
      
      console.log(`✅ Promoción "${promotions[0].name}" tiene ${linkedProducts?.length || 0} productos vinculados`)
      if (linkedProducts && linkedProducts.length > 0) {
        linkedProducts.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`  ${i + 1}. ${p.name}`)
        })
      }
    } else {
      console.log(`⚠️  Promoción "${promotions[0].name}" no tiene productos vinculados`)
    }
  }

  // 7. Check RLS policies
  console.log('\n\n7️⃣ Verificando políticas RLS...')
  const { data: policies, error: polError } = await supabase
    .rpc('exec_sql', { 
      sql_query: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies
        WHERE tablename IN ('promotions', 'promotions_products', 'products', 'categories')
        ORDER BY tablename, policyname;
      `
    })
    .catch(() => ({ data: null, error: { message: 'RPC exec_sql no disponible' } }))
  
  if (polError) {
    console.log('⚠️  No se pudieron verificar políticas RLS:', polError.message)
  } else if (policies && Array.isArray(policies)) {
    console.log(`✅ Políticas RLS encontradas: ${policies.length}`)
    policies.forEach((p: any) => {
      console.log(`  • ${p.tablename}.${p.policyname} (${p.cmd})`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✨ Diagnóstico completado\n')
}

diagnose().catch(console.error)
