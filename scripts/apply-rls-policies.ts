import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyPolicies() {
  console.log('🛡️ Aplicando políticas RLS...');
  
  const sqlPath = path.join(process.cwd(), 'supabase/migrations/enable_read_policies.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Separar sentencias básicas (muy simple, por punto y coma)
  // Nota: exec_sql ejecuta un string completo, pero a veces es mejor separar si hay errores.
  // Pero exec_sql en plpgsql suele aceptar bloques. Probemos todo junto.
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Error aplicando políticas:', error.message);
    console.log('⚠️ Ejecuta manualmente supabase/migrations/enable_read_policies.sql en el dashboard.');
  } else {
    console.log('✅ Políticas de lectura aplicadas correctamente.');
  }
}

applyPolicies();
