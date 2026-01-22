import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addIsActiveColumn() {
  console.log('🚀 Agregando columna is_active a la tabla products...');
  console.log(`📍 URL: ${supabaseUrl}`);

  try {
    // Intentamos usar RPC si está disponible (la función exec_sql que usamos antes)
    const sql = `
      ALTER TABLE public.products 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `;

    // Primero intentamos con RPC exec_sql
    /*
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (!rpcError) {
      console.log('✅ Columna agregada exitosamente vía RPC');
      return;
    }
    */
    
    // Si no tenemos RPC, usamos el método de "ejecución directa" que hemos estado usando en otros scripts
    // O simplemente informamos al usuario si no podemos hacerlo.
    // Pero espera, en scripts anteriores (create-it-products) usamos ALTER TABLE directamente? 
    // NO, en create-it-products el usuario ejecutó el SQL manualmente en el dashboard.
    // Pero remove-sku-constraint.ts intentaba usar exec_sql.
    
    // Vamos a intentar usar el método de Postgres.js si tuviéramos acceso a la conexión directa,
    // pero aquí estamos usando supabase-js.
    
    // Si la función exec_sql existe (la creamos antes para el constraint), usémosla.
    // La función se llama 'exec_sql' y toma un parámetro 'sql_query' según el script maintenance/execute-supabase-sql.js
    // PERO, el usuario reportó que 'exec_sql' no existía.
    
    // Sin embargo, podemos intentar crearla nuevamente o asumir que el usuario la creó como se le pidió.
    
    // ALTERNATIVA: Usar la API de Supabase para hacer una "migración falsa" si es posible, pero no hay endpoint para DDL.
    
    // Vamos a intentar la RPC asumiendo que el usuario siguió las instrucciones anteriores.
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('❌ Error ejecutando SQL vía RPC:', error.message);
        console.log('⚠️  Intenta ejecutar este SQL manualmente en el Supabase SQL Editor:');
        console.log(sql);
    } else {
        console.log('✅ Columna is_active agregada exitosamente.');
    }

  } catch (err: any) {
    console.error('❌ Error general:', err.message);
  }
}

addIsActiveColumn();
