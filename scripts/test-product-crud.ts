import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProductCRUD() {
  console.log('🔄 Probando operaciones CRUD de productos...');
  
  try {
    // Obtener una categoría existente
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (!categories || categories.length === 0) {
      console.error('❌ No se encontraron categorías');
      return;
    }
    
    const categoryId = categories[0].id;
    console.log(`📂 Usando categoría: ${categoryId}`);
    
    // Test 1: Crear producto
    console.log('\n1. Creando producto de prueba...');
    const testProduct = {
      name: `Producto Test ${Date.now()}`,
      sku: `TEST-${Date.now()}`,
      description: 'Producto creado para pruebas de sincronización',
      category_id: categoryId,
      cost_price: 10.00,
      sale_price: 15.00,
      stock_quantity: 50,
      min_stock: 5,
      images: ['https://via.placeholder.com/300x300.png?text=Test+Product']
    };
    
    const { data: createdProduct, error: createError } = await supabase
      .from('products')
      .insert(testProduct)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error al crear producto:', createError);
      return;
    }
    
    console.log('✅ Producto creado exitosamente');
    console.log(`📦 ID: ${createdProduct.id}`);
    console.log(`📦 Nombre: ${createdProduct.name}`);
    console.log(`📦 SKU: ${createdProduct.sku}`);
    
    // Test 2: Leer producto
    console.log('\n2. Leyendo producto creado...');
    const { data: readProduct, error: readError } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('id', createdProduct.id)
      .single();
    
    if (readError) {
      console.error('❌ Error al leer producto:', readError);
      return;
    }
    
    console.log('✅ Producto leído exitosamente');
    console.log(`📦 Nombre: ${readProduct.name}`);
    console.log(`📦 Categoría: ${readProduct.categories?.name}`);
    console.log(`📦 Precio: $${readProduct.sale_price}`);
    console.log(`📦 Stock: ${readProduct.stock_quantity}`);
    
    // Test 3: Actualizar producto
    console.log('\n3. Actualizando producto...');
    const updatedData = {
      name: `${testProduct.name} - ACTUALIZADO`,
      sale_price: 20.00,
      stock_quantity: 75
    };
    
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updatedData)
      .eq('id', createdProduct.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error al actualizar producto:', updateError);
      return;
    }
    
    console.log('✅ Producto actualizado exitosamente');
    console.log(`📦 Nuevo nombre: ${updatedProduct.name}`);
    console.log(`📦 Nuevo precio: $${updatedProduct.sale_price}`);
    console.log(`📦 Nuevo stock: ${updatedProduct.stock_quantity}`);
    
    // Test 4: Verificar tiempo real
    console.log('\n4. Configurando listener de tiempo real...');
    
    let changeDetected = false;
    
    const channel = supabase
      .channel('test-product-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: `id=eq.${createdProduct.id}`
        }, 
        (payload) => {
          console.log('🔄 Cambio detectado en tiempo real:', {
            event: payload.eventType,
            product: payload.new?.name || payload.old?.name,
            timestamp: new Date().toISOString()
          });
          changeDetected = true;
        }
      )
      .subscribe();
    
    // Esperar a que se establezca la suscripción
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 5: Hacer un cambio para probar tiempo real
    console.log('\n5. Realizando cambio para probar tiempo real...');
    await supabase
      .from('products')
      .update({ stock_quantity: 100 })
      .eq('id', createdProduct.id);
    
    // Esperar a detectar el cambio
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (changeDetected) {
      console.log('✅ Tiempo real funcionando correctamente');
    } else {
      console.log('⚠️  No se detectaron cambios en tiempo real');
    }
    
    // Test 6: Eliminar producto
    console.log('\n6. Eliminando producto de prueba...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', createdProduct.id);
    
    if (deleteError) {
      console.error('❌ Error al eliminar producto:', deleteError);
      return;
    }
    
    console.log('✅ Producto eliminado exitosamente');
    
    // Limpiar suscripción
    supabase.removeChannel(channel);
    
    console.log('\n🎉 Todas las pruebas CRUD completadas exitosamente!');
    console.log('📊 Resumen:');
    console.log('  ✅ Crear producto');
    console.log('  ✅ Leer producto');
    console.log('  ✅ Actualizar producto');
    console.log('  ✅ Eliminar producto');
    console.log(`  ${changeDetected ? '✅' : '⚠️ '} Tiempo real`);
    
  } catch (error) {
    console.error('❌ Error durante las pruebas CRUD:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testProductCRUD();