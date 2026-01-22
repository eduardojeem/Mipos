const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://your-project.supabase.co'; // Reemplazar con tu URL
const supabaseKey = 'your-service-role-key'; // Reemplazar con tu service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function addIVAFields() {
  try {
    console.log('🔧 Agregando campos de IVA a la tabla products...');
    
    // Agregar columnas una por una
    const alterQueries = [
      'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS iva_rate DECIMAL(5,2) DEFAULT 16.00;',
      'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS iva_included BOOLEAN DEFAULT false;',
      'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_with_iva DECIMAL(10,2);',
      'ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_without_iva DECIMAL(10,2);'
    ];
    
    for (const query of alterQueries) {
      console.log(`Ejecutando: ${query}`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error) {
        console.error('❌ Error:', error);
      } else {
        console.log('✅ Columna agregada exitosamente');
      }
    }
    
    // Crear índices
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_products_iva_rate ON public.products(iva_rate);',
      'CREATE INDEX IF NOT EXISTS idx_products_iva_included ON public.products(iva_included);'
    ];
    
    for (const query of indexQueries) {
      console.log(`Ejecutando: ${query}`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: query });
      if (error) {
        console.error('❌ Error:', error);
      } else {
        console.log('✅ Índice creado exitosamente');
      }
    }
    
    // Actualizar productos existentes
    console.log('📦 Actualizando productos existentes...');
    const updateQuery = `
      UPDATE public.products 
      SET 
        iva_rate = 16.00,
        iva_included = false,
        price_without_iva = sale_price,
        price_with_iva = sale_price * 1.16
      WHERE iva_rate IS NULL;
    `;
    
    const { error: updateError } = await supabase.rpc('exec_sql', { sql_query: updateQuery });
    if (updateError) {
      console.error('❌ Error actualizando productos:', updateError);
    } else {
      console.log('✅ Productos actualizados exitosamente');
    }
    
    // Verificar resultados
    console.log('🔍 Verificando productos actualizados...');
    const { data: products, error: selectError } = await supabase
      .from('products')
      .select('id, name, sale_price, iva_rate, iva_included, price_without_iva, price_with_iva')
      .limit(3);
    
    if (selectError) {
      console.error('❌ Error obteniendo productos:', selectError);
    } else {
      console.log('📊 Productos con IVA:');
      console.table(products);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar si no hay configuración de Supabase
if (supabaseUrl.includes('your-project') || supabaseKey.includes('your-service')) {
  console.log('⚠️  Por favor configura las variables de Supabase en el archivo');
  console.log('   Edita supabaseUrl y supabaseKey con tus valores reales');
} else {
  addIVAFields();
}