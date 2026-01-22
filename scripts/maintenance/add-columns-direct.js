const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addColumnsDirectly() {
  console.log('🔧 AGREGANDO COLUMNAS FALTANTES A LA TABLA PRODUCTS');
  console.log('================================================================================');
  
  try {
    // Primero verificar la estructura actual
    console.log('1. Verificando estructura actual...');
    const { data: currentProducts, error: currentError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (currentError) {
      console.error('❌ Error verificando tabla actual:', currentError.message);
      return;
    }
    
    if (currentProducts && currentProducts.length > 0) {
      const currentColumns = Object.keys(currentProducts[0]);
      console.log('✅ Columnas actuales:', currentColumns.join(', '));
      
      const hasWholesale = currentColumns.includes('wholesale_price');
      const hasOffer = currentColumns.includes('offer_price');
      
      console.log('\n📊 Estado actual:');
      console.log('- wholesale_price:', hasWholesale ? '✅ Ya existe' : '❌ Faltante');
      console.log('- offer_price:', hasOffer ? '✅ Ya existe' : '❌ Faltante');
      
      if (hasWholesale && hasOffer) {
        console.log('\n🎉 Todas las columnas ya están presentes!');
        return;
      }
    } else {
      console.log('⚠️ Tabla vacía, procediendo con la adición de columnas...');
    }
    
    // Intentar crear un producto de prueba para verificar si las columnas existen
    console.log('\n2. Probando inserción con nuevas columnas...');
    
    const testProduct = {
      name: 'Producto Test Columnas',
      sku: 'TEST-COLS-' + Date.now(),
      category_id: '1', // Usar una categoría existente
      description: 'Producto para probar nuevas columnas',
      cost_price: 10.00,
      sale_price: 15.00,
      wholesale_price: 12.00,  // Nueva columna
      offer_price: 13.50,      // Nueva columna
      stock_quantity: 100,
      min_stock: 10
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('products')
      .insert([testProduct])
      .select();
    
    if (insertError) {
      console.log('❌ Error insertando producto de prueba:', insertError.message);
      
      // Si el error es por columnas faltantes, las columnas no existen
      if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
        console.log('🔍 Las columnas no existen, necesitamos agregarlas manualmente');
        console.log('⚠️ Nota: Supabase no permite ALTER TABLE desde el cliente JavaScript');
        console.log('💡 Solución: Agregar las columnas desde el panel de Supabase o usando SQL directo');
        
        // Mostrar el SQL que se necesita ejecutar
        console.log('\n📝 SQL necesario para ejecutar en Supabase:');
        console.log('ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10,2) DEFAULT 0;');
        console.log('ALTER TABLE public.products ADD COLUMN IF NOT EXISTS offer_price DECIMAL(10,2);');
      }
    } else {
      console.log('✅ Producto de prueba insertado correctamente!');
      console.log('🎉 Las columnas wholesale_price y offer_price ya están disponibles');
      
      if (insertData && insertData.length > 0) {
        console.log('📊 Producto creado:', insertData[0]);
        
        // Limpiar el producto de prueba
        await supabase
          .from('products')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Producto de prueba eliminado');
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

addColumnsDirectly();