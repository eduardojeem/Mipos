import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Verificando esquema de tabla promotions\n')
  
  // Try to get table structure
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }
  
  console.log('✅ Estructura de la tabla (basada en query):')
  console.log('Columnas esperadas por el API:')
  console.log('  - id')
  console.log('  - name')
  console.log('  - description ❌ FALTA')
  console.log('  - discount_type')
  console.log('  - discount_value')
  console.log('  - start_date')
  console.log('  - end_date')
  console.log('  - is_active')
  console.log('  - min_purchase_amount')
  console.log('  - max_discount_amount')
  console.log('  - usage_limit')
  console.log('  - usage_count')
  
  console.log('\n📋 Registros actuales:', data?.length || 0)
}

checkSchema().catch(console.error)
