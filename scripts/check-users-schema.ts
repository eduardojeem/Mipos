import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('🔍 Verificando estructura de tabla users...\n');

  // Intentar obtener un usuario para ver las columnas
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('\n📋 Intentando con columnas básicas...');
    
    const { data: data2, error: error2 } = await supabase
      .from('users')
      .select('id, email, role, status, created_at, updated_at')
      .limit(1);
    
    if (error2) {
      console.log('❌ Error:', error2.message);
    } else {
      console.log('✅ Columnas disponibles:', Object.keys(data2?.[0] || {}));
      console.log('📊 Datos:', data2);
    }
  } else {
    console.log('✅ Columnas disponibles:', Object.keys(data?.[0] || {}));
    console.log('📊 Datos:', data);
  }

  // Verificar todos los usuarios
  console.log('\n📋 Todos los usuarios en la tabla users:');
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, email, role, status');

  if (allError) {
    console.log('❌ Error:', allError.message);
  } else {
    console.log(allUsers);
  }
}

checkSchema();
