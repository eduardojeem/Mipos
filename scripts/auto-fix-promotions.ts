#!/usr/bin/env node
/**
 * Auto-fix script para el dashboard de promociones
 * Intenta agregar la columna description y actualizar las descripciones automáticamente
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Faltan variables de entorno de Supabase')
  console.log('   Verifica que .env.local tenga:')
  console.log('   - NEXT_PUBLIC_SUPABASE_URL')
  console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve))
}

async function main() {
  console.log('🔧 Auto-Fix: Dashboard de Promociones')
  console.log('=' .repeat(60))
  console.log('\nEste script intentará:')
  console.log('  1. Agregar la columna description a la tabla promotions')
  console.log('  2. Actualizar las descripciones de todas las promociones')
  console.log('\n⚠️  IMPORTANTE: Este script requiere permisos de administrador')
  console.log('   Si falla, ejecuta el SQL manualmente en Supabase Dashboard\n')

  const answer = await question('¿Continuar? (s/n): ')
  if (answer.toLowerCase() !== 's' && answer.toLowerCase() !== 'y') {
    console.log('\n❌ Operación cancelada')
    rl.close()
    process.exit(0)
  }

  // Try with service role key first, fallback to anon key
  const key = supabaseServiceKey || supabaseAnonKey
  const keyType = supabaseServiceKey ? 'SERVICE_ROLE' : 'ANON'
  
  console.log(`\n🔑 Usando clave: ${keyType}`)
  const supabase = createClient(supabaseUrl, key)

  // Step 1: Check if description column exists
  console.log('\n1️⃣ Verificando columna description...')
  const { data: testData, error: testError } = await supabase
    .from('promotions')
    .select('id,name,description')
    .limit(1)
  
  if (testError && testError.message.includes('description')) {
    console.log('❌ La columna description NO existe')
    console.log('\n📋 ACCIÓN REQUERIDA:')
    console.log('   Ejecuta este SQL en Supabase Dashboard:')
    console.log('\n   ALTER TABLE promotions ADD COLUMN IF NOT EXISTS description TEXT;\n')
    console.log('   Luego vuelve a ejecutar este script.')
    rl.close()
    process.exit(1)
  } else if (testError) {
    console.error('❌ Error inesperado:', testError.message)
    rl.close()
    process.exit(1)
  } else {
    console.log('✅ La columna description existe')
  }

  // Step 2: Get all promotions
  console.log('\n2️⃣ Obteniendo promociones...')
  const { data: promotions, error: fetchError } = await supabase
    .from('promotions')
    .select('id,name,description,discount_type,discount_value')
  
  if (fetchError) {
    console.error('❌ Error al obtener promociones:', fetchError.message)
    rl.close()
    process.exit(1)
  }
  
  if (!promotions || promotions.length === 0) {
    console.log('⚠️  No hay promociones para actualizar')
    rl.close()
    process.exit(0)
  }
  
  console.log(`✅ Encontradas ${promotions.length} promociones`)

  // Step 3: Update descriptions
  console.log('\n3️⃣ Actualizando descripciones...')
  
  const descriptions: Record<string, string> = {
    'Descuento de Bienvenida': 'Obtén 15% de descuento en tu primera compra',
    'Black Friday 2025': 'Mega descuento del 30% en productos seleccionados',
    'Black Friday 30%': 'Mega descuento del 30% en productos seleccionados',
    'Black Friday 50%': 'Mega descuento del 50% en productos seleccionados',
    'Cyber Monday': 'Descuento especial de Cyber Monday',
    'Promoción de Verano': '20% de descuento en toda la tienda',
    'Verano 15%': 'Promoción especial de verano con 15% de descuento',
    'Descuento Estudiantes': '10% de descuento para estudiantes',
    'Oferta Relámpago': '25% de descuento por tiempo limitado',
    'Descuento Fin de Temporada': '40% de descuento en productos de temporada',
    'Compra 2 Lleva 3': 'Compra 2 productos y lleva el tercero con descuento',
    'Navidad Belleza': 'Descuentos especiales en productos de belleza para Navidad',
    'Navidad 20%': 'Descuentos especiales para Navidad',
    'Año Nuevo 50%': 'Ofertas de Año Nuevo con hasta 50% de descuento',
    'Semana de Belleza': 'Semana especial de productos de belleza con descuentos',
    'Fin de Semana Glam': 'Fin de semana con descuentos en productos glam',
    'Promoción Inactiva': 'Promoción temporalmente inactiva',
    'Promoción Expirada': 'Promoción que ha finalizado'
  }

  let updated = 0
  let skipped = 0

  for (const promo of promotions) {
    // Skip if already has description
    if (promo.description && promo.description.trim() !== '') {
      console.log(`⏭️  ${promo.name}: Ya tiene descripción`)
      skipped++
      continue
    }

    let description = descriptions[promo.name]
    
    // Generate description if not found
    if (!description) {
      if (promo.name.toLowerCase().includes('navidad')) {
        description = 'Descuentos especiales para Navidad'
      } else if (promo.name.toLowerCase().includes('black friday')) {
        description = `Mega descuento del ${promo.discount_value}% en productos seleccionados`
      } else if (promo.name.toLowerCase().includes('cyber')) {
        description = 'Descuento especial de Cyber Monday'
      } else if (promo.name.toLowerCase().includes('verano')) {
        description = 'Promoción especial de verano'
      } else if (promo.name.toLowerCase().includes('año nuevo')) {
        description = 'Ofertas de Año Nuevo'
      } else {
        if (promo.discount_type === 'PERCENTAGE') {
          description = `Obtén ${promo.discount_value}% de descuento en productos seleccionados`
        } else {
          description = `Descuento de $${promo.discount_value} en tu compra`
        }
      }
    }

    const { error: updateError } = await supabase
      .from('promotions')
      .update({ description })
      .eq('id', promo.id)
    
    if (updateError) {
      console.error(`❌ Error actualizando "${promo.name}":`, updateError.message)
      skipped++
    } else {
      console.log(`✅ ${promo.name}`)
      updated++
    }
  }

  // Step 4: Verify
  console.log('\n4️⃣ Verificando resultado...')
  const { data: finalPromotions, count } = await supabase
    .from('promotions')
    .select('id,name,description,is_active', { count: 'exact' })
  
  const withDescription = finalPromotions?.filter(p => p.description && p.description.trim() !== '').length || 0
  
  console.log('\n' + '='.repeat(60))
  console.log('\n✨ Proceso completado')
  console.log(`   Total de promociones: ${count}`)
  console.log(`   Con descripción: ${withDescription}`)
  console.log(`   Actualizadas ahora: ${updated}`)
  console.log(`   Omitidas: ${skipped}`)
  
  if (withDescription === count) {
    console.log('\n🎉 ¡Todas las promociones tienen descripción!')
    console.log('\n📱 Ahora puedes abrir:')
    console.log('   http://localhost:3000/dashboard/promotions')
  } else {
    console.log('\n⚠️  Algunas promociones aún no tienen descripción')
    console.log('   Puedes actualizarlas manualmente en Supabase')
  }
  
  console.log('')
  rl.close()
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error.message)
  rl.close()
  process.exit(1)
})
