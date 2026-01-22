/**
 * Script de diagnóstico para dashboard/promotions
 * Verifica por qué no se muestran las promociones
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function diagnose() {
  console.log('🔍 Diagnóstico de Dashboard/Promotions\n')
  console.log('=' .repeat(60))

  // 1. Verificar variables de entorno
  console.log('\n1️⃣ Variables de Entorno:')
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Configurada' : '❌ Faltante'}`)
  console.log(`   SUPABASE_KEY: ${supabaseKey ? '✅ Configurada' : '❌ Faltante'}`)

  if (!supabaseUrl || !supabaseKey) {
    console.log('\n❌ Error: Variables de entorno no configuradas')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 2. Verificar conexión a Supabase
  console.log('\n2️⃣ Conexión a Supabase:')
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ Error de conexión: ${error.message}`)
      return
    }
    console.log('   ✅ Conexión exitosa')
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`)
    return
  }

  // 3. Contar promociones en Supabase
  console.log('\n3️⃣ Promociones en Supabase:')
  try {
    const { data, error, count } = await supabase
      .from('promotions')
      .select('*', { count: 'exact' })
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`)
      return
    }

    console.log(`   Total: ${count} promociones`)
    
    if (data && data.length > 0) {
      console.log('\n   Primeras 3 promociones:')
      data.slice(0, 3).forEach((promo: any, i: number) => {
        console.log(`   ${i + 1}. ${promo.name}`)
        console.log(`      - ID: ${promo.id}`)
        console.log(`      - Activa: ${promo.is_active ? 'Sí' : 'No'}`)
        console.log(`      - Descuento: ${promo.discount_value}${promo.discount_type === 'PERCENTAGE' ? '%' : ' (fijo)'}`)
        console.log(`      - Vigencia: ${promo.start_date} → ${promo.end_date}`)
      })
    } else {
      console.log('   ⚠️  No hay promociones en la base de datos')
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`)
    return
  }

  // 4. Probar endpoint API
  console.log('\n4️⃣ Endpoint API /api/promotions:')
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${apiUrl}/api/promotions`)
    
    if (!response.ok) {
      console.log(`   ❌ Error HTTP: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.log(`   Respuesta: ${text.substring(0, 200)}`)
      return
    }

    const json = await response.json()
    console.log(`   ✅ Respuesta exitosa`)
    console.log(`   - success: ${json.success}`)
    console.log(`   - count: ${json.count}`)
    console.log(`   - data.length: ${json.data?.length || 0}`)
    
    if (json.data && json.data.length > 0) {
      console.log('\n   Primera promoción del API:')
      const first = json.data[0]
      console.log(`   - name: ${first.name}`)
      console.log(`   - id: ${first.id}`)
      console.log(`   - isActive: ${first.isActive}`)
      console.log(`   - discountType: ${first.discountType}`)
      console.log(`   - discountValue: ${first.discountValue}`)
    } else {
      console.log('   ⚠️  API retorna array vacío')
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`)
  }

  // 5. Verificar permisos RLS
  console.log('\n5️⃣ Permisos RLS:')
  try {
    // Intentar leer sin autenticación
    const { data, error } = await supabase
      .from('promotions')
      .select('id, name')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ Error de permisos: ${error.message}`)
      console.log('   💡 Posible problema: RLS bloqueando lectura anónima')
      console.log('   💡 Solución: Verificar políticas RLS en Supabase')
    } else {
      console.log('   ✅ Lectura anónima permitida')
    }
  } catch (e: any) {
    console.log(`   ❌ Error: ${e.message}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Diagnóstico completado\n')
}

diagnose().catch(console.error)
