/**
 * Script para verificar el esquema de la tabla promotions
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function checkSchema() {
  console.log('🔍 Verificando esquema de tabla promotions\n')

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Error: Variables de entorno no configuradas')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Intentar obtener una promoción para ver la estructura
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .limit(1)

  if (error) {
    console.log(`❌ Error: ${error.message}`)
    
    // Intentar con columnas específicas
    console.log('\n📝 Intentando con columnas comunes...')
    const { data: test, error: testError } = await supabase
      .from('promotions')
      .select('id, name, discount_type, discount_value, start_date, end_date, is_active')
      .limit(1)
    
    if (testError) {
      console.log(`❌ Error: ${testError.message}`)
    } else {
      console.log('✅ Columnas básicas funcionan')
      if (test && test.length > 0) {
        console.log('\nEstructura de la primera promoción:')
        console.log(JSON.stringify(test[0], null, 2))
      }
    }
  } else {
    if (data && data.length > 0) {
      console.log('✅ Esquema de la tabla promotions:')
      console.log('\nColumnas disponibles:')
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}: ${typeof data[0][key]}`)
      })
      
      console.log('\nPrimera promoción:')
      console.log(JSON.stringify(data[0], null, 2))
    } else {
      console.log('⚠️  Tabla vacía, no se puede determinar esquema')
      console.log('\n💡 Intentando obtener esquema de otra forma...')
      
      // Intentar insertar y ver qué columnas acepta
      const testPromo = {
        name: 'Test Schema',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      }
      
      const { data: inserted, error: insertError } = await supabase
        .from('promotions')
        .insert(testPromo)
        .select()
        .single()
      
      if (insertError) {
        console.log(`❌ Error al insertar: ${insertError.message}`)
      } else {
        console.log('✅ Promoción de prueba insertada')
        console.log('\nColumnas disponibles:')
        Object.keys(inserted).forEach(key => {
          console.log(`  - ${key}: ${typeof inserted[key]}`)
        })
        
        // Eliminar la promoción de prueba
        await supabase.from('promotions').delete().eq('id', inserted.id)
        console.log('\n🗑️  Promoción de prueba eliminada')
      }
    }
  }
}

checkSchema().catch(console.error)
