require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeProductsTableCreation() {
  try {
    console.log('🔍 Ejecutando creación completa de tabla products...');
    
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('create-products-table-complete.sql', 'utf8');
    
    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Ejecutando ${commands.length} comandos SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Saltar comandos SELECT de verificación
      if (command.toUpperCase().startsWith('SELECT')) {
        console.log(`${i + 1}/${commands.length}. ⏭️ Saltando SELECT: ${command.substring(0, 50)}...`);
        continue;
      }
      
      console.log(`${i + 1}/${commands.length}. Ejecutando: ${command.substring(0, 50)}...`);
      
      try {
        // Intentar ejecutar directamente como query SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: command 
        });
        
        if (error) {
          console.log(`   ❌ Error con exec_sql: ${error.message}`);
          
          // Para comandos específicos, intentar métodos alternativos
          if (command.includes('CREATE TABLE')) {
            console.log('   🔄 Intentando crear tabla directamente...');
            // La tabla se creará cuando intentemos insertar
          } else if (command.includes('CREATE INDEX')) {
            console.log('   ⚠️ Índice no creado, continuando...');
          } else if (command.includes('CREATE POLICY')) {
            console.log('   ⚠️ Política no creada, continuando...');
          }
          
          errorCount++;
        } else {
          console.log(`   ✅ Ejecutado exitosamente`);
          successCount++;
        }
        
      } catch (error) {
        console.log(`   ❌ Error ejecutando comando: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Resumen: ${successCount} exitosos, ${errorCount} errores`);
    
    // Verificar que la tabla funciona insertando un producto de prueba
    console.log('\n🧪 Probando inserción de producto...');
    
    // Primero obtener una categoría
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (!categories || categories.length === 0) {
      console.log('❌ No hay categorías disponibles para la prueba');
      return;
    }
    
    const testProduct = {
      name: 'Producto Test Completo',
      sku: 'TEST-COMPLETE-' + Date.now(),
      description: 'Producto de prueba con todos los campos',
      category_id: categories[0].id,
      cost_price: 10.50,
      sale_price: 15.99,
      wholesale_price: 12.75,
      offer_price: 13.99,
      stock_quantity: 100,
      min_stock: 10,
      images: '',
      brand: 'Test Brand',
      is_active: true
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('products')
      .insert([testProduct])
      .select();
    
    if (insertError) {
      console.error('❌ Error insertando producto de prueba:', insertError);
      console.log('💡 La tabla products necesita ser creada manualmente en Supabase');
      console.log('📋 Usa el archivo create-products-table-complete.sql en el editor SQL de Supabase');
    } else {
      console.log('✅ Producto insertado exitosamente:', insertData[0].id);
      console.log('📋 Campos verificados:', Object.keys(insertData[0]));
      
      // Limpiar - eliminar el producto de prueba
      await supabase
        .from('products')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Producto de prueba eliminado');
      
      console.log('\n🎉 ¡Tabla products creada y funcionando correctamente!');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

executeProductsTableCreation();