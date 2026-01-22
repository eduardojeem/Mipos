import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateDescriptions() {
  console.log('📝 Actualizando descripciones de promociones\n')
  console.log('=' .repeat(60))

  // Get all promotions
  console.log('\n1️⃣ Obteniendo promociones...')
  const { data: promotions, error } = await supabase
    .from('promotions')
    .select('id,name,discount_type,discount_value')
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }
  
  if (!promotions || promotions.length === 0) {
    console.log('⚠️  No hay promociones para actualizar')
    return
  }
  
  console.log(`✅ Encontradas ${promotions.length} promociones`)

  // Define descriptions based on name patterns
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

  // Update each promotion
  console.log('\n2️⃣ Actualizando descripciones...')
  let updated = 0
  let skipped = 0

  for (const promo of promotions) {
    let description = descriptions[promo.name]
    
    // If no exact match, try to generate a description
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
        // Generic description based on discount type
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
      console.log(`✅ ${promo.name}: "${description}"`)
      updated++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n✨ Proceso completado`)
  console.log(`   Actualizadas: ${updated}`)
  console.log(`   Omitidas: ${skipped}`)
  console.log(`   Total: ${promotions.length}\n`)
}

updateDescriptions().catch(console.error)
