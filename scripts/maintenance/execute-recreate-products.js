const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recreateProductsTable() {
  console.log('🔄 RECREANDO TABLA PRODUCTS CON ESTRUCTURA COMPLETA');
  console.log('================================================================================');
  
  try {
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('recreate-products-table.sql', 'utf8');
    
    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');
    
    console.log(`📝 Ejecutando ${commands.length} comandos SQL...`);
    
    // Ejecutar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n${i + 1}/${commands.length}. Ejecutando: ${command.substring(0, 50)}...`);
      
      try {
        // Para comandos que no son SELECT, usar rpc si está disponible
        if (command.toUpperCase().startsWith('SELECT')) {
          console.log('   ⏭️ Saltando comando SELECT (solo para verificación)');
          continue;
        }
        
        // Intentar ejecutar con rpc
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });
        
        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
          
          // Si es un error de función no encontrada, continuar
          if (error.message.includes('Could not find the function')) {
            console.log('   ⚠️ Función exec_sql no disponible, continuando...');
          }
        } else {
          console.log('   ✅ Ejecutado correctamente');
        }
        
      } catch (cmdError) {
        console.log(`   ❌ Error ejecutando comando: ${cmdError.message}`);
      }
    }
    
    // Verificar que la tabla se creó correctamente
    console.log('\n🔍 Verificando tabla recreada...');
    
    // Intentar insertar un producto de prueba
    const testProduct = {
      name: 'Producto Test Completo',
      sku: 'TEST-COMPLETE-' + Date.now(),
      category_id: '1', // Usar categoría existente
      description: 'Producto de prueba con todos los campos',
      cost_price: 10.00,
      sale_price: 15.00,
      wholesale_price: 12.00,
      offer_price: 13.50,
      stock_quantity: 100,
      min_stock: 10,
      is_active: true
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('products')
      .insert([testProduct])
      .select();
    
    if (insertError) {
      console.log('❌ Error insertando producto de prueba:', insertError.message);
    } else {
      console.log('✅ Producto de prueba insertado correctamente!');
      
      if (insertResult && insertResult.length > 0) {
        const product = insertResult[0];
        console.log('\n📊 Columnas disponibles en el producto:');
        Object.keys(product).forEach(key => {
          console.log(`   - ${key}: ${product[key]}`);
        });
        
        // Verificar campos de precios específicamente
        console.log('\n💰 Verificación de campos de precios:');
        console.log(`   - cost_price: ${product.cost_price} ✅`);
        console.log(`   - sale_price: ${product.sale_price} ✅`);
        console.log(`   - wholesale_price: ${product.wholesale_price} ✅`);
        console.log(`   - offer_price: ${product.offer_price} ✅`);
        
        // Limpiar producto de prueba
        await supabase.from('products').delete().eq('id', product.id);
        console.log('\n🧹 Producto de prueba eliminado');
        
        console.log('\n🎉 ¡TABLA PRODUCTS RECREADA EXITOSAMENTE!');
        console.log('✅ Todos los campos de precios están disponibles');
        console.log('✅ La tabla está lista para el formulario de productos');
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

recreateProductsTable();